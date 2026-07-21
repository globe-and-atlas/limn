# Sentinel Explorer Architecture & Logic Guide

> **Current status (2026-07-20):** The produced-water composites below are experimental screening architectures. July background controls and threshold sweeps found no useful produced-water/caliche discrimination at the tested 500 m single-scene support. Exact current formulas and claim boundaries are in `knowledge/domain/scientific-status-2026-07-20.md`; historical recall-only language below must not be read as detector accuracy.

This guide documents the core architecture, external services, band combinations, and mathematical logic used to build the **Sentinel Explorer** application. It serves as a reference for recreating or migrating the system's capabilities into Esri dashboards, custom Python backends, or other GIS platforms.

---

## 1. External Services

### Copernicus Sentinel Hub

* **Service Used**: OGC Web Map Service (WMS)
* **Purpose**: Real-time, cloud-based rendering of Sentinel-2 L2A optical satellite imagery.
* **Authentication**: Configured via a specific WMS Configuration Instance ID (`959ea2c5-5892-4b36-82b3-76e6bdb93c8a`).
* **Benefit**: Instead of downloading gigabytes of raw GeoTIFFs, Sentinel Hub processes our custom Javascript "evalscripts" on their servers and streams back lightweight PNG map tiles directly to the user's browser.

### Esri ArcGIS / OpenStreetMap

* **Service Used**: Tile Map Service (TMS)
* **Purpose**: Base maps (Satellite Imagery, Topographic, and Street maps) overlaid beneath the Sentinel data layers to provide geographic context.

---

## 2. Spectral Indices & Mathematical Logic

The application relies on Sentinel-2 Level-2A surface reflectance data. Specific wavelength bands are isolated and run through normalized difference equations to highlight environmental factors.

### 2.1 Moisture Index / Normalized Difference Moisture Index (NDMI)

* **Purpose**: Detects vegetation water content and soil moisture stress.
* **Citation/Basis**: *Gao, 1996* (NDWI/NDMI for liquid water remote sensing)
* **Satellites**: Sentinel-2 (Bands 8A and 11)
* **Bands Used**:
  * `B8A` (Narrow Near-Infrared / NIR): 865 nm
  * `B11` (Shortwave Infrared / SWIR): 1610 nm
* **Formula**: `(B8A - B11) / (B8A + B11)`
* **Sentinel Hub Evalscript**:

    ```javascript
    let sum = sample.B8A + sample.B11;
    if(sum === 0) return [0,0,0,0];
    let val = (sample.B8A - sample.B11) / sum;
    // Scaled and mapped to a custom gradient palette
    ```

### 2.2 Modified Normalized Difference Water Index (MNDWI; internal key `ndwi`)

* **Purpose**: Highlights open water and wet surfaces while suppressing many built and vegetated surfaces.
* **Citation/Basis**: *Xu, 2006* (MNDWI using Green and SWIR1). This is not McFeeters NDWI, which uses Green and NIR, or Gao NDWI/NDMI, which uses NIR and SWIR.
* **Satellites**: Sentinel-2 (Bands 3 and 11)
* **Bands Used**:
  * `B03` (Green): 560 nm
  * `B11` (SWIR): 1610 nm
* **Formula**: `(B03 - B11) / (B03 + B11)`
* **Sentinel Hub Evalscript**:

    ```javascript
    let sum = sample.B03 + sample.B11;
    if(sum === 0) return [0,0,0,0];
    let val = (sample.B03 - sample.B11) / sum;
    // Scaled and mapped to a custom blue-heavy gradient palette
    ```

### 2.3 SWIR1–NIR Surface Contrast (SI legacy)

* **Purpose**: Normalized SWIR1–NIR surface contrast that can support locally calibrated salinity investigations.
* **Scientific boundary**: Moisture, vegetation, substrate, disturbance, and brightness also affect the ratio. Limn has not calibrated it to salt concentration or produced water.
* **Satellites**: Sentinel-2 (Bands 11 and 8)
* **Bands Used**:
  * `B11` (SWIR): 1610 nm
  * `B08` (Broad NIR): 842 nm
* **Formula**: `(B11 - B08) / (B11 + B08)`
* **Sentinel Hub Evalscript**:

    ```javascript
    let sum = sample.B11 + sample.B08;
    if(sum === 0) return [0,0,0,0];
    let val = (sample.B11 - sample.B08) / sum;
    // Scaled mapped to a dark-to-neon-orange palette
    ```

### 2.4 Vegetation Index / Normalized Difference Vegetation Index (NDVI)

* **Purpose**: Essential global standard for measuring vegetation health and density.
* **Citation/Basis**: *Rouse et al., 1974* (Monitoring vegetation systems)
* **Satellites**: Sentinel-2 (Bands 8 and 4)
* **Bands Used**:
  * `B08` (Broad NIR): 842 nm
  * `B04` (Red): 665 nm
