import json
import os
import requests
import time
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path

# Configuration - Extracted from config.js and app.js
CLIENT_ID = "sh-90db7a9c-41fd-4caf-935a-0be2f39b28ba"
CLIENT_SECRET = "10GC2CAhRnaKcONM5aVHlM6pAiWVnxxt"
AUTH_URL = "https://194.146.60.13/auth/realms/CDSE/protocol/openid-connect/token"
STAT_API_URL = "https://64.225.130.53/api/v1/statistics"

def get_token():
    resp = requests.post(AUTH_URL, data={
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "client_credentials"
    }, headers={"Host": "identity.dataspace.copernicus.eu"}, verify=False)
    resp.raise_for_status()
    return resp.json()["access_token"]

def calculate_indices(stats):
    """
    Calculates FBC, HPWI, and PWI based on Sentinel Hub stats.
    stats: dict containing mean values for B02, B03, B04, B05, B06, B08, B11, B12.
    """
    bands = stats
    
    # 1. FBC Logic
    iron_oxide = bands['B04'] / bands['B02'] if bands['B02'] > 0 else 0
    iron_score = max(0, (iron_oxide - 1.4) / 1.0)
    
    ndsi_sum = bands['B11'] + bands['B12']
    ndsi = (bands['B11'] - bands['B12']) / ndsi_sum if ndsi_sum > 0 else 0
    brine_score_fbc = max(0, ndsi - 0.02)
    
    ndvi_sum = bands['B08'] + bands['B04']
    ndvi = (bands['B08'] - bands['B04']) / ndvi_sum if ndvi_sum > 0 else 0
    no_veg = max(0, 1.0 - max(0, ndvi))
    
    fbc_raw = np.sqrt(iron_score * brine_score_fbc) * no_veg
    fbc = min(1.0, fbc_raw * 25.0)
    
    # 2. HPWI Logic
    ndoi_sum = bands['B02'] + bands['B12']
    ndoi = max(0, (bands['B02'] - bands['B12']) / ndoi_sum if ndoi_sum > 0 else 0)
    
    brine_boost = max(0, ndsi - 0.03) * 0.8
    chem_signal = min(1.0, ndoi + brine_boost)
    
    smooth_sum = bands['B03'] + bands['B11']
    smoothness = (bands['B03'] - bands['B11']) / smooth_sum if smooth_sum > 0 else 0
    norm_smooth = max(0, min(1.0, (smoothness + 0.3) / 0.6))
    
    hpwi = min(1.0, chem_signal * norm_smooth * 6.0)
    
    # 3. PWI Logic (with BSI Mask)
    bsi_top = (bands['B11'] + bands['B04']) - (bands['B08'] + bands['B02'])
    bsi_bot = (bands['B11'] + bands['B04']) + (bands['B08'] + bands['B02'])
    bsi = bsi_top / bsi_bot if bsi_bot > 0 else 0
    
    if bsi <= 0.01:
        pwi = 0
    else:
        brine_score_pwi = max(0, ndsi - 0.05)
        hcai_sum = bands['B11'] + bands['B04']
        hcai = (bands['B11'] - bands['B04']) / hcai_sum if hcai_sum > 0 else 0
        hcai_score = max(0, (hcai - 0.20) * 2.5)
        hmri = bands['B12'] / bands['B03'] if bands['B03'] > 0 else 0
        hmri_score = max(0, (hmri - 1.5) * 2.5)
        pwi_base = brine_score_pwi * hcai_score * hmri_score
        pwi = min(1.0, pow(pwi_base * 60.0, 1.5))
    
    # 4. New "AND GATE" Indices (Suite 1: Active & Residue)
    # LBI = NDSI * (NDWI+0.5) * (1-NDVI) * BSI
    smooth_sum_lbi = bands['B03'] + bands['B11']
    ndwi = (bands['B03'] - bands['B11']) / smooth_sum_lbi if smooth_sum_lbi > 0 else 0
    lbi = max(0, ndsi) * max(0, ndwi + 0.5) * max(0, 1.0 - ndvi) * max(0, bsi) * 40.0
    
    # TRI = NDSI * HMRI * AOI
    hmri_val = bands['B12'] / bands['B03'] if bands['B03'] > 0 else 0
    aoi_val = (bands['B04'] / bands['B02']) * (bands['B11'] / bands['B12']) if (bands['B02'] > 0 and bands['B12'] > 0) else 0
    tri = max(0, ndsi - 0.05) * max(0, (hmri_val - 1.5)/2) * max(0, (aoi_val - 1.5)/2)
    tri = pow(tri * 10, 2)
    
    # BPI = NDSI * HCAI * BSI
    hcai_sum_bpi = bands['B11'] + bands['B04']
    hcai_val = (bands['B11'] - bands['B04']) / hcai_sum_bpi if hcai_sum_bpi > 0 else 0
    bpi = max(0, bsi) * max(0, ndsi - 0.03) * max(0, hcai_val - 0.15) * 30.0

    # 5. Visionary Suite (Suite 2: Physiological & Forensic)
    # VSI = NDSI * RedEdgeDelta * MSI
    red_edge_top = bands['B07'] - bands['B05']
    red_edge_bot = bands['B07'] + bands['B05']
    red_edge_delta = red_edge_top / red_edge_bot if red_edge_bot > 0 else 0
    msi = bands['B11'] / bands['B8A'] if bands['B8A'] > 0 else 0
    vsi = max(0, ndsi) * max(0, 0.4 - red_edge_delta) * max(0, msi - 1.0) * 10.0
    
    # CMA = NDSI * ClayRatio * IronIndex
    clay_ratio = bands['B11'] / bands['B12'] if bands['B12'] > 0 else 0
    iron_index = bands['B04'] / bands['B02'] if bands['B02'] > 0 else 0
    cma = max(0, ndsi) * max(0, clay_ratio - 1.2) * max(0, iron_index - 1.5) * 15.0
    
    # PHI = NDSI * Shoulder * HCAI
    shoulder = bands['B11'] / bands['B12'] if bands['B12'] > 0 else 0
    phi = max(0, ndsi) * max(0, shoulder - 1.0) * max(0, hcai_val - 0.2) * 20.0
    
    # HMI = GreenShift * SaltPPT
    green_shift = bands['B03'] / bands['B02'] if bands['B02'] > 0 else 0
    salt_ppt = bands['B11'] / bands['B12'] if bands['B12'] > 0 else 0
    hmi = max(0, green_shift - 1.1) * max(0, salt_ppt - 1.2) * 10.0

    return {
        "FBC": fbc,
        "HPWI": hpwi,
        "PWI": pwi,
        "LBI": min(1.0, lbi),
        "TRI": min(1.0, tri),
        "BPI": min(1.0, bpi),
        "VSI": min(1.0, vsi),
        "CMA": min(1.0, cma),
        "PHI": min(1.0, phi),
        "HMI": min(1.0, hmi),
        "NDSI": ndsi,
        "NDVI": ndvi,
        "BSI": bsi,
        "NDWI": ndwi,
        "IronRatio": iron_oxide
    }

