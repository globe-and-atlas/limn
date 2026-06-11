#!/usr/bin/env python3
"""
Test replacement Atlas bookmarks for weak or blank proof targets.

This script intentionally does not read config-v1.js, .env, or credentials. It
uses the public Atlas WMS path through qc_atlas_bookmarks.py and writes a
ranked candidate report under .tmp/.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import requests

from qc_atlas_bookmarks import classify, fetch_metrics, load_indices, signal_score


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / ".tmp"
JSON_OUT = OUT_DIR / "atlas_candidate_bookmark_qc.json"
MD_OUT = OUT_DIR / "atlas_candidate_bookmark_qc.md"


@dataclass(frozen=True)
class Candidate:
    key: str
    label: str
    lat: float
    lng: float
    zoom: int
    date: str
    source: str = ""
    source_url: str = ""
    justification: str = ""


CANDIDATES = [
    Candidate("bhdfsi", "Montecito debris-flow corridor", 34.44, -119.63, 12, "2018-01-09", "USGS Montecito data release", "https://www.usgs.gov/data/debris-flow-inundation-and-damage-data-9-january-2018-montecito-debris-flow-event", "Corrects the bookmark onto the documented Montecito debris-flow corridor immediately after the January 2018 disaster."),
    Candidate("bhdfsi", "Rat Creek / Dolan Fire washout", 36.06, -121.59, 13, "2021-01-28", "Caltrans Rat Creek release", "https://dot.ca.gov/news-releases/news-release-2021-004", "Documented post-fire debris flow/washout on the Dolan Fire scar."),
    Candidate("bhdfsi", "Glenwood Canyon Grizzly Creek scar", 39.56, -107.31, 12, "2021-07-23", "USGS Glenwood Canyon debris flows", "https://www.usgs.gov/programs/landslide-hazards/science/glenwood-canyon-colorado-flooding-and-debris-flows-2021", "Documented flooding and debris flows from the Grizzly Creek burn scar."),
    Candidate("dwci", "Paradise / Camp Fire water injury", 39.76, -121.62, 10, "2018-11-18", "California Water Boards Camp Fire", "https://www.waterboards.ca.gov/drinking_water/certlic/drinkingwater/CampFire.html", "Post-fire source-water contamination context with documented drinking-water injury."),
    Candidate("dwci", "Bull Run / Eagle Creek Fire watershed", 45.53, -122.07, 10, "2017-09-12", "Portland Water Bureau Eagle Creek Fire", "https://www.portland.gov/water/news/2017/9/5/bull-run-watershed-and-eagle-creek-fire", "Portland source-water watershed fire context."),
    Candidate("dwci", "Sacramento-San Joaquin Delta CA", 37.87, -121.63, 11, "2021-02-14", "California Water Boards Camp Fire Report", "https://www.waterboards.ca.gov/drinking_water/certlic/drinkingwater/CampFire.html", "Best same-location date from the first sweep."),
    Candidate("gmcpi", "Columbia Glacier sediment plume", 61.08, -147.05, 10, "2021-08-01", "USGS / NPS glacier monitoring", "https://www.nps.gov/subjects/climatechange/glaciers.htm", "Large Alaskan tidewater glacier outflow where glacial flour should be visible."),
    Candidate("gmcpi", "Copper River glacial plume", 60.45, -145.20, 9, "2021-07-15", "NASA glacial sediment plume context", "https://earthobservatory.nasa.gov/", "Broad coastal plume candidate for glacial flour turbidity."),
    Candidate("gmcpi", "Jakobshavn fjord meltwater", 69.17, -49.80, 10, "2021-08-01", "NASA Greenland glacier context", "https://earthobservatory.nasa.gov/", "Greenland glacial meltwater/fjord turbidity candidate."),
    Candidate("mdspi", "Sundarbans mangrove boundary", 21.92, 89.10, 11, "2021-10-02", "UNESCO Sundarbans", "https://whc.unesco.org/en/list/798/", "Best same-region post-monsoon candidate for mangrove dieback/substrate exposure."),
    Candidate("mdspi", "Everglades mangrove dieback after Irma", 25.20, -80.80, 11, "2017-10-15", "USGS Everglades mangrove monitoring", "https://www.usgs.gov/centers/wetland-and-aquatic-research-center", "Documented hurricane-disturbed mangrove region."),
    Candidate("mdspi", "Sundarbans western edge", 21.78, 88.95, 11, "2021-03-01", "UNESCO Sundarbans", "https://whc.unesco.org/en/list/798/", "Dry-season mangrove boundary with more exposed substrate."),
    Candidate("spei", "Florida Bay seagrass banks", 25.00, -80.80, 11, "2021-05-15", "NOAA Florida Bay seagrass", "https://oceanservice.noaa.gov/", "Clear shallow seagrass banks in Florida Bay."),
    Candidate("spei", "Formentera seagrass meadow", 38.73, 1.43, 11, "2021-08-01", "Mediterranean Posidonia seagrass context", "https://www.unep.org/unepmap/", "Clear Mediterranean shallow-water seagrass candidate."),
    Candidate("spei", "Shark Bay seagrass meadow", -25.80, 113.60, 10, "2021-04-15", "UNESCO Shark Bay", "https://whc.unesco.org/en/list/578/", "Large, clear-water seagrass ecosystem."),
    Candidate("scspi", "Central Kansas bare fields", 38.67, -98.33, 11, "2021-04-15", "Kansas State Agricultural Extension", "https://www.ksre.k-state.edu/", "Original bare-field candidate."),
    Candidate("scspi", "California Central Valley bare fields", 36.50, -120.20, 10, "2021-07-15", "California DWR drought context", "https://water.ca.gov/water-basics/drought", "Dry exposed agricultural soils under severe drought."),
    Candidate("scspi", "Texas High Plains bare fields", 33.60, -102.00, 10, "2021-04-15", "USDA agricultural soils context", "https://www.nrcs.usda.gov/", "Bare arid agricultural fields for compaction proxy testing."),
    Candidate("trsi", "Brumadinho / Paraopeba River", -20.12, -44.12, 11, "2019-01-30", "NASA Brumadinho dam collapse", "https://www.earthobservatory.nasa.gov/images/144501/another-deadly-dam-collapse-in-brazil", "Documented tailings rushing toward the Paraopeba River."),
    Candidate("trsi", "Samarco / Rio Doce runout", -20.20, -43.47, 9, "2015-11-15", "UNEP Samarco disaster profile", "https://www.unep.org/news-and-stories/story/brazil-mine-disaster", "Documented Fundao tailings failure runout."),
    Candidate("trsi", "Mount Polley tailings breach", 52.52, -121.63, 11, "2017-08-01", "BC Mount Polley response", "https://www2.gov.bc.ca/gov/content/environment/air-land-water/site-permitting-compliance/mount-polley-mine-incident", "Tailings breach watershed context with Sentinel-era imagery."),
    Candidate("ccrbi", "Kingston coal ash impoundment", 35.902, -84.534, 12, "2021-09-01", "EPA Kingston coal ash spill", "https://www.epa.gov/tn/kingston-coal-ash-spill", "Corrects the coal-ash bookmark onto the Kingston TVA ash spill/impoundment area."),
    Candidate("ccrbi", "Sutton coal ash pond NC", 34.28, -78.02, 12, "2021-09-01", "EPA coal ash pond context", "https://www.epa.gov/coalash", "Coal ash impoundment vegetation-stress candidate."),
    Candidate("ierpi", "Gold King / Animas River spill", 37.81, -107.66, 10, "2015-08-13", "EPA Gold King Mine response", "https://www.epa.gov/goldkingmine", "Moves the bookmark closer to the documented spill corridor shortly after the release."),
    Candidate("ierpi", "Rio Tinto acid river", 37.69, -6.56, 11, "2020-07-01", "NASA Rio Tinto", "https://earthobservatory.nasa.gov/images/86319/rio-tinto-spain", "Classic iron-rich industrial/acid drainage river color benchmark."),
    Candidate("ierpi", "Iron Mountain Mine outflow", 40.66, -122.53, 12, "2021-09-01", "EPA Iron Mountain Mine", "https://cumulis.epa.gov/supercpad/cursites/csitinfo.cfm?id=0901245", "Industrial acid drainage source with iron-color shift."),
    Candidate("spsri", "Noor Ouarzazate solar complex", 31.04, -6.88, 12, "2021-09-01", "NREL solar soiling studies", "https://www.nrel.gov/pv/soiling.html", "Utility-scale desert PV array with dust-soiling context."),
    Candidate("spsri", "Benban Solar Park Egypt", 24.45, 32.74, 12, "2021-09-01", "NREL solar soiling studies", "https://www.nrel.gov/pv/soiling.html", "Large desert PV array candidate."),
    Candidate("spsri", "Bhadla Solar Park India", 27.54, 71.91, 12, "2021-05-01", "NREL solar soiling studies", "https://www.nrel.gov/pv/soiling.html", "Large arid PV array candidate."),
    Candidate("fedgi", "Rondonia forest edge", -10.40, -62.80, 10, "2021-08-01", "Hansen Global Forest Change", "https://glads.umd.edu/dataset/global-forest-change", "Sharp forest/agriculture edge in a well-known Amazon deforestation frontier."),
    Candidate("fedgi", "Mato Grosso forest edge", -13.00, -56.00, 11, "2021-10-31", "Hansen Global Forest Change", "https://glads.umd.edu/dataset/global-forest-change", "Best same-location date from first sweep."),
    Candidate("fedgi", "Borneo plantation forest edge", 1.00, 113.00, 11, "2021-08-01", "Hansen Global Forest Change", "https://glads.umd.edu/dataset/global-forest-change", "Tropical forest edge against plantation/clearing."),
    Candidate("slsdi", "Borneo selective logging concession", 1.00, 113.00, 11, "2021-08-01", "CIFOR Borneo tropical forest studies", "https://www.cifor-icraf.org/", "Logging roads and canopy gaps in degraded Borneo forest."),
    Candidate("slsdi", "Papua New Guinea logging concession", -5.00, 144.00, 11, "2021-09-15", "PNG Forest Authority", "http://www.forestry.gov.pg/", "Original selective logging candidate."),
    Candidate("slsdi", "Amazon logging frontier", -4.00, -55.00, 11, "2021-08-01", "INPE PRODES", "http://www.obt.inpe.br/obtdg/prodes/", "Selective logging/frontier clearing candidate in Para."),
]


def with_candidate(index: dict[str, Any], candidate: Candidate) -> dict[str, Any]:
    copied = dict(index)
    copied["bookmark"] = {
        **index["bookmark"],
        "lat": candidate.lat,
        "lng": candidate.lng,
        "zoom": candidate.zoom,
        "date": candidate.date,
        "label": candidate.label,
    }
    return copied


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test candidate replacement bookmarks for weak Atlas indices.")
    parser.add_argument("--size", type=int, default=384, help="WMS tile size in pixels.")
    parser.add_argument("--window-days", type=int, default=15, help="Days before candidate date included in WMS time range.")
    parser.add_argument("--maxcc", type=int, default=30, help="Sentinel Hub max cloud cover percentage.")
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout per WMS request.")
    parser.add_argument("--keys", default="", help="Optional comma-separated index keys to test.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    OUT_DIR.mkdir(exist_ok=True)
    keys = {key.strip() for key in args.keys.split(",") if key.strip()}
    by_key = {index["key"]: index for index in load_indices()}
    session = requests.Session()
    session.headers.update({"User-Agent": "Limn-Atlas-Candidate-QC/1.0"})
    rows = []

    for candidate in CANDIDATES:
        if keys and candidate.key not in keys:
            continue
        index = by_key[candidate.key]
        candidate_index = with_candidate(index, candidate)
        status, metrics, image_bytes, reason, url_sample = fetch_metrics(session, candidate_index, args)
        if metrics is None:
            row = {
                **candidate.__dict__,
                "status": status,
                "verdict": "error",
                "score": 0.0,
                "reason": reason,
                "url_sample": url_sample,
            }
        else:
            verdict, reason = classify(metrics, image_bytes)
            row = {
                **candidate.__dict__,
                "status": status,
                "verdict": verdict,
                "score": signal_score(metrics, image_bytes),
                "image_bytes": image_bytes,
                "url_sample": url_sample,
                "reason": reason,
                **metrics,
            }
        rows.append(row)
        print(f"{candidate.key:<8} {candidate.label[:34]:<34} {row['verdict']:<8} high={row.get('high_pct')} score={row['score']}")
        time.sleep(0.1)

    rows.sort(key=lambda row: (row["key"], row["score"]), reverse=True)
    JSON_OUT.write_text(
        json.dumps(
            {
                "generated": datetime.now().isoformat(timespec="seconds"),
                "size": args.size,
                "window_days": args.window_days,
                "maxcc": args.maxcc,
                "results": rows,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    lines = [
        "# Atlas Candidate Bookmark QC",
        "",
        f"Generated: {datetime.now().isoformat(timespec='seconds')}",
        f"Candidates checked: {len(rows)}",
        "",
        "| Key | Candidate | Verdict | Visible % | High % | p99 luma | Score | Date | Source |",
        "|---|---|---:|---:|---:|---:|---:|---|---|",
    ]
    for row in sorted(rows, key=lambda item: (item["key"], item["score"])):
        source = f"[source]({row['source_url']})" if row.get("source_url") else ""
        lines.append(
            f"| {row['key']} | {row['label']} | {row['verdict']} | {row.get('visible_pct', '')} | "
            f"{row.get('high_pct', '')} | {row.get('p99_luma', '')} | {row['score']} | {row['date']} | {source} |"
        )
    MD_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nWrote {JSON_OUT}")
    print(f"Wrote {MD_OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
