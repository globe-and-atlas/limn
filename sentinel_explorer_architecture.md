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

### 2.7 True Color & False Color Composites

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
