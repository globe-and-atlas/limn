"""Per-pixel (spatial) PWCI test — does the flagship show localized visual signal?

The box-MEAN analysis (summarize/sweep) collapsed each site to one scalar and found
no discrimination. But the app renders PWCI per pixel at 10-20 m, and localized
bright features (what the eye catches at a spill) are washed out by a 500 m mean.
This measures the spatial signal directly: it runs the SHIPPED VIEWER PWCI
evalscript (Permian preset) per pixel and, over each site's box, returns
  - pwci_mean : box mean (for reference)
  - pwci_max  : brightest pixel
  - hit_frac  : fraction of valid pixels that render (PWCI >= 0.05 blank gate)
for both spill sites and background points. Compare distributions with
analyze_pwci_spatial.py: if spill boxes have bright pixels / non-zero coverage
while background boxes are dark, PWCI is a real visual anomaly highlighter even
though its box-mean does not discriminate.

Usage:
    python3 execution/fetch_pwci_spatial.py            # 32 spills + 150 background
    python3 execution/fetch_pwci_spatial.py --dry-run
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import pandas as pd
import requests
import urllib3

sys.path.insert(0, str(Path(__file__).resolve().parent))
from batch_analyze_spills import get_token, STAT_API_URL  # noqa: E402

urllib3.disable_warnings()
REPO = Path(__file__).resolve().parents[1]
TOKEN_TTL = 480.0

# Viewer PWCI per pixel, Permian preset (tau 0.10/0.30/2.0, BSI mask -0.3,
# cubic stretch, 0.05 blank gate) — mirrors src/indices.js `pwi` evalscript.
EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: ["B02","B03","B04","B08","B11","B12","dataMask"],
    output: [
      {id:"pwci", bands:1, sampleType:"FLOAT32"},
      {id:"hit", bands:1, sampleType:"FLOAT32"},
      {id:"dataMask", bands:1}
    ]
  };
}
function evaluatePixel(s) {
  if (s.dataMask===0) return {pwci:[NaN], hit:[NaN], dataMask:[0]};
  var bsiBot=(s.B11+s.B04)+(s.B08+s.B02);
  var bsi = bsiBot===0 ? 0 : ((s.B11+s.B04)-(s.B08+s.B02))/bsiBot;
  var v=0.0;
  if (bsi > -0.3) {
    var sb=s.B11+s.B12;
    var brine = sb===0?0:(s.B11-s.B12)/sb;
    var sh=s.B11+s.B04;
    var hcai = sh===0?0:(s.B11-s.B04)/sh;
    var hmri = s.B03===0?0:s.B12/s.B03;
    var bs=Math.max(0, brine-0.10);
    var hs=Math.max(0, (hcai-0.30)*2.0);
    var ms=Math.max(0, (hmri-2.0)*2.0);
    var p=bs*hs*ms;
    var m=Math.min(1.0, Math.pow(p*20.0, 3.0));
    if (m>=0.05) v=m;
  }
  return {pwci:[v], hit:[v>0?1.0:0.0], dataMask:[1]};
}
"""


def fetch_spatial(token, lon, lat, date, half=0.0025):
    """Return (pwci_mean, pwci_max, hit_frac, sample_count) over a box, or None."""
    from datetime import datetime, timedelta
    dt = datetime.strptime(date, "%Y-%m-%d")
    start = (dt - timedelta(days=15)).strftime("%Y-%m-%dT00:00:00Z")
    end = (dt + timedelta(days=15)).strftime("%Y-%m-%dT23:59:59Z")
    body = {
        "input": {
            "bounds": {"bbox": [lon-half, lat-half, lon+half, lat+half],
                       "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"}},
            "data": [{"type": "sentinel-2-l2a"}],
        },
        "aggregation": {
            "timeRange": {"from": start, "to": end},
            "aggregationInterval": {"of": "P30D"},
            "resampling": "NEAREST",
            "evalscript": EVALSCRIPT,
        },
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json",
               "Host": "sh.dataspace.copernicus.eu"}
    r = requests.post(STAT_API_URL, json=body, headers=headers, verify=False)
    if r.status_code != 200:
        return None
    data = r.json()
    try:
        outs = data["data"][0]["outputs"]
        pw = outs["pwci"]["bands"]["B0"]["stats"]
        hit = outs["hit"]["bands"]["B0"]["stats"]
        if pw["sampleCount"] == 0:
            return None
        return pw["mean"], pw["max"], hit["mean"], pw["sampleCount"]
    except (KeyError, IndexError):
        return None


def collect_points() -> list[tuple[float, float, str, str]]:
    pts = []
    sp = pd.read_csv(REPO / "execution" / "spill_bands.csv")
    for _, r in sp.iterrows():
        pts.append((float(r.lon), float(r.lat), str(r.date), "spill"))
    bg = pd.read_csv(REPO / "execution" / "background_raw.csv")
    for _, r in bg.iterrows():
        pts.append((float(r.lon), float(r.lat), str(r.date), "background"))
    return pts


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", default=str(REPO / "execution" / "pwci_spatial.csv"))
    ap.add_argument("--sleep", type=float, default=5.0)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pts = collect_points()
    n_sp = sum(1 for p in pts if p[3] == "spill")
    print(f"{len(pts)} points ({n_sp} spill, {len(pts)-n_sp} background).")
    if args.dry_run:
        print("[dry-run] no API calls.")
        return

    out = Path(args.output)
    done, rows = set(), []
    if out.exists():
        rows = pd.read_csv(out).to_dict("records")
        done = {(round(float(r["lon"]), 5), round(float(r["lat"]), 5)) for r in rows}
        print(f"Resuming: {len(done)} done.")

    token = get_token(); token_at = time.monotonic()
    ok = 0
    for i, (lon, lat, date, label) in enumerate(pts):
        if (round(lon, 5), round(lat, 5)) in done:
            continue
        if time.monotonic() - token_at > TOKEN_TTL:
            token = get_token(); token_at = time.monotonic()
        print(f"[{i+1}/{len(pts)}] {label[:2]} ({lat:.4f},{lon:.4f})...", end=" ", flush=True)
        try:
            res = fetch_spatial(token, lon, lat, date)
            if res:
                m, mx, hf, sc = res
                rows.append({"lon": lon, "lat": lat, "label": label, "date": date,
                             "pwci_mean": m, "pwci_max": mx, "hit_frac": hf, "n_px": sc})
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
