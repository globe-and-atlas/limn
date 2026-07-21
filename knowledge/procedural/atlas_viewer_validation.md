# Atlas Viewer Validation

Last updated: 2026-07-20

## Current baseline (supersedes older proof-grade counts below)

- Catalog: 24 capability families containing 91 methods; 37 live M3 screening proxies, 16 M2 executable non-live formulas, and 38 M1 concepts/retired formulas.
- Roles: 15 primary, 10 variant, 12 component, 1 reference, 51 research-model, and 2 retired.
- Public WMS bookmark audit: 35 `strong`, 2 `moderate` (RRFI and MP-PDI), 0 weak/blank/error.
- `strong` means a spatially legible response from the shipped proxy at the cited context. It does **not** mean scientific proof or validation.
- TFIDI now uses 2021-08-17 and IPVSI 2021-09-01 after ±60-day scene sweeps. RRFI and MP-PDI keep event-aligned dates because the strongest nearby alternatives did not materially improve interpretability.
- Current G&A lead captures: BH-DFSI, LFMPI, PETI, EPDI, EC-ACI, and TDR-ASI.

Use this checklist after changing `atlas.html`, `src/atlas-app.js`, or `src/atlas-indices.js`.

## Checks

1. Confirm static syntax:
   ```bash
   node --check src/atlas-app.js && node --check src/atlas-indices.js
   ```

2. Confirm catalog shape:
   - `ATLAS_INDICES.length` is `91`.
   - `ATLAS_CAPABILITIES.length` is `24`.
   - `ATLAS_DOMAINS.length` is `12`.
   - Every method has a declared capability and method role.
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
   - Capability view is the default and shows active primary, variant, component, and reference methods grouped by capability.
   - Domain view exposes all 91 methods across the 12 application domains.
   - Research view exposes the 51 research models and 2 retired formulas grouped by capability.
   - Switching views preserves the selected method when it is present in the new view.
   - The first renderable index selects automatically.
   - Punctuation-free acronym search works, e.g. `bhdfsi` finds `BH-DFSI`.
   - The `Focus pts` HUD toggle is off by default.
   - Toggling `Focus pts` on adds one vector point for each valid Atlas bookmark coordinate.
   - Toggling `Focus pts` off removes the vector points.
   - Toggling `Focus pts` does not request GEE or Sentinel WMS tiles.
   - Clicking a focus point selects the corresponding Atlas index.
   - The LinkedIn Ground Truth panel renders for the selected index.
   - The LinkedIn Ground Truth panel includes one visual anchor, one observation, one reason it matters, and one interpretive prompt.
   - The generated LinkedIn draft stays below 300 words.
   - The LinkedIn Ground Truth panel does not request additional provider tiles.
   - The Capture HUD control enters a LinkedIn screenshot mode.
   - Capture mode hides the sidebar, HUD, and full info panel.
   - Capture mode shows the selected index acronym, name, bookmark place/date, visual mode label, interpretive hook, and prompt.
   - Capture mode enlarges the legend for feed-compressed screenshots.
   - Capture mode exits from the overlay without changing the selected index.
   - Capture mode does not request additional GEE, Sentinel WMS, or COG tiles.
   - Capture comparison modes include context-only, overlay, and split.
   - Split comparison uses an adjustable divider.
   - Capture mode falls back to context-only when no overlay layer is active.
   - Overlay and split controls are disabled when no overlay layer is active.
   - Overlay and split controls are disabled when Atlas is on the GEE fallback.
   - Capture mode labels GEE as context-only because `server/gee_tile_server.mjs` returns true color for `app=atlas`.
   - Capture mode labels Sentinel WMS as the interpretation provider before enabling split comparison.
   - The capture status line explains how to render the overlay when controls are disabled.
   - Split labels remain visible and understandable on compact screenshot viewports.
   - Capture comparison mode changes do not request additional GEE, Sentinel WMS, or COG tiles.
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
   - Treat `strong` as a clearly visible proxy response, `moderate` as visible but not unmistakable, and `weak`/`blank` as needing replacement or context-only treatment.
   - The stricter verdict rules require spatially noticeable signal; tiny bright specks should not pass as `strong`.
   - A live entry may remain `moderate` when its date is important event context and an honest label is more useful than substituting a brighter but less representative scene.
   - Current split: 35 live `strong`, 2 live `moderate`, and 54 non-live specifications.
   - Current context/non-renderable proof-target backlog: SWRI, DWCI, GMCPI, MDSPI, SPEI, SCSPI, TRSI, CCRBI, IERPI, SPSRI, FEDGI, SLSDI, UBCDI, AIBEAI, and PWTDI.

## WMS Notes

- Atlas reads optional WMS settings from `window.CONFIG`: `SH_WMS_URL`, `ATLAS_WMS_URL`, `SH_INSTANCE_ID`, `SENTINEL_HUB_INSTANCE_ID`, `WMS_INSTANCE_ID`, `ATLAS_WMS_LAYER`, and `SH_WMS_LAYER`.
- If those settings are absent, Atlas falls back to the existing Limn Atlas WMS endpoint and `AGRICULTURE` layer.
- Individual index definitions may declare `wmsLayer` when a specific Sentinel Hub layer is required.
- Tile failures should surface in the `#tile-status` legend area instead of silently leaving only the basemap visible.

