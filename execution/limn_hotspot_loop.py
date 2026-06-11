#!/usr/bin/env python3
"""
Karpathy-loop hotspot search for the original Limn produced-water app.

The loop uses the public Sentinel-2 WMS fallback endpoint and static app source
only. It does not load runtime credential files.
"""

from __future__ import annotations

import argparse
import base64
import csv
import io
import json
import math
import os
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "execution"))

from qc_atlas_bookmarks import (  # noqa: E402
    DEFAULT_WMS_LAYER,
    DEFAULT_WMS_URL,
    bookmark_bbox,
    classify,
    signal_score,
    time_window,
)

OUT_DIR = ROOT / ".tmp" / "limn_hotspot_loop"
RESULTS_TSV = OUT_DIR / "results.tsv"
LOCK_FILE = OUT_DIR / "results.tsv.lock"

DEFAULT_INDEX_KEYS = ["pwi", "pwoi", "hpwi", "lbi", "fbc", "tri", "bpi", "vsi", "reai", "vcbi"]
VERDICT_RANK = {"error": 0, "blank": 1, "weak": 2, "moderate": 3, "strong": 4}
POSITIVE_CLASSES = {"produced-water-positive", "chronic-brine-positive"}
CONTEXT_CLASSES = {"produced-water-context"}
CONTROL_CLASSES = {"hydrocarbon-negative-control"}


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
    bookmark_id: str
    bookmark_label: str
    evidence_class: str
    index_key: str
    index_name: str
    phase: str
    note: str
    lat: float
    lng: float
    zoom: int
    date: str
    status: str
    verdict: str
    score: float
    visible_pct: float | None
    high_pct: float | None
    p95_luma: float | None
    p99_luma: float | None
    max_luma: float | None
    max_chroma: float | None
    largest_component_pct: float | None
    image_bytes: int
    uniform_guard: bool
    promotable: bool
    thumbnail: str
    reason: str


def normalized(value: str) -> str:
    return "".join(char.lower() for char in value if char.isalnum())


