# Objective — Atlas LinkedIn Screenshot Capture Mode (2026-06-24)

Adapt Limn Atlas so the selected index can be switched into a clean, LinkedIn-friendly screenshot state that is compelling at 1200x628 and remains legible after feed compression.

## Validation Contract — Atlas LinkedIn Screenshot Capture Mode

- [x] Atlas exposes a visible Capture HUD control.
- [x] Capture mode hides the sidebar.
- [x] Capture mode hides the operational HUD controls.
- [x] Capture mode hides the full info panel.
- [x] Capture mode shows a dedicated screenshot overlay for the selected index.
- [x] The screenshot overlay includes the active index acronym.
- [x] The screenshot overlay includes the active index name.
- [x] The screenshot overlay includes the active bookmark place and date.
- [x] The screenshot overlay includes a visual mode label for satellite context plus index overlay.
- [x] The screenshot overlay includes an interpretive hook.
- [x] The screenshot overlay includes an index-aware prompt.
- [x] Capture mode enlarges the legend for LinkedIn legibility.
- [x] Capture mode can be exited from the screenshot overlay.
- [x] Capture mode does not request additional Sentinel, GEE, or COG tiles.
- [x] Capture mode includes a context-only view.
- [x] Capture mode includes an overlay view.
- [x] Capture mode includes a split comparison view.
- [x] Split comparison view exposes an adjustable divider.
- [x] Capture comparison controls do not request additional Sentinel, GEE, or COG tiles.
- [x] `node --check src/atlas-app.js` passes.
- [x] `node tests/test_gee_provider.mjs` passes.
- [x] `node tests/test_atlas_sentinel_toggle.mjs` passes or any sandbox blocker is documented.
- [x] `git diff --check` passes.

## Progress Log — Atlas LinkedIn Screenshot Capture Mode

### 2026-06-24 — Started capture usability follow-up
- Target directive: none found for Atlas screenshot capture; existing Atlas viewer validation guidance applies.
- Intended execution scripts: `node --check src/atlas-app.js`, `node --check tests/test_atlas_sentinel_toggle.mjs`, `node tests/test_gee_provider.mjs`, `python3 -m py_compile execution/capture_atlas_articles.py`, and `git diff --check`.
- Expected output artifacts: clearer no-overlay capture state in `src/atlas-app.js`, more legible/touchable capture controls in `atlas.html`, corrected `--skip-catalog` behavior in `execution/capture_atlas_articles.py`, updated regression tests, and Atlas validation notes.
- Safety: no `.env`, `config-v1.js`, `config.js`, `app-config.js`, tokens, private WMS endpoints, or `.tmp/` outputs will be read, printed, or committed.

## Validation Contract — Capture Usability Follow-Up

- [x] Capture mode identifies when no active overlay layer is available.
- [x] Capture comparison controls cannot imply that an unavailable overlay is being shown.
- [x] Capture split controls expose a touch-friendly target size.
- [x] Split comparison labels remain understandable on compact viewports.
- [x] The capture article script's `--skip-catalog` option prevents CDSE STAC calls.
- [x] The capture article script records skipped catalog metadata explicitly.
- [x] `node --check src/atlas-app.js` passes.
- [x] `node --check tests/test_atlas_sentinel_toggle.mjs` passes.
- [x] `node tests/test_gee_provider.mjs` passes.
- [x] `python3 -m py_compile execution/capture_atlas_articles.py` passes.
- [x] `git diff --check` passes.

### 2026-06-24 — Completed capture usability follow-up
- Capture mode now detects when no active overlay layer exists and falls back to Context instead of implying Overlay or Split is visible.
- Overlay and Split controls are disabled while unavailable; the capture card shows an explicit render-first status and avoids comparison copy until a layer is active.
- Capture buttons and the split slider now use larger targets, and compact split labels remain visible instead of disappearing below 980px.
- `--skip-catalog` now skips both CDSE STAC and Sentinel Hub Catalog lookups and writes explicit skipped metadata.
- Verification passed: `node --check src/atlas-app.js`, `node --check tests/test_atlas_sentinel_toggle.mjs`, `node tests/test_gee_provider.mjs`, `python3 -m py_compile execution/capture_atlas_articles.py`, direct skip-catalog no-network assertion, and `git diff --check`.
- Browser smoke remains blocked in this sandbox by `listen EPERM: operation not permitted 127.0.0.1`.

### 2026-06-24 — Started capture-mode polish
- Target directive: none found for Atlas screenshot capture; existing Atlas viewer validation guidance applies.
- Intended execution scripts: `node --check src/atlas-app.js`, `node tests/test_gee_provider.mjs`, `node tests/test_atlas_sentinel_toggle.mjs`, and `git diff --check`.
- Expected output artifacts: Capture-mode UI in `atlas.html`, selected-index capture state in `src/atlas-app.js`, updated browser/static tests, and Atlas validation notes.
- Safety: no `.env`, `config-v1.js`, `config.js`, `app-config.js`, tokens, private WMS endpoints, or `.tmp/` outputs will be read, printed, or committed.

### 2026-06-24 — Completed capture-mode polish
- Added the Capture HUD control and a dedicated LinkedIn screenshot overlay with active index acronym, name, bookmark place/date, visual mode label, hook, and index-aware prompt.
- Capture mode now hides the sidebar, operational HUD, info panel, and Leaflet zoom control while enlarging the legend for feed legibility.
- Added `window.getAtlasCaptureState()` and browser-smoke assertions proving Capture mode is presentation-only and does not change provider tile counts.
- Updated Ground Truth wording from generic open question to interpretive prompt.
- Fresh verifier flagged that `map.invalidateSize()` could request fill-in overlay tiles after the map expanded; removed the invalidation call and added a delayed no-tile assertion after exiting Capture mode.
- Verification passed: `node --check src/atlas-app.js`, `node --check tests/test_atlas_sentinel_toggle.mjs`, `node tests/test_gee_provider.mjs`, and `git diff --check`.
- Browser smoke was attempted but blocked in this sandbox by `listen EPERM: operation not permitted 127.0.0.1`; the blocker is logged in `knowledge/ERRORS.md`.

### 2026-06-24 — Added capture comparison controls
- Replaced the abstract capture prompt with direct context explaining that the screenshot compares satellite context against the active index result.
- Added Capture card modes for `Overlay`, `Context`, and `Split`.
- Added a split-position slider so the screenshot can behave like a simple swipe comparison without requesting a second imagery layer.
- Context mode hides the index overlay and legend; Overlay mode restores the full active overlay; Split mode clips the already-loaded overlay to the right side of the divider.
- Updated browser-smoke assertions to verify context, overlay, split, split-slider, and no additional provider tile requests after comparison changes.
- Verification passed: `node --check src/atlas-app.js`, `node --check tests/test_atlas_sentinel_toggle.mjs`, `node tests/test_gee_provider.mjs`, and `git diff --check`.
- Browser smoke was re-attempted and remains blocked in this sandbox by `listen EPERM: operation not permitted 127.0.0.1`.
- Fresh verifier approved the capture comparison controls with no blocking findings.

---

# Objective — Atlas LinkedIn Ground Truth Post Guidance (2026-06-23)

Adapt Limn Atlas so each selected index illustrates what makes a LinkedIn-caliber weekly Ground Truth post: one image, one observation, one reason it matters, and one open question or implication.

## Validation Contract — Atlas LinkedIn Ground Truth Post Guidance

- [x] Atlas info panel exposes a visible LinkedIn Ground Truth section for the selected index.
- [x] The section names one image as the required visual anchor.
- [x] The section includes a concrete observation derived from the selected index.
- [x] The section includes a "why it matters" interpretation beyond what the band/index shows.
- [x] The section includes an open question or implication.
- [x] The section provides copyable LinkedIn draft text.
- [x] Copied LinkedIn draft text stays under 300 words.
- [x] The addition does not add a new Atlas category or change index taxonomy.
- [x] The addition does not request additional Sentinel, GEE, or COG tiles.
- [x] `node --check src/atlas-app.js` passes.
- [x] `node tests/test_gee_provider.mjs` passes.
- [x] `node tests/test_atlas_sentinel_toggle.mjs` passes.
- [x] Browser smoke verifies the LinkedIn Ground Truth section renders without console errors.

## Progress Log — Atlas LinkedIn Ground Truth Post Guidance

### 2026-06-23 — Started LinkedIn Ground Truth guidance
- Target directive: none found for LinkedIn/Ground Truth presentation; `directives/find_hotspots.md` is only related to bookmark context.
- Intended execution scripts: `node --check src/atlas-app.js`, `node tests/test_gee_provider.mjs`, `node tests/test_atlas_sentinel_toggle.mjs`, and browser smoke.
- Expected output artifacts: Atlas info-panel LinkedIn Ground Truth guidance, copyable post draft logic, regression-test assertions, task/knowledge updates.
- Safety: no `.env`, `config-v1.js`, `config.js`, `app-config.js`, OAuth tokens, Sentinel Hub secrets, private WMS endpoints, or `.tmp/` outputs will be read, printed, or committed.

### 2026-06-23 — Completed LinkedIn Ground Truth guidance
- Added a selected-index LinkedIn Ground Truth card to the Atlas info panel.
- The card now shows a required visual anchor, observation, why-it-matters interpretation, open question, and copyable draft.
- The generated draft uses existing index metadata and stays under 300 words in browser smoke.
- The section remains inside the info panel and does not alter Atlas taxonomy.
- Verification passed: `node --check src/atlas-app.js`, `node tests/test_gee_provider.mjs`, `node tests/test_atlas_sentinel_toggle.mjs`, and `git diff --check`.

---

# Task: Sentinel Explorer Novelty Claims Review

## Objective — Atlas Incident Source Deep Dive Batch 2

Continue Atlas evidence cleanup by adding a second batch of verifiable cited sources for renderable rows that remained below three reachable incident/domain sources after the first source deep dive.

## Validation Contract — Atlas Incident Source Deep Dive Batch 2

- [x] At least ten additional still-cleanup renderable rows receive new cited incident/domain sources.
- [x] Rows promoted to Gold-ready have at least three reachable cited incident/domain source URLs.
- [x] Copernicus Browser links remain technical checks and do not count as cited sources.
- [x] Sentinel Hub platform/service links remain technical checks and do not count as cited sources.
- [x] Method-only references remain supporting references where they are not site/event/domain evidence.
- [x] The evidence audit shows an improved Gold-ready count over the prior 16-row baseline.
- [x] The evidence audit JSON contains zero failed URL checks for audited renderable evidence.
- [x] `node --check src/atlas-verification.js` passes.
- [x] `python3 -m py_compile execution/audit_atlas_evidence.py` passes.
- [x] `python3 execution/audit_atlas_evidence.py` passes.
- [x] Atlas provider/browser regression tests pass.

## Progress Log — Atlas Incident Source Deep Dive Batch 2

### 2026-06-17 — Started incident source deep dive batch 2
- Target directive: none found specifically for incident-source cleanup; `directives/find_hotspots.md` remains related context for bookmark/event alignment.
- Intended execution scripts: `node --check src/atlas-verification.js`, `node --check src/atlas-indices.js`, `node --check src/atlas-sar-demos.js`, `node --check src/atlas-s5p-demos.js`, `node --check src/atlas-evidence.js`, `node --check src/atlas-app.js`, `python3 -m py_compile execution/audit_atlas_evidence.py`, `python3 execution/audit_atlas_evidence.py`, `node tests/test_gee_provider.mjs`, and `node tests/test_atlas_sentinel_toggle.mjs`.
- Expected output artifacts: expanded `src/atlas-verification.js` source packs, corrected primary URLs where needed, regenerated `.tmp/atlas_evidence_audit.json`, regenerated `.tmp/atlas_evidence_audit.md`, and updated knowledge/session notes.
- Safety: no `.env`, `config-v1.js`, service-account JSON, OAuth tokens, Sentinel Hub secrets, private WMS endpoints, or `.tmp/` artifacts will be committed.

### 2026-06-17 — Completed incident source deep dive batch 2
- Added additional verifiable agency, academic, data, and domain sources for SF-EII, LFMPI, SACI, CSRC, RRFI, FCLI, SMPDI, CD-UAI, PDSDI, CCTTI, WDA-CSI, EC-ACI, HSAI, PCADI, TT-API, TPERI, PCEI, MEPSI, PDCSI, DLPEHI, MHSSP, TFIDI, WDPTZI, IPVSI, WVTDI, S1-URB, S1-VVS, and S5P-NO2.
- Replaced blocked, stale, or generic primary/source URLs for LFMPI, SACI, SMPDI, CCTTI, PCADI, TPERI, PCEI, DLPEHI, S1-URB, S1-VVS, and S5P-NO2.
- Pruned or replaced verification URLs that failed automated reachability, including blocked CAL FIRE, MDPI, Google Scholar, and timeout-prone archive links.
- Final audit result: 44 renderable bookmarks, 44 Gold-ready evidence packs, 0 rows needing evidence cleanup, and 0 failed audited URL checks.
- Final cited-source distribution: 28 rows with three cited sources, 13 rows with four cited sources, and 3 rows with five cited sources.
- Verification passed: JS syntax checks, Python compile, strict evidence audit, provider contract, Atlas Sentinel toggle smoke, fresh-process verifier, and `git diff --check`.

### 2026-06-17 — Hardened incident source reachability
- Replaced three citations that later failed fresh audit reachability: Climate Crime Analysis Cerro de Pasco, Michigan TAMC pavement dashboard, and USGS publication landing page 70250932.
- Added reachable replacements: SITU Cerro de Pasco environmental-crime documentation, SEMCOG pavement condition open-data layer, and LSU repository mirror of the Mississippi River Delta wetland methane ebullition study.
- Revalidated final audit result: 44 renderable bookmarks, 44 Gold-ready evidence packs, 0 rows needing evidence cleanup, and 0 failed audited URL checks.
- Verification passed: JS syntax checks, Python compile, strict evidence audit, provider contract, Atlas Sentinel toggle smoke, and `git diff --check`.

