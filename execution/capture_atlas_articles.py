#!/usr/bin/env python3
"""Generate Sentinel-only article capture assets for Limn Atlas indices.

The script reads the Atlas catalog from src/atlas-indices.js, renders selected
bookmarks through Sentinel Hub WMS, and writes PNG images plus sidecar metadata
under .tmp/atlas_article_captures by default.
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import math
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests
from PIL import Image

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional local convenience only.
    load_dotenv = None


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_ROOT = ROOT / ".tmp" / "atlas_article_captures"
DEFAULT_WMS_URL = "https://sh.dataspace.copernicus.eu/ogc/wms/959ea2c5-5892-4b36-82b3-76e6bdb93c8a"
DEFAULT_WMS_LAYER = "AGRICULTURE"
DEFAULT_TARGETS = ["bhdfsi", "sfeii", "peti", "epdi", "rrfi", "tdrasi"]
TARGET_ALIASES = {"edpi": "epdi", "bh-dfsi": "bhdfsi", "sf-eii": "sfeii", "tdr-asi": "tdrasi"}
CATALOG_URL = "https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search"
TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
CDSE_STAC_SEARCH_URL = "https://stac.dataspace.copernicus.eu/v1/search"

TRUE_COLOR_EVALSCRIPT = """//VERSION=3
function setup() {
  return { input: ['B04', 'B03', 'B02', 'dataMask'], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0,0];
  return [sample.B04*2.5, sample.B03*2.5, sample.B02*2.5, 1];
}"""


@dataclass(frozen=True)
class Variant:
    slug: str
    title: str
    zoom_delta: int
    overlay: bool


VARIANTS = [
    Variant("01_regional_overlay", "Regional Sentinel index overlay", -1, True),
    Variant("02_bookmark_overlay", "Bookmark Sentinel index overlay", 0, True),
    Variant("03_detail_overlay", "Detail Sentinel index overlay", 1, True),
    Variant("04_true_color_context", "Sentinel-2 true color context", 0, False),
]


def normalize_key(value: str) -> str:
    text = value.strip().lower()
    text = TARGET_ALIASES.get(text, text)
    return re.sub(r"[^a-z0-9]", "", text)


def parse_size(value: str) -> tuple[int, int]:
    match = re.fullmatch(r"(\d+)x(\d+)", value.strip().lower())
    if not match:
        raise argparse.ArgumentTypeError("size must look like 1200x800")
    width, height = int(match.group(1)), int(match.group(2))
    if width < 128 or height < 128:
        raise argparse.ArgumentTypeError("size must be at least 128x128")
    return width, height


def load_indices() -> list[dict[str, Any]]:
    code = """