def load_targets(args: argparse.Namespace) -> dict[str, Any]:
    code = r"""
import fs from 'node:fs';
import { INDICES, CALIBRATION_PRESETS } from './src/indices.js';

const source = fs.readFileSync('./src/app.js', 'utf8');
const marker = 'const SPILL_BOOKMARKS = [';
const start = source.indexOf(marker);
if (start < 0) throw new Error('SPILL_BOOKMARKS marker not found');
let index = start + marker.length - 1;
let depth = 0;
let inString = false;
let quote = '';
let escaped = false;
for (; index < source.length; index += 1) {
  const char = source[index];
  if (inString) {
    if (escaped) escaped = false;
    else if (char === '\\') escaped = true;
    else if (char === quote) inString = false;
    continue;
  }
  if (char === '"' || char === "'" || char === '`') {
    inString = true;
    quote = char;
    continue;
  }
  if (char === '[') depth += 1;
  if (char === ']') {
    depth -= 1;
    if (depth === 0) {
      index += 1;
      break;
    }
  }
}
const arraySource = source.slice(start + 'const SPILL_BOOKMARKS = '.length, index);
const bookmarks = Function(`return (${arraySource});`)();

const materialize = (script, basin, sensitivity, visualFilter) => {
  const cal = CALIBRATION_PRESETS[basin] || CALIBRATION_PRESETS.permian;
  let out = script
    .replace(/__BSI_MASK__/g, cal.bsiMask)
    .replace(/__BSI_OFFSET__/g, cal.bsiOffset)
    .replace(/__NDWI_OFFSET__/g, cal.ndwiOffset)
    .replace(/__PWI_SALINITY_OFFSET__/g, cal.pwiSalinityOffset)
    .replace(/__PWI_HC_OFFSET__/g, cal.pwiHydrocarbonOffset)
    .replace(/__PWI_HMRI_OFFSET__/g, cal.pwiHmriOffset);
  out = out.replace('//VERSION=3', '');
  return `//VERSION=3
const VISUAL_FILTER = ${visualFilter};
const DETECTION_SENSITIVITY = ${sensitivity / 100};
${out}`;
};

const slim = {};
for (const [key, cfg] of Object.entries(INDICES)) {
  slim[key] = {
    key,
    name: cfg.name,
    sensor: cfg.sensor,
    temporal: cfg.temporal,
    formula: cfg.formula,
    evalscript: materialize(cfg.evalscript, process.argv[1], Number(process.argv[2]), Number(process.argv[3]))
  };
}
console.log(JSON.stringify({ bookmarks, indices: slim }));
"""
    completed = subprocess.run(
        ["node", "--input-type=module", "-e", code, args.basin, str(args.sensitivity), str(args.visual_filter)],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(completed.stdout)


def parse_date(value: str) -> datetime | None:
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return None


def allowed_date_range(bookmark: dict[str, Any], args: argparse.Namespace) -> tuple[str, str]:
    app_date = str(bookmark["date"])
    date_role = str(bookmark.get("dateRole", ""))
    event_date = str(bookmark.get("eventDate", ""))
    app_dt = parse_date(app_date)
    if app_dt is None:
        return app_date, app_date

    if "continuous" in date_role or event_date.startswith("continuous"):
        start = app_dt - timedelta(days=args.continuous_days)
        end = app_dt + timedelta(days=args.continuous_days)
        return start.date().isoformat(), end.date().isoformat()

    if "/" in event_date:
        start_text, end_text = event_date.split("/", 1)
        start_dt = parse_date(start_text)
        end_dt = parse_date(end_text)
        if start_dt and end_dt:
            return start_dt.date().isoformat(), (end_dt + timedelta(days=args.post_event_days)).date().isoformat()

    event_dt = parse_date(event_date)
    if event_dt:
        if "post-event" in date_role:
            end = max(app_dt, event_dt) + timedelta(days=args.post_event_days)
            return event_dt.date().isoformat(), end.date().isoformat()
        if "context" in str(bookmark.get("evidenceClass", "")):
            return (event_dt - timedelta(days=args.context_days)).date().isoformat(), (event_dt + timedelta(days=args.context_days)).date().isoformat()
        return event_dt.date().isoformat(), (event_dt + timedelta(days=args.post_event_days)).date().isoformat()

    return app_date, app_date


def date_candidates(bookmark: dict[str, Any], args: argparse.Namespace) -> list[str]:
    start_text, end_text = allowed_date_range(bookmark, args)
    start = parse_date(start_text)
    end = parse_date(end_text)
    app_dt = parse_date(str(bookmark["date"]))
    if not start or not end:
        return [str(bookmark["date"])]
    if start > end:
        start, end = end, start
    candidates: list[str] = []
    current = start
    while current <= end:
        candidates.append(current.date().isoformat())
        current += timedelta(days=args.step_days)
    if app_dt and start <= app_dt <= end:
        candidates.append(app_dt.date().isoformat())
    unique = sorted(set(candidates))
    if app_dt:
        return sorted(unique, key=lambda item: (abs((parse_date(item) - app_dt).days) if parse_date(item) else 99999, item))
    return unique


def spatial_delta(bookmark: dict[str, Any], args: argparse.Namespace) -> float:
    confidence = str(bookmark.get("confidence", "")).lower()
    evidence = str(bookmark.get("evidenceClass", ""))
    if evidence in CONTEXT_CLASSES or "regional" in confidence:
        return args.context_delta
    if "medium" in confidence:
        return args.medium_delta
    return args.exact_delta


def zoom_candidates(current_zoom: int, args: argparse.Namespace) -> list[int]:
    values = []
    for offset in range(-args.zoom_radius, args.zoom_radius + 1):
        value = current_zoom + offset
        if args.min_zoom <= value <= args.max_zoom:
            values.append(value)
    values.append(current_zoom)
    return sorted(set(values))


def current_bookmark_candidate(bookmark: dict[str, Any]) -> Candidate:
    return Candidate(
        lat=float(bookmark["lat"]),
        lng=float(bookmark["lng"]),
        zoom=int(bookmark["zoom"]),
        date=str(bookmark["date"]),
        phase="baseline",
        note="current bookmark",
    )


def date_zoom_candidates(bookmark: dict[str, Any], args: argparse.Namespace) -> list[Candidate]:
    return [
        Candidate(float(bookmark["lat"]), float(bookmark["lng"]), zoom, date, "datezoom", "same location date/zoom sweep")
        for date in date_candidates(bookmark, args)
        for zoom in zoom_candidates(int(bookmark["zoom"]), args)
    ]


def spatial_candidates(best: CandidateResult, bookmark: dict[str, Any], args: argparse.Namespace, phase: str) -> list[Candidate]:
    delta = spatial_delta(bookmark, args)
    if phase == "refine":
        delta = delta / 3
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
    params = {
        "service": "WMS",
        "request": "GetMap",
        "version": "1.3.0",
        "layers": DEFAULT_WMS_LAYER,
        "format": "image/png",
        "transparent": "true",
        "width": str(args.size),
        "height": str(args.size),
        "crs": "CRS:84",
        "bbox": ",".join(f"{value:.8f}" for value in bbox),
        "time": time_window(candidate.date, args.window_days),
        "maxcc": str(args.maxcc),
        "showlogo": "false",
        "evalscript": encoded_script,
    }
    return DEFAULT_WMS_URL, params


def analyze_components(data: bytes) -> tuple[dict[str, float], float]:
    image = Image.open(io.BytesIO(data)).convert("RGBA")
    width, height = image.size
    raw = image.tobytes()
    total = width * height
    mask = bytearray(total)
    for pixel_index, offset in enumerate(range(0, len(raw), 4)):
        red = raw[offset]
        green = raw[offset + 1]
        blue = raw[offset + 2]
        alpha = raw[offset + 3]
        max_channel = max(red, green, blue)
        min_channel = min(red, green, blue)
        chroma = (max_channel - min_channel) / 255
        luma = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
        if alpha > 50 and chroma >= 0.10 and (max_channel >= 100 or luma >= 0.40):
            mask[pixel_index] = 1

    visited = bytearray(total)
    largest = 0
    for idx, value in enumerate(mask):
        if not value or visited[idx]:
            continue
        stack = [idx]
        visited[idx] = 1
        size = 0
        while stack:
            current = stack.pop()
            size += 1
            row, col = divmod(current, width)
            for nr, nc in ((row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)):
                if nr < 0 or nr >= height or nc < 0 or nc >= width:
                    continue
                neighbor = nr * width + nc
                if mask[neighbor] and not visited[neighbor]:
                    visited[neighbor] = 1
                    stack.append(neighbor)
        largest = max(largest, size)

    # Reuse the atlas pixel metrics; component size adds shape/coherence.
    from qc_atlas_bookmarks import analyze_png  # local import avoids circular surprises

    metrics = analyze_png(data)
    return metrics, round((largest / total) * 100, 3)


def is_uniform_frame(metrics: dict[str, float], largest_component_pct: float, image_bytes: int) -> bool:
    if image_bytes < 500:
        return False
    visible_pct = metrics["visible_pct"]
    high_pct = metrics["high_pct"]
    p95_luma = metrics["p95_luma"]
    p99_luma = metrics["p99_luma"]
    max_chroma = metrics["max_chroma"]
    if visible_pct >= 90.0 and high_pct >= 65.0:
        return True
    if visible_pct >= 98.0 and high_pct >= 30.0:
        return True
    if largest_component_pct >= 85.0:
        return True
    if visible_pct >= 95.0 and abs(p99_luma - p95_luma) <= 0.025 and max_chroma <= 0.18:
        return True
    if visible_pct >= 95.0 and high_pct <= 0.5:
        return True
    return False


def loop_score(metrics: dict[str, float], largest_component_pct: float, image_bytes: int, uniform_guard: bool) -> float:
    if uniform_guard:
        return 0.0
    base = signal_score(metrics, image_bytes)
    coherence = min(largest_component_pct, 20.0) * 0.35
    return round(base + coherence, 4)


def fetch_candidate(
    session: requests.Session,
    bookmark: dict[str, Any],
    index: dict[str, Any],
    candidate: Candidate,
    args: argparse.Namespace,
    run_id: str,
    ordinal: int,
) -> CandidateResult:
    target = f"{bookmark['id']}:{index['key']}"
    png_name = f"{run_id}_{normalized(bookmark['id'])}_{normalized(index['key'])}_{ordinal:03d}_{candidate.phase}_{candidate.date}_z{candidate.zoom}.png"
    png_path = OUT_DIR / png_name
    url, params = build_wms_params(index, candidate, args)
    base = {
        "run_id": run_id,
        "target": target,
        "bookmark_id": str(bookmark["id"]),
        "bookmark_label": str(bookmark["label"]),
        "evidence_class": str(bookmark.get("evidenceClass", "")),
        "index_key": str(index["key"]),
        "index_name": str(index["name"]),
        "phase": candidate.phase,
        "note": candidate.note,
        "lat": candidate.lat,
        "lng": candidate.lng,
        "zoom": candidate.zoom,
        "date": candidate.date,
    }
    response: requests.Response | None = None
    for attempt in range(args.retries + 1):
        try:
            response = session.get(url, params=params, timeout=args.timeout)
        except requests.RequestException as error:
            if attempt >= args.retries:
                return CandidateResult(**base, status="error", verdict="error", score=0.0, visible_pct=None, high_pct=None, p95_luma=None, p99_luma=None, max_luma=None, max_chroma=None, largest_component_pct=None, image_bytes=0, uniform_guard=False, promotable=False, thumbnail="", reason=f"Request failed: {error}")
            time.sleep(args.retry_sleep * (attempt + 1))
            continue
        if response.status_code not in {429, 500, 502, 503, 504}:
            break
        if attempt >= args.retries:
            break
        retry_after = response.headers.get("retry-after")
        sleep_for = float(retry_after) if retry_after and retry_after.isdigit() else args.retry_sleep * (attempt + 1)
        time.sleep(sleep_for)

    if response is None:
        return CandidateResult(**base, status="error", verdict="error", score=0.0, visible_pct=None, high_pct=None, p95_luma=None, p99_luma=None, max_luma=None, max_chroma=None, largest_component_pct=None, image_bytes=0, uniform_guard=False, promotable=False, thumbnail="", reason="No HTTP response.")

    image_bytes = len(response.content)
    if response.status_code != 200:
        return CandidateResult(**base, status=f"http-{response.status_code}", verdict="error", score=0.0, visible_pct=None, high_pct=None, p95_luma=None, p99_luma=None, max_luma=None, max_chroma=None, largest_component_pct=None, image_bytes=image_bytes, uniform_guard=False, promotable=False, thumbnail="", reason=response.text[:300].replace("\n", " "))

    content_type = response.headers.get("content-type", "")
    if "image" not in content_type.lower():
        return CandidateResult(**base, status="error", verdict="error", score=0.0, visible_pct=None, high_pct=None, p95_luma=None, p99_luma=None, max_luma=None, max_chroma=None, largest_component_pct=None, image_bytes=image_bytes, uniform_guard=False, promotable=False, thumbnail="", reason=f"Expected image response, got {content_type}: {response.text[:250]}")

    png_path.write_bytes(response.content)
    try:
        metrics, largest_component_pct = analyze_components(response.content)
    except Exception as error:  # noqa: BLE001
        return CandidateResult(**base, status="error", verdict="error", score=0.0, visible_pct=None, high_pct=None, p95_luma=None, p99_luma=None, max_luma=None, max_chroma=None, largest_component_pct=None, image_bytes=image_bytes, uniform_guard=False, promotable=False, thumbnail=str(png_path.relative_to(ROOT)), reason=f"Could not decode image: {error}")

    verdict, reason = classify(metrics, image_bytes)
    uniform_guard = is_uniform_frame(metrics, largest_component_pct, image_bytes)
    score = loop_score(metrics, largest_component_pct, image_bytes, uniform_guard)
    promotable = not uniform_guard and verdict in {"moderate", "strong"} and metrics["high_pct"] >= args.min_promote_high_pct
    if uniform_guard:
        reason = "Rejected by uniform-frame guard; signal fills the frame too evenly to be proof-grade."

    return CandidateResult(
        **base,
        status="ok",
        verdict=verdict,
        score=score,
        visible_pct=metrics["visible_pct"],
        high_pct=metrics["high_pct"],
        p95_luma=metrics["p95_luma"],
        p99_luma=metrics["p99_luma"],
        max_luma=metrics["max_luma"],
        max_chroma=metrics["max_chroma"],
        largest_component_pct=largest_component_pct,
        image_bytes=image_bytes,
        uniform_guard=uniform_guard,
        promotable=promotable,
        thumbnail=str(png_path.relative_to(ROOT)),
        reason=reason,
    )


def better_candidate(a: CandidateResult, b: CandidateResult | None) -> bool:
    if b is None:
        return True
    if a.promotable != b.promotable:
        return a.promotable
    a_rank = VERDICT_RANK.get(a.verdict, 0)
    b_rank = VERDICT_RANK.get(b.verdict, 0)
    if a_rank != b_rank:
        return a_rank > b_rank
    return a.score > b.score


def choose_best(results: list[CandidateResult]) -> CandidateResult | None:
    best: CandidateResult | None = None
    for result in results:
        if better_candidate(result, best):
            best = result
    return best


def run_phase(
    session: requests.Session,
    bookmark: dict[str, Any],
    index: dict[str, Any],
    candidates: list[Candidate],
    args: argparse.Namespace,
    run_id: str,
    existing_count: int,
) -> list[CandidateResult]:
    results: list[CandidateResult] = []
    for offset, candidate in enumerate(dedupe_candidates(candidates), start=existing_count + 1):
        result = fetch_candidate(session, bookmark, index, candidate, args, run_id, offset)
        results.append(result)
        print(
            f"{bookmark['id'][:18]:<18} {index['key']:<6} {candidate.phase:<8} {result.verdict:<8} "
            f"score={result.score:<7} high={result.high_pct} visible={result.visible_pct} comp={result.largest_component_pct} "
            f"{'uniform' if result.uniform_guard else ''}",
            flush=True,
        )
        time.sleep(args.sleep)
    return results


def run_target(session: requests.Session, bookmark: dict[str, Any], index: dict[str, Any], args: argparse.Namespace, run_id: str) -> list[CandidateResult]:
    all_results: list[CandidateResult] = []
    all_results.extend(run_phase(session, bookmark, index, [current_bookmark_candidate(bookmark)], args, run_id, len(all_results)))
    budget_left = max(0, args.budget_per_target - len(all_results))
    if budget_left <= 0:
        return all_results

    date_budget = budget_left
    if args.reserve_spatial > 0 and budget_left > args.reserve_spatial:
        date_budget = budget_left - args.reserve_spatial
    all_results.extend(run_phase(session, bookmark, index, date_zoom_candidates(bookmark, args)[:date_budget], args, run_id, len(all_results)))

    best = choose_best(all_results)
    budget_left = max(0, args.budget_per_target - len(all_results))
    if best and budget_left > 0:
        all_results.extend(run_phase(session, bookmark, index, spatial_candidates(best, bookmark, args, "coarse")[:budget_left], args, run_id, len(all_results)))

    best = choose_best(all_results)
    budget_left = max(0, args.budget_per_target - len(all_results))
    if best and budget_left > 0:
        all_results.extend(run_phase(session, bookmark, index, spatial_candidates(best, bookmark, args, "refine")[:budget_left], args, run_id, len(all_results)))

    return all_results


def tsv_header() -> str:
    return "\t".join(CandidateResult.__dataclass_fields__.keys()) + "\n"


def tsv_row(result: CandidateResult) -> str:
    values = []
    for field in CandidateResult.__dataclass_fields__:
        value = getattr(result, field)
        values.append("" if value is None else str(value).replace("\t", " ").replace("\n", " "))
    return "\t".join(values) + "\n"


def append_results(results: list[CandidateResult]) -> None:
    if not RESULTS_TSV.exists():
        RESULTS_TSV.write_text(tsv_header(), encoding="utf-8")
    with RESULTS_TSV.open("a", encoding="utf-8") as handle:
        for result in results:
            handle.write(tsv_row(result))


def write_shortlist(bookmark: dict[str, Any], index: dict[str, Any], results: list[CandidateResult], args: argparse.Namespace) -> None:
    ranked = sorted(results, key=lambda item: (item.promotable, VERDICT_RANK.get(item.verdict, 0), item.score), reverse=True)
    baseline = next((item for item in results if item.phase == "baseline"), None)
    best = ranked[0] if ranked else None
    lines = [
        f"# Limn Hotspot Shortlist - {bookmark['id']} / {index['key']}",
        "",
        f"Generated: {datetime.now().isoformat(timespec='seconds')}",
        f"Bookmark: `{bookmark['label']}`",
        f"Evidence class: `{bookmark.get('evidenceClass', '')}`",
        f"Date role: `{bookmark.get('dateRole', '')}`",
        f"Allowed date range: `{allowed_date_range(bookmark, args)[0]}` to `{allowed_date_range(bookmark, args)[1]}`",
        f"Index: `{index['name']}`",
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
                f"- Largest component %: `{baseline.largest_component_pct}`",
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
                f"- Largest component %: `{best.largest_component_pct}`",
                f"- Uniform guard: `{best.uniform_guard}`",
                f"- Candidate: `{best.lat:.6f}, {best.lng:.6f}, z{best.zoom}, {best.date}`",
                f"- Thumbnail: `{best.thumbnail}`",
                "",
            ]
        )
    lines.extend(
        [
            "## Ranked Candidates",
            "",
            "| Rank | Phase | Verdict | Score | Visible % | High % | Component % | Uniform | Candidate | Thumbnail |",
            "|---:|---|---:|---:|---:|---:|---:|---:|---|---|",
        ]
    )
    for rank, result in enumerate(ranked[: args.top_n], start=1):
        lines.append(
            f"| {rank} | {result.phase} | {result.verdict} | {result.score} | "
            f"{result.visible_pct if result.visible_pct is not None else ''} | "
            f"{result.high_pct if result.high_pct is not None else ''} | "
            f"{result.largest_component_pct if result.largest_component_pct is not None else ''} | "
            f"{result.uniform_guard} | {result.lat:.6f}, {result.lng:.6f}, z{result.zoom}, {result.date} | {result.thumbnail} |"
        )
    lines.append("")
    path = OUT_DIR / f"{normalized(bookmark['id'])}_{normalized(index['key'])}_shortlist.md"
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


