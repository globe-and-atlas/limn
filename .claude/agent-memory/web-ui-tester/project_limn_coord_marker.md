---
name: project_limn_coord_marker
description: Verified behavior of the manually-entered-coordinates-to-map-marker feature on limn's index.html and atlas.html, tested live in Chromium via Playwright on 2026-07-22.
metadata:
  type: project
---

Feature: typing `lat, lng` into a text input and clicking GO (or Enter) flies the Leaflet map there and drops a `.pulse-marker` circleMarker (cyan fill `#00D2FF`, white outline, radius 9) with a coordinate tooltip.

Implementation locations:
- `index.html` (main "Limn" app): `#loc-search-input` / `#btn-search-loc` inside `<details class="control-group location-control">` (closed by default, needs the `<summary>` clicked to expand). Logic in `src/app.js` (`handleLocationSearch`, `showSearchMarker`, `clearSearchMarker`) around line 1487-1560.
- `atlas.html` ("Limn Atlas"): `#atlas-coord-input` / `#atlas-coord-go`. Marker logic in `src/atlas-app.js` (~line 2072). Invalid-input styling via `.is-invalid` class, CSS at `atlas.html` lines ~96-123 (`rgba(255,87,87,0.6)` border).

Verified 2026-07-22, all pass:
- index.html: coordinate search (`31.55, -103.95`) flies the map and renders the pulse marker at the correct screen position; hovering shows a `.leaflet-tooltip` with text `31.55000, -103.95000`. LAT/LNG readout in the sidebar updates correctly.
- atlas.html: same coordinate search behaves identically (marker + tooltip correct).
- atlas.html invalid input (`"not coordinates"`): input gets `.is-invalid` class (visually confirmed via cropped/upscaled screenshot — clear red border), no new marker/fly triggered, previous marker from the earlier valid search stays in place (not removed — this matches spec, which only requires invalid input not to *add* a marker). Retyping a valid-looking value clears `.is-invalid` again.
- No `pageerror` (JS crashes) on either page during any of these interactions.
- Console does show a large volume of `[COG] Tile Error ... 404` messages on both pages — these are Sentinel-2 COG basemap tile fetches failing against whatever tile backend is configured for local dev; unrelated to the marker feature (present before/after/regardless of coordinate search) and not a regression caused by this feature.

FIXED 2026-07-22: index.html's preset location buttons (`.loc-btn[data-loc]`, `AOI_LOCATIONS.dixon/rocker/sweatt` in `src/app.js` lines 70-73, click-handler ~1462) were previously missing markup (see [[project_limn_locbtn_missing]] for original gap). Markup was restored — `<div class="location-picker">` with 3 `.loc-btn` elements now at index.html lines ~225-228, inside the `<details class="control-group location-control">` "Location" section. Re-verified live in Chromium 2026-07-22, full flow passes:
- 3 buttons render: "Hugh Dixon No.1-9" (active by default), "Rocker B \"B\" 1", "John W Sweatt 1".
- Manual coord search (`31.55, -103.95`) → flies map, drops `.pulse-marker`.
- Clicking "Rocker B..." preset: flies to `31.244621, -101.261754` (confirmed via `#disp-lat`/`#disp-lng` sidebar readout, since `state`/`state.map` are module-scoped in `src/app.js` and not reachable via `window` from Playwright — read the DOM readout instead of trying `page.evaluate(() => window.map...)`), button becomes `active` and others lose it, and the manual-search `.pulse-marker` is removed (count 0) — `clearSearchMarker()` in the click handler (src/app.js ~1480) confirmed working.
- Clicking "Hugh Dixon No.1-9" afterward correctly re-activates it and deactivates Rocker.
- Zero `pageerror` events and zero non-COG-tile console errors across the whole flow (1432 raw console messages, all were `[COG] Tile Error 404` / resource-404 noise unrelated to this feature — filtered these out per the standing convention in [[project_limn_coord_marker]]).
