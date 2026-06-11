#!/usr/bin/env python3
"""
QC Limn produced-water spill bookmarks against source/date metadata.

This script intentionally does not read config-v1.js, .env, or credentials. It
only parses the static SPILL_BOOKMARKS array in src/app.js and checks whether
each bookmark carries enough metadata to support its use as a Permian produced
water calibration target or explicit hydrocarbon negative control.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
APP_JS = ROOT / "src" / "app.js"
OUT_DIR = ROOT / ".tmp"
JSON_OUT = OUT_DIR / "limn_spill_bookmark_qc.json"
MD_OUT = OUT_DIR / "limn_spill_bookmark_qc.md"

POSITIVE_CLASSES = {"produced-water-positive", "chronic-brine-positive"}
CONTEXT_CLASSES = {"produced-water-context"}
CONTROL_CLASSES = {"hydrocarbon-negative-control"}
PROOF_PRECISION_PREFIXES = ("High", "Medium")


@dataclass
class SpillBookmarkQc:
    id: str
    label: str
    evidence_class: str
    app_date: str
    display_date: str
    event_date: str
    date_role: str
    date_status: str
    lat: float
    lng: float
    confidence: str
    precision_status: str
    volume: str
    source: str
    source_urls: list[str]
    source_status: str
    indices: list[str]
    verdict: str
    issues: list[str]


def load_spill_bookmarks() -> list[dict[str, Any]]:
    code = r"""
