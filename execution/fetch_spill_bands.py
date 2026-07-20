"""Fetch raw Sentinel-2 band means for spill sites at their event dates.

The threshold sweep needs to re-score composites at arbitrary thresholds, which
requires raw bands — but execution/validation_raw.csv stores only computed index
values. This pulls raw band means (same Statistics API window as the pipeline) for
each spill record into a self-sufficient CSV.

Usage:
    python3 execution/fetch_spill_bands.py                       # rrc_spills, 27 sites
    python3 execution/fetch_spill_bands.py --spills data/verified_spills.json
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from batch_analyze_spills import fetch_stats, get_token  # noqa: E402

REPO = Path(__file__).resolve().parents[1]
TOKEN_TTL = 480.0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--spills", default=str(REPO / "data" / "rrc_spills.json"))
    ap.add_argument("--output", default=str(REPO / "execution" / "spill_bands.csv"))
    ap.add_argument("--sleep", type=float, default=5.0)
    args = ap.parse_args()

    gj = json.loads(Path(args.spills).read_text())
    feats = gj["features"]
    out_path = Path(args.output)

    done: set[tuple] = set()
    results: list[dict] = []
    if out_path.exists():
        results = pd.read_csv(out_path).to_dict("records")
        done = {(round(float(r["lon"]), 5), round(float(r["lat"]), 5)) for r in results}
        print(f"Resuming: {len(done)} already fetched.")

    token = get_token()
    token_at = time.monotonic()
    ok = 0
    for i, feat in enumerate(feats):
        lon, lat = feat["geometry"]["coordinates"]
        date = feat["properties"].get("date") or feat["properties"].get("incident_date")
        if (round(lon, 5), round(lat, 5)) in done:
            continue
        if time.monotonic() - token_at > TOKEN_TTL:
            token = get_token()
            token_at = time.monotonic()
        print(f"[{i+1}/{len(feats)}] ({lat:.4f}, {lon:.4f}) {date}...", end=" ", flush=True)
        try:
            stats = fetch_stats(token, lon, lat, date)
            if stats:
                results.append({"lon": lon, "lat": lat, "date": date, **stats})
                pd.DataFrame(results).to_csv(out_path, index=False)
                ok += 1
                print("DONE.")
            else:
                print("NO DATA.")
        except Exception as e:  # noqa: BLE001
            print(f"ERROR: {e}")
        time.sleep(args.sleep)

    print(f"\nFetched {ok} new; {len(results)} total -> {out_path}")


if __name__ == "__main__":
    main()
