#!/usr/bin/env python3
"""Render a Limn XYZ tile from public Sentinel-2 L2A COG assets.

This script is intentionally deterministic and secret-free. It queries public
STAC, reads only the requested tile window from public COG band assets, applies
Limn's produced-water formulas, and writes a PNG tile to stdout or --output.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import numpy as np
import rasterio
from PIL import Image
from pyproj import Transformer
from pystac_client import Client
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT
from rasterio.windows import from_bounds


EARTH_SEARCH_URL = "https://earth-search.aws.element84.com/v1"
S2_COLLECTION = "sentinel-2-l2a"
WEB_MERCATOR = "EPSG:3857"
WGS84 = "EPSG:4326"
ORIGIN_SHIFT = 20037508.342789244
CLEAR_SCL_CLASSES = {1, 2, 4, 5, 6, 7}
ITEM_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60

BAND_ASSETS = {
    "B02": "blue",
    "B03": "green",
    "B04": "red",
    "B08": "nir",
    "B11": "swir16",
    "B12": "swir22",
    "SCL": "scl",
}

INDEX_BANDS = {
    "tc": ["B02", "B03", "B04"],
    "truecolor": ["B02", "B03", "B04"],
    "true-color": ["B02", "B03", "B04"],
    "pwi": ["B02", "B03", "B04", "B08", "B11", "B12"],
    "hpwi": ["B02", "B03", "B04", "B08", "B11", "B12"],
    "pwoi": ["B02", "B03", "B04", "B08", "B11", "B12"],
    "lbi": ["B02", "B03", "B04", "B08", "B11", "B12"],
}


@dataclass(frozen=True)
class TileBounds:
    mercator: tuple[float, float, float, float]
    lonlat: tuple[float, float, float, float]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--z", type=int, required=True)
    parser.add_argument("--x", type=int, required=True)
    parser.add_argument("--y", type=int, required=True)
    parser.add_argument("--index", default="tc")
    parser.add_argument("--time", default=datetime.now(timezone.utc).date().isoformat())
    parser.add_argument("--size", type=int, default=256)
    parser.add_argument("--maxcc", type=float, default=90.0)
    parser.add_argument("--stac-url", default=os.environ.get("COG_STAC_URL", EARTH_SEARCH_URL))
    parser.add_argument("--collection", default=os.environ.get("COG_STAC_COLLECTION", S2_COLLECTION))
    parser.add_argument("--item-cache-dir", type=Path, default=Path(os.environ.get("COG_ITEM_CACHE_DIR", ".tmp/cog_item_cache")))
    parser.add_argument("--item-cache-ttl", type=int, default=int(os.environ.get("COG_ITEM_CACHE_TTL_SECONDS", ITEM_CACHE_TTL_SECONDS)))
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def add_days(date_str: str, days: int) -> str:
    date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    shifted = datetime.fromtimestamp(date.timestamp() + days * 86400, tz=timezone.utc)
    return shifted.date().isoformat()


def parse_time_window(time_value: str) -> tuple[str, str]:
    if "/" in time_value:
        start, end = time_value.split("/", 1)
        return start, end
    return add_days(time_value, -30), add_days(time_value, 15)


def tile_bounds(z: int, x: int, y: int) -> TileBounds:
    n = 2**z
    tile_size_m = (2 * ORIGIN_SHIFT) / n
    minx = -ORIGIN_SHIFT + x * tile_size_m
    maxx = minx + tile_size_m
    maxy = ORIGIN_SHIFT - y * tile_size_m
    miny = maxy - tile_size_m
    transformer = Transformer.from_crs(WEB_MERCATOR, WGS84, always_xy=True)
    minlon, minlat = transformer.transform(minx, miny)
    maxlon, maxlat = transformer.transform(maxx, maxy)
    return TileBounds((minx, miny, maxx, maxy), (minlon, minlat, maxlon, maxlat))


def target_date(time_value: str) -> datetime:
    target = time_value.split("/", 1)[-1]
    date = datetime.fromisoformat(target.replace("Z", "+00:00"))
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    return date


def item_cache_key(stac_url: str, collection: str, bounds: TileBounds, time_value: str, maxcc: float) -> str:
    payload = {
        "stac_url": stac_url,
        "collection": collection,
        "bbox": [round(value, 6) for value in bounds.lonlat],
        "time": time_value,
        "maxcc": maxcc,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


def load_cached_item(cache_dir: Path, key: str, ttl_seconds: int) -> dict | None:
    path = cache_dir / f"{key}.json"
    if not path.exists():
        return None
    if ttl_seconds > 0 and (datetime.now(timezone.utc).timestamp() - path.stat().st_mtime) > ttl_seconds:
        return None
    try:
        return json.loads(path.read_text())
    except Exception:
        return None


def store_cached_item(cache_dir: Path, key: str, item_info: dict) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    (cache_dir / f"{key}.json").write_text(json.dumps(item_info, sort_keys=True))


def item_to_info(item) -> dict:
    return {
        "id": item.id,
        "cloud": item.properties.get("eo:cloud_cover"),
        "datetime": item.datetime.isoformat() if item.datetime else None,
        "assets": {band: item.assets[asset_key].href for band, asset_key in BAND_ASSETS.items()},
    }


def find_item(stac_url: str, collection: str, bounds: TileBounds, time_value: str, maxcc: float, cache_dir: Path, cache_ttl: int) -> dict:
    cache_key = item_cache_key(stac_url, collection, bounds, time_value, maxcc)
    cached = load_cached_item(cache_dir, cache_key, cache_ttl)
    if cached:
        return cached

    start, end = parse_time_window(time_value)
    client = Client.open(stac_url)
    search = client.search(
        collections=[collection],
        bbox=list(bounds.lonlat),
        datetime=f"{start}/{end}",
        query={"eo:cloud_cover": {"lt": maxcc}},
        limit=20,
    )
    required_assets = set(BAND_ASSETS.values())
    items = [item for item in search.items() if required_assets.issubset(set(item.assets))]
    if not items:
        raise RuntimeError(f"No Sentinel-2 L2A COG items found for bbox={bounds.lonlat} time={start}/{end}")

    target = target_date(time_value)

    def sort_key(item):
        cloud = float(item.properties.get("eo:cloud_cover") or 999)
        dt = item.datetime or target
        delta_days = abs((dt - target).total_seconds()) / 86400
        return cloud, delta_days

    selected = item_to_info(sorted(items, key=sort_key)[0])
    store_cached_item(cache_dir, cache_key, selected)
    return selected


def configure_gdal() -> None:
    os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
    os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.TIF,.tiff,.TIFF")
    os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")


def read_asset(href: str, bounds_mercator: tuple[float, float, float, float], size: int, resampling: Resampling) -> np.ndarray:
    with rasterio.Env():
        with rasterio.open(href) as src:
            with WarpedVRT(src, crs=WEB_MERCATOR, resampling=resampling) as vrt:
                window = from_bounds(*bounds_mercator, transform=vrt.transform)
                data = vrt.read(
                    1,
                    window=window,
                    out_shape=(size, size),
                    fill_value=0,
                    masked=True,
                )
    return np.ma.filled(data, 0)


def read_bands(item: dict, needed_bands: Iterable[str], bounds: TileBounds, size: int) -> tuple[dict[str, np.ndarray], np.ndarray]:
    arrays: dict[str, np.ndarray] = {}
    for band in needed_bands:
        href = item["assets"][band]
        arrays[band] = read_asset(href, bounds.mercator, size, Resampling.bilinear).astype("float32") / 10000.0

    scl = read_asset(item["assets"]["SCL"], bounds.mercator, size, Resampling.nearest).astype("uint8")
    clear = np.isin(scl, list(CLEAR_SCL_CLASSES))
    valid = clear & np.any(np.stack([arrays[band] > 0 for band in arrays]), axis=0)
    return arrays, valid


def normdiff(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    return np.divide(a - b, a + b + 0.0001)


def clamp01(values: np.ndarray) -> np.ndarray:
    return np.clip(values, 0, 1)


def colorize(score: np.ndarray, valid: np.ndarray, palette: list[tuple[int, int, int]], threshold: float) -> np.ndarray:
    score = clamp01(score)
    n = len(palette) - 1
    scaled = score * n
    lo = np.floor(scaled).astype("int16")
    lo = np.clip(lo, 0, n)
    hi = np.clip(lo + 1, 0, n)
    frac = (scaled - lo)[..., None]
    colors = np.array(palette, dtype="float32")
    rgb = colors[lo] * (1 - frac) + colors[hi] * frac
    ramp = clamp01((score - threshold) / max(0.0001, 1 - threshold))
    alpha = np.where((score >= threshold) & valid, 70 + ramp * 165, 0)
    return np.dstack([rgb.astype("uint8"), alpha])


def render_true_color(b: dict[str, np.ndarray], valid: np.ndarray) -> np.ndarray:
    rgb = np.dstack([b["B04"], b["B03"], b["B02"]])
    rgb = clamp01((rgb - 0.02) / (0.35 - 0.02))
    rgb = np.power(rgb, 1 / 1.15)
    alpha = valid.astype("uint8") * 255
    return np.dstack([(rgb * 255).astype("uint8"), alpha])


def render_index(index_key: str, b: dict[str, np.ndarray], valid: np.ndarray) -> np.ndarray:
    bsi = normdiff(b["B11"] + b["B04"], b["B08"] + b["B02"])
    ndsi = normdiff(b["B11"], b["B12"])
    ndwi = normdiff(b["B03"], b["B11"])
    ndvi = normdiff(b["B08"], b["B04"])

    if index_key == "pwi":
        hcai = normdiff(b["B11"], b["B04"])
        hmri = np.divide(b["B12"], b["B03"] + 0.0001)
        score = np.power(
            clamp01(
                np.maximum(0, ndsi - 0.05)
                * np.maximum(0, (hcai - 0.20) * 2)
                * np.maximum(0, (hmri - 1.50) * 2)
                * 20
            ),
            3,
        )
        return colorize(score, valid, [(0, 255, 255), (255, 0, 255), (204, 255, 0)], 0.05)

    if index_key == "hpwi":
        ndoi = normdiff(b["B02"], b["B12"])
        smooth = normdiff(b["B03"], b["B11"])
        score = clamp01(
            clamp01(np.maximum(0, ndoi) + np.maximum(0, ndsi - 0.06) * 0.8)
            * np.maximum(0, np.minimum(1, (smooth + 0.3) / 0.6))
            * 6
        )
        return colorize(score, valid, [(75, 0, 130), (231, 76, 60), (241, 196, 15)], 0.08)

    if index_key == "pwoi":
        score = clamp01(
            np.maximum(0, ndsi - 0.12)
            * np.maximum(0, bsi)
            * np.maximum(0, 1 - ndvi)
            * 18
        )
        return colorize(score, valid, [(0, 16, 42), (0, 210, 255), (255, 0, 255), (140, 0, 255)], 0.10)

    if index_key == "lbi":
        score = clamp01(
            np.where(bsi < -0.25, 0, 1)
            * np.maximum(0, ndsi - 0.02)
            * np.maximum(0, ndwi + 0.40)
            * np.maximum(0, 0.45 - ndvi)
            * np.maximum(0, bsi + 0.20)
            * 20
        )
        return colorize(score, valid, [(0, 85, 255), (0, 210, 255), (255, 255, 255)], 0.08)

    return render_true_color(b, valid)


def write_png(rgba: np.ndarray, output: Path | None) -> None:
    image = Image.fromarray(rgba.astype("uint8"), mode="RGBA")
    if output:
        output.parent.mkdir(parents=True, exist_ok=True)
        image.save(output, format="PNG")
    else:
        image.save(sys.stdout.buffer, format="PNG")


def transparent_tile(size: int) -> np.ndarray:
    return np.zeros((size, size, 4), dtype="uint8")


def main() -> int:
    args = parse_args()
    configure_gdal()
    index_key = str(args.index or "tc").lower()
    if index_key not in INDEX_BANDS:
        print(json.dumps({"error": f"Unsupported COG index: {index_key}"}), file=sys.stderr)
        return 2
    needed = INDEX_BANDS[index_key]
    bounds = tile_bounds(args.z, args.x, args.y)

    try:
        item = find_item(args.stac_url, args.collection, bounds, args.time, args.maxcc, args.item_cache_dir, args.item_cache_ttl)
        bands, valid = read_bands(item, needed, bounds, args.size)
        if index_key in {"tc", "truecolor", "true-color"}:
            rgba = render_true_color(bands, valid)
        else:
            rgba = render_index(index_key, bands, valid)
        write_png(rgba, args.output)
        print(
            json.dumps({
                "item": item["id"],
                "cloud": item["cloud"],
                "datetime": item["datetime"],
            }),
            file=sys.stderr,
        )
        return 0
    except Exception as exc:
        if os.environ.get("COG_TRANSPARENT_ON_ERROR", "0") == "1":
            write_png(transparent_tile(args.size), args.output)
            print(json.dumps({"warning": str(exc)}), file=sys.stderr)
            return 0
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
