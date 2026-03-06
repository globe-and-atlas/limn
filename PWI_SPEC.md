# Produced Water Index (PWI) Specification

**Sensor:** Sentinel-2 L2A (Multispectral Instrument)
**Resolution:** 10m - 20m spatial resolution
**Purpose:** Isolate and identify highly concentrated oilfield brine spills ("produced water") while aggressively filtering out natural desert background noise and false positives.

## Scientific Context

Produced water in environments like the Permian Basin leaves a complex spectral signature. It is not simply "wet soil"; it is a mixture of highly saline brine, residual hydrocarbons, and precipitated heavy metals. A standard moisture or water index (like NDWI) is insufficient and prone to false positives.

The PWI is a **restrictive composite index**. It requires three distinct chemical/spectral signatures to be elevated simultaneously in the exact same location. If any of the three are missing, the index drops to zero, keeping the map clean.

### The Three Required Signatures

1. **Brine / Salinity (NDSI - Normalized Difference Salinity Index)**
   * **Bands:** SWIR1 (B11) and SWIR2 (B12)
   * **Formula:** `(B11 - B12) / (B11 + B12)`
   * **Logic:** Salt crusts heavily alter the standard Shortwave Infrared reflectance curve. NDSI isolates extremely concentrated brine/salt water from fresh water.
   * **Scientific Basis:** Building on studies of soil salinity using SWIR reflectance (*Metternicht & Zinck, 2003*), this ratio effectively delineates highly saline features (like brine spills) from dry soils.

2. **Hydrocarbons (HCAI - Hydrocarbon Absorption Index)**
   * **Bands:** SWIR1 (B11) and Red (B04)
   * **Formula:** `(B11 - B04) / (B11 + B04)`
   * **Logic:** Crude oil strongly absorbs visible red light but reflects SWIR. This distinct ratio separates oil-laced produced water from clean agricultural or natural water.
   * **Scientific Basis:** Hydrocarbons exhibit specific absorption features in the Red and SWIR wavelengths. Ratios contrasting these broad bands help identify petroleum hydrocarbons on dry soil surfaces (*Kühn et al., 2004*).

3. **Heavy Metals / Mineral Stress (HMRI - Heavy Metal Reflectance Index)**
   * **Bands:** SWIR2 (B12) and Green (B03)
   * **Formula:** `B12 / B03`
   * **Logic:** Severe soil contamination from heavy metals (barium, strontium) alters background mineralogy and induces extreme localized vegetation death, causing an anomalous spike in the SWIR-to-Green reflectance ratio.
   * **Scientific Basis:** Heavy metal toxicity severely depresses visible (Green) reflectance while often increasing SWIR reflectance due to the destruction of cellular structure and mineral precipitation (*Choe et al., 2008*).

---

## Permian Basin Calibration & Mathematical Logic

The Permian Basin's high albedo (brightness) from white/tan caliche sand and gypsum naturally spikes SWIR reflectance. In conventional algorithms, this background "desert noise" frequently triggers false positives for spills. The PWI mathematically subtracts this background noise floor based on observed regional baselines.

### Threshold Strictness

Before multiplying the signatures together, each metric must surpass an extreme regional threshold to register a "Score" above zero.

* **Brine Score:** `Math.max(0, NDSI - 0.10)`
  * *Justification:* Typical dry Permian soil ranges from 0.05–0.10. We completely subtract the 0.10 baseline so only regions significantly saltier than background soil (pushing past 0.10) register as brine.
* **Hydrocarbon Score:** `Math.max(0, (HCAI - 0.30) * 2)`
  * *Justification:* Red dirt normally peaks at an HCAI of 0.25–0.30. Heavy oil contamination starts at 0.40+. We subtract the 0.30 baseline, ensuring natural iron-rich soils do not trigger the index, and multiply by 2 for scaling.
* **Heavy Metal Score:** `Math.max(0, (HMRI - 2.0) * 2)`
  * *Justification:* Natural Permian caliche sits at ~1.0, and normal red soil ranges from 1.5–1.9. Severe contamination altering the soil chemistry pushes the ratio past 2.0. By subtracting 2.0, we isolate only the severely impacted zones.

### The Composite Equation

The three validated scores are multiplied together. This acts as a logical `AND` gate:

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
* `1.0`: Neon Yellow (Confirmed, extreme concentration spill)
