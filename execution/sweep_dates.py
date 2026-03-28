#!/usr/bin/env python3
"""
Multi-date site sweep — find peak detection date per spill site.

For each site in the input spill dataset, queries Sentinel Hub Statistics API
across N individual acquisition windows spanning ±90 days of the reported spill
date. Identifies the date with peak APEX+HPWI signal, which is often not the
reported date (TRRC filings can lag weeks; imagery clouded on a given day).

Batch size = 4 (respects Sentinel Hub 4-concurrent rate limit).
Sleep = 8s between sites (conservative for API health).

Usage:
    python3 execution/sweep_dates.py [--spills data/rrc_spills.json] [--days 90]
                                     [--interval 10] [--output execution/sweep_results.csv]
    python3 execution/sweep_dates.py --spills data/verified_spills.json   # new dataset

Output:
    execution/sweep_results.csv  — one row per site with best date and peak scores
    execution/sweep_all_dates.csv — full per-date scores for all sites (for plotting)
"""
import argparse
import json
import time
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import requests

# ── Auth / API ────────────────────────────────────────────────────────────────
AUTH_URL    = "https://194.146.60.13/auth/realms/CDSE/protocol/openid-connect/token"
STAT_API_URL = "https://64.225.130.53/api/v1/statistics"

def get_token(client_id: str, client_secret: str) -> str:
    resp = requests.post(AUTH_URL, data={
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
    }, headers={"Host": "identity.dataspace.copernicus.eu"}, verify=False, timeout=30)
    resp.raise_for_status()
    return resp.json()["access_token"]


# ── Evalscript ────────────────────────────────────────────────────────────────
EVALSCRIPT = """
//VERSION=3
function setup() {
  return {
    input: ["B02","B03","B04","B05","B07","B08","B8A","B11","B12","dataMask"],
    output: [
      { id: "default", bands: 9, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0)
    return { default: [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN], dataMask: [0] };
  return {
    default: [sample.B02,sample.B03,sample.B04,sample.B05,sample.B07,
              sample.B08,sample.B8A,sample.B11,sample.B12],
    dataMask: [1]
  };
}
"""


def fetch_stats_window(token: str, lon: float, lat: float,
                        start: str, end: str) -> dict | None:
    """Fetch mean band stats for a single time window."""
    bbox = [lon - 0.0025, lat - 0.0025, lon + 0.0025, lat + 0.0025]
    req = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
            },
            "data": [{"type": "sentinel-2-l2a"}],
        },
        "aggregation": {
            "timeRange": {"from": start, "to": end},
            "aggregationInterval": {"of": "P5D"},   # 5-day composite per window
            "resampling": "NEAREST",
            "evalscript": EVALSCRIPT,
        },
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Host": "sh.dataspace.copernicus.eu",
    }
    try:
        resp = requests.post(STAT_API_URL, json=req, headers=headers, verify=False, timeout=30)
        if resp.status_code == 429:
            print("  429 rate limit — sleeping 30s")
            time.sleep(30)
            return None
        if resp.status_code != 200:
            return None
        data = resp.json()
        if not data.get("data"):
            return None
        # Return all time-bucket results
        return data["data"]
    except Exception:
        return None


def bands_from_bucket(bucket: dict) -> dict | None:
    out = bucket.get("outputs", {}).get("default", {}).get("bands", {})
    if "B0" not in out or out["B0"]["stats"]["sampleCount"] == 0:
        return None
    names = ["B02", "B03", "B04", "B05", "B07", "B08", "B8A", "B11", "B12"]
    return {name: out[f"B{i}"]["stats"]["mean"] for i, name in enumerate(names)}


