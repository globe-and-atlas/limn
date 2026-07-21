# Limn — Produced Water Screening App · Full Recreation Spec

> **Purpose of this document:** a single, self-contained specification that lets another developer (or Claude Sonnet 4.6) rebuild the **produced-water detection app** (`index.html` + `src/`) from scratch, without access to the original repo. This covers **only** the produced-water screening tool — *not* the separate "Limn Atlas" global index library (`atlas.html` / `src/atlas-*.js`), which is explicitly out of scope.
>
> Everything below — band math, evalscripts, palettes, calibration, map plumbing, UI, secondary features — is reproduced from the working source so it can be re-implemented faithfully.

> **Scientific status (2026-07-20):** This document specifies experimental screening software, not validated produced-water detectors. PWCI, ASAI, and OBEC have no useful tested spill/caliche operating point. LBI has been renamed **Liquid/Salinity Response Index** because the preliminary standing-water sample overlaps freshwater controls. Keep implementation fidelity and scientific claim strength separate.

---

## 1. What the app is

**Limn** (by *Globe & Atlas*) is a browser-based satellite spectral-intelligence tool for detecting **produced-water spills**, **oil-brine emulsions**, and **evaporite/blowout anomalies** in the **Permian Basin** (West Texas / SE New Mexico). It streams raster tiles computed on-the-fly from **Copernicus Sentinel-2 L2A** (optical) and **Sentinel-1 GRD** (radar), rendering them as colorized overlays on a **Leaflet** map with selectable base layers.

The user picks a **spectral index** (a per-pixel formula over satellite bands), a **date** (or two dates to compare), and the app fetches a colorized tile layer where bright pixels = high produced-water likelihood. It adds time-series charts, an AOI anomaly scanner, change-detection (swipe / diff / cumulative), animated GIFs, and a printable report.

**Core domain truth (do not get this wrong):**
- Almost every flagship index is **pure Sentinel-2 optical**. Where the code/descriptions mention "SAR" or "radar smoothness," for the optical indices that is a **physical analogy** — an *optical proxy* (a band ratio that mimics how smooth/wet surfaces suppress radar backscatter), **not** actual Sentinel-1 data.
- Only **two** indices use real Sentinel-1 GRD radar: `s1_sar` (SAR Moisture VV/VH) and `scri` (Salt Crust Roughness Index). The "Visual SAR Overlay" toggle also layers real S1 tiles on top of optical as a confirmation check.
- There is **no multi-sensor S1+S2 fusion** in production. A `genDeepFusionEvalscript` helper exists but is dead code — never wire it to an index. WMS rejects multi-datasource evalscripts.

---

## 2. Tech stack & external dependencies

- **Pure static front-end** — no build step. Plain ES modules loaded via `<script type="module">`. Open `index.html` directly or serve statically.
- **Leaflet 1.9.4** (map engine) — CSS + JS from `unpkg.com`.
- **leaflet-side-by-side 2.0.0** (`digidem` fork, jsDelivr CDN) — the swipe compare control. Requires a shim because it uses the deprecated `L.Mixin.Events`:
  ```js
  L.Mixin = L.Mixin || {};
  L.Mixin.Events = L.Mixin.Events || L.Evented.prototype;
  ```
- **Leaflet.draw 1.0.4** (cdnjs) — AOI rectangle/polygon drawing.
- **Chart.js 4.4.2** (jsDelivr) — trend charts.
- **gifshot 0.3.2** (cdnjs) — client-side GIF animation export.
- **Fonts:** Google Fonts — `JetBrains Mono` (monospace UI/data) + `Instrument Sans` (UI text).
- **No bundler, no npm runtime deps.** (A `package.json` exists only for Node test scripts.)

**Brand palette (CSS):** accent cyan `#00D2FF`, accent purple `#8C00FF`, near-black bg `#0A0B14`/`#111`, glassmorphism panels (`backdrop-filter: blur(...)`, translucent dark fills). Dark theme throughout.

---

## 3. File structure

```
index.html            Main app entry. All markup + CDN script tags. Loads src/*.js as modules.
style.css             All UI styles (glass panels, sidebar, legend, report modal, etc.).
config-v1.js          Active config (gitignored — holds secrets). Sets window.CONFIG.
config.example.js     Safe template to copy → config-v1.js.

src/
  app.js              Core orchestration: state, init, event wiring, date list, spill bookmarks,
                      base layers, AOI scan, report glue. ~3400 lines, the conductor.
  indices.js          THE HEART. Index catalog (bands + evalscripts + formulas + palettes),
                      calibration presets, evalscript generators, colorBlend, highlight thresholds.
  map.js              Leaflet map init, tile-layer construction (WMS/COG/GEE), rate limiting,
                      Sentinel credit guard, applyIndex(), change-detection script assembly, GIF inset.
  auth.js             CDSE OAuth2 token (client-credentials) for Sentinel Hub. Routed via CORS proxy.
  charts.js           Trend charts, AOI peak-anomaly detection (canvas pixel scan), scan thumbnails.
  report.js           PDF/HTML report generation, RRC spill GeoJSON overlay, FIS acquisition probing.
  ui.js               Small helpers: toasts, tab switching, legend/UI refresh.
```

Out of scope (Atlas — ignore): `atlas.html`, `src/atlas-app.js`, `src/atlas-indices.js`, `src/atlas-s5p-demos.js`, `src/atlas-sar-demos.js`, `src/verifiedBookmarks.js`, `src/authorshipClaims.js`.

---

## 4. Sentinel-2 L2A band reference

All optical indices use **surface reflectance** values (0–1 floats) from these S2 bands. Evalscripts request bands by name; Sentinel Hub resamples to the tile resolution.

| Band | Name | Center λ | Native res | Role in this app |
|------|------|----------|-----------|------------------|
| B02 | Blue | 490 nm | 10 m | Iron-oxide ratios, oil (NDOI), BSI |
| B03 | Green | 560 nm | 10 m | NDWI, smoothness proxy, HMRI denominator |
| B04 | Red | 665 nm | 10 m | NDVI, HCAI, iron oxide (B04/B02) |
| B05 | Red Edge 1 | 705 nm | 20 m | Red-edge iron (REAI), veg stress (VSI) |
| B06 | Red Edge 2 | 740 nm | 20 m | Red-edge iron ratio (B06/B05) |
| B07 | Red Edge 3 | 783 nm | 20 m | Veg-stress red-edge delta (VSI) |
| B08 | NIR | 842 nm | 10 m | NDVI, NDMI, BSI, vegetation gates |
| B8A | Narrow NIR | 865 nm | 20 m | NDMI, MSI (more water-sensitive than B08) |
| B11 | SWIR 1 | 1610 nm | 20 m | **Workhorse** — moisture, salinity, clay, hydrocarbons |
| B12 | SWIR 2 | 2190 nm | 20 m | Salinity (NDSI), oil absorption, clay ratio |

