# Debugging — Sentinel Explorer

## Tile Load Failures (Blank Map / HTTP 4xx)

1. **Open DevTools → Network tab**, filter by `wms`
2. Look at the `evalscript` query param — decode it: `atob(decodeURIComponent(param))`
3. Common causes:
   - `HTTP 400`: Evalscript references a band unavailable in the WMS layer's configured collection. In particular, `Collection 'S2L1C' has no band 'SCL'` means an L2A-only SCL request reached an L1C carrier layer. Keep `SENTINEL_WMS_SUPPORTS_SCL: false` for that layer, or use a verified L2A WMS configuration before enabling it.
   - `HTTP 401`: Token expired or missing. Check `window.CONFIG.CDSE_CLIENT_ID` is set.
   - `HTTP 403` with "Insufficient processing units or requests available": the configured Sentinel Hub/CDSE account has exhausted processing units or request credits. Restore quota/credits in the Copernicus/Sentinel Hub account; code changes cannot make WMS tiles load while this is active.
   - `HTTP 422`: Evalscript syntax error. Check the decoded script for JS errors.
   - `Blank tiles (200 OK)`: Mosaicking returned 0 scenes. For ORBIT mode, widen the `time` range.

## Auth Failures

Check: `window.CONFIG` in browser console. Must have `CDSE_CLIENT_ID` and `CDSE_CLIENT_SECRET`.
If empty: `config-v1.js` didn't load (404). Check the `<script src="config-v1.js">` path in index.html.

The new auth.js error message will say: `"Auth config missing: CDSE_CLIENT_ID not found in window.CONFIG"`.

## "Function not defined" Errors

All ES module exports used from HTML `onclick` must be explicitly assigned to `window`. Check `app.js` for the `window.X = X` block after the import section. Currently: `window.applyIndex`, `window.downloadHTMLReport`.

## Legacy Deep Fusion References

No current core layer ships Sentinel-1/Sentinel-2 fusion. ASAI and OBEC are Sentinel-2-only. If a UI or note still suggests a fusion toggle or multi-source APEX/HPWI request, treat it as stale documentation rather than a live troubleshooting path.

## Anomaly Scan Returns No Results

1. Check that an AOI was drawn before clicking Scan.
2. Open Network tab, look at the Statistics API POST — check response body for errors.
3. If `sampleCount === 0` on all intervals: AOI may be too small, or cloud cover >100% filter is blocking everything.
4. Try lowering sensitivity slider to "Aggressive" before scanning.

## Report Generation Fails

Most likely `showToast` was undefined (fixed 2026-03-17). If it still fails:
1. Check console for the report click handler in `src/app.js`; `src/report.js` now supplies export and acquisition helpers only.
2. Check `window.aoiDrawnItem` is not null.
3. Check `INDICES[state.activeIndex]` exists.

## Adding an Index Then Getting White Tiles

The new index's `evalscript` may reference a band not declared in the evalscript's `setup()` `input` array. `genEvalscript(bands, logic)` only declares the bands you pass — make sure all bands used in `logic` are in `bands`.
