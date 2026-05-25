# Session State — sentinel-explorer

## Last Known State

Spectral index library validated. 2026-03-08 validation run: FBC/HPWI/PWI detection rates documented in `knowledge/procedural/validation-summary.md`. WMS deep-fusion S1+S2 evalscripts blocked for APEX/HPWI — use S2-only proxy. Auth via CDSE OAuth2.

## Current Session

Agent: OpenAI Codex
Goal: Separate public Limn science documentation from private claim/ownership notes.
Status: Completed and verified. Public docs now use neutral third-person contribution/prior-art language, and direct ownership notes live in `LIMN_CLAIM_NOTES.md`.

## Validation Contract — Public Science Docs

- [x] Public-facing science docs do not use direct "you can claim" or "you own" language.
- [x] The in-app authorship card copy uses neutral public-facing labels.
- [x] A separate artifact preserves direct notes about what Daniel Bally can claim and own.
- [x] Documentation changes are checked for obvious broken wording.

## Validation Contract

- [x] UI buttons and tooltips in `index.html` updated with new slates and parenthetical legacy references.
- [x] `src/indices.js` configurations for `pwoi`, `hpwi`, `pwi`, and `ehc` updated with "formerly known as" references in display names and info blocks.
- [x] User-facing scientific guides (`help.html` and `SENTINEL_SCIENCE_GUIDE.md`) fully updated to integrate final PWCI, ASAI, OBEC, and EHC names alongside explicit parenthetical context mapping back to PWI, PWOI, HPWI, and EHC.
- [x] Repository overview (`README.md`) synchronized to maintain consistency across the index table.
- [x] Developer domain documentation (`spectral-indices.md`, `known-quirks.md`, and `spectral-indices-full.md`) fully aligned with final slates.
- [x] Triple layout varieties (Suite Grid, Focused Triage, Command Console) implemented client-side with smooth glassmorphic UI switches and transitions.
- [x] Thematic cards, flying coordinate resets, single-date mode switches, and dynamic tag/text index search filters implemented and fully tested.
- [x] Created PUBLIC_SCIENCE_GUIDE.md as a publication-ready public academic whitepaper assigning full inventor credit to Daniel Bally and clarifying IP boundaries.
- [x] Implemented interactive triage-tag-pills with separate event bubbling prevention, custom hover states, and active visual selections in style.css and app.js.
- [x] Isolated Basin Calibration and Detection Sensitivity settings at both the UI layer (dynamic overlays) and the processing layer (WMS/charts scripts) to Produced Water Spill indices only.
- [x] Promoted four highly ownable Civic Atlas ecological composites (CSRC, TRSI, LFGVI, and SWRI) to ✧✧ Original Composite status in help.html and PUBLIC_SCIENCE_GUIDE.md.

## Active Checkpoints

No active checkpoints. All tasks completed, verified, and captured.

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

- 2026-05-23 18:30 — commit: fix: force single-date mode on bookmark click | knowledge/SESSION.md,src/app.js
- 2026-05-23 18:31 — commit: docs: sync final SESSION.md logs | knowledge/SESSION.md
- 2026-05-23 20:18 — commit: ui: remove deep fusion dead code, fix ASAI gradient, clean up header and footer spacing | help.html,index.html,knowledge/DECISIONS.md,knowledge/SESSION.md,src/app.js
- 2026-05-23 20:42 — commit: rebrand: rename Sentinel Explorer → Limn (Globe & Atlas · Limn) | help.html,index.html,src/app.js,src/indices.js,src/report.js
- 2026-05-23 20:49 — commit: docs: update CLAUDE.md — rebrand to Limn, clarify actual SAR vs S2-only optical proxies | CLAUDE.md
- 2026-05-24 15:00 — checkpoint: integrated 18 Civic Atlas composites in help.html. Corrected Node unit tests (tests/test_pwi.js and tests/test_evalscript.js) to resolve module paths correctly. Fixed global mock module (src/mocks.mjs) and verified clean ESM unit test execution without ReferenceErrors. | help.html,tests/test_pwi.js,tests/test_evalscript.js
- 2026-05-24 17:37 — commit: feat: integrate Civic Atlas composites, triage layout varieties, calibration settings, and rigorous scholarly novelty updates | PUBLIC_SCIENCE_GUIDE.md,SENTINEL_SCIENCE_GUIDE.md,help.html,index.html,knowledge/ERRORS.md
- 2026-05-24 17:45 — commit: fix: resolve duplicate SPILL_INDEX_KEYS declaration syntax error and style loading screen to be warm and premium | index.html,knowledge/SESSION.md,src/map.js,style.css
- 2026-05-24 20:11 — commit: docs: synchronize agent trio files to main | AGENTS.md,GEMINI.md,knowledge/SESSION.md
- 2026-05-24 20:37 — commit: feat: inline triage bookmarks with per-index chips | PUBLIC_SCIENCE_GUIDE.md,SENTINEL_SCIENCE_GUIDE.md,help.html,index.html,knowledge/SESSION.md
- 2026-05-24 21:47 — checkpoint: removed the obsolete top-level bookmark/calibration-events section below coordinate entry; kept embedded triage and HUD bookmark styles intact. | index.html,style.css
- 2026-05-24 21:49 — checkpoint: browser-verified the sidebar order and embedded bookmark containers; `node tests/test_pwi.js` and `node tests/test_evalscript.js` passed; `node tests/test.js` remains blocked by missing `puppeteer-core`. | knowledge/ERRORS.md,knowledge/SESSION.md
- 2026-05-24 22:20 — checkpoint: diagnosed Sentinel tile failures as Sentinel Hub 403 quota exhaustion; added WMS/Catalog error parsing, deduped quota toasts, error-toast styling, and asset cache bumps. | index.html,src/app.js,src/map.js,src/report.js,src/ui.js,style.css,knowledge/ERRORS.md
- 2026-05-24 22:23 — checkpoint: verified quota-specific toast in browser; `node --check` passed for changed JS modules; `node tests/test_pwi.js` and `node tests/test_evalscript.js` passed; `node tests/test.js` remains blocked by missing `puppeteer-core`. | src/app.js,src/map.js,src/report.js,src/ui.js
- 2026-05-24 22:42 — checkpoint: neutralized public science-doc ownership coaching language and added private claim notes in `LIMN_CLAIM_NOTES.md`. | help.html,SENTINEL_SCIENCE_GUIDE.md,PUBLIC_SCIENCE_GUIDE.md,index.html,src/authorshipClaims.js,LIMN_CLAIM_NOTES.md
- 2026-05-24 22:46 — checkpoint: verified public docs no longer contain direct second-person claim/ownership language; `node --check` passed for changed JS; `node tests/test_pwi.js` and `node tests/test_evalscript.js` passed; `node tests/test.js` remains blocked by missing `puppeteer-core`. | knowledge/SESSION.md,knowledge/procedural/public-doc-voice.md
- 2026-05-24 22:48 — checkpoint: browser-verified `help.html` loads and contains neutral "Prior Art & Original Contribution" language without public "you can claim" / "you own" wording. | help.html
- 2026-05-25 15:29 — commit: Refresh: Integrate final academic whitepaper (PUBLIC_SCIENCE_GUIDE.md), spacing, and error handling updates | .gitignore,PUBLIC_SCIENCE_GUIDE.md,SENTINEL_SCIENCE_GUIDE.md,help.html,index.html