**Sentinel-1 GRD** (radar, for `s1_sar` and `scri` only): polarizations **VV** and **VH** (linear power; convert to dB via `10*log10(x)`).

Every evalscript also requests a synthetic **`dataMask`** band (1 = valid pixel, 0 = no-data/cloud-gap) and returns `[0,0,0,0]` (transparent) when `dataMask === 0`.

---

## 5. Spectral index reference (formulas the app builds on)

These normalized differences/ratios are the building blocks. Composite indices below combine several of them.

| Symbol | Formula | Meaning |
|--------|---------|---------|
| NDVI | `(B08−B04)/(B08+B04)` | Vegetation density |
| NDMI | `(B8A−B11)/(B8A+B11)` | Canopy/topsoil moisture |
| NDWI | `(B03−B11)/(B03+B11)` | Open water / wetness |
| NDSI (brine) | `(B11−B12)/(B11+B12)` | **Salinity/brine** — the key chemistry signal |
| BSI | `((B11+B04)−(B08+B02))/((B11+B04)+(B08+B02))` | Bare/disturbed soil (masks veg & water) |
| HCAI | `(B11−B04)/(B11+B04)` | Hydrocarbon absorption |
| HMRI | `B12/B03` | Heavy-metal reflectance (Ba/Sr precipitation) |
| NDOI | `(B02−B12)/(B02+B12)` | Oil slicks |
| MSI | `B11/B08` (or `B11/B8A`) | Moisture stress |
| SI | `(B11−B08)/(B11+B08)` | Salinity / salt crust |
| CRSI | `sqrt((B08·B04 − B03·B02)/(B08·B04 + B03·B02))` | Canopy salinity stress |
| Clay ratio | `B11/B12` | Clay-mineral alteration |
| Iron oxide | `B04/B02` | Ferric staining |
| Smoothness proxy | `(B03−B11)/(B03+B11)` | Optical stand-in for SAR backscatter dampening |

---

## 6. Evalscript engine (`src/indices.js`)

Sentinel Hub **evalscripts** (`//VERSION=3`) are tiny JS programs run server-side per pixel. They `setup()` which bands to input and how many output bands, then `evaluatePixel(sample)` returns `[r,g,b,a]` in 0–1. The app generates these strings dynamically.

### 6.1 Standard generator

```js
export const genEvalscript = (bands, logic) => `//VERSION=3
function setup() {
  return {
    input: [${bands.map(b => `'${b}'`).join(', ')}, "dataMask"],
    output: { bands: 4 }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0, 0, 0, 0];
  ${logic}
}
`;
```

### 6.2 Difference generator (change detection T1→T2)

Uses `mosaicking: "ORBIT"` so multiple scenes arrive in one `samples` array. Computes the index at the **oldest** (`samples[samples.length-1]`, T1) and **newest** (`samples[0]`, T2), then color-codes the delta: strong decrease → red, strong increase → blue, stable → faint gray. `VISUAL_FILTER` masks small changes.

```js
export const genDiffEvalscript = (bands, calcLogic) => `//VERSION=3
function setup() {
  return { input: [${bands.map(b=>`'${b}'`).join(', ')}, "dataMask"], output: { bands: 4 }, mosaicking: "ORBIT" };
}
function evaluatePixel(samples) {
  if (samples.length < 2) return [0, 0, 0, 0.1];
  let s1 = samples[samples.length - 1];   // T1 (oldest)
  let s2 = samples[0];                     // T2 (newest)
  if (s1.dataMask === 0 || s2.dataMask === 0) return [0, 0, 0, 0];
  let val1 = ${calcLogic.replace(/sample/g, 's1')};
  let val2 = ${calcLogic.replace(/sample/g, 's2')};
  let diff = val2 - val1;
  if (typeof VISUAL_FILTER !== 'undefined' && Math.abs(diff) < (VISUAL_FILTER * 0.3)) return [0,0,0,0];
  if (diff < -0.15) return [1.0, 0.2, 0.2, 0.8];   // strong decrease (red)
  if (diff < -0.05) return [1.0, 0.4, 0.4, 0.6];
  if (diff >  0.15) return [0.2, 0.6, 1.0, 0.8];   // strong increase (blue)
  if (diff >  0.05) return [0.4, 0.7, 1.0, 0.6];
  return [0.2, 0.2, 0.2, 0.3];                     // stable
}
`;
```

### 6.3 Cumulative generator (max-over-time footprint)

Walks every scene in the window and keeps the **maximum** index value per pixel — ideal for tracking a spill footprint across time. Applies a palette to that max.

```js
export const genCumulativeEvalscript = (bands, logic, paletteStr) => `//VERSION=3
function setup() {
  return { input: [${bands.map(b=>`'${b}'`).join(', ')}, "dataMask"], output: { bands: 4 }, mosaicking: "ORBIT" };
}
function evaluatePixel(samples) {
  let maxVal = 0;
  for (let i = 0; i < samples.length; i++) {
    let sample = samples[i];
    if (sample.dataMask === 0) continue;
    let val = ${logic};
    if (val > maxVal) maxVal = val;
  }
  if (maxVal === 0) return [0, 0, 0, 0];
  ${colorBlend('maxVal', paletteStr)}
}
`;
```

### 6.4 `colorBlend` — continuous palette interpolation

Maps a 0–1 value through a list of `[stop, R, G, B, (alpha?)]` color stops with linear interpolation, clamps to [0,1], and honors `VISUAL_FILTER` (hides values below the slider threshold). This is what turns a scalar score into a smooth color ramp.

```js
export function colorBlend(valExpr, stopsStr) {
  return `
  let v = ${valExpr};
  if (!isFinite(v) || isNaN(v)) return [0,0,0,0];
  v = Math.max(0, Math.min(1, v));
  if (typeof VISUAL_FILTER !== 'undefined' && v < VISUAL_FILTER) return [0,0,0,0];
  const stops = ${stopsStr};
  let i = 0;
  while (i < stops.length - 1 && v >= stops[i+1][0]) { i++; }
  if (i === stops.length - 1) {
      let s = stops[i]; let a = (s.length > 4) ? s[4] : 1.0;
      return [s[1]/255, s[2]/255, s[3]/255, a];
  }
  let s0 = stops[i], s1 = stops[i+1];
  let t = (v - s0[0]) / (s1[0] - s0[0]);
  let a0 = (s0.length > 4) ? s0[4] : 1.0;
  let a1 = (s1.length > 4) ? s1[4] : 1.0;
  return [
      (s0[1] + t*(s1[1]-s0[1]))/255,
      (s0[2] + t*(s1[2]-s0[2]))/255,
      (s0[3] + t*(s1[3]-s0[3]))/255,
      a0 + t*(a1-a0)
  ];`;
}
```

