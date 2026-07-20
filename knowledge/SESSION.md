# Session State — sentinel-explorer

## Last Known State

**Date:** 2026-06-25
**Active projects this session:** limn
**Agent:** Antigravity AI
**Handoff-from:** OpenAI Codex
**Handoff-type:** pickup
**Goal:** Relocate index title, coordinates, and band math to map legend and remove the top-left capture overlay.
**Status:** Completed. Removed the top-left capture info box and its trigger button entirely. Added new legend-name, legend-location, legend-coords, legend-formula, and legend-bands elements inside the map legend in atlas.html and dynamically populated them in src/atlas-app.js. The coordinates display on their own line below the place name, and the index formula and active bands are styled inside the legend box in capture mode. Widened the legend container width to max-width 380px in capture mode.

## Active Checkpoints

### 2026-07-19 - Preprint QC audit (Claude Code CLI / Fable 5)
- Full QC of PUBLIC_SCIENCE_GUIDE.md (May 2026 preprint) vs code at publication commit, current code, validation pipeline, and June verified-site QC
- Output: reports/preprint_qc_2026-07-19.md
- Critical findings: rrc_spills.json ("27 TRRC sites") untraceable to real RRC filings; 42.3%/0.04% FP numbers have no supporting artifact; published PWCI formula is a pipeline/viewer chimera never benchmarked; shipped Permian preset produces 0% detection per help.html and PWCI is blank at all real verified sites; ASAI dry-brine mode absent from viewer at publication; §5 eco formulas match no code version
- Earlier in session: committed June 25 atlas work, pushed to globe-and-atlas/limn (canonical), fixed uuid CVE-2026-41907 via npm override

## Checkpoint Log

- 2026-07-19 22:21 — commit: feat: relocate capture info into map legend, fix swipe/mirror clipping | atlas.html,knowledge/ERRORS.md,knowledge/INDEX.md,knowledge/REFLECTIONS.jsonl,knowledge/SESSION.md
- 2026-07-19 22:23 — commit: docs: record globe-and-atlas/limn as canonical remote | knowledge/DECISIONS.md
- 2026-07-19 22:25 — commit: fix: override transitive uuid to 11.1.1 (CVE-2026-41907) | knowledge/domain/deps.md,package-lock.json,package.json
