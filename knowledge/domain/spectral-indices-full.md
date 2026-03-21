# Sentinel Explorer Architecture & Logic Guide

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

### 2.2 Wetness Index / Normalized Difference Water Index (NDWI)

* **Purpose**: Specifically highlights surface water bodies, ponding, and saturated soils.
* **Citation/Basis**: *McFeeters, 1996* (Standard NDWI using Green and NIR/SWIR)
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

### 2.3 Salinity Index / Normalized Difference Salinity Index (NDSI)

* **Purpose**: Highlights surface salt crusts, saline deposits, and degraded soils often associated with spills or natural evaporation pans.
* **Citation/Basis**: *Metternicht & Zinck, 2003* (Remote sensing of soil salinity)
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

### 2.7 Brine / Salt Water (NDSI)

* **Purpose**: Detects highly absorptive brine and produced water spills. Brine significantly reduces the standard SWIR reflectance curve of typical soil, allowing for targeted chemical anomaly detection.
* **Citation/Basis**: Adaptation of *Metternicht & Zinck, 2003* focusing on dual-SWIR absorption features typical of hydrated salts.
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

### 2.8 Contaminated Soil (Clay Ratio)

* **Purpose**: Highly sensitive to clay minerals, helping distinguish mechanically disturbed, stripped, or eroded topsoil from healthy surrounding earth.
* **Citation/Basis**: Standard geological clay alteration mapping (e.g., *Rowan et al., 1974*).
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

### 2.9 Hydrocarbons (HCAI)

* **Purpose**: Separates brine-only spills from produced water spills containing crude oil traces. Hydrocarbons strongly absorb red light (B04) but reflect SWIR (B11), creating a distinct oil/water signature.
* **Citation/Basis**: *Kühn et al., 2004* (Detection of hydrocarbon-bearing soils using optical remote sensing).
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

### 2.10 Heavy Metals (HMRI)

* **Purpose**: Tracks severe brine/produced water contamination that precipitates heavy metals (barium, strontium), altering background mineralogy and inducing severe localized vegetation stress.
* **Citation/Basis**: *Choe et al., 2008* (Mapping heavy metal pollution in soils using optical remote sensing).
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

### 2.11 Produced Water Index (PWI)

* **Formula**: `NDSI × HCAI × HMRI` (with extreme squelching thresholds applied before multiplication)
* **Scientific Logic**: Produced water is a mixture of saline brine, residual hydrocarbons, and heavy metals. This highly restrictive composite requires a positive signature across all three to register. By applying thresholds tailored to the high albedo of the Permian Basin, dry salt flats and rock outcroppings are squelched out.
* **Citation/Basis**: Custom composite index combining foundational logic from *Metternicht & Zinck (2003)*, *Kühn et al. (2004)*, and *Choe et al. (2008)*, aggressively tailored for regional anomaly isolation.
* **Sentinel Hub Evalscript**:

    ```javascript
    // 1. Calculate base indices
    let sumBrine = sample.B11 + sample.B12;
    let brine = (sumBrine === 0) ? 0 : (sample.B11 - sample.B12) / sumBrine;
    
    let sumHcai = sample.B11 + sample.B04;
    let hcai = (sumHcai === 0) ? 0 : (sample.B11 - sample.B04) / sumHcai;
    
    let hmri = (sample.B03 === 0) ? 0 : sample.B12 / sample.B03;
    
    // 2. Permian-calibrated thresholds
    // Dry soil NDSI: 0.05–0.10; HCAI: 0.15–0.30; HMRI: 1.5–1.9
    let brineScore = Math.max(0, brine - 0.10);
    let hcaiScore = Math.max(0, (hcai - 0.30) * 2);
    let hmriScore = Math.max(0, (hmri - 2.0) * 2);
    
    // 3. Multiplication AND Gate (if any is zero, PWI is zero)
    let pwi = brineScore * hcaiScore * hmriScore;
    
    // 4. Cubic scaling — marginal soil leakage cubes to ~0 while real spills hit 1.0
    let finalMapped = Math.min(1.0, Math.pow(pwi * 20, 3));
    // Mapped to a Transparent -> Cyan -> Magenta -> Neon Yellow palette
    ```

### 2.12 Synthetic Aperture Radar (SAR) Moisture (VV/VH)

* **Purpose**: Utilizes C-band microwaves to penetrate clouds/darkness and measure surface roughness and dielectric constant. Smooth surfaces (water) appear dark, rough surfaces appear reflective.
* **Satellites**: Sentinel-1 GRD
* **Polarizations**: `VV` and `VH`
* **Formula**: `VV / (VH + 0.001)`
* **Evaluating Logic**:

    ```javascript
    let vv = Math.max(0, Math.log10(sample.VV) * 10 + 20) / 20;
    let vh = Math.max(0, Math.log10(sample.VH) * 10 + 20) / 20;
    let ratio = vv / (vh + 0.001);
    // Returns [vv, vh, ratio * 0.5, 1];
    ```

### 2.13 True Color & False Color Composites

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

*Note: For the Salinity Index, an increase (Blue) indicates more salt accumulation, while a decrease (Red) indicates remediation/washing away.*

---
*Generated by Antigravity AI for Memvid Studio Applications.*
