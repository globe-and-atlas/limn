# Sentinel Explorer

A browser-based research and screening tool for studying produced-water-related spectral anomalies at oil and gas sites in the Permian Basin, West Texas and New Mexico.

Built on free Copernicus satellite data (Sentinel-2 optical + Sentinel-1 SAR), it streams processed imagery in real time using custom evalscripts that run directly on Sentinel Hub's servers. No raw data downloads — just the signal.

---

## What it does

- **Visualizes 43+ spectral indices** across Sentinel-2 L2A and Sentinel-1 GRD, from standard NDVI to custom composites designed specifically for brine detection
- **Streams live WMS tiles** using Sentinel Hub's processing API, with calibration injection so thresholds tune without rebuilding evalscripts
- **Computes multi-temporal differences** — compare any two dates to see what changed
- **Accumulates signals** with cumulative MAX mode — catches spills that dried up before your query date
- **Scans an area of interest** with the Statistics API — draw a polygon, get an anomaly timeline across 8 indices simultaneously
- **Bookmarks documented spill and context sites** across the Permian Basin, with explicit evidence class, source, date role, and coordinate precision

**Current scientific status (2026-07-20):** PWCI, ASAI, and OBEC are experimental screening architectures, not validated detectors. The development pipeline paired recall of 81.5% / 77.8% / 66.7% with background activation of 96.7% / 71.3% / 71.3%. The shipped precision-first viewer produced 0/150 background activations but was also blank at all 11 reviewed positive sites. A 1,224-combination threshold sweep found no useful produced-water/caliche separation at the tested 500 m single-scene support. See [the current status note](knowledge/domain/scientific-status-2026-07-20.md) and [investigation summary](reports/investigation_summary_2026-07-20.md).

**Limn Atlas is separate:** `atlas.html` organizes 91 documented environmental methods into 24 capability families. The default view shows primary methods, variants, components, and references; the Research view separates 51 future models and two retired formulas. Atlas bookmarks and rendered overlays are inspectable context, not extensions of Limn's produced-water validation.

---

## Run

No build step. Open `index.html` directly in a browser, or serve the folder with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

---

## Setup: Sentinel-2 COGs and Google Earth Engine

Limn Produced Water defaults to **public Sentinel-2 L2A Cloud-Optimized GeoTIFFs** through the local endpoint at `/api/cog/tiles/{z}/{x}/{y}`. This avoids Sentinel Hub credits and avoids GEE's slower interactive tile rendering for the main produced-water demo flow.

The COG demo path intentionally exposes only the lenses currently implemented in the COG renderer: **OBEC**, **LBI**, **ASAI**, and **PWCI**. Other support lenses remain available through GEE/Sentinel fallback work, but are hidden or disabled in COG mode so demos do not overclaim unsupported layers. COG mode also disables Diff/Cumulative until temporal COG rendering is implemented.

Limn Atlas still defaults to **Google Earth Engine true-color context** until Atlas-specific formulas are ported to the COG renderer. Earth Engine service-account credentials stay on the server.

1. Copy the safe browser config:
   ```bash
   cp config.example.js config-v1.js
   ```
2. Keep COG enabled for Produced Water and GEE enabled for Atlas context in `config-v1.js`:
   ```javascript
   window.CONFIG = {
       IMAGE_PROVIDER: "cog",
       COG_TILE_ENDPOINT: "/api/cog/tiles",
       GEE_TILE_ENDPOINT: "/api/gee/tiles",
       ATLAS_GEE_TILE_ENDPOINT: "/api/gee/tiles"
   };
   ```
3. Copy the server env template:
   ```bash
   cp .env.example .env
   ```
4. Fill `.env` with a Google Cloud project and Earth Engine service-account credential path:
   ```bash
   GEE_PROJECT=your-google-cloud-project-id
   GEE_SERVICE_ACCOUNT_JSON_PATH=/absolute/path/to/earth-engine-service-account.json
   ```
5. Start the local tile server:
   ```bash
   npm run start:gee
   ```
6. Open `http://127.0.0.1:4177/index.html` or `http://127.0.0.1:4177/atlas.html`.

The server prewarms a small set of Produced Water demo COG tiles on startup by default. To prewarm manually:
```bash
curl 'http://127.0.0.1:4177/api/cog/prewarm?limit=4&radius=0'
```

Use `COG_PREWARM_ON_START=0` to disable startup prewarm, or increase `COG_PREWARM_RADIUS` when you want adjacent tiles cached around each demo bookmark.

`config-v1.js` and `.env` are gitignored. Never commit service-account JSON, private keys, tokens, or filled runtime config.

Browser API keys alone cannot create Earth Engine maps. Atlas/GEE fallback needs service-account or OAuth credentials authorized for Earth Engine. Produced Water COG browsing uses public STAC/COG assets and does not need GEE credentials.

---

## Fork: what to change

### Imagery provider

COG is the Produced Water default. To temporarily use GEE instead, set `IMAGE_PROVIDER: "gee"`. To temporarily fall back to Sentinel Hub, set both `ALLOW_SENTINEL_FALLBACK: true` and `IMAGE_PROVIDER: "sentinelhub"` in `config-v1.js`, then provide the older CDSE/Sentinel Hub fields. Do this only when you intend to spend Sentinel Hub credits.

Sentinel Hub fallback has an additional credit guard. By default:
```javascript
SENTINEL_CREDIT_GUARD: true,
SENTINEL_LIVE_TILES: false,
SENTINEL_MIN_ZOOM: 14
```