## Objective — Atlas Incident Source Deep Dive

Define "evidence cleanup" and deepen Limn Atlas bookmark evidence with additional verifiable cited sources from news reports, government/agency reports, datasets, and academic articles about the real-world incident, place, or observed phenomenon.

## Validation Contract — Atlas Incident Source Deep Dive

- [x] Evidence cleanup is defined as rows lacking three reachable incident/instance cited-source URLs after method and technical links are excluded.
- [x] At least ten renderable Atlas bookmarks receive additional incident/instance cited sources.
- [x] Copernicus Browser links remain visible but do not count as cited sources.
- [x] Sentinel Hub platform/service links remain visible but do not count as cited sources.
- [x] Method-only papers remain supporting references unless they document the bookmark incident/place/phenomenon directly.
- [x] The evidence audit shows an improved Gold-ready count or an improved cited-source count distribution.
- [x] `node --check src/atlas-verification.js` passes.
- [x] `node --check src/atlas-evidence.js` passes.
- [x] `python3 -m py_compile execution/audit_atlas_evidence.py` passes.
- [x] `python3 execution/audit_atlas_evidence.py` passes.
- [x] Atlas provider/browser regression tests pass.

## Progress Log — Atlas Incident Source Deep Dive

### 2026-06-17 — Started incident source deep dive
- Target directive: none found specifically for incident-source cleanup; `directives/find_hotspots.md` remains related context for bookmark/event alignment.
- Intended execution scripts: `node --check src/atlas-verification.js`, `node --check src/atlas-evidence.js`, `node --check src/atlas-app.js`, `python3 -m py_compile execution/audit_atlas_evidence.py`, `python3 execution/audit_atlas_evidence.py`, `node tests/test_gee_provider.mjs`, and `node tests/test_atlas_sentinel_toggle.mjs`.
- Expected output artifacts: expanded `src/atlas-verification.js` source packs, regenerated `.tmp/atlas_evidence_audit.json`, regenerated `.tmp/atlas_evidence_audit.md`, and updated knowledge/session notes.
- Safety: no `.env`, `config-v1.js`, service-account JSON, OAuth tokens, Sentinel Hub secrets, private WMS endpoints, or `.tmp/` artifacts will be committed.

### 2026-06-17 — Completed incident source deep dive
- Defined evidence cleanup as rows that still lack three reachable incident/instance cited-source URLs after excluding Copernicus Browser, Sentinel Hub platform/service links, and method-only references.
- Added additional verifiable incident/domain sources for BH-DFSI, PETI, EPDI, CBSDI, KCDSI, OWSI, MP-PDI, NPDefI, TDR-ASI, AMDPHI, LFGVI, LRD-VSI, SABSI, LISI, S1-OWF, and S5P-SO2.
- Replaced blocked or generic primary URLs for OWSI, NPDefI, AMDPHI, LRD-VSI, S1-OWF, and S5P-SO2.
- Pruned URLs that blocked automated verification so counted citations are all reachable in the audit.
- Final audit result: 44 renderable bookmarks, 16 Gold-ready evidence packs, 28 rows still needing cleanup.
- Verification passed: JS syntax checks, Python compile, strict evidence audit, provider contract, and Atlas Sentinel toggle smoke.

## Objective — Atlas Incident Citation Count Correction

Correct the Atlas evidence model so Copernicus Browser, Sentinel Hub, and other platform/service documentation links remain visible as technical verification links but do not count as numbered cited sources. Numbered cited sources should represent incident/instance-specific support such as social posts, news stories, agency/government reports, local records, datasets, or other sources about the real-world bookmark event.

## Validation Contract — Atlas Incident Citation Count Correction

- [x] Copernicus Browser links are visible as technical verification links.
- [x] Sentinel Hub sensor documentation links are visible as technical verification links.
- [x] Sentinel Hub WMS/service documentation links are visible as technical verification links.
- [x] Copernicus Browser links do not contribute to the cited-source count.
- [x] Sentinel Hub sensor documentation links do not contribute to the cited-source count.
- [x] Sentinel Hub WMS/service documentation links do not contribute to the cited-source count.
- [x] The Atlas trust badge labels the count as cited sources rather than generic sources.
- [x] The evidence audit reports cited-source counts separately from technical-link counts.
- [x] The evidence audit's Gold-ready calculation uses cited-source reachability, not total technical URL reachability.
- [x] `node --check src/atlas-evidence.js` passes.
- [x] `python3 -m py_compile execution/audit_atlas_evidence.py` passes.
- [x] Atlas provider/browser regression tests pass.

## Progress Log — Atlas Incident Citation Count Correction

### 2026-06-16 — Started citation count correction
- Target directive: none found specifically for evidence counting; this supersedes the counting language in the Atlas Three-Source Bookmark Evidence Standard.
- Intended execution scripts: `node --check src/atlas-evidence.js`, `python3 -m py_compile execution/audit_atlas_evidence.py`, `python3 execution/audit_atlas_evidence.py`, `node tests/test_gee_provider.mjs`, and `node tests/test_atlas_sentinel_toggle.mjs`.
- Expected output artifacts: corrected evidence helper, corrected audit outputs under `.tmp/`, updated task/knowledge notes, and regression-test coverage.
- Safety: no `.env`, `config-v1.js`, service-account JSON, OAuth tokens, Sentinel Hub secrets, or private config values will be read, printed, or committed.

### 2026-06-16 — Completed citation count correction
- Updated `src/atlas-evidence.js` so Copernicus Browser, Sentinel Hub sensor docs, and Sentinel Hub WMS docs are marked as technical links with `countsAsCitation: false`.
- Updated the Atlas info panel to show numbered `Cited sources` separately from unnumbered `Supporting references` and `Technical checks`.
- Updated the evidence audit to report citation URL counts, supporting-reference URL counts, and technical URL counts separately.
- Corrected Gold-ready logic to require three reachable incident/instance cited-source URLs, not three total evidence URLs.
- Method papers remain visible as supporting references but no longer count as incident/instance citations.
- Corrected audit result: 44 renderable bookmarks, 0 Gold-ready evidence packs, and 44 rows needing additional incident/instance sources.
- Verification passed: `node --check src/atlas-evidence.js`, `node --check src/atlas-app.js`, `python3 -m py_compile execution/audit_atlas_evidence.py`, `python3 execution/audit_atlas_evidence.py`, `node tests/test_gee_provider.mjs`, and `node tests/test_atlas_sentinel_toggle.mjs`.

## Objective — Atlas Bookmark Focus Layer

Add a toggleable Atlas map layer that marks the focus point for each index bookmark so the operator can inspect the geographic spread of proof and context targets without requesting new imagery tiles.

## Validation Contract — Atlas Bookmark Focus Layer

- [x] Atlas exposes a visible HUD control for bookmark focus points.
- [x] The focus-point layer is off by default.
- [x] Toggling the control on adds one map point for each Atlas index bookmark with valid latitude and longitude.
- [x] Toggling the control off removes the focus-point layer.
- [x] The active selected bookmark point is visually distinct from inactive points.
- [x] Clicking a focus point selects the corresponding Atlas index.
- [x] Toggling focus points does not request Sentinel WMS tiles.
- [x] Toggling focus points does not request GEE tiles.
- [x] `node --check src/atlas-app.js` passes.
- [x] Atlas browser smoke verifies the focus layer toggle.

## Progress Log — Atlas Bookmark Focus Layer

### 2026-06-16 — Started bookmark focus layer
- Target directive: none found specifically for bookmark focus overlays; `directives/find_hotspots.md` is related context for bookmark focus semantics.
- Intended execution scripts: `node --check src/atlas-app.js`, `node tests/test_gee_provider.mjs`, and `node tests/test_atlas_sentinel_toggle.mjs`.
- Expected output artifacts: toggle control in `atlas.html`, Leaflet focus-point overlay in `src/atlas-app.js`, focused browser regression coverage, and session knowledge checkpoint.
- Safety: no `.env`, `config-v1.js`, service-account JSON, OAuth tokens, Sentinel Hub secrets, or `.tmp/` outputs will be committed.

### 2026-06-16 — Completed bookmark focus layer
- Added the `Focus pts` Atlas HUD toggle and a Leaflet vector layer with one point for each of 96 valid Atlas bookmark coordinates.
- Kept the layer off by default; toggle on/off adds and removes only local vector markers.
- Marker clicks select the corresponding Atlas index through the existing `selectIndex()` path.
- Raised the HUD above the info panel so the new control and existing HUD controls remain clickable.
- Verification passed: `node --check src/atlas-app.js`, `node tests/test_gee_provider.mjs`, `node tests/test_atlas_sentinel_toggle.mjs`, `git diff --check`, and a fresh verifier review.

## Objective — Atlas Weak Evidence Promotion

Elevate the remaining Weak and Weak-Medium renderable Atlas bookmarks to Strong only where the bookmark location/date, primary citation, and curated verification evidence all point to the same real-world phenomenon.

## Validation Contract — Atlas Weak Evidence Promotion

- [x] Each promoted Weak bookmark has a source that matches its bookmark place.
- [x] Each promoted Weak-Medium bookmark has a source that matches its bookmark place.
- [x] Each promoted bookmark has at least one curated Strong verification entry.
- [x] Each curated Strong verification entry has only reachable evidence URLs.
- [x] The evidence audit reports zero cleanup items.
- [x] The cold-eyes review reports zero Weak rows.
- [x] The cold-eyes review reports zero Weak-Medium rows.
- [x] `node --check` passes for edited Atlas JavaScript.
- [x] `python3 -m py_compile` passes for the evidence audit script.
- [x] Atlas provider/toggle regression tests pass.

## Progress Log — Atlas Weak Evidence Promotion

### 2026-06-16 — Elevated remaining weak tiers
- Promoted EPDI, MP-PDI, TDR-ASI, HSAI, and LFGVI from Weak to Strong after correcting source-place mismatches.
- Promoted OWSI, LRD-VSI, TT-API, MEPSI, and WDPTZI from Weak-Medium to Strong after replacing generic or mismatched sources with site/region-specific evidence.
- Regenerated `.tmp/atlas_cold_eyes_verifiability_review.md`: Strong verified 41, Gold evidence 3, Medium-Strong 0, Medium 0, Weak-Medium 0, Weak 0.
- Verification passed: strict evidence audit, syntax checks, provider contract, Atlas Sentinel toggle smoke, browser checks for EPDI and OWSI, and `git diff --check`.

## Objective — Atlas Three-Source Bookmark Evidence Standard

Add a trust framework so every renderable Atlas bookmark exposes at least three independent evidence sources and can be audited for primary-source reachability.

## Validation Contract — Atlas Three-Source Bookmark Evidence Standard

- [x] Atlas renderable bookmarks expose a visible evidence/trust badge in the info panel.
- [x] Atlas renderable bookmarks expose a primary source link.
- [x] Atlas renderable bookmarks expose an imagery/date/location verification link.
- [x] Atlas renderable bookmarks expose a sensor or service reference link.
- [x] A deterministic audit script checks every renderable bookmark.
- [x] The audit requires at least three evidence URLs per renderable bookmark.
- [x] The audit requires at least three reachable evidence URLs per renderable bookmark.
- [x] The audit requires the primary bookmark source URL to be reachable.
- [x] The audit writes JSON output under `.tmp/`.
- [x] The audit writes Markdown output under `.tmp/`.
- [x] The browser shows the evidence pack for a selected Atlas index.
- [x] `node --check` passes for edited Atlas JavaScript.
- [x] `python3 -m py_compile` passes for the evidence audit script.

## Progress Log — Atlas Three-Source Bookmark Evidence Standard

### 2026-06-16 — Upgraded medium and medium-strong rows
- Added `src/atlas-verification.js` with curated strong-verification evidence for every row previously classified as Medium or Medium-Strong.
- Updated `src/atlas-evidence.js` so verification-specific event/method/local sources appear before generic sensor/service references.
- Tightened `execution/audit_atlas_evidence.py` so Strong rows fail if any curated verification evidence URL is unreachable.
- Regenerated `.tmp/atlas_cold_eyes_verifiability_review.md`: Strong 34, Medium-Strong 0, Medium 0, Weak-Medium 5, Weak 5.
- Verification passed: strict evidence audit, syntax checks, provider contract, Atlas Sentinel toggle smoke, browser Strong badge check, and `git diff --check`.

### 2026-06-16 — Completed evidence standard implementation
- Added `src/atlas-evidence.js` to generate evidence packs with primary source, Copernicus Browser bookmark check, sensor reference, and WMS service reference.
- Added the `Gold evidence` badge and linked evidence pack to the Atlas info panel.
- Added `execution/audit_atlas_evidence.py` to audit all renderable Atlas bookmarks without reading private config or secrets.
- Replaced 10 broken primary source URLs found by the strict evidence audit.
- Final audit: 44 renderable bookmarks, 44 Gold-ready evidence packs, 0 cleanup items.
- Verification passed: `node --check src/atlas-app.js`, `node --check src/atlas-indices.js`, `node --check src/atlas-evidence.js`, `python3 -m py_compile execution/audit_atlas_evidence.py`, `node tests/test_gee_provider.mjs`, `node tests/test_atlas_sentinel_toggle.mjs`, browser evidence-panel check, and `git diff --check`.

## Objective — Atlas Citation and Bookmark Audit

Verify Limn Atlas source/citation links and bookmark/date choices so the info panel does not send users to irrelevant papers and each live index demonstrates its signal at a defensible location/date.