### 6.5 Two injected runtime constants

Before sending an evalscript, `map.js` prepends a header defining two globals the scripts read:

```js
const VISUAL_FILTER = <state.visualFilter>;             // 0..1, from the sensitivity/visual filter slider
const DETECTION_SENSITIVITY = <activeSensitivity/100>;  // -0.5..0.5, shifts detection thresholds
```

`VISUAL_FILTER` hides low scores; `DETECTION_SENSITIVITY` loosens/tightens gates in composite indices (only applied to spill indices).

### 6.6 Calibration placeholders

Composite evalscripts contain literal placeholder tokens that get string-replaced at request time from a calibration preset:

```js
export const CALIBRATION_PRESETS = {
  permian: { name:"Permian Basin (Arid)", bsiMask:-0.3, bsiOffset:0.3, ndwiOffset:0.5,
             pwiSalinityOffset:0.10, pwiHydrocarbonOffset:0.30, pwiHmriOffset:2.0 },
  standard: { name:"Standard (Temperate/Wet)", bsiMask:-0.1, bsiOffset:0.0, ndwiOffset:0.0,
             pwiSalinityOffset:0.05, pwiHydrocarbonOffset:0.15, pwiHmriOffset:1.5 }
};
```

Tokens (replaced globally in the script string): `__BSI_MASK__`, `__BSI_OFFSET__`, `__NDWI_OFFSET__`, `__PWI_SALINITY_OFFSET__`, `__PWI_HC_OFFSET__`, `__PWI_HMRI_OFFSET__`.

**Important:** calibration + sensitivity are applied **only** to the produced-water "spill" indices; everything else uses `standard` / sensitivity 0. The spill-index key set (in `map.js getScriptContent`):
```js
['pwi','pwoi','hpwi','ehc','lbi','fbc','reai','vcbi','aoi','cma','hmi','phi','tri','bpi','mvpi']
```

---

## 7. Palettes

Each is a string of `[stop, R, G, B, (alpha)]` stops (0–255 channels). Defined as exported constants in `indices.js`. Key ones:

```js
PALETTE_NDMI = "[[0,212,106,36],[0.35,239,216,122],[0.6,28,133,166],[1,10,60,100]]";
PALETTE_NDWI = "[[0,130,70,20],[0.35,215,170,60],[0.6,80,150,200],[1,20,80,180]]";
PALETTE_SI   = "[[0,36,51,64],[0.15,180,130,40],[0.3,220,140,50],[1,240,80,30]]";
PALETTE_VEG  = "[[0,160,120,50],[0.3,210,180,60],[0.6,90,160,60],[1,20,100,40]]";
PALETTE_MSI  = "[[0,28,133,166],[0.5,239,216,122],[1,212,106,36]]";
PALETTE_BRINE= "[[0,10,60,100],[0.35,120,100,50],[0.6,240,80,30],[1,230,20,20]]";
PALETTE_CSI  = "[[0,160,120,50],[0.5,100,220,80],[1,0,255,255]]";
PALETTE_HCAI = "[[0,245,222,179],[0.5,139,69,19],[1,0,0,0]]";
PALETTE_HMRI = "[[0,230,230,250],[0.5,128,0,128],[1,255,0,255]]";
PALETTE_PWI  = "[[0,0,0,0.0],[0.1,0,255,255,1.0],[0.5,255,0,255,1.0],[1,255,255,0,1.0]]";
PALETTE_BSI  = "[[0,0,0,0],[0.1,68,136,51],[0.15,210,180,60],[1,160,120,50]]";
PALETTE_REAI = "[[0,13,26,46],[0.35,46,92,138],[0.65,196,122,30],[1,232,196,74]]";
PALETTE_VCBI = "[[0,10,32,16],[0.3,26,96,48],[0.6,200,160,0],[1,224,80,16]]";
PALETTE_FBC  = "[[0,26,8,0],[0.3,139,37,0],[0.6,212,88,26],[1,255,179,71]]";
PALETTE_HPWI = "[[0,44,62,80],[0.5,241,196,15],[1,231,76,60]]";
PALETTE_LBI  = "[[0,0,0,0],[0.3,0,210,255],[0.7,0,136,255],[1,255,0,255]]";
PALETTE_TRI  = "[[0,26,10,0],[0.3,128,64,0],[0.7,153,51,255],[1,255,0,255]]";
PALETTE_BPI  = "[[0,34,34,34],[0.3,68,68,68],[0.7,0,255,255],[1,255,255,0]]";
PALETTE_VSI  = "[[0,0,85,0],[0.3,255,255,0],[0.7,255,136,0],[1,255,0,0]]";
PALETTE_CMA  = "[[0,68,34,0],[0.3,136,68,0],[0.7,170,136,170],[1,255,255,255]]";
PALETTE_APEX = "[[0,0,0,0,0.0],[0.45,0,0,0,0.0],[0.55,0,220,255,1.0],[0.75,255,0,255,1.0],[1,140,0,255,1.0]]";
PALETTE_PHI  = "[[0,0,0,0],[0.3,51,51,51],[0.7,102,51,0],[1,255,204,0]]";
PALETTE_HMI  = "[[0,0,17,0],[0.3,0,68,0],[0.7,0,255,187],[1,255,255,255]]";
PALETTE_SCRI = "[[0,0,0,0],[0.2,75,0,130],[0.6,231,76,60],[1,241,196,15]]";
PALETTE_MSI_INV="[[0,212,106,36],[0.5,239,216,122],[1,28,133,166]]";
PALETTE_METHANE="[[0.0,13,23,27],[0.3,245,120,20],[0.75,255,180,0],[1.0,255,255,200]]";
```

---

## 8. The index catalog (`INDICES`)

`INDICES` is a big object keyed by short id. Each entry has:
`name, sensor, temporal, min, max, gradient (CSS for legend bar), formula (display), info (long description), diffLabels, evalscript (string), fisBands (bands for statistics), fisLogic (statistics formula returning [value])`.

`fisLogic` is the same math but returns a raw scalar `[v]` instead of a color — used for the FIS/statistics API and for the AOI peak-detection encoder.

### 8.1 Flagship produced-water composites (custom — "Globe & Atlas · Limn")

These are the headline detectors. Public-facing names were rebranded; **keep the internal keys**.

