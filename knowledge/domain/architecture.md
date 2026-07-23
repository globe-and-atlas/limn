# Architecture — Sentinel Explorer

## Module Map

| File | Role | Imports From |
|------|------|-------------|
| `index.html` | Entry point, loads all modules as `type="module"` | — |
| `config-v1.js` | Sets `window.CONFIG` with CDSE credentials (non-module `<script>`) | — |
| `indices.js` | All spectral index definitions, evalscript generators, palettes | — |
| `auth.js` | CDSE OAuth2 token lifecycle (cached, auto-refresh) | — |
| `map.js` | Leaflet init, WMS layer construction, `applyIndex`, `getScriptContent` | `indices.js`, `charts.js` |
| `ui.js` | `showToast`, `switchTab`, `updateUI`, global keydown listener | — |
| `charts.js` | Hover highlight, peak detection, thumbnail gallery, `buildHighlightUrl` | `indices.js` |
| `report.js` | HTML export, `generateReport`, `initRrcSpillOverlay`, `probeAcquisitions` | `auth.js`, `indices.js`, `map.js`, `ui.js`, `sentinel-catalog.js` |
| `sentinel-catalog.js` | Shared SH Catalog (STAC) pagination + client-side cache; returns the set of dates with a real S1/S2 scene for a bbox/date-range | — |
| `app.js` | Orchestrator: state, event bindings, date selectors, scan AOI, chart render, triple layout modes | all of the above |
| `atlas-app.js` | Limn Atlas orchestrator: bookmark navigation, WMS/GEE tile requests, its own date `<select>` + catalog probe | `atlas-indices.js`, `atlas-sar-demos.js`, `atlas-s5p-demos.js`, `atlas-evidence.js`, `auth.js`, `sentinel-catalog.js` |

## State Object (`state` in app.js / `window.state` globally)

```javascript
{
  map,              // Leaflet map instance
  baseLayerInst,    // Active base tile layer
  activeLoc,        // 'dixon' | 'rocker' | 'sweatt' | 'custom'
  activeIndex,      // e.g. 'ndmi', 'pwi', 'apex', 'none'
  activeBasin,      // 'permian' | 'standard'
  mode,             // 'single' | 'compare'
  compareType,      // 'swipe' | 'diff' | 'cumulative'
  monthIndex,       // Index into ALL_DATES[] (used by date-single)
  sarFusion,        // Visual SAR overlay toggle
  hlsEnabled,       // NASA HLS temporal booster toggle
  deepFusion,       // Deep S1+S2 fusion toggle (HPWI 2.0)
  opacity,          // 0–1 overlay opacity
  visualFilter,     // 0–1 threshold mask (hides pixels below %)
  sensitivity,      // -50 to 50 threshold offset
  overlayGroup,     // Single-mode LayerGroup
  leftGroup,        // Compare mode left LayerGroup
  rightGroup,       // Compare mode right LayerGroup
  sbsControl,       // Leaflet side-by-side control
  anomalousDates,   // ['YYYY-MM-DD', ...] flagged by scan
  validSentinelDates, // Set of 'YYYY-MM-DD' with a real S1/S2 scene; null until first catalog probe resolves (see below)
  rrcSpillLayer,    // Leaflet layer group for RRC markers
  rrcSpillData,     // Cached GeoJSON after first fetch
  drawnItems,       // L.FeatureGroup for drawn AOI
  hoverHighlightLayer, hoverMarker  // Chart hover state
}
```

## Date Selector Inconsistency (Known, Intentional)

`date-single` uses numeric array **indices** (into `ALL_DATES[]`) as option values.
`date-t1` and `date-t2` use **date strings** (`'YYYY-MM-DD'`) as option values.

This affects any code that reads `opt.value` from a selector — must resolve via `ALL_DATES[parseInt(opt.value)]` for `date-single`. See `highlightAnomalies()` in app.js.

## Sentinel-Only Date Filtering (2026-07-23)

Both apps' date selectors now only contain dates with a real Sentinel-1 GRD or Sentinel-2 L2A scene
(per CDSE STAC catalog), tagged `' [S]'`. Landsat does not count toward validity. Key pieces:

