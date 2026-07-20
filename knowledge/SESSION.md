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
- 2026-07-19 22:59 — commit: docs: add preprint QC audit report (formulas, validation claims, proof sites) | knowledge/SESSION.md,reports/preprint_qc_2026-07-19.md
- 2026-07-19 23:10 — commit: docs: correct preprint formulas, calibration claims, and validation numbers | PUBLIC_SCIENCE_GUIDE.md,README.md,SENTINEL_SCIENCE_GUIDE.md,help.html,knowledge/DECISIONS.md
- 2026-07-20 06:31 — commit: feat: add background/false-positive sampling for produced-water composites | execution/batch_analyze_spills.py,execution/sample_background.py,execution/summarize_false_positives.py,knowledge/ERRORS.md
- 2026-07-20 06:55 — commit: feat: run background false-positive study; correct §7 with measured FP floor | PUBLIC_SCIENCE_GUIDE.md,execution/background_raw.csv,execution/false_positive_summary.md,execution/summarize_false_positives.py,knowledge/DECISIONS.md

### 2026-07-19/20 - False-positive study (Claude Code CLI / Fable 5)
- Tagged whitepaper preprint-v1.1; fixed all doc-fidelity findings (formulas, calibration split, removed fabricated FP numbers, README/help.html/indices.js)
- Fixed NameError (missing pathlib.Path import) in execution/batch_analyze_spills.py — validation pipeline was non-runnable
- Built + ran execution/sample_background.py (150 Permian background points, seed 42) + summarize_false_positives.py
- KEY RESULT: pipeline-calibration FP floor is catastrophic — PWCI 96.7%, ASAI/OBEC 71.3% at t=0.01 (median PWCI background score = 1.000). Refutes removed "0.04% FP" claim; high-recall pipeline calibration does not discriminate.
- Diagnosed + fixed a token-expiry bug mid-run (upfront-only CDSE token 401s after ~10 min → near-total no-data); added periodic refresh
- OPEN top-priority follow-up: measure shipped VIEWER calibration FP (stricter τ) against same 150 points — needs raw bands persisted
- OPEN author decision: how to position 96.7% pipeline FP in public whitepaper §7
- All work committed + pushed to globe-and-atlas/limn (canonical): 26cc32d, b7ba495, 575c21d, 2c92413 + tag preprint-v1.1
- 2026-07-20 06:55 — commit: docs: session checkpoint — false-positive study | knowledge/SESSION.md
- 2026-07-20 09:17 — commit: feat: measure viewer-calibration FP; neither calibration discriminates | PUBLIC_SCIENCE_GUIDE.md,execution/background_raw.csv,execution/sample_background.py,execution/score_viewer_calibration.py,execution/viewer_false_positive_summary.md

### 2026-07-20 - Viewer-calibration FP measured (Claude Code CLI / Fable 5)
- Persisted raw bands, re-fetched 150 background pts, ported shipped viewer evalscripts (score_viewer_calibration.py)
- RESULT: viewer FP = 0.0% all 3 flagships (max rendered PWCI = 0.00000) BUT viewer blank at all 11 verified spill sites → neither shipped calibration discriminates (pipeline fires everywhere, viewer nowhere)
- Repositioned whitepaper as experimental screening methodology, not validated detector (abstract/§7/§8)
- Open R&D: calibration search for useful-recall + low-FP; non-flagship indices (LBI 1.3%/VSI 6.0%/BPI 7.3% FP) do discriminate
- Author positioning decision surfaced (QC report): (a) honest WIP paper, (b) hold until discriminating calib, (c) reframe around what works
- Commits: 33db25e (+ earlier 26cc32d,b7ba495,575c21d,2c92413,5e38158), tag preprint-v1.1 — all pushed to globe-and-atlas/limn
- 2026-07-20 09:17 — commit: docs: session checkpoint — viewer-calibration FP | knowledge/SESSION.md
- 2026-07-20 14:10 — commit: feat: threshold sweep proves no discriminating calibration exists | PUBLIC_SCIENCE_GUIDE.md,execution/false_positive_summary.md,execution/fetch_spill_bands.py,execution/spill_bands.csv,execution/summarize_false_positives.py

### 2026-07-20 - Threshold sweep: no discriminating calibration exists (Claude Code CLI / Fable 5)
- Fetched raw bands for all 32 TRRC records (fetch_spill_bands.py); swept PWCI 3 gates (1224 combos) + per-index ROC frontier at FIXED thresholds vs 150 bg
- VERDICT: no config discriminates. PWCI ~19% recall/9% FP, J~0.00 (81.5% was firing on 97% bg). Best any composite = ASAI ~53%/30%. S2 bands @500m single-scene don't separate produced water from caliche at ANY threshold. Bounded negative result.
- CORRECTED my earlier error: "LBI 63%/1.3% FP" mixed thresholds (recall@0.01 where FP=86%, FP@0.08 where recall=9%); at fixed thresholds LBI ~22%/20%. Withdrew option (c).
- Recommendation to author: (a) honest earned negative-result/methodology paper, scoped to S2/500m/single-scene
- Commit 7ec3981 (+ session earlier: preprint-v1.1 tag, 26cc32d,b7ba495,575c21d,2c92413,5e38158,33db25e,22b2fae) — all pushed to globe-and-atlas/limn
- 2026-07-20 14:10 — commit: docs: session checkpoint — threshold sweep verdict | knowledge/SESSION.md
- 2026-07-20 14:31 — commit: docs: reposition whitepaper as methodology/negative-result paper (v2.0) | PUBLIC_SCIENCE_GUIDE.md,reports/preprint_qc_2026-07-19.md

### 2026-07-20 - Path (a) executed: whitepaper reframed as negative-result paper (Claude Code CLI / Fable 5)
- Retitled/re-abstracted PUBLIC_SCIENCE_GUIDE as methodology+negative-result paper (v2.0); added Contributions/Scope/Limitations front matter; tagged preprint-v2.0
- §7 adds LBI narrow-positive: LBI specific (0% caliche bg >0.3, mean 0.034) → plausible STANDING-brine detector (different target), pending targeted validation; NOT a general PW detector
- Index legitimacy verdict: real advances = multi-gate methodology + verified-site program + the negative result; LBI narrowly (standing brine); component ratios legit but not novel (prior art); PWCI/ASAI/OBEC don't discriminate
- Commit 7dabd18 + tag preprint-v2.0, pushed to globe-and-atlas/limn