## 2026-06-16 — Bookmark Focus Overlay

- Atlas bookmark focus points are local Leaflet vector markers created with `L.circleMarker`, so the overlay can be toggled without provider tile requests.
- Keep the focus layer off by default to avoid crowding the map on first load.
- Marker clicks should call the same index-selection path as sidebar buttons so date, view, legend, info panel, and active state stay synchronized.
- `node tests/test_atlas_sentinel_toggle.mjs` now verifies the focus overlay alongside the Sentinel source-switch smoke.

## 2026-06-23 — LinkedIn Ground Truth Guidance

- Atlas now treats each selected index as a weekly LinkedIn Ground Truth candidate: one image, one observation, one reason it matters, and one interpretive prompt.
- The guidance is an info-panel layer, not a new Atlas category. Do not add a separate sidebar taxonomy for LinkedIn, Map Notes, or Field Notes until the archive has enough posts to justify it.
- The generated draft uses existing index metadata only: `acronym`, bookmark label/date, `bandsLabel()`, `physics`, and `benefit`.
- The copy action writes the generated draft to the browser clipboard and does not request Sentinel, GEE, or COG tiles.
- `node tests/test_atlas_sentinel_toggle.mjs` verifies the panel ingredients, draft word count, no console errors, and no extra provider tile requests.

## 2026-06-24 — LinkedIn Screenshot Capture Mode

- Atlas Capture mode is presentation-only: it toggles `.atlas-layout.capture-mode`, hides the sidebar/HUD/info panel, and does not call the provider rendering path.
- The capture overlay is driven by the selected index metadata and includes acronym, name, bookmark place/date, a view-aware mode label, a direct comparison hook, and an index-aware interpretive prompt.
- Keep the exit control inside the capture overlay because the normal HUD is intentionally hidden while capture mode is active.
- Do not call `map.invalidateSize()` when entering Capture mode; expanding the map viewport can make Leaflet request replacement overlay tiles.
- Capture comparison controls must only adjust the existing loaded overlay layer: context sets overlay opacity to `0`, overlay restores `state.opacity`, and split clips the existing overlay container with `clip-path`.
- If no overlay layer is active because tiles are paused, Sentinel is guarded, or no layer has rendered yet, Capture mode should force context-only, disable Overlay/Split, and show a render-first status.
- Atlas GEE tiles are true-color context only for `app=atlas`; do not offer Capture Overlay/Split as index interpretation until Sentinel WMS is the active provider.
- Sentinel WMS Capture views may boost the already-loaded overlay layer with CSS filter/opacity for LinkedIn legibility, but this must not request replacement provider tiles.
- `window.getAtlasCaptureState()` exposes capture state for smoke tests and should stay in sync with the selected index.
- Browser validation should assert no GEE, Sentinel WMS, or COG tile counts change when entering or exiting capture mode.

## 2026-06-24 — Article Capture Catalog Skip

- `execution/capture_atlas_articles.py --skip-catalog` is a no-metadata-call mode: it skips both public CDSE STAC and authenticated Sentinel Hub Catalog lookup.
- Sidecar metadata should record `satellite_metadata.status` as `skipped` when this flag is used.

## 2026-06-25 — Corrected Swipe & Mirror Views

- **Swipe View Clip Path Alignment:** Calculating `se` bounds via actual DOM properties (`map.getContainer().clientWidth` and `clientHeight`) rather than `map.getSize()` avoids the 300px offset caused by the sidebar hiding. Adding a 200px buffer to the right, top, and bottom coordinates prevents sub-pixel gaps.
- **Mirror View Sync:** Panning or zooming a side-by-side mirror map requires locking all interactive events (dragging, scroll wheel, touch zoom, etc.) on the mirror map to keep them perfectly in sync in real-time. Explicitly calling `setView` and `invalidateSize` on both maps immediately after resizing the DOM ensures they represent the same geographical area and scale.
- **HUD & Info Panel Layout:** Relocating `#capture-card` to the top-right corner cleans up the bottom screen, and adding a collapse toggle button makes it compact. The screenshot info panel `#capture-info-box` is added in the top-left to embed Date, Location, and Formula in the screenshot. It collapses to a minimal `ⓘ` button in the UI, and both trigger and close button are hidden during clean export state `.capture-clean`.
- **Opacity in Mirror:** The opacity slider is enabled and interactive in Mirror view, letting users adjust the overlay opacity on the main map.
- **Wide Viewport Export Crop Fix:** Storing computed crop offsets in CSS custom variables (`--capture-offset-x`, `--capture-offset-y`) and aligning `#capture-info-box`, `#capture-info-trigger`, and `.atlas-legend` relative to them ensures they are never cropped out in exported screenshots on wide screens.
- **Visual Overlap Mitigation:** Shifting `.capture-rail` to the bottom-center and `.capture-split-labels` left/right spans to align dynamically using `--capture-split` at `bottom: 24px` prevents layout collisions with the top control panels and aligns them adjacent to the dividing line.
- **Premium Info Box Styling:** Widening the `#capture-info-box` to `520px` and utilizing a clean grid structure with uppercase metadata labels, inline SVG icons (calendar, globe, code brackets), a branding kicker, a sensor platform badge, and a highlighted formula pill prevents visual crowding and formats it beautifully for LinkedIn.
