# Sentinel Explorer — Complete Scientific Guide

**A deep reference for understanding Copernicus satellites, spectral remote sensing, SAR physics, and the custom indices built into this application.**

*Prepared from full codebase analysis of `/sentinel-explorer`. Designed for NotebookLM ingestion and self-directed learning.*

> **⚠ Current scientific status (2026-07-21).** July controls supersede the recall-only interpretation in historical sections of this guide. The permissive pipeline paired PWCI/ASAI/OBEC recall of 81.5% / 77.8% / 66.7% with background activation of 96.7% / 71.3% / 71.3%. The shipped viewer activated on 0/150 background controls but was also blank at all 11 reviewed positives. A 1,224-combination sweep found no useful produced-water/caliche separation at the tested 500 m single-scene support. These are experimental screening architectures, not validated detectors. Current analytics now return the same mapped/gated score shown by each evalscript. See `knowledge/domain/scientific-status-2026-07-20.md`.

> **Current app workflow.** Limn defaults to True Color, applies SCL pixel QA to primary L2A COG/GEE optical lenses, and promotes MNDWI, AWEIsh, NDMI, SAVI, BSI, dual-SWIR contrast, SWIR false color, NDRE, and the preliminary LBI response as complementary context. The Spill Evidence Timeline turns each documented bookmark into reference, before, event, after, late, and latest scene-search targets; it supports manual persistence review and swipe comparison but does not compute source attribution or a persistence detector. An OSM check exposes mapped roads, while pads remain a visual imagery confounder. A collapsed Gate Diagnostics drawer exposes dual-SWIR, SWIR1–NIR, SWIR1–Red, Blue–SWIR2, SWIR1/SWIR2, and SWIR2/Green component responses; the historical acronyms remain for reproducibility, but the controls state that these are not chemical measurements. The optional bundled Sentinel Hub WMS carrier is L1C and cannot provide SCL, so the UI labels that provider limitation. PWCI, ASAI, and OBEC are retained in a separate collapsed negative-result drawer. Before/after swipe and Sentinel-1 VV context help investigate change and surface conditions; neither is presented as source attribution.

**Authorship note:** NDVI, NDRE, SAVI, MNDWI, AWEIsh, NDMI, MSI, BSI, and CRSI are established methods. The legacy keys NDSI, HCAI, HMRI, and NDOI in Limn are broad-band surface contrasts, not direct implementations of chemical retrievals implied by their historical names. Project composites and software implementations were developed by **Daniel Bally (Globe & Atlas, 2025–2026)**. Historical ✧/✧✧ symbols identify project-designed formulas; they do not establish scientific priority, patent novelty, or validation.

---

## Table of Contents

