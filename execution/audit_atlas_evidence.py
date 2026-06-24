#!/usr/bin/env python3
"""Audit Limn Atlas bookmark evidence packs.

The audit imports the public Atlas catalog in a fresh Node process, verifies
that every renderable bookmark has enough cited incident/domain sources, and
performs bounded HTTP checks for linked sources. Copernicus Browser, Sentinel
Hub sensor docs, and WMS docs are technical verification links; they do not
count as cited sources. The audit does not read config-v1.js or .env.
"""

from __future__ import annotations

import json
import subprocess
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / ".tmp"
JSON_OUT = OUT_DIR / "atlas_evidence_audit.json"
MD_OUT = OUT_DIR / "atlas_evidence_audit.md"


CATALOG_SCRIPT = """
import { ATLAS_INDICES } from './src/atlas-indices.js';
import { SAR_DEMO_INDICES } from './src/atlas-sar-demos.js';
import { S5P_DEMO_INDICES } from './src/atlas-s5p-demos.js';
import { getAtlasEvidence, getAtlasTrust } from './src/atlas-evidence.js';

const all = [...ATLAS_INDICES, ...SAR_DEMO_INDICES, ...S5P_DEMO_INDICES];
const rows = all.map(index => ({
  key: index.key,
  acronym: index.acronym,
  canRender: index.canRender === true,
  novelty: index.novelty,
  platform: index.platform,
  bookmark: index.bookmark,
  source: index.source || '',
  sourceUrl: index.sourceUrl || '',
  trust: getAtlasTrust(index),
  evidence: getAtlasEvidence(index),
}));
console.log(JSON.stringify(rows));
"""


@dataclass
class UrlCheck:
    url: str
    ok: bool
    status: int | None
    content_type: str
    error: str


def load_catalog() -> list[dict[str, Any]]:
    result = subprocess.run(
        ["node", "--input-type=module", "-e", CATALOG_SCRIPT],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def check_url(url: str, timeout: int = 6) -> UrlCheck:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Limn-Atlas-Evidence-Audit/1.0"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            status = int(response.status)
            return UrlCheck(
                url=url,
                ok=200 <= status < 400,
                status=status,
                content_type=response.headers.get("content-type", ""),
                error="",
            )
    except urllib.error.HTTPError as exc:
        return UrlCheck(
            url=url,
            ok=False,
            status=int(exc.code),
            content_type=exc.headers.get("content-type", "") if exc.headers else "",
            error=str(exc.reason),
        )
    except Exception as exc:  # noqa: BLE001 - audit report should record failures.
        return UrlCheck(url=url, ok=False, status=None, content_type="", error=str(exc))


def counts_as_citation(item: dict[str, Any]) -> bool:
    if not item.get("url"):
        return False
    if item.get("countsAsCitation") is False or item.get("technical") is True:
        return False
    return str(item.get("type", "")).lower() not in {"imagery", "sensor", "service", "method"}


def counts_as_technical(item: dict[str, Any]) -> bool:
    return bool(item.get("url")) and item.get("technical") is True


def audit_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unique_urls = sorted(
        {
            item["url"]
            for row in rows
            if row["canRender"]
            for item in row["evidence"]
            if item.get("url")
        }
    )
    url_cache: dict[str, UrlCheck] = {}
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(check_url, url): url for url in unique_urls}
        for future in as_completed(futures):
            url = futures[future]
            try:
                url_cache[url] = future.result()
            except Exception as exc:  # noqa: BLE001 - keep audit running.
                url_cache[url] = UrlCheck(url=url, ok=False, status=None, content_type="", error=str(exc))

    audited: list[dict[str, Any]] = []
    for row in rows:
        renderable = row["canRender"]
        evidence = row["evidence"] if renderable else []
        urls = [item["url"] for item in evidence if item.get("url")]
        citation_urls = [item["url"] for item in evidence if counts_as_citation(item)]
        technical_urls = [
            item["url"]
            for item in evidence
            if counts_as_technical(item)
        ]
        reference_urls = [
            item["url"]
            for item in evidence
            if item.get("url") and not counts_as_citation(item) and not counts_as_technical(item)
        ]
        checks = []
        for url in urls:
            checks.append(asdict(url_cache[url]))

        three_source = len(citation_urls) >= 3
        reachable_count = sum(1 for url in citation_urls if url_cache[url].ok)
        reachable_reference_count = sum(1 for url in reference_urls if url_cache[url].ok)
        reachable_technical_count = sum(1 for url in technical_urls if url_cache[url].ok)
        primary_url = row.get("sourceUrl", "")
        primary_check = url_cache.get(primary_url) if primary_url else None
        primary_ok = bool(primary_check and primary_check.ok)
        failed_citation_checks = [asdict(url_cache[url]) for url in citation_urls if not url_cache[url].ok]
        failed_technical_checks = [asdict(url_cache[url]) for url in technical_urls if not url_cache[url].ok]
        strict_strong_ok = row["trust"]["tier"] != "Strong" or not failed_citation_checks
        gold_ready = renderable and three_source and reachable_count >= 3 and primary_ok and strict_strong_ok
        audited.append(
            {
                **row,
                "evidenceUrlCount": len(urls),
                "citationUrlCount": len(citation_urls),
                "reachableCitationUrlCount": reachable_count,
                "referenceUrlCount": len(reference_urls),
                "reachableReferenceUrlCount": reachable_reference_count,
                "technicalUrlCount": len(technical_urls),
                "reachableTechnicalUrlCount": reachable_technical_count,
                "reachableEvidenceUrlCount": sum(1 for check in checks if check["ok"]),
                "primarySourceReachable": primary_ok,
                "goldReady": gold_ready,
                "urlChecks": checks,
                "issues": build_issues(
                    row,
                    three_source,
                    reachable_count,
                    primary_ok,
                    strict_strong_ok,
                    failed_citation_checks,
                    failed_technical_checks,
                ),
            }
        )
    return audited