import { ATLAS_INDICES } from './src/atlas-indices.js';
const slim = ATLAS_INDICES.map(i => ({
  key: i.key,
  acronym: i.acronym,
  name: i.name,
  domain: i.domain,
  platform: i.platform,
  platformShort: i.platformShort,
  canRender: i.canRender,
  bookmark: i.bookmark,
  wmsLayer: i.wmsLayer || null,
  evalscript: i.evalscript,
  formula: i.formula || '',
  physics: i.physics || '',
  benefit: i.benefit || '',
  source: i.source || '',
  sourceUrl: i.sourceUrl || '',
  justification: i.justification || ''
}));
console.log(JSON.stringify(slim));
"""
    completed = subprocess.run(
        ["node", "--input-type=module", "-e", code],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(completed.stdout)


def resolve_targets(indices: list[dict[str, Any]], requested: list[str]) -> list[dict[str, Any]]:
    lookup: dict[str, dict[str, Any]] = {}
    for index in indices:
        lookup[normalize_key(str(index["key"]))] = index
        lookup[normalize_key(str(index["acronym"]))] = index

    resolved: list[dict[str, Any]] = []
    missing: list[str] = []
    seen: set[str] = set()
    for target in requested:
        key = normalize_key(target)
        index = lookup.get(key)
        if not index:
            missing.append(target)
            continue
        if index["key"] in seen:
            continue
        resolved.append(index)
        seen.add(index["key"])

    if missing:
        raise ValueError(f"Could not resolve Atlas target(s): {', '.join(missing)}")
    return resolved


def strip_comments(script: str) -> str:
    without_blocks = re.sub(r"/\*[\s\S]*?\*/", "", script)
    without_lines = re.sub(r"([^:]|^)//.*$", r"\1", without_blocks, flags=re.MULTILINE)
    return "\n".join(line.strip() for line in without_lines.splitlines() if line.strip())


def encode_script(script: str) -> str:
    return base64.b64encode(strip_comments(script).encode("utf-8")).decode("ascii")


def time_window(date_str: str, window_days: int) -> tuple[str, str, str]:
    end = datetime.strptime(date_str, "%Y-%m-%d").date()
    start = end - timedelta(days=window_days)
    return start.isoformat(), end.isoformat(), f"{start.isoformat()}/{end.isoformat()}"


def bookmark_bbox(lat: float, lng: float, zoom: int, width: int, height: int) -> tuple[float, float, float, float]:
    lat_rad = math.radians(lat)
    meters_per_px = 156543.03392804097 * max(0.15, math.cos(lat_rad)) / (2**zoom)
    width_m = width * meters_per_px
    height_m = height * meters_per_px
    half_lat = (height_m / 111_320) / 2
    half_lng = (width_m / (111_320 * max(0.15, math.cos(lat_rad)))) / 2
    return (lng - half_lng, lat - half_lat, lng + half_lng, lat + half_lat)


def build_wms_params(
    *,
    bbox: tuple[float, float, float, float],
    size: tuple[int, int],
    layer: str,
    evalscript: str,
    time_str: str,
    maxcc: int,
) -> dict[str, str]:
    width, height = size
    return {
        "service": "WMS",
        "request": "GetMap",
        "version": "1.3.0",
        "layers": layer,
        "format": "image/png",
        "transparent": "true",
        "width": str(width),
        "height": str(height),
        "crs": "CRS:84",
        "bbox": ",".join(f"{value:.8f}" for value in bbox),
        "time": time_str,
        "maxcc": str(maxcc),
        "showlogo": "false",
        "evalscript": encode_script(evalscript),
    }


def fetch_png(session: requests.Session, url: str, params: dict[str, str], timeout: int) -> bytes:
    response = session.get(url, params=params, timeout=timeout)
    if response.status_code != 200:
        detail = response.text.replace("\n", " ")[:300]
        raise RuntimeError(f"WMS HTTP {response.status_code}: {detail}")
    content_type = response.headers.get("content-type", "")
    if "image" not in content_type.lower():
        detail = response.text.replace("\n", " ")[:300]
        raise RuntimeError(f"Expected image response, got {content_type}: {detail}")
    return response.content


def alpha_composite(base_png: bytes, overlay_png: bytes | None) -> Image.Image:
    base = Image.open(io.BytesIO(base_png)).convert("RGBA")
    if overlay_png is None:
        return base
    overlay = Image.open(io.BytesIO(overlay_png)).convert("RGBA")
    return Image.alpha_composite(base, overlay)


def image_metrics(png: bytes) -> dict[str, float | int]:
    image = Image.open(io.BytesIO(png)).convert("RGBA")
    raw = image.tobytes()
    total = image.width * image.height
    visible = 0
    high_alpha = 0
    for offset in range(0, len(raw), 4):
        red = raw[offset]
        green = raw[offset + 1]
        blue = raw[offset + 2]
        alpha = raw[offset + 3]
        if alpha > 12 and max(red, green, blue) > 35:
            visible += 1
        if alpha > 80:
            high_alpha += 1
    return {
        "width": image.width,
        "height": image.height,
        "visible_pct": round((visible / total) * 100, 3),
        "high_alpha_pct": round((high_alpha / total) * 100, 3),
    }


def load_local_env() -> None:
    if load_dotenv is None:
        return
    env_path = ROOT / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=True)


def read_local_browser_config() -> dict[str, str]:
    """Read non-secret routing hints from config-v1.js without printing values."""
    config_path = ROOT / "config-v1.js"
    if not config_path.exists():
        return {}
    text = config_path.read_text(encoding="utf-8", errors="ignore")

    def first_string(*keys: str) -> str:
        for key in keys:
            match = re.search(rf"{re.escape(key)}\s*:\s*['\"]([^'\"]+)['\"]", text)
            if match:
                return match.group(1)
        return ""

    wms_url = first_string("ATLAS_WMS_URL", "SH_WMS_URL")
    instance_id = first_string("SH_INSTANCE_ID", "SENTINEL_HUB_INSTANCE_ID", "WMS_INSTANCE_ID")
    layer = first_string("ATLAS_WMS_LAYER", "SH_WMS_LAYER")
    cdse_client_id = first_string("CDSE_CLIENT_ID")
    cdse_client_secret = first_string("CDSE_CLIENT_SECRET")
    if not wms_url and instance_id:
        wms_url = f"https://sh.dataspace.copernicus.eu/ogc/wms/{instance_id}"
    return {
        "wms_url": wms_url,
        "wms_layer": layer,
        "cdse_client_id": cdse_client_id,
        "cdse_client_secret": cdse_client_secret,
    }


def get_cdse_token(session: requests.Session, timeout: int, local_config: dict[str, str]) -> str | None:
    client_id = os.environ.get("CDSE_CLIENT_ID") or local_config.get("cdse_client_id")
    client_secret = os.environ.get("CDSE_CLIENT_SECRET") or local_config.get("cdse_client_secret")
    if not client_id or not client_secret or "your-" in client_id or "your-" in client_secret:
        return None

    response = session.post(
        TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        },
        timeout=timeout,
    )
    if response.status_code != 200:
        return None
    data = response.json()
    token = data.get("access_token")
    return str(token) if token else None


def catalog_collection_for_layer(layer: str) -> str:
    upper = layer.upper()
    if "SENTINEL1" in upper or "S1" in upper:
        return "sentinel-1-grd"
    if "S5P" in upper:
        return "sentinel-5p-l2"
    return "sentinel-2-l2a"


def normalize_scene_metadata(
    *,
    source: str,
    collection: str,
    features: list[dict[str, Any]],
    target_date: str,
) -> dict[str, Any]:
    if not features:
        return {"status": "empty", "source": source, "collection": collection}

    target = datetime.fromisoformat(f"{target_date}T00:00:00+00:00")

    def sort_key(feature: dict[str, Any]) -> tuple[float, float]:
        props = feature.get("properties") or {}
        cloud = props.get("eo:cloud_cover")
        dt_text = props.get("datetime") or target_date
        try:
            dt = datetime.fromisoformat(dt_text.replace("Z", "+00:00"))
        except ValueError:
            dt = target
        delta = abs((dt - target).total_seconds())
        return (float(cloud) if cloud is not None else 999.0, delta)

    selected = sorted(features, key=sort_key)[0]
    props = selected.get("properties") or {}
    return {
        "status": "ok",
        "source": source,
        "collection": collection,
        "item_id": selected.get("id"),
        "datetime": props.get("datetime"),
        "cloud_cover": props.get("eo:cloud_cover"),
        "platform": props.get("platform"),
        "sun_elevation": props.get("view:sun_elevation"),
        "sun_azimuth": props.get("view:sun_azimuth"),
        "candidate_count": len(features),
    }


def fetch_cdse_stac_metadata(
    session: requests.Session,
    *,
    bbox: tuple[float, float, float, float],
    time_str: str,
    layer: str,
    target_date: str,
    timeout: int,
) -> dict[str, Any]:
    collection = catalog_collection_for_layer(layer)
    start_date, end_date = time_str.split("/", 1)
    catalog_time = f"{start_date}T00:00:00Z/{end_date}T23:59:59Z"
    payload = {
        "collections": [collection],
        "datetime": catalog_time,
        "bbox": [round(value, 8) for value in bbox],
        "limit": 10,
    }
    try:
        response = session.post(CDSE_STAC_SEARCH_URL, json=payload, timeout=timeout)
    except requests.RequestException as error:
        return {"status": "error", "source": "CDSE STAC", "error": str(error)}
    if response.status_code != 200:
        return {"status": "error", "source": "CDSE STAC", "http_status": response.status_code}
    features = response.json().get("features") or []
    return normalize_scene_metadata(
        source="CDSE STAC",
        collection=collection,
        features=features,
        target_date=target_date,
    )


def fetch_catalog_metadata(
    session: requests.Session,
    token: str | None,
    *,
    bbox: tuple[float, float, float, float],
    time_str: str,
    layer: str,
    target_date: str,
    timeout: int,
    skip_catalog: bool = False,
) -> dict[str, Any]:
    collection = catalog_collection_for_layer(layer)
    if skip_catalog:
        return {
            "status": "skipped",
            "source": "catalog metadata disabled by --skip-catalog",
            "collection": collection,
        }

    stac_metadata = fetch_cdse_stac_metadata(
        session,
        bbox=bbox,
        time_str=time_str,
        layer=layer,
        target_date=target_date,
        timeout=timeout,
    )
    if stac_metadata.get("status") == "ok":
        return stac_metadata
    if not token:
        return stac_metadata

    start_date, end_date = time_str.split("/", 1)
    catalog_time = f"{start_date}T00:00:00Z/{end_date}T23:59:59Z"
    payload = {
        "collections": [collection],
        "datetime": catalog_time,
        "bbox": [round(value, 8) for value in bbox],
        "limit": 10,
    }
    response = session.post(
        CATALOG_URL,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        data=json.dumps(payload),
        timeout=timeout,
    )
    if response.status_code != 200:
        return {
            "status": "error",
            "source": "Sentinel Hub Catalog",
            "http_status": response.status_code,
            "fallback": stac_metadata,
        }

    features = response.json().get("features") or []
    return normalize_scene_metadata(
        source="Sentinel Hub Catalog",
        collection=collection,
        features=features,
        target_date=target_date,
    )


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def render_capture_set(
    *,
    session: requests.Session,
    token: str | None,
    index: dict[str, Any],
    output_dir: Path,
    size: tuple[int, int],
    window_days: int,
    maxcc: int,
    timeout: int,
    wms_url: str,
    default_layer: str,
    wms_endpoint_label: str,
    skip_catalog: bool = False,
) -> list[dict[str, Any]]:
    if not index.get("canRender"):
        raise ValueError(f"{index['key']} is not a renderable Atlas index")

    bm = index["bookmark"]
    base_lat = float(bm["lat"])
    base_lng = float(bm["lng"])
    base_zoom = int(bm["zoom"])
    date_str = str(bm["date"])
    layer = index.get("wmsLayer") or default_layer
    start_date, end_date, time_str = time_window(date_str, window_days)

    index_dir = output_dir / str(index["key"])
    index_dir.mkdir(parents=True, exist_ok=True)
    captures: list[dict[str, Any]] = []

    for variant in VARIANTS:
        zoom = max(3, min(17, base_zoom + variant.zoom_delta))
        bbox = bookmark_bbox(base_lat, base_lng, zoom, size[0], size[1])
        common = {
            "bbox": bbox,
            "size": size,
            "layer": layer,
            "time_str": time_str,
            "maxcc": maxcc,
        }
        true_params = build_wms_params(evalscript=TRUE_COLOR_EVALSCRIPT, **common)
        base_png = fetch_png(session, wms_url, true_params, timeout)

        overlay_png: bytes | None = None
        overlay_metrics: dict[str, float | int] | None = None
        if variant.overlay:
            overlay_params = build_wms_params(evalscript=str(index["evalscript"]), **common)
            overlay_png = fetch_png(session, wms_url, overlay_params, timeout)
            overlay_metrics = image_metrics(overlay_png)

        composed = alpha_composite(base_png, overlay_png)
        png_name = f"{variant.slug}.png"
        png_path = index_dir / png_name
        composed.save(png_path)

        catalog = fetch_catalog_metadata(
            session,
            token,
            bbox=bbox,
            time_str=time_str,
            layer=layer,
            target_date=date_str,
            timeout=timeout,
            skip_catalog=skip_catalog,
        )

        metadata = {
            "asset": str(png_path.relative_to(ROOT)),
            "variant": variant.slug,
            "variant_title": variant.title,
            "provider": "Sentinel Hub WMS",
            "wms_endpoint": wms_endpoint_label,
            "wms_layer": layer,
            "uses_gee": False,
            "uses_cog": False,
            "index_key": index["key"],
            "index_acronym": index["acronym"],
            "index_name": index["name"],
            "domain": index["domain"],
            "platform": index["platform"],
            "formula": index.get("formula", ""),
            "source": index.get("source", ""),
            "source_url": index.get("sourceUrl", ""),
            "bookmark_label": bm["label"],
            "latitude": base_lat,
            "longitude": base_lng,
            "zoom": zoom,
            "bookmark_zoom": base_zoom,
            "bbox": [round(value, 8) for value in bbox],
            "bookmark_date": date_str,
            "window_days": window_days,
            "window_start": start_date,
            "window_end": end_date,
            "sentinel_wms_time": time_str,
            "maxcc": maxcc,
            "width": size[0],
            "height": size[1],
            "overlay": variant.overlay,
            "overlay_metrics": overlay_metrics,
            "satellite_metadata": catalog,
            "captured_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
        write_json(index_dir / f"{variant.slug}.json", metadata)
        captures.append(metadata)
        time.sleep(0.2)

    write_json(
        index_dir / "index_metadata.json",
        {
            "index_key": index["key"],
            "index_acronym": index["acronym"],
            "capture_count": len(captures),
            "captures": captures,
        },
    )
    return captures


def write_manifest(output_dir: Path, captures: list[dict[str, Any]], args: argparse.Namespace) -> None:
    by_index: dict[str, list[dict[str, Any]]] = {}
    for capture in captures:
        by_index.setdefault(str(capture["index_key"]), []).append(capture)

    manifest = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "output_dir": str(output_dir.relative_to(ROOT)),
        "provider": "Sentinel Hub WMS",
        "uses_gee": False,
        "uses_cog": False,
        "wms_endpoint": args.wms_endpoint_label,
        "window_days": args.window_days,
        "maxcc": args.maxcc,
        "size": f"{args.size[0]}x{args.size[1]}",
        "target_count": len(by_index),
        "capture_count": len(captures),
        "targets": sorted(by_index),
        "captures": captures,
    }
    write_json(output_dir / "manifest.json", manifest)

    lines = [
        "# Limn Atlas Sentinel Article Captures",
        "",
        f"Generated: {manifest['generated']}",
        f"Provider: {manifest['provider']}",
        f"Targets: {', '.join(manifest['targets'])}",
        f"Capture count: {manifest['capture_count']}",
        "",
        "| Index | Variant | Asset | Bookmark | Window | Catalog |",
        "|---|---|---|---|---|---|",
    ]
    for capture in captures:
        catalog = capture.get("satellite_metadata") or {}
        catalog_label = catalog.get("datetime") or catalog.get("status") or "unknown"
        lines.append(
            "| {index_acronym} (`{index_key}`) | {variant} | `{asset}` | {label} | {window} | {catalog} |".format(
                index_acronym=capture["index_acronym"],
                index_key=capture["index_key"],
                variant=capture["variant"],
                asset=capture["asset"],
                label=capture["bookmark_label"],
                window=capture["sentinel_wms_time"],
                catalog=catalog_label,
            )
        )
    (output_dir / "manifest.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Sentinel-only Limn Atlas article capture PNGs.")
    parser.add_argument("--targets", default=",".join(DEFAULT_TARGETS), help="Comma-separated Atlas keys/acronyms.")
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--run-id", default=datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S"))
    parser.add_argument("--size", type=parse_size, default=parse_size("1200x800"))
    parser.add_argument("--window-days", type=int, default=15)
    parser.add_argument("--maxcc", type=int, default=30)
    parser.add_argument("--timeout", type=int, default=45)
    parser.add_argument("--wms-url", default="", help="Explicit Sentinel Hub WMS URL. Omit to use local config-v1.js or the public default.")
    parser.add_argument("--wms-layer", default="", help="Default WMS layer for indices without an index-specific wmsLayer.")
    parser.add_argument("--skip-catalog", action="store_true", help="Skip optional CDSE STAC and Sentinel Hub Catalog metadata lookups.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    load_local_env()
    local_config = read_local_browser_config()
    if args.wms_url:
        wms_url = args.wms_url
        args.wms_endpoint_label = "explicit"
    elif local_config.get("wms_url"):
        wms_url = str(local_config["wms_url"])
        args.wms_endpoint_label = "local-config"
    else:
        wms_url = DEFAULT_WMS_URL
        args.wms_endpoint_label = "default-public"
    default_layer = args.wms_layer or local_config.get("wms_layer") or DEFAULT_WMS_LAYER

    requested = [part.strip() for part in args.targets.split(",") if part.strip()]
    output_dir = args.output_root / args.run_id
    output_dir.mkdir(parents=True, exist_ok=True)

    indices = load_indices()
    targets = resolve_targets(indices, requested)
    session = requests.Session()
    session.headers.update({"User-Agent": "Limn-Atlas-Article-Capture/1.0"})
    token = None if args.skip_catalog else get_cdse_token(session, args.timeout, local_config)

    all_captures: list[dict[str, Any]] = []
    for index in targets:
        captures = render_capture_set(
            session=session,
            token=token,
            index=index,
            output_dir=output_dir,
            size=args.size,
            window_days=args.window_days,
            maxcc=args.maxcc,
            timeout=args.timeout,
            wms_url=wms_url,
            default_layer=default_layer,
            wms_endpoint_label=args.wms_endpoint_label,
            skip_catalog=args.skip_catalog,
        )
        all_captures.extend(captures)
        print(f"{index['acronym']}: wrote {len(captures)} captures")

    write_manifest(output_dir, all_captures, args)
    print(f"Wrote {output_dir.relative_to(ROOT) / 'manifest.json'}")
    print(f"Wrote {output_dir.relative_to(ROOT) / 'manifest.md'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
