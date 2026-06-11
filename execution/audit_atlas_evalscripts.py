#!/usr/bin/env python3
"""Deterministic correctness audit for Limn Atlas evalscripts.

Read-only. Does NOT modify src/atlas-indices.js. Complements Codex's
pixel-signal QC (qc_atlas_bookmarks.py) by catching a class of silent
bug the pixel QC cannot: an evalscript that references a Sentinel-2 band
via `sample.Bxx` that it never declared in `setup()` input. Such a band
evaluates to 0 in the Sentinel Hub engine, silently corrupting the math
and any downstream QC verdict.

Checks per renderable index:
  1. Every `sample.Bxx` referenced is declared in the setup() input list.
  2. dataMask is declared (transparency gate).
  3. output.bands === 4.

Outputs:
  .tmp/atlas_evalscript_audit.json
  .tmp/atlas_evalscript_audit.md

Usage:
  python3 execution/audit_atlas_evalscripts.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDICES_FILE = ROOT / "src" / "atlas-indices.js"
TMP_DIR = ROOT / ".tmp"

# Sentinel-2 band tokens we care about (incl. B8A). Excludes generic words.
BAND_TOKEN = re.compile(r"\bB(?:0[1-9]|1[0-2]|8A)\b")


def extract_node_payload() -> list[dict]:
    """Use Node to import the ES module and emit a JSON payload of the
    fields we need. This avoids brittle hand-parsing of the JS source."""
    import subprocess

    script = r"""
import { ATLAS_INDICES } from './src/atlas-indices.js';
const out = ATLAS_INDICES.map(i => ({
  key: i.key,
  acronym: i.acronym,
  canRender: !!i.canRender,
  evalscript: typeof i.evalscript === 'string' ? i.evalscript : null,
}));
process.stdout.write(JSON.stringify(out));
"""
    result = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        raise SystemExit(f"Node failed to load ATLAS_INDICES (exit {result.returncode})")
    return json.loads(result.stdout)


def declared_bands(evalscript: str) -> set[str]:
    """Bands declared in the setup() input array."""
    m = re.search(r"input\s*:\s*\[(.*?)\]", evalscript, re.DOTALL)
    if not m:
        return set()
    return set(BAND_TOKEN.findall(m.group(1)))


def referenced_bands(evalscript: str) -> set[str]:
    """Bands referenced as sample.Bxx in the body."""
    refs = re.findall(r"sample\.(B(?:0[1-9]|1[0-2]|8A))\b", evalscript)
    return set(refs)


def output_band_count(evalscript: str) -> int | None:
    m = re.search(r"output\s*:\s*\{[^}]*bands\s*:\s*(\d+)", evalscript)
    return int(m.group(1)) if m else None


def main() -> int:
    indices = extract_node_payload()
    renderables = [i for i in indices if i["canRender"] and i["evalscript"]]

    findings: list[dict] = []
    for idx in renderables:
        es = idx["evalscript"]
        declared = declared_bands(es)
        referenced = referenced_bands(es)
        undeclared = sorted(referenced - declared)
        has_datamask = "dataMask" in es
        bands_out = output_band_count(es)

        problems = []
        if undeclared:
            problems.append(f"references undeclared band(s): {', '.join(undeclared)}")
        if not has_datamask:
            problems.append("setup() does not declare dataMask")
        if bands_out != 4:
            problems.append(f"output.bands is {bands_out}, expected 4")

        if problems:
            findings.append({
                "key": idx["key"],
                "acronym": idx["acronym"],
                "declared": sorted(declared),
                "referenced": sorted(referenced),
                "undeclared": undeclared,
                "has_datamask": has_datamask,
                "output_bands": bands_out,
                "problems": problems,
            })

    TMP_DIR.mkdir(exist_ok=True)
    (TMP_DIR / "atlas_evalscript_audit.json").write_text(
        json.dumps({
            "total_renderable": len(renderables),
            "flagged": len(findings),
            "findings": findings,
        }, indent=2)
    )

    lines = [
        "# Atlas Evalscript Correctness Audit",
        "",
        f"Renderable indices audited: **{len(renderables)}**",
        f"Flagged: **{len(findings)}**",
        "",
    ]
    if findings:
        lines += ["| Key | Acronym | Problem |", "|---|---|---|"]
        for f in findings:
            lines.append(f"| `{f['key']}` | {f['acronym']} | {'; '.join(f['problems'])} |")
    else:
        lines.append("✅ No band-declaration or output-shape problems found.")
    lines.append("")
    (TMP_DIR / "atlas_evalscript_audit.md").write_text("\n".join(lines))

    print(f"Audited {len(renderables)} renderable evalscripts; flagged {len(findings)}.")
    for f in findings:
        print(f"  {f['acronym']:10s} ({f['key']}): {'; '.join(f['problems'])}")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
