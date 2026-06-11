# Atlas Viewer Validation

Last updated: 2026-06-07

Use this checklist after changing `atlas.html`, `src/atlas-app.js`, or `src/atlas-indices.js`.

## Checks

1. Confirm static syntax:
   ```bash
   node --check src/atlas-app.js && node --check src/atlas-indices.js
   ```

2. Confirm catalog shape:
   - `ATLAS_INDICES.length` is `91`.
   - `ATLAS_DOMAINS.length` is `12`.
   - Renderable indices do not use pre-Sentinel-2 dates when they depend on Sentinel-2-style WMS rendering.
   - Live-renderable indices do not present as plain Landsat unless the Atlas WMS path actually selects a Landsat-capable layer.

3. Confirm evalscript viability with a synthetic sample:
   - Each evalscript parses.
   - Each evalscript returns four numeric output bands.
   - `node tests/test_atlas_lfmpi.mjs` passes after any wildfire/fuel-risk change.
   - LFMPI water-like and bare-soil samples return alpha `0`.
   - LFMPI dry vegetated fuel samples return non-transparent output.

4. Confirm index documentation fields:
   - Run the validation command:
     ```bash
     node --input-type=module -e "import { ATLAS_INDICES } from './src/atlas-indices.js'; const renderables = ATLAS_INDICES.filter(i => i.canRender); console.log('Total renderables:', renderables.length); const missing = renderables.filter(i => !i.source || !i.sourceUrl || !i.justification); console.log('Missing docs:', missing.map(i => i.key));"
     ```
   - Verify the expected renderable/context split for the current proof-grade pass and 0 missing documentation entries.

5. Browser-smoke `atlas.html` through a local static server:
   - The page loads 91 buttons and 12 domain sections.
   - The first renderable index selects automatically.
   - Punctuation-free acronym search works, e.g. `bhdfsi` finds `BH-DFSI`.
   - OWSI selects a post-Sentinel-2 date.
   - IERPI displays as an S2 approximation.
   - LFMPI displays a peak drought live-fuel risk bookmark.
   - A non-renderable EMIT/PACE/etc. index displays the True Color fallback sensor note.
   - The base-layer toggle label reflects the active base map after switching.
   - Console errors are absent.

6. QC peak-signal bookmarks against live WMS pixels:
   ```bash
   python3 execution/qc_atlas_bookmarks.py --size 512 --sweep-days 60 --step-days 30 --sweep-targets needs-work
   ```
   - The script intentionally uses the public Atlas fallback WMS endpoint and does not read `config-v1.js`, `.env`, or secrets.
   - It writes `.tmp/atlas_bookmark_qc.json` and `.tmp/atlas_bookmark_qc.md`.
   - Treat `strong` as a proof-grade bookmark, `moderate` as visible but not unmistakable, and `weak`/`blank` as needing replacement.
   - The stricter verdict rules require spatially noticeable signal; tiny bright specks should not pass as `strong`.
   - After the 2026-06-07 proof-grade pass, renderable Atlas bookmarks must be `strong`; entries that remain moderate/weak/blank should be marked context/non-renderable until a measured proof target is documented.
   - Current proof-grade split: 38 renderable `strong` bookmarks and 53 non-renderable/context concepts.
   - Current context/non-renderable proof-target backlog: SWRI, DWCI, GMCPI, MDSPI, SPEI, SCSPI, TRSI, CCRBI, IERPI, SPSRI, FEDGI, SLSDI, UBCDI, AIBEAI, and PWTDI.

## WMS Notes

- Atlas reads optional WMS settings from `window.CONFIG`: `SH_WMS_URL`, `ATLAS_WMS_URL`, `SH_INSTANCE_ID`, `SENTINEL_HUB_INSTANCE_ID`, `WMS_INSTANCE_ID`, `ATLAS_WMS_LAYER`, and `SH_WMS_LAYER`.
- If those settings are absent, Atlas falls back to the existing Limn Atlas WMS endpoint and `AGRICULTURE` layer.
- Individual index definitions may declare `wmsLayer` when a specific Sentinel Hub layer is required.
- Tile failures should surface in the `#tile-status` legend area instead of silently leaving only the basemap visible.
