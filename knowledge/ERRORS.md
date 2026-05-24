# Error Log

## 2026-05-20: Test Harness Missing `puppeteer-core` — OPEN

- **Deterministic error**: `node tests/test.js` fails before running browser assertions with `Error: Cannot find module 'puppeteer-core'`.
- **Cause**: The repository currently has no `package.json`, no `package-lock.json`, and no local `node_modules/puppeteer-core` dependency, but `tests/test.js` starts with `require('puppeteer-core')`.
- **Impact**: The project test command listed in `AGENTS.md` cannot run in this checkout until the Node test dependency is installed or vendored via project package metadata.
- **Fix status**: Not fixed in this pass; no dependency was added because the current task only changes documentation/authorship claims.
- **Graduated to**: pending dependency/package-management decision.

## 2026-05-24: Node Test Harness Path Drift — RESOLVED

- **Deterministic error**: `node tests/test_pwi.js` and `node tests/test_evalscript.js` fail with `ENOENT: no such file or directory, open 'app.js'`.
- **Cause**: Both tests expected a root-level `app.js`, but the app code has been refactored under `src/app.js`.
- **Impact**: PWI formula test and evalscript compiler test were broken.
- **Fix status**: RESOLVED. Corrected the path in both scripts to `src/app.js`. For `test_evalscript.js`, also redirected the output to `src/test_evalscript_runner.mjs` and engineered `src/mocks.mjs` to allow native ESM test execution under Node.js without reference errors.

## 2026-05-20: Additional Node Test Harness Drift — OPEN

- **Deterministic error**: `node tests/test_fetch.js` fails before execution with `Error: Cannot find module 'node-fetch'`.
- **Cause**: The repository has no package metadata installing `node-fetch`, but the test imports it directly.
- **Impact**: Fetch/auth test cannot run in this checkout.
- **Fix status**: Not fixed in this pass.

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

## 2026-03-28: APEX/HPWI Zero-Scored Dry Brine Sites — RESOLVED

**Symptom:** APEX and HPWI scored 0.000 for 7/8 verified spill sites including the 357K BBL Crane County geyser. Only Lake Boehmer (a 60-acre saltwater lake) scored high (APEX 0.843, HPWI 0.814).

**Root cause:** Both APEX and HPWI formulas use `smoothness = (B03−B11)/(B03+B11)` as a surface roughness proxy. For dry Permian Basin bare soil and salt crust deposits, B11 (SWIR1, 1610nm) >> B03 (green, 560nm), giving NDWI ≈ −0.40 to −0.51. The normalised form `norm_smooth = max(0, (NDWI + 0.30) / 0.60)` → 0 exactly. Since HPWI = `chem_signal × norm_smooth × 6.0`, this zeroes the index entirely for dry sites. APEX uses the same formula for `apex_radar_proxy` and `apex_moisture`. Water bodies (Lake Boehmer) have B03 > B11 (positive NDWI), which is why only the lake was detected.

**Fix:** Added dry brine mode to both APEX and HPWI:
- Condition: `NDWI < −0.30 AND NDSI > 0.05 AND BSI > 0.10` (dry bare soil with elevated SWIR salt)
- Formula: `dry_score = (ndsi − 0.04) × min(1, bsi × N) × scale`
- Result: `score = max(wet_mode_score, dry_mode_score)` — complementary detection paths
- APEX: `(ndsi − 0.04) × min(1, bsi × 4.0) × 15.0`, clipped [0, 1]
- HPWI: `max(0, ndsi − 0.04) × min(1, bsi × 3.5) × 14.0`, clipped [0, 1]

**Variable ordering bug discovered:** `ndwi` and `bsi` were defined in the LBI/PWI sections, AFTER the HPWI block. Dry mode condition in HPWI used `smoothness` (identical formula, already available in HPWI block) and `bsi` was moved to shared intermediates at top of `calculate_indices()`.

**Detection delta:** APEX 29.6%→77.8%, HPWI 14.8%→66.7%, composite 38.1%→55.2%.
**Graduated to:** knowledge/procedural/validation-summary.md

## 2026-03-16: Basemap Visibility & Index TypeError

- **Deterministic error**: `Uncaught TypeError: Cannot read properties of undefined (reading 'hpwi')` in `map.js`.
- **Cause**: `getScriptContent` was destructuring `INDICES` from the `state` object, but `INDICES` resides in the `config` object.
- **Symptom**: Map overlays fail to render, and JS execution halts, preventing basemap initialization.
- **Fix**: Update `getScriptContent` to accept `config` or pass `INDICES` correctly.

- **Missing Logic**: Basemap initialization.
- **Cause**: During the Tier 1/Tier 2 refactor, the explicit `L.tileLayer(...).addTo(map)` for the initial basemap was lost or omitted in the new `DOMContentLoaded` flow.
- **Fix**: Add default basemap initialization in `app.js`.
