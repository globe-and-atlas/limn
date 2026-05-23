# Session State — sentinel-explorer

## Last Known State

Spectral index library validated. 2026-03-08 validation run: FBC/HPWI/PWI detection rates documented in `knowledge/procedural/validation-summary.md`. WMS deep-fusion S1+S2 evalscripts blocked for APEX/HPWI — use S2-only proxy. Auth via CDSE OAuth2.

## Current Session

Agent: Antigravity AI
Goal: Update the UI and scientific documentation of Sentinel Explorer to reflect the new GIS-native and legally defensible naming slate (PWCI, ASAI, OBEC, and EHC) while explicitly retaining references to their old names (PWI, PWOI, HPWI, EHC) to maintain trace history.
Status: Completed. Updated `index.html` tooltips and button labels, `src/indices.js` names and info strings, `README.md` intro and index tables, `help.html` scientific descriptions, comparison table, and workflow recommendations, and `knowledge/domain/` documents (spectral-indices.md, known-quirks.md, and spectral-indices-full.md) to integrate the new slates with clear historical 'formerly known as' annotations.

## Validation Contract

- [x] UI buttons and tooltips in `index.html` updated with new slates and parenthetical legacy references.
- [x] `src/indices.js` configurations for `pwoi`, `hpwi`, `pwi`, and `ehc` updated with "formerly known as" references in display names and info blocks.
- [x] User-facing scientific guides (`help.html` and `SENTINEL_SCIENCE_GUIDE.md`) fully updated to integrate final PWCI, ASAI, OBEC, and EHC names alongside explicit parenthetical context mapping back to PWI, PWOI, HPWI, and EHC.
- [x] Repository overview (`README.md`) synchronized to maintain consistency across the index table.
- [x] Developer domain documentation (`spectral-indices.md`, `known-quirks.md`, and `spectral-indices-full.md`) fully aligned with final slates.

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
- 2026-05-22 20:43 — commit: in spaaaaace. | README.md,index.html,knowledge/ERRORS.md,knowledge/INDEX.md,knowledge/SESSION.md
- 2026-05-23 17:35 — checkpoint: restored hover tooltips to entire index-btn tile surface; matched PWOI gradient & PALETTE_APEX to PWI's multi-color heat transition with Electric Purple (#8C00FF) maximum. | src/app.js,src/indices.js
- 2026-05-23 17:50 — checkpoint: implemented final GIS-native and legally defensible naming slate: PWCI (Produced Water Chemical Index), ASAI (Arid Salinity Anomaly Index), OBEC (Oil-Brine Emulsion Composite), and EHC (Evaporite Halo Composite); updated public labels, tooltips, formulas, descriptions, and trend chart labels. | index.html,src/app.js,src/indices.js
- 2026-05-23 23:05 — checkpoint: updated help.html, SENTINEL_SCIENCE_GUIDE.md, index.html, src/indices.js, README.md, known-quirks.md, spectral-indices.md, and spectral-indices-full.md to incorporate final PWCI/ASAI/OBEC/EHC names with explicit historical parentheticals. | help.html,SENTINEL_SCIENCE_GUIDE.md,index.html,src/indices.js,README.md,knowledge/domain/known-quirks.md,knowledge/domain/spectral-indices.md,knowledge/domain/spectral-indices-full.md
- 2026-05-23 23:15 — checkpoint: conducted thorough Google Scholar/OpenAlex remote sensing literature review, confirming absolute novelty of the coined slate names and multi-gate and dry-brine logic; updated help.html, SENTINEL_SCIENCE_GUIDE.md, and README.md to restore ✧ and ✧✧ stars across all 16 custom composites. | help.html,SENTINEL_SCIENCE_GUIDE.md,README.md,projects/sentinel-explorer.md,drafts/i-built-a-satellite-spill-detector-for-the-permian-basin.md

- 2026-05-23 18:22 — commit: feat: restore novelty & attribution stars, slate renames, and G&A branding updates | .gitignore,README.md,SENTINEL_SCIENCE_GUIDE.md,help.html,index.html
- 2026-05-23 18:23 — commit: docs: update SESSION.md checkpoint | knowledge/SESSION.md
- 2026-05-23 18:30 — checkpoint: resolved dynamic old name leaks (PWI/HPWI/PWOI) in charts.js tooltips and gallery badges; updated style.css to map .idx-apex styles to .idx-pwoi to restore premium CSS styles; fixed report.js metadata bug mapping cfg.math to cfg.formula; updated and expanded SPILL_BOOKMARKS in app.js with 9 high-precision exact GPS coordinate calibration targets including Lake Boehmer and Balmorhea. | src/app.js,src/indices.js,src/charts.js,src/report.js,style.css

- 2026-05-23 18:27 — commit: feat: fix dynamic slate renames, restore ASAI style, and add high-precision bookmarks | knowledge/SESSION.md,src/app.js,src/charts.js,src/indices.js,src/report.js
- 2026-05-23 18:32 — checkpoint: forced Single Date mode activation when spill bookmarks are clicked, ensuring imagery dates sync accurately and prevent blank/incorrect compare-view renders. | src/app.js,knowledge/SESSION.md

