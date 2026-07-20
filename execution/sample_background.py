"""Background / false-positive sampling for Limn produced-water composites.

Purpose
-------
The published detection rates (PWCI 81.5%, ASAI 77.8%, OBEC 66.7%) are spill-site
*recall* only. To make any false-positive claim we must measure how often each
composite fires on ordinary Permian Basin background — bare caliche, dry playas,
roads, rangeland, and non-spill well pads — that carries no produced-water event.

This script:
  1. Deterministically samples random points across the Permian study-area bbox,
     excluding a buffer around every known spill/verified site so a "background"
     point is never an actual event.
  2. Fetches Sentinel-2 L2A band means at each point (same Statistics API window
     and 500 m box as batch_analyze_spills.py).
  3. Computes every index with the identical math (imported from
     batch_analyze_spills.calculate_indices) so background and spill numbers are
     directly comparable.
  4. Writes raw per-point scores to CSV. Compute the false-positive floor with
     summarize_false_positives.py.

The false-positive rate at threshold t is:  (# background points with score > t) / N.

Usage
-----
    python3 execution/sample_background.py --n 160 --seed 42
    python3 execution/sample_background.py --n 20 --seed 7 --dry-run   # no API calls

Credentials: CDSE client id/secret are read from env (CDSE_CLIENT_ID /
CDSE_CLIENT_SECRET), falling back to the module defaults in batch_analyze_spills.
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
import time
from pathlib import Path

import pandas as pd

# Reuse the exact production index math and API plumbing.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from batch_analyze_spills import calculate_indices, fetch_stats, get_token  # noqa: E402

REPO = Path(__file__).resolve().parents[1]

# Permian study-area bounding box (derived from data/rrc_spills.json extent,
# padded slightly). lon_min, lat_min, lon_max, lat_max.
STUDY_BBOX = (-104.30, 31.05, -101.15, 32.35)

# A background point must be at least this far (degrees, ~1.1 km/0.01deg) from any
# known spill/verified site so we never sample an actual event as "background".
EXCLUSION_DEG = 0.02  # ~2.2 km

# Representative imagery date for background scenes. Arid, low-cloud summer window
# in the middle of the validation era; the ±15-day Statistics window brackets it.
BACKGROUND_DATE = "2023-07-15"


def load_known_sites() -> list[tuple[float, float]]:
    """All spill/verified coordinates to exclude from background sampling."""
    sites: list[tuple[float, float]] = []
    for name in ("rrc_spills.json", "verified_spills.json"):
        p = REPO / "data" / name
        if not p.exists():
            continue
        gj = json.loads(p.read_text())
        for feat in gj.get("features", []):
            lon, lat = feat["geometry"]["coordinates"]
            sites.append((float(lon), float(lat)))
    return sites


def far_from_all(lon: float, lat: float, sites: list[tuple[float, float]]) -> bool:
    for slon, slat in sites:
        if math.hypot(lon - slon, lat - slat) < EXCLUSION_DEG:
            return False
    return True


def generate_points(n: int, seed: int, sites: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Deterministic uniform-random points in STUDY_BBOX, excluding site buffers."""
    rng = random.Random(seed)
    lon_min, lat_min, lon_max, lat_max = STUDY_BBOX
    pts: list[tuple[float, float]] = []
    attempts = 0
    while len(pts) < n and attempts < n * 100:
        attempts += 1
        lon = rng.uniform(lon_min, lon_max)
        lat = rng.uniform(lat_min, lat_max)
        if far_from_all(lon, lat, sites):
            pts.append((round(lon, 6), round(lat, 6)))
    if len(pts) < n:
        print(f"WARNING: only generated {len(pts)}/{n} points after {attempts} attempts.")
    return pts


def main() -> None:
    ap = argparse.ArgumentParser(description="Sample Permian background points for false-positive analysis.")
    ap.add_argument("--n", type=int, default=160, help="Number of background points (default 160).")
    ap.add_argument("--seed", type=int, default=42, help="RNG seed for reproducibility (default 42).")
    ap.add_argument("--date", default=BACKGROUND_DATE, help=f"Imagery date (default {BACKGROUND_DATE}).")
    ap.add_argument("--output", default=None, help="Output CSV (default execution/background_raw.csv).")
    ap.add_argument("--sleep", type=float, default=10.0, help="Seconds between API calls (rate limit).")
    ap.add_argument("--dry-run", action="store_true", help="Generate points only; no API calls.")
    args = ap.parse_args()

    out_path = Path(args.output) if args.output else REPO / "execution" / "background_raw.csv"

    sites = load_known_sites()
    points = generate_points(args.n, args.seed, sites)
    print(f"Generated {len(points)} background points (seed={args.seed}), "
          f"excluding {len(sites)} known sites within {EXCLUSION_DEG}deg.")

    if args.dry_run:
        preview = pd.DataFrame(points, columns=["lon", "lat"])
        print(preview.head(10).to_string(index=False))
        print(f"[dry-run] Would fetch {len(points)} scenes at date {args.date}. No API calls made.")
        return

    # Resume support: skip points already in the output CSV.
    done: set[tuple[float, float]] = set()
    results: list[dict] = []
    if out_path.exists():
        prior = pd.read_csv(out_path).to_dict("records")
        results = prior
        done = {(round(float(r["lon"]), 6), round(float(r["lat"]), 6)) for r in prior}
        print(f"Resuming: {len(done)} points already sampled.")

    # CDSE access tokens expire after ~10 min; refresh well before that on a
    # long unattended run (fetching one token upfront silently 401s partway
    # through and yields near-total no-data — see knowledge/ERRORS.md 2026-07-19).
    TOKEN_TTL = 480.0  # seconds
    token = get_token()
    token_at = time.monotonic()

    fetched = 0
    empty = 0
    for i, (lon, lat) in enumerate(points):
        if (lon, lat) in done:
            continue
        if time.monotonic() - token_at > TOKEN_TTL:
            token = get_token()
            token_at = time.monotonic()
        print(f"[{i+1}/{len(points)}] ({lat:.4f}, {lon:.4f})...", end=" ", flush=True)
        try:
            stats = fetch_stats(token, lon, lat, args.date)
            if stats:
                idx = calculate_indices(stats)
                results.append({"lon": lon, "lat": lat, "date": args.date, **idx})
                pd.DataFrame(results).to_csv(out_path, index=False)
                fetched += 1
                print("DONE.")
            else:
                empty += 1
                print("NO DATA.")
        except Exception as e:  # noqa: BLE001 - log and continue for unattended runs
            print(f"ERROR: {e}")
        time.sleep(args.sleep)

    print(f"\nBackground sampling complete: {fetched} scored, {empty} no-data, "
          f"{len(results)} total rows -> {out_path}")
    print("Next: python3 execution/summarize_false_positives.py")


if __name__ == "__main__":
    main()