def build_issues(
    row: dict[str, Any],
    three_source: bool,
    reachable_count: int,
    primary_ok: bool,
    strict_strong_ok: bool,
    failed_citation_checks: list[dict[str, Any]],
    failed_technical_checks: list[dict[str, Any]],
) -> list[str]:
    issues: list[str] = []
    if row["canRender"] and not three_source:
        issues.append("fewer than three cited source URLs")
    if row["canRender"] and reachable_count < 3:
        issues.append("fewer than three reachable cited source URLs")
    if row["canRender"] and not primary_ok:
        issues.append("primary bookmark source is not reachable")
    if row["canRender"] and not strict_strong_ok:
        issues.append("strong verification pack contains unreachable cited source")
    if failed_citation_checks:
        issues.append(
            "unreachable cited sources: "
            + ", ".join(f"{check['status'] or 'ERR'} {check['url']}" for check in failed_citation_checks[:3])
        )
    if failed_technical_checks:
        issues.append(
            "unreachable technical links: "
            + ", ".join(f"{check['status'] or 'ERR'} {check['url']}" for check in failed_technical_checks[:3])
        )
    return issues


def write_markdown(audited: list[dict[str, Any]]) -> None:
    renderable = [row for row in audited if row["canRender"]]
    gold = [row for row in renderable if row["goldReady"]]
    needs_work = [row for row in renderable if not row["goldReady"]]
    lines = [
        "# Atlas Evidence Audit",
        "",
        f"Generated: {datetime.now().isoformat(timespec='seconds')}",
        "",
        f"- Renderable bookmarks: {len(renderable)}",
        f"- Gold-ready evidence packs: {len(gold)}",
        f"- Needs evidence cleanup: {len(needs_work)}",
        "- Gold-ready now requires three reachable cited incident/instance source URLs; method references and technical imagery/sensor/WMS links are reported separately.",
        "",
        "## Needs Evidence Cleanup",
        "",
    ]
    if needs_work:
        for row in needs_work:
            lines.append(
                f"- **{row['acronym']}** — cited {row['reachableCitationUrlCount']}/"
                f"{row['citationUrlCount']} reachable; references {row['reachableReferenceUrlCount']}/"
                f"{row['referenceUrlCount']} reachable; technical {row['reachableTechnicalUrlCount']}/"
                f"{row['technicalUrlCount']} reachable; {'; '.join(row['issues'])}"
            )
    else:
        lines.append("- None.")

    lines.extend(["", "## Renderable Evidence Summary", ""])
    for row in renderable:
        mark = "PASS" if row["goldReady"] else "WARN"
        lines.append(
            f"- `{mark}` **{row['acronym']}** — {row['trust']['label']}; "
            f"cited {row['reachableCitationUrlCount']}/{row['citationUrlCount']} reachable; "
            f"references {row['reachableReferenceUrlCount']}/{row['referenceUrlCount']} reachable; "
            f"technical {row['reachableTechnicalUrlCount']}/{row['technicalUrlCount']} reachable"
        )
    MD_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    OUT_DIR.mkdir(exist_ok=True)
    rows = load_catalog()
    audited = audit_rows(rows)
    JSON_OUT.write_text(
        json.dumps(
            {
                "generated": datetime.now().isoformat(timespec="seconds"),
                "rows": audited,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    write_markdown(audited)
    print(f"Wrote {JSON_OUT}")
    print(f"Wrote {MD_OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