def fetch_stats(token, lon, lat, date_str):
    # 30-day window centered on date to be very sure
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    start = (dt - timedelta(days=15)).strftime("%Y-%m-%dT00:00:00Z")
    end = (dt + timedelta(days=15)).strftime("%Y-%m-%dT23:59:59Z")
    
    # 500m x 500m bounding box
    bbox = [lon - 0.0025, lat - 0.0025, lon + 0.0025, lat + 0.0025]
    
    request = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"}
            },
            "data": [{"type": "sentinel-2-l2a"}]
        },
        "aggregation": {
            "timeRange": {"from": start, "to": end},
            "aggregationInterval": {"of": "P30D"},
            "resampling": "NEAREST",
            "evalscript": """
//VERSION=3
function setup() {
  return {
    input: ["B02", "B03", "B04", "B05", "B07", "B08", "B8A", "B11", "B12", "dataMask"],
    output: [
      { id: "default", bands: 9, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return { default: [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN], dataMask: [0] };
  return {
    default: [sample.B02, sample.B03, sample.B04, sample.B05, sample.B07, sample.B08, sample.B8A, sample.B11, sample.B12],
    dataMask: [1]
  };
}
"""
        }
    }
    
    headers = {
        "Authorization": f"Bearer {token}", 
        "Content-Type": "application/json",
        "Host": "sh.dataspace.copernicus.eu"
    }
    resp = requests.post(STAT_API_URL, json=request, headers=headers, verify=False)
    if resp.status_code != 200:
        print(f"  API Error {resp.status_code}: {resp.text}")
        return None
        
    data = resp.json()
    if not data.get("data") or not data["data"][0].get("outputs"):
        # print("  Empty data response.")
        return None
        
    output = data["data"][0]["outputs"]["default"]["bands"]
    if "B0" not in output or output["B0"]["stats"]["sampleCount"] == 0:
        return None
        
    return {
        "B02": output["B0"]["stats"]["mean"],
        "B03": output["B1"]["stats"]["mean"],
        "B04": output["B2"]["stats"]["mean"],
        "B05": output["B3"]["stats"]["mean"],
        "B07": output["B4"]["stats"]["mean"],
        "B08": output["B5"]["stats"]["mean"],
        "B8A": output["B6"]["stats"]["mean"],
        "B11": output["B7"]["stats"]["mean"],
        "B12": output["B8"]["stats"]["mean"]
    }

def main():
    spills_path = Path("data/rrc_spills.json")
    with open(spills_path) as f:
        spills = json.load(f)
        
    token = get_token()
    output_path = Path("execution/validation_raw.csv")
    
    # Handle force flag
    force_reanalyze = "--force" in sys.argv
    
    features = spills["features"]
    features_to_process = features
    
    if output_path.exists() and not force_reanalyze:
        results = pd.read_csv(output_path).to_dict('records')
        processed_keys = set([(str(r['operator']), str(r['date'])) for r in results])
        print(f"Resuming analysis. Already processed {len(results)}/{len(features_to_process)} sites.")
    else:
        results = []
        processed_keys = set()
        if force_reanalyze:
            print("Force re-analyze enabled. Starting fresh capture.")
    
    for i, feat in enumerate(features_to_process):
        props = feat["properties"]
        geom = feat["geometry"]
        lon, lat = geom["coordinates"]
        date = props["date"]
        
        if (props['operator'], date) in processed_keys:
            continue

        print(f"[{i+1}/{len(features_to_process)}] {props['operator']} ({date})...", end=" ", flush=True)
        
        try:
            stats = fetch_stats(token, lon, lat, date)
            if stats:
                indices = calculate_indices(stats)
                row = {**props, **indices, "lon": lon, "lat": lat}
                results.append(row)
                
                # Incremental save
                pd.DataFrame(results).to_csv(output_path, index=False)
                print("DONE.")
            else:
                print("SKIPPED.")
        except Exception as e:
            print(f"ERROR: {e}")
            
        # Respect rate limits - 10 seconds between calls
        time.sleep(10)
        
    if results:
        print(f"\nFinalized capture: {len(results)}/{len(features_to_process)} sites.")
    else:
        print("\nFailed to capture any sites. Check Rate Limits or Logic.")

if __name__ == "__main__":
    main()
