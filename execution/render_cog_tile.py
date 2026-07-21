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
CLEAR_SCL_CLASSES = {4, 5, 6, 7}
ITEM_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60

BAND_ASSETS = {
    "B02": "blue",
    "B03": "green",
    "B04": "red",
    "B05": "rededge1",
    "B08": "nir",
    "B8A": "nir08",
    "B11": "swir16",
    "B12": "swir22",
    "SCL": "scl",
}

INDEX_BANDS = {
    "tc": ["B02", "B03", "B04"],
    "truecolor": ["B02", "B03", "B04"],
    "true-color": ["B02", "B03", "B04"],
    "swir_rgb": ["B04", "B11", "B12"],
    "awei": ["B02", "B03", "B08", "B11", "B12"],
    "ndre": ["B05", "B8A"],
    "ndmi": ["B8A", "B11"],
    "ndwi": ["B03", "B11"],
    "ndvi": ["B04", "B08"],
    "savi": ["B04", "B08"],
    "bsi": ["B02", "B04", "B08", "B11"],
    "ndsi": ["B11", "B12"],
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
    parser.add_argument("--sensitivity", type=float, default=0.0)
    parser.add_argument("--basin", default="permian")
    parser.add_argument("--visual-filter", type=float, default=0.0)
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


def render_swir_context(b: dict[str, np.ndarray], valid: np.ndarray) -> np.ndarray:
    rgb = np.dstack([b["B12"], b["B11"], b["B04"]])
    rgb = clamp01((rgb - 0.02) / (0.42 - 0.02))
    rgb = np.power(rgb, 1 / 1.12)
    alpha = valid.astype("uint8") * 255
    return np.dstack([(rgb * 255).astype("uint8"), alpha])


def render_index(
    index_key: str,
    b: dict[str, np.ndarray],
    valid: np.ndarray,
    sensitivity_percent: float = 0.0,
    basin: str = "permian",
    visual_filter: float = 0.0,
) -> np.ndarray:
    sensitivity = sensitivity_percent / 100.0
    display_floor = max(0.0, min(1.0, visual_filter))

    if index_key == "ndwi":
        score = clamp01(normdiff(b["B03"], b["B11"]) + 0.3)
        return colorize(score, valid, [(130, 70, 20), (215, 170, 60), (80, 150, 200), (20, 80, 180)], display_floor)

    if index_key == "ndmi":
        score = clamp01(normdiff(b["B8A"], b["B11"]) + 0.3)
        return colorize(score, valid, [(212, 106, 36), (239, 216, 122), (28, 133, 166), (10, 60, 100)], display_floor)

    if index_key == "ndvi":
        score = clamp01(normdiff(b["B08"], b["B04"]) + 0.1)
        return colorize(score, valid, [(160, 120, 50), (210, 180, 60), (90, 160, 60), (20, 100, 40)], display_floor)

    if index_key == "savi":
        savi = ((b["B08"] - b["B04"]) / (b["B08"] + b["B04"] + 0.5)) * 1.5
        return colorize(clamp01(savi + 0.2), valid, [(160, 120, 50), (210, 180, 60), (90, 160, 60), (20, 100, 40)], display_floor)

    if index_key == "bsi":
        bsi = normdiff(b["B11"] + b["B04"], b["B08"] + b["B02"])
        return colorize(clamp01(bsi), valid, [(0, 0, 0), (68, 136, 51), (210, 180, 60), (160, 120, 50)], display_floor)

    if index_key == "ndsi":
        score = clamp01(np.maximum(0, normdiff(b["B11"], b["B12"]) * 2))
        return colorize(score, valid, [(10, 60, 100), (120, 100, 50), (240, 80, 30), (230, 20, 20)], display_floor)

    if index_key == "awei":
        raw = b["B02"] + 2.5 * b["B03"] - 1.5 * (b["B08"] + b["B11"]) - 0.25 * b["B12"]
        score = clamp01(np.maximum(0, raw * 5))
        return colorize(score, valid, [(48, 36, 18), (193, 154, 72), (35, 151, 181), (8, 67, 128)], max(0.01, display_floor))

    if index_key == "ndre":
        score = clamp01(normdiff(b["B8A"], b["B05"]) + 0.1)
        return colorize(score, valid, [(105, 56, 32), (205, 167, 72), (92, 151, 71), (16, 91, 52)], display_floor)

    bsi = normdiff(b["B11"] + b["B04"], b["B08"] + b["B02"])
    ndsi = normdiff(b["B11"], b["B12"])
    ndwi = normdiff(b["B03"], b["B11"])
    ndvi = normdiff(b["B08"], b["B04"])

    if index_key == "pwi":
        calibration = {
            "permian": (-0.3, 0.10, 0.30, 2.0),
            "standard": (-0.1, 0.05, 0.15, 1.5),
        }.get(basin, (-0.3, 0.10, 0.30, 2.0))
        bsi_mask, salinity_offset, surface_offset, ratio_offset = calibration
        hcai = normdiff(b["B11"], b["B04"])
        hmri = np.divide(b["B12"], b["B03"] + 0.0001)
        raw = (
            np.maximum(0, ndsi - salinity_offset)
            * np.maximum(0, (hcai - surface_offset) * 2)
            * np.maximum(0, (hmri - ratio_offset) * 2)
        )
        score = np.where(bsi > bsi_mask, clamp01(np.power(raw * 20, 3)), 0)
        return colorize(score, valid, [(0, 255, 255), (255, 0, 255), (204, 255, 0)], max(0.05, display_floor))

    if index_key == "hpwi":
        ndoi = normdiff(b["B02"], b["B12"])
        brine_threshold = max(0.04, 0.06 - sensitivity * 0.03)
        score = clamp01(
            clamp01(np.maximum(0, ndoi) + np.maximum(0, ndsi - brine_threshold) * 0.8)
            * clamp01((ndwi + 0.3) / 0.6)
            * 6
        )
        return colorize(score, valid, [(75, 0, 130), (231, 76, 60), (241, 196, 15)], max(0.08, display_floor))

    if index_key == "pwoi":
        radar_proxy = clamp01((ndwi + 0.3) / 0.6)
        salinity_gate = clamp01((ndsi - 0.035) / 0.16)
        wet = np.where((radar_proxy > 0.58) & (salinity_gate > 0), clamp01(radar_proxy * 0.42 + salinity_gate * 0.58), 0)
        dry = np.where(
            (ndwi < -0.42) & (ndsi > 0.15) & (bsi > 0.52),
            clamp01((ndsi - 0.15) / 0.16 * 0.45 + 0.55),
            0,
        )
        score = clamp01(np.maximum(wet, dry))
        return colorize(score, valid, [(0, 16, 42), (0, 210, 255), (255, 0, 255), (140, 0, 255)], max(0.60, display_floor))

    if index_key == "lbi":
        standing_water = ndwi > 0.30
        surface_gate = np.where(standing_water, 1.0, np.maximum(0, bsi + 0.20))
        score = clamp01(
            np.where((bsi <= -0.25) & ~standing_water, 0, 1)
            * np.maximum(0, ndsi - 0.02)
            * np.maximum(0, ndwi + 0.40)
            * np.maximum(0, 0.45 - ndvi)
            * surface_gate
            * 20
        )
        return colorize(score, valid, [(0, 85, 255), (0, 210, 255), (255, 255, 255)], max(0.08, display_floor))

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
        elif index_key == "swir_rgb":
            rgba = render_swir_context(bands, valid)
        else:
            rgba = render_index(index_key, bands, valid, args.sensitivity, args.basin, args.visual_filter)
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