| Key | Public name | Formula (concept) | Bands |
|-----|-------------|-------------------|-------|
| `pwoi` | **ASAI** — Arid Salinity Anomaly Index | Specular-smoothness proxy × salinity/crust, + dry-brine path | B02,B03,B04,B08,B11,B12 |
| `hpwi` | **OBEC** — Oil-Brine Emulsion Composite | Chemical (NDOI+NDSI) × smoothness proxy | B02,B03,B11,B12 |
| `pwi` | **PWCI** — Produced Water Chemical Index | (NDSI−off)·(HCAI−off)·(HMRI−off), cubic, BSI-masked | B02,B03,B04,B08,B11,B12 |
| `lbi` | **LBI** — Liquid/Salinity Response Index | NDSI·NDWI·(low-veg)·BSI gates, standing-water bypass | B02,B03,B04,B08,B11,B12 |
| `fbc` | **FBC** — Ferrugination-Brine Composite | iron(B04/B02)·brine(NDSI)·(1−NDVI) | B02,B03,B04,B08,B11,B12 |
| `reai`| **REAI** — Red Edge Alteration Index | (B06/B05)·NDSI | B05,B06,B11,B12 |
| `vcbi`| **VCBI** — Veg-Confirmed Brine | max(0,−CRSI)·NDSI | B02,B03,B04,B08,B11,B12 |
| `ehc` | **EHC** — Evaporite Halo Composite | RGB: R=NDOI, G=BSI, B=NDSI (morphology view) | B02,B04,B08,B11,B12 |
| `vsi` | **VSI** — Vegetation Stress Index | NDSI·redEdgeDelta·MSI | B05,B07,B11,B12,B8A |
| `aoi` | **AOI** — Anoxic Oxidation | (B04/B02)·(B11/B12) | B02,B04,B11,B12 |
| `bpi` | **BPI** — Brine-Pavement Index | NDSI·HCAI·BSI (pad/road) | B02,B04,B08,B11,B12 |
| `tri` | **TRI** — Toxic Residue Index | NDSI·HMRI·AOI (forensic) | B02,B03,B04,B11,B12 |
| `scri`| **SCRI** — Salt Crust Roughness | log10(VH) + salt proxy (**S1 radar**) | VV,VH |
| `phi` | **PHI** — Petro-Hydrocarbon Index | NDSI·(B11/B12)·HCAI | B04,B11,B12 |
| `cma` | **CMA** — Clay-Mineral Alteration | NDSI·(B11/B12)·(B04/B02) | B02,B04,B11,B12 |
| `hmi` | **HMI** — Heavy Metal Interaction | (B03/B02)·(B11/B12) | B02,B03,B11,B12 |
| `mvpi`| **MVPI** — Methane Venting Plume | bright-soil × SWIR methane ratio × water/veg gates | B03,B04,B08,B11,B12 |

#### Verbatim evalscript logic for the four headline indices

These are the make-or-break formulas; reproduce exactly. (Each is wrapped by `genEvalscript(bands, logic)` unless noted.)

**`pwoi` / ASAI** — dual-path (wet specular + dry salt-crust), thresholds at 0.60:
```js
// bands: B02,B03,B04,B08,B11,B12
// WET PATH — optical proxy for SAR surface smoothness
let sum = sample.B03 + sample.B11;
let oVal = sum === 0 ? 0 : (sample.B03 - sample.B11) / sum;
let radarProxy = Math.max(0, Math.min(1.0, (oVal + 0.3) / 0.6));
let ndsiDen = sample.B11 + sample.B12;
let ndsiVal = ndsiDen === 0 ? 0 : (sample.B11 - sample.B12) / ndsiDen;
let salinityGate = Math.max(0, Math.min(1, (ndsiVal - 0.035) / 0.16));
let wetScore = 0;
if (radarProxy > 0.58 && salinityGate > 0) {
    wetScore = Math.min(1, (radarProxy * 0.42) + (salinityGate * 0.58));
}
// DRY BRINE PATH — evaporated salt crusts: dry bare soil + elevated NDSI
let bsiDen = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
let bsiDry = bsiDen === 0 ? 0 : ((sample.B11 + sample.B04) - (sample.B08 + sample.B02)) / bsiDen;
let dryScore = 0;
if (oVal < -0.42 && ndsiVal > 0.15 && bsiDry > 0.52) {
    dryScore = Math.max(0, Math.min(1, (ndsiVal - 0.15) / 0.16 * 0.45 + 0.55));
}
let finalVal = Math.min(Math.max(Math.max(wetScore, 0), dryScore), 1);
if (finalVal < 0.60) return [0,0,0,0];
${colorBlend('finalVal', PALETTE_APEX)}
```
> Note: ASAI/`pwoi` uses a **30-day backward time window** (not a single date) and a relaxed `maxcc=60`. See §10.3.

**`hpwi` / OBEC** — chemical × smoothness, uses `DETECTION_SENSITIVITY`:
```js
// bands: B02,B03,B11,B12
if (sample.dataMask === 0) return [0,0,0,0];
let sumNdoi = sample.B02 + sample.B12;
if (sumNdoi === 0) return [0,0,0,0];
let ndoi = Math.max(0, (sample.B02 - sample.B12) / sumNdoi);
let ndsiSum = sample.B11 + sample.B12;
let ndsi = ndsiSum === 0 ? 0 : (sample.B11 - sample.B12) / ndsiSum;
let brineThreshold = Math.max(0.04, 0.06 - (DETECTION_SENSITIVITY * 0.03));
let brineBoost = Math.max(0, ndsi - brineThreshold) * 0.8;
let chemSignal = Math.min(1, ndoi + brineBoost);
let sumSmooth = sample.B03 + sample.B11;
let smoothness = sumSmooth === 0 ? 0 : (sample.B03 - sample.B11) / sumSmooth;
let normSmooth = Math.max(0, Math.min(1, (smoothness + 0.3) / 0.6));
let score = chemSignal * normSmooth;
let mapped = Math.max(0, Math.min(1, score * 6.0));
if (mapped < 0.08) return [0,0,0,0];
${colorBlend('mapped', `[[0.0,17,17,17,0.0],[0.3,75,0,130],[0.7,231,76,60],[1.0,241,196,15]]`)}
```