1. [What This Application Does](#1-what-this-application-does)
2. [The Copernicus Programme](#2-the-copernicus-programme)
3. [Sentinel-2: The Optical Satellite](#3-sentinel-2-the-optical-satellite)
4. [Sentinel-1: The Radar Satellite](#4-sentinel-1-the-radar-satellite)
5. [How Satellite Data Becomes a Map Tile](#5-how-satellite-data-becomes-a-map-tile)
6. [Evalscripts: The Programming Layer](#6-evalscripts-the-programming-layer)
7. [Spectral Indices — The Science](#7-spectral-indices--the-science)
8. [The Full Index Library (36 Lenses)](#8-the-full-index-library-36-lenses)
9. [PWCI: Produced-Water Contrast Index (formerly PWI) ✧✧ — Deep Dive](#9-pwci-produced-water-contrast-index-formerly-pwi-✧✧--deep-dive)
10. [ASAI: Arid Salinity Anomaly Index (formerly PWOI) ✧✧](#10-asai-arid-salinity-anomaly-index-formerly-pwoi-✧✧)
11. [OBEC: Optical Brightness/Edge Contrast (formerly HPWI) ✧](#11-obec-optical-brightnessedge-contrast-formerly-hpwi-✧)
11.5 [MVPI legacy: Single-Scene SWIR Ratio Screen](#115-mvpi-legacy-single-scene-swir-ratio-screen)
12. [SAR Indices: Sentinel-1 Processing](#12-sar-indices-sentinel-1-processing)
13. [Multi-Temporal Analysis](#13-multi-temporal-analysis)
14. [The Permian Basin Context](#14-the-permian-basin-context)
15. [Calibration and the False Positive Problem](#15-calibration-and-the-false-positive-problem)
16. [The Statistics API and Anomaly Detection](#16-the-statistics-api-and-anomaly-detection)
17. [Validation Results](#17-validation-results)
18. [Scientific Citations](#18-scientific-citations)
19. [Glossary](#19-glossary)

---

## 1. What This Application Does

Sentinel Explorer is a browser-based geospatial investigation tool for **screening surface context around documented produced-water events in the Permian Basin, West Texas and New Mexico.** It is not a validated produced-water or chemical detector.

Produced water is the largest waste stream in oil and gas production. It is a highly toxic mixture of ancient formation brine (saltwater trapped underground for millions of years), residual crude oil hydrocarbons, and dissolved heavy metals including barium, strontium, and radium. When it spills — through pipeline failures, storage tank ruptures, or illegal discharge — it contaminates soil, groundwater, and vegetation over wide areas.

The application uses two complementary Copernicus satellites:

- **Sentinel-2** (optical/multispectral): 13 spectral bands from visible light through shortwave infrared. Cannot see through clouds and provides broad surface-reflectance information; chemical attribution requires independent evidence.
- **Sentinel-1** (SAR/radar): Synthetic Aperture Radar that penetrates clouds and operates at night. Measures surface roughness and the dielectric constant of materials.

The system streams these satellite images in real time through the **Copernicus Data Space Ecosystem (CDSE)** and **Sentinel Hub**, applying custom mathematical formulas called **evalscripts** directly on the satellite servers. Instead of downloading gigabytes of raw imagery, the app receives lightweight PNG map tiles pre-processed to highlight spectral or surface contrasts.

---

## 2. The Copernicus Programme

The Copernicus Programme is the European Union's Earth Observation programme, operated by the European Space Agency (ESA) and the European Commission. It provides free, open, and full access to satellite data from the Sentinel satellite family.

**Key facts:**
- Data is free to access for all users worldwide
- Sentinel-2 revisit time: every **5 days** at the equator (2 satellites: 2A and 2B)
- Sentinel-1 revisit time: every **6–12 days** (2 satellites: 1A and 1B)
- Archive goes back to 2015 (Sentinel-2A launch: June 2015)
- All data distributed via **Copernicus Data Space Ecosystem** at `dataspace.copernicus.eu`

**Sentinel Hub** is a commercial platform (part of Sinergise, now Copernicus Data Space) that provides cloud-based processing of Sentinel data. This app connects to Sentinel Hub via OAuth2 tokens to run evalscripts and fetch processed imagery.

---

## 3. Sentinel-2: The Optical Satellite

### 3.1 The Sensor: MSI (MultiSpectral Instrument)

Sentinel-2 carries the **MultiSpectral Instrument (MSI)**, a passive push-broom sensor that measures reflected sunlight across 13 spectral bands. "Passive" means it does not emit any signal — it only measures the sun's light as it bounces off Earth's surface back toward space.

The MSI uses a push-broom architecture: as the satellite passes over, a linear array of detectors sweeps the ground, building up a 290 km wide image swath.

### 3.2 All 13 Bands — Complete Reference

| Band | Name | Central Wavelength | Bandwidth | Spatial Resolution | Primary Use |
|------|------|-------------------|-----------|-------------------|-------------|
| B01 | Coastal Aerosol | 443 nm | 20 nm | **60m** | Aerosol correction, water quality |
| B02 | Blue | 490 nm | 65 nm | **10m** | True color, water, chlorophyll |
| B03 | Green | 560 nm | 35 nm | **10m** | True color, vegetation, NDWI |
| B04 | Red | 665 nm | 30 nm | **10m** | True color, NDVI, chlorophyll absorption |
| B05 | Red Edge 1 | 705 nm | 15 nm | **20m** | Vegetation stress, chlorophyll edge |
| B06 | Red Edge 2 | 740 nm | 15 nm | **20m** | Vegetation mapping, LAI |
| B07 | Red Edge 3 | 783 nm | 20 nm | **20m** | Vegetation canopy, LAI |
| B08 | NIR (Broad) | 842 nm | 115 nm | **10m** | Vegetation, NDVI, NDMI, BSI |
| B8A | NIR (Narrow) | 865 nm | 20 nm | **20m** | NDMI, canopy, atmospheric correction |
| B09 | Water Vapour | 945 nm | 20 nm | **60m** | Atmospheric water vapour correction |
| B10 | Cirrus | 1375 nm | 30 nm | **60m** | Cirrus cloud detection |
| B11 | SWIR 1 | 1610 nm | 90 nm | **20m** | Moisture, soil, geology, fire |
| B12 | SWIR 2 | 2190 nm | 180 nm | **20m** | Minerals, soil type, hydrocarbons |

### 3.3 Why Resolution Varies

The resolution differences (10m, 20m, 60m) reflect a tradeoff in sensor design: wider spectral bands capture more energy and can achieve finer spatial detail, while narrow bands (used for precise atmospheric corrections) receive less photons and need larger pixels to build up enough signal.

**This app primarily uses the 10m and 20m bands:** B02, B03, B04, B08 at 10m; B05, B06, B07, B8A, B11, B12 at 20m. The 60m bands (B01, B09, B10) are not used in any index here.

### 3.4 Level-1C vs Level-2A: What Atmospheric Correction Means

**Level-1C (L1C) — Top of Atmosphere (TOA):**
What the sensor actually measures. Includes the effects of the atmosphere (aerosols, water vapour, Rayleigh scattering). Values are in reflectance units, but they describe what the top of the atmosphere looks like, not the ground.

**Level-2A (L2A) — Bottom of Atmosphere (BOA) / Surface Reflectance:**
Atmospherically corrected using the Sen2Cor algorithm. The atmospheric effects have been computationally removed, leaving only the surface reflectance — the actual fraction of sunlight reflected by the ground.

**This app exclusively uses Sentinel-2 L2A** (`sentinel-2-l2a` datasource). This is critical: spectral indices like NDVI, NDMI, and the custom PWI suite are calibrated for surface reflectance values. Running them on L1C data produces incorrect results.

### 3.5 Bands Used in This App

The following bands drive the application's 36 registered optical and radar lenses:

| Band | Wavelength | Used For |
|------|-----------|----------|
| B02 (Blue) | 490 nm | Blue–SWIR2 contrast, True Color |
| B03 (Green) | 560 nm | MNDWI, SWIR2/Green denominator, True Color |
| B04 (Red) | 665 nm | NDVI, SAVI, SWIR1–Red contrast, True Color |
| B05 (Red Edge 1) | 705 nm | NDRE, REAI |
| B06 (Red Edge 2) | 740 nm | REAI |
| B07 (Red Edge 3) | 783 nm | VSI (Vegetation Stress Index) |
| B08 (Broad NIR) | 842 nm | NDVI, SAVI, BSI, SWIR1–NIR contrast |
| B8A (Narrow NIR) | 865 nm | NDMI, NDRE, VSI |
| B11 (SWIR 1) | 1610 nm | MNDWI, NDMI, dual-SWIR, MSI, BSI, SWIR1–Red contrast |
| B12 (SWIR 2) | 2190 nm | Dual-SWIR, SWIR1/SWIR2, SWIR2/Green, PWCI, FBC |

**SWIR bands (B11, B12) are the workhorses of this application.** Their broad responses are useful for water, moisture, mineral, vegetation, and surface-condition context. Sentinel-2's band widths and sampling do not make these ratios chemically diagnostic by themselves.

---

## 4. Sentinel-1: The Radar Satellite

### 4.1 What SAR Is and Why It Matters

**Synthetic Aperture Radar (SAR)** is an active remote sensing technology. Unlike Sentinel-2 (which passively measures reflected sunlight), Sentinel-1 **transmits its own microwave pulses** toward Earth and measures the energy bounced back (backscattered) to the satellite.

Because it uses its own energy source (microwaves, not visible light), Sentinel-1 can:
- Operate **day and night** without any dependency on sunlight
- **Penetrate clouds, haze, rain, and smoke** (microwaves pass through the atmosphere virtually unimpeded)
- See through **thin vegetation canopy** into the soil beneath
- Detect **millimeter-scale surface deformation** via interferometry

### 4.2 C-Band: The Frequency Used

Sentinel-1 operates in **C-band** at a center frequency of **5.405 GHz**, which corresponds to a wavelength of **~5.5 cm**.

Different SAR bands interact with Earth's surface differently:
- **C-band (5.5 cm):** Sensitive to surface roughness at the cm scale; excellent for soil moisture, ocean waves, vegetation canopy texture. Can penetrate thin vegetation.
- **L-band (23 cm):** Deeper canopy penetration, excellent for forests.
- **X-band (3 cm):** Very surface-sensitive, excellent for urban structures.

C-band SAR (Sentinel-1) is useful for cloud-independent surface context. Roughness, moisture, vegetation, incidence angle, and substrate are confounded, so a dark or bright return is not produced-water attribution.

### 4.3 IW Mode: Interferometric Wide Swath

The **IW (Interferometric Wide Swath)** acquisition mode is the primary mode used over land. It uses **TOPS (Terrain Observation with Progressive Scans)** to achieve a 250 km swath width at 5×20 m resolution. This is the standard mode for Sentinel-1 data over the continental US.

### 4.4 GRD vs SLC Products

**GRD (Ground Range Detected):**
Multi-looked and projected to ground range geometry. Complex SAR signal converted to power (amplitude). Simple to use — each pixel has a real-valued backscatter intensity. This is what this application uses (`sentinel-1-grd`).

**SLC (Single Look Complex):**
Preserves the full complex SAR signal (amplitude + phase). Required for interferometric applications (deformation, subsidence). More complex to process.

### 4.5 Polarization: VV and VH

Sentinel-1 transmits and receives in two polarization channels simultaneously:

**VV (Vertical transmit, Vertical receive):**
- Measures the **co-polarized** return — energy that bounced back with the same polarization it was sent
- Sensitive to **surface roughness** at the wavelength scale and **dielectric constant** of the surface
- Smooth surfaces (calm water, brine pools, wet soil) → **very dark** (low VV backscatter) — most energy scattered away from the satellite
- Rough surfaces (dry soil, vegetation, gravel) → **bright** (high VV backscatter) — energy scattered in all directions including back to satellite

**VH (Vertical transmit, Horizontal receive):**
- Measures the **cross-polarized** return — energy that changed polarization during interaction with the surface
- Requires **volume scattering** (multiple bounces inside a 3D structure like vegetation canopy, foam, or rough surfaces)
- Smooth surfaces → extremely dark VH (almost no depolarization)
- Dense vegetation → bright VH (canopy causes polarization rotation)

**Key boundary for this app:** Calm water can be dark in both VV and VH, but so can other smooth or low-return surfaces. The app exposes VV context and a separate VH/VV-derived surface-contrast experiment; neither is a spill detector.

### 4.6 Backscatter in Decibels (dB)

SAR backscatter (sigma-nought, σ⁰) is measured in **decibels (dB)**:

```
σ⁰(dB) = 10 × log₁₀(σ⁰_linear)
```

Typical values:
- **Calm water / smooth brine pool:** −20 to −30 dB (very low)
- **Wet soil / moist bare earth:** −10 to −15 dB
- **Dry rough soil / sand:** −8 to −12 dB
- **Dense vegetation / forest:** −5 to −8 dB
- **Urban structures (double bounce):** +5 to +15 dB

In this application, the GRD data is delivered in linear power units (not dB). The evalscript converts to normalized display values:
```javascript
let vv = Math.max(0, Math.log10(sample.VV) * 10 + 20) / 20;
```
This maps −20 dB → 0.0 (black) and 0 dB → 1.0 (white).

### 4.7 Speckle: The Grainy Texture of SAR

SAR images have a characteristic "salt and pepper" texture called **speckle**. It arises because each resolution cell on the ground contains many individual scatterers (pebbles, soil particles, plant stems). Their radar reflections add and cancel each other based on their sub-wavelength positions, creating random constructive/destructive interference. Speckle is not noise in the traditional sense — it is deterministic but effectively random-looking.

Speckle makes SAR imagery harder to interpret visually than optical imagery. Multi-looking (averaging looks) or spatial filtering reduces speckle at the cost of spatial resolution. This application uses GRD data which has already been multi-looked.

---

## 5. How Satellite Data Becomes a Map Tile

This application uses the **Sentinel Hub WMS (Web Map Service)** to stream processed satellite imagery. Understanding this pipeline is key to understanding what the map is actually showing.

### 5.1 The WMS Pipeline

```
User's Browser
    ↓ HTTP request: "Give me a 256×256 PNG of this bounding box"
Sentinel Hub Server
    ↓ Look up source imagery for the requested date and area
Copernicus Archive (S3 storage)
    ↓ Load raw band data for the requested tiles
Evalscript Engine (JavaScript)
    ↓ For each pixel: run the custom index formula on raw band values
    ↓ Map output value (0–1) through color palette
PNG Map Tile (256×256 pixels)
    ↓ Return to browser
Leaflet.js Map
    ↓ Composite tiles into the visible map
```

The key advantage: **the math runs on Sentinel Hub's servers**. The browser never downloads raw satellite data. It only receives 256×256 pixel images, each already processed with the custom formula.

### 5.2 WMS Parameters

Every map tile request sends these key parameters:
- `layers`: Which Sentinel Hub WMS configuration to use (e.g., `AGRICULTURE` or `SENTINEL1-GRD`)
- `time`: Date or date range (e.g., `2026-03-17` or `2026-01-01/2026-03-31`)
- `maxcc`: Maximum cloud cover percentage (0–100). The app uses 20% by default, 60% for broader temporal queries.
- `evalscript`: Base64-encoded JavaScript formula to run on the pixel values
- `bbox`: Geographic bounding box in WGS84 coordinates: [West, South, East, North]

### 5.3 Mosaicking: How Dates Are Handled

When a date range is specified a **date range** instead of a single date, Sentinel Hub applies **mosaicking** — it picks the best pixel across all images in the range. The default mosaicking order is `mostRecent`: it uses the newest cloud-free pixel from the range. This effectively "fills in" cloudy areas using data from adjacent days.

For **multi-temporal difference analysis**, the app switches to `mosaicking: "ORBIT"` mode, which provides all individual acquisitions as an array of samples for the evalscript to compare.

---

## 6. Evalscripts: The Programming Layer

Evalscripts are JavaScript functions that Sentinel Hub executes **on the server, on every pixel**. They transform raw satellite band values into display values.

### 6.1 Structure of an Evalscript

Every evalscript has two mandatory functions:

```javascript
//VERSION=3
function setup() {
  return {
    input: ['B02', 'B03', 'B04', 'B08', 'B11', 'B12', 'dataMask'],
    output: { bands: 4 }  // RGBA output
  };
}

function evaluatePixel(sample) {
  // sample.B02, sample.B03, etc. are reflectance values (0 to ~1.0)
  // sample.dataMask = 1 if valid data, 0 if no data (outside coverage)

  if (sample.dataMask === 0) return [0, 0, 0, 0];  // transparent

  // ... index formula ...

  return [red, green, blue, alpha];  // all values 0–1
}
```

The `setup()` function declares which bands the script needs. Sentinel Hub only loads those bands from the archive, optimizing processing time. The `evaluatePixel()` function runs independently on every pixel.

### 6.2 Band Value Ranges

For **Sentinel-2 L2A**, reflectance values are delivered in the range **0 to ~1.0** (sometimes slightly above 1.0 for very bright surfaces). A value of 1.0 means 100% of the incident solar radiation is reflected at that wavelength. Typical soil values: 0.1–0.4. Vegetation NIR: 0.4–0.8. Fresh snow: >0.9.

For **Sentinel-1 GRD**, VV and VH are delivered as **linear power units** (sigma-nought). Values are typically between 0.0001 and 1.0, representing the fraction of transmitted radar energy that returns to the sensor.

### 6.3 The Four Evalscript Types Used in This App

**Type 1 — Single Date:** Standard evalscript that processes one image at one moment in time.

**Type 2 — Difference (Multi-Temporal):** Uses `mosaicking: "ORBIT"` to receive two images. Computes the index at each date and returns the signed difference, mapped to a divergent color scale (red = decrease, blue = increase).

**Type 3 — Cumulative MAX:** Scans an entire time range and returns the maximum index value seen at each pixel location. Used to "accumulate" any spill signal that appeared and then dried up.

**Type 4 — Deep Fusion (S1+S2):** Combines inputs from both Sentinel-1 and Sentinel-2 in a single evalscript using multi-datasource configuration. **Note:** These deep fusion evalscripts are defined in the codebase but cannot be rendered via WMS due to a Sentinel Hub platform restriction — multi-datasource evalscripts are only supported via the Process API, not the WMS endpoint.

### 6.4 Calibration Injection

Before transmission, the app injects dynamic calibration values as JavaScript constants into the evalscript:

```javascript
const VISUAL_FILTER = 0.05;        // Minimum index value to display
const DETECTION_SENSITIVITY = 0.75; // Scales threshold offsets
```

These allow the user to tune sensitivity without rebuilding the evalscript from scratch. Placeholder tokens (`__BSI_MASK__`, `__PWI_SALINITY_OFFSET__`, etc.) in the script body are replaced with the current calibration values at request time.

---

## 7. Spectral Indices — The Science

### 7.1 What a Spectral Index Is

A spectral index is a mathematical transformation of raw band values designed to emphasize a specific surface property. Most indices exploit one of these physical principles:

**Normalized Difference:** `(Band_A - Band_B) / (Band_A + Band_B)`
Produces a value between −1.0 and +1.0. Normalization removes the effect of illumination variations (sun angle, topographic shadows, atmospheric brightness). A feature of interest is bright in Band_A and dark in Band_B (or vice versa).

**Simple Ratio:** `Band_A / Band_B`
Amplifies contrast between two bands. Unbounded range. Sensitive to absolute brightness differences.

**Composite (Product) Index:** `Index_A × Index_B × Index_C`
Acts as a logical AND gate: all component indices must be elevated simultaneously for the output to be nonzero. Used to reduce false positives.

### 7.2 Why SWIR Bands Are So Powerful

The shortwave infrared (SWIR) region (1400–2500 nm, covered by Sentinel-2 B11 and B12) is almost invisible to the human eye but carries an enormous amount of chemical information:

- **Liquid water** strongly absorbs SWIR (especially around 1450 nm and 1940 nm). Soils with water content appear darker in SWIR than dry soils.
- **Hydrocarbons** (crude oil, petroleum residues) have specific absorption features around 1720 nm and 2310 nm. They reduce reflectance in B12 (2190 nm) relative to clean soil.
- **Minerals** have diagnostic spectral features in SWIR: clays absorb strongly around 2200 nm; carbonates (calcite, dolomite) absorb around 2340 nm; gypsum at 1450 nm.
- **Salts and brine** alter the SWIR spectrum by disrupting the typical mineral lattice structure of soil.

This is why **B11 and B12 appear in many indices in this application**: they provide strong moisture and material contrast. Specific chemical interpretation requires spectroscopy, field samples, or a calibrated retrieval model.

### 7.3 The Normalized Difference Formula — Why Divide?

Consider a simple ratio `B11/B12`. On a sunny day with clear air, the sensor records high values for both bands. On a hazy day, it records lower values for both. The ratio is similar both days. But the ratio is **not normalized** — if B12 is very small, the ratio explodes.

The normalized difference `(B11 - B12) / (B11 + B12)`:
- Always produces a value between −1 and +1
- Is insensitive to absolute brightness (both numerator and denominator scale together under brightness changes)
- Highlights the **relative difference** between the two bands, not their absolute magnitudes

---

## 8. The Full Index Library (36 Lenses)

### 8.1 Standard Environmental Indices

#### NDVI — Normalized Difference Vegetation Index
- **Formula:** `(B08 - B04) / (B08 + B04)`
- **Bands:** B08 (NIR, 842nm), B04 (Red, 665nm)
- **Range:** −1 to +1
- **Physical basis:** Healthy green vegetation strongly absorbs red light (chlorophyll pigment) and strongly reflects NIR (cell wall structure). Dead soil and water have similar NIR/Red reflectance. High NDVI = dense, healthy vegetation. Low NDVI = sparse, stressed, or absent vegetation.
- **Citation:** Rouse et al., 1974
- **Typical values:** Dense forest: 0.6–0.9; Sparse shrubland: 0.1–0.3; Bare Permian caliche: −0.05 to 0.05; Water: −0.3 to −0.1
- **Temporal sensitivity:** Weeks to months. Vegetation responds to spills over days to weeks; stress may persist for months.

#### SAVI — Soil Adjusted Vegetation Index
- **Formula:** `((B08 - B04) / (B08 + B04 + 0.5)) × 1.5`
- **Bands:** B08, B04
- **Physical basis:** NDVI is contaminated by soil brightness in sparse vegetation areas. In arid environments like the Permian Basin, bright white caliche soil creates a background NDVI signal even where no plants exist. The SAVI correction factor `L = 0.5` mathematically reduces the soil "noise floor," making it far more accurate for Permian Basin well pad monitoring.
- **Citation:** Huete, 1988
- **When to use instead of NDVI:** Any time vegetation cover is <40% — virtually everywhere in this application.

#### MNDWI — Modified Normalized Difference Water Index (internal key `ndwi`)
- **Formula (used here):** `(B03 - B11) / (B03 + B11)` (Xu, 2006)
- **Bands:** B03 (Green, 560nm), B11 (SWIR1, 1610nm)
- **Physical basis:** Liquid water reflects green light and absorbs SWIR strongly. Vegetation and soil do the opposite. Positive NDWI = open water body or saturated soil. Negative NDWI = dry surface.
- **Note:** McFeeters (1996) NDWI uses Green/NIR; Gao (1996) NDWI/NDMI uses NIR/SWIR. The Green/SWIR formula implemented here is Xu's MNDWI.
- **Important for this app:** On dry Permian Basin soil, NDWI is typically very negative (−0.39 to −0.51) because B11 >> B03. This is the key insight behind the ASAI (formerly PWOI) dry brine mode — standard wetness detection fails in desert environments.

#### AWEIsh — Automated Water Extraction Index (shadow variant)
- **Formula:** `B02 + 2.5·B03 − 1.5·(B08+B11) − 0.25·B12`
- **Bands:** B02, B03, B08, B11, B12
- **Role:** An established water-extraction cross-check that can suppress many shadow and bright-surface confounders differently from MNDWI.
- **Boundary:** Positive response supports water-like surface context only; it does not measure salinity, brine concentration, or produced-water source.

#### NDMI — Normalized Difference Moisture Index
- **Formula:** `(B8A - B11) / (B8A + B11)`
- **Bands:** B8A (Narrow NIR, 865nm), B11 (SWIR1, 1610nm)
- **Physical basis:** Measures vegetation canopy water content (leaf water). Used to detect drought stress and irrigation changes. Note: this is sometimes called NDWI-vegetation to distinguish from NDWI-water.
- **Citation:** Gao, 1996

#### NDRE — Normalized Difference Red-Edge Index
- **Formula:** `(B8A - B05) / (B8A + B05)`
- **Bands:** B8A (narrow NIR), B05 (red edge 1)
- **Role:** Complements NDVI/SAVI when inspecting vegetation response and canopy condition.
- **Boundary:** Phenology, drought, disease, grazing, fire, and land management are confounders; NDRE cannot attribute stress to produced water without independent controls.

#### MSI — Moisture Stress Index
- **Formula:** `B11 / B08`
- **Bands:** B11 (SWIR1), B08 (NIR)
- **Physical basis:** As vegetation experiences drought, leaf water content drops, decreasing SWIR absorption (B11 increases) and slightly changing NIR reflectance. MSI > 1.0 indicates moisture stress. MSI > 2.0 indicates severe stress.
- **Citation:** Rock et al., 1986

### 8.2 Soil and Mineral Indices

#### BSI — Bare Soil Index
- **Formula:** `((B11 + B04) - (B08 + B02)) / ((B11 + B04) + (B08 + B02))`
- **Bands:** B11, B04, B08, B02
- **Physical basis:** Bare soil reflects strongly in SWIR and Red but weakly in NIR and Blue (due to lack of green chlorophyll and vegetation cellular structure). Vegetation suppresses BSI (high B08, low B11 relative to what bare soil would produce). BSI is a critical masking layer in this app: pixels with BSI below threshold are excluded from spill indices since they are either water or vegetation, not exposed soil where spills would be visible.

#### Dual-SWIR Contrast — NDSI legacy key (NDTI/NBR2 form)
- **Formula:** `(B11 - B12) / (B11 + B12)`
- **Bands:** B11 (SWIR1, 1610nm), B12 (SWIR2, 2190nm)
- **Interpretation:** The ratio responds to the broad SWIR curve, but the same algebra is widely used for tillage, residue, burn, moisture, and other surface conditions. It is retained as a salinity hypothesis component, not a brine-specific measurement.
- **Citation:** Metternicht & Zinck, 2003

#### CSI legacy — SWIR1/SWIR2 Surface Ratio
- **Formula:** `B11 / B12`
- **Interpretation:** The ratio is sensitive to mineralogy, residue, moisture, disturbance, and substrate. It can support contextual interpretation but does not establish clay type or contamination by itself.

#### SI legacy — SWIR1–NIR Surface Contrast
- **Formula:** `(B11 - B08) / (B11 + B08)`
- **Interpretation:** Broad normalized surface contrast. It may support locally calibrated salinity work, but Limn does not retrieve salt concentration from it.

#### BSI (Normalized, aka NBSI)
Used throughout as a masking criterion to identify bare soil vs. vegetated/water pixels.

### 8.3 Hydrocarbon and Chemical Indices

#### SWIR1–Red Contrast — HCAI legacy key
- **Formula:** `(B11 - B04) / (B11 + B04)`
- **Bands:** B11 (SWIR1, 1610nm), B04 (Red, 665nm)
- **Interpretation:** Broad SWIR1–Red contrast is affected by soil color, iron oxides, vegetation, moisture, and illumination. Sentinel-2 B11 does not reproduce the narrow hyperspectral Hydrocarbon Index absorption retrieval; this is not a petroleum measurement.
- **Citation:** Kühn et al., 2004

#### SWIR2/Green Contrast — HMRI legacy key
- **Formula:** `B12 / B03`
- **Bands:** B12 (SWIR2, 2190nm), B03 (Green, 560nm)
- **Interpretation:** Broad SWIR2/Green contrast is affected by brightness, vegetation, moisture, substrate, and mineralogy. Heavy-metal estimation requires field concentrations and calibrated multivariate models; no ratio threshold here establishes genuine metal contamination.
- **Citation:** Choe et al., 2008

#### Blue–SWIR2 Contrast — NDOI legacy key
- **Formula:** `(B02 - B12) / (B02 + B12)`
- **Bands:** B02 (Blue, 490nm), B12 (SWIR2, 2190nm)
- **Interpretation:** Water, bright soil, aerosols, shadow, moisture, and material differences affect the normalized Blue–SWIR2 contrast. Its sign is not uniquely attributable to oil or dissolved organics.
- **Related work:** Dekker et al., 2001 (optical water quality remote sensing)

#### Red/Blue × SWIR Surface Contrast — AOI legacy key
- **Formula:** `(B04 / B02) × (B11 / B12)`
- **Bands:** B04 (Red), B02 (Blue), B11 (SWIR1), B12 (SWIR2)
- **Interpretation:** The product can highlight broad material or iron-rich surface differences, but it does not establish anoxia, iron oxidation state, or produced-water causation.

### 8.4 Project Surface-Response Composites

These are reproducible screening formulas, not spill-specific or chemically specific indices. Exact display mapping and analytical parity are governed by `src/indices.js`.

| Key | Current descriptive name | Implemented display summary | Scientific boundary |
|---|---|---|---|
| FBC | Red/Blue–Dual-SWIR–Low-Vegetation Composite | `clamp(150·(red_blue_score·dual_swir_score·no_veg)^1.4,0,1)` | No iron-state, brine, or spill attribution |
| REAI | Red-Edge/Dual-SWIR Alteration Composite | `clamp(100·(red_edge_score·dual_swir_score)^2,0,1)` | No ferric-mineral attribution |
| VCBI | Vegetation-Stress/Dual-SWIR Composite | `clamp(30·(inverse_crsi_score·dual_swir_score)^1.5,0,1)` | No chloride or migration attribution |
| LBI | Liquid/Salinity Response Index | `20 × wetness/dual-SWIR/low-veg/surface gates`, with open-water bypass | Preliminary water response; standing brine overlaps freshwater controls |
| TRI | Three-Ratio Residue Composite | `100 × three thresholded surface ratios` | No toxicity, metal, or spill-age retrieval |
| BPI | Bare-Pad Three-Ratio Composite | `30 × bare-surface × dual-SWIR × SWIR1–Red terms` | No petroleum or brine classification |
| VSI | Vegetation/Dual-SWIR Stress Composite | `10 × dual-SWIR × red-edge × moisture-stress terms` | Many non-produced-water stressors are confounded |
| CMA | Clay/Surface Contrast Composite | `15 × dual-SWIR × SWIR ratio × Red/Blue ratio` | No clay-lattice alteration or causal attribution |
| PHI | SWIR-Shoulder Surface Composite | `20 × dual-SWIR × SWIR ratio × SWIR1–Red term` | No oil classifier or oily-brine separator |
| HMI | Green–SWIR Interaction Composite | `10 × Green/Blue term × SWIR ratio term` | No heavy-metal retrieval |

### 8.5 Visual Composites

#### True Color
- **Formula:** `return [B04 × 2.5, B03 × 2.5, B02 × 2.5, 1]`
- **Visual output:** Natural-looking color image. The 2.5× brightness multiplier compensates for the fact that surface reflectance values are typically 0.1–0.4 (10–40%), which would appear very dark without brightening.
- **Use:** Required first-pass evidence context. It reveals pads, ponds, roads, shadows, disturbance, and obvious scene problems before any index is interpreted; it does not classify produced water.

#### False Color (NIR)
- **Formula:** `return [B08 × 2.5, B04 × 2.5, B03 × 2.5, 1]` — NIR mapped to Red channel
- **Visual output:** Healthy vegetation appears bright crimson/red (because NIR reflectance is very high for vegetation). Dry soil and built surfaces appear in tans and blues. Water is very dark.
- **Use:** Classic vegetation mapping. Immediately distinguishes bare from vegetated areas.

#### SWIR Surface Context (B12/B11/B04)
- **Formula:** `RGB = B12 × 2.5, B11 × 2.5, B04 × 2.5`
- **Use:** Broad false-color differentiation of wet surfaces, vegetation, bare ground, pads, and substrate.
- **Boundary:** Display colors are not material classes, salinity estimates, or contamination labels.

#### EHC — Three-Channel Surface Context Composite ✧
- **Formula:** `R = Blue–SWIR2 contrast, G = BSI, B = dual-SWIR contrast`
- **Interpretation:** A false-color context view. Channel colors are not material classes, and a halo-like pattern does not prove a blowout.

---

## 9. PWCI: Produced-Water Contrast Index (formerly PWI) ✧✧ — Deep Dive

PWCI is a custom, reproducible three-contrast screening architecture. July testing found that it does not discriminate produced-water sites from Permian background at the tested support.

### 9.1 The Problem It Solves

Standard environmental indices (NDVI, NDMI, NDWI) detect vegetation stress and moisture. They produce enormous numbers of false positives in the Permian Basin because:
1. The bright white/tan caliche soil is inherently unusual-looking spectrally
2. Natural salt playas and evaporite deposits exist throughout the region
3. Normal well pad construction (gravel roads, concrete pads) creates spectral anomalies
4. Irrigation and natural seasonal moisture changes mimic spill signatures

PWCI requires three correlated broad-band surface contrasts to be elevated simultaneously. Because the terms reuse related bands and respond to common background factors, their multiplication does not provide independent confirmation or a low false-positive guarantee.

### 9.2 The Three Component Indices

**Component 1: dual-SWIR contrast (NDSI legacy key)**
```
NDSI = (B11 - B12) / (B11 + B12)
```
The ratio responds to many surface conditions and is not brine-specific.

**Component 2: SWIR1–Red contrast (HCAI legacy key)**
```
HCAI = (B11 - B04) / (B11 + B04)
```
This broad-band contrast is not a hyperspectral hydrocarbon retrieval.

**Component 3: SWIR2/Green contrast (HMRI legacy key)**
```
HMRI = B12 / B03
```
This broad ratio is not calibrated to any metal concentration.

### 9.3 The AND Gate: Why Multiplication

The final composite multiplies all three:
```
PWCI_raw = DualSWIRScore × SWIR1RedScore × SWIR2GreenScore
```

If any component is zero, PWCI is zero. This is a mathematical AND gate over surface contrasts, not chemical proof. Natural and industrial surfaces can activate or suppress the same terms.

### 9.4 Permian Basin Threshold Calibration

Each component must exceed a **regional threshold** before contributing to the score:

| Component | Formula | Threshold | Justification |
|-----------|---------|-----------|---------------|
| Brine Score | `max(0, NDSI - 0.03)` | NDSI > 0.03 | Permian background NDSI: 0.00–0.05 |
| Hydrocarbon Score | `max(0, (HCAI - 0.05) × 5)` | HCAI > 0.05 | Permian red soil HCAI: 0.10–0.25; offset captures only anomaly above floor |
| Heavy Metal Score | `max(0, (HMRI - 1.1) × 3)` | HMRI > 1.1 | Natural caliche HMRI: 0.8–1.1; spill contamination: 1.5–3.0+ |

These thresholds were iteratively calibrated against 27 TRRC (Texas Railroad Commission) spill records. They produced 81.5% development recall at threshold 0.01, but also activated on 96.7% of background controls; this is a failed operating point, not validation.

### 9.5 Cubic Non-Linear Scaling

```javascript
PWCI_final = min(1.0, pow(PWCI_raw × 20.0, 3.0))
```

The cubic function creates a sharp display "knee": small raw products approach zero and larger products saturate toward 1.0. The mapped value is a visualization score, not a probability or confirmation of contamination.

### 9.6 The BSI Masking Layer

Before any spill scoring, the app applies a **Bare Soil Index mask**:
```javascript
let bsi = ((B11 + B04) - (B08 + B02)) / ((B11 + B04) + (B08 + B02));
if (bsi <= BSI_MASK_THRESHOLD) return [0, 0, 0, 0]; // transparent
```

Water bodies, vegetation, and clouds all have BSI well below the mask threshold. This prevents the spill indices from "lighting up" water or vegetation as false positives. Only bare soil pixels pass through to spill analysis.

---

## 10. ASAI: Arid Salinity Anomaly Index (formerly PWOI) ✧✧

**ASAI** (Arid Salinity Anomaly Index, formerly PWOI) is a Sentinel Explorer composite calibration. It serves as a Sentinel-2 **optical proxy for what SAR would measure**: detecting abnormally smooth surfaces consistent with liquid brine pooling or dried salt crusts using only optical bands — no SAR required. Formerly known as Produced Water Optical Index (PWOI) or APEX Anomaly Index.

The key local implementation change is the **dry brine mode** (Section 10.3), introduced to address dry desert environments where standard NDWI-based indices collapse to near-zero. It increased development recall from 29.6% to 77.8% on 27 TRRC records, but background activation was 71.3%; it did not establish usable discrimination.

### 10.1 The Core Physics

SAR measures surface roughness via backscatter: smooth surfaces (water, brine) scatter radar energy away and return very little to the satellite (low backscatter). ASAI (formerly PWOI) recreates this concept optically using a different physical principle: **specular reflection**.

Very smooth surfaces (mirror-like) cause sunlight to reflect away from the satellite at a specular angle, making the surface appear darker than surrounding terrain in NIR/SWIR bands. Meanwhile, green wavelengths (B03) have slightly different behavior with smooth liquid surfaces. The ratio `(B03 - B11) / (B03 + B11)` — essentially the NDWI formula — produces a "smoothness proxy."

### 10.2 Wet Mode (Active Liquid Brine)

```
pwoi_oval = (B03 - B11) / (B03 + B11)     # optical smoothness
radar_proxy = clamp((pwoi_oval + 0.3) / 0.6, 0, 1.2)
brine_boost = max(0, NDSI) × 0.4
moisture = pwoi_oval + 0.3 + brine_boost

if radar_proxy > 0.7 AND moisture > 0.45:
    pwoi = radar_proxy × 0.4 + moisture × 0.6 + 0.25   # boosted
else:
    pwoi = radar_proxy × 0.3 + moisture × 0.7
```

**The problem:** In dry Permian Basin desert, NDWI is typically very negative (−0.4 to −0.5). B11 dominates B03 because the arid soil has strong SWIR and minimal green reflectance. This drives `pwoi_oval` deeply negative, collapsing the wet-mode score to zero — even where dry brine salt crust exists.

### 10.3 Dry Mode (Evaporated Salt Crust)

To handle the common case where brine has evaporated and left a dry salt crust:
```
if NDWI < -0.30 AND NDSI > 0.05 AND BSI > 0.10:
    pwoi_dry = clamp((NDSI - 0.04) × min(1, BSI × N) × scale, 0, 1)
    pwoi = max(pwoi_wet, pwoi_dry)   # take whichever is higher
```

The dry mode fires when: surface is dry (very negative NDWI), BUT salinity is elevated (NDSI > 0.05), AND surface is bare (BSI > 0.10). This covers the majority of Permian Basin post-spill scenarios.

**Adding the dry brine mode increased ASAI (formerly PWOI) development recall from 29.6% to 77.8%** on 27 TRRC records, while activating on 71.3% of background controls. It therefore remains a salt-crust screening hypothesis rather than a validated spill detector.

### 10.4 Temporal Persistence

ASAI (formerly PWOI) detects salt crusts that can persist for **months to years** after the initial spill — unlike moisture-dependent indices that fade as the liquid dries. This makes it valuable for detecting **historical contamination** in the cumulative MAX mode.

---

## 11. OBEC: Optical Brightness/Edge Contrast (legacy HPWI) ✧

OBEC is an experimental combination of Blue–SWIR2, dual-SWIR, and MNDWI-derived surface contrasts. It is a comparison view, not an independent confirmation layer or oil/brine-emulsion retrieval.

### 11.1 The Four-Component Formula

```
NDOI = max(0, (B02 - B12) / (B02 + B12))      # Blue/SWIR2 optical contrast
dual_swir = (B11 - B12) / (B11 + B12)
contrast_boost = max(0, dual_swir - τ) × 0.8

surface_signal = clamp(NDOI + contrast_boost, 0, 1)
smoothness = (B03 - B11) / (B03 + B11)          # Same as NDWI
norm_smooth = clamp((smoothness + 0.3) / 0.6, 0, 1)

obec = clamp(surface_signal × norm_smooth × 6.0, 0, 1)
```

**Interpretation limit:** all terms are broad surface contrasts with known confounders. Their product did not establish produced-water/caliche separation in the July 2026 controls.

### 11.2 Historical Dry-Mode Experiment and Current Shipped Path

An earlier pipeline experiment tested a dry-brine pathway:
```
hpwi_dry = clamp((NDSI - 0.04) × min(1, BSI × 3.5) × 14.0, 0, 1)
hpwi = max(hpwi_wet, hpwi_dry)
```

That experiment produced 66.7% development recall on 27 TRRC records and 71.3% background activation. The current shipped OBEC evalscript contains only the wet optical-contrast path above. OBEC is not an independent confirmation layer: it reuses related bands and surface proxies, and no useful operating point was established. Formerly known as Hybrid Produced Water Index (HPWI).

---

## 11.5 MVPI legacy: Single-Scene SWIR Ratio Screen

The legacy MVPI experiment thresholds B11/B12 over bright, sparsely vegetated surfaces. It does not implement an MBSP/MBMP methane retrieval, reference-scene fitting, plume classification, or emissions estimate.

### 11.5.1 Physical and Retrieval Boundary

Methane has narrow SWIR absorption structure near 2.3 µm, and established Sentinel-2 methane methods can exploit the differing spectral responses of B11 and B12. Sentinel-2's broad bands, however, do not make a single B11/B12 ratio a methane measurement. Operational retrievals require radiometric modeling and typically a methane-free reference observation or equivalent scene fitting.

An elevated B11/B12 ratio is spectrally degenerate with soil, evaporites, moisture, illumination, view geometry, and atmospheric effects. It cannot by itself establish a localized methane plume.

### 11.5.2 The Multi-Gate Consensus Formula

Because high-albedo bare soils, dry salt crusts, and gravel well pads naturally alter SWIR reflectance, a simple ratio produces heavy false positives. To resolve this, MVPI integrates a strict four-part logical AND consensus structure:

```javascript
// 1. Single-scene SWIR ratio response (not a gas retrieval)
let swirRatio = B11 / Math.max(B12, 0.001);
let swirRatioScore = Math.max(0.0, (swirRatio - 1.15) * 4.0);

// 2. Bright Ground Gate (requires highly reflective background surface)
let swirMean = (B11 + B12) / 2.0;
let groundGate = Math.max(0.0, (swirMean - 0.20) * 2.0);

// 3. Water Rejection Gate (specular anomaly suppression)
let waterReject = B03 > B11 ? 0.0 : 1.0;

// 4. Vegetation Rejection Gate (early plant stress suppression)
let ndvi = (B08 - B04) / (B08 + B04);
let vegReject = ndvi > 0.15 ? 0.0 : 1.0;

// 5. Cubed scaling for final visualization
let score = waterReject * vegReject * groundGate * swirRatioScore;
let mapped = Math.min(1.0, score * 3.0);
```

### 11.5.3 Authorship & Scientific IP Boundary

- **What is Public Domain:** The basic physical science of SWIR methane gas mapping, multi-band ratioing ($B11/B12$), and Sentinel-2 gas retrievals are established scientific prior art (e.g., *Varon et al., 2021*).
- **Project implementation:** The packaged single-scene ratio screen pairs $B11/B12$ with a SWIR mean ground-brightness floor, a green-to-SWIR water reject gate, and an NDVI-based vegetation reject gate. Its literature priority and methane-detection performance have not been established.

---

## 12. SAR Indices: Sentinel-1 Processing

### 12.1 SCRI — SAR Surface-Contrast Index (legacy salt-crust hypothesis)

The only true SAR index in this application (the others are Sentinel-2 based):

- **Sensor:** Sentinel-1 GRD
- **Bands:** VV, VH (C-band radar backscatter)
- **Formula:** `clamp((0.5 × max(0,(VH_dB+19)/9) × max(0,(VH_dB−VV_dB+6)/5))^2.5,0,1)`
- **Interpretation:** Roughness, moisture, vegetation, incidence angle, and substrate affect VV/VH. The implementation contains no optical salt proxy and is not calibrated to electrical conductivity or validated as a salt-crust classifier.

**Important distinction:** A normal water body also has low VV and VH. The difference for brine/salt crusts: in standard calm water, VV/VH is also high. But salt-encrusted soil is not perfectly smooth — it has a slight roughness texture from crystallization patterns that produces a slightly different radar response than open water.

### 12.2 S1_SAR — VV Backscatter Context
- **Display formula:**
```javascript
let vv = Math.max(0, Math.log10(sample.VV) * 10 + 20) / 20;
return [vv, vv, vv, 1];  // grayscale VV context
```
- **What colors mean:**
  - **Red (high VV):** Rough surfaces, dry soil, urban
  - **Green (high VH):** Vegetation, volumetric scatterers
  - **Dark:** Smooth surfaces — water, brine, very calm areas
  - **Yellow (both high):** Very rough, complex surfaces

### 12.3 The Deep Fusion Concept (S1+S2)

The codebase includes deep fusion evalscripts that merge Sentinel-1 and Sentinel-2 data at the pixel level:

```javascript
function evaluatePixel(samples, scenes) {
    // Find most recent valid S2 sample
    let s2 = null;
    for (const s of samples.s2) {
        if (s.dataMask === 1 && (s.B02 > 0 || s.B11 > 0)) { s2 = s; break; }
    }
    // Find most recent valid S1 sample
    let s1 = null;
    for (const s of samples.s1) {
        if (s.VH !== 0 && s.VV !== 0) { s1 = s; break; }
    }
    // Merge into combined sample object
    const sampleFlat = { ...s1_effective, ...s2 };
    // Run index formula on merged sample
}
```

This would allow indices that use `sample.VV`, `sample.VH` AND `sample.B11`, `sample.B12` in the same formula — true multi-sensor fusion. However, the WMS endpoint in Sentinel Hub does not support multi-datasource evalscripts. These are defined for future implementation via the Process API.

---

## 13. Multi-Temporal Analysis

### 13.1 Single Date Mode

The standard mode. Requests imagery for one specific date. If clouds obscure the area on that date, the area appears blank (transparent) in the map tile.

The WMS automatically applies mosaicking within the single date's acquisition window (a Sentinel-2 pass takes ~20 minutes over a region, and multiple orbital paths may cover the same area with slight time offsets). `mostRecent` mosaicking picks the best available pixel.

### 13.2 Difference Mode (Delta Analysis)

Compares two dates by computing `Index(T2) - Index(T1)` at every pixel:

```
diff < -0.15  →  Strong decrease   →  Bright Red/Orange
diff < -0.05  →  Slight decrease   →  Faded Red
|diff| < 0.05 →  Stable           →  Transparent/Grey
diff > 0.05   →  Slight increase   →  Faded Blue
diff > 0.15   →  Strong increase   →  Bright Blue/Cyan
```

**Interpretation for spill detection:**
- A **NDMI increase** (blue) in a well pad area between two dates = new moisture anomaly = potential spill
- An **NDVI decrease** (red) in a previously vegetated buffer = vegetation killed by contamination
- A **NDSI increase** (blue) on bare soil = new salt deposition

**Critical:** The difference map requires two cloud-free images from both dates. If either date has cloud cover, the difference is unreliable.

### 13.3 Cumulative MAX Mode

Scans an entire time range and returns the maximum index value seen at each pixel:

```javascript
//VERSION=3 — Cumulative evalscript
function evaluatePixel(samples) {
    let maxVal = 0;
    for (const s of samples) {
        if (s.dataMask === 0) continue;
        let val = <index_formula>(s);
        if (val > maxVal) maxVal = val;
    }
    return colorize(maxVal);
}
```

This mode is powerful for detecting **transient spills** that occurred and dried up before the current date. A spill that was wet (and detectable) for only a 5-day window will leave a permanent mark in the cumulative MAX — even though a single-date view shows nothing.

Cumulative MAX is computationally expensive (processes every image in the range) and is used with time windows of 3–6 months.

### 13.4 The 5-Day Aggregation Interval

The Statistics API scans query historical data in **5-day intervals** (matching the Sentinel-2 revisit time). For each 5-day window, it computes the mean index value across the user-drawn area of interest. This produces a time series showing index evolution.

The anomaly detection algorithm then flags dates where any of the primary spill indices exceed threshold:
```javascript
if (pwi > 0.10 || hpwi > 0.05 || pwoi > 0.05 ||
    lbi > 0.05 || bpi > 0.05 || tri > 0.05 ||
    (ndmi > 0.35 && ndwi < 0.1)) {
    anomalousDates.push(dateStr);
}
```

---

## 14. The Permian Basin Context

### 14.1 Why This Region

The Permian Basin spans approximately 75,000 square miles across West Texas and southeastern New Mexico. It is the most prolific oil-producing region in the United States, producing over 6 million barrels of oil per day and hosting over 150,000 active wells.

For every barrel of oil produced, approximately **7–10 barrels of produced water** are extracted. This water comes from ancient geologic formations and contains:
- **Total Dissolved Solids (TDS):** 50,000–300,000 mg/L (seawater is ~35,000 mg/L)
- **Sodium:** Primary cation
- **Chloride:** Primary anion
- **Barium, Strontium:** Dissolved alkaline-earth constituents that can precipitate as sulfate minerals under suitable geochemical conditions
- **Naturally Occurring Radioactive Materials (NORM):** Radium-226, Radium-228
- **Residual crude oil:** Varying concentrations

### 14.2 The Background Albedo Problem

The Permian Basin surface is dominated by **caliche** — a calcium carbonate-rich soil horizon formed by evaporation of groundwater in the arid climate. Caliche is naturally white to light tan and has high reflectance across most wavelengths. This causes several problems:

1. **Caliche is naturally high in carbonates and sulfates** (similar chemistry to some spill signatures)
2. **The bright surface inflates SWIR values** (B11, B12 are naturally elevated)
3. **Natural salt playas** (dried lake beds, evaporite pans) exist throughout the region and produce NDSI values similar to brine spills
4. **Gypsum deposits** (calcium sulfate) are common and have distinct SWIR spectral features that mimic some hydrocarbon signatures

All threshold offsets in this application (NDSI > 0.03, HCAI > 0.05, HMRI > 1.1) were derived from measuring the background reflectance values of clean, uncontaminated Permian Basin caliche at multiple sites.

### 14.3 The Texas Railroad Commission (TRRC)

The Texas Railroad Commission regulates oil and gas production in Texas and publishes incident records. Limn's historical development sample is a curated snapshot with generalized or parcel-level coordinates; it is not a traceable set of 27 independently verified point locations. Current reports therefore describe these as development records and separate them from the smaller reviewed-site subset.

### 14.4 Key Spill Locations Monitored

The application has 18 hardcoded spill bookmarks derived from TRRC records and field verification:

| Location | Coordinates | Type |
|----------|-------------|------|
| Meister Ranch Geyser | 31.35°N, 102.55°W | Large blowout event |
| FM 329 Crevice, Crane Co. | 31.2237°N, 102.7288°W | Pipeline failure |
| EOG Klondike Pit, NM | 32.24°N, 103.57°W | Evaporation pit overflow |
| Dixon Water Foundation | 31.8933°N, 101.864°W | Conservation land monitoring |
| Rocker Ranch | 31.2446°N, 101.2618°W | Historical contamination |
| Sweatt Area | 31.4804°N, 103.4239°W | Active monitoring |

---

## 15. Calibration and the False Positive Problem

### 15.1 The Two Calibration Presets

The application ships with two pre-tuned calibration configurations:

**Permian Preset (default — Arid Basin):**
```javascript
{
    bsiMask: -0.3,                  // Very permissive BSI mask (most bare soil passes)
    bsiOffset: 0.3,                 // BSI soft weight floor
    ndwiOffset: 0.5,                // Adjust for very negative NDWI baseline
    pwiSalinityOffset: 0.10,        // High salinity threshold for caliche background
    pwiHydrocarbonOffset: 0.30,     // High hydrocarbon threshold for iron-rich red soils
    pwiHmriOffset: 2.0              // High HMRI threshold (caliche naturally elevated)
}
```

**Standard Preset (Temperate/Wet environments):**
```javascript
{
    bsiMask: -0.1,
    bsiOffset: 0.0,
    ndwiOffset: 0.0,
    pwiSalinityOffset: 0.05,
    pwiHydrocarbonOffset: 0.15,
    pwiHmriOffset: 1.5
}
```

The Permian preset has substantially higher thresholds because the natural background reflectance of desert caliche elevates every component index, requiring larger offsets to clear the noise floor.

### 15.2 The Evolution of Thresholds

The threshold history illustrates the iterative calibration process:

**Original thresholds (2025):**
- NDSI offset: 0.10, HCAI offset: 0.30, HMRI offset: 2.0
- Result: **0% detection** on TRRC validation sites
- Cause: Centroid-offset bounding boxes placed pixels over mixed caliche, depressing all three indices below threshold simultaneously

**After first revision:**
- Relaxed thresholds to allow more signals through
- Result: Good detection, but **high false positive rate** (natural evaporite pans triggering)

**Current experimental thresholds (2026):**
- NDSI: 0.03, HCAI: 0.05 (×5 scale), HMRI: 1.1 (×3 scale)
- Result: **81.5% development recall and 96.7% background activation**
- Interpretation: the multiplicative AND gate did not produce a useful operating point against the tested Permian background

---

## 16. The Statistics API and Anomaly Detection

### 16.1 How the Area Scan Works

When a polygon is drawn a polygon on the map and click "Scan AOI," the application queries the **Sentinel Hub Statistics API** — a completely different endpoint from the map tiles. Instead of rendering pixels, it computes **statistical summaries** (mean, standard deviation, min, max, sample count) over the polygon for every 5-day interval in a time range.

The Statistics API payload:
```json
{
    "input": {
        "bounds": { "geometry": "<GeoJSON polygon>" },
        "data": [{
            "type": "sentinel-2-l2a",
            "dataFilter": {
                "timeRange": { "from": "2025-01-01T00:00:00Z", "to": "2026-04-01T00:00:00Z" },
                "maxCloudCoverage": 100
        }]
    },
    "aggregation": {
        "aggregationInterval": { "of": "P5D" },
        "evalscript": "<base64-encoded multi-band script>",
        "resolution": 60
    }
}
```

The `resolution: 60` setting uses 60m resolution (instead of 10m) for the statistics computation. This is a performance optimization: for area-average statistics, high spatial resolution is unnecessary and dramatically increases processing cost.

### 16.2 The Statistics Evalscript

The scan uses a special multi-output evalscript that returns multiple indices simultaneously as separate "bands":

```javascript
function setup() {
    return {
        input: ["B02","B03","B04","B08","B8A","B11","B12","dataMask"],
        output: [
            { id: "default", bands: 8 }  // 8 indices at once
        ]
    };
}
function evaluatePixel(sample) {
    return {
        default: [
            pwi_value,    // B0
            hpwi_value,   // B1
            pwoi_value,   // B2
            ndmi_value,   // B3
            ndvi_value,   // B4
            lbi_value,    // B5
            bpi_value,    // B6
            tri_value     // B7
        ]
    };
}
```

For each 5-day interval, the Statistics API returns the **mean value of each band** across all valid (cloud-free) pixels inside the polygon. This gives analysts a time series of 8 indices simultaneously.

### 16.3 Chart Visualization

The time series is displayed as a multi-line Chart.js chart. The peak detection algorithm runs pixel-level analysis: when a user hovers over a spike in the chart, it fetches a small thumbnail image of the AOI for that specific date, renders it with the relevant index evalscript, and uses image analysis to pinpoint the pixel with maximum index value.

---

## 17. Evaluation Results

The March 2026 recall-only results and July 2026 background controls must be interpreted together:

| Index | Pipeline recall | Pipeline background activation | Shipped viewer positives | Shipped viewer background | Verdict |
|---|---:|---:|---:|---:|---|
| PWCI | 81.5% | 96.7% | 0/11 | 0/150 | No useful tested operating point |
| ASAI | 77.8% | 71.3% | 0/11 | 0/150 | Best sweep point still ~53% recall / ~30% background |
| OBEC | 66.7% | 71.3% | 0/11 | 0/150 | No useful tested operating point |

**Key finding:** The permissive formulas activated on spills and background together, while the shipped formulas suppressed both. Multi-index agreement did not establish accuracy. The useful contribution is the reproducible architecture, negative result, and verified-site/QC workflow.

---

## 18. Scientific Citations

All indices in this application are grounded in published remote sensing science:

1. **Rouse, J.W. et al. (1974)** — "Monitoring vegetation systems in the Great Plains with ERTS" — *NDVI foundation paper*

2. **Huete, A.R. (1988)** — "A soil-adjusted vegetation index (SAVI)" — *Soil Science Remote Sensing* — **SAVI formula**

3. **McFeeters, S.K. (1996)** — "The use of the Normalized Difference Water Index (NDWI) in the delineation of open water features" — *Int. J. Remote Sensing* — **NDWI original paper**

4. **Gao, B.C. (1996)** — "NDWI — A normalized difference water index for remote sensing of vegetation liquid water from space" — *Remote Sensing of Environment* — **NDWI/NDMI vegetation water variant**

5. **Rock, B.N. et al. (1986)** — "Remote detection of forest damage" — *BioScience* — **MSI (Moisture Stress Index)**

6. **Metternicht, G.I. & Zinck, J.A. (2003)** — "Remote sensing of soil salinity: potentials and constraints" — *Remote Sensing of Environment* — **NDSI, soil salinity via SWIR**

7. **Kühn, F. et al. (2004)** — "Hydrocarbon Index — an algorithm for hyperspectral detection of hydrocarbons" — *Int. J. Remote Sensing* — **HCAI (Hydrocarbon Absorption Index)**

8. **Choe, E. et al. (2008)** — "Mapping of heavy metal pollution in stream sediments using combined geochemistry, field spectroscopy, and hyperspectral remote sensing" — *Remote Sensing of Environment* — **HMRI (Heavy Metal Reflectance Index)**

9. **Dekker, A.G. et al. (2001)** — "Analytical algorithms for lake water quality" — *Applied Optics* — **NDOI (optical water quality)**

10. **Unger, D. et al. (2013)** — "Mapping oilfield brine-contaminated sites with mid-spatial resolution remotely sensed data" — *Remote Sensing Letters* — **Oilfield brine contamination classification**

11. **Liang, Q. et al. (2017)** — "A MODIS-Based Novel Method to Distinguish Surface Cyanobacterial Scums and Aquatic Macrophytes in Lake Taihu" — *Remote Sensing* — **Cyanobacteria scum and macrophyte separation**

---

### Sentinel Explorer Composite Calibrations

The following are project implementations assembled for produced-water investigations. The symbols are historical catalog markers, not novelty or validation grades.

| Index | Full Name | Year |
|---|---|---|
| **ASAI ✧✧** | Arid Salinity Anomaly Index — Sentinel-2 surface-response composite (formerly PWOI / APEX) | 2026 |
| **PWCI ✧✧** | Produced-Water Contrast Index — three correlated surface contrasts (formerly PWI) | 2025 |
| **OBEC ✧** | Optical Brightness/Edge Contrast — Blue/SWIR, dual-SWIR, and surface term (formerly HPWI) | 2026 |
| **FBC ✧** | Red/Blue–Dual-SWIR–Low-Vegetation Composite | 2026 |
| **VCBI ✧** | Vegetation-Stress/Dual-SWIR Composite | 2026 |
| **LBI ✧** | Liquid/Salinity Response Index — preliminary standing-water/salinity screening | 2026 |
| **TRI ✧** | Three-Ratio Residue Composite | 2026 |
| **BPI ✧** | Bare-Pad Three-Ratio Composite | 2026 |
| **VSI ✧** | Vegetation/Dual-SWIR Stress Composite | 2026 |
| **REAI ✧** | Red-Edge/Dual-SWIR Alteration Composite | 2026 |
| **EHC ✧** | Three-Channel Surface Context Composite | 2026 |
| **AOI ✧** | Red/Blue × SWIR Surface Contrast | 2026 |
| **SCRI ✧** | SAR Surface-Contrast Index | 2026 |
| **CMA ✧** | Clay/Surface Contrast Composite | 2026 |
| **PHI ✧** | SWIR-Shoulder Surface Composite | 2026 |
| **HMI ✧** | Green–SWIR Interaction Composite | 2026 |

If referencing these indices in publications or derivative work, cite the specific Sentinel Explorer implementation and validation context rather than describing the acronym, display name, or component formula as an original invention.

---

## 19. Glossary

**AOI (Area of Interest):** A polygon drawn by the user on the map that defines the area to analyze.

**Backscatter:** In SAR, the portion of the transmitted radar pulse that returns to the satellite after reflecting off the Earth's surface. Measured in decibels (dB).

**Brine:** Highly concentrated saltwater. Produced water brine typically has 5–10× the salt concentration of seawater.

**BSI (Bare Soil Index):** Index that distinguishes bare exposed soil from vegetation-covered or water-covered surfaces. Used as a masking layer to prevent spill indices from firing over non-soil surfaces.

**Caliche:** A calcium carbonate-rich soil horizon found in arid climates. Naturally white/tan and high-reflectance across most spectral bands. The "background noise" that calibration thresholds are set to overcome.

**CDSE (Copernicus Data Space Ecosystem):** The EU/ESA platform providing free access to all Sentinel satellite data. This app authenticates via CDSE's OAuth2 service.

**C-band:** SAR frequency used by Sentinel-1 (~5.4 GHz, 5.5 cm wavelength). Penetrates thin clouds; sensitive to cm-scale surface roughness.

**Cloud Cover / MaxCC:** The percentage of a satellite image obscured by clouds. The WMS parameter `maxcc=20` means "only return images where ≤20% is cloudy."

**Composite Index:** An index formed by combining two or more simpler indices, often through multiplication (AND gate logic).

**Copernicus Programme:** EU Earth Observation programme providing free, open satellite data from the Sentinel satellite family.

**dataMask:** A flag in Sentinel Hub evalscripts indicating whether a pixel has valid satellite data (1) or is outside coverage/missing (0).

**dB (Decibels):** Logarithmic unit for SAR backscatter. `σ⁰(dB) = 10 × log₁₀(σ⁰_linear)`. Low/negative dB = low backscatter (smooth surface). High dB = high backscatter (rough surface).

**Deep Fusion:** Multi-sensor evalscripts that combine Sentinel-1 SAR and Sentinel-2 optical data in a single formula. Defined in the codebase but WMS-incompatible; requires Process API.

**Dielectric Constant:** The electrical permittivity of a material, which determines how much radar energy is reflected vs. absorbed vs. transmitted. Water (liquid) has a very high dielectric constant (~80) compared to dry soil (~3–5), causing wet surfaces to be very reflective to radar.

**Evalscript:** JavaScript code executed server-side by Sentinel Hub that transforms raw band values into display colors. The mathematical brain of each map layer.

**GRD (Ground Range Detected):** Sentinel-1 data product. Multi-looked and projected to ground range geometry. Real-valued amplitude (not complex phase). Used in this application.

**Heavy Metals:** In oilfield produced water context: barium (Ba), strontium (Sr), and naturally occurring radioactive materials (NORM) that precipitate from brine upon contact with surface conditions.

**IW Mode (Interferometric Wide Swath):** Standard Sentinel-1 acquisition mode over land. 250 km swath, 5×20 m resolution.

**L2A:** Sentinel-2 Level-2A product. Bottom-of-atmosphere (BOA) surface reflectance. Atmospherically corrected. Used by all indices in this application.

**Mosaicking:** The process of combining multiple satellite passes within a time period to fill cloud gaps and produce a seamless image.

**MSI (MultiSpectral Instrument):** The sensor on Sentinel-2 satellites. Passive push-broom design measuring reflected solar radiation in 13 spectral bands.

**NDVI:** Normalized Difference Vegetation Index. The most widely used vegetation health indicator in remote sensing. Values: -1 to +1; dense vegetation typically 0.3–0.9.

**NIR (Near-Infrared):** Wavelengths just beyond visible light (~700–1400 nm). Plants reflect NIR strongly due to cell wall structure. B08 (842 nm) is Sentinel-2's primary NIR band.

**Normalized Difference:** Mathematical form `(A-B)/(A+B)` producing values from −1 to +1. Removes illumination effects.

**NORM (Naturally Occurring Radioactive Materials):** Radium-226 and Radium-228 extracted with produced water from ancient formations. A major environmental concern in oilfield brine spills.

**OAuth2:** Authentication protocol used by CDSE. The app requests a Bearer token using client_id and client_secret credentials, which is then included in all API requests.

**Permian Basin:** Sedimentary basin in West Texas and southeastern New Mexico. Largest US oil-producing region; context for all calibration in this application.

**Produced Water:** Formation brine co-produced with oil and gas. Highly saline, contains hydrocarbons, heavy metals, and NORM. The target of detection for this entire application.

**Polarization (SAR):** The orientation of the electromagnetic wave's oscillation. VV = vertical transmit/receive (co-pol). VH = vertical transmit, horizontal receive (cross-pol).

**Process API:** Sentinel Hub API for rendering imagery programmatically. Supports multi-datasource (S1+S2 fusion) evalscripts unlike WMS. Not currently used by this app.

**Push-Broom:** Sensor design where a linear array of detectors captures an entire across-track swath simultaneously, building an image line-by-line as the satellite moves forward.

**Reflectance:** Ratio of reflected to incident energy at a given wavelength. Range 0–1. Surface reflectance (L2A) = fraction of sunlight reflected by the ground after atmospheric effects are removed.

**SAR (Synthetic Aperture Radar):** Active radar imaging system. Uses the satellite's motion to synthesize a large virtual antenna, achieving high spatial resolution from orbital altitude. Penetrates clouds; all-weather, day/night capable.

**Sentinel Hub:** Commercial processing platform for Sentinel data (part of Copernicus Data Space Ecosystem). Provides WMS/Process API for cloud-based evalscript processing.

**Sigma-nought (σ⁰):** The normalized SAR backscatter coefficient. Represents the radar cross-section of the surface per unit area.

**SLC (Single Look Complex):** Sentinel-1 complex data product preserving amplitude + phase. Required for interferometry. Not used in this application.

**Speckle:** Granular noise-like texture in SAR imagery caused by coherent interference between sub-resolution scatterers. Statistical, not random; reduced by multi-looking.

**SWIR (Shortwave Infrared):** Wavelengths 1000–2500 nm. B11 (1610 nm) and B12 (2190 nm) on Sentinel-2. Strongly interacts with liquid water, minerals, hydrocarbons, and salts — the spectral "fingerprint" region for chemical analysis.

**TOA (Top of Atmosphere):** Raw satellite reflectance including atmospheric effects. L1C product. Not used by this app (uses L2A surface reflectance instead).

**TRRC (Texas Railroad Commission):** Texas state agency regulating oil and gas. Its public records informed Limn's historical development sample; the current snapshot is not treated as an independently verified validation dataset.

**VH:** SAR cross-polarization. Vertical transmit, horizontal receive. Sensitive to volume scattering (vegetation canopy, foam). Near-zero over smooth surfaces.

**VV:** SAR co-polarization. Vertical transmit, vertical receive. Sensitive to surface roughness and dielectric constant.

**WMS (Web Map Service):** OGC standard for map tile streaming. The primary API used by this application to fetch processed satellite imagery.

---

## 20. Legacy Civic Atlas Appendix — Superseded

This appendix preserves an earlier 18-entry Civic Atlas description for traceability. It is **not the current public catalog, formula source, novelty assessment, or validation record**. Limn Atlas now organizes 91 documented methods into 24 capability families and labels each method as primary, variant, component, reference, research model, or retired. Use `src/atlas-indices.js` and `knowledge/domain/scientific-status-2026-07-20.md` for current formulas and claim boundaries.

The entries below show historical naming and design intent only. Several formulas and physical interpretations were subsequently reconciled, retired, or reframed as research workflows. They must not be quoted as shipped implementations or independent inventions.

### 1. Burnt Hillside Debris-Flow Susceptibility Index (BH-DFSI)
*   **Formula:** `max(0, 0.15 - NBR) × max(0, BSI + 0.1) × max(0, 0.35 - NDVI) × 12.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B02, B04, B08, B11, B12)
*   **Physical Basis:** Pyro-hydrological hazard triage. Steep, burned hillsides are highly vulnerable to rainfall-triggered mudslides. BH-DFSI multiplies:
    1.  *Burn Severity* (dNBR proxy via NIR B08 and SWIR2 B12): Identifies canopy carbonization and organic soil destruction.
    2.  *Bare Slope Exposure* (Bare Soil Index BSI): Ensures detection is restricted to exposed soils lacking organic mulch.
    3.  *Canopy/Root Vigor Loss* (low NDVI): Confirms the loss of root-system cohesion that previously bound the topsoil.
*   **Original Contribution & Prior Art:** The original contribution is the named packaged debris-flow triage composite and its three-gate AND design. Prior art includes NBR/dNBR (Key & Benson, 2006) and BSI (Rikimaru et al., 2002).

### 2. Phycocyanin Eutrophication Toxicity Index (PETI)
*   **Formula:** `WaterMask × NDCI × RedEdgeSlope × 8.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B03, B04, B05, B06, B11)
*   **Physical Basis:** Cyanobacteria bloom classification. Over water bodies (B03 > B11), PETI detects phycocyanin-like signatures without requiring a dedicated phycocyanin band. It utilizes:
    1.  *Chlorophyll excess* (NDCI via B05 and B04): Measures algal density.
    2.  *Red-Edge Slope* (B06 to B04 ratio): Isolates the steep slope characteristic of phycocyanin absorption near 620 nm.
*   **Original Contribution & Prior Art:** The original contribution is the virtual phycocyanin proxy workflow and gate logic. Prior art includes NDCI (Mishra & Mishra, 2012) and red-edge algal science.

### 3. Marine Plastisphere & Polymer Differentiation Index (MP-PDI)
*   **Formula:** `WaterMask × max(0, FDI) × (1.0 - NDVI) × 15.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B03, B04, B06, B08, B11)
*   **Physical Basis:** Floating marine plastic screening. Uses the Floating Debris Index (FDI) over ocean surfaces while introducing organic vegetation reject gates (1 - NDVI) to filter out Sargassum and organic foam false positives.
*   **Original Contribution & Prior Art:** The original contribution is the polymer-selective rejection-gate workflow. Prior art includes FDI (Biermann et al., 2020).

### 4. Thermokarst Thaw & Anoxic Peat Index (TT-API)
*   **Formula:** `max(0, BSI + 0.15) × max(0, NDMI) × max(0, 0.25 - B02) × 18.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B02, B04, B08, B11, B8A)
*   **Physical Basis:** Permafrost carbon risk mapping. Targets tundra edge collapse and anoxic peat expansion by multiplying bare soil exposure (BSI) with moist peat darkening (positive NDMI and low Blue B02 reflectance).
*   **Original Contribution & Prior Art:** The original contribution is the combined anoxic-peat thaw-risk synthesis. Prior art includes Arctic permafrost spectral monitoring.

### 5. Evapotranspirative Canopy & Asphalt Contrast Index (EC-ACI)
*   **Formula:** `NDBI × max(0, 0.25 - NDVI) × max(0, MSI - 0.5) × 14.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B04, B08, B11)
*   **Physical Basis:** Urban heat shelter screening. Contrasts evapotranspirative canopy presence against dry impervious exposure (asphalt/soil) via NDBI and shade/canopy deficit to identify vulnerable urban centers.
*   **Original Contribution & Prior Art:** The original contribution is the 10m shade-shelter contrast interpretation layer. Prior art includes NDBI and UHI remote sensing.

### 6. Logged Rainforest Degradation & Vigor Slope Index (LR-DVSI)
*   **Formula:** `max(0, 0.12 - NDVI) × max(0, BSI) × max(0, MSI - 0.3) × 15.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B02, B04, B08, B11)
*   **Physical Basis:** Logging track encroachment. Detects structural canopy gaps (NDVI decline), exposed soils (BSI), and canopy dehydration (MSI) to map logging corridors.
*   **Original Contribution & Prior Art:** The original contribution is the canopy-gap buffer-intrusion score. Prior art includes forest fragmentation indices.

### 7. Tailings Dam Risk & Acidification Susceptibility Index (TD-RASI)
*   **Formula:** `(B04 / B02) × max(0, BSI) × max(0, 0.3 - B12) × 12.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B02, B04, B11, B12)
*   **Physical Basis:** Acid-mine runoff monitoring. Fuses ferric iron staining (Red/Blue ratio B04/B02) with bare soil exposure (BSI) and low SWIR2 reflectance (B12) to detect acidic tailings runout paths.
*   **Original Contribution & Prior Art:** The original contribution is the acid-silt runout path emergency screening score. Prior art includes AMD mineral mapping.

### 8. Shallow-Focus Earthquake Impact Index (SFEII)
*   **Formula:** `max(0, BSI) × max(0, 0.4 - NDVI) × max(0, MSI - 0.2) × 12.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B02, B04, B08, B11)
*   **Physical Basis:** Post-seismic landslide and collapse mapping. Combines exposed soil (BSI), green canopy destruction (low NDVI), and canopy dehydration (MSI) to map debris fields.
*   **Original Contribution & Prior Art:** The original contribution is the plain-language biomass-continuity fuel score. Prior art includes co-seismic landslide mapping.

### 9. Water-Deficit Agricultural Crop Stress Index (WDA-CSI)
*   **Formula:** `max(0, MSI - 0.6) × max(0, 0.3 - NDWI) × max(0, NDVI) × 15.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B03, B04, B08, B11)
*   **Physical Basis:** Agricultural stress detection. Requiring live crops (positive NDVI), highlights severe moisture stress (MSI) combined with surface water deficit (low NDWI) to track agricultural collapse.
*   **Original Contribution & Prior Art:** The original contribution is the water-deficit crop stress triage score. Prior art includes crop drought indices.

### 10. Coal Dust & Urban Aerosol Index (CD-UAI)
*   **Formula:** `max(0, 0.22 - B02) × max(0, BSI) × max(0, 0.28 - B11) × 14.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B02, B04, B08, B11)
*   **Physical Basis:** Heavy industrial dust deposition. Tracks localized dark coal/soot deposition on bare soils by looking for strong blue absorption (low B02) and deep SWIR absorption (low B11).
*   **Original Contribution & Prior Art:** The original contribution is the blue-SWIR absorption dust proxy score. Prior art includes particulate optical remote sensing.

### 11. Coastal Sedimentation & Runoff Composite (CSRC)
*   **Formula:** `WaterMask × max(0, B03 - B04) × max(0, 0.35 - B02) × 10.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B02, B03, B04, B11)
*   **Physical Basis:** Coastal sedimentation mapping. Over water surfaces, contrasts bright green suspended sediment (B03) against blue light absorption (low B02) to map runoff plumes.
*   **Original Contribution & Prior Art:** The original contribution is the small-water runoff sedimentation triage workflow. Prior art includes ocean color turbidity algorithms.

### 12. Tundra Shrubification & Reclamation Index (TRSI)
*   **Formula:** `max(0, NDVI - 0.15) × max(0, 0.3 - B11) × max(0, B8A - B04) × 15.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B04, B08, B11, B8A)
*   **Physical Basis:** Arctic greening and brush expansion. Detects high green biomass (NDVI) coupled with damp tundra soil signatures (low SWIR1 B11 and elevated NIR/Red difference).
*   **Original Contribution & Prior Art:** The original contribution is the tundra greening/shrubification workflow. Prior art includes Arctic greening indices.

### 13. Landfill Gas & Vegetation Impact Index (LFG-VI)
*   **Formula:** `max(0, MSI - 0.4) × max(0, 0.3 - NDVI) × max(0, BSI) × 15.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B02, B04, B08, B11)
*   **Physical Basis:** Landfill boundary monitoring. Measures high soil exposure (BSI) paired with vegetation canopy stress (high MSI and depressed NDVI) around landfills.
*   **Original Contribution & Prior Art:** The original contribution is the radial landfill boundary-ring vegetation stress workflow. Prior art includes landfill boundary soil studies.

### 14. Siltation & Water Reservoirs Index (SWRI)
*   **Formula:** `WaterMask × max(0, B03 - B04) × max(0, B11) × 12.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B03, B04, B11)
*   **Physical Basis:** Reservoir siltation tracking. Over water surfaces, uses green/red sediment contrast and SWIR backscattering to isolate heavy siltation in reservoirs.
*   **Original Contribution & Prior Art:** The original contribution is the sewage/silt discharge reservoir triage model. Prior art includes suspended sediment indices.

### 15. Dam-Water Catchment Index (DWCI)
*   **Formula:** `WaterMask × max(0, 0.4 - B11) × max(0, B03) × 12.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B03, B11)
*   **Physical Basis:** Catchment capacity tracking. Measures open clean reservoir water by tracking green light reflection (B03) and deep SWIR absorption (low B11) over water.
*   **Original Contribution & Prior Art:** The original contribution is the source-water catchment capacity score. Prior art includes water body indexing.

### 16. Riparian Refuge & Flood Index (RRFI)
*   **Formula:** `max(0, NDVI) × max(0, NDWI) × max(0, B8A) × 15.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B03, B04, B08, B11, B8A)
*   **Physical Basis:** Wetlands and riparian flood corridors. Identifies healthy green riparian canopies (NDVI) that are simultaneously flooded or saturated (NDWI and NIR).
*   **Original Contribution & Prior Art:** The original contribution is the riparian refuge failure warning system. Prior art includes flood boundary remote sensing.

### 17. Estuarine Plume Dispersion Index (EPDI)
*   **Formula:** `WaterMask × max(0, B03 / B02) × max(0, 0.2 - B11) × 15.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B02, B03, B11)
*   **Physical Basis:** Estuarine sedimentation plumes. Over water, isolates bright sediment dispersion plumes using the Green/Blue ratio coupled with clean water SWIR absorption.
*   **Original Contribution & Prior Art:** The original contribution is the estuarine sediment dispersion chain triage. Prior art includes estuarine turbidity algorithms.

### 18. Heat Stress & Albedo Index (HSAI)
*   **Formula:** `max(0, B11 - 0.2) × max(0, 0.3 - NDVI) × max(0, MSI - 0.4) × 14.0`
*   **Sensor & Bands:** Sentinel-2 L2A (B04, B08, B11)
*   **Physical Basis:** Canopy heat stress vulnerability. Combines dry bare-ground exposure (B11) with canopy moisture deficit (MSI) and absence of green shade (low NDVI).
*   **Original Contribution & Prior Art:** The original contribution is the shade-shelter absence heat vulnerability model. Prior art includes albedo and canopy drought indexes.

---

## 21. Authorship Claim & Prior Art Boundary

To ensure defensible, peer-reviewed, and reputable publication in 1–2 days, the authorship boundaries for all custom composite indices are defined below:

### Project Contributions (Priority and Novelty Provisional):
1.  **Reproducible Multi-Gate Experiments:** Daniel Bally is credited as author of the project's packaged PWCI, ASAI, and OBEC implementations and their evaluation workflow. Because the gates are correlated and current controls do not separate spills from background, their conjunction is not evidence of independent confirmation or low false-positive probability.
2.  **ASAI Dry-Brine Screening Path:** Daniel Bally is credited as author of the project's dry-brine calibration and implementation. It is a useful, testable salt-crust hypothesis; literature priority and spill specificity have not been established.
3.  **Atlas Capability Documentation:** The current contribution is the explicit catalog of capability families, method roles, formulas, maturity, and limitations. Family membership and naming do not establish scientific priority or validation.
4.  **Permian Basin Calibration and Falsification Record:** The contribution is the exact threshold history, controls, and negative-result record mapped to the `permian` preset—not a validated threshold claim.

### Established Prior Art and Non-Claims:
1.  **Individual Spectral Bands:** Sentinel-2's 13 spectral bands and their physical properties are ESA intellectual property.
2.  **Established Band Ratios:** This composite does not assert the invention of standard ratios like NDVI, SAVI, NDWI, NDMI, or BSI.
3.  **Copernicus Satellite Infrastructure:** Sentinel satellites are operated by the European Space Agency.
4.  **Atmospheric Correction Sen2Cor:** The sen2cor algorithm belongs to its respective developers.

---

*Legacy guide compiled 2026-05-24 and scientifically superseded on 2026-07-20. Current produced-water and Atlas status is maintained in `knowledge/domain/scientific-status-2026-07-20.md`; historical Civic Atlas bookmarks were context sites, not validation events.*