- `src/sentinel-catalog.js` — shared, paginated, cached `fetchValidSentinelDates(bbox, fromISO, toISO, token, onError)`. Pagination assumes SH Catalog's cursor is a top-level `next` token echoed back in the next POST body (with a STAC `links[rel=next].body.next` fallback) — **unverified against a live token this session**; worth confirming against a real CDSE account before trusting deep pagination.
- `src/app.js` — `populateGroupedDates(selectEl, dates, isValueIndex, validSet)` is now module-scope (was a DOMContentLoaded-local closure). When filtering with a `validSet`, it computes `date-single`'s option value via `ALL_DATES.indexOf(dateObj)` (the **global** array), never the filtered subset being iterated — this is what keeps the "value is an index into ALL_DATES" contract intact after filtering.
- `closestDateIndex(targetStr, validSet)` (app.js) — shared snapping helper used by `setClosestDateValue()` (spill-bookmark jump) and the FIS trend-chart click handler, so a curated spill/chart date that isn't itself a valid Sentinel date lands on the nearest one instead of setting a `<select>` to a nonexistent option value (which silently blanks the control).
- `window.rebuildDateSelectors(validSet)` (app.js) — re-renders all three selects once `probeAcquisitions()` resolves; called from `report.js`.
- Atlas mirrors this with its own `populateAtlasDateOptions` / `closestAtlasDateValue` / `rebuildAtlasDateSelector` / `probeAtlasAcquisitions` in `atlas-app.js` (kept as a sibling implementation, not shared, since Atlas has one string-valued date instead of index+string across 3 selects). Atlas's `<input type="date">` was replaced with a grouped `<select id="date-input">` for this — same id, so the existing `.value`-based read/write call sites needed no renaming, only snap-safety at the bookmark-jump site (`selectIndex()`).
- **Fail-open contract**: before the first probe resolves, or if CDSE auth fails, both apps fall back to showing the full unfiltered date range (Limn) / a mocked ~1-in-5 valid-date pattern (both, once trial mode is detected) rather than an empty selector.
- **Gate removed**: `probeAcquisitions()` in `app.js` previously had `if (isGeeProviderActive()) return;`, which silently skipped ALL catalog probing (hence all tagging) whenever the active provider wasn't `sentinelhub` — i.e. always, under the actual default (`cog`). This made the pre-existing `[S]/[L]/[F]` tagging dead code in normal usage, matching the (accurate, it turns out) claim in `api-contracts.md` that GEE mode "skips ... acquisition probing." The gate was removed because catalog lookups only need CDSE OAuth credentials and are independent of which provider serves map tiles; `isSentinelCreditGuardBlocking()` remains as a no-op-outside-`sentinelhub` guard.

## Global Window Exports

Functions/objects explicitly exposed to `window` for cross-module access:
- `window.state` — full state object
- `window.CONFIG` — merged app config (credentials + WMS URLs + dates)
- `window.ALL_DATES` — full date array
- `window.MONTHS` — month name array
- `window.applyIndex` — main render trigger (called from charts.js thumbnails)
- `window.downloadHTMLReport` — called from HTML `onclick` (ES module can't be inlined)
- `window.aoiDrawnItem` — drawn Leaflet layer (accessed by report.js)
- `window.reportChartInst`, `window.primaryChartInst`, `window.secondaryChartInst` — Chart.js instances
- `window.renderFocusedTriage` — orchestrates Focused Triage cards and filters
- `window.renderCommandConsole` — drives search input queries and tag filtering in Command HUD
- `window.rebuildDateSelectors` — re-renders date-single/date-t1/date-t2 against a valid-Sentinel-date set (called from report.js's `probeAcquisitions()`)

## Deep Fusion Scripts (HPWI, APEX)

These use `genDeepFusionEvalscript()` which generates a multi-datasource Sentinel Hub script with `mosaicking: "ORBIT"`. Two critical rules:

1. **Always use a date range** — single-day requests return 0 scenes for ORBIT mosaicking. Both HPWI and APEX expand to a 30-day window in `getWMSLayer()`.
2. **Don't wrap in `genCumulativeEvalscript`** — that wrapper is single-source only. Both are excluded from the cumulative branch in `getScriptContent()`.

## UI Layout Modes & Sidebar Switching

To manage the high density of 30+ custom composites, the sidebar implements **3 distinct, client-side dynamic layout panes** swapped seamlessly with zero map reloads or state losses:

1. **Suite Grid (`suite-grid`)**: The default vertical tabbed selector layout showing all spectral indexes, chart panels, diagnostic settings, and download controls.
2. **Focused Triage (`focused-triage`)**: A wizard-like task-oriented panel featuring 5 critical environmental cards (*🚨 Produced Water & Spills*, *🔥 Wildfire & Landslide*, *💧 Freshwater & Algae*, *❄️ Permafrost & Arctic*, *🏙️ Urban Heat & Albedo*). Clicking a triage card instantly sets the primary diagnostic index, flies the map to calibration coordinate targets, locks date options to single date mode, and renders isolated thematic bookmarks.
3. **Command Console (`command-console`)**: A sleek search HUD with interactive tags (`#Water`, `#Vegetation`, `#Soil`, `#Mining`, `#Thermal`, `#OilGas`). Users can type queries matching index names, formulas, sensors, or descriptions to filter the matching tools in real-time, accompanied by targeted bookmark listings.

Visual transitions between panes are managed via hardware-accelerated CSS transforms (`translateY`) and `opacity` overrides in `style.css` for absolute premium responsiveness.