**`pwi` / PWCI** — three-way AND gate with cubic scaling, BSI mask, calibration tokens:
```js
// bands: B02,B03,B04,B08,B11,B12
let bsiTop = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
let bsiBot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
if (bsiBot === 0) return [0,0,0,0];
let bsi = bsiTop / bsiBot;
if (bsi <= __BSI_MASK__) return [0,0,0,0];
let sumBrine = sample.B11 + sample.B12;
if (sumBrine === 0) return [0,0,0,0];
let brine = (sample.B11 - sample.B12) / sumBrine;
let sumHcai = sample.B11 + sample.B04;
if (sumHcai === 0) return [0,0,0,0];
let hcai = (sample.B11 - sample.B04) / sumHcai;
if (sample.B03 === 0) return [0,0,0,0];
let hmri = sample.B12 / sample.B03;
let brineScore = Math.max(0, brine - __PWI_SALINITY_OFFSET__);
let hcaiScore  = Math.max(0, (hcai - __PWI_HC_OFFSET__) * 2);
let hmriScore  = Math.max(0, (hmri - __PWI_HMRI_OFFSET__) * 2);
let pwi = brineScore * hcaiScore * hmriScore;
let mapped = Math.min(1.0, Math.pow(pwi * 20.0, 3.0));
if (mapped < 0.05) return [0,0,0,0];
${colorBlend('mapped', PALETTE_PWI)}
```

**`lbi` / LBI** — standing-pool detector with deep-water bypass:
```js
// bands: B02,B03,B04,B08,B11,B12
let ndsiSum = sample.B11 + sample.B12;
let ndsi = ndsiSum === 0 ? 0 : (sample.B11 - sample.B12) / ndsiSum;
let ndwiSum = sample.B03 + sample.B11;
let ndwi = ndwiSum === 0 ? 0 : (sample.B03 - sample.B11) / ndwiSum;
let ndviSum = sample.B08 + sample.B04;
let ndvi = ndviSum === 0 ? 0 : (sample.B08 - sample.B04) / ndviSum;
let bsiTop = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
let bsiBot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
let bsi = bsiBot === 0 ? 0 : bsiTop / bsiBot;
let isStandingWater = ndwi > 0.30;
if (bsi <= -0.25 && !isStandingWater) return [0,0,0,0];
let brineGate = Math.max(0, ndsi - 0.02);
let liquidGate = Math.max(0, ndwi + 0.40);
let lowVegGate = Math.max(0, 0.45 - ndvi);
let surfaceGate = isStandingWater ? 1.0 : Math.max(0, bsi + 0.20);
let score = brineGate * liquidGate * lowVegGate * surfaceGate;
let mapped = Math.min(1, score * 20.0);
if (mapped < 0.08) return [0,0,0,0];
${colorBlend('mapped', `[[0.0,0,0,0],[0.3,0,85,255],[0.7,0,210,255],[1.0,255,255,255]]`)}
```

The remaining composites (`fbc`, `reai`, `vcbi`, `aoi`, `bpi`, `tri`, `phi`, `cma`, `hmi`, `vsi`, `mvpi`, `ehc`, `scri`) all follow the same pattern: compute 2–3 sub-indices, multiply through `Math.max(0, x − threshold)` gates, scale with a multiplier and sometimes `Math.pow(...)` to suppress background, clamp to [0,1], early-return transparent below a small floor, then `colorBlend(mapped, PALETTE_X)`. Their exact constants are listed in §8.1 and the formula column; reproduce from the original `indices.js` block for each. `ehc` is a **direct RGB** script (no colorBlend): `red=max(0,NDOI*3)`, `green=max(0,BSI*2)`, `blue=max(0,NDSI*4)`. `scri`/`s1_sar` use S1 VV/VH in dB.

### 8.2 Context and gate-diagnostic indicators

`ndsi` is a dual-SWIR NDTI/NBR2-form contrast; `si` is SWIR1–NIR contrast; `hcai` is SWIR1–Red contrast; `ndoi` is Blue–SWIR2 contrast; `csi` is the SWIR1/SWIR2 ratio; and `hmri` is the SWIR2/Green ratio. The historical keys remain load-bearing for reproducibility, but these broad-band responses do not retrieve brine, salt concentration, petroleum, contamination, or heavy metals. `bsi` supplies bare-soil/disturbance context and `s1_sar` supplies S1 VV/VH surface-backscatter context.

### 8.3 General reference

`none` (hide overlay), `tc` (True Color RGB B04/B03/B02 ×2.5), `fc` (False Color B08/B04/B03), `ndvi`, `ndwi`, `ndmi`, `msi`, `savi`, `crsi`.

### 8.4 Per-index scan thresholds & chart colors

```js
HIGHLIGHT_THRESHOLDS = { pwi:0.10, hpwi:0.05, pwoi:0.05, fbc:0.10, lbi:0.08, ndmi:0.35,
  ndwi:0.15, si:0.15, ndsi:0.15, bsi:0.10, csi:1.20, hcai:0.10, hmri:0.10, ndoi:0.15,
  msi:1.20, savi:0.25, vsi:0.10, scri:0.10, tri:0.08, bpi:0.08, mvpi:0.10 };
```
`CHART_COLORS` maps each key to a hex line color. `getShortIndexName(key)` maps internal keys → display labels (pwi→PWCI, hpwi→OBEC, pwoi→ASAI, etc.).

---

## 9. Imagery providers & tile construction (`src/map.js`)

The app supports **three** tile providers, chosen by `config.IMAGE_PROVIDER`:

1. **`cog`** (default for Produced Water) — proxies to a backend COG endpoint `/api/cog/tiles/{z}/{x}/{y}?...` (Element84 Earth Search public Sentinel-2 COGs). Ten-meter-only formulas use 256px/10 m grid requests; formulas containing 20 m SWIR or red-edge bands use a 512px Leaflet tile backed by the next-lower XYZ level, preserving the native 20 m information scale while avoiding false oversampling.
2. **`gee`** — proxies to `/api/gee/tiles/{z}/{x}/{y}?...` (a Google Earth Engine backend). 512px tiles, retina.
3. **`sentinelhub`** — direct **WMS** calls to Copernicus Sentinel Hub (spends credits; gated behind a "credit guard"). This is the provider that uses the evalscripts directly client-side.

`getIndexLayer(state, config, timeStr, isDiff, overrideIndex)` dispatches to the right builder. For COG/GEE it builds a URL with query params (`index, time, diff, cumulative, basin, visualFilter, sensitivity`) — the heavy lifting (evalscript) happens server-side from the same index id. For Sentinel Hub it builds the evalscript client-side and base64-encodes it into the WMS `evalscript` param.

### 9.1 WMS layer construction (the credit-spending path)

`getWMSLayer(...)`:
- Endpoint: `SH_WMS_URL` (a Sentinel Hub OGC WMS instance URL, e.g. `https://sh.dataspace.copernicus.eu/ogc/wms/<instance-id>`).
- WMS layer param: `'AGRICULTURE'` for optical; `'SENTINEL1-GRD'` when the index sensor is Sentinel-1 (`s1_sar`, `scri`).
- Params: `format=image/png`, `transparent=true`, `version=1.3.0`, `time=<date or T1/T2 range>`, `maxcc=<cloud %>`, `showlogo=false`, and `evalscript=<base64>`.
- **Evalscript encoding:** strip comments, trim each line, drop blanks, then `btoa(unescape(encodeURIComponent(script)))`.
- `maxcc` default 20; **60 for `pwoi`/ASAI** (wider window needs more eligible scenes).
- 256px tiles, `minZoom: 10`, `crossOrigin: 'anonymous'`, `updateWhenIdle: true`, `keepBuffer: 0`.

