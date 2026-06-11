#!/usr/bin/env python3
"""
Karpathy-loop hotspot search for Limn Atlas bookmarks.

This script intentionally uses only the public Atlas WMS fallback endpoint. It
does not read config-v1.js, .env, or credentials. It emits candidate thumbnails
and a single-writer TSV so bookmark changes can be reviewed before promotion.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "execution"))

from qc_atlas_bookmarks import (  # noqa: E402
    DEFAULT_WMS_LAYER,
    DEFAULT_WMS_URL,
    analyze_png,
    bookmark_bbox,
    classify,
    signal_score,
    time_window,
)

OUT_DIR = ROOT / ".tmp" / "hotspot_loop"
RESULTS_TSV = OUT_DIR / "results.tsv"
LOCK_FILE = OUT_DIR / "results.tsv.lock"

DEFAULT_TARGETS = [
    "BH-DFSI",
    "DWCI",
    "GMCPI",
    "MDSPI",
    "SPEI",
    "SCSPI",
    "TRSI",
    "CCRBI",
    "IERPI",
    "SPSRI",
    "FEDGI",
    "SLSDI",
    "FGDCI",
    "SACI",
    "S1-OWF",
    "S1-URB",
    "S1-VVS",
    "S5P-NO2",
    "S5P-SO2",
]

VERDICT_RANK = {"error": 0, "blank": 1, "weak": 2, "moderate": 3, "strong": 4}


@dataclass(frozen=True)
class Candidate:
    lat: float
    lng: float
    zoom: int
    date: str
    phase: str
    note: str


@dataclass
class CandidateResult:
    run_id: str
    target: str
    key: str
    acronym: str
    source: str
    phase: str
    note: str
    lat: float
    lng: float
    zoom: int
    date: str
    layer: str
    status: str
    verdict: str
    score: float
    visible_pct: float | None
    high_pct: float | None
    p95_luma: float | None
    p99_luma: float | None
    max_luma: float | None
    max_chroma: float | None
    image_bytes: int
    uniform_guard: bool
    promotable: bool
    thumbnail: str
    reason: str


def load_indices() -> list[dict[str, Any]]:
    code = """
import { ATLAS_INDICES } from './src/atlas-indices.js';
import { SAR_DEMO_INDICES } from './src/atlas-sar-demos.js';
import { S5P_DEMO_INDICES } from './src/atlas-s5p-demos.js';

const annotate = (items, source) => items.map(i => ({
  source,
  key: i.key,
  acronym: i.acronym,
  name: i.name,
  domain: i.domain,
  platform: i.platform,
  platformShort: i.platformShort,
  canRender: i.canRender,
  minZoom: i.minZoom || null,
  bookmark: i.bookmark,
  wmsLayer: i.wmsLayer || null,
  evalscript: i.evalscript,
  formula: i.formula || '',
  justification: i.justification || ''
}));