* **Formula**: `(B08 - B04) / (B08 + B04)`
* **Sentinel Hub Evalscript**:

    ```javascript
    let sum = sample.B08 + sample.B04;
    if(sum === 0) return [0,0,0,0];
    let val = (sample.B08 - sample.B04) / sum;
    // Scaled to a Brown -> Yellow -> Dark Green palette
    ```

### 2.5 Arid Vegetation / Soil Adjusted Vegetation Index (SAVI)

* **Purpose**: Similar to NDVI but corrects for soil brightness, making it much more accurate in arid deserts and sparse vegetation areas (like the Permian Basin well-pads).
* **Citation/Basis**: *Huete, 1988* (A soil-adjusted vegetation index)
* **Satellites**: Sentinel-2 (Bands 8 and 4)
* **Bands Used**:
  * `B08` (Broad NIR): 842 nm
  * `B04` (Red): 665 nm
* **Formula**: `((B08 - B04) / (B08 + B04 + 0.5)) * 1.5`
* **Sentinel Hub Evalscript**:

    ```javascript
    let sum = sample.B08 + sample.B04 + 0.5;
    if(sum === 0) return [0,0,0,0];
    let val = ((sample.B08 - sample.B04) / sum) * 1.5;
    ```

### 2.6 Moisture Stress Index (MSI)

* **Purpose**: Identifies canopy water stress and drought conditions by comparing shortwave to near-infrared light.
* **Citation/Basis**: *Rock et al., 1986* (Remote detection of forest damage and moisture stress)
* **Satellites**: Sentinel-2 (Bands 11 and 8)
* **Bands Used**:
  * `B11` (SWIR): 1610 nm
  * `B08` (Broad NIR): 842 nm
* **Formula**: `B11 / B08`
* **Sentinel Hub Evalscript**:

    ```javascript
    if(sample.B08 === 0) return [0,0,0,0];
    let val = sample.B11 / sample.B08;
    // MSI typically ranges from 0.4 (low stress) to 2.0+ (high stress).
    ```

### 2.7 Dual-SWIR Contrast (NDTI/NBR2 form; NDSI legacy key)

* **Purpose**: Measures normalized SWIR1–SWIR2 contrast.
* **Scientific boundary**: The same algebra is widely used as NDTI/NBR2 for tillage, residue, burn, moisture, and other surface conditions. Limn retains it as a salinity-hypothesis component; it is not brine-specific and does not retrieve salinity.
* **Satellites**: Sentinel-2 (Bands 11 and 12)
* **Bands Used**:
  * `B11` (SWIR1): 1610 nm
  * `B12` (SWIR2): 2190 nm
* **Formula**: `(B11 - B12) / (B11 + B12)`
* **Sentinel Hub Evalscript**:

    ```javascript
    let sum = sample.B11 + sample.B12;
    if(sum === 0) return [0,0,0,0];
    let val = (sample.B11 - sample.B12) / sum;
    // Scaled mapped: Math.max(0, val * 2) to a Blue -> Brown -> Orange -> Red palette
    ```

### 2.8 SWIR1/SWIR2 Surface Ratio (CSI legacy)

* **Purpose**: Broad surface-context ratio responsive to mineralogy, crop residue, moisture, disturbance, and substrate.
* **Scientific boundary**: It may support clay or surface interpretation, but it does not establish contamination.
* **Satellites**: Sentinel-2 (Bands 11 and 12)
* **Bands Used**:
  * `B11` (SWIR1): 1610 nm
  * `B12` (SWIR2): 2190 nm
* **Formula**: `B11 / B12`
* **Sentinel Hub Evalscript**:

    ```javascript
    if(sample.B12 === 0) return [0,0,0,0];
    let val = sample.B11 / sample.B12;
    let mapped = Math.max(0, Math.min(1, (val - 0.5) / 2.0));
    // Scaled to a Brown -> Lime -> Cyan palette
    ```

### 2.9 SWIR1–Red Contrast (HCAI legacy)

* **Purpose**: Normalized SWIR1–Red surface contrast.
* **Scientific boundary**: Broad Sentinel-2 bands do not resolve the diagnostic narrow absorption feature used by hyperspectral hydrocarbon methods such as Kühn et al. Treat this as a surface-response proxy, not a petroleum retrieval.
* **Satellites**: Sentinel-2 (Bands 11 and 4)
* **Bands Used**:
  * `B11` (SWIR1): 1610 nm
  * `B04` (Red): 665 nm
* **Formula**: `(B11 - B04) / (B11 + B04)`
* **Sentinel Hub Evalscript**:

    ```javascript
    let sum = sample.B11 + sample.B04;
    if(sum === 0) return [0,0,0,0];
    let val = (sample.B11 - sample.B04) / sum;
    let mapped = Math.max(0, (val - 0.1) * 3);
    // Scaled to a Wheat -> SaddleBrown -> Black palette
    ```