The Produced Water and Atlas top-right map toolbars have a **Sentinel** switch for a temporary live Sentinel Hub session. Off keeps the default COG/GEE renderer. On routes the current session through Sentinel Hub WMS, arms live tiles, and still blocks WMS below the configured minimum zoom. Sentinel WMS loading is deliberately conservative: larger 512px tiles, one request at a time, and Retry-After cooldown handling for HTTP 429 rate limits.

For a shareable Produced Water view that is locked to the guarded Sentinel path, use `share.html` or `index.html?share=sentinel-only`. That mode forces Sentinel Hub as the only analysis renderer, locks the Sentinel switch on, keeps the minimum-zoom guard available, and will not request COG or GEE analysis tiles.

### Default map center and bookmarks

The initial map view and spill bookmarks are defined in `src/app.js`. The default center is the Permian Basin (~31.5°N, 102.5°W). To monitor a different region, change the `MAP_CENTER` and `SPILL_BOOKMARKS` constants. Bookmarks link to TRRC-confirmed spill GPS coordinates — replace with your own sites.

### Calibration presets

Two calibration configs are defined in `src/indices.js` (`CALIBRATION_PRESETS`):
- **`permian`** — tuned for arid desert caliche with high natural SWIR background (default)
- **`standard`** — lower thresholds for temperate/agricultural environments

To adapt for a different geology, duplicate and tune the `permian` preset. The key parameters are:
- `bsiMask` — minimum BSI to pass the bare soil gate (default −0.3, very permissive)
- `pwiSalinityOffset` — NDSI threshold above regional background
- `pwiHydrocarbonOffset` — HCAI threshold above regional iron baseline
- `pwiHmriOffset` — HMRI threshold above regional caliche baseline

All calibration values are injected as JavaScript constants into evalscripts at request time via token replacement (`__BSI_MASK__`, `__PWI_SALINITY_OFFSET__`, etc.).

---

## Index library

**Established indices (with literature citations):** NDVI, SAVI, NDWI (Gao variant), NDMI, MSI, BSI, NDSI/SI, CSI, HCAI, HMRI, NDOI, CRSI

**Sentinel Explorer composites and calibrations:**

| Index | Implemented focus | Current status |
|---|---|---|
| PWCI — Produced Water Chemical Index | BSI-gated three-ratio AND architecture (formerly PWI) | Negative discrimination result; screening proxy only |
| ASAI — Arid Salinity Anomaly Index | Wet/surface and dry/saline Sentinel-2 paths (formerly PWOI / APEX) | Negative discrimination result; screening proxy only |
| OBEC — Oil-Brine Emulsion Composite | Blue/SWIR2 + dual-SWIR + NDWI-derived surface context (formerly HPWI) | Negative discrimination result; does not retrieve oil/emulsion |
| FBC ✧ — Ferrugination-Brine Composite | Iron oxidation × brine co-location | — |
| VCBI ✧ — Vegetation-Confirmed Brine Index | Brine-kill zone leading edge detection | — |
| LBI — Liquid Brine Index | Standing-water bypass; brine chemical + liquid + low-veg gates | Per-pixel validation (small N): brine-specific — 0/149 caliche, 0/3 freshwater; J=0.50 vs caliche. Promising standing-brine screening candidate |
| TRI ✧ — Toxic Residue Index | Forensic mineral scab after evaporation | — |
| BPI ✧ — Brine-Pavement Index | Pad-level integrity monitoring | — |
| VSI ✧ — Vegetation Stress Index | Sub-lethal brine stress in surviving vegetation | — |
| REAI ✧ — Red Edge Alteration Index | Early iron staining via B05/B06 red-edge bands | — |
| EHC ✧ — Evaporite Halo Composite | RGB false-color for blowout geometry (formerly EHC) | — |
| AOI ✧ — Anoxic Oxidation Index | Iron state change signature | — |
| SCRI ✧ — Salt Crust Roughness Index | SAR-based salt crust confirmation (Sentinel-1) | — |
| CMA ✧ — Clay-Mineral Alteration | Clay lattice disruption by produced water | — |
| PHI ✧ — Petro-Hydrocarbon Index | Oily brine vs. clean runoff | — |
| HMI ✧ — Heavy Metal Interaction | Barium/strontium precipitation proxy | — |

See [SENTINEL_SCIENCE_GUIDE.md](SENTINEL_SCIENCE_GUIDE.md) for the full scientific reference including formulae, physical basis, band-by-band rationale, and validation methodology.

---

## Data

- **Sentinel-2 L2A (optical):** 13 spectral bands, 10–60m resolution, 5-day revisit, free via CDSE
- **Sentinel-1 GRD (SAR):** VV/VH polarization, C-band (~5.5 cm), 5×20m, cloud-penetrating
- **TRRC (Texas Railroad Commission):** Public source for the 27-record produced-water working set used in pipeline validation (coordinates generalized per RRC data policy; development benchmark, not an audited registry)
- **Archive depth:** Sentinel-2A launched June 2015 — full history available

---

## Key files

```
index.html           # App entry point (no build step)
config.example.js    # Credential template — copy to config-v1.js and fill in
src/
  app.js             # Map init, WMS layers, spill bookmarks
  indices.js         # All 43 index definitions, evalscripts, calibration presets
  map.js             # WMS tile construction and request management
  ui.js              # Control panels and UI logic
  charts.js          # Statistics API scan, anomaly timeline chart
  report.js          # PDF/export generation
  auth.js            # CDSE OAuth token management
execution/           # Python scripts for batch analysis and threshold optimization
tests/               # Node test scripts for evalscript and API validation
SENTINEL_SCIENCE_GUIDE.md   # Full scientific reference (43 indices, SAR physics, validation)
```

---

## Tests

```bash
node tests/test.js          # Index formula sanity checks
node tests/test_fetch.js    # WMS tile fetch test
node tests/test_pwi.js      # PWI evalscript validation
```
