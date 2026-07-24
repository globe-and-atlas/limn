# Fix Hotspot Loop SCL Bug and Add Brine Calibration Site

Follow-up to the 2026-07-23 deep produced-water QC (artifact report; see `knowledge/DECISIONS.md` "Deep produced-water detection QC across all 13 spill bookmarks" and `knowledge/ERRORS.md` 2026-07-23 follow-up entry).

## Task 1 — Fix `execution/limn_hotspot_loop.py` SCL adaptation

The official spill re-validation script fails 100% of WMS requests with `HTTP 400: Collection 'S2L1C' has no band 'SCL'`. Its inline Node `materialize()` function (inside `load_targets()`) applies calibration placeholders and the VISUAL_FILTER/DETECTION_SENSITIVITY prefix but never calls `adaptEvalscriptForSentinelWms()` — the exact step the real app's `getScriptContent()` (`src/map.js`) uses to strip the L2A-only `SCL` band before sending to the public L1C `AGRICULTURE` WMS layer.

### Validation Contract — Task 1

- [ ] `materialize()` in `limn_hotspot_loop.py`'s embedded Node code imports and applies `adaptEvalscriptForSentinelWms(script, false)` as the final transform, matching `getScriptContent()`'s order (calibration → filter prefix → SCL adaptation).
- [ ] The emitted evalscripts contain no `'SCL'` band token and no `SCL_QA_START`/`SCL_QA_END` block.
- [ ] Running the focused baseline command from `knowledge/procedural/limn_hotspot_loop.md` returns `status: ok` (not `http-400`) for every renderable candidate — verified on at least the flagship indices at 2+ sites.
- [ ] No secrets are read; the script continues to use only the public WMS fallback endpoint and static source.

## Task 2 — Add new brine calibration site

User-provided: latitude **31.892457**, longitude **-101.864001**, wet brine activity **November–December 2025**. Add as a testing/calibration bookmark.

### Validation Contract — Task 2

- [ ] A new `SPILL_BOOKMARKS` entry exists in `src/app.js` at the given coordinates with a Nov–Dec 2025 date, all required metadata fields (`sourceUrl`/`sourceUrls`, `evidenceClass`, `eventDate`, `dateRole`, `confidence`), and an honest evidence class that reflects what the imagery actually shows (not an assumed `produced-water-positive` before measurement).
- [ ] The site is measured with the now-fixed hotspot loop across the flagship + supplementary indices at its stated date window; the strongest coherent-signal index (if any) is recorded.
- [ ] The bookmark's advertised `indices: [...]` chips reflect only what actually renders as a coherent (non-speckle) signal at the site, per the promotion rules in `knowledge/procedural/limn_hotspot_loop.md`. If nothing coherent renders, `indices: []` with a context/label that says so.
- [x] `python3 execution/qc_limn_spill_bookmarks.py` runs; all 13 pre-existing bookmarks still `pass`. The new calibration target is the sole expected `fail`, and only on the missing-source-URL rule — the correct, honest state for a user-reported observation with no public regulator filing. Not resolved by fabricating a citation (a Copernicus Browser link is explicitly disallowed as a numbered source per the 2026-06-16 rule in `verified-spill-candidates.md`). Flagged to the user rather than papered over.
- [ ] The measured result and coordinate/date provenance are recorded in `knowledge/domain/verified-spill-candidates.md`.
- [ ] No spill claim is asserted beyond what was measured; `confidence` reflects that the coordinates are user-supplied (not yet tied to a public regulator filing URL unless one is found).

## Notes / open questions

- No public source URL was provided for the new site. Per the TRRC/NMOCD review rule in `verified-spill-candidates.md`, a bookmark without a resolvable public filing/source is context-grade at best. Flag this to the user; do not fabricate a citation.
