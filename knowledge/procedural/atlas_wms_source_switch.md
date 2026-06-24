# Atlas WMS Source Switch

## Purpose

Atlas can choose between two Sentinel Hub WMS sources without editing `config-v1.js` during a session:

- `Configured`: the existing Copernicus/Sentinel Hub endpoint configured locally.
- `Viewer`: the built-in alternate WMS endpoint or an optional WMS override.

Use this when one Sentinel Hub account is out of credits but another WMS configuration still has credits.

## Runtime Behavior

- The source selector lives in the Atlas map HUD under the Sentinel controls.
- The selector does not arm Sentinel live tiles by itself.
- The Sentinel WMS switch must still be enabled before WMS tiles are requested.
- The minimum zoom guard still blocks requests below the configured zoom.
- Switching source while Sentinel is armed redraws the active Atlas layer from the selected endpoint.
- Switching source while Sentinel is disarmed changes only the pending source.

## Config Keys

```javascript
ATLAS_WMS_SOURCE: "configured", // "configured" or "viewer"
ATLAS_VIEWER_INSTANCE_ID: "",
ATLAS_VIEWER_WMS_URL: "",
```

`configured` resolves from `SH_WMS_URL`, `ATLAS_WMS_URL`, `SH_INSTANCE_ID`, `SENTINEL_HUB_INSTANCE_ID`, or `WMS_INSTANCE_ID`.

`viewer` resolves from `ATLAS_VIEWER_WMS_URL`, `SENTINEL_VIEWER_WMS_URL`, `ATLAS_VIEWER_INSTANCE_ID`, or `SENTINEL_VIEWER_INSTANCE_ID`, then falls back to the verified alternate WMS configuration id `83a6b821-c0ad-43b1-848f-06f7b6b528a7`.

Do not use a Copernicus Browser/Viewer id that begins with `sh-` as an OGC WMS instance id. It must be a full WMS URL or a Sentinel Hub OGC WMS configuration id accepted by `https://sh.dataspace.copernicus.eu/ogc/wms/{INSTANCE_ID}`.

## Verification

```bash
node --check src/atlas-app.js
node tests/test_gee_provider.mjs
node tests/test_atlas_sentinel_toggle.mjs
git diff --check
```