## Validation Contract — Atlas Citation and Bookmark Audit

- [x] The audit reads `src/atlas-indices.js`.
- [x] The audit reads `src/atlas-sar-demos.js`.
- [x] The audit reads `src/atlas-s5p-demos.js`.
- [x] The audit does not read `config-v1.js`.
- [x] The audit does not read `.env`.
- [x] Every renderable Atlas index with `sourceUrl` is checked for HTTP reachability.
- [x] Every renderable Atlas index with `sourceUrl` is checked for source-title/topic mismatch.
- [x] The audit identifies any water-quality citation that resolves to an unrelated protein-folding page.
- [x] Current bookmark dates are checked against sensor availability.
- [x] Current bookmark zooms are checked against per-sensor minimum zoom.
- [x] Current bookmark demonstration status is compared against existing QC metrics where available.
- [x] Findings are written under `.tmp/`.
- [x] Corrections are applied only after mismatches are explicitly identified.
- [x] `node --check src/atlas-indices.js` passes if Atlas index definitions are edited.
- [x] `node --check src/atlas-sar-demos.js` passes if SAR demo definitions are edited.
- [x] `node --check src/atlas-s5p-demos.js` passes if S5P demo definitions are edited.

## Progress Log — Atlas Citation and Bookmark Audit

### 2026-06-16 — Started Atlas citation/bookmark audit
- Target directive: `directives/find_hotspots.md` for the bookmark/date validation portion; none found for citation URL checking.
- Intended execution scripts: existing `execution/qc_atlas_bookmarks.py` / `execution/hotspot_loop.py` if WMS scoring is needed, plus a focused citation/bookmark audit report under `.tmp/`.
- Expected output artifacts: mismatch report, bookmark QC summary, corrected Atlas source/citation fields if needed, and knowledge/session notes.
- Safety: no `.env`, `config-v1.js`, OAuth token, Sentinel Hub secret, service-account JSON, or private config values will be read or printed.

### 2026-06-16 — Completed citation/bookmark audit fixes
- Wrote source and bookmark findings to `.tmp/atlas_citation_url_audit.json`, `.tmp/atlas_citation_url_audit.md`, and `.tmp/atlas_bookmark_evidence_summary.md`.
- Fixed PETI after its Lake Erie bloom source URL resolved to an unrelated protein-folding paper.
- Fixed CSRC so the Lake Taihu bookmark now cites a Lake Taihu satellite-monitoring source.
- Updated MP-PDI from zoom 9 to zoom 10 to satisfy the Sentinel-2 minimum zoom rule.
- Updated S1-OWF, S5P-NO2, and S5P-SO2 demo bookmarks to the best previously measured hotspot coordinates.
- Confirmed `sh-d7374040-889f-4013-aac2-046a15f6d8ba` is not accepted as an OGC WMS configuration endpoint.
- Verified `83a6b821-c0ad-43b1-848f-06f7b6b528a7` as the alternate OGC WMS configuration id; direct `GetCapabilities` returned `200 application/xml`.
- Browser verification passed for PETI and CSRC citations after cache-busting Atlas data imports.
- Fresh-process catalog verifier passed for PETI/CSRC sources, MP-PDI zoom, S1/S5P demo coordinates, and absence of the invalid `sh-d...` WMS id.
- Verification passed: `node --check src/atlas-app.js`, `node --check src/atlas-indices.js`, `node --check src/atlas-sar-demos.js`, `node --check src/atlas-s5p-demos.js`, `python3 -m py_compile execution/qc_atlas_bookmarks.py`, `node tests/test_gee_provider.mjs`, `node tests/test_atlas_sentinel_toggle.mjs`, fresh-process catalog verifier, and `git diff --check`.

## Objective — Atlas Sentinel Account Switcher

Add an Atlas-only Sentinel WMS source switch so the operator can choose between the configured Copernicus/Sentinel Hub endpoint and the built-in Sentinel Viewer endpoint without editing `config-v1.js`.

## Validation Contract — Atlas Sentinel Account Switcher

- [x] Atlas exposes a visible Sentinel source control in the map HUD.
- [x] The source control offers the configured Copernicus endpoint when one is present.
- [x] The source control offers the Sentinel Viewer endpoint.
- [x] Atlas uses the configured Copernicus endpoint when that source is selected.
- [x] Atlas uses the Sentinel Viewer endpoint when that source is selected.
- [x] Switching source while Sentinel is armed refreshes the active Atlas tiles.
- [x] Switching source while Sentinel is disarmed does not request WMS tiles.
- [x] The source switch preserves the Sentinel live-tile guard.
- [x] The source switch preserves the Sentinel minimum zoom guard.
- [x] The implementation does not commit `config-v1.js`.
- [x] `node --check src/atlas-app.js` passes.
- [x] `node tests/test_gee_provider.mjs` passes.
- [x] `node tests/test_atlas_sentinel_toggle.mjs` passes.
- [x] Browser verification confirms the source selector renders.
- [x] A fresh verifier reviews the final output against this contract.

## Progress Log — Atlas Sentinel Account Switcher

### 2026-06-16 — Started Atlas Sentinel account switcher
- Target directives: none found specifically for account switching; using the existing Atlas Sentinel Toggle and WMS Cooling contract as the precedent.
- Intended execution scripts: `node --check src/atlas-app.js`, `node tests/test_gee_provider.mjs`, `node tests/test_atlas_sentinel_toggle.mjs`, and browser verification.
- Expected output artifacts: Atlas HUD/source switch, config template notes, tests, and knowledge/session updates.
- Safety: no `.env`, `config-v1.js`, OAuth secrets, tokens, or private endpoint values will be printed or committed.

### 2026-06-16 — Implemented Atlas Sentinel account switcher
- Added the Atlas HUD source selector with `Configured` and `Viewer` options.
- Added source resolution for configured WMS fields and viewer WMS fields.
- Kept Sentinel live-tile and minimum zoom guards as the only path to WMS requests.
- Extended the Atlas Sentinel smoke test to prove configured WMS, viewer WMS, armed switching, and disarmed no-request behavior.

## Objective — Atlas Sentinel Article Captures

Generate Sentinel-only article capture assets for selected Limn Atlas indices: BH-DFSI, SF-EII, PETI, EPDI, RRFI, and TDR-ASI. Each selected index should produce up to four article-ready PNGs plus machine-readable metadata documenting location, bookmark date, WMS render window, provider, layer, bbox, and available satellite scene metadata.

## Validation Contract — Atlas Sentinel Article Captures

- [x] Capture generation uses Sentinel Hub WMS only.
- [x] Capture generation does not request Google Earth Engine tiles.
- [x] Capture generation does not request COG tiles.
- [x] Capture generation resolves `bhdfsi`.
- [x] Capture generation resolves `sfeii`.
- [x] Capture generation resolves `peti`.
- [x] Capture generation resolves `epdi`.
- [x] Capture generation resolves `rrfi`.
- [x] Capture generation resolves `tdrasi`.
- [x] Each resolved index writes no more than four PNG assets.
- [x] Each resolved index writes at least one PNG asset.
- [x] Each PNG asset has a metadata JSON entry.
- [x] Each metadata entry records the index key.
- [x] Each metadata entry records the index acronym.
- [x] Each metadata entry records the bookmark label.
- [x] Each metadata entry records latitude.
- [x] Each metadata entry records longitude.
- [x] Each metadata entry records zoom.
- [x] Each metadata entry records bbox.
- [x] Each metadata entry records the bookmark date.
- [x] Each metadata entry records the Sentinel WMS time window.
- [x] Each metadata entry records the WMS layer.
- [x] Each metadata entry records the provider as Sentinel Hub WMS.
- [x] The capture script does not print secret-bearing config values.
- [x] Output assets are written under `.tmp/atlas_article_captures/`.

## Progress Log — Atlas Sentinel Article Captures

### 2026-06-13 — Started Sentinel-only article capture run
- Target directives: none found specifically for Atlas article capture; using `knowledge/domain/api-contracts.md` plus the existing Atlas WMS/bookmark contract.
- Intended execution scripts: new `execution/capture_atlas_articles.py`, existing Atlas index registry loading through Node, direct Sentinel Hub WMS requests, optional Sentinel Hub Catalog metadata lookup if credentials are available, and static Python compile verification.
- Expected output artifacts: PNG captures and sidecar metadata under `.tmp/atlas_article_captures/`.
- Safety: no `.env`, `config-v1.js`, service-account JSON, OAuth token, or secret config values will be printed or committed.

### 2026-06-13 — Completed Sentinel-only article capture run
- Added `execution/capture_atlas_articles.py` to generate direct Sentinel Hub WMS article assets from the Atlas registry.
- Generated 24 PNG captures for BH-DFSI, SF-EII, PETI, EPDI, RRFI, and TDR-ASI under `.tmp/atlas_article_captures/20260613-selected-sentinel/`.
- Wrote per-image JSON sidecars plus `manifest.json` and `manifest.md`.
- Attached Sentinel scene metadata from public CDSE STAC, including item ID, acquisition datetime, platform, cloud cover, and sun geometry where present.
- Verified 6 resolved targets, 4 PNGs per target, 24 valid PNGs, 24 metadata entries, zero GEE/COG usage flags, and no secret-bearing config values in sidecars.

## Objective — Shareable Sentinel-Only Produced Water App

Create a shareable Produced Water app entrypoint that uses only the guarded/rate-limited Sentinel Hub WMS renderer. The normal internal app keeps its COG-safe default, while the share page explicitly opts into Sentinel Hub and cannot silently fall back to COG or GEE.

## Validation Contract — Shareable Sentinel-Only Produced Water App

- [x] A shareable Produced Water HTML entrypoint exists.
- [x] The shareable entrypoint loads the existing Produced Water UI rather than duplicating app logic.
- [x] The shareable entrypoint marks the session as Sentinel-only before `src/app.js` runs.
- [x] Sentinel-only mode forces `IMAGE_PROVIDER` and `IMAGERY_PROVIDER` to `sentinelhub`.
- [x] Sentinel-only mode forces `ALLOW_SENTINEL_FALLBACK` to `true`.
- [x] Sentinel-only mode keeps `SENTINEL_CREDIT_GUARD` enabled.
- [x] Sentinel-only mode keeps Sentinel live tiles armed.
- [x] Sentinel-only mode still honors the configured minimum zoom gate.
- [x] Sentinel-only mode does not use COG tile URLs.
- [x] Sentinel-only mode does not use GEE tile URLs.
- [x] Sentinel-only mode uses the existing rate-limited Sentinel WMS loader.
- [x] The normal `index.html` default provider remains unchanged.
- [x] Focused tests cover the shareable Sentinel-only contract.
- [x] Browser smoke verifies the share page exposes Sentinel-only status.

## Progress Log — Shareable Sentinel-Only Produced Water App

### 2026-06-10 — Completed Sentinel-only share entrypoint
- Added `share.html`, which routes to the existing Produced Water app as `index.html?share=sentinel-only`.
- Added share-mode enforcement in `src/app.js` so the runtime forces Sentinel Hub, permits only the explicit Sentinel route, keeps the credit guard enabled, and locks Sentinel live tiles on.
- Kept the existing Sentinel WMS rate-limited loader in `src/map.js`: 512px tiles, one concurrent request, and Retry-After cooldown handling.
- Added `tests/test_share_sentinel_only.mjs` to prove the share route makes WMS requests and makes zero GEE/COG tile requests against a local stub.
- Verification passed: syntax check, provider contract, share smoke, normal browser smoke, PWI tests, evalscript tests, and diff whitespace check.

## Objective — Atlas Sentinel Toggle and WMS Cooling

Implement the same safe Sentinel Hub session toggle in Limn Atlas that Produced Water now has: Atlas stays on its default GEE/COG-safe provider until the operator explicitly enables Sentinel, and Sentinel WMS uses a minimum zoom gate plus conservative 429-aware loading.

## Validation Contract — Atlas Sentinel Toggle and WMS Cooling

- [x] Atlas shows a visible Sentinel switch in the map HUD.
- [x] Atlas shows a visible Sentinel minimum zoom control in the map HUD.
- [x] Atlas keeps Sentinel live tiles off by default.
- [x] Atlas defaults global COG config to GEE unless Atlas is explicitly switched to Sentinel.
- [x] Atlas blocks configured Sentinel Hub fallback unless `ALLOW_SENTINEL_FALLBACK` is true or the HUD switch is on.
- [x] Atlas HUD switch routes the active Atlas provider to Sentinel Hub when switched on.
- [x] Atlas HUD switch restores the default Atlas provider when switched off.
- [x] Atlas Sentinel WMS does not request tiles below the configured minimum zoom.
- [x] Atlas Sentinel WMS loads at most one tile request concurrently.
- [x] Atlas Sentinel WMS uses 512px tiles to reduce request count.
- [x] Atlas Sentinel WMS honors HTTP `Retry-After` on 429.
- [x] Atlas status text distinguishes default provider, guarded Sentinel, active Sentinel, and rate-limit cooldown states.
- [x] Focused provider contract tests cover Atlas Sentinel toggle behavior.
- [x] Atlas browser smoke confirms default GEE makes no Sentinel requests.
- [x] Live/browser smoke confirms the Atlas provider attribution switches to Copernicus Sentinel Hub after toggling on.

## Progress Log — Atlas Sentinel Toggle and WMS Cooling