### 9.2 Rate limiting

Both WMS and GEE/COG tiles use a custom `L.TileLayer(.WMS).extend(...)` subclass (`RateLimitedWMS` / `RateLimitedTile`) that:
- Queues tile fetches and caps concurrency (`maxConcurrent`: 1 for WMS, 6 for COG, 2 for GEE).
- Cancels queued and active browser requests when a layer is removed; the COG server also terminates an orphaned Python render when no clients remain.
- Disables Leaflet Retina request multiplication for COG layers because the source bands, rather than display pixel density, determine scientific resolution.

The COG renderer ports the six diagnostic displays with formula parity to `indices.js`: `ndsi = max(0, 2·ND(B11,B12))`; `si = max(0, 2·ND(B11,B08))`; `hcai = max(0, 3·(ND(B11,B04)−0.30))`; `ndoi = max(0, 2·ND(B02,B12))`; `csi = clamp((B11/B12−0.5)/2)`; and `hmri = clamp((B12/B03−2)/3)`. Each uses its continuous palette and the standard visual filter. These transforms support visual interpretation only and do not change the underlying component definition or establish chemical specificity.

The COG renderer uses a visible screening display for `pwi`, `pwoi`, `hpwi`, and `lbi`: clear sub-threshold pixels receive a neutral low-alpha veil, non-zero sub-threshold scores receive muted palette color, and threshold-passing candidates retain bright palette color. This is a display-only RGB/alpha rule. It does not alter the scalar formulas, masks, thresholds, or candidate status.
- Fetches each tile via `fetch()` → `blob()` → `URL.createObjectURL` → `img.src` (so HTTP errors are catchable; revokes the object URL on load).
- On **HTTP 429**, reads `Retry-After`, sets a global cooldown, fires a `ratelimit` event, and retries with backoff.
- Parses Sentinel Hub XML `ServiceException` / JSON error bodies into readable messages; flags `insufficient processing units` as quota-exhausted.
- Fires map events `tileerror`, `tileloadstart`, `load`→`tileloadfinish` so the UI can show a loading bar / error toasts.

### 9.3 Sentinel credit guard

To avoid burning Copernicus credits, WMS tiles are **blocked by default** unless armed:
- `getSentinelCreditGuardStatus(state, config)` returns `{blocked, reason}`. Blocked if guard enabled AND (`not armed` OR `zoom < minZoom`).
- Armed via the "Sentinel" checkbox (`state.sentinelLiveTiles`) + a min-zoom slider (`state.sentinelMinZoom`, default 14, range 10–17).
- When blocked, `getSentinelGuardLayer` returns an empty transparent grid layer and fires a `sentinelguard` event (UI shows "Guarded" / "Z14+").
- A `?share=sentinel-only` (or `?mode=sentinel`) URL param flips config to force live Sentinel Hub tiles (used for shared read-only links).

### 9.4 `applyIndex` — the render orchestrator

`applyIndex(state, config, isScrubbing)`:
- Removes existing overlay/left/right groups + side-by-side control (unless scrubbing on WMS, where it can mutate `time` params in place via `setParams`).
- `mode === 'single'`: builds one index layer for `ALL_DATES[monthIndex].value`; adds an optional `s1_sar` overlay if SAR fusion is on. Wraps in `L.layerGroup` → `state.overlayGroup`.
- `mode === 'compare'`:
  - `swipe`: two layers (T1 left, T2 right) + `L.control.sideBySide(...)`.
  - `diff`: one `genDiffEvalscript` layer over time range `T1/T2`.
  - `cumulative`: one `genCumulativeEvalscript` layer over `T1/T2`.
- After render (non-scrubbing) it refreshes the GIF inset and scan thumbnails if applicable.

`getScriptContent(config, activeIndex, isDiff, isCumulative, state)` assembles the final evalscript: picks the base/diff/cumulative variant, applies calibration + sensitivity, then prepends the `VISUAL_FILTER`/`DETECTION_SENSITIVITY` header. For diff and cumulative modes there are per-index inline formula maps (a big `if/else` ladder) — replicate them from `map.js` lines ~383–635.

---

## 10. Map, dates, base layers, state (`src/app.js`)

### 10.1 Base layers

```js
const BASE_LAYERS = {
  imagery: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  topo:    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
  osm:     'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  dark:    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
};
```
Default base = `imagery` (Esri World Imagery). `maxZoom: 18`. Top-right buttons switch base; the satellite index overlay sits above the base at `zIndex 10` (override/SAR overlay at 20).

### 10.2 Map init & default view

`initLeafletMap('map', startLoc)` → `L.map(id, { center:[lat,lng], zoom, zoomControl:false, attributionControl:true })`. The app opens on the **default spill bookmark** (Lake Boehmer) with the **OBEC** (`hpwi`) index. Fallback AOI center ≈ `31.893285, -101.864031` (Dixon, TX). The app's initial spill is `lake-boehmer-pecos-orphan` at `31.226, -102.729, zoom 14`.

### 10.3 Date list

Dates are generated daily from `2020-01-01` to **today**:
```js
const START_YEAR = 2020;
// build ALL_DATES = [{ value:'YYYY-MM-DD', label:'Mon D, YYYY', short:"Mon D, 'YY", displayStr }]
// iterate UTC day by day until today
```
`state.monthIndex` indexes into `ALL_DATES` (defaults to newest). Sentinel Hub itself picks the least-cloudy scene within the requested `time` window. `pwoi`/ASAI rewrites a single date into a `date−30d / date` range.

### 10.4 The `state` object

```js
const state = {
  map:null, baseLayerInst:null, activeLoc:'dixon',
  activeIndex:'hpwi', activeSpillId:'lake-boehmer-pecos-orphan', activeBasin:'permian',
  mode:'single',              // 'single' | 'compare'
  compareType:'swipe',        // 'swipe' | 'diff' | 'cumulative'
  monthIndex: ALL_DATES.length-1,
  sarFusion:false, hlsEnabled:false,
  opacity:0.85, indexVisible:true,
  visualFilter:0, sensitivity:0,           // sliders: visual filter 0..1, sensitivity -50..50
  sentinelLiveTiles:false, sentinelMinZoom:14, sentinelGuardInitialized:false, sentinelRateLimitedUntil:0,
  overlayGroup:null, leftGroup:null, rightGroup:null, sbsControl:null,
  primaryChart:null, secondaryChart:null,
  anomalousDates:[], rrcSpillLayer:null, rrcSpillData:null, hoverHighlightLayer:null, hoverMarker:null
};
```

