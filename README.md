# Sentinel Explorer

A browser-based satellite intelligence tool for detecting produced water spills at oil and gas well pads in the Permian Basin, West Texas and New Mexico.

Built on free Copernicus satellite data (Sentinel-2 optical + Sentinel-1 SAR), it streams processed imagery in real time using custom evalscripts that run directly on Sentinel Hub's servers. No raw data downloads — just the signal.

---

## What it does

- **Visualizes 43+ spectral indices** across Sentinel-2 L2A and Sentinel-1 GRD, from standard NDVI to custom composites designed specifically for brine detection
- **Streams live WMS tiles** using Sentinel Hub's processing API, with calibration injection so thresholds tune without rebuilding evalscripts
- **Computes multi-temporal differences** — compare any two dates to see what changed
- **Accumulates signals** with cumulative MAX mode — catches spills that dried up before your query date
- **Scans an area of interest** with the Statistics API — draw a polygon, get an anomaly timeline across 8 indices simultaneously
- **Bookmarks 18 TRRC-confirmed spill sites** across the Permian Basin as verified test locations

The centerpiece indices — PWI, APEX (Bally Index), and HPWI — were validated against 27 Texas Railroad Commission confirmed produced water spill sites. Multi-index consensus detection reaches ~89% accuracy.

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

## Setup: credentials

All satellite imagery is streamed from the **Copernicus Data Space Ecosystem (CDSE)**. You need a free CDSE account and an OAuth client:

1. Register at [dataspace.copernicus.eu](https://dataspace.copernicus.eu)
2. Go to Dashboard → User Settings → OAuth Clients → Create client
3. Copy `config.example.js` to `config-v1.js`:
   ```bash
   cp config.example.js config-v1.js
   ```
4. Fill in your credentials:
   ```javascript
   window.CONFIG = {
       CDSE_CLIENT_ID: "your-client-id",
       CDSE_CLIENT_SECRET: "your-client-secret"
   };
   ```

`config-v1.js` is gitignored. Never commit credentials.

You also need a **Sentinel Hub WMS configuration** — a layer configuration that defines which datasources are available. The app references this via an instance ID stored in your config. Set up a WMS configuration in the [Sentinel Hub Dashboard](https://shapps.dataspace.copernicus.eu/dashboard/) and add the instance ID to your config file.

---

## Fork: what to change

### Sentinel Hub WMS instance

The WMS layer URL is constructed in `src/map.js`. The instance ID is pulled from `config-v1.js`. You must point this at a Sentinel Hub WMS configuration that includes both `sentinel-2-l2a` and `sentinel-1-grd` datasources.

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

**Custom composites — original work (Bally, 2025–2026):**

| Index | Focus | Validated |
|---|---|---|
| PWI — Produced Water Index | Three-way AND gate: brine × hydrocarbons × heavy metals | 81.5% on 27 TRRC sites |
| APEX — Bally Index | Optical SAR proxy: surface smoothness + dry brine mode | 77.8% (87.5% on 8 GPS-verified) |
| HPWI — Hybrid Produced Water Index | Chemical signal × surface smoothness cross-validator | 66.7% |
| FBC — Ferrugination-Brine Composite | Iron oxidation × brine co-location | — |
| VCBI — Vegetation-Confirmed Brine Index | Brine-kill zone leading edge detection | — |
| LBI — Liquid Brine Index | Active standing brine pools | — |
| TRI — Toxic Residue Index | Forensic mineral scab after evaporation | — |
| BPI — Brine-Pavement Index | Pad-level integrity monitoring | — |
| VSI — Vegetation Stress Index | Sub-lethal brine stress in surviving vegetation | — |
| REAI — Red Edge Alteration Index | Early iron staining via B05/B06 red-edge bands | — |
| EHC — Evaporite Halo Composite | RGB false-color for blowout geometry | — |
| AOI — Anoxic Oxidation Index | Iron state change signature | — |
| SCRI — Salt Crust Roughness Index | SAR-based salt crust confirmation (Sentinel-1) | — |
| CMA — Clay-Mineral Alteration | Clay lattice disruption by produced water | — |
| PHI — Petro-Hydrocarbon Index | Oily brine vs. clean runoff | — |
| HMI — Heavy Metal Interaction | Barium/strontium precipitation proxy | — |

See [SENTINEL_SCIENCE_GUIDE.md](SENTINEL_SCIENCE_GUIDE.md) for the full scientific reference including formulae, physical basis, band-by-band rationale, and validation methodology.

---

## Data

- **Sentinel-2 L2A (optical):** 13 spectral bands, 10–60m resolution, 5-day revisit, free via CDSE
- **Sentinel-1 GRD (SAR):** VV/VH polarization, C-band (~5.5 cm), 5×20m, cloud-penetrating
- **TRRC (Texas Railroad Commission):** Source for the 27 confirmed spill sites used in validation
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