console.log(JSON.stringify([
  ...annotate(ATLAS_INDICES, 'atlas'),
  ...annotate(SAR_DEMO_INDICES, 'sar_demo'),
  ...annotate(S5P_DEMO_INDICES, 's5p_demo')
]));
"""
    completed = subprocess.run(
        ["node", "--input-type=module", "-e", code],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(completed.stdout)


def normalized(value: str) -> str:
    return "".join(char.lower() for char in value if char.isalnum())


def sensor_min_date(index: dict[str, Any]) -> str:
    platform = f"{index.get('platform', '')} {index.get('platformShort', '')} {index.get('wmsLayer', '')}".lower()
    if "s5p" in platform or "tropomi" in platform:
        return "2018-04-30"
    if "sentinel-1" in platform or "s1" in platform:
        return "2014-10-03"
    return "2015-06-23"


def target_min_zoom(index: dict[str, Any]) -> int:
    if index.get("minZoom") is not None:
        return int(index["minZoom"])
    platform = f"{index.get('platform', '')} {index.get('platformShort', '')} {index.get('wmsLayer', '')}".lower()
    if "s5p" in platform or "tropomi" in platform:
        return 3
    if "sentinel-1" in platform or "s1" in platform:
        return 6
    return 10


def target_window_days(index: dict[str, Any], args: argparse.Namespace) -> int:
    platform = f"{index.get('platform', '')} {index.get('platformShort', '')} {index.get('wmsLayer', '')}".lower()
    if "s5p" in platform or "tropomi" in platform:
        return args.s5p_window_days
    return args.window_days


def valid_date(date_str: str, index: dict[str, Any]) -> bool:
    return date_str >= sensor_min_date(index)


def date_candidates(date_str: str, sweep_days: int, step_days: int, index: dict[str, Any]) -> list[str]:
    center = datetime.strptime(date_str, "%Y-%m-%d")
    if sweep_days <= 0:
        return [date_str] if valid_date(date_str, index) else []
    candidates: list[str] = []
    for offset in range(-sweep_days, sweep_days + 1, step_days):
        candidate = (center + timedelta(days=offset)).date().isoformat()
        if valid_date(candidate, index):
            candidates.append(candidate)
    if valid_date(date_str, index):
        candidates.append(date_str)
    return sorted(set(candidates))


def zoom_candidates(current_zoom: int, index: dict[str, Any], args: argparse.Namespace) -> list[int]:
    min_zoom = target_min_zoom(index)
    values = []
    for offset in range(-args.zoom_radius, args.zoom_radius + 1):
        value = current_zoom + offset
        if min_zoom <= value <= args.max_zoom:
            values.append(value)
    if current_zoom >= min_zoom:
        values.append(current_zoom)
    return sorted(set(values))


def dedupe_candidates(candidates: list[Candidate]) -> list[Candidate]:
    seen: set[tuple[float, float, int, str]] = set()
    unique: list[Candidate] = []
    for candidate in candidates:
        key = (round(candidate.lat, 6), round(candidate.lng, 6), candidate.zoom, candidate.date)
        if key in seen:
            continue
        seen.add(key)
        unique.append(candidate)
    return unique


def build_wms_params(index: dict[str, Any], candidate: Candidate, args: argparse.Namespace) -> tuple[str, dict[str, str]]:
    bbox = bookmark_bbox(candidate.lat, candidate.lng, candidate.zoom, args.size)
    encoded_script = base64.b64encode(index["evalscript"].encode("utf-8")).decode("ascii")
    layer = index.get("wmsLayer") or DEFAULT_WMS_LAYER
    params = {
        "service": "WMS",
        "request": "GetMap",
        "version": "1.3.0",
        "layers": layer,
        "format": "image/png",
        "transparent": "true",
        "width": str(args.size),
        "height": str(args.size),
        "crs": "CRS:84",
        "bbox": ",".join(f"{value:.8f}" for value in bbox),
        "time": time_window(candidate.date, target_window_days(index, args)),
        "maxcc": str(args.maxcc),
        "showlogo": "false",
        "evalscript": encoded_script,
    }
    return DEFAULT_WMS_URL, params


def is_uniform_frame(metrics: dict[str, float], image_bytes: int) -> bool:
    if image_bytes < 500:
        return False
    visible_pct = metrics["visible_pct"]
    high_pct = metrics["high_pct"]
    p95_luma = metrics["p95_luma"]
    p99_luma = metrics["p99_luma"]
    max_chroma = metrics["max_chroma"]
    if visible_pct >= 95.0 and high_pct >= 95.0:
        return True
    if visible_pct >= 90.0 and high_pct >= 65.0:
        return True
    if visible_pct >= 95.0 and abs(p99_luma - p95_luma) <= 0.025 and max_chroma <= 0.18:
        return True
    return False


def adjusted_score(metrics: dict[str, float], image_bytes: int, uniform_guard: bool) -> float:
    if uniform_guard:
        return 0.0
    return signal_score(metrics, image_bytes)


def fetch_candidate(
    session: requests.Session,
    index: dict[str, Any],
    candidate: Candidate,
    args: argparse.Namespace,
    run_id: str,
    ordinal: int,
) -> CandidateResult:
    layer = index.get("wmsLayer") or DEFAULT_WMS_LAYER
    target_label = index["acronym"]
    png_name = f"{run_id}_{normalized(index['acronym'])}_{ordinal:03d}_{candidate.phase}_{candidate.date}_z{candidate.zoom}.png"
    png_path = OUT_DIR / png_name
    url, params = build_wms_params(index, candidate, args)
    try:
        response = session.get(url, params=params, timeout=args.timeout)
    except requests.RequestException as error:
        return CandidateResult(
            run_id,
            target_label,
            index["key"],
            index["acronym"],
            index["source"],
            candidate.phase,
            candidate.note,
            candidate.lat,
            candidate.lng,
            candidate.zoom,
            candidate.date,
            layer,
            "error",
            "error",
            0.0,
            None,
            None,
            None,
            None,
            None,
            None,
            0,
            False,
            False,
            "",
            f"Request failed: {error}",
        )

    image_bytes = len(response.content)
    if response.status_code != 200:
        return CandidateResult(
            run_id,
            target_label,
            index["key"],
            index["acronym"],
            index["source"],
            candidate.phase,
            candidate.note,
            candidate.lat,
            candidate.lng,
            candidate.zoom,
            candidate.date,
            layer,
            f"http-{response.status_code}",
            "error",
            0.0,
            None,
            None,
            None,
            None,
            None,
            None,
            image_bytes,
            False,
            False,
            "",
            response.text[:300].replace("\n", " "),
        )

    content_type = response.headers.get("content-type", "")
    if "image" not in content_type.lower():
        return CandidateResult(
            run_id,
            target_label,
            index["key"],
            index["acronym"],
            index["source"],
            candidate.phase,
            candidate.note,
            candidate.lat,
            candidate.lng,
            candidate.zoom,
            candidate.date,
            layer,
            "error",
            "error",
            0.0,
            None,
            None,
            None,
            None,
            None,
            None,
            image_bytes,
            False,
            False,
            "",
            f"Expected image response, got {content_type}: {response.text[:250]}",
        )

    png_path.write_bytes(response.content)
    try:
        metrics = analyze_png(response.content)
    except Exception as error:  # noqa: BLE001 - report exact decoder failure
        return CandidateResult(
            run_id,
            target_label,
            index["key"],
            index["acronym"],
            index["source"],
            candidate.phase,
            candidate.note,
            candidate.lat,
            candidate.lng,
            candidate.zoom,
            candidate.date,
            layer,
            "error",
            "error",
            0.0,
            None,
            None,
            None,
            None,
            None,
            None,
            image_bytes,
            False,
            False,
            str(png_path.relative_to(ROOT)),
            f"Could not decode image: {error}",
        )

    verdict, reason = classify(metrics, image_bytes)
    uniform_guard = is_uniform_frame(metrics, image_bytes)
    score = adjusted_score(metrics, image_bytes, uniform_guard)
    promotable = not uniform_guard and verdict != "error"
    if uniform_guard:
        reason = "Rejected by uniform-frame guard; signal fills the frame too evenly to be proof-grade."

    return CandidateResult(
        run_id,
        target_label,
        index["key"],
        index["acronym"],
        index["source"],
        candidate.phase,
        candidate.note,
        candidate.lat,
        candidate.lng,
        candidate.zoom,
        candidate.date,
        layer,
        "ok",
        verdict,
        score,
        metrics["visible_pct"],
        metrics["high_pct"],
        metrics["p95_luma"],
        metrics["p99_luma"],
        metrics["max_luma"],
        metrics["max_chroma"],
        image_bytes,
        uniform_guard,
        promotable,
        str(png_path.relative_to(ROOT)),
        reason,
    )


def better_candidate(a: CandidateResult, b: CandidateResult | None) -> bool:
    if b is None:
        return True
    a_rank = VERDICT_RANK.get(a.verdict, 0)
    b_rank = VERDICT_RANK.get(b.verdict, 0)
    if a.promotable != b.promotable:
        return a.promotable
    if a_rank != b_rank:
        return a_rank > b_rank
    return a.score > b.score


def run_phase(
    session: requests.Session,
    index: dict[str, Any],
    candidates: list[Candidate],
    args: argparse.Namespace,
    run_id: str,
    existing_count: int,
) -> list[CandidateResult]:
    results: list[CandidateResult] = []
    for offset, candidate in enumerate(dedupe_candidates(candidates), start=existing_count + 1):
        result = fetch_candidate(session, index, candidate, args, run_id, offset)
        results.append(result)
        print(
            f"{index['acronym']:<8} {candidate.phase:<8} {result.verdict:<8} "
            f"score={result.score:<7} high={result.high_pct} visible={result.visible_pct} "
            f"{'uniform' if result.uniform_guard else ''}",
            flush=True,
        )
        time.sleep(args.sleep)
    return results


def current_bookmark_candidate(index: dict[str, Any]) -> Candidate:
    bm = index["bookmark"]
    return Candidate(
        lat=float(bm["lat"]),
        lng=float(bm["lng"]),
        zoom=int(bm["zoom"]),
        date=str(bm["date"]),
        phase="baseline",
        note="current bookmark",
    )


def date_zoom_candidates(index: dict[str, Any], args: argparse.Namespace) -> list[Candidate]:
    bm = index["bookmark"]
    lat = float(bm["lat"])
    lng = float(bm["lng"])
    candidates: list[Candidate] = []
    for date in date_candidates(str(bm["date"]), args.date_days, args.step_days, index):
        for zoom in zoom_candidates(int(bm["zoom"]), index, args):
            candidates.append(Candidate(lat, lng, zoom, date, "datezoom", "same location date/zoom sweep"))
    return candidates


def spatial_candidates(best: CandidateResult, delta: float, phase: str) -> list[Candidate]:
    candidates: list[Candidate] = []
    for dlat in (-delta, 0.0, delta):
        for dlng in (-delta, 0.0, delta):
            candidates.append(
                Candidate(
                    lat=round(best.lat + dlat, 6),
                    lng=round(best.lng + dlng, 6),
                    zoom=best.zoom,
                    date=best.date,
                    phase=phase,
                    note=f"spatial sweep delta {delta:g}",
                )
            )
    return candidates


def choose_best(results: list[CandidateResult]) -> CandidateResult | None:
    best: CandidateResult | None = None
    for result in results:
        if better_candidate(result, best):
            best = result
    return best


def tsv_header() -> str:
    return "\t".join(CandidateResult.__dataclass_fields__.keys()) + "\n"


def tsv_row(result: CandidateResult) -> str:
    values = []
    for field in CandidateResult.__dataclass_fields__:
        value = getattr(result, field)
        if value is None:
            values.append("")
        else:
            values.append(str(value).replace("\t", " ").replace("\n", " "))
    return "\t".join(values) + "\n"


def append_results(results: list[CandidateResult]) -> None:
    if not RESULTS_TSV.exists():
        RESULTS_TSV.write_text(tsv_header(), encoding="utf-8")
    with RESULTS_TSV.open("a", encoding="utf-8") as handle:
        for result in results:
            handle.write(tsv_row(result))


def write_shortlist(index: dict[str, Any], results: list[CandidateResult], args: argparse.Namespace) -> None:
    ranked = sorted(
        results,
        key=lambda item: (item.promotable, VERDICT_RANK.get(item.verdict, 0), item.score),
        reverse=True,
    )
    baseline = next((item for item in results if item.phase == "baseline"), None)
    best = ranked[0] if ranked else None
    lines = [
        f"# Hotspot Shortlist — {index['acronym']}",
        "",
        f"Generated: {datetime.now().isoformat(timespec='seconds')}",
        f"Source: `{index['source']}`",
        f"Layer: `{index.get('wmsLayer') or DEFAULT_WMS_LAYER}`",
        f"Min zoom: `{target_min_zoom(index)}`",
        f"Window days: `{target_window_days(index, args)}`",
        "",
    ]
    if baseline:
        lines.extend(
            [
                "## Baseline",
                "",
                f"- Verdict: `{baseline.verdict}`",
                f"- Score: `{baseline.score}`",
                f"- Visible %: `{baseline.visible_pct}`",
                f"- High %: `{baseline.high_pct}`",
                f"- Thumbnail: `{baseline.thumbnail}`",
                "",
            ]
        )
    if best:
        relation = "beats" if baseline and better_candidate(best, baseline) else "does not beat"
        lines.extend(
            [
                "## Best Candidate",
                "",
                f"- Result: `{best.verdict}`; {relation} baseline by loop ranking",
                f"- Score: `{best.score}`",
                f"- Visible %: `{best.visible_pct}`",
                f"- High %: `{best.high_pct}`",
                f"- Uniform guard: `{best.uniform_guard}`",
                f"- Bookmark candidate: `{best.lat:.6f}, {best.lng:.6f}, z{best.zoom}, {best.date}`",
                f"- Thumbnail: `{best.thumbnail}`",
                "",
            ]
        )
    lines.extend(
        [
            "## Ranked Candidates",
            "",
            "| Rank | Phase | Verdict | Score | Visible % | High % | Uniform | Candidate | Thumbnail |",
            "|---:|---|---:|---:|---:|---:|---:|---|---|",
        ]
    )
    for rank, result in enumerate(ranked[: args.top_n], start=1):
        lines.append(
            f"| {rank} | {result.phase} | {result.verdict} | {result.score} | "
            f"{result.visible_pct if result.visible_pct is not None else ''} | "
            f"{result.high_pct if result.high_pct is not None else ''} | "
            f"{result.uniform_guard} | {result.lat:.6f}, {result.lng:.6f}, z{result.zoom}, {result.date} | "
            f"{result.thumbnail} |"
        )
    lines.append("")
    path = OUT_DIR / f"{normalized(index['acronym'])}_shortlist.md"
    path.write_text("\n".join(lines), encoding="utf-8")


class ResultsLock:
    def __enter__(self) -> "ResultsLock":
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        try:
            fd = os.open(str(LOCK_FILE), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError as error:
            raise RuntimeError(f"Refusing to run while {LOCK_FILE} exists; another loop may be writing.") from error
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(f"pid={os.getpid()} started={datetime.now().isoformat(timespec='seconds')}\n")
        return self

    def __exit__(self, exc_type: object, exc: object, traceback: object) -> None:
        try:
            LOCK_FILE.unlink()
        except FileNotFoundError:
            pass


def selected_indices(indices: list[dict[str, Any]], args: argparse.Namespace) -> list[dict[str, Any]]:
    wanted = [item.strip() for item in args.targets.split(",") if item.strip()]
    wanted_norm = {normalized(item) for item in wanted}
    matches: list[dict[str, Any]] = []
    for index in indices:
        aliases = {
            normalized(str(index.get("key", ""))),
            normalized(str(index.get("acronym", ""))),
            normalized(str(index.get("name", ""))),
        }
        if not wanted_norm or aliases & wanted_norm:
            matches.append(index)
    if wanted_norm:
        found = {normalized(str(index["key"])) for index in matches} | {normalized(str(index["acronym"])) for index in matches}
        missing = sorted(item for item in wanted if normalized(item) not in found)
        if missing:
            print(f"Missing requested targets: {', '.join(missing)}", file=sys.stderr)
    return matches


def scorable(index: dict[str, Any], args: argparse.Namespace) -> tuple[bool, str]:
    if index.get("canRender"):
        return True, ""
    if not args.include_pending:
        return False, "non-renderable; pass --include-pending to probe its evalscript anyway"
    if not index.get("evalscript"):
        return False, "no evalscript"
    platform = f"{index.get('platform', '')} {index.get('platformShort', '')}".lower()
    sensor_only_markers = ["emit", "pace", "desis", "planet", "landsat", "thermal"]
    if any(marker in platform for marker in sensor_only_markers):
        return False, "sensor-limited concept cannot be scored on current WMS layer"
    return True, "pending probed by request"


def run_index(session: requests.Session, index: dict[str, Any], args: argparse.Namespace, run_id: str) -> list[CandidateResult]:
    all_results: list[CandidateResult] = []
    baseline = current_bookmark_candidate(index)
    all_results.extend(run_phase(session, index, [baseline], args, run_id, len(all_results)))

    budget_left = max(0, args.budget_per_index - len(all_results))
    if budget_left <= 0:
        return all_results

    date_budget = budget_left
    if args.reserve_spatial > 0 and budget_left > args.reserve_spatial:
        date_budget = budget_left - args.reserve_spatial
    phase = date_zoom_candidates(index, args)[:date_budget]
    all_results.extend(run_phase(session, index, phase, args, run_id, len(all_results)))

    best = choose_best(all_results)
    if best is None:
        return all_results
    budget_left = max(0, args.budget_per_index - len(all_results))
    if budget_left > 0:
        phase = spatial_candidates(best, args.coarse_delta, "coarse")[:budget_left]
        all_results.extend(run_phase(session, index, phase, args, run_id, len(all_results)))

    best = choose_best(all_results)
    budget_left = max(0, args.budget_per_index - len(all_results))
    if best is not None and budget_left > 0:
        phase = spatial_candidates(best, args.refine_delta, "refine")[:budget_left]
        all_results.extend(run_phase(session, index, phase, args, run_id, len(all_results)))

    return all_results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a bounded hotspot loop for Limn Atlas bookmarks.")
    parser.add_argument("--targets", default=",".join(DEFAULT_TARGETS), help="Comma-separated acronyms/keys to score.")
    parser.add_argument("--size", type=int, default=512, help="WMS tile width/height in pixels.")
    parser.add_argument("--window-days", type=int, default=15, help="Optical/S1 lookback window ending on candidate date.")
    parser.add_argument("--s5p-window-days", type=int, default=30, help="S5P lookback window ending on candidate date.")
    parser.add_argument("--maxcc", type=int, default=30, help="Sentinel Hub max cloud cover percentage.")
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout per WMS request in seconds.")
    parser.add_argument("--date-days", type=int, default=30, help="Days before/after bookmark date for date phase.")
    parser.add_argument("--step-days", type=int, default=15, help="Date sweep increment in days.")
    parser.add_argument("--zoom-radius", type=int, default=1, help="Zoom levels around current bookmark to test.")
    parser.add_argument("--max-zoom", type=int, default=14, help="Maximum zoom to request.")
    parser.add_argument("--coarse-delta", type=float, default=0.3, help="Lat/lng offset in degrees for coarse spatial phase.")
    parser.add_argument("--refine-delta", type=float, default=0.08, help="Lat/lng offset in degrees for refine spatial phase.")
    parser.add_argument("--budget-per-index", type=int, default=28, help="Maximum WMS candidates per target.")
    parser.add_argument("--reserve-spatial", type=int, default=9, help="Candidate budget reserved for coarse/refine spatial movement.")
    parser.add_argument("--top-n", type=int, default=12, help="Rows retained in each shortlist.")
    parser.add_argument("--sleep", type=float, default=0.05, help="Pause between WMS requests.")
    parser.add_argument("--limit", type=int, default=0, help="Optional number of selected targets to run.")
    parser.add_argument("--include-pending", action="store_true", help="Probe non-renderable pending S2-like evalscripts.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    run_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    with ResultsLock():
        indices = selected_indices(load_indices(), args)
        runnable: list[dict[str, Any]] = []
        for index in indices:
            ok, reason = scorable(index, args)
            if ok:
                runnable.append(index)
            else:
                print(f"Skipping {index.get('acronym', index.get('key'))}: {reason}")
        if args.limit:
            runnable = runnable[: args.limit]
        if not runnable:
            print("No scorable targets selected.", file=sys.stderr)
            return 1

        session = requests.Session()
        session.headers.update({"User-Agent": "Limn-Atlas-Hotspot-Loop/1.0"})
        all_results: list[CandidateResult] = []
        for index in runnable:
            print(f"\n=== {index['acronym']} ({index['source']}) ===")
            results = run_index(session, index, args, run_id)
            write_shortlist(index, results, args)
            append_results(results)
            all_results.extend(results)

        summary = {
            "generated": datetime.now().isoformat(timespec="seconds"),
            "run_id": run_id,
            "results_tsv": str(RESULTS_TSV.relative_to(ROOT)),
            "targets": [index["acronym"] for index in runnable],
            "candidate_count": len(all_results),
            "best_by_target": {},
        }
        for index in runnable:
            target_results = [result for result in all_results if result.key == index["key"] and result.source == index["source"]]
            best = choose_best(target_results)
            if best:
                summary["best_by_target"][index["acronym"]] = asdict(best)
        (OUT_DIR / f"{run_id}_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(f"\nWrote {RESULTS_TSV}")
        print(f"Wrote {OUT_DIR / f'{run_id}_summary.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
