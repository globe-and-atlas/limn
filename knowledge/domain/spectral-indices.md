# Spectral Indices — Sentinel Explorer

## Index Registry (`INDICES` in indices.js)

Each entry requires: `name`, `sensor`, `temporal`, `min`, `max`, `gradient`, `formula`, `info`, `diffLabels`, `evalscript`, `fisLogic`.

Optional: `diffscript` (overrides diff mode evalscript), `fisBands` (for Statistics API).

## Detection Suite

| Key | Name | Bands | Sensor | Notes |
|-----|------|-------|--------|-------|
| `apex` | APEX-ANOMALY Super-Composite | B03, B11 + VH | S1/S2 Fusion | Deep fusion; needs 30-day window |
| `hpwi` | Hydro-Optical Fusion | B02-B12 + VV/VH | S1/S2 Fusion | Deep fusion; needs 30-day window |
| `pwi` | Produced Water Index | B02-B12 | Sentinel-2 | Calibration-preset sensitive |
| `lbi` | Liquid Brine Index | B03-B12 | Sentinel-2 | |
| `fbc` | Iron-Brine Composite | B02-B12 | Sentinel-2 | |

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
