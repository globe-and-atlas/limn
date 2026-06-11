# src/AGENTS.md — Limn Module Contracts

Read this before editing any file in `src/`. Rules here take precedence for local decisions; they cannot weaken constraints in the project-root `CLAUDE.md`.

## Module Map

| File | Role | Owned by |
|------|------|----------|
| `indices.js` | All evalscripts, palettes, calibration presets, index definitions | Single source of truth for spectral logic |
| `app.js` | Core Leaflet map + WMS layer orchestration | Entry point — imports from all other modules |
| `map.js` | WMS tile construction, layer management, `getScriptContent` | Delegates palette/evalscript to `indices.js` |
| `charts.js` | FIS trend charts, scan thumbnails, anomaly detection | Canvas-based; self-contained pixel analysis |
| `report.js` | PDF/HTML export, RRC overlay, probe acquisitions | Imports `auth`, `indices`, `map`, `ui` |
| `auth.js` | CDSE OAuth2 token lifecycle | No side effects outside token cache |
| `ui.js` | Toasts, tab switching, modal state | Pure UI — no WMS or map logic |
| `atlas-app.js` | Globe & Atlas simplified viewer (91-index catalog) | Separate product — does not share state with `app.js` |
| `atlas-indices.js` | 91 novel index definitions for the Atlas viewer | Atlas-only; never import into the Limn core modules |
| `atlas-s5p-demos.js` | Sentinel-5P TROPOMI demo indices for Atlas | Atlas-only |
| `atlas-sar-demos.js` | Sentinel-1 SAR demo indices for Atlas | Atlas-only |
| `authorshipClaims.js` | Authorship metadata for index attributions | Read-only reference data |
| `verifiedBookmarks.js` | Curated coordinate bookmarks for Atlas | Read-only reference data |
| `test_evalscript_runner.mjs` | Node test harness for evalscript validation | Test-only; never imported by app code |

## Hard Constraints

### indices.js — evalscript contracts
- **Every index entry must have**: `id`, `name`, `evalscript`, `palette`, and `description`
- **Never add SAR (Sentinel-1) data** to evalscripts defined for optical indices — the comment "SAR analogy" is a physical description, not a data source
- **Only two genuine SAR indices**: `s1_sar` and `scri` — these request real S1 GRD data
- **No multi-sensor deep fusion** (S1+S2 combined evalscripts) — this was removed as dead code; do not re-introduce it
- **Palette arrays must be evenly spaced** RGBA stops — uneven stops break the `colorBlend` interpolation
- `CALIBRATION_PRESETS` keys (`permian`, `standard`) are referenced by name in `app.js` — do not rename or remove them

### app.js — orchestration boundary
- **No evalscript logic here** — all spectral definitions belong in `indices.js`
- **No direct WMS tile construction** — delegate to `map.js` via `applyIndexDelegate`
- Import palette constants by name from `indices.js`; do not redeclare them here

### map.js — WMS layer construction
- **`getScriptContent` is the single exit point** for evalscript → WMS parameter serialisation — all callers must use it
- Do not embed evalscript strings directly in this file
- The hardcoded `SH_WMS_URL` constant here and in `report.js` must stay in sync — if the instance ID changes, update both

### auth.js — token safety
- `getCDSEToken` is the only function that may touch CDSE credentials
- The CORS proxy route (`corsproxy.io`) exists because the Copernicus Keycloak server blocks direct CORS requests — do not remove it without first verifying the endpoint accepts direct browser requests

### Atlas isolation
- `atlas-app.js`, `atlas-indices.js`, `atlas-s5p-demos.js`, `atlas-sar-demos.js` are a separate product
- **Never import Atlas modules into `app.js`, `map.js`, `charts.js`, `report.js`, or `ui.js`**
- The Atlas viewer has no produced-water tools and does not share Leaflet state with the core app

## Change Patterns

### Adding a new spectral index (Limn core)
1. Add the definition to `indices.js` — evalscript, palette, calibration notes
2. Export the palette constant from `indices.js`
3. Import the palette in `map.js` (if map layer needs it) and `app.js`
4. No changes needed in `ui.js` or `auth.js`
5. Run `node tests/test.js` before declaring done

### Adding a new Atlas index
1. Add to `atlas-indices.js` only
2. Do not touch core Limn modules
3. Verify the domain grouping is correct in `ATLAS_DOMAINS`

### Changing WMS instance ID
1. Update `SH_WMS_URL` in `map.js`
2. Update `SH_WMS_URL` in `report.js`
3. Update `SH_WMS_URL` in `charts.js` (the hardcoded fallback)
4. Update `config.example.js` at project root

## What Requires Knowledge Writes

| Action | Write to |
|--------|----------|
| New index added | `knowledge/domain/spectral-indices-full.md` |
| Palette threshold changed | `knowledge/domain/spectral-indices-full.md` — note old vs new values |
| WMS instance ID changed | `knowledge/DECISIONS.md` — why it changed |
| New CORS workaround in `auth.js` | `knowledge/ERRORS.md` — document the endpoint behaviour that forced it |
| Any evalscript that produces transparent/missing pixels at high values | `knowledge/ERRORS.md` — this is a known failure mode; document threshold and fix |
