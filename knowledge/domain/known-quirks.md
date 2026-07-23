# Known Quirks — Sentinel Explorer

## date-single uses indices, date-t1/t2 use date strings

`date-single` options store the integer array index into `ALL_DATES[]` as `opt.value`.
`date-t1` and `date-t2` store `'YYYY-MM-DD'` strings.

Any code comparing option values against date strings must branch on selector ID:
```javascript
const dateStr = selectId === 'date-single'
    ? (ALL_DATES[parseInt(opt.value, 10)] || {}).value
    : opt.value;
```
See `highlightAnomalies()` and `probeAcquisitions()` in the codebase.

## WMS Layer Parameter for Fusion Scripts

Multi-source S1+S2 scripts (ASAI, OBEC, formerly APEX/PWOI and HPWI respectively) must use `layers: 'AGRICULTURE'` in the WMS request, not a sensor-specific layer. Sending `'SENTINEL-2-L2A'` with a multi-datasource evalscript returns HTTP 400. The `getWMSLayer()` function handles this via the `sensor === 'S1/S2 Fusion'` check.

## Cumulative Mode Excludes Deep Fusion

`genCumulativeEvalscript` generates a single-datasource ORBIT script. Wrapping HPWI or APEX in it would produce a broken script. Both are excluded from the cumulative branch with `activeIndex !== 'hpwi' && activeIndex !== 'apex'` (corresponding to OBEC and ASAI/APEX).

## Comment Stripping Regex

The evalscript comment stripper regex:
```
/\/\*[\s\S]*?\*\/|([^\:]|^)\/\/.*$/gm
```
Has a known edge case: it can incorrectly strip content after `://` in URL strings if they appear in evalscript logic. Evalscripts don't currently contain URLs, so this is safe but worth knowing.

## ALL_DATES is Daily from 2020-01-01 (but the rendered selector is filtered)

The date array is generated at load time from 2020-01-01 to today, one entry per day. That's ~2200+ entries. The selector is grouped by month via `<optgroup>` to keep it usable. Avoid iterating `ALL_DATES` in tight loops — use `findIndex` or direct index access.

As of 2026-07-23, the *rendered* `<option>` list is a filtered subset of `ALL_DATES` — only dates with a real Sentinel-1/Sentinel-2 scene (per CDSE STAC catalog) survive, tagged `' [S]'`. `ALL_DATES` itself is unchanged and still the full 2200+ synthetic daily array; `date-single` option values are still indices into it (see `populateGroupedDates()` in `src/app.js` and `[[architecture.md]]`'s "Sentinel-Only Date Filtering" section). Before the first catalog probe resolves, the full unfiltered list is shown (fail open).

## Token is Cached Module-Scoped in auth.js

The CDSE access token is cached in `cachedAccessToken` at module level. Multiple concurrent calls to `getCDSEToken()` will all wait for the same token refresh. If the token call fails, `cachedAccessToken` is set to `null` so the next call retries.

## Scan FIS Data is Partially Proxied

The 1-year AOI scan only computes PWI, HPWI, FBC, NDMI, NDWI, SAVI via the Statistics API (6 bands). The VSI, SCRI, TRI, BPI values shown in the secondary chart are mathematical proxies derived from those 6. They are approximations intended for visual trend reference, not precise index values.

## NDWI Dry-Soil Trap (ASAI + OBEC)

Permian Basin bare caliche has B11 >> B03, yielding NDWI = −0.39 to −0.51. Both ASAI (formerly PWOI / APEX) and OBEC (formerly HPWI) use `smoothness = (B03 − B11) / (B03 + B11)` as a liquid-surface proxy. When NDWI is this negative, `norm_smooth = clamp((smoothness + 0.3) / 0.6) = 0`, which zeros the entire composite score. This caused 29.6% / 14.8% detection pre-fix for ASAI / OBEC respectively on dry Permian spill sites.

**Fix (2026-03-28):** Dry brine mode — parallel formula path gated on `NDWI < −0.30 AND NDSI > 0.05 AND BSI > 0.10`. Takes `max(wet_score, dry_score)`.

**Risk:** NDSI > 0.05 can fire on naturally high-NDSI caliche outcrops with no spill. Need control sites (non-spill bare caliche) to characterize false positive rate before relying on ASAI/OBEC dry-mode scores alone.

## Apache-Balmorhea Date Window

The Apache-Balmorhea 77.5K BBL spill (July 2020) scores 0 on all indices when queried at date `2020-07-29`. Root cause: NDSI at that date is 0.029, below the dry-brine threshold of 0.05. The salt residue signal likely appears in 2021+ imagery after evaporation concentrates the brine.

**Action:** Run `execution/sweep_dates.py` on this site using 2021–2022 imagery to find the peak NDSI date.

## corsproxy.io for Auth

The Copernicus Keycloak auth endpoint blocks CORS from browsers. The app routes through `corsproxy.io` as a workaround. This is a third-party service — if it goes down, auth fails entirely. A backend proxy would be the production-grade fix.
