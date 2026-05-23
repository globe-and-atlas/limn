# Session State — sentinel-explorer

## Last Known State

Spectral index library validated. 2026-03-08 validation run: FBC/HPWI/PWI detection rates documented in `knowledge/procedural/validation-summary.md`. WMS deep-fusion S1+S2 evalscripts blocked for APEX/HPWI — use S2-only proxy. Auth via CDSE OAuth2.

## Current Session

Agent: OpenAI Codex
Goal: Review `help.html` and index documentation for novelty/authorship claims, then remove Daniel Bally/original-work attribution from any index acronym, name, or formula with prior public use or citation.
Status: Documentation edits complete; local help page verified in browser; Node tests attempted but blocked by pre-existing harness dependency/path issues logged in `knowledge/ERRORS.md`.

## Validation Contract

- [x] Every index marked with `✧`, `Original composite`, `novel`, or Bally authorship is enumerated by acronym and display name.
- [x] Every enumerated acronym is checked against public prior usage.
- [x] Every enumerated display name is checked against public prior usage.
- [x] Every enumerated formula is checked against local citations or public prior usage when formula text is available.
- [x] Any index with public prior usage loses exclusive Bally/original-work wording.
- [x] Any remaining Bally/original-work wording is limited to composites without identified public prior usage in acronym, display name, or formula.
- [x] `http://localhost:4180/help.html` is reviewed after edits.
- [x] The project test command runs before completion. Attempted; blocked by missing/stale test harness dependencies logged in `knowledge/ERRORS.md`.

## Active Checkpoints

### 2026-03-28 — Karpathy loop iteration 1 complete
- Added: execution/optimize_thresholds.py, execution/sweep_dates.py (new)
- Fixed: execution/evaluate_validation.py (full rewrite, all indices)
- Fixed: execution/batch_analyze_spills.py — APEX/HPWI dry brine mode; --spills/--output/--force args; bsi/ndsi/ndvi moved to shared intermediates
- Added: data/verified_spills.json — 8 sourced spill sites with GPS coordinates
- Added: .claude/agents/calibration-agent.md
- Root cause found: APEX/HPWI zeroed for dry Permian Basin bare soil (NDWI -0.4 kills norm_smooth)
- Fix: dry brine mode — NDWI<-0.30 + NDSI>0.05 + BSI>0.10 triggers NDSI×BSI product formula
- Results: APEX 29.6%→77.8%, HPWI 14.8%→66.7%, composite 38.1%→55.2%
- Apache-Balmorhea: still 0 — date is July 2020, NDSI 0.029 too low; needs sweep_dates on 2021+ imagery
- Next: run sweep_dates.py on verified_spills.json; add control sites to measure false positive rate on non-spill caliche

## Checkpoint Log

- 2026-05-17 09:31 — commit: feat: initialize project documentation and scientific reference guide for Sentinel Explorer | README.md,SENTINEL_SCIENCE_GUIDE.md,directives/pwi_spec.md,directives/spill_validation_sop.md,project.profile.json
- 2026-05-20 22:33 — commit: docs: credit Bally as originator of APEX and all novel composite indices | README.md,SENTINEL_SCIENCE_GUIDE.md,src/indices.js
- 2026-05-20 22:37 — commit: ui: remove preset location buttons; rename APEX to APEX Anomaly Index | SENTINEL_SCIENCE_GUIDE.md,index.html,src/indices.js
- 2026-05-20 22:47 — commit: feat: rename APEX → PWOI (Produced Water Optical Index) across all files; add ✧ to EHC/AOI/FBC; update novelty legend to credit Bally | SENTINEL_SCIENCE_GUIDE.md,help.html,index.html,src/app.js,src/indices.js
- 2026-05-20 22:53 — started novelty/authorship review for `help.html`, `SENTINEL_SCIENCE_GUIDE.md`, and `src/indices.js`; validation contract added above.
- 2026-05-20 23:10 — removed public-facing novelty/authorship markers; added `knowledge/domain/novelty-review.md`; verified `help.html` has zero `✧`, no `Bally Index`, and no `Original composite by Daniel Bally` in browser.
- 2026-05-20 23:13 — attempted `node tests/test.js`, `node tests/test_fetch.js`, and `node tests/test_pwi.js`; all blocked by pre-existing harness dependency/path issues now logged in `knowledge/ERRORS.md`.
- 2026-05-21 09:10 — commit: Restore accurate authorship attribution for custom composite indices | SENTINEL_SCIENCE_GUIDE.md,help.html
