# Spectral Indices — Sentinel Explorer

## Index Registry (`INDICES` in indices.js)

Each entry requires: `name`, `sensor`, `temporal`, `min`, `max`, `gradient`, `formula`, `info`, `diffLabels`, `evalscript`, `fisLogic`.

Optional: `diffscript` (overrides diff mode evalscript), `fisBands` (for Statistics API).

## Detection Suite

| Key | Name | Bands | Sensor | Detection Rate | Notes |
|-----|------|-------|--------|----------------|-------|
| `apex` | APEX-ANOMALY Super-Composite | B03, B11, B12 | S2 (WMS proxy) | 77.8% (TRRC), 87.5% (verified) | Dry brine mode added 2026-03-28; was 29.6% |
| `hpwi` | Hydro-Optical Produced Water Index | B02, B03, B04, B08, B11, B12 | S2 (WMS proxy) | 66.7% (TRRC) | Dry brine mode added 2026-03-28; was 14.8% |
| `pwi` | Produced Water Index | B02-B12 | Sentinel-2 | 81.5% (TRRC) | Lowered thresholds 2026-03-28; was 0% |
| `lbi` | Liquid Brine Index | B03, B08, B11, B12 | Sentinel-2 | 63.0% (TRRC) | NDSI × (NDWI+0.5) × (1−NDVI) × BSI |
| `fbc` | Iron-Brine Composite | B02-B12 | Sentinel-2 | 66.7% (TRRC) | Fe³⁺ staining proxy; reference index |
| `vsi` | Vegetation Stress Index | B05, B07, B8A, B11 | Sentinel-2 | 74.1% (TRRC) | NDSI × RedEdge delta × MSI |
| `bpi` | Brine-Petroleum Index | B04, B08, B11, B12 | Sentinel-2 | 55.6% (TRRC) | BSI × NDSI × HCAI |
| `tri` | Toxic Residue Index | B02, B03, B04, B11, B12 | Sentinel-2 | — | NDSI × HMRI × AOI; high specificity |

**All detection rates from 2026-03-28 run, threshold=0.01, n=27 TRRC sites.**

### Dry Brine Mode (APEX + HPWI)

Permian Basin soil has NDWI = −0.39 to −0.51 (B11 >> B03 in bare arid caliche). This drives `norm_smooth` to 0 in both APEX and HPWI wet-mode formulas, silencing detection for all dry/evaporated spill sites. Added parallel dry brine path triggered when:
- NDWI < −0.30 (confirming dry bare soil)
- NDSI > 0.05 (elevated salt signature)
- BSI > 0.10 (bare soil, no vegetation)

Dry path formula: `(NDSI − 0.04) × min(1, BSI × N) × scale`; result takes `max(wet, dry)`.

## Calibration Presets (`CALIBRATION_PRESETS` in indices.js)

| Preset | `bsiMask` | `bsiOffset` | `ndwiOffset` | PWI Salinity | PWI HC | PWI HMRI |
|--------|-----------|-------------|--------------|--------------|--------|----------|
| `permian` (arid) | -0.3 | 0.3 | 0.5 | 0.10 | 0.30 | 2.0 |
| `standard` (temperate) | -0.1 | 0.0 | 0.0 | 0.05 | 0.15 | 1.5 |

Placeholders injected at render time: `__BSI_MASK__`, `__BSI_OFFSET__`, `__NDWI_OFFSET__`, `__PWI_SALINITY_OFFSET__`, `__PWI_HC_OFFSET__`, `__PWI_HMRI_OFFSET__`.

## Evalscript Generators

| Generator | Output | Use |
|-----------|--------|-----|
| `genEvalscript(bands, logic)` | Single-date, single-source | Standard indices |
| `genDiffEvalscript(bands, calcLogic)` | Two-date ORBIT diff heatmap | Compare → Diff mode |
| `genDeepFusionEvalscript(bands, logic)` | Multi-source S1+S2 ORBIT | HPWI, APEX |
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