# ── Index computation (lightweight — APEX + HPWI only for speed) ──────────────
def compute_apex_hpwi(bands: dict) -> dict:
    b02, b03, b04 = bands["B02"], bands["B03"], bands["B04"]
    b08, b11, b12 = bands["B08"], bands["B11"], bands["B12"]

    # APEX
    apex_sum = b03 + b11
    oval = (b03 - b11) / apex_sum if apex_sum > 0 else 0
    rp = max(0, min(1.2, (oval + 0.3) / 0.6))
    ns = b11 + b12
    bb = max(0, (b11 - b12) / ns) * 0.4 if ns > 0 else 0
    moist = oval + 0.3 + bb
    if rp > 0.7 and moist > 0.45:
        apex = (rp * 0.4) + (moist * 0.6) + 0.25
    else:
        apex = (rp * 0.3) + (moist * 0.7)
    apex = min(max(apex, 0), 1.0)

    # HPWI
    ndsi_s = b11 + b12
    ndsi = (b11 - b12) / ndsi_s if ndsi_s > 0 else 0
    ndoi_s = b02 + b12
    ndoi = max(0, (b02 - b12) / ndoi_s if ndoi_s > 0 else 0)
    brine_boost = max(0, ndsi - 0.03) * 0.8
    chem = min(1.0, ndoi + brine_boost)
    sm_s = b03 + b11
    sm = (b03 - b11) / sm_s if sm_s > 0 else 0
    nsm = max(0, min(1.0, (sm + 0.3) / 0.6))
    hpwi = min(1.0, chem * nsm * 6.0)

    return {"APEX": round(apex, 4), "HPWI": round(hpwi, 4),
            "composite": round((apex * 1.5 + hpwi * 1.5) / 3.0, 4)}


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spills", default="data/rrc_spills.json")
    parser.add_argument("--days", type=int, default=90,
                        help="Days before/after reported date to sweep")
    parser.add_argument("--interval", type=int, default=10,
                        help="Days between candidate windows")
    parser.add_argument("--output", default="execution/sweep_results.csv")
    parser.add_argument("--all-dates-output", default="execution/sweep_all_dates.csv")
    args = parser.parse_args()

    spills_path = Path(args.spills)
    if not spills_path.exists():
        print(f"ERROR: {spills_path} not found.")
        sys.exit(1)

    spills = json.loads(spills_path.read_text())
    features = spills["features"]
    print(f"Loaded {len(features)} sites from {spills_path.name}")
    print(f"Sweep window: ±{args.days} days, step {args.interval} days per site")

    # Load credentials from batch_analyze_spills.py pattern
    # (reads from same module-level constants to avoid duplication)
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "batch", Path("execution/batch_analyze_spills.py"))
    batch_mod = importlib.util.module_from_spec(spec)  # type: ignore
    spec.loader.exec_module(batch_mod)  # type: ignore
    client_id     = batch_mod.CLIENT_ID
    client_secret = batch_mod.CLIENT_SECRET

    token = get_token(client_id, client_secret)
    token_refresh_at = datetime.now() + timedelta(minutes=55)

    site_bests: list[dict] = []
    all_date_rows: list[dict] = []

    for site_idx, feat in enumerate(features):
        props = feat["properties"]
        lon, lat = feat["geometry"]["coordinates"]
        reported_date = datetime.strptime(props["date"], "%Y-%m-%d")
        label = props.get("operator", f"site_{site_idx}")

        # Refresh token if needed
        if datetime.now() >= token_refresh_at:
            print("  Refreshing auth token...")
            token = get_token(client_id, client_secret)
            token_refresh_at = datetime.now() + timedelta(minutes=55)

        # Generate candidate windows
        offsets = range(-args.days, args.days + 1, args.interval)
        windows = []
        for off in offsets:
            center = reported_date + timedelta(days=off)
            w_start = (center - timedelta(days=2)).strftime("%Y-%m-%dT00:00:00Z")
            w_end   = (center + timedelta(days=2)).strftime("%Y-%m-%dT23:59:59Z")
            windows.append((center.strftime("%Y-%m-%d"), w_start, w_end))

        print(f"[{site_idx+1}/{len(features)}] {label[:40]:40s} "
              f"({len(windows)} windows)...", end=" ", flush=True)

        site_rows: list[dict] = []

        # Process in batches of 4
        for batch_start in range(0, len(windows), 4):
            batch = windows[batch_start: batch_start + 4]
            for date_label, w_start, w_end in batch:
                buckets = fetch_stats_window(token, lon, lat, w_start, w_end)
                if not buckets:
                    continue
                for bucket in buckets:
                    bands = bands_from_bucket(bucket)
                    if bands is None:
                        continue
                    scores = compute_apex_hpwi(bands)
                    row = {
                        "operator": label,
                        "reported_date": props["date"],
                        "window_center": date_label,
                        "bucket_date": bucket.get("interval", {}).get("from", date_label)[:10],
                        "lon": lon,
                        "lat": lat,
                        **scores,
                    }
                    site_rows.append(row)
            time.sleep(8)  # rate limit: 8s per batch of 4

        if site_rows:
            all_date_rows.extend(site_rows)
            best = max(site_rows, key=lambda r: r["composite"])
            site_bests.append({
                "operator":      label,
                "county":        props.get("county", ""),
                "reported_date": props["date"],
                "best_date":     best["bucket_date"],
                "days_offset":   (datetime.strptime(best["bucket_date"], "%Y-%m-%d") - reported_date).days,
                "peak_APEX":     best["APEX"],
                "peak_HPWI":     best["HPWI"],
                "peak_composite": best["composite"],
                "n_windows_scored": len(site_rows),
            })
            print(f"peak {best['composite']:.3f} on {best['bucket_date']} "
                  f"(offset {site_bests[-1]['days_offset']:+d}d)")
        else:
            print("no data")

    if site_bests:
        best_df = pd.DataFrame(site_bests)
        best_df.to_csv(args.output, index=False)
        print(f"\nWrote {len(best_df)} site results → {args.output}")

        avg_offset = best_df["days_offset"].mean()
        print(f"Average best-date offset from reported date: {avg_offset:+.1f} days")
        print(f"Sites where best date ≠ reported date (>5d offset): "
              f"{(best_df['days_offset'].abs() > 5).sum()}")

    if all_date_rows:
        pd.DataFrame(all_date_rows).to_csv(args.all_dates_output, index=False)
        print(f"Wrote full date sweep → {args.all_dates_output}")


if __name__ == "__main__":
    main()