import fs from 'node:fs';
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
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === quote) {
      inString = false;
    }
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
console.log(JSON.stringify(bookmarks));
"""
    completed = subprocess.run(
        ["node", "--input-type=module", "-e", code],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(completed.stdout)


def parse_iso_date(value: str) -> date | None:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def date_status(bookmark: dict[str, Any]) -> tuple[str, list[str]]:
    issues: list[str] = []
    app_date = parse_iso_date(str(bookmark.get("date", "")))
    event_date = str(bookmark.get("eventDate", ""))
    date_role = str(bookmark.get("dateRole", ""))

    if app_date is None:
        return "fail", ["Missing or invalid app date."]
    if "continuous" in date_role or event_date.startswith("continuous"):
        return "pass", []

    if "/" in event_date:
        start_text, end_text = event_date.split("/", 1)
        start = parse_iso_date(start_text)
        end = parse_iso_date(end_text)
        if start is None or end is None:
            return "fail", ["Invalid event date range."]
        if start <= app_date <= end:
            return "pass", []
        return "fail", [f"App date {app_date.isoformat()} is outside event window {event_date}."]

    event = parse_iso_date(event_date)
    if event is None:
        return "fail", ["Missing or invalid event date."]

    if "post-event" in date_role:
        if app_date >= event:
            return "pass", []
        return "fail", [f"Post-event imagery date {app_date.isoformat()} predates event {event.isoformat()}."]

    if app_date == event:
        return "pass", []
    issues.append(f"App date {app_date.isoformat()} does not match documented event date {event.isoformat()}.")
    return "warn", issues


def source_status(bookmark: dict[str, Any]) -> tuple[str, list[str], list[str]]:
    urls = bookmark.get("sourceUrls") or ([bookmark["sourceUrl"]] if bookmark.get("sourceUrl") else [])
    urls = [str(url) for url in urls if str(url).startswith(("http://", "https://"))]
    issues: list[str] = []
    if not urls:
        issues.append("No source URL recorded.")
        return "fail", issues, []
    if not bookmark.get("source"):
        issues.append("No source label recorded.")
        return "warn", issues, urls
    return "pass", issues, urls


def precision_status(bookmark: dict[str, Any]) -> tuple[str, list[str]]:
    confidence = str(bookmark.get("confidence", ""))
    evidence_class = str(bookmark.get("evidenceClass", ""))
    if confidence.startswith(PROOF_PRECISION_PREFIXES):
        return "pass", []
    if evidence_class in CONTEXT_CLASSES:
        return "context", ["Context-only location; not a proof-grade GPS target."]
    return "warn", [f"Location precision is {confidence}; use as context, not proof-grade GPS."]


def classify(bookmark: dict[str, Any]) -> SpillBookmarkQc:
    issues: list[str] = []
    source_state, source_issues, urls = source_status(bookmark)
    date_state, date_issues = date_status(bookmark)
    precision_state, precision_issues = precision_status(bookmark)
    issues.extend(source_issues)
    issues.extend(date_issues)
    issues.extend(precision_issues)

    evidence_class = str(bookmark.get("evidenceClass", ""))
    if evidence_class not in POSITIVE_CLASSES | CONTEXT_CLASSES | CONTROL_CLASSES:
        issues.append(f"Unknown evidenceClass: {evidence_class or 'missing'}.")

    if evidence_class in CONTROL_CLASSES:
        issues.append("Hydrocarbon negative control; expected not to behave like a produced-water positive bookmark.")

    if "fail" in {source_state, date_state}:
        verdict = "fail"
    elif precision_state == "warn" or date_state == "warn" or source_state == "warn":
        verdict = "warn"
    else:
        verdict = "pass"

    return SpillBookmarkQc(
        id=str(bookmark.get("id", "")),
        label=str(bookmark.get("label", "")),
        evidence_class=evidence_class,
        app_date=str(bookmark.get("date", "")),
        display_date=str(bookmark.get("displayDate", "")),
        event_date=str(bookmark.get("eventDate", "")),
        date_role=str(bookmark.get("dateRole", "")),
        date_status=date_state,
        lat=float(bookmark.get("lat")),
        lng=float(bookmark.get("lng")),
        confidence=str(bookmark.get("confidence", "")),
        precision_status=precision_state,
        volume=str(bookmark.get("volume", "")),
        source=str(bookmark.get("source", "")),
        source_urls=urls,
        source_status=source_state,
        indices=[str(index) for index in bookmark.get("indices", [])],
        verdict=verdict,
        issues=issues,
    )


def write_markdown(results: list[SpillBookmarkQc]) -> None:
    counts: dict[str, int] = {}
    for result in results:
        counts[result.verdict] = counts.get(result.verdict, 0) + 1

    positive_count = sum(1 for result in results if result.evidence_class in POSITIVE_CLASSES)
    context_count = sum(1 for result in results if result.evidence_class in CONTEXT_CLASSES)
    control_count = sum(1 for result in results if result.evidence_class in CONTROL_CLASSES)
    broad_count = sum(1 for result in results if result.precision_status in {"warn", "context"})

    lines = [
        "# Limn Produced-Water Spill Bookmark QC",
        "",
        f"Generated: {datetime.now().isoformat(timespec='seconds')}",
        f"Bookmarks checked: {len(results)}",
        f"Produced-water/chronic-brine positives: {positive_count}",
        f"Produced-water context bookmarks: {context_count}",
        f"Hydrocarbon negative controls: {control_count}",
        f"Regional/context locations: {broad_count}",
        "",
        "## Verdict Counts",
        "",
    ]
    for verdict in ["pass", "warn", "fail"]:
        lines.append(f"- `{verdict}`: {counts.get(verdict, 0)}")

    lines.extend(
        [
            "",
            "## Bookmark Audit",
            "",
            "| ID | Class | Verdict | App date | Event date | Date role | Precision | Sources | Issues |",
            "|---|---|---:|---|---|---|---|---:|---|",
        ]
    )
    for result in results:
        source_links = "<br>".join(f"[source {i + 1}]({url})" for i, url in enumerate(result.source_urls))
        issues = "<br>".join(result.issues) if result.issues else ""
        lines.append(
            f"| `{result.id}` | {result.evidence_class} | {result.verdict} | {result.app_date} | "
            f"{result.event_date} | {result.date_role} | {result.confidence} | {source_links} | {issues} |"
        )

    MD_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="QC Limn produced-water spill bookmark source/date support.")
    parser.add_argument("--fail-on-fail", action="store_true", help="Exit nonzero if any bookmark has a fail verdict.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    OUT_DIR.mkdir(exist_ok=True)
    bookmarks = load_spill_bookmarks()
    results = [classify(bookmark) for bookmark in bookmarks]
    JSON_OUT.write_text(
        json.dumps(
            {
                "generated": datetime.now().isoformat(timespec="seconds"),
                "source_file": str(APP_JS.relative_to(ROOT)),
                "bookmarks_checked": len(results),
                "results": [asdict(result) for result in results],
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    write_markdown(results)

    for result in results:
        print(f"{result.id:<34} {result.verdict:<5} {result.evidence_class:<28} date={result.date_status} precision={result.precision_status}")
    print(f"\nWrote {JSON_OUT}")
    print(f"Wrote {MD_OUT}")

    if args.fail_on_fail and any(result.verdict == "fail" for result in results):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
