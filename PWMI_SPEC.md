# Produced Water Magic Index (PWMI) Specification

**Sensor:** Sentinel-2 L2A (Multispectral Instrument)
**Resolution:** 10m - 20m spatial resolution
**Purpose:** Isolate and identify highly concentrated oilfield brine spills ("produced water") while aggressively filtering out natural desert background noise and false positives.

## Scientific Context

Produced water in environments like the Permian Basin leaves a complex spectral signature. It is not simply "wet soil"; it is a mixture of highly saline brine, residual hydrocarbons, and precipitated heavy metals. A standard moisture or water index (like NDWI) is insufficient and prone to false positives.

The PWMI is a **restrictive composite index**. It requires three distinct chemical/spectral signatures to be elevated simultaneously in the exact same location. If any of the three are missing, the index drops to zero, keeping the map clean.

### The Three Required Signatures

1. **Brine / Salinity (NDSI - Normalized Difference Salinity Index)**
   * **Bands:** SWIR1 (B11) and SWIR2 (B12)
   * **Formula:** `(B11 - B12) / (B11 + B12)`
   * **Logic:** Salt crusts heavily alter the standard Shortwave Infrared reflectance curve. NDSI isolates extremely concentrated brine/salt water from fresh water.

2. **Hydrocarbons (HCAI - Hydrocarbon Absorption Index)**
   * **Bands:** SWIR1 (B11) and Red (B04)
   * **Formula:** `(B11 - B04) / (B11 + B04)`
   * **Logic:** Crude oil strongly absorbs visible red light but reflects SWIR. This distinct ratio separates oil-laced produced water from clean agricultural or natural water.

3. **Heavy Metals / Mineral Stress (HMRI - Heavy Metal Reflectance Index)**
   * **Bands:** SWIR2 (B12) and Green (B03)
   * **Formula:** `B12 / B03`
   * **Logic:** Severe soil contamination from heavy metals (barium, strontium) alters background mineralogy and induces extreme localized vegetation death, causing an anomalous spike in the SWIR-to-Green reflectance ratio.

---

## Permian Basin Calibration & Mathematical Logic

The Permian Basin's high albedo (brightness) from white/tan caliche sand naturally spikes SWIR reflectance, which conventionally triggers false positives in algorithmic mapping. The PWMI mathematically subtracts this "desert noise floor."

### Threshold Strictness

Before multiplying the signatures together, each metric must surpass an extreme regional threshold to register a "Score" above zero.

* **Brine Score:** `Math.max(0, NDSI - 0.1)` (Must be confidently positive, eliminating dry salt flats)
* **Hydrocarbon Score:** `Math.max(0, (HCAI - 0.15) * 2)` (Accounts for the natural albedo of bare rock/sand)
* **Heavy Metal Score:** `Math.max(0, (HMRI - 1.8) * 2)` (The desert baseline is high (~1.0); the signal must spike past an extreme 1.8 ratio)

### The Composite Equation

The three validated scores are multiplied together. This acts as a logical `AND` gate:

```javascript
PWMI = BrineScore * HydrocarbonScore * HeavyMetalScore
```

If a pixel features extreme salt (BrineScore > 0) but no oil (HydrocarbonScore = 0), the resulting PWMI is `0`.

### Non-Linear Scaling (Squelching Noise)

Finally, to completely eliminate residual low-level noise and make verified spills "pop" clearly on the map, the final PWMI value is scaled exponentially (cubed) before rendering:

```javascript
FinalOutput = Math.min(1.0, Math.pow(PWMI * 20, 3))
```

## Visualization Palette

When a pixel successfully traverses the threshold gates, it is mapped using a high-visibility, toxic-styled color gradient:

* `0.0`: Transparent / Black (Background)
* `0.1`: Cyan
* `0.5`: Magenta
* `1.0`: Neon Yellow (Confirmed, extreme concentration spill)