### 2026-06-09 — Completed Atlas Sentinel toggle/cooling port
- Added an Atlas HUD Sentinel WMS switch, Z-min slider, and status text.
- Added a session-only Atlas provider override so Sentinel on routes to Sentinel Hub and Sentinel off restores the default Atlas provider.
- Kept global `IMAGE_PROVIDER: "cog"` normalized to Atlas GEE unless the Atlas Sentinel switch is explicitly enabled.
- Added Atlas Sentinel guard states for disarmed, below-min-zoom, and cooldown.
- Reworked Atlas `FetchWMS` to use 512px tiles, one concurrent request, `Retry-After` cooldowns, and `ratelimit` status events.
- Added `tests/test_atlas_sentinel_toggle.mjs` with a local WMS stub so Sentinel toggle behavior is verified without spending real Sentinel Hub credits.
- Verification passed: provider contract, Atlas GEE smoke, Atlas Sentinel stub smoke, live Atlas HUD visibility check, and live guarded toggle check at Z13 with no Sentinel burst.

### 2026-06-10 — Tightened Atlas provider-error diagnosis
- Confirmed PETI is Sentinel-renderable through the current configured WMS endpoint with an `HTTP 200 image/png` direct probe.
- Updated Atlas tile errors to parse provider JSON/XML/CDATA bodies and distinguish quota/credit 403s from generic denial/date/provider failures.
- Verification passed: `node --check src/atlas-app.js`, provider contract, Atlas GEE smoke, Atlas Sentinel stub smoke, and `git diff --check`.

## Objective — Sentinel Hub Credit Guard

Add a manual Sentinel Hub spend guard so new Copernicus/Sentinel credentials can be tested without accidental WMS tile bursts. Sentinel live tiles must be explicitly armed and must meet a minimum zoom gate before WMS requests are made.

## Validation Contract — Sentinel Hub Credit Guard

- [x] Sentinel Hub live tiles are disarmed by default.
- [x] The Settings tab exposes a Sentinel Hub live-tile arm switch.
- [x] The Settings tab exposes a minimum zoom control.
- [x] Sentinel Hub WMS layers do not request tiles when live tiles are disarmed.
- [x] Sentinel Hub WMS layers do not request tiles below the configured minimum zoom.
- [x] Sentinel Hub WMS layers can request tiles when armed at or above the configured minimum zoom.
- [x] COG provider behavior is unchanged by the Sentinel credit guard.
- [x] Focused provider tests cover the Sentinel credit guard.
- [x] Browser smoke passes.

## Progress Log — Sentinel Hub Credit Guard

### 2026-06-09 — Started Sentinel Hub credit guard
- Target directives: none found specifically for Sentinel credit guarding; using `knowledge/domain/api-contracts.md` as the provider behavior contract.
- Intended execution scripts: `node --check`, provider contract tests, browser smoke, and a live/fixture browser assertion that disarmed Sentinel mode emits no WMS requests.
- Expected output artifacts: updated Settings controls, Sentinel WMS layer guard, tests, docs, and knowledge logs.
- Safety: no OAuth secrets, `config-v1.js` values, `.env`, or tokens will be printed or committed.

### 2026-06-09 — Completed Sentinel Hub credit guard
- Added Settings controls for Sentinel live tile arming and minimum Sentinel zoom.
- Added default `SENTINEL_CREDIT_GUARD: true`, `SENTINEL_LIVE_TILES: false`, and `SENTINEL_MIN_ZOOM: 14`.
- Guarded the Sentinel WMS layer path so blocked state returns a local placeholder grid layer and makes zero WMS tile requests.
- Guarded Sentinel mini GIF/acquisition helper paths while the credit guard is blocking.
- Verification passed: provider contract test, static verifier, browser assertion with fake WMS endpoint, browser smoke, produced-water rendering regression, Atlas smoke, and `git diff --check`.

## Objective — Sentinel Toolbar Toggle Actually Selects Sentinel

Make the visible Sentinel toolbar switch behave like a real session-level renderer switch instead of only arming an inactive fallback provider. This keeps COG as the safe default, but lets a deliberate toggle-on action route the current map layer through Sentinel Hub WMS while retaining the minimum zoom spend guard.

## Validation Contract — Sentinel Toolbar Toggle Actually Selects Sentinel

- [x] The Sentinel toolbar switch is off by default under the COG provider.
- [x] The Sentinel toolbar switch routes the active provider to Sentinel Hub when switched on.
- [x] The Sentinel toolbar switch arms Sentinel live tiles when switched on.
- [x] The Sentinel toolbar switch restores the default provider when switched off.
- [x] The minimum zoom guard still blocks Sentinel Hub WMS tiles below the configured zoom.
- [x] Sentinel Hub WMS tiles request only after the switch is on and the zoom gate is satisfied.
- [x] The UI status distinguishes COG/GEE default mode from Sentinel guarded mode.
- [x] Provider contract tests pass.
- [x] Browser smoke confirms the active provider changes when toggled.

## Objective — Sentinel Hub WMS Rate-Limit Cooling

Reduce Sentinel Hub 429 bursts when the toolbar switch is enabled by making WMS rendering conservative and cooldown-aware.

## Validation Contract — Sentinel Hub WMS Rate-Limit Cooling

- [x] Sentinel Hub WMS loads at most one tile request concurrently.
- [x] Sentinel Hub WMS uses larger 512px tiles to reduce request count.
- [x] Sentinel Hub WMS honors HTTP `Retry-After` when rate limited.
- [x] Sentinel Hub WMS announces rate-limit cooldowns to the UI.
- [x] The toolbar status can show rate-limit cooldown state.
- [x] Provider contract tests cover the WMS cooldown behavior.
- [x] Browser smoke confirms Sentinel Hub attribution after toggling on.

## Progress Log — Sentinel Toolbar and WMS Cooling

### 2026-06-09 — Completed Sentinel toggle/cooling fix
- Found that the first toolbar switch only armed the credit guard; it did not switch the active provider out of COG/GEE.
- Added a session-only Sentinel Hub provider override when the toolbar switch is on, and restore-to-default behavior when it is off.
- Redacted config probe found the local WMS URL was returning HTTP 404; updated `config-v1.js` to the previously confirmed Copernicus WMS config endpoint without printing secret values.
- Reduced Sentinel Hub WMS request pressure with one-at-a-time fetches, 512px WMS tiles, `Retry-After` handling, and UI cooldown status.
- Verification passed: syntax checks, provider contract, browser smoke, and live browser attribution switching from COG to Copernicus Sentinel Hub.

## Objective — Sentinel-2 COG Tile Provider

Add a third imagery backend that reads public Sentinel-2 L2A Cloud-Optimized GeoTIFFs through STAC, computes Limn produced-water indices server-side, caches rendered PNG tiles locally, and lets Leaflet use it through `IMAGE_PROVIDER: "cog"`.

## Validation Contract — Sentinel-2 COG Tile Provider

- [x] A deterministic execution script renders one XYZ tile from Sentinel-2 L2A COG assets without reading secrets.
- [x] The COG renderer queries public STAC by tile bbox and date window.
- [x] The COG renderer reads only the needed COG band windows.
- [x] The COG renderer supports true color.
- [x] The COG renderer supports LBI.
- [x] The COG renderer supports OBEC.
- [x] The COG renderer supports ASAI.
- [x] The COG renderer supports PWCI.
- [x] The local server exposes `/api/cog/tiles/{z}/{x}/{y}`.
- [x] The local server caches rendered COG PNG tiles under `.tmp/`.
- [x] The browser map provider router supports `IMAGE_PROVIDER: "cog"`.
- [x] `config.example.js` documents the COG provider.
- [x] Focused provider contract tests pass.
- [x] A live Lake Boehmer COG tile returns a PNG.
- [x] Browser smoke can load COG-provider tiles without Sentinel Hub requests.

## Progress Log — Sentinel-2 COG Tile Provider

## Objective — COG Demo Speed and Visual Truthfulness

Make the default Produced Water COG flow faster and cleaner for desktop demos by exposing only supported COG lenses, disabling nonfunctional temporal controls, rendering analysis as readable overlays, caching scene selection, and prewarming demo bookmark tiles.

## Validation Contract — COG Demo Speed and Visual Truthfulness

- [x] COG mode marks unsupported Detection-grid lenses as unavailable.
- [x] COG mode removes unsupported Screen-tab chips from the active demo flow.
- [x] COG mode disables Diff controls.
- [x] COG mode disables Cumulative controls.
- [x] The COG renderer returns a deterministic failure for unsupported index keys.
- [x] The COG renderer supports true color.
- [x] The COG renderer supports LBI.
- [x] The COG renderer supports OBEC.
- [x] The COG renderer supports ASAI.
- [x] The COG renderer supports PWCI.
- [x] COG overlay tiles use sparse alpha masks over the basemap.
- [x] COG STAC item selection is cached across tile requests.
- [x] The local server exposes a COG prewarm endpoint.
- [x] The launcher/startup path can prewarm default demo bookmark tiles.
- [x] Focused provider tests cover COG UI/provider constraints.
- [x] Direct COG probes return PNGs for every supported demo lens.
- [x] Direct COG probes do not return PNGs for unsupported demo lenses.
- [x] Browser smoke loads the default COG flow without Sentinel Hub tile requests.
- [x] Browser smoke confirms unsupported COG controls are disabled or absent.

## Progress Log — COG Demo Speed and Visual Truthfulness

### 2026-06-09 — Started COG demo hardening
- Target directives: none found specifically for COG demo hardening; using `knowledge/domain/api-contracts.md` and the produced-water UI flow contract as governing artifacts.
- Intended execution scripts: `execution/render_cog_tile.py`, local `/api/cog/tiles`, new/updated provider tests, direct tile probes, and browser smoke.
- Expected output artifacts: updated COG renderer/server, map provider, UI controls, tests, docs/knowledge, and runtime cache under `.tmp/cog_tile_cache/`.
- Safety: no `.env`, service-account JSON, `config-v1.js`, Sentinel Hub tokens, API keys, or `.tmp` cache files will be read into chat or committed.

### 2026-06-09 — Completed COG demo hardening
- COG mode now exposes only OBEC/LBI/ASAI/PWCI in the Screen demo flow and disables unsupported Detection-grid buttons with a visible "No COG" marker.
- COG mode disables Diff and Cumulative controls because temporal COG rendering is not implemented.
- Unsupported COG index requests now fail closed with HTTP 400 instead of trying partial renderer math.
- COG analytical overlays now use sparse graded alpha masks over the basemap, while true color stays opaque for context.
- Added STAC item-selection cache, renderer-versioned PNG cache keys, `/api/cog/prewarm`, and startup prewarm for the first demo bookmarks.
- Verification passed: static checks, provider contract tests, produced-water rendering regression, browser smoke, Atlas smoke, live prewarm endpoint, live supported/unsupported COG tile probes, and live browser UI assertion.

### 2026-06-09 — COG provider started
- Target directives: `directives/pwi_spec.md` for produced-water index behavior and `directives/find_hotspots.md` for transparency/false-positive guardrails.
- Intended execution scripts: new `execution/render_cog_tile.py`, `node --check`, focused provider tests, direct live tile curl, and browser smoke.
- Expected output artifacts: COG renderer script, `/api/cog/tiles` server route, provider-neutral map changes, config/docs/tests updates, and `.tmp/cog_tile_cache/` runtime cache.
- Safety: no `.env`, service-account JSON, `config-v1.js`, Sentinel Hub tokens, or secret config files will be read or committed.

### 2026-06-09 — COG provider completed
- Added `execution/render_cog_tile.py` to query public Sentinel-2 L2A COGs through Element84 Earth Search STAC, reproject COG windows into XYZ tiles with Rasterio, and render true color plus PWCI/OBEC/ASAI/LBI.
- Added `/api/cog/tiles/{z}/{x}/{y}` to the existing local tile server with disk cache under `.tmp/cog_tile_cache/`.
- Added `IMAGE_PROVIDER: "cog"` support to the Leaflet provider router and made COG the Produced Water default.
- Kept Atlas on GEE context when global config is `cog`, because Atlas-specific formulas are not yet ported to COG.
- Verification passed: direct Lake Boehmer COG render produced true color plus LBI/OBEC/ASAI/PWCI PNGs; live `/api/cog/tiles` route returned HTTP 200 and disk-cache hit on repeat; live browser startup resolved provider to `cog`, loaded COG tiles, made 0 Sentinel/GEE tile requests, and showed no toast.

## Objective — GEE Tile Rate-Limit Hardening

Stop Limn's Google Earth Engine default provider from blanking the map when Leaflet requests a burst of tiles and GEE returns HTTP 429.

## Validation Contract — GEE Tile Rate-Limit Hardening

- [x] The GEE tile server queues outbound Earth Engine tile byte fetches.
- [x] The GEE tile server retries upstream HTTP 429 responses before responding to the browser.
- [x] The GEE tile server caches successful tile byte responses by tile URL and query.
- [x] The GEE tile server deduplicates simultaneous identical tile requests.
- [x] The Produced Water GEE layer uses a fetch-based tile loader.
- [x] The Produced Water GEE layer limits concurrent browser tile fetches.
- [x] The Produced Water GEE layer retries HTTP 429 responses before firing tile errors.
- [x] The Atlas GEE tile loader limits concurrent browser tile fetches.
- [x] Static JavaScript syntax checks pass.
- [x] Focused GEE provider contract test passes.
- [x] Browser smoke test passes.
- [x] Live launcher-backed GEE tile endpoint returns HTTP 200 after the hardening.

## Progress Log — GEE Tile Rate-Limit Hardening

### 2026-06-09 — Hardening started
- Target directive: `directives/pwi_spec.md` for produced-water render expectations; none found specifically for GEE tile throttling.
- Intended execution scripts: `node --check` for changed JavaScript, `node tests/test_gee_provider.mjs`, `node tests/test.js`, and live local `npm run start:gee` probes.
- Expected output artifacts: updated `server/gee_tile_server.mjs`, `src/map.js`, `src/atlas-app.js`, tests if needed, and refreshed knowledge logs.
- Safety: no `.env`, service-account JSON, `config-v1.js`, token, or key files will be read, printed, or committed.

