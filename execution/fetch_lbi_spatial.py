"""Per-pixel LBI test — does the Liquid Brine Index fire on standing brine bodies?

The box-MEAN LBI validation was doubly flawed for water bodies: (1) it used the batch
approximation, not the shipped evalscript (which has a standing-water bypass), and
(2) a 500 m mean mixes a small water body with surrounding land, driving NDWI negative
and breaking every water gate. This runs the ACTUAL shipped LBI evalscript
(src/indices.js `lbi`) per pixel and reports, over each site's box:
  - lbi_max  : brightest pixel
  - hit_frac : fraction of valid pixels that render (LBI >= 0.08 blank gate)
for the labeled validation sites (standing brine / freshwater control) and the 150
caliche background points. Water pixels are then evaluated on their own, not diluted.

Usage:
    python3 execution/fetch_lbi_spatial.py
"""
from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests
import urllib3

sys.path.insert(0, str(Path(__file__).resolve().parent))
from batch_analyze_spills import get_token, STAT_API_URL  # noqa: E402

urllib3.disable_warnings()
REPO = Path(__file__).resolve().parents[1]
TOKEN_TTL = 480.0

# Shipped LBI per pixel (src/indices.js `lbi`), incl. the standing-water bypass.
EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: ["B02","B03","B04","B08","B11","B12","dataMask"],
    output: [
      {id:"lbi", bands:1, sampleType:"FLOAT32"},
      {id:"hit", bands:1, sampleType:"FLOAT32"},
      {id:"dataMask", bands:1}
    ]
  };
}
function evaluatePixel(s) {
  if (s.dataMask===0) return {lbi:[NaN], hit:[NaN], dataMask:[0]};
  var ndsi=(s.B11+s.B12)===0?0:(s.B11-s.B12)/(s.B11+s.B12);
  var ndwi=(s.B03+s.B11)===0?0:(s.B03-s.B11)/(s.B03+s.B11);
  var ndvi=(s.B08+s.B04)===0?0:(s.B08-s.B04)/(s.B08+s.B04);
  var bsiBot=(s.B11+s.B04)+(s.B08+s.B02);
  var bsi=bsiBot===0?0:((s.B11+s.B04)-(s.B08+s.B02))/bsiBot;
  var isStandingWater = ndwi > 0.30;
  if (bsi <= -0.25 && !isStandingWater) return {lbi:[0], hit:[0], dataMask:[1]};
  var brineGate=Math.max(0, ndsi-0.02);
  var liquidGate=Math.max(0, ndwi+0.40);
  var lowVegGate=Math.max(0, 0.45-ndvi);
  var surfaceGate = isStandingWater ? 1.0 : Math.max(0, bsi+0.20);
  var score=brineGate*liquidGate*lowVegGate*surfaceGate;
  var mapped=Math.min(1.0, score*20.0);
  var v = mapped>=0.08 ? mapped : 0.0;
  return {lbi:[v], hit:[v>0?1.0:0.0], dataMask:[1]};
}
"""


def fetch_spatial(token, lon, lat, date, half=0.0025):
    dt = datetime.strptime(date, "%Y-%m-%d")
    start = (dt - timedelta(days=15)).strftime("%Y-%m-%dT00:00:00Z")
    end = (dt + timedelta(days=15)).strftime("%Y-%m-%dT23:59:59Z")
    body = {
        "input": {"bounds": {"bbox": [lon-half, lat-half, lon+half, lat+half],
                             "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"}},
                  "data": [{"type": "sentinel-2-l2a"}]},
        "aggregation": {"timeRange": {"from": start, "to": end},
                        "aggregationInterval": {"of": "P30D"}, "resampling": "NEAREST",
                        "evalscript": EVALSCRIPT},
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json",
               "Host": "sh.dataspace.copernicus.eu"}
    r = requests.post(STAT_API_URL, json=body, headers=headers, verify=False)
    if r.status_code != 200:
        return None
    try:
        outs = r.json()["data"][0]["outputs"]
        lb = outs["lbi"]["bands"]["B0"]["stats"]
        hit = outs["hit"]["bands"]["B0"]["stats"]
        if lb["sampleCount"] == 0:
            return None
        return lb["mean"], lb["max"], hit["mean"], lb["sampleCount"]
    except (KeyError, IndexError):
        return None


def collect_points():
    pts = []
    v = pd.read_csv(REPO / "execution" / "brine_validation_bands.csv")
    for _, r in v.iterrows():
        pts.append((float(r.lon), float(r.lat), str(r.date), str(r.label), str(r["name"])))
    bg = pd.read_csv(REPO / "execution" / "background_raw.csv")
    for _, r in bg.iterrows():
        pts.append((float(r.lon), float(r.lat), str(r.date), "caliche", ""))
    return pts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", default=str(REPO / "execution" / "lbi_spatial.csv"))
    ap.add_argument("--sleep", type=float, default=5.0)
    args = ap.parse_args()

    pts = collect_points()
    print(f"{len(pts)} points ({sum(1 for p in pts if p[3] != 'caliche')} labeled, rest caliche).")

    out = Path(args.output)
    done, rows = set(), []
    if out.exists():
        rows = pd.read_csv(out).to_dict("records")
        done = {(round(float(r["lon"]), 5), round(float(r["lat"]), 5)) for r in rows}

    token = get_token(); token_at = time.monotonic(); ok = 0
    for i, (lon, lat, date, label, name) in enumerate(pts):
        if (round(lon, 5), round(lat, 5)) in done:
            continue
        if time.monotonic() - token_at > TOKEN_TTL:
            token = get_token(); token_at = time.monotonic()
        print(f"[{i+1}/{len(pts)}] {label[:4]} ({lat:.3f},{lon:.3f})...", end=" ", flush=True)
        try:
            res = fetch_spatial(token, lon, lat, date)
            if res:
                m, mx, hf, sc = res
                rows.append({"lon": lon, "lat": lat, "label": label, "name": name, "date": date,
                             "lbi_mean": m, "lbi_max": mx, "hit_frac": hf, "n_px": sc})
                pd.DataFrame(rows).to_csv(out, index=False)
                ok += 1
                print(f"max={mx:.3f} hit={hf*100:.1f}%")
            else:
                print("NO DATA.")
        except Exception as e:  # noqa: BLE001
            print(f"ERR {e}")
        time.sleep(args.sleep)
    print(f"\n{ok} new; {len(rows)} total -> {out}")


if __name__ == "__main__":
    main()
