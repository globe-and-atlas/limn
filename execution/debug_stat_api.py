import os
import requests
import json
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from the project root .env
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

CLIENT_ID = os.getenv("CDSE_CLIENT_ID", "sh-90db7a9c-41fd-4caf-935a-0be2f39b28ba")
CLIENT_SECRET = os.getenv("CDSE_CLIENT_SECRET", "10GC2CAhRnaKcONM5aVHlM6pAiWVnxxt")
AUTH_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
STAT_API_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics"

def get_token():
    resp = requests.post(AUTH_URL, data={
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "client_credentials"
    })
    resp.raise_for_status()
    return resp.json()["access_token"]

token = get_token()
print("Token acquired.")

# Test site 1: Permian Basin Resources LLC, 2023-11-14
lon, lat = -101.852, 31.901
date_str = "2023-11-14"
dt = datetime.strptime(date_str, "%Y-%m-%d")
start = (dt - timedelta(days=15)).strftime("%Y-%m-%dT00:00:00Z")
end = (dt + timedelta(days=15)).strftime("%Y-%m-%dT23:59:59Z")
bbox = [lon - 0.005, lat - 0.005, lon + 0.005, lat + 0.005] # Larger bbox 500m

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
        "aggregationInterval": {"of": "P1D"}, # Daily resolution
        "evalscript": """
//VERSION=3
function setup() {
  return {
    input: ["B02", "dataMask"],
    output: { bands: 1, sampleType: "FLOAT32" }
  };
}
function evaluatePixel(sample) {
  return [sample.B02];
}
"""
    }
}

headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
resp = requests.post(STAT_API_URL, json=request, headers=headers)
print(f"Status: {resp.status_code}")
if resp.status_code == 200:
    print(json.dumps(resp.json(), indent=2))
else:
    print(resp.text)