### 10.5 Config assembly

`getActiveConfig()` merges an internal default config with `window.CONFIG` (from `config-v1.js`) and any runtime/share-mode overrides. Internal defaults set `IMAGE_PROVIDER:'cog'`, the WMS/stat URLs, `ALL_DATES`, `INDICES`, and the Sentinel guard defaults. The WMS instance URL and CDSE OAuth credentials live in `config-v1.js` (gitignored).

---

## 11. Authentication (`src/auth.js`)

For Sentinel Hub Statistics/Process API calls (not the basic WMS tiles, which use the instance URL), the app gets a **CDSE OAuth2 token** via client-credentials grant:
- Token endpoint: `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`.
- The Copernicus Keycloak server blocks browser CORS, so the request is routed through `https://corsproxy.io/?<encoded-url>`.
- Body: `client_id`, `client_secret`, `grant_type=client_credentials` (from `config.CDSE_CLIENT_ID/SECRET`).
- Caches the token in-memory and refreshes 60s before `expires_in`.

> Production note: routing secrets through a public CORS proxy is a known weakness — a real deployment should proxy this server-side. Replicate behavior but flag it.

---

## 12. UI layout (`index.html` + `style.css`)

Dark glassmorphism. Layout = full-screen `<main class="map-container">` with `#map`, plus a left **sidebar** (`<aside class="sidebar">`).

**Sidebar header:** brand mark (SVG globe + cyan/purple), `LIMN` / "Produced-water screening". A collapsible **Location** search (`lat,lng or place` + GO).

**UI mode switcher** (3 layouts, tabs):
- **Compare** (`suite-grid`) — the full index grid in 4 tabs:
  - **DETECTION** — three index suites: *Produced Water Composites* (ASAI, OBEC, PWCI, LBI, FBC, VCBI, REAI, EHC, VSI, CRSI, AOI, BPI, TRI, SCRI, PHI, CMA, HMI), *Standard PW Indicators* (NDSI, HCAI, HMRI, CSI, NDOI, SI, BSI, SAR), *General Reference* (OFF, TC, NDVI, NDWI, NDMI, MSI, SAVI). Buttons carry `data-index="<key>"` and `data-tooltip`.
  - **ANALYSIS** — temporal window: Single Date vs Compare (Δ) toggle; date dropdowns (T1/T2); compare layout (Swipe / Diff(∆) / Cumulative). Advanced Data Fusion: "📡 Visual SAR Overlay" checkbox.
  - **GROUND** — RRC Spill Incidents overlay toggle; Draw Rectangle / Draw Polygon; "Scan AOI for Anomalies (1YR)"; "Generate Selected Report".
  - **SETTINGS** — Basin Calibration (Permian / Standard); Index Opacity slider (0–100, default 85); Detection Sensitivity slider (−50..50, "Restrictive↔Aggressive").