### 2.10 SWIR2/Green Contrast (HMRI legacy)

* **Purpose**: Broad SWIR2/Green surface ratio.
* **Scientific boundary**: Heavy-metal estimation requires paired field concentrations and a calibrated multivariate model. This ratio cannot identify barium, strontium, radium, or total-metal concentration.
* **Satellites**: Sentinel-2 (Bands 12 and 3)
* **Bands Used**:
  * `B12` (SWIR2): 2190 nm
  * `B03` (Green): 560 nm
* **Formula**: `B12 / B03`
* **Sentinel Hub Evalscript**:

    ```javascript
    if(sample.B03 === 0) return [0,0,0,0];
    let val = sample.B12 / sample.B03;
    let mapped = Math.max(0, Math.min(1, (val - 1.5) / 3.0));
    // Scaled to a Lavender -> Purple -> Magenta palette
    ```

### 2.11 PWCI — Produced-Water Contrast Index (formerly PWI)
 
 * **Formula concept**: thresholded dual-SWIR contrast × thresholded SWIR1–Red contrast × thresholded SWIR2/Green contrast, with a surface term.
 * **Scientific logic**: The multiplicative architecture tests whether three broad surface contrasts co-occur. The terms are not independent chemical measurements, and their co-occurrence is not produced-water attribution.
 * **Current evidence:** Development recall was 81.5%, but background activation was 96.7%. The shipped viewer was blank at 11/11 reviewed positives and 150/150 controls. No tested threshold produced useful separation.
 * **Evidence boundary**: July controls and a 1,224-combination sweep found no useful separation at the tested 500 m single-scene support. Development and viewer calibrations differ; neither is a validated detector.
 * **Development-pipeline thresholds (not the interactive viewer)**:
   * NDSI offset: `0.03` (was 0.10)
   * HCAI offset: `0.05`, scale `5.0` (was 0.30, scale 2.0)
   * HMRI offset: `1.1`, scale `3.0` (was 2.0, scale 2.0)
   * BSI weight: soft floor at 0.3 (was hard gate — any BSI ≤ 0.01 zeroed the full score)
* **Sentinel Hub Evalscript**:

    ```javascript
    // 1. Calculate base indices
    let sumBrine = sample.B11 + sample.B12;
    let brine = (sumBrine === 0) ? 0 : (sample.B11 - sample.B12) / sumBrine;

    let sumHcai = sample.B11 + sample.B04;
    let hcai = (sumHcai === 0) ? 0 : (sample.B11 - sample.B04) / sumHcai;

    let hmri = (sample.B03 === 0) ? 0 : sample.B12 / sample.B03;

    // 2. Permian-calibrated thresholds (lowered from baseline after 0% detection on 2026-03-08 run)
    // Background Permian caliche: NDSI 0.05–0.10, HCAI 0.15–0.30, HMRI 1.5–1.9
    let brineScore = Math.max(0, brine - 0.03);
    let hcaiScore = Math.max(0, (hcai - 0.05) * 5);
    let hmriScore = Math.max(0, (hmri - 1.1) * 3);

    // 3. Multiplication AND gate (surface-contrast co-occurrence)
    let pwi = brineScore * hcaiScore * hmriScore;
    
    // 4. Historical viewer display scaling; this is not a probability
    let finalMapped = Math.min(1.0, Math.pow(pwi * 20, 3));
    // Mapped to a Transparent -> Cyan -> Magenta -> Neon Yellow palette
    ```

### 2.12 ASAI — Arid Salinity Anomaly Index (formerly PWOI / APEX)

* **Purpose**: Experimental Sentinel-2 surface-response composite with wet and dry screening paths.
* **Satellites**: Sentinel-2 only. It is not Sentinel-1/Sentinel-2 fusion and does not measure SAR roughness.
* **Core terms**: MNDWI-like Green–SWIR wetness, dual-SWIR contrast, and BSI context.
* **Current evidence**: Development recall was 77.8% with 71.3% background activation. The shipped viewer was blank at all 11 reviewed positives and 150 controls. The layer is not a validated produced-water or salt-crust detector.
* **Implementation boundary**: Exact thresholds vary with `DETECTION_SENSITIVITY`; the current viewer suppresses mapped scores below 0.60. The displayed value, not the pre-display raw product, is the value used by current analytics.

---

### 2.13 OBEC — Optical Brightness/Edge Contrast (legacy Oil-Brine Emulsion Composite)

* **Purpose**: Experimental single-scene optical-contrast screen combining nonnegative Blue–SWIR2 contrast, a positive dual-SWIR term, and an MNDWI-derived surface term.
* **Satellites**: Sentinel-2 only.
* **Current evidence**: Development recall was 66.7% with 71.3% background activation. The shipped viewer was blank at all reviewed positives and controls. Agreement with ASAI is not independent confirmation because the layers reuse related bands and surface proxies.

