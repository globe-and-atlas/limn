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

Multi-source S1+S2 scripts (APEX, HPWI) must use `layers: 'AGRICULTURE'` in the WMS request, not a sensor-specific layer. Sending `'SENTINEL-2-L2A'` with a multi-datasource evalscript returns HTTP 400. The `getWMSLayer()` function handles this via the `sensor === 'S1/S2 Fusion'` check.

## Cumulative Mode Excludes Deep Fusion

`genCumulativeEvalscript` generates a single-datasource ORBIT script. Wrapping HPWI or APEX in it would produce a broken script. Both are excluded from the cumulative branch with `activeIndex !== 'hpwi' && activeIndex !== 'apex'`.

## Comment Stripping Regex

The evalscript comment stripper regex:
```
/\/\*[\s\S]*?\*\/|([^\:]|^)\/\/.*$/gm
```
Has a known edge case: it can incorrectly strip content after `://` in URL strings if they appear in evalscript logic. Evalscripts don't currently contain URLs, so this is safe but worth knowing.

## ALL_DATES is Daily from 2020-01-01

The date array is generated at load time from 2020-01-01 to today, one entry per day. That's ~2200+ entries. The selector is grouped by month via `<optgroup>` to keep it usable. Avoid iterating `ALL_DATES` in tight loops — use `findIndex` or direct index access.

## Token is Cached Module-Scoped in auth.js

The CDSE access token is cached in `cachedAccessToken` at module level. Multiple concurrent calls to `getCDSEToken()` will all wait for the same token refresh. If the token call fails, `cachedAccessToken` is set to `null` so the next call retries.

## Scan FIS Data is Partially Proxied

The 1-year AOI scan only computes PWI, HPWI, FBC, NDMI, NDWI, SAVI via the Statistics API (6 bands). The VSI, SCRI, TRI, BPI values shown in the secondary chart are mathematical proxies derived from those 6. They are approximations intended for visual trend reference, not precise index values.

## corsproxy.io for Auth

The Copernicus Keycloak auth endpoint blocks CORS from browsers. The app routes through `corsproxy.io` as a workaround. This is a third-party service — if it goes down, auth fails entirely. A backend proxy would be the production-grade fix.