- **Screen** (`focused-triage`, default active) — a curated investigation workflow with a primary evidence-lens row, a collapsed **Gate Diagnostics** drawer (`ndsi`, `si`, `hcai`, `ndoi`, `csi`, `hmri`), and a separate collapsed negative-result drawer for PWCI, ASAI, and OBEC. The diagnostic labels describe band responses and explicitly avoid chemical-retrieval claims.
- **Investigate** (`command-console`) — a search/tag HUD: free-text search over indices/formulas + category tag pills (#OilGas, #Water, #Vegetation, #Soil); dynamically populated index + bookmark results.

**Map overlays:**
- Top-right base-layer toggles (Imagery/Topo/Dark/OSM) + Docs link + the **Sentinel credit-guard mini-panel** (arm checkbox, min-zoom slider `Z14+`, status).
- Bottom-right **legend panel**: active index name, sensor tag, gradient bar, min/max labels, formula display.
- A thin **map loader bar** (`#map-loader`) shown during tile loads.
- A bottom **trend chart panel** (primary + secondary Chart.js canvases + anomaly thumbnail gallery), hidden until a scan/report runs.

**Report modal** (`#report-modal`): spectral config, AOI map(s) (single / side-by-side / diff), statistical trend chart with smoothed-trend toggle, detected-events panel, scene metadata/weather, 1-year scan anomalies, two GIF panels (index gradient + difference heatmap) with downloads, and "Save Interactive HTML Report".

**Disclaimer modal**: screening-only / no-regulatory-determination / ground-truth-required language.

**Tooltips:** a body-level JS tooltip reads `data-tooltip` (HTML allowed) on hover and positions a floating box (avoids modal clipping).

**Global error banner:** `window.onerror` injects a red fixed banner so JS errors are visible; `unhandledrejection` swallows expected `FetchError`s.

---

## 13. Secondary features

### 13.1 AOI anomaly scan (`charts.js` + `app.js`)
Draw a rectangle/polygon (Leaflet.draw) → "Scan AOI for Anomalies (1YR)" walks ~1 year of dates, requests a **highlight evalscript** per date that encodes the continuous index value into 24-bit RGB (`v24 = floor(v*16777215)` split across R/G/B), renders the WMS tile to an offscreen canvas, and `detectPeakAnomaly` scans pixels for the max-intensity location (skipping the bottom 15% to dodge the Sentinel Hub watermark). Flagged dates land in `state.anomalousDates` and become chart markers + thumbnail snapshots. `getHighlightScript(indexKey, hexColor, chartValue, includeContext, basin)` builds these scripts (two modes: 24-bit peak-encode, or True-Color blended thumbnail).

### 13.2 Trend charts
Two Chart.js line charts (primary PW detection + secondary forensic). Points are AOI-mean index values sampled (~every 5 days) from the Sentinel Hub **Statistics/FIS API** using each index's `fisLogic`. Clicking a point switches the map to that date. Event-detection logic: a new event when values surge >400% above a 6-month trailing baseline; "recovered" when <150% of baseline for 3 consecutive obs.

### 13.3 Change detection
- **Swipe** — side-by-side T1/T2 with a draggable divider (leaflet-side-by-side).
- **Diff (∆)** — `genDiffEvalscript` heatmap (red=loss, blue=gain).
- **Cumulative** — `genCumulativeEvalscript` max-value footprint across the window.

### 13.4 GIF animation
`updateGifInset` composites True-Color background + index overlay frames across a ±1-month window onto a canvas and cycles them; the report exports downloadable index + difference GIFs via gifshot.

### 13.5 RRC spill overlay (`report.js`)
Toggles a Leaflet layer of Texas Railroad Commission produced-water spill incident markers (GeoJSON, cached after first fetch).

### 13.6 SAR fusion
"Visual SAR Overlay" adds a real Sentinel-1 `s1_sar` tile layer (50% opacity) on top of the optical index as an independent confirmation check.

---

## 14. Confirmed spill bookmarks (`SPILL_BOOKMARKS` in `app.js`)

Curated, source-cited Permian/SE-NM produced-water incidents used as calibration/demo targets. Each: `{ id, label, date, displayDate, lat, lng, zoom, volume, source, sourceUrl, sourceUrls[], evidenceClass, eventDate, dateRole, confidence, note, indices[] }`. `indices[]` lists which detectors fire there. The default (`DEFAULT_SPILL_ID`) is **Lake Boehmer** — a 60-acre chronic brine lake (the master calibration site). Full list (id → label, lat/lng/zoom, recommended indices):

| id | label | lat,lng,zoom | indices |
|----|-------|--------------|---------|
| lake-boehmer-pecos-orphan | Lake Boehmer (Imperial, TX) | 31.226,−102.729,14 | hpwi, lbi, pwoi |
| meister-2022 | Meister Ranch Geyser | 31.3826,−102.6171,15 | lbi |
| crane-crevice-2023 | FM 329 Crevice, Crane Co. | 31.370,−102.620,14 | lbi |
| toyah-2024 | Toyah Well Blowout | 31.320,−103.872,15 | hpwi, lbi |
| apache-balmorhea-2020 | Apache Balmorhea Spill | 31.130,−103.745,13 | (context) |
| antina-ranch-2021 | Antina Ranch (Chevron Estes) | 31.50,−102.85,13 | hpwi, lbi |
| enlink-midstream-chickadee-2023 | Midland Crude Spill (EnLink) | 31.840,−102.078,13 | (neg control) |
| eog-klondike-2025 | EOG Klondike Pit, Lea Co. NM | 32.24,−103.57,14 | lbi, hpwi, pwoi |
| oxy-mesa-verde-2025 | OXY Mesa Verde East, NM | 32.25,−103.63,12 | lbi, hpwi, pwoi |
| black-river-cimarex-2023 | Black River PW Truck Rollover | 32.219252,−104.222885,16 | hpwi, lbi |
| matador-desoto-spring-2025 | Matador Desoto Spring Pond, NM | 32.07605,−103.28241,16 | hpwi, lbi, pwoi |
| oxy-lea-flowline-2026 | OXY Lea Flowline Release | 32.692986,−103.174825,15 | lbi |
| oxy-sand-dunes-2026 | OXY Sand Dunes Water Tank | 32.24671,−103.78661,16 | bpi |

`evidenceClass` values: `chronic-brine-positive`, `produced-water-positive`, `produced-water-context`, `hydrocarbon-negative-control`. Use these to set expectations (which index *should* light up, and which should stay dark as a specificity check).

---

## 15. Config file

`config-v1.js` (gitignored; copy from `config.example.js`) sets `window.CONFIG`:
```js
window.CONFIG = {
  IMAGE_PROVIDER: "cog",            // "cog" | "gee" | "sentinelhub" (latter needs ALLOW_SENTINEL_FALLBACK)
  GEE_TILE_ENDPOINT: "/api/gee/tiles",
  COG_TILE_ENDPOINT: "/api/cog/tiles",
  GEE_API_KEY: "...optional...",
  ALLOW_SENTINEL_FALLBACK: false,
  SENTINEL_CREDIT_GUARD: true,
  SENTINEL_LIVE_TILES: false,
  SENTINEL_MIN_ZOOM: 14,
  CDSE_CLIENT_ID: "<copernicus oauth client id>",
  CDSE_CLIENT_SECRET: "<copernicus oauth client secret>",
  SH_WMS_URL: "",                   // Sentinel Hub OGC WMS instance URL; blank → built-in fallback
  ATLAS_WMS_LAYER: "AGRICULTURE"
};
```
The built-in WMS instance used in source is `https://sh.dataspace.copernicus.eu/ogc/wms/<instance-id>` and the stats endpoint is `https://sh.dataspace.copernicus.eu/api/v1/statistics`. **Get your own** Copernicus Data Space credentials and WMS instance — do not reuse the original's instance id.

---

## 16. Recreation checklist (build order)

1. **Scaffold** `index.html` with all CDN script tags (Leaflet + side-by-side shim + draw + Chart.js + gifshot + fonts), `config-v1.js` (from example), `style.css` (dark glass theme).
2. **`indices.js`** — port the evalscript generators (`genEvalscript`, `genDiffEvalscript`, `genCumulativeEvalscript`, `colorBlend`), all palettes, `CALIBRATION_PRESETS`, the full `INDICES` catalog (bands + evalscript + fisLogic per index), `HIGHLIGHT_THRESHOLDS`, `CHART_COLORS`, `getHighlightScript`, `getShortIndexName`. This is the bulk of the work.
3. **`auth.js`** — CDSE OAuth via CORS proxy.
4. **`map.js`** — Leaflet init, provider dispatch (`getIndexLayer`), `getWMSLayer` (evalscript base64 + WMS params), rate-limited tile subclasses, credit guard, `getScriptContent` (incl. diff/cumulative inline formula maps), `applyIndex`, GIF inset.
5. **`app.js`** — `ALL_DATES`, `AOI_LOCATIONS`, `SPILL_BOOKMARKS`, `BASE_LAYERS`, `state`, `getActiveConfig`, init flow (open on default spill + OBEC), and **all event wiring** (index buttons, date/mode toggles, sliders, base toggles, sentinel guard, draw/scan, report).
6. **`charts.js`** — trend charts, `detectPeakAnomaly`, scan thumbnails.
7. **`report.js`** — report modal, RRC overlay, FIS probing.
8. **`ui.js`** — toasts, tab switching, legend/UI refresh.
9. Wire the three UI layout panes (Compare grid / Screen wizard / Investigate HUD) and the report modal.

**Acceptance smoke test:** load the page → it centers on Lake Boehmer with OBEC active → arming the Sentinel toggle and zooming to ≥14 renders a cyan/magenta brine overlay over the lake → switching to LBI shows the standing-water body → switching to PWCI stays dark over open water (correct, by design) → Compare→Diff between two dates shows a red/blue change map.

---

*Internal index keys are load-bearing (used in evalscripts, config, bookmarks, query params). The public display names (ASAI/OBEC/PWCI/EHC…) are cosmetic relabels of the original keys (pwoi/hpwi/pwi/ehc…). Keep the keys; relabel only in the UI via `getShortIndexName`.*
