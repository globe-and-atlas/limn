# Produced Water Index (PWI) Specification

## Validation Contract

- [ ] The directive's expected output artifact or documented state change exists at the specified location.
- [ ] The documented command, script, or manual procedure completes without an unhandled error.
- [ ] The output satisfies the directive's acceptance criteria or documented success standard.
- [ ] Any deterministic error encountered during execution is recorded in `knowledge/ERRORS.md`.

**Sensor:** Sentinel-2 L2A (Multispectral Instrument)
**Resolution:** 10m - 20m spatial resolution
**Purpose:** Specify and test a three-ratio produced-water screening hypothesis while explicitly measuring desert-background activation.

> **Scientific status (2026-07-20):** This is an experimental architecture specification, not a validated detector specification. The permissive development calibration produced 81.5% recall with 96.7% background activation; the shipped precision-first viewer produced 0/11 reviewed-site recall and 0/150 background activation. The threshold-sweep failure condition was met: no tested threshold produced useful spill/caliche separation at 500 m single-scene support. Preserve the formula for reproducible negative-result work; do not describe its output as confirmed chemistry.

## Scientific Context

Produced water in environments like the Permian Basin leaves a complex spectral signature. It is not simply "wet soil"; it is a mixture of highly saline brine, residual hydrocarbons, and precipitated heavy metals. A standard moisture or water index (like NDWI) is insufficient and prone to false positives.

PWCI is a **multiplicative screening composite**. It requires three broad spectral ratios to clear thresholds in the same pixel. Those ratios are labeled for their design hypotheses, but Sentinel-2 does not directly retrieve salinity, hydrocarbons, or heavy-metal concentration from them.

### The Three Required Signatures

1. **Dual-SWIR Contrast (NDSI legacy; NDTI/NBR2 algebra)**
   * **Bands:** SWIR1 (B11) and SWIR2 (B12)
   * **Formula:** `(B11 - B12) / (B11 + B12)`
   * **Logic:** The ratio responds to the shape of the broad SWIR reflectance curve. Tillage, residue, burn state, moisture, substrate, and some saline surfaces can all alter it.
   * **Scientific Basis:** Retained as a salinity hypothesis component, not a brine-specific measurement or salt-concentration retrieval.

2. **SWIR1–Red Contrast (HCAI legacy)**
   * **Bands:** SWIR1 (B11) and Red (B04)
   * **Formula:** `(B11 - B04) / (B11 + B04)`
   * **Logic:** The ratio responds to broad SWIR1 and red reflectance differences and is strongly confounded by soil color, iron oxides, vegetation, moisture, and illumination.
   * **Scientific Basis:** Kühn et al. used a narrow hyperspectral absorption feature; this Sentinel-2 ratio does not reproduce that retrieval and must not be called petroleum measurement.

3. **SWIR2/Green Contrast (HMRI legacy)**
   * **Bands:** SWIR2 (B12) and Green (B03)
   * **Formula:** `B12 / B03`
   * **Logic:** The ratio responds to broad surface brightness, vegetation, moisture, substrate, and mineralogical differences.
   * **Scientific Basis:** Heavy-metal remote sensing requires field concentrations and calibrated multivariate models; B12/B03 does not identify barium, strontium, radium, or total metal concentration.

---

## Permian Basin Calibration & Mathematical Logic

The Permian Basin's high albedo (brightness) from white/tan caliche sand and gypsum naturally spikes SWIR reflectance. In conventional algorithms, this background "desert noise" frequently triggers false positives for spills. The PWI mathematically subtracts this background noise floor based on observed regional baselines.

### Threshold Strictness

Before multiplying the signatures together, each metric must surpass an extreme regional threshold to register a "Score" above zero.

* **Dual-SWIR score:** `Math.max(0, NDSI - 0.10)`
* **SWIR1–Red score:** `Math.max(0, (HCAI - 0.30) * 2)`
* **SWIR2/Green score:** `Math.max(0, (HMRI - 2.0) * 2)`

These are historical regional screening thresholds, not empirically calibrated chemical concentration boundaries. The July 2026 sweep showed that their product does not usefully separate the tested spills from Permian caliche.

### The Composite Equation

The three thresholded proxy scores are multiplied together. This acts as a logical `AND` gate:

```javascript
PWI = BrineScore * HydrocarbonScore * HeavyMetalScore
```

If a pixel features extreme salt (BrineScore > 0) but no oil (HydrocarbonScore = 0), the resulting PWI is `0`.

### Non-Linear Scaling (Squelching Noise)

Finally, to completely eliminate residual low-level noise and make verified spills "pop" clearly on the map, the final PWI value is scaled exponentially (cubed) before rendering:

```javascript
FinalOutput = Math.min(1.0, Math.pow(PWI * 20, 3))
```

## Visualization Palette

When a pixel successfully traverses the threshold gates, it is mapped using a high-visibility, toxic-styled color gradient:

* `0.0`: Transparent / Black (Background)
* `0.1`: Cyan
* `0.5`: Magenta
* `1.0`: Neon Yellow (highest display response; not chemical confirmation)