**Formula:**
```
blue_swir = max(0, (B02 − B12) / (B02 + B12))
dual_swir_boost = max(0, NDSI − sensitivity_threshold) × 0.8
surface_signal = clamp(blue_swir + dual_swir_boost, 0, 1)

smoothness = (B03 − B11) / (B03 + B11)     # same as NDWI
norm_smooth = clamp((smoothness + 0.3) / 0.6, 0, 1)

obec = clamp(surface_signal × norm_smooth × 6.0, 0, 1)
display = 0 if obec < 0.08 else obec
```

The shipped evalscript has no dry branch. Broad bands do not retrieve oil, an emulsion, or produced water.

---

### 2.14 Supporting Suite Indices (FBC, LBI, VSI, BPI, TRI)

These indices supplement ASAI/OBEC and are computed in the FIS 1-year scan. They are mathematical proxies — intended for visual trend reference and cross-validation, not standalone detection.

| Index | Full Name | Formula Summary | Primary Signal |
|-------|-----------|-----------------|----------------|
| FBC | Red/Blue–Dual-SWIR–Low-Vegetation Composite | `clamp(150 × (red_blue_score × dual_swir_score × no_veg)^1.4, 0, 1)` | Co-occurring broad surface contrasts |
| LBI | Liquid/Salinity Response Index | `20 × gates(NDSI, NDWI, low NDVI, BSI)`, with an open-water BSI bypass | Preliminary water/salinity response; current small sample does not establish brine specificity |
| VSI | Vegetation/Dual-SWIR Stress Composite | `10 × dual_swir_score × red_edge_score × moisture_stress` | Co-located canopy and surface response; no causal attribution |
| BPI | Bare-Pad Three-Ratio Composite | `30 × BSI_gate × dual_swir_score × swir1_red_score` | Bare-pad surface context; no petroleum or brine classification |
| TRI | Three-Ratio Residue Composite | `100 × dual_swir_score × swir2_green_score × red_blue_swir_score` | Persistent multi-ratio surface response; no metals or toxicity retrieval |

**Note on SCRI**: Requires Sentinel-1 SAR (VH/VV cross-polarization). Cannot be computed in the single-source S2 Statistics API scan. Renders as `null` (gap) in the secondary trend chart.

---

### 2.15 Sentinel-1 VV Backscatter Context

* **Purpose**: Displays log-scaled VV backscatter as cloud-independent surface context. Backscatter is jointly affected by roughness, moisture, geometry, vegetation, and substrate.
* **Satellites**: Sentinel-1 GRD
* **Polarizations**: `VV` and `VH`
* **Formula**: `clamp((10·log10(VV)+20)/20, 0, 1)` as grayscale
* **Evaluating Logic**:

    ```javascript
    let vv = Math.max(0, Math.min(1, (Math.log10(sample.VV) * 10 + 20) / 20));
    // Returns [vv, vv, vv, 1]; analytics return vv.
    ```

### 2.16 True Color & False Color Composites

* **True Color (RGB)**: Uses `B04` (Red), `B03` (Green), and `B02` (Blue). Rendered directly with a `2.5x` brightness multiplier for visual clarity.
* **False Color (NIR)**: Uses `B08` (NIR), `B04` (Red), and `B03` (Green). Translates invisible near-infrared light into visible red, making healthy vegetation appear bright crimson.

---

## 3. Difference (∆) Calculations

To visualize environmental change across time, the system uses Sentinel Hub's multi-temporal processing capabilities.

Instead of rendering a single date, the system requests two distinct dates simultaneously (`time=t1/t2`). The custom multi-temporal `evalscript` isolates the logic for both dates and calculates the mathematical difference.

### The Delta Algorithm

1. Calculate Index at Date 1 (`val1`)
2. Calculate Index at Date 2 (`val2`)
3. Calculate Difference: `diff = val2 - val1`

### The Divergent Color Scale

The system applies a divergent heat map to the resulting `diff` value to visually explain the change to the user:

* **`diff < -0.15`**: Strong Decrease -> **Bright Red / Orange**
* **`diff < -0.05`**: Slight Decrease -> **Faded Red**
* **`-0.05 < diff < 0.05`**: Stable -> **Transparent / Dark Grey**
* **`diff > 0.05`**: Slight Increase -> **Faded Blue**
* **`diff > 0.15`**: Strong Increase -> **Bright Blue / Cyan**

*Note: For any surface-contrast layer, an increase means only that the implemented score increased. Chemical, causal, or remediation interpretation requires independent evidence.*

---
*Last updated: 2026-07-21. July controls and threshold sweeps found no validated produced-water detector in the single-scene Sentinel-2 suite.*