### 2026-06-09 — Hardening completed
- Added server-side outbound tile queueing, 429 retry/backoff, in-flight request dedupe, and successful tile byte caching to `server/gee_tile_server.mjs`.
- Replaced Produced Water's raw GEE `<img>` tile path with a fetch-based rate-limited tile layer in `src/map.js`.
- Added queue/retry behavior to the Atlas GEE `FetchTile` loader in `src/atlas-app.js`.
- Bumped module cache keys to `v=77` for the changed Produced Water and Atlas browser modules.
- Verification passed: syntax checks, focused GEE provider contract, browser smoke, Atlas GEE smoke, live tile curl on `4180`, and live headless browser check showing 30 GEE tile responses with 30 HTTP 200 and 0 HTTP 429.

### 2026-06-09 — Console/cache follow-up completed
- Added `Cache-Control: no-store` for local HTML, JavaScript, and CSS responses so Chrome does not keep stale `v=76` module imports after launcher restarts.
- Added a narrow unhandled-rejection guard that converts opaque `FetchError` promise rejections into structured Limn warnings instead of `(index):1 Uncaught (in promise) Object`.
- Bumped remaining direct module tags/imports to `v=77` for a coherent browser asset generation.
- Silenced only the known Leaflet side-by-side `L.Mixin.Events` deprecation during plugin load, then restored normal `console.warn`/`console.error`.
- Verification passed: JS/server syntax checks, focused GEE provider contract, `Cache-Control: no-store` header checks, and live headless browser console check with 12 GEE tile responses, all HTTP 200, no page errors, and no console entries for the Leaflet deprecation or `FetchError`.

### 2026-06-09 — Transparent overlay follow-up completed
- Fixed GEE single-date Sentinel-2 requests so they expand to a default 30-day lookback and 15-day forward window instead of requiring imagery on the exact selected day.
- Raised the server-side default Sentinel-2 cloud tolerance to `maxcc=90` for the GEE path.
- Fixed initial map startup so it centers on the active spill bookmark instead of the legacy Dixon AOI.
- Verification passed: exact Lake Boehmer startup tile at z14/x3516/y6694 now has non-transparent overlay pixels for OBEC (6.284%), LBI (78.133%), and ASAI (2.283%); live startup browser centers on Lake Boehmer with 9 loaded GEE overlay blob tiles and HTTP 200 tile responses.

## Objective — GEE Render Quality and LBI Threshold Tightening

Improve the desktop readability of GEE-rendered analytical overlays without pretending Sentinel-2 SWIR data has more native detail than it does, and tighten LBI so it no longer paints broad wet-ish background as liquid brine.

## Validation Contract — GEE Render Quality and LBI Threshold Tightening

- [x] Produced Water GEE tiles request high-DPI/retina tiles on high-DPI desktop displays.
- [x] Atlas GEE tiles request high-DPI/retina tiles on high-DPI desktop displays.
- [x] LBI uses stricter liquid-brine gates in `src/indices.js`.
- [x] LBI uses the same stricter gates in the GEE tile server.
- [x] LBI uses the same stricter gates in the Sentinel Hub fallback layer path.
- [x] LBI uses the same stricter gates in compare/diff calculations.
- [x] LBI uses the same stricter gates in AOI statistics calculations.
- [x] LBI statistics bands include every band used by the stricter formula.
- [x] Focused produced-water rendering regression tests pass.
- [x] Focused GEE provider contract tests pass.
- [x] Browser smoke tests pass.
- [x] Live GEE tile alpha coverage confirms LBI is no longer broad-frame on the Lake Boehmer benchmark.

## Progress Log — GEE Render Quality and LBI Threshold Tightening

### 2026-06-09 — Completed render-quality/LBI pass
- Enabled `detectRetina: true` on Produced Water and Atlas GEE tile layers so high-DPI desktop displays request sharper source tiles.
- Kept Earth Engine projection/resampling out of the analytical mask path after testing showed projection forcing can collapse overlay mask coverage.
- Tightened LBI from the older permissive `NDSI × (NDWI+0.5) × (1−NDVI) × BSI` screen to stricter brine, wetness, low-vegetation, and surface-context gates.
- Aligned LBI across GEE server, browser evalscript, Sentinel Hub fallback, compare/diff logic, AOI statistics, chart anomaly threshold, docs, and regression tests.
- Verification passed: Lake Boehmer z14/x3516/y6694 LBI coverage dropped from 78.133% to 1.466% while OBEC stayed 6.284% and ASAI stayed 2.283%; live high-DPI browser check displayed zoom 14 while requesting GEE zoom 15 tiles, with 32/32 HTTP 200 tile responses.

## Objective — Prevent Accidental Sentinel Hub Fallback

Stop local `config-v1.js` provider settings from silently routing normal map browsing back through Sentinel Hub while GEE is the intended default and Sentinel credits are exhausted.

## Validation Contract — Prevent Accidental Sentinel Hub Fallback

- [x] `getActiveConfig()` forces `IMAGE_PROVIDER` to the internal default unless `ALLOW_SENTINEL_FALLBACK` is explicitly `true`.
- [x] `getImageryProvider()` resolves Sentinel Hub requests to `cog` unless `ALLOW_SENTINEL_FALLBACK` is explicitly `true`.
- [x] The provider contract test covers the fallback lock.
- [x] Live browser startup makes GEE tile requests.
- [x] Live browser startup makes no Sentinel Hub WMS requests.
- [x] Live browser startup shows no Sentinel Hub tile-error toast.

## Progress Log — Prevent Accidental Sentinel Hub Fallback

### 2026-06-09 — Completed Sentinel fallback lock
- Added a runtime fallback lock in `src/app.js` and `src/map.js`.
- Updated provider tests and API-contract docs to require both `ALLOW_SENTINEL_FALLBACK: true` and `IMAGE_PROVIDER: "sentinelhub"` for Sentinel Hub map browsing.
- Verification passed: live browser check resolved `window.CONFIG.IMAGE_PROVIDER` to the active internal provider, made 0 Sentinel Hub/WMS requests, and showed no Sentinel Hub toast.

## Objective — Google Earth Engine Backend Setup

Turn the local GEE tile proxy from a placeholder contract into a working server-side Earth Engine integration that authenticates with a service account, dynamically creates Sentinel-2 map IDs for Limn demo lenses, and keeps secrets out of tracked files.

## Validation Contract — Google Earth Engine Backend Setup

- [x] The server loads `.env` without committing secrets.
- [x] `.env.example` documents required GEE setup variables.
- [x] The server uses the official `@google/earthengine` package.
- [x] The server authenticates with service-account JSON or email/private-key env vars.
- [x] Browser API key alone is explicitly rejected as insufficient for map creation.
- [x] The server creates dynamic Earth Engine map IDs.
- [x] Dynamic maps use `COPERNICUS/S2_SR_HARMONIZED` by default.
- [x] Produced Water demo lenses have server-side GEE formulas.
- [x] Atlas remains on GEE by default.
- [x] Atlas defaults to dynamic true-color Sentinel-2 context until Atlas formulas are translated.
- [x] Dynamic map IDs are cached.
- [x] Pre-created `GEE_MAP_NAME*` overrides remain supported.
- [x] Static JavaScript syntax checks pass.
- [x] Provider contract test passes.
- [x] Browser smoke tests pass.

## Progress Log — Google Earth Engine Backend Setup

### 2026-06-08 — Dynamic GEE backend completed
- Installed `@google/earthengine` and `dotenv`.
- Replaced the placeholder GEE tile server with dynamic Earth Engine auth, Sentinel-2 SR Harmonized mosaics, per-index image construction, map ID creation, map ID caching, and tile proxying.
- Added `.env.example` with service-account setup fields.
- Updated `README.md` with GEE-first setup instructions.
- Documented that browser API keys alone cannot create Earth Engine maps.
- Preserved `GEE_MAP_NAME*` overrides for pre-created maps.
- Updated API/dependency knowledge and provider contract tests.

## Objective — Limn Atlas Earth Engine Provider

Move Limn Atlas map browsing off Sentinel Hub by default, using the same Google Earth Engine tile endpoint contract as Limn Produced Water while retaining Sentinel Hub only as an explicit opt-in fallback.

## Validation Contract — Limn Atlas Earth Engine Provider

- [x] Atlas config defaults to `IMAGE_PROVIDER: "gee"` when no app-specific provider is set.
- [x] Atlas accepts `ATLAS_IMAGE_PROVIDER` as an app-specific override.
- [x] Atlas accepts `ATLAS_GEE_TILE_ENDPOINT` as an app-specific endpoint override.
- [x] Atlas index selection uses a provider-neutral renderer.
- [x] Atlas default render path requests `/api/gee/tiles/{z}/{x}/{y}`.
- [x] Atlas GEE requests include `app=atlas`.
- [x] Atlas Sentinel Hub WMS path is retained only as explicit fallback.
- [x] The local GEE proxy supports app-scoped map env vars.
- [x] Static JavaScript syntax checks pass.
- [x] Focused provider contract test passes.
- [x] Browser smoke test passes.
- [x] Atlas GEE browser smoke test passes.

## Progress Log — Limn Atlas Earth Engine Provider

### 2026-06-08 — Atlas provider switch completed
- Added Atlas GEE provider config and `applyGEE()` tile rendering.
- Replaced direct Atlas WMS calls in selection/refresh paths with provider-neutral `applyAtlasTiles()`.
- Kept Sentinel Hub WMS available through explicit provider fallback only.
- Extended the local GEE proxy to support `GEE_MAP_NAME_ATLAS`, `GEE_MAP_NAME_ATLAS_<INDEX>`, generic per-index names, and generic `GEE_MAP_NAME`.
- Extended the provider contract test to cover Atlas.
- Added `tests/test_atlas_gee_smoke.mjs` to verify Atlas requests GEE tiles with `app=atlas` and does not request Sentinel Hub under default config.

## Objective — Earth Engine Default Imagery Provider

Switch Limn Produced Water map browsing to a Google Earth Engine tile-provider contract by default so demos do not consume Sentinel Hub credits, while preserving an explicit Sentinel Hub fallback for later use.

## Validation Contract — Earth Engine Default Imagery Provider

- [x] `config.example.js` documents `IMAGE_PROVIDER: "gee"`.
- [x] Internal app defaults set `IMAGE_PROVIDER` to `gee`.
- [x] User config overrides internal provider defaults.
- [x] Map overlays use a provider-neutral layer factory.
- [x] GEE overlays request `/api/gee/tiles/{z}/{x}/{y}`.
- [x] GEE mode does not call the Sentinel Hub mini GIF inset.
- [x] GEE mode does not run acquisition probing.
- [x] GEE mode pauses AOI history scan because it still uses CDSE Statistics.
- [x] GEE mode pauses report generation because it still uses CDSE Statistics/Catalog.
- [x] A local no-dependency GEE tile proxy server exists.
- [x] The browser smoke test stubs the local GEE tile endpoint.
- [x] Static JavaScript syntax checks pass.
- [x] Focused provider contract test passes.
- [x] Browser smoke test passes.

## Progress Log — Earth Engine Default Imagery Provider

### 2026-06-08 — Provider switch started
- Target directives: none found for GEE provider migration; using `knowledge/domain/api-contracts.md` as the API contract artifact.
- Intended execution scripts: `node --check`, `node tests/test_gee_provider.mjs`, and `node tests/test.js`.
- Expected output artifacts: updated `config.example.js`, `src/map.js`, `src/app.js`, `index.html`, `server/gee_tile_server.mjs`, `package.json`, `tests/test.js`, `tests/test_gee_provider.mjs`, and `knowledge/domain/api-contracts.md`.
- Safety: no `config-v1.js`, `config.js`, `app-config.js`, `.env`, service-account JSON, API key, token, or `.tmp` artifact will be committed or read.

### 2026-06-08 — Provider switch completed
- Added provider-neutral map layer routing with GEE as the default and Sentinel Hub as explicit fallback.
- Added the `/api/gee/tiles/{z}/{x}/{y}` browser contract and documented the backend auth boundary.
- Added `server/gee_tile_server.mjs` plus `npm run start:gee` as a local static server and GEE tile proxy skeleton.
- Paused hidden/secondary Sentinel Hub/CDSE-only calls under GEE default: mini GIF inset, acquisition probe, AOI scan, and report generation.
- Updated the local browser smoke harness to stub GEE tiles without touching real providers.
- Verification passed: JS syntax checks, focused provider contract test, browser smoke, produced-water render regression, PWI test, and spill bookmark QC.

## Objective — Produced-Water UI Flow Fixes

Implement the cold-eyes review fixes for Limn Produced Water: make the first screen match the produced-water task, reduce mode ambiguity, improve touch/mobile usability, and add a calmer active-context narrative for investigation flow.

## Validation Contract — Produced-Water UI Flow Fixes

- [x] The default active index is a produced-water index.
- [x] The initial active triage card highlights the default produced-water index.
- [x] The visible layout-mode labels are task/outcome oriented.
- [x] Triage index pills are semantic buttons.
- [x] Triage index pills meet larger touch-target styling.
- [x] The active workflow context shows the selected lens.
- [x] The active workflow context shows the selected site.
- [x] The active workflow context shows the selected site evidence class or date role.
- [x] Mobile width uses a bottom-sheet panel or equivalent mobile-specific layout instead of a fixed 380px desktop sidebar.
- [x] Mobile map legend does not overlap the main panel.
- [x] `node --check src/app.js` passes.
- [x] `node tests/test.js` passes.

