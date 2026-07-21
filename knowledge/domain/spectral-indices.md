# Spectral Indices — Sentinel Explorer

## Index Registry (`INDICES` in indices.js)

Each entry requires: `name`, `sensor`, `temporal`, `min`, `max`, `gradient`, `formula`, `info`, `diffLabels`, `evalscript`, `fisLogic`.

Optional: `diffscript` (overrides diff mode evalscript), `fisBands` (for Statistics API).

## Evidence-Lens Structure

The app defaults to True Color and separates established/contextual lenses from experimental composites. A strong color response is an inspection lead, not a produced-water classification.

### Primary Investigation Stack

| Key | Lens | Primary role | Interpretation boundary |
| --- | --- | --- | --- |
| `tc` | True Color | Visual source context | Inspect pads, ponds, roads, shadows, and surface disturbance first |
| `lbi` | Liquid/Salinity Response Index | Preliminary standing-water/salinity response | Not brine-specific; 2/4 standing-brine vs 0/3 freshwater controls, Fisher p≈0.43 |
| `ndwi` | MNDWI (Xu form) | Green–SWIR water contrast | Water/surface response, not chemistry |
| `awei` | AWEI shadow variant (AWEIsh) | Independent water-boundary cross-check | Water extraction context, not salinity or source attribution |
| `ndmi` | NDMI | Vegetation/topsoil moisture context | Moisture response has many natural and operational causes |
| `savi` | SAVI | Soil-adjusted vegetation response | Stress/greenness context only |
| `bsi` | BSI | Bare-soil and disturbed-surface context | High response is common on caliche and pads |
| `ndsi` | Dual-SWIR contrast | Broad SWIR surface contrast | Internal legacy key; not brine-specific |
| `swir_rgb` | B12/B11/B04 false color | Material/surface differentiation by inspection | Colors are not classes or chemical retrievals |
| `ndre` | NDRE | Red-edge vegetation response | Phenology, drought, disease, grazing, and management confound it |

The default workflow is: inspect True Color; verify data quality; compare before/after; inspect water/moisture, bare-soil, SWIR, and vegetation lenses; then use LBI or the experimental composites as explicitly bounded hypotheses. Sentinel-1 VV is a separate surface-context check, not produced-water attribution and not an orbit-matched change detector.

### Experimental Composites — Negative-Result Study

PWCI, ASAI, and OBEC remain executable for reproducibility and method comparison. They are collapsed below the primary stack because July 2026 controls found no useful produced-water/caliche operating point.

| Key | Name | Bands | Sensor | July 2026 status | Notes |
| --- | --- | --- | --- | --- | --- |
| `pwoi` | ASAI — Arid Salinity Anomaly Index | B02,B03,B04,B08,B11,B12 | Sentinel-2 | No useful spill/caliche discrimination | Dual wet/dry surface proxy |
| `hpwi` | OBEC — Optical Brightness/Edge Contrast | B02,B03,B11,B12 | Sentinel-2 | No useful spill/caliche discrimination | No dry path; legacy name does not imply oil/emulsion retrieval |
| `pwi` | PWCI — Produced-Water Contrast Index | B02,B03,B04,B08,B11,B12 | Sentinel-2 | No useful spill/caliche discrimination | BSI-gated three-ratio AND architecture |

### Research Composite Library

These additional project composites remain available in a collapsed research drawer. They are not part of the recommended first-pass workflow.

| Key | Name | Bands | Sensor | July 2026 status | Notes |
| --- | --- | --- | --- | --- | --- |
| `fbc` | Red/blue × dual-SWIR response composite | B02-B12 | Sentinel-2 | Not independently evaluated | Research-only surface proxy |
| `vcbi` | Vegetation-stress/dual-SWIR composite | B02,B03,B04,B08,B11,B12 | Sentinel-2 | Not independently evaluated | No chloride/source attribution |
| `reai` | Red-edge/dual-SWIR alteration composite | B05,B06,B11,B12 | Sentinel-2 | Not independently evaluated | No ferric-mineral attribution |
| `ehc` | Three-channel surface-context composite | B02,B04,B08,B11,B12 | Sentinel-2 | Not independently evaluated | RGB context; no morphology classification |
| `vsi` | Vegetation/dual-SWIR stress composite | B05,B07,B8A,B11,B12 | Sentinel-2 | Not independently evaluated | General stress proxy |
| `crsi` | Inverted canopy response (1−CRSI) | B02,B03,B04,B08 | Sentinel-2 | Not locally calibrated | Established equation; non-specific stress response |
| `aoi` | Red/Blue × SWIR surface contrast | B02,B04,B11,B12 | Sentinel-2 | Not independently evaluated | No oxidation-state attribution |
| `bpi` | Bare-pad three-ratio composite | B02,B04,B08,B11,B12 | Sentinel-2 | Not independently evaluated | General pad-surface response |
| `tri` | Three-ratio residue composite | B02,B03,B04,B11,B12 | Sentinel-2 | Not independently evaluated | No toxicity or chemistry attribution |
| `scri` | SAR surface-contrast index | VV,VH | Sentinel-1 GRD | Not calibrated | No EC or salt-crust validation |
| `phi` | SWIR-shoulder surface composite | B04,B11,B12 | Sentinel-2 | Not independently evaluated | Not a petroleum retrieval |
| `cma` | Clay/surface contrast composite | B02,B04,B11,B12 | Sentinel-2 | Not independently evaluated | No clay-lattice attribution |
| `hmi` | Green–SWIR interaction composite | B02,B03,B11,B12 | Sentinel-2 | Not independently evaluated | No heavy-metal attribution |

