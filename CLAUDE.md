# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

Sentinel Explorer is a browser-based GIS tool for visualizing Sentinel-2 (optical) and Sentinel-1 (SAR) satellite imagery over the Permian Basin. It streams WMS tiles from Copernicus Sentinel Hub using custom evalscripts to compute spectral indices (NDVI, NDMI, NDWI, NDSI, PWI, etc.) and renders them over Leaflet maps with Esri/OSM base layers.

## Commands

```bash
# Open locally
open index.html

# Run tests
node test.js
node test_fetch.js
node test_pwi.js
```

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Main app entry point |
| `app.js` | Core Leaflet map + WMS layer logic |
| `style.css` | UI styles |
| `config.js` | Sentinel Hub instance ID and WMS config |
| `config.example.js` | Safe template for config (commit this, not config.js) |
| `directives/` | SOPs for agent tasks |
| `execution/` | Deterministic scripts |
| `sentinel_explorer_architecture.md` | Full spectral index reference |
| `PWI_SPEC.md` | Produced Water Index specification |

## Conventions

- Use `python3` explicitly
- Use `pathlib.Path` for paths
- Secrets (Sentinel Hub instance ID, API keys) in `.env` or `config.js` — never committed
- Temp outputs in `.tmp/` (never committed)
- Evalscripts live inline in `app.js` — document formula and citation when adding

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
4. Confirm safety: never commit `config.js`, `.env`, or `.tmp/`

Log to `.tmp/runlog.md` for complex tasks.