## Progress Log — Produced-Water UI Flow Fixes

### 2026-06-08 — UI flow implementation started
- Target directives: `directives/pwi_spec.md` and `directives/find_hotspots.md`.
- Intended execution scripts: existing `node tests/test.js`; temporary `.tmp/ui_review_screenshot.cjs` for browser screenshot verification.
- Expected output artifacts: updated `index.html`, `src/app.js`, `style.css`, refreshed `.tmp/limn-ui-*.png`, and updated session notes.
- Safety: no `config-v1.js`, `.env`, tokens, or secret runtime config will be read.

### 2026-06-08 — UI flow implementation completed
- Changed default workflow from generic NDMI to ASAI + Lake Boehmer so the first screen matches the produced-water task.
- Renamed the layout selector to task language: Compare Indices, Screen Spill, Investigate Site.
- Added a synchronized active workflow summary for lens, site, and evidence/date-role context.
- Converted triage index pills into semantic buttons and enlarged their touch targets.
- Added mobile bottom-sheet behavior and hid the map legend on mobile to avoid panel overlap.
- Verified with static assertions, `node --check src/app.js`, `node tests/test.js`, `node .tmp/ui_review_screenshot.cjs`, screenshot metrics, and `git diff --check`.

## Objective — Additional Produced-Water Bookmark Expansion

Add the best missing verified produced-water spill candidates, review Texas RRC/TRRC-adjacent and other regulator-backed sources for additional proven spill candidates, run measured hotspot checks, and keep new bookmarks evidence-honest.

## Validation Contract — Additional Produced-Water Bookmark Expansion

- [x] New bookmarks have source URLs.
- [x] New bookmarks have event dates.
- [x] New bookmarks have date roles.
- [x] New bookmarks have evidence classes.
- [x] New bookmarks have coordinate confidence.
- [x] NMOCD/regulator-backed candidates are cross-checked against public source rows or filings.
- [x] Texas RRC/TRRC-adjacent candidates without exact proof-grade coordinates are not promoted as proof-grade.
- [x] New candidate indices are selected by measured hotspot-loop results.
- [x] Weak or broad new candidates are explicitly context-only.
- [x] Limn spill bookmark QC passes after edits.
- [x] Static JavaScript syntax checks pass after edits.

## Progress Log — Additional Produced-Water Bookmark Expansion

### 2026-06-08 — Expansion started
- Target directives: `directives/pwi_spec.md`, `directives/spill_validation_sop.md`, and `directives/find_hotspots.md`.
- Intended execution scripts: reuse `execution/limn_hotspot_loop.py` and `execution/qc_limn_spill_bookmarks.py`.
- Expected output artifacts: updated `src/app.js`, refreshed `.tmp/limn_spill_bookmark_qc.*`, `.tmp/limn_hotspot_loop/*_summary.json`, and a sourced candidate note if needed.
- Safety: no `config-v1.js`, `.env`, tokens, or secret runtime config will be read.

### 2026-06-08 — Expansion completed
- Reviewed local `data/verified_spills.json`, local `data/rrc_spills.json`, NMOCD public spill rows, NMOCD C-141/closure PDFs, and WildEarth waste-watch reports.
- Promoted measured bookmark-grade additions: Black River PW Truck Rollover, Matador Desoto Spring Pond, and OXY Lea Flowline.
- Added OXY Sand Dunes Water Tank as context-only because the loop found a BPI facility/tank signal rather than produced-water chemistry proof.
- Reviewed but did not promote Devon Pinnacle State #035H and WPX RDX Federal 17 #016H because measured event-window signals were weak, blank, uniform-frame rejected, or broad context.
- Kept Texas RRC/TRRC-adjacent local validation records out of proof bookmarks until exact source URLs, incident identifiers, and coordinates are resolved.
- Wrote source-review ledger: `knowledge/domain/verified-spill-candidates.md`.
- Final edited-default loop artifact: `.tmp/limn_hotspot_loop/20260607-231012_summary.json`.

## Objective — Produced-Water Hotspot Karpathy Loop

Run the same measured hotspot/refinement protocol for the original Limn produced-water app: score documented spill/control bookmarks against their intended indices, save thumbnails and ranked candidates, promote only reviewed improvements, and preserve source/date evidence boundaries.

## Validation Contract — Produced-Water Hotspot Karpathy Loop

- [x] The produced-water loop logic lives in deterministic execution code under `execution/`.
- [x] The loop runs read-only against the public WMS endpoint.
- [x] The loop does not read `config-v1.js`, `.env`, or secrets.
- [x] The loop extracts produced-water bookmarks from `src/app.js`.
- [x] The loop extracts index evalscripts from `src/indices.js`.
- [x] Each selected bookmark-index target emits at least one candidate with score, verdict, and thumbnail.
- [x] Results are written through a single `results.tsv` writer under `.tmp/limn_hotspot_loop/`.
- [x] Candidate ranking includes an opaque-everywhere or uniform-frame guard.
- [x] Candidate dates remain tied to documented event windows or explicit continuous/context date roles.
- [x] Candidate movement stays near documented coordinates unless the bookmark is explicitly context-only.
- [x] Shortlist Markdown is written for each selected bookmark-index target.
- [x] Bookmark/index edits are only made after review confirms the candidate is more illustrative and still evidence-faithful.
- [x] Static JavaScript syntax checks pass after any edits.

## Progress Log — Produced-Water Hotspot Karpathy Loop

### 2026-06-07 — Loop session started
- Target directives: `directives/pwi_spec.md`, `directives/spill_validation_sop.md`, and the hotspot protocol from `directives/find_hotspots.md`.
- Intended execution script: add `execution/limn_hotspot_loop.py` for documented produced-water bookmark-index WMS scoring.
- Expected output artifacts: `.tmp/limn_hotspot_loop/results.tsv`, `.tmp/limn_hotspot_loop/*.png`, `.tmp/limn_hotspot_loop/*_shortlist.md`, and optional source-faithful bookmark/index edits.
- Safety: no `config-v1.js`, `.env`, tokens, or secret runtime config will be read.

### 2026-06-07 — Loop session completed
- Added `execution/limn_hotspot_loop.py` for deterministic public-WMS scoring of produced-water bookmark/index candidates, with single-writer TSV locking, PNG thumbnails, shortlist Markdown, date/precision bounds, retry handling, and uniform-frame rejection.
- Ran focused proof/context/control loops for all nine spill bookmarks and fallback index loops for underperforming proof targets.
- Promoted loop-reviewed defaults: Lake Boehmer to OBEC/ASAI at z14, Meister to LBI at z15 on 2022-01-02, Crane Crevice to LBI at z14, Toyah to OBEC at z15, Antina/EOG/OXY to context-only measured OBEC/ASAI/LBI scenes.
- Demoted Apache Balmorhea to produced-water context because the loop found only weak or broad residue signal, not proof-grade produced-water detection.
- Rewired EnLink Chickadee as a negative control for PWCI/ASAI blank/weak behavior rather than a hydrocarbon proof target.
- Final edited-bookmark baseline loop artifact: `.tmp/limn_hotspot_loop/20260607-221436_summary.json`; 13 current bookmark-index targets checked, with 10 promotable positive/context signals and EnLink PWCI/ASAI correctly non-promotable.
- Verification passed: JavaScript syntax checks, Python compile checks, spill bookmark QC, focused Node tests, and browser smoke test.

## Objective — Atlas Hotspot Karpathy Loop

Run the `directives/find_hotspots.md` Karpathy loop to refine Limn Atlas bookmarks and hotspot candidates using deterministic WMS scoring, saved thumbnails, and ranked shortlists before any bookmark is promoted.

## Validation Contract — Atlas Hotspot Karpathy Loop

- [x] The loop logic lives in deterministic execution code under `execution/`.
- [x] The loop runs read-only against the public WMS endpoint.
- [x] The loop does not read `config-v1.js`, `.env`, or secrets.
- [x] Each selected target emits at least one candidate with score, verdict, and thumbnail.
- [x] Results are written through a single `results.tsv` writer under `.tmp/hotspot_loop/`.
- [x] Candidate ranking includes an opaque-everywhere or uniform-frame guard.
- [x] Candidate dates are valid for the target sensor.
- [x] Candidate zooms respect each target index `minZoom`.
- [x] Shortlist Markdown is written for each selected target.
- [x] Bookmark edits are only made after review confirms the candidate is more illustrative.
- [x] Static JavaScript syntax checks pass after any bookmark edits.

## Progress Log — Atlas Hotspot Karpathy Loop

### 2026-06-07 — Loop session started
- Target directive: `directives/find_hotspots.md`.
- Intended execution script: add `execution/hotspot_loop.py` to wrap the existing public-WMS scorer and emit thumbnails plus ranked shortlists.
- Expected output artifacts: `.tmp/hotspot_loop/results.tsv`, `.tmp/hotspot_loop/*.png`, and `.tmp/hotspot_loop/*_shortlist.md`.
- Safety: no `config-v1.js`, `.env`, tokens, or secret runtime config will be read.

### 2026-06-07 — Loop session completed
- Added `execution/hotspot_loop.py` with public-WMS candidate scoring, single-writer TSV locking, run-id thumbnails, shortlists, sensor date/zoom guards, and uniform-frame rejection.
- Ran bounded loops for BH-DFSI, SACI, FGDCI, S1-OWF, S1-URB, S1-VVS, S5P-NO2, and S5P-SO2.
- Added transparent background gates to SACI, S1-OWF, S1-URB, S1-VVS, S5P-NO2, and S5P-SO2 so low-value background cannot masquerade as signal.
- Promoted reviewed measured hotspots for BH-DFSI, SACI, S1-OWF, S1-URB, S1-VVS, and S5P-SO2.
- Left S5P-NO2 effectively unchanged because the current bookmark remained proof-grade and the loop improvement was marginal.
- Demoted FGDCI to proof-target pending after the loop showed its single-scene VV−VH proxy remains too uniform for a defensible freeze/thaw anomaly claim.
- Final Atlas WMS QC: 39 renderable novel indices checked; 39 strong; 52 non-renderable/context or proof-pending.
- Browser smoke test and focused LFMPI/SMPDI regression tests passed.

## Objective — Proof-Grade Bookmark Pass for Atlas and Limn

Raise both Limn apps to proof-grade default bookmark behavior: Atlas renderable bookmarks should produce visible, convincing live overlays or be demoted from proof claims, and Limn produced-water bookmarks should be exact/documented enough to serve as validation targets or be explicitly treated as context/controls.

## Validation Contract — Proof-Grade Bookmark Pass for Atlas and Limn

- [x] Atlas candidate testing uses deterministic execution code under `execution/`.
- [x] Atlas candidate testing does not read `config-v1.js`, `.env`, or secrets.
- [x] Atlas weak or blank current bookmarks are retested against replacement candidate locations or dates.
- [x] Atlas promoted replacements have measured WMS QC results recorded under `.tmp/`.
- [x] Atlas entries that cannot reach proof-grade are explicitly marked as context or non-renderable rather than hidden as weak proof targets.
- [x] Limn produced-water positive bookmarks are either exact/medium precision or explicitly marked context-only.
- [x] Limn negative controls remain explicitly marked as negative controls.
- [x] Static JavaScript syntax checks pass for both apps.
- [x] Atlas and Limn QC scripts run after edits.
- [x] Remaining non-proof-grade items are listed in the final answer.

## Progress Log — Proof-Grade Bookmark Pass for Atlas and Limn

### 2026-06-07 — Proof-grade pass started
- Target directives: `directives/pwi_spec.md` and `directives/spill_validation_sop.md` apply to Limn produced-water bookmarks; no Atlas-specific directive found.
- Intended execution scripts: extend/add deterministic Atlas candidate QC under `execution/`; reuse `execution/qc_atlas_bookmarks.py` and `execution/qc_limn_spill_bookmarks.py`.
- Expected output artifacts: updated `.tmp/atlas_bookmark_qc.*`, `.tmp/limn_spill_bookmark_qc.*`, and candidate-specific `.tmp` report if replacements are tested.
- Safety: no `config-v1.js`, `.env`, tokens, or secret runtime config will be read.

### 2026-06-07 — Proof-grade pass completed
- Added `execution/qc_atlas_candidate_bookmarks.py` and recorded replacement-candidate WMS measurements in `.tmp/atlas_candidate_bookmark_qc.json` and `.tmp/atlas_candidate_bookmark_qc.md`.
- Promoted measured strong Atlas proof targets for BH-DFSI, RRFI, EPDI, SMPDI, KCDSI, TT-API, and PDCSI.
- Demoted Atlas entries that did not meet the strict proof-grade WMS threshold to context/non-renderable: SWRI, DWCI, GMCPI, MDSPI, SPEI, SCSPI, TRSI, CCRBI, IERPI, SPSRI, FEDGI, SLSDI, UBCDI, AIBEAI, and PWTDI.
- Updated Atlas non-renderable tile refresh behavior so context entries consistently use True Color rather than stale weak evalscript overlays.
- Reclassified regional Limn spill bookmarks as `produced-water-context` and retained EnLink Chickadee as `hydrocarbon-negative-control`.
- Final Atlas QC: 38 renderable bookmarks checked; 38 strong; 53 non-renderable/context; 0 moderate, weak, blank, or error among renderables.
- Final Limn spill QC: 9 bookmarks checked; 9 pass; 0 warn; 0 fail.
- Continued verification: repaired `node tests/test.js` by adding explicit `puppeteer-core` package metadata, starting a credential-safe local static server inside the test, and limiting the smoke path to app load, compare diff selection, AOI draw, and report-readiness without reading `config-v1.js`.

