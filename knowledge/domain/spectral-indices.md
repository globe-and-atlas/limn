# Spectral Indices — Sentinel Explorer

## Index Registry (`INDICES` in indices.js)

Each entry requires: `name`, `sensor`, `temporal`, `min`, `max`, `gradient`, `formula`, `info`, `diffLabels`, `evalscript`, `fisLogic`.

Optional: `diffscript` (overrides diff mode evalscript), `fisBands` (for Statistics API).

## Detection Tab Structure

The Detection tab is split into three clearly labelled sections:

### Produced Water Composites

Globe & Atlas experimental composites. July 2026 controls supersede the older recall-only interpretation below.

| Key | Name | Bands | Sensor | July 2026 status | Notes |
| --- | --- | --- | --- | --- | --- |
| `pwoi` | ASAI — Arid Salinity Anomaly Index | B02,B03,B04,B08,B11,B12 | Sentinel-2 | No useful spill/caliche discrimination | Dual wet/dry surface proxy |
| `hpwi` | OBEC — Oil-Brine Emulsion Composite | B02,B03,B11,B12 | Sentinel-2 | No useful spill/caliche discrimination | No dry path in the shipped evalscript; not an oil/emulsion retrieval |
| `pwi` | PWCI — Produced Water Chemical Index | B02,B03,B04,B08,B11,B12 | Sentinel-2 | No useful spill/caliche discrimination | BSI-gated three-ratio AND architecture |
| `lbi` | LBI — Liquid/Salinity Response Index | B02,B03,B04,B08,B11,B12 | Sentinel-2 | Preliminary; brine/freshwater overlap | Standing-water bypass; not brine-specific |
| `fbc` | Iron-Brine Composite | B02-B12 | Sentinel-2 | Not independently evaluated | Fe³⁺ staining proxy; historical recall-only figure is not a validation result |
| `vcbi` | Veg-Confirmed Brine Index | B05, B07, B08, B11 | Sentinel-2 | — | Vegetation evidence of subsurface brine |
| `reai` | Red Edge Alteration Index | B05, B07, B8A | Sentinel-2 | — | Red-edge chlorosis from salt loading |
| `ehc` | Evaporite Halo Composite | B03, B04, B11, B12 | Sentinel-2 | — | RGB false-color: oil/mud/salt morphology |
| `vsi` | Vegetation Stress Index | B05, B07, B8A, B11 | Sentinel-2 | Not independently evaluated | NDSI × RedEdge delta × MSI |
| `crsi` | Salt Stress / Mortality | B05, B08, B11 | Sentinel-2 | — | Vegetation mortality from salt loading |
| `aoi` | Anoxic Oxidation Index | B04, B08, B11 | Sentinel-2 | — | Ferrous iron oxidation in brine |
| `bpi` | Brine-Pavement Index | B04, B08, B11, B12 | Sentinel-2 | Not independently evaluated | BSI × NDSI × HCAI |
| `tri` | Toxic Residue Index | B02, B03, B04, B11, B12 | Sentinel-2 | Not independently evaluated | NDSI × HMRI × AOI screening proxy |
| `scri` | Salt Crust Roughness Index | VV, VH | Sentinel-1 GRD | — | SAR mechanical verification of salt crust |
| `phi` | Petro-Hydrocarbon Index | B04, B08, B11, B12 | Sentinel-2 | — | Spectral HC anomaly in soil |
| `cma` | Clay-Mineral Alteration | B04, B11, B12 | Sentinel-2 | — | Kaolinite/illite from brine alteration |
| `hmi` | Heavy Metal Interaction | B05, B07, B08 | Sentinel-2 | — | Red-edge signal of metallic contamination |

Older recall figures are retained in the investigation history, but they must be paired with the July background controls. See `knowledge/domain/scientific-status-2026-07-20.md`.

### Standard PW Indicators

Established algorithms directly relevant to produced water detection (not Globe & Atlas originals).

| Key | Name | Notes |
| --- | --- | --- |
| `ndsi` | Saline Content (Brine) | SWIR1/SWIR2 ratio — brine crystallisation signal |
| `hcai` | Hydrocarbons | SWIR absorption for organic compounds |
| `hmri` | Heavy Metals | Red-edge distortion from metallic ions |
| `csi` | Contaminated Soil | Clay ratio proxy for pollution indicator |
| `ndoi` | Oil Slicks | B11/B12 absorption for surface petroleum |
| `si` | Salinity / Crust | Classic salt index |
| `bsi` | Bare Soil Index | Soil exposure; supports brine site identification |
| `s1_sar` | SAR Moisture (VV/VH) | Sentinel-1 radar moisture and roughness |

### General Reference

