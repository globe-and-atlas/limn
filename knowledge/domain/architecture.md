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
| `report.js` | HTML export, `generateReport`, `initRrcSpillOverlay`, `probeAcquisitions` | `auth.js`, `indices.js`, `map.js`, `ui.js` |
| `app.js` | Orchestrator: state, event bindings, date selectors, scan AOI, chart render | all of the above |

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

## Deep Fusion Scripts (HPWI, APEX)

These use `genDeepFusionEvalscript()` which generates a multi-datasource Sentinel Hub script with `mosaicking: "ORBIT"`. Two critical rules:

1. **Always use a date range** — single-day requests return 0 scenes for ORBIT mosaicking. Both HPWI and APEX expand to a 30-day window in `getWMSLayer()`.
2. **Don't wrap in `genCumulativeEvalscript`** — that wrapper is single-source only. Both are excluded from the cumulative branch in `getScriptContent()`.