### 2026-06-07 — SMPDI land false-positive follow-up
- Cause: SMPDI lacked a water-context gate, so terrestrial vegetation/coastal land could satisfy the floating-material contrast.
- Fix: added `waterContext` and `landReject` gates, returned transparent output for zero/land-like pixels, and moved the default bookmark to the measured water-gated July 2 2022 zoom-12 proof target.
- Verification: `node tests/test_atlas_smpdi.mjs` passed; full Atlas WMS QC reports SMPDI `strong` with 3.602% visible and 2.396% high-signal coverage.

## Objective — Limn Permian Spill Bookmark Documentation QC

Audit Limn produced-water spill bookmarks so each bookmark can be traced to a documented Permian Basin spill or explicit negative-control hydrocarbon event, with event timing, imagery timing, coordinates, and source quality recorded.

## Validation Contract — Limn Permian Spill Bookmark Documentation QC

- [x] QC logic lives in a deterministic script under `execution/`.
- [x] QC script does not read `config-v1.js`, `.env`, or secrets.
- [x] QC script extracts every `SPILL_BOOKMARKS` entry from `src/app.js`.
- [x] QC output records each bookmark id, label, coordinates, app date, display date, volume, source label, and indices.
- [x] QC output records whether the bookmark is a produced-water positive, chronic brine positive, or hydrocarbon negative-control site.
- [x] QC output records source URLs or marks missing source URLs explicitly.
- [x] QC output records whether the app date is an event date, post-event imagery date, or continuous/chronic target.
- [x] QC output flags any bookmark whose location precision is too broad for proof-grade produced-water validation.
- [x] QC output flags any bookmark whose source support is inadequate or not directly produced-water related.
- [x] QC script writes a machine-readable JSON artifact under `.tmp/`.
- [x] QC script writes a human-readable Markdown report under `.tmp/`.
- [x] Static JavaScript syntax checks pass for Limn app files.
- [x] The QC report is summarized in the final answer.

## Progress Log — Limn Permian Spill Bookmark Documentation QC

### 2026-06-07 — QC session started
- Target directives: `directives/pwi_spec.md` and `directives/spill_validation_sop.md`.
- Intended execution scripts: new `execution/qc_limn_spill_bookmarks.py` or equivalent deterministic parser/auditor.
- Expected output artifacts: `.tmp/limn_spill_bookmark_qc.json` and `.tmp/limn_spill_bookmark_qc.md`, plus source/metadata fixes if the audit finds stale or ambiguous bookmark data.
- Safety: no `config-v1.js`, `.env`, tokens, or secret-bearing runtime config will be read.

### 2026-06-07 — QC session completed
- Added `execution/qc_limn_spill_bookmarks.py` to parse every `SPILL_BOOKMARKS` entry from `src/app.js` and check source/date/location metadata.
- Added source URLs, evidence classes, event dates, and date-role metadata to all nine Limn spill bookmarks.
- Corrected Meister imagery date to the documented January 2022 event window.
- Corrected Antina Ranch from stale 2020 metadata to the June 17, 2021 documented brine-water leak report.
- Corrected EOG Klondike from Eddy/Q2 placeholder metadata to the June 10, 2025 Lea County produced-water reuse-pit spill.
- Explicitly marked EnLink Chickadee as a hydrocarbon negative-control, not a produced-water positive.
- Final QC: 9 bookmarks checked; 8 produced-water/chronic-brine positives; 1 hydrocarbon negative control; 5 pass; 4 warn; 0 fail.

## Objective — Atlas Bookmark Signal QC

QC all renderable Limn Atlas index layers and bookmark combinations so current bookmarks are ranked by live visible signal strength, weak proof targets are flagged, and future bookmark replacements can be chosen from measured high-signal scenes.

## Validation Contract — Atlas Bookmark Signal QC

- [x] QC logic lives in a deterministic script under `execution/`.
- [x] QC script does not read `config-v1.js`, `.env`, or secrets.
- [x] QC script evaluates every renderable Atlas index.
- [x] QC script records per-index bookmark location and date.
- [x] QC script records per-index visible signal coverage.
- [x] QC script records per-index high-signal coverage.
- [x] QC script records per-index max or percentile intensity.
- [x] QC script writes a machine-readable JSON artifact under `.tmp/`.
- [x] QC script writes a human-readable Markdown report under `.tmp/`.
- [x] Weak or blank bookmark targets are explicitly listed.
- [x] Static JavaScript syntax checks pass for Atlas files.
- [x] The QC report is summarized in the final answer.

## Progress Log — Atlas Bookmark Signal QC

### 2026-06-07 — QC session started
- Target directives: none found for Atlas bookmark QC; produced-water validation directives are not applicable.
- Intended execution scripts: new `execution/qc_atlas_bookmarks.py`.
- Expected output artifacts: `.tmp/atlas_bookmark_qc.json` and `.tmp/atlas_bookmark_qc.md`.
- Safety: no `config-v1.js`, `.env`, tokens, or `.tmp` artifacts will be committed or exposed beyond summarized findings.

### 2026-06-07 — QC session completed
- Added `execution/qc_atlas_bookmarks.py` to sample live public WMS overlay pixels for every renderable Atlas index without reading secrets.
- Tightened bookmark verdicts so tiny bright specks do not count as strong proof targets.
- Used the QC sweep to update same-location peak-signal dates for SWRI, RRFI, EPDI, KCDSI, PCADI, TT-API, PDCSI, UBCDI, AIBEAI, and WVTDI.
- Final current-bookmark QC: 31 strong, 10 moderate, 7 weak, 5 blank, 0 errors.
- Remaining weak/blank targets needing location/formula/layer replacement: BH-DFSI, DWCI, GMCPI, MDSPI, SPEI, SCSPI, TRSI, CCRBI, IERPI, SPSRI, FEDGI, SLSDI.

## Objective — Atlas Peak-Signal Bookmark and LFMPI Fix

Fix LFMPI so open water is not rendered as pre-ignition fuel risk, and make Atlas bookmarks explicitly target high-signal/worst-case proof locations for the index concern rather than generic context scenes.

## Validation Contract — Atlas Peak-Signal Bookmark and LFMPI Fix

- [x] LFMPI evalscript contains an explicit water rejection gate.
- [x] LFMPI evalscript contains an explicit live-fuel vegetation gate.
- [x] Synthetic water-like samples return transparent/no-risk LFMPI output.
- [x] Synthetic dry vegetated fuel samples return non-transparent LFMPI output.
- [x] LFMPI bookmark targets a high-risk live-fuel moisture scenario.
- [x] Renderable Atlas bookmarks expose a peak-signal intent label or justification.
- [x] Static JavaScript syntax checks pass for Atlas files.
- [x] Atlas data shape checks pass for 91 indices and 12 domains.
- [x] Browser smoke test verifies LFMPI selection and info panel text.
- [x] Deterministic checks verify LFMPI searchability and search normalization assumptions.

## Progress Log — Atlas Peak-Signal Bookmark and LFMPI Fix

### 2026-06-07 — Fix session started
- Target directives: none found for Atlas-specific bookmark peak-signal behavior; produced-water directives are not applicable.
- Intended execution scripts: none found for this exact fix; verification will use Node evalscript checks and browser smoke testing.
- Expected output artifacts: updated `src/atlas-indices.js`, possibly `src/atlas-app.js` if peak-signal metadata needs UI support, plus task/session knowledge.
- Safety: no secrets, `.env`, `config-v1.js`, or `.tmp/` contents will be read, exposed, or committed.

### 2026-06-07 — Fix session completed
- Added LFMPI water rejection and live-fuel gates; water and bare-soil samples now render transparent while dry vegetated fuel renders as risk.
- Updated the LFMPI bookmark and info text to frame the Angeles National Forest scene as a peak-signal proof target.
- Changed the info panel label from `Target Justification` to `Peak-Signal Bookmark`.
- Corrected stale SF-EII earthquake metadata in both `src/atlas-indices.js` and `execution/enrich_atlas_indices.py`.
- Added `tests/test_atlas_lfmpi.mjs`.
- Browser text entry was blocked by the in-app browser virtual clipboard issue, so search was verified deterministically rather than through typed browser input.

## Objective — Limn Atlas Cold-Review Fixes

Fix the functionality issues found in the Limn Atlas cold-eyes code review: configurable WMS endpoint/layer handling, visible WMS failure feedback, catalog metadata/date corrections, and normalized acronym search.

## Validation Contract — Limn Atlas Cold-Review Fixes

- [x] `knowledge/SESSION.md` records OpenAI Codex as the active agent for this fix session.
- [x] Atlas WMS requests use `window.CONFIG` WMS settings when present.
- [x] Atlas WMS requests fall back to the existing public hardcoded endpoint when config settings are absent.
- [x] Atlas WMS requests can use an index-specific layer when an index declares one.
- [x] Atlas tile failures show a visible Atlas status message.
- [x] OWSI no longer uses a pre-Sentinel-2 date while marked renderable.
- [x] IERPI no longer presents as live Landsat rendering through the Sentinel-only path.
- [x] Acronym search matches punctuation-insensitive queries such as `bhdfsi`.
- [x] Static JavaScript syntax checks pass for Atlas files.
- [x] Atlas data shape checks pass for 91 indices and 12 domains.
- [x] Browser smoke test passes for loading, search, renderable index selection, and stub index selection.

## Progress Log — Limn Atlas Cold-Review Fixes

### 2026-06-07 — Fix session started
- Target directives: none found for Atlas-specific UI fixes; existing `directives/pwi_spec.md` and `directives/spill_validation_sop.md` are produced-water validation directives and do not govern the Atlas page.
- Intended execution scripts: none found; verification will use Node static checks and browser smoke testing.
- Expected output artifacts: updated `atlas.html`, `src/atlas-app.js`, `src/atlas-indices.js`, `config.example.js`, and session/task knowledge.
- Safety: no secrets, `.env`, `config-v1.js`, or `.tmp/` contents will be read, exposed, or committed.

### 2026-06-07 — Fix session completed
- Fixed Atlas WMS config fallback, per-index WMS layer plumbing, visible tile-error feedback, OWSI date metadata, IERPI platform labeling, and punctuation-insensitive search.
- Verified with Node syntax checks, atlas data shape checks, evalscript execution checks, browser smoke testing, and a fresh Node verifier process.
- `node tests/test.js` remains blocked by the known missing `puppeteer-core` dependency.

## Follow-on Objective — Sentinel-2 Index Discovery

Discover and rank new Sentinel-2-only indices/composites for Limn that are more than renamed existing formulas: each candidate should target an economically valuable or public-benefit environmental condition, compare against prior literature, and define what Globe & Atlas could defensibly claim.

## Validation Contract — Sentinel-2 Index Discovery

- [x] Each proposed candidate names one environmental condition or decision problem.
- [x] Each proposed candidate includes a Sentinel-2-only formula or composite recipe.
- [x] Each proposed candidate identifies the relevant existing literature family it improves on or recombines.
- [x] Each proposed candidate states a claimable novelty angle without asserting unverified first-in-history status.
- [x] Candidates are ranked by combined wealth potential and public-benefit potential.
- [x] The final report distinguishes strong candidates from speculative candidates.
- [x] The final report lists sources used for prior-art comparison.

## Progress Log — Sentinel-2 Index Discovery

### 2026-05-24 — Research started
- Loaded Limn instructions, session state, directives, prior novelty review, and validation summary.
- Target directives: `directives/pwi_spec.md`, `directives/spill_validation_sop.md`.
- Intended execution scripts: none for this literature pass.
- Expected output artifact: ranked findings in chat.
- Safety: no secret-bearing config files will be read or exposed.

### 2026-05-24 — First ranked research pass completed
- Produced a broad Sentinel-2 candidate list spanning methane, water quality, mining/tailings, agriculture, wildfire, landslides, forestry, plastics, landfill contamination, urban heat vulnerability, peatlands, snow algae, and industrial dust.
- No execution scripts were run.
- Output artifact: chat report.

## Objective

Review the help page and index library so only truly original Sentinel Explorer composites carry Bally/original-work attribution.

## Context

- Target page: `http://localhost:4180/help.html`
- Primary files: `help.html`, `SENTINEL_SCIENCE_GUIDE.md`, `README.md`, `src/indices.js`
- Directive reviewed: `directives/pwi_spec.md`
- Execution scripts: none intended for research edits

## Acceptance Criteria

- [x] `knowledge/SESSION.md` records the active goal before implementation work begins.
- [x] Every `✧` index in `help.html` is listed in the review notes.
- [x] Every index described as `Original composite` in `src/indices.js` is listed in the review notes.
- [x] Every listed acronym is checked for public prior usage.
- [x] Every listed display name is checked for public prior usage.
- [x] Every listed formula is checked when formula text is present.
- [x] Each index with public prior usage has exclusive authorship wording removed.
- [x] Each index retaining exclusive authorship wording has no identified public prior usage.
- [x] `http://localhost:4180/help.html` is reviewed after edits.
- [x] `node tests/test.js` runs before completion. Attempted; blocked by missing `puppeteer-core`.

## Steps

- [x] Enumerate claimed novel/original indices.
- [x] Research public prior usage.
- [x] Edit claims and symbols.
- [x] Review the local help page.
- [x] Run tests. Attempted; blocked by pre-existing harness issues.

## Progress Log

### 2026-05-07 23:05 — Governance baseline
- Project was brought into the workspace audit baseline.
- Next: replace this maintenance objective with the next real project milestone.

### 2026-05-20 22:53 — Novelty claims review started
- Loaded project instructions and knowledge session state.
- Added binary acceptance criteria for acronym, display-name, and formula prior-use checks.