def select_targets(data: dict[str, Any], args: argparse.Namespace) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    wanted_targets = {item.strip() for item in args.targets.split(",") if item.strip()}
    wanted_norm = {normalized(item) for item in wanted_targets}
    wanted_indices = {item.strip() for item in args.indices.split(",") if item.strip()}
    selected: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for bookmark in data["bookmarks"]:
        bookmark_aliases = {normalized(str(bookmark.get("id", ""))), normalized(str(bookmark.get("label", "")))}
        if wanted_norm and not (bookmark_aliases & wanted_norm):
            continue
        keys = [key for key in bookmark.get("indices", []) if key in data["indices"]]
        if args.allow_all_indices and wanted_indices:
            keys = [key for key in wanted_indices if key in data["indices"]]
        if bookmark.get("evidenceClass") in CONTROL_CLASSES and args.include_control_negatives:
            for key in ("pwi", "pwoi"):
                if key in data["indices"] and key not in keys:
                    keys.append(key)
        for key in keys:
            if wanted_indices and key not in wanted_indices:
                continue
            if key not in DEFAULT_INDEX_KEYS and not args.allow_all_indices:
                continue
            selected.append((bookmark, data["indices"][key]))
    return selected


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a bounded produced-water hotspot loop for Limn bookmarks.")
    parser.add_argument("--targets", default="", help="Comma-separated bookmark ids or labels. Defaults to all spill bookmarks.")
    parser.add_argument("--indices", default="pwi,pwoi,hpwi,lbi", help="Comma-separated index keys to score.")
    parser.add_argument("--allow-all-indices", action="store_true", help="Allow scoring any index listed by a bookmark.")
    parser.add_argument("--include-control-negatives", action="store_true", help="Also score PWCI/ASAI on hydrocarbon negative controls.")
    parser.add_argument("--basin", default="permian", choices=["permian", "standard"], help="Calibration preset.")
    parser.add_argument("--sensitivity", type=int, default=0, help="Detection sensitivity percentage, matching the UI slider.")
    parser.add_argument("--visual-filter", type=float, default=0.0, help="Visual filter threshold, matching the UI slider 0.0-1.0.")
    parser.add_argument("--size", type=int, default=384, help="WMS tile width/height in pixels.")
    parser.add_argument("--window-days", type=int, default=15, help="Lookback window ending on candidate date.")
    parser.add_argument("--maxcc", type=int, default=30, help="Sentinel Hub max cloud cover percentage.")
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout per WMS request in seconds.")
    parser.add_argument("--retries", type=int, default=2, help="Retries for transient WMS throttling/errors.")
    parser.add_argument("--retry-sleep", type=float, default=4.0, help="Base sleep seconds between retries.")
    parser.add_argument("--step-days", type=int, default=15, help="Date sweep increment in days.")
    parser.add_argument("--post-event-days", type=int, default=60, help="Maximum post-event days for exact event targets.")
    parser.add_argument("--context-days", type=int, default=90, help="Days around report date for context targets.")
    parser.add_argument("--continuous-days", type=int, default=180, help="Days around representative date for continuous targets.")
    parser.add_argument("--zoom-radius", type=int, default=1, help="Zoom levels around current bookmark to test.")
    parser.add_argument("--min-zoom", type=int, default=11, help="Minimum zoom to request.")
    parser.add_argument("--max-zoom", type=int, default=16, help="Maximum zoom to request.")
    parser.add_argument("--exact-delta", type=float, default=0.002, help="Spatial step degrees for exact GPS targets.")
    parser.add_argument("--medium-delta", type=float, default=0.01, help="Spatial step degrees for medium precision targets.")
    parser.add_argument("--context-delta", type=float, default=0.05, help="Spatial step degrees for context/regional targets.")
    parser.add_argument("--budget-per-target", type=int, default=22, help="Maximum WMS candidates per bookmark-index target.")
    parser.add_argument("--reserve-spatial", type=int, default=9, help="Candidate budget reserved for spatial movement.")
    parser.add_argument("--min-promote-high-pct", type=float, default=0.5, help="Minimum high-signal coverage required before a candidate can be promoted.")
    parser.add_argument("--top-n", type=int, default=12, help="Rows retained in each shortlist.")
    parser.add_argument("--sleep", type=float, default=0.05, help="Pause between WMS requests.")
    parser.add_argument("--limit", type=int, default=0, help="Optional target limit for debugging.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    run_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    with ResultsLock():
        data = load_targets(args)
        targets = select_targets(data, args)
        if args.limit:
            targets = targets[: args.limit]
        if not targets:
            print("No targets selected.", file=sys.stderr)
            return 1

        session = requests.Session()
        session.headers.update({"User-Agent": "Limn-Produced-Water-Hotspot-Loop/1.0"})
        all_results: list[CandidateResult] = []
        for bookmark, index in targets:
            print(f"\n=== {bookmark['id']} / {index['key']} ===")
            results = run_target(session, bookmark, index, args, run_id)
            write_shortlist(bookmark, index, results, args)
            append_results(results)
            all_results.extend(results)

        summary: dict[str, Any] = {
            "generated": datetime.now().isoformat(timespec="seconds"),
            "run_id": run_id,
            "results_tsv": str(RESULTS_TSV.relative_to(ROOT)),
            "target_count": len(targets),
            "candidate_count": len(all_results),
            "best_by_target": {},
        }
        for bookmark, index in targets:
            target_key = f"{bookmark['id']}:{index['key']}"
            target_results = [result for result in all_results if result.target == target_key]
            best = choose_best(target_results)
            if best:
                summary["best_by_target"][target_key] = asdict(best)
        (OUT_DIR / f"{run_id}_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(f"\nWrote {RESULTS_TSV}")
        print(f"Wrote {OUT_DIR / f'{run_id}_summary.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
