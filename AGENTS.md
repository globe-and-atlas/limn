# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

Sentinel Explorer is a browser-based GIS tool for visualizing Sentinel-2 (optical) and Sentinel-1 (SAR) satellite imagery over the Permian Basin. It streams WMS tiles from Copernicus Sentinel Hub using custom evalscripts to compute spectral indices (NDVI, NDMI, NDWI, NDSI, PWI, etc.) and renders them over Leaflet maps with Esri/OSM base layers.

## Commands

```bash
# Open locally
open index.html

# Run tests
node tests/test.js
node tests/test_fetch.js
node tests/test_pwi.js
```

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Main app entry point |
| `src/app.js` | Core Leaflet map + WMS layer logic |
| `src/indices.js` | Spectral index definitions and evalscripts |
| `src/map.js` | WMS layer construction and tile management |
| `src/ui.js` | UI controls and panel logic |
| `src/charts.js` | FIS trend charts and scan thumbnails |
| `src/report.js` | PDF/export report generation |
| `src/auth.js` | CDSE OAuth token management |
| `style.css` | UI styles |
| `config-v1.js` | Active config: Sentinel Hub instance ID and WMS config (gitignored) |
| `config.example.js` | Safe template for config (commit this, not config-v1.js) |
| `directives/` | SOPs for agent tasks |
| `execution/` | Deterministic Python scripts |
| `tests/` | Node test scripts and debug utilities |
| `knowledge/domain/spectral-indices-full.md` | Full spectral index reference with formulas and citations |
| `directives/pwi_spec.md` | Produced Water Index specification |

## Conventions

- Use `python3` explicitly
- Use `pathlib.Path` for paths
- Secrets (Sentinel Hub instance ID, API keys) in `config-v1.js` or `.env` — never committed
- Temp outputs in `.tmp/` (never committed)
- Evalscripts live inline in `src/indices.js` — document formula and citation when adding

## Spectral Indices Implemented

NDMI, NDWI, NDSI (Salinity), NDVI, SAVI, MSI, Brine/NDSI, Clay Ratio, HCAI (Hydrocarbons), HMRI (Heavy Metals), PWI (Produced Water Index — composite), SAR VV/VH, True Color, False Color.

---

## Agent Instructions

You operate within a **3-layer architecture**.

**Layer 1 - Directives** (`directives/`): Markdown SOPs for goals, inputs, tools, outputs.
**Layer 2 - Orchestration** (you): Read directives → call scripts → handle errors.
**Layer 3 - Execution** (`execution/`): Deterministic scripts with error handling.

Before acting:
1. Identify target directive(s) in `directives/` (or say "none found")
2. List intended execution scripts (or say "none found")
3. State expected output and location
4. Confirm safety: never commit `config-v1.js`, `config.js`, `app-config.js`, `.env`, or `.tmp/`

Log to `.tmp/runlog.md` for complex tasks.