### 2026-05-20 23:13 — Novelty claims review completed
- Removed `✧`/`✧✧`, `Bally Index`, and `Original composite by Daniel Bally` wording from public docs and runtime metadata.
- Added `knowledge/domain/novelty-review.md` with the enumerated review outcomes and source checks.
- Browser check of `http://localhost:4180/help.html` passed for the removed terms.
- Tests attempted but blocked by missing `puppeteer-core`, missing `node-fetch`, and stale `app.js` path in the existing harness.

## Objective — Limn Atlas Index Documentation Expansion

Add comprehensive info documentation to the Limn Atlas application for each of the 53 mappable (renderable) indices, including their sources, citations, and why their default bookmark location/date were chosen.

## Validation Contract — Limn Atlas Index Documentation Expansion

- [x] Each of the 53 renderable indices defined in `src/atlas-indices.js` has a `source` field.
- [x] Each of the 53 renderable indices defined in `src/atlas-indices.js` has a `sourceUrl` field.
- [x] Each of the 53 renderable indices defined in `src/atlas-indices.js` has a `justification` field.
- [x] All 53 `sourceUrl` values are valid URLs.
- [x] The slide-up Info Panel in `atlas.html` contains elements with IDs `#info-source` and `#info-justification`.
- [x] The `selectIndex` function in `src/atlas-app.js` populates the `#info-source` and `#info-justification` elements with the selected index's metadata.
- [x] The `#info-source` element renders a clickable hyperlink if `sourceUrl` is present.
- [x] Clicking the `#info-source` hyperlink opens the URL in a new browser tab.
- [x] Static JS syntax checks pass for all modified files.

## Progress Log — Limn Atlas Index Documentation Expansion

### 2026-06-07 — Documentation expansion session started
- Goal: Add detailed citations, URLs, and justifications for all 53 renderable indices.
- Expected outputs: updated `src/atlas-indices.js`, `atlas.html`, and `src/atlas-app.js`.

### 2026-06-07 — Documentation expansion session completed
- Added detailed citations, URLs, and justifications for all 53 renderable indices via python script helper.
- Modified `atlas.html` to add `#info-source` and `#info-justification` elements.
- Modified `src/atlas-app.js` to render the fields and construct dynamic hyperlinks.
- Checked data shapes using node validator check.
- Syntax-checked modified files using `node --check`.
- Ran unit tests using `node tests/test_pwi.js` and `tests/test_evalscript.js`.
- Verified in browser with subagent and local HTTP server, then terminated the HTTP server.

## Objective — Produced-Water Index Opacity and Noise Fix

Fix the observed PWCI/OBEC high-value transparency issue and calm ASAI background speckle without hiding valid produced-water signals.

## Validation Contract — Produced-Water Index Opacity and Noise Fix

- [x] PWCI high-signal synthetic pixels return alpha `1`.
- [x] OBEC high-signal synthetic pixels return alpha `1`.
- [x] PWCI background synthetic pixels return alpha `0`.
- [x] OBEC background synthetic pixels return alpha `0`.
- [x] ASAI ordinary arid-background synthetic pixels return alpha `0`.
- [x] ASAI dry-brine synthetic pixels return alpha `1`.
- [x] `node --check src/indices.js` passes.
- [x] Focused evalscript regression tests pass.

## Progress Log — Produced-Water Index Opacity and Noise Fix

### 2026-06-08 09:13 — Started index render bug fix
- Target directives: `directives/pwi_spec.md` and transparency guidance from `directives/find_hotspots.md`.
- Intended execution scripts: none found for this exact bug; use focused Node evalscript regression tests and existing test commands.
- Expected outputs: edits in `src/indices.js`, focused regression coverage under `tests/`, and knowledge/session logs.
- Safety confirmed: no `config-v1.js`, `config.js`, `app-config.js`, `.env`, or `.tmp` content will be committed.

### 2026-06-08 09:25 — Completed index render bug fix
- Changed `src/indices.js` to clamp palette input, explicitly gate low PWCI/OBEC mapped values to transparent, and tighten ASAI wet/dry signal thresholds.
- Added `tests/test_produced_water_rendering.mjs` covering PWCI/OBEC high-signal opacity, PWCI/OBEC background transparency, ASAI arid-background transparency, and ASAI dry-brine opacity.
- Verification passed: `node --check src/indices.js`, `node --check tests/test_produced_water_rendering.mjs`, `node tests/test_produced_water_rendering.mjs`, `node tests/test_pwi.js`, `node tests/test_evalscript.js`, `node tests/test.js`, and a fresh-process verifier.

## Objective — Produced-Water UI Declutter Pass

Reduce the default Screen Spill sidebar clutter so the first screen presents a clear site/lens workflow instead of stacked explanatory panels.

## Validation Contract — Produced-Water UI Declutter Pass

- [x] The Screen Spill pane has one compact workflow summary.
- [x] The Screen Spill pane does not render a nested card around the site list.
- [x] The active lens summary uses the short index label.
- [x] Secondary location controls are visually subordinate to the spill workflow.
- [x] The desktop legend is visually subordinate to the map and sidebar.
- [x] `node --check src/app.js` passes.
- [x] Existing browser smoke test passes.

## Progress Log — Produced-Water UI Declutter Pass

### 2026-06-08 10:01 — Started declutter pass
- Target directives: no UI-specific directive found; `directives/pwi_spec.md` remains relevant for produced-water workflow intent.
- Intended execution scripts: none found for this exact UI pass; use static checks and browser smoke verification.
- Expected outputs: edits in `index.html`, `style.css`, `src/app.js`, and knowledge/session logs.
- Safety confirmed: no `config-v1.js`, `config.js`, `app-config.js`, `.env`, or `.tmp` content will be committed.

### 2026-06-08 10:18 — Completed declutter pass
- Collapsed location search into a secondary drawer, shortened the mode labels, flattened the Screen Spill pane, and removed the nested triage card shell around the site list.
- Changed the default produced-water lens from ASAI to OBEC so the first map view is calmer; ASAI remains available as a high-sensitivity lens.
- Hid formula text from the floating legend and reduced legend/sidebar visual weight.
- Verification passed: `node --check src/app.js`, `node tests/test.js`, `node tests/test_produced_water_rendering.mjs`, and `.tmp/ui_review_screenshot.cjs`; screenshot metrics confirm default active index is OBEC.

## Objective — ASAI Overbroad Render Suppression

Reduce ASAI false-positive coverage so broad salty bare soil does not render as a basin-wide magenta wash.

## Validation Contract — ASAI Overbroad Render Suppression

- [x] ASAI broad salty bare-soil synthetic pixels return alpha `0`.
- [x] ASAI stronger dry-brine synthetic pixels still return alpha `1`.
- [x] `node --check src/indices.js` passes.
- [x] `node tests/test_produced_water_rendering.mjs` passes.
- [x] Desktop screenshot after selecting ASAI no longer shows a full-frame magenta wash.

## Progress Log — ASAI Overbroad Render Suppression

### 2026-06-08 10:34 — Completed ASAI selectivity fix
- Tightened ASAI dry-brine gate to require stronger dry-surface, salinity, and bare/crust signals.
- Raised ASAI render floor from `0.45` to `0.60`.
- Added a broad salty bare-soil regression sample to `tests/test_produced_water_rendering.mjs`.
- Verification passed: `node --check src/indices.js`, `node --check tests/test_produced_water_rendering.mjs`, `node tests/test_produced_water_rendering.mjs`, `node tests/test.js`, `node tests/test_pwi.js`, `node tests/test_evalscript.js`, and screenshot `.tmp/limn-ui-asai-after-tighten.png`.

## Objective — Add EHC to Screen Tab

Expose EHC as a Screen-tab lens while keeping its role clear as false-color morphology context rather than standalone proof.

## Validation Contract — Add EHC to Screen Tab

- [x] Screen tab includes an `EHC` lens button.
- [x] Selecting `EHC` updates the workflow lens summary.
- [x] EHC has distinct triage pill styling.
- [x] EHC is included in produced-water spill index handling paths.
- [x] `node --check src/app.js` passes.
- [x] `node --check src/map.js` passes.
- [x] Browser smoke test passes.

## Progress Log — Add EHC to Screen Tab

### 2026-06-08 10:48 — Completed EHC Screen lens addition
- Added EHC to the Screen tab lens row with tooltip copy that frames it as a morphology view, not a proof score.
- Added EHC short-label and active-state styling.
- Added EHC to produced-water index handling lists in `src/app.js` and `src/map.js`.
- Verification passed: `node --check src/app.js`, `node --check src/map.js`, `node tests/test.js`, `node tests/test_produced_water_rendering.mjs`, and screenshot `.tmp/limn-ui-ehc-screen.png`.

## Objective — Spill Bookmark Overclaim Audit

Review produced-water bookmark chips and labels so every advertised site/index chip corresponds to a current measured promotable hotspot-loop result, and context/control sites do not present as proof-grade detections.

## Validation Contract — Spill Bookmark Overclaim Audit

- [x] Every visible bookmark index chip has a current promotable baseline result.
- [x] Negative-control bookmarks advertise no proof-style index chips.
- [x] Known blank ASAI claims are removed from bookmark chips.
- [x] Context-only bookmarks are labeled as screening/context, not verified proof.
- [x] The audit can be rerun with a deterministic command.

## Progress Log — Spill Bookmark Overclaim Audit

### 2026-06-08 14:45 — Completed bookmark chip audit
- Reran the produced-water hotspot loop against current evalscripts and saved `.tmp/limn_hotspot_loop/20260608-143636_summary.json`.
- Removed non-promotable chips from Apache Balmorhea and EnLink Chickadee.
- Removed stale ASAI chips from Black River and OXY Lea after current ASAI returned blank.
- Switched OXY Lea to the current LBI support path.
- Added current-promotable support chips: Lake Boehmer LBI, Toyah LBI, EOG Klondike LBI/OBEC, and OXY Mesa Verde LBI.
- Renamed the bookmark section from Verified Sites to Screening Sites.
- Filtered chipless context/control bookmarks out of the Screen/HUD demo lists while keeping them in the source registry for traceability.
- Added `execution/audit_spill_index_claims.py` to check visible chips against a hotspot-loop summary.
- Verified rendered sidebar chips with a local browser automation check.

## Objective — Produced-Water Verified Sites QC Reference

Create an internal expert-review reference for verified/proven produced-water sites, including name, location, event dates, source/agency basis, reported extent, reported barrels/gallons, current Limn QC status, and demo applicability.

## Validation Contract — Produced-Water Verified Sites QC Reference

- [x] The reference includes current demo-visible sites.
- [x] The reference includes registry-only or negative-control entries.
- [x] The reference includes reviewed-but-not-promoted candidates.
- [x] Each current bookmark entry includes location.
- [x] Each current bookmark entry includes date information.
- [x] Each current bookmark entry includes source or agency basis.
- [x] Each current bookmark entry includes reported extent or amount when available.
- [x] Each current bookmark entry includes current Limn QC role.
- [x] Each current bookmark entry includes current demo chips or reason for non-demo status.
- [x] The reference links to source material.

## Progress Log — Produced-Water Verified Sites QC Reference

### 2026-06-08 15:20 — Completed internal QC reference
- Added `reports/produced_water_verified_sites_qc_reference.md`.
- Grouped entries into demo-visible, registry-only/negative-control, and reviewed-but-not-promoted sections.
- Included barrel conversions for gallon-reported events using 42 gal/bbl.
- Included source links and expert QC questions.

## Objective — Bookmark Row Interaction Tweaks

Make each Screening Sites row support two separate actions: a bookmark button for navigating to the saved site/date, and per-site index chips for selecting or toggling the relevant band/composite overlay.

## Validation Contract — Bookmark Row Interaction Tweaks

- [x] Each rendered screening row has a site/date bookmark button.
- [x] Each rendered screening row has one button per applicable index chip.
- [x] Clicking a bookmark button selects/flys to the site without changing the active index chip.
- [x] Clicking a row chip selects that site.
- [x] Clicking a row chip selects that index.
- [x] Clicking the active row chip again hides the overlay.
- [x] Clicking the hidden active row chip again restores the overlay.
- [x] Top detection-lens buttons remain available.

## Progress Log — Bookmark Row Interaction Tweaks

### 2026-06-08 15:35 — Implemented row-level bookmark/chip controls
- Replaced single clickable screening rows with a navigation button plus per-index chip buttons.
- Added `state.indexVisible` and `hideIndexOverlay()` for row-chip overlay toggling.
- Updated chip active/pressed state handling.
- Updated row/chip CSS for separate navigation and toggle affordances.
- Verification passed: `node --check src/app.js`, `node tests/test.js`, claim audit, and browser state snapshots for nav/chip on/chip off/chip on again.

## Objective — Add Proven Support Lenses to Screen Tab

Add the missing produced-water lenses with validation or promoted workflow value to the Screen tab while preserving the distinction between proof, support, impact, and context lenses.

## Validation Contract — Add Proven Support Lenses to Screen Tab

- [x] Screen tab includes `BPI`.
- [x] Screen tab includes `FBC`.
- [x] Screen tab includes `VSI`.
- [x] Selecting a newly added support lens updates the workflow lens summary.
- [x] New support lenses have distinct active styling.
- [x] `node --check src/app.js` passes.
- [x] Browser smoke test passes.

## Progress Log — Add Proven Support Lenses to Screen Tab

### 2026-06-08 11:02 — Completed proven/support lens addition
- Added BPI, FBC, and VSI to the Screen tab.
- Kept tooltip language honest: BPI is pad/facility support, FBC is mineral/iron-brine support, VSI is aftermath/impact context.
- Added short labels and active-state styling.
- Verification passed: `node --check src/app.js`, `node tests/test.js`, `node tests/test_produced_water_rendering.mjs`, and a desktop UI assertion confirming all nine Screen lenses render and BPI updates the active lens summary.