Older recall figures are retained in the investigation history, but they must be paired with the July background controls. See `knowledge/domain/scientific-status-2026-07-20.md`.

### Legacy Surface-Contrast Components

Generic band ratios retained for backward compatibility and research comparison. Their legacy chemical names do not make them chemical retrievals.

| Key | Name | Notes |
| --- | --- | --- |
| `ndsi` | Dual-SWIR contrast (NDTI/NBR2 form) | Not brine-specific |
| `hcai` | SWIR1–Red contrast | Not a hydrocarbon retrieval |
| `hmri` | SWIR2/Green contrast | Not a heavy-metal retrieval |
| `csi` | SWIR1/SWIR2 surface ratio | Not a contamination classifier |
| `ndoi` | Blue–SWIR2 contrast | Not an oil classifier |
| `si` | SWIR1–NIR surface contrast | Not calibrated to salinity |
| `bsi` | Bare Soil Index | Soil exposure; supports brine site identification |
| `s1_sar` | Sentinel-1 VV backscatter context | Grayscale VV; not a moisture retrieval |

### Additional Reference Lenses

General-purpose satellite indices — not produced-water specific.

| Key | Name |
| --- | --- |
| `ndvi` | Vegetation Health |
| `msi` | Drought / Canopy |
| `fc` | False Color (NIR) |

### ASAI Dry Surface Path

Permian Basin soil commonly has strongly negative MNDWI (B11 >> B03 in bare arid caliche), which suppresses wet-path scores. ASAI retains a parallel dry-surface hypothesis triggered when:
- NDWI/smoothness proxy < −0.42 for ASAI dry mode (confirming a very dry surface)
- NDSI > 0.15 for ASAI dry mode (strong elevated salt signature)
- BSI > 0.52 for ASAI dry mode (strong bare/crust brightness)

The current ASAI viewer maps the dry response from NDSI above 0.15 into a 0.55–1 range and then takes `max(wet, dry)`, with a 0.60 display floor. OBEC's shipped evalscript has no dry path.

### Render Opacity Guards

2026-06-08 fix: PWCI and OBEC render paths now explicitly return transparent output for low mapped values before palette interpolation (`PWCI < 0.05`, `OBEC < 0.08`). ASAI now requires both a smooth/wet proxy and elevated NDSI for the wet path, while ordinary arid background and broad salty bare-soil pixels remain transparent. ASAI's render floor is `0.60`. `colorBlend()` clamps values to `[0,1]` before interpolation to prevent out-of-range palette behavior. Regression coverage: `tests/test_produced_water_rendering.mjs`.

2026-07-21 renderer reconciliation: LBI uses `NDSI > 0.02`, `NDWI > -0.40`, and `NDVI < 0.45`, scaled by `20` with a render threshold of `0.08`. Non-standing-water pixels retain the BSI surface gate; pixels with `NDWI > 0.30` use the documented standing-water bypass. The COG, GEE, Sentinel Hub, AOI-statistics, and browser paths now use this same formula.

### Pixel Quality Contract

Primary optical lenses use the Sentinel-2 L2A Scene Classification layer as an allow-list. SCL classes 4 (vegetation), 5 (bare soil), 6 (water), and 7 (unclassified) may render. Classes 0–3 and 8–11—including no data, saturated/defective pixels, dark features, cloud shadow, cloud/cirrus, and snow/ice—are transparent. This is pixel QA, not proof that all atmospheric or adjacency artifacts are removed. The optional bundled Sentinel Hub `AGRICULTURE` WMS layer is L1C and has no SCL band, so Limn removes this gate for that provider and labels the limitation in the UI. A verified L2A WMS configuration may opt back in with `SENTINEL_WMS_SUPPORTS_SCL: true`.

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
| `genDeepFusionEvalscript(bands, logic)` | Legacy multi-source S1+S2 ORBIT helper | Currently unused; no core layer ships S1/S2 fusion |
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

**SCRI** cannot be computed in this Sentinel-2-only scan because it requires Sentinel-1 VV/VH. It renders as `null` (gap) in the secondary chart. Other non-scan layers may also be omitted by the fixed 10-band scan contract.
