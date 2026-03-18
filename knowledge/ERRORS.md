# Error Log

## 2026-03-17: Cold-Eyes Review Findings — RESOLVED

### Critical (Fixed)
- **`ReferenceError: showToast is not defined` in report.js** — `showToast()` called on lines 290, 303, 361 but never imported. Added `import { showToast } from './ui.js'` to report.js.
- **APEX layer blank tiles** — `getWMSLayer()` time-range expansion only checked for `hpwi`, not `apex`. Single-day ORBIT mosaicking returns 0 scenes. Fixed: added `activeIdx === 'apex'` to the 30-day expansion condition.
- **APEX cumulative mode crash** — APEX was not excluded from `genCumulativeEvalscript` wrapping (which is single-source only). Fixed: added `activeIndex !== 'apex'` exclusion alongside `hpwi`.

### Cleanup (Fixed)
- **`visibleCount` dead variable in `probeAcquisitions()`** — incremented but never read. Removed.
- **Debug `console.log` statements** — removed from `auth.js` (3 lines) and `app.js` (2 lines). Replaced with a proper error throw in `auth.js` when config is missing.
- **`console.log("INITIAL CONFIG CHECK...")` in index.html** — removed.

### Flagged (Not Fixed — Requires Product Decision)
- **Credentials hardcoded in `config-v1.js`** — fixed 2026-03-17 (see below). Auth still routes through `corsproxy.io` (third-party).

## 2026-03-17: Credentials & Scan Chart Data — RESOLVED

- **`config-v1.js` not gitignored** — credentials were committed. Added `config-v1.js` to `.gitignore`. Updated `config.example.js` to use the correct `window.CONFIG = { ... }` pattern with copy instructions.
  - ⚠️ The real credentials were previously committed and should be rotated on the Copernicus portal.

- **VSI/SCRI/TRI/BPI chart data was proxied** — FIS scan script expanded from 6 to 10 output bands. VSI (B6), TRI (B7), BPI (B8), LBI (B9) are now computed directly from S2 bands. Added B05 and B07 to script inputs for VSI (red-edge bands). Anomaly rule engine updated to include real LBI/TRI/BPI signals. SCRI remains null — it requires Sentinel-1 SAR unavailable in single-source S2 stats calls.

## 2026-03-17: Missing Imports & Broken Highlighting — RESOLVED

- **`ReferenceError: initRrcSpillOverlay is not defined`** — was called in `app.js` at line 568 but never imported from `report.js`. Fixed: added to import block.
- **`ReferenceError: downloadHTMLReport is not defined`** — HTML `onclick="downloadHTMLReport()"` calls a function that's an ES module export in `report.js` but was not exposed to `window`. Fixed: added to import and `window.downloadHTMLReport = downloadHTMLReport`.
- **`highlightAnomalies` silent bug** — `date-single` uses numeric array indices as `opt.value` (not date strings), but `anomalySet` contains date strings. Anomaly warnings never appeared on the single-date dropdown. Fixed: resolve date string via `ALL_DATES[parseInt(opt.value)]`.
- **`alert()` in scan error handler** — inconsistent UX. Replaced with `showToast()`.

## 2026-03-16: Basemap Visibility & Index TypeError

- **Deterministic error**: `Uncaught TypeError: Cannot read properties of undefined (reading 'hpwi')` in `map.js`.
- **Cause**: `getScriptContent` was destructuring `INDICES` from the `state` object, but `INDICES` resides in the `config` object.
- **Symptom**: Map overlays fail to render, and JS execution halts, preventing basemap initialization.
- **Fix**: Update `getScriptContent` to accept `config` or pass `INDICES` correctly.

- **Missing Logic**: Basemap initialization.
- **Cause**: During the Tier 1/Tier 2 refactor, the explicit `L.tileLayer(...).addTo(map)` for the initial basemap was lost or omitted in the new `DOMContentLoaded` flow.
- **Fix**: Add default basemap initialization in `app.js`.