General-purpose satellite indices — not produced-water specific.

| Key | Name |
| --- | --- |
| `tc` | True Color |
| `ndvi` | Vegetation Health |
| `ndwi` | Wetness / Ponding |
| `ndmi` | Moisture Stress |
| `msi` | Drought / Canopy |
| `savi` | Arid Vegetation |

### Dry Brine Mode (ASAI + OBEC)

Permian Basin soil has NDWI = −0.39 to −0.51 (B11 >> B03 in bare arid caliche). This drives `norm_smooth` to 0 in both ASAI (formerly PWOI / APEX) and OBEC (formerly HPWI) wet-mode formulas, silencing detection for all dry/evaporated spill sites. Added parallel dry brine path triggered when:
- NDWI/smoothness proxy < −0.42 for ASAI dry mode (confirming a very dry surface)
- NDSI > 0.15 for ASAI dry mode (strong elevated salt signature)
- BSI > 0.52 for ASAI dry mode (strong bare/crust brightness)

Dry path formula: `(NDSI − 0.04) × min(1, BSI × N) × scale`; result takes `max(wet, dry)`.

### Render Opacity Guards

2026-06-08 fix: PWCI and OBEC render paths now explicitly return transparent output for low mapped values before palette interpolation (`PWCI < 0.05`, `OBEC < 0.08`). ASAI now requires both a smooth/wet proxy and elevated NDSI for the wet path, while ordinary arid background and broad salty bare-soil pixels remain transparent. ASAI's render floor is `0.60`. `colorBlend()` clamps values to `[0,1]` before interpolation to prevent out-of-range palette behavior. Regression coverage: `tests/test_produced_water_rendering.mjs`.

2026-06-09 GEE/LBI follow-up: LBI's original permissive `NDSI × (NDWI+0.5) × (1−NDVI) × BSI` render painted too much wet-ish Permian background in Earth Engine mosaics. Current LBI uses stricter gates: `BSI > -0.25`, `NDSI > 0.02`, `NDWI > -0.40`, `NDVI < 0.45`, and `BSI > -0.20`, scaled by `20` with a render threshold of `0.08`. The same logic is used by the GEE server, Sentinel Hub fallback, compare/diff path, AOI statistics script, and browser evalscript.

## Calibration Presets (`CALIBRATION_PRESETS` in indices.js)

| Preset | `bsiMask` | `bsiOffset` | `ndwiOffset` | PWI Salinity | PWI HC | PWI HMRI |
| --- | --- | --- | --- | --- | --- | --- |
| `permian` (arid) | -0.3 | 0.3 | 0.5 | 0.10 | 0.30 | 2.0 |
| `standard` (temperate) | -0.1 | 0.0 | 0.0 | 0.05 | 0.15 | 1.5 |

Placeholders injected at render time: `__BSI_MASK__`, `__BSI_OFFSET__`, `__NDWI_OFFSET__`, `__PWI_SALINITY_OFFSET__`, `__PWI_HC_OFFSET__`, `__PWI_HMRI_OFFSET__`.

## Evalscript Generators

| Generator | Output | Use |
| --- | --- | --- |
| `genEvalscript(bands, logic)` | Single-date, single-source | Standard indices |
| `genDiffEvalscript(bands, calcLogic)` | Two-date ORBIT diff heatmap | Compare → Diff mode |
| `genDeepFusionEvalscript(bands, logic)` | Multi-source S1+S2 ORBIT | OBEC, ASAI (formerly HPWI, APEX/PWOI) |
| `genCumulativeEvalscript(bands, logic, palette)` | Multi-date ORBIT MAX | Compare → Cumulative mode |

## VISUAL_FILTER and DETECTION_SENSITIVITY

Both are injected at the top of every evalscript by `getScriptContent()`:
```javascript
const VISUAL_FILTER = 0;         // 0.0–1.0, hides pixels below threshold
const DETECTION_SENSITIVITY = 0; // -0.5–0.5, offsets detection thresholds
```
Evalscripts reference these via `typeof VISUAL_FILTER !== 'undefined'` checks.

## Scan FIS Script (1-Year AOI Scan)

The Statistics API evalscript computes 10 bands per interval (Sentinel-2 only):
- B0: PWI, B1: HPWI, B2: FBC, B3: NDMI, B4: NDWI, B5: SAVI (internal), B6: VSI, B7: TRI, B8: BPI, B9: LBI

Input bands: `B02, B03, B04, B05, B07, B08, B11, B12, B8A`

**SCRI** is the only index that cannot be computed — it requires Sentinel-1 SAR (VH/VV) which is unavailable in a single-source S2 statistics call. It renders as `null` (gap) in the secondary chart.
