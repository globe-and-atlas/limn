#!/usr/bin/env python3
"""
Audit Limn spill bookmark index chips against measured hotspot-loop results.

This script does not read credentials or config files. It parses the static
SPILL_BOOKMARKS array from src/app.js and checks that each advertised bookmark
chip has a promotable measured result in a hotspot-loop summary JSON.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
HOTSPOT_DIR = ROOT / ".tmp" / "limn_hotspot_loop"
OUT_JSON = ROOT / ".tmp" / "spill_index_claim_audit.json"
OUT_MD = ROOT / ".tmp" / "spill_index_claim_audit.md"
CONTROL_CLASSES = {"hydrocarbon-negative-control"}


@dataclass
class ClaimAuditRow:
    bookmark_id: str
    label: str
    evidence_class: str
    index_key: str
    verdict: str
    promotable: bool
    status: str
    issue: str


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


def latest_summary() -> Path:
    summaries = sorted(HOTSPOT_DIR.glob("*_summary.json"))
    if not summaries:
        raise FileNotFoundError(f"No hotspot summary JSON found in {HOTSPOT_DIR}")
    return summaries[-1]


def load_summary(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("best_by_target", data)


def audit(bookmarks: list[dict[str, Any]], summary: dict[str, Any]) -> list[ClaimAuditRow]:
    rows: list[ClaimAuditRow] = []
    for bookmark in bookmarks:
        bookmark_id = str(bookmark.get("id", ""))
        evidence_class = str(bookmark.get("evidenceClass", ""))
        if evidence_class in CONTROL_CLASSES and bookmark.get("indices"):
            rows.append(
                ClaimAuditRow(
                    bookmark_id=bookmark_id,
                    label=str(bookmark.get("label", "")),
                    evidence_class=evidence_class,
                    index_key=",".join(str(index) for index in bookmark.get("indices", [])),
                    verdict="control",
                    promotable=False,
                    status="fail",
                    issue="Negative-control bookmarks must not advertise proof-style index chips.",
                )
            )
            continue

        for index_key in bookmark.get("indices", []):
            target_key = f"{bookmark_id}:{index_key}"
            result = summary.get(target_key)
            if not result:
                rows.append(
                    ClaimAuditRow(
                        bookmark_id=bookmark_id,
                        label=str(bookmark.get("label", "")),
                        evidence_class=evidence_class,
                        index_key=str(index_key),
                        verdict="missing",
                        promotable=False,
                        status="fail",
                        issue=f"No measured result found for advertised chip {target_key}.",
                    )
                )
                continue
            promotable = bool(result.get("promotable"))
            verdict = str(result.get("verdict", ""))
            rows.append(
                ClaimAuditRow(
                    bookmark_id=bookmark_id,
                    label=str(bookmark.get("label", "")),
                    evidence_class=evidence_class,
                    index_key=str(index_key),
                    verdict=verdict,
                    promotable=promotable,
                    status="pass" if promotable else "fail",
                    issue="" if promotable else f"Advertised chip {target_key} is {verdict}, not promotable.",
                )
            )
    return rows


def write_outputs(rows: list[ClaimAuditRow], summary_path: Path) -> None:
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated": datetime.now().isoformat(timespec="seconds"),
        "summary": str(summary_path.relative_to(ROOT)),
        "fail_count": sum(1 for row in rows if row.status == "fail"),
        "rows": [asdict(row) for row in rows],
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# Limn Spill Index Claim Audit",
        "",
        f"Generated: {payload['generated']}",
        f"Summary: `{payload['summary']}`",
        f"Failures: `{payload['fail_count']}`",
        "",
        "| Bookmark | Class | Index | Verdict | Promotable | Status | Issue |",
        "|---|---|---|---|---:|---:|---|",
    ]
    for row in rows:
        lines.append(
            f"| `{row.bookmark_id}` | {row.evidence_class} | `{row.index_key}` | "
            f"{row.verdict} | {row.promotable} | {row.status} | {row.issue} |"
        )
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit spill bookmark index chips against hotspot-loop results.")
    parser.add_argument("--summary", type=Path, default=None, help="Hotspot-loop summary JSON. Defaults to latest .tmp summary.")
    parser.add_argument("--fail-on-fail", action="store_true", help="Exit nonzero if any advertised chip is not promotable.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    summary_path = args.summary or latest_summary()
    if not summary_path.is_absolute():
        summary_path = ROOT / summary_path
    rows = audit(load_spill_bookmarks(), load_summary(summary_path))
    write_outputs(rows, summary_path)
    for row in rows:
        print(f"{row.bookmark_id:<34} {row.index_key:<8} {row.verdict:<8} {row.status}")
        if row.issue:
            print(f"  - {row.issue}")
    fail_count = sum(1 for row in rows if row.status == "fail")
    print(f"\nWrote {OUT_JSON}")
    print(f"Wrote {OUT_MD}")
    if args.fail_on_fail and fail_count:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
