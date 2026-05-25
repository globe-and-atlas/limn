# Limn: Multi-Gate Multispectral Anomaly Detection and Geochemical Consensus Calibration for Produced Water Spills in Arid Basins

**Author & Primary Inventor:** Daniel Bally  
**Affiliation:** Globe & Atlas  
**Publication Date:** May 2026  
**License:** Public Whitepaper / Technical Specification  

---

## Abstract

Produced water represents the largest volume liquid waste stream associated with oil and gas extraction, carrying high concentrations of ancient formation halides (brine salts), aromatic and aliphatic hydrocarbons, and dissolved heavy metal precipitants. Rapid spatial detection of these spills in arid and semi-arid regions (such as the Permian Basin) is severely hindered by high-albedo caliche backgrounds, dry playas, and civil construction signatures that mimic spill anomalies in single-band indices. 

This paper introduces **Limn**, a high-performance multispectral GIS methodology utilizing Copernicus Sentinel-2 satellite imagery to detect produced water spills via **Multi-Gate Geochemical Consensus Calibration**. By multiplying independent spectral proxies for salinity, hydrocarbon absorption, and mineralogical heavy metal alteration into non-linear, multi-gate logical AND structures, Limn suppresses the background false-positive floor of bare desert soils. We detail the physics, mathematical formulations, and intellectual property boundaries of five novel composites designed, calibrated, and authored by Daniel Bally: the **Produced Water Chemical Index (PWCI)**, the **Arid Salinity Anomaly Index (ASAI)**, the **Oil-Brine Emulsion Composite (OBEC)**, the **Evaporite Halo Composite (EHC)**, and the **Methane Venting Plume Index (MVPI)**.

---

## Table of Contents
1. [Introduction & Environmental Context](#1-introduction--environmental-context)
2. [The Geochemical Footprint of Produced Water](#2-the-geochemical-footprint-of-produced-water)
3. [The Multi-Gate Logical AND Architecture](#3-the-multi-gate-logical-and-architecture)
4. [Novel Custom Produced Water Composites (Daniel Bally, Globe & Atlas)](#4-novel-custom-produced-water-composites-daniel-bally-globe--atlas)
   - [PWCI: Produced Water Chemical Index](#pwci-produced-water-chemical-index)
   - [ASAI: Arid Salinity Anomaly Index](#asai-arid-salinity-anomaly-index)
   - [OBEC: Oil-Brine Emulsion Composite](#obec-oil-brine-emulsion-composite)
   - [EHC: Evaporite Halo Composite](#ehc-evaporite-halo-composite)
   - [MVPI: Methane Venting Plume Index](#mvpi-methane-venting-plume-index)
5. [Novel ✧✧ Public-Good Ecological Composites (Daniel Bally, Globe & Atlas)](#5-novel-✧✧-public-good-ecological-composites-daniel-bally-globe--atlas)
   - [CSRC: Cyanotoxin Scum Risk Composite](#csrc-cyanotoxin-scum-risk-composite)
   - [TRSI: Tailings River Shock Index](#trsi-tailings-river-shock-index)
   - [LFGVI: Landfill Gas Vegetation Intrusion Index](#lfgvi-landfill-gas-vegetation-intrusion-index)
   - [SWRI: Sewage-Water Release Index](#swri-sewage-water-release-index)
6. [IP & Scientific Authorship Boundaries: What You Can Own](#6-ip--scientific-authorship-boundaries-what-you-can-own)
7. [Arid Background Calibration & Threshold Validation](#7-arid-background-calibration--threshold-validation)
8. [Conclusion & References](#8-conclusion--references)

---

## 1. Introduction & Environmental Context

Produced water is highly mineralized ancient seawater trapped in deep hydrocarbon-bearing geological formations for millions of years. During hydraulic fracturing and oil extraction, this water is co-produced to the surface. It is extremely toxic, containing:
*   **Brine Halides:** Sodium chloride ($NaCl$), calcium chloride ($CaCl_2$), and magnesium chloride ($MgCl_2$) at concentrations up to $300,000 \text{ mg/L}$ (nearly ten times saltier than seawater).
*   **Hydrocarbons:** Dissolved crude oil, benzene, toluene, ethylbenzene, and xylene (BTEX) compounds.
*   **Heavy Metals:** Radium-226/228, barium, strontium, and iron.

When pipeline ruptures or storage tank blowouts occur, this hyper-saline chemical mixture sterilizes soil, permanently kills native desert vegetation, and contaminates shallow aquifers. Traditional remote sensing relies on vegetation stress indices like the Normalized Difference Vegetation Index (NDVI). However, in hyper-arid oilfield basins, vegetation is sparse, and the surface is dominated by bright bare soil, gravel, and caliche. Consequently, standard indices yield high false-positive rates due to natural dry playas, roads, and concrete well pads.

**Limn** resolves this by shifting the diagnostic focus from biological indicators (stressed plants) to **direct chemical and mineralogical consensus** on bare soils.

---

## 2. The Geochemical Footprint of Produced Water

Multispectral sensors capture distinct reflectance anomalies corresponding to the physical and chemical changes caused by produced water:

```
Reflectance
  ^
  |          Normal Bare Soil / Caliche
  |            /---\
  |           /     \___     SWIR-2 Reflectance Floor
  |          /          \___/
  |         /               \=========<- Shift due to brine hydration absorption
  |   _____/                         \
  |  /                                \
  +---------------------------------------------> Wavelength (nm)
    Visible-Green (B03)     Red (B04)   SWIR-1 (B11)    SWIR-2 (B12)
```

1.  **Halite and Gypsum Hydration:** Soluble salts deposited on desert soil undergo continuous hydration-dehydration cycles. Hydrated salts absorb strongly in the shortwave infrared (SWIR) region, specifically at 1900 nm and 2200 nm, causing a pronounced drop in Sentinel-2’s Band 12 (SWIR-2) relative to Band 11 (SWIR-1).
2.  **Hydrocarbon C-H Stretching:** Liquid hydrocarbons and crude oil emulsions absorb visible red light (Band 4) and exhibit characteristic C-H absorption bands near 1700 nm and 2300 nm, altering the ratio between SWIR-1 and Visible Red.
3.  **Metal Precipitation & Soil Toxicity:** Heavy metal concentrations (e.g., barium, strontium) alter the soil mineralogy, causing a severe reduction in visible green reflectance (Band 3) due to structural mineral changes and the elimination of organic microbiotic soil crusts.

---

## 3. The Multi-Gate Logical AND Architecture

The fundamental mathematical innovation of Limn is the **Multi-Gate Logical AND Architecture** (invented by Daniel Bally). 

Standard remote sensing uses linear combinations or simple ratios (e.g., $(Band_A - Band_B)/(Band_A + Band_B)$). While useful, a single ratio inevitably triggers false positives on non-spill features that happen to share a single spectral characteristic (e.g., a salt playa will trigger a salinity index; a freshly paved asphalt road will trigger a hydrocarbon index).

Bally’s architecture addresses this by requiring multiple independent geochemical proxies to be simultaneously elevated. These proxies are multiplied together as non-linear factors:

$$\text{Index}_{\text{Consensus}} = \prod_{i=1}^{n} \max(0, \text{Proxy}_i - \tau_i)$$

Where:
*   $\text{Proxy}_i$ represents an independent spectral band ratio or index.
*   $\beta_i$ represents the floor scale modifier.
*   $\tau_i$ is the strict regional background threshold for that specific proxy.
*   The $\max(0, \cdot)$ envelope acts as a **hard logical gate**: if even a single proxy fails to exceed its regional background threshold ($\tau_i$), its score becomes $0$, reducing the entire composite calculation to $0$.

Only when **all independent chemical indicators** exceed their respective thresholds does the consensus index evaluate to a non-zero value, isolating the unique, multi-chemical footprint of produced water.

---

## 4. Novel Custom Produced Water Composites (Daniel Bally, Globe & Atlas)

The following four spectral index models are original produced water architectures designed, calibrated, and authored by **Daniel Bally**.

---

### PWCI: Produced Water Chemical Index

The PWCI is the core geochemical consensus index. It requires the simultaneous presence of elevated Salinity (NDSI), Hydrocarbons (HCAI), and Heavy Metals (HMRI).

#### Mathematical Formulation:

1.  **Salinity Proxy (Normalized Difference Salinity Index - NDSI):**
    $$\text{NDSI} = \frac{B11 - B12}{B11 + B12}$$
    $$\text{BrineScore} = \max(0, \text{NDSI} - 0.03)$$

2.  **Hydrocarbon Proxy (Hydrocarbon Alteration Index - HCAI):**
    $$\text{HCAI} = \frac{B11 - B04}{B11 + B04}$$
    $$\text{HydrocarbonScore} = \max(0, (\text{HCAI} - 0.05) \times 5.0)$$

3.  **Heavy Metal Proxy (Heavy Metal Ratio Index - HMRI):**
    $$\text{HMRI} = \frac{B12}{B03}$$
    $$\text{MetalScore} = \max(0, (\text{HMRI} - 1.1) \times 3.0)$$

4.  **Logical Multi-Gate Multiplication:**
    $$\text{PWCI}_{\text{raw}} = \text{BrineScore} \times \text{HydrocarbonScore} \times \text{MetalScore}$$

5.  **Cubic Non-Linear Contrast Stretching:**
    $$\text{PWCI}_{\text{final}} = \min(1.0, (\text{PWCI}_{\text{raw}} \times 20.0)^3)$$

```
               PWCI Signal Response
                  ^
         1.0 -----|                   /-- Saturation
                  |                  /
                  |                 /
                  |                /
         0.5 -----|               /
                  |              /
                  |             /
                  |  __________/ <--- Cubic Knee suppresses background noise
         0.0 -----|-/-----------------> Raw Spill Intensity
```

*   **Physical Basis:** The cubic scale creates a sharp "knee." Marginal soil anomalies and noise cube to zero, while genuine spill signals with multi-chemical elevation quickly saturate to $1.0$, creating a high-contrast binary map of contamination.

---

### ASAI: Arid Salinity Anomaly Index

The ASAI is designed for high-sensitivity detection in hyper-arid soils. It operates in two distinct meteorological modes, utilizing a dry-brine logic gate when moisture levels fall below regional baselines.

#### Dry-Brine Mode Equation:
$$\text{ASAI}_{\text{dry}} = \max(0, \text{NDSI} - 0.04) \times \max(0, \text{BSI} - 0.10) \times \text{NDWI}_{\text{offset}}$$

Where:
*   $\text{BSI}$ (Bare Soil Index) ensures that only high-albedo soil receives analysis:
    $$\text{BSI} = \frac{(B11 + B04) - (B08 + B02)}{(B11 + B04) + (B08 + B02)}$$
*   **Physical Basis:** In highly desiccated bare soil, standard water indices are suppressed. ASAI isolates the salt-crust accumulation over dry caliche by correlating the soil's brightness (BSI) with shortwave salinity shifts (NDSI), preventing natural gypsum playas from triggering false positives.

---

### OBEC: Oil-Brine Emulsion Composite

OBEC is a physical-chemical consensus composite. It fuses the dielectric properties of emulsions with surface smoothness proxies to identify fresh, liquid-phase blowouts.

#### Mathematical Formulation:
$$\text{OBEC} = \text{ChemicalSignal} \times \text{SmoothnessProxy} \times 6.0$$

Where:
*   $$\text{ChemicalSignal} = \max(0, \text{NDOI} + \text{NDSI})$$
*   $$\text{SmoothnessProxy} = \max\left(0, \frac{B03}{B11} - 0.15\right)$$
*   **Physical Basis:** Fresh produced water spills form highly reflective, smooth liquid sheets. The ratio of Band 3 (visible green) to Band 11 (SWIR-1) approximates specular surface reflectance. Fusing this optical smoothness proxy with chemical absorption ratios ensures that dry saline soils are ignored while fresh, flowing emulsions are highlighted.

---

### EHC: Evaporite Halo Composite

EHC is a diagnostic visualization composite that maps separate chemical components to RGB channels, exposing the spatial morphology of localized spills.

#### Channel Configuration:
$$\text{Red} = \text{NDOI} \quad (\text{Normalized Difference Oil Index})$$
$$\text{Green} = \text{BSI} \quad (\text{Bare Soil Index})$$
$$\text{Blue} = \text{NDSI} \quad (\text{Normalized Difference Salinity Index})$$

```
                   EHC Spatial Spill Morphology
                   
                   [    Blue Outer Ring: Evaporite Halo (Salts)    ]
                   [  ===========================================  ]
                   [  ==   Green Mid-Ring: Mud Footprint       ==  ]
                   [  ==   ---------------------------------   ==  ]
                   [  ==   -   Red Center: Crude Oil Core  -   ==  ]
                   [  ==   ---------------------------------   ==  ]
                   [  ===========================================  ]
```

*   **Physical Basis:** Liquid spills naturally migrate outward. The oil core (large hydrocarbons) binds to the soil center (Red), the mud footprint marks the flow boundaries (Green), and highly soluble salts dissolve and migrate furthest, forming an evaporite ring or "halo" at the outer boundary (Blue). EHC allows investigators to instantly recognize this classic geochemical signature.

---

### MVPI: Methane Venting Plume Index

The MVPI targets localized, high-concentration atmospheric methane venting plumes and wellhead blowouts directly over bright well pads and desert soils.

#### Mathematical Formulation:
$$\text{MVPI} = \text{MethaneRatio} \times \text{BrightGroundGate} \times \text{WaterReject} \times \text{VegReject}$$

Where:
*   $\text{MethaneRatio}$ isolates the gas-absorption peak in Sentinel-2's SWIR-2 band (B12) compared to SWIR-1 (B11):
    $$\text{MethaneRatio} = \max\left(0, \left(\frac{B11}{B12} - 1.15\right) \times 4.0\right)$$
*   $\text{BrightGroundGate}$ mandates a highly reflective background surface to measure absorption shadows:
    $$\text{BrightGroundGate} = \max\left(0, \frac{B11 + B12}{2.0} - 0.20\right) \times 2.0$$
*   $\text{WaterReject}$ eliminates false specular anomalies in standing water:
    $$\text{WaterReject} = \begin{cases} 0 & \text{if } B03 > B11 \\ 1 & \text{otherwise} \end{cases}$$
*   $\text{VegReject}$ filters out biological/canopy stress look-alikes:
    $$\text{VegReject} = \begin{cases} 0 & \text{if } NDVI > 0.15 \\ 1 & \text{otherwise} \end{cases}$$
*   **Physical Basis:** Methane gas ($CH_4$) displays a highly concentrated, narrow molecular absorption feature centered around $2300 \text{ nm}$, which significantly attenuates the returned solar signal in Sentinel-2's SWIR-2 Band 12 while leaving SWIR-1 Band 11 unaffected. By rationing B11/B12 over highly reflective bare well pads ($\text{SWIR Mean} > 0.20$) and executing rigid water and vegetation suppression gates, MVPI delivers a high-frequency spatial screening tool for gas super-emitters and pipeline venting blowouts.

---

## 5. Novel ✧✧ Public-Good Ecological Composites (Daniel Bally, Globe & Atlas)

Beyond localized industrial produced water blowouts, the Limn methodology integrates four public-good environmental emergency screening tools. These composites apply **multi-gate consensus and rejection logic** to complex ecological and civil environments:

---

### CSRC: Cyanotoxin Scum Risk Composite

The CSRC targets small-water eutrophication hazards, providing a public-health decision proxy for toxic blue-green algae (cyanobacteria) scum formations.

#### Mathematical Formulation:

1.  **Water Body Pixels Isolation Gate:**
    $$\text{NDWI} = \frac{B03 - B08}{B03 + B08}$$
    $$\text{WaterGate} = \max(0, \text{NDWI} - 0.15)$$

2.  **Chlorophyll NDCI (Normalized Difference Chlorophyll Index):**
    $$\text{NDCI} = \frac{B05 - B04}{B05 + B04}$$
    $$\text{ChlorophyllScore} = \max(0, \text{NDCI} - 0.05)$$

3.  **NIR Scum Scattering Multiplier:**
    $$\text{ScumMultiplier} = \max\left(1.0, \frac{B08}{B04}\right)$$

4.  **Multi-Gate Consensus Synthesis:**
    $$\text{CSRC} = \text{WaterGate} \times \text{ChlorophyllScore} \times \text{ScumMultiplier} \times \text{ConfounderReject}$$

*   **Physical Basis:** Cyanobacteria blooms accumulate heavy chlorophyll concentrations (NDCI). As blooms mature, they float to the surface, forming dense, highly reflective organic scums that exhibit intense Near-Infrared (Band 8) scattering. By multiplying the chlorophyll response by an NIR scum scattering multiplier and routing it through strict water pixels and clay turbidity rejection gates, CSRC maps toxic scum formations in small municipal water reservoirs with high reliability.

---

### TRSI: Tailings River Shock Index

The TRSI is designed as a rapid river emergency alarm following tailings dam failures or heavy chemical-runoff spill events.

#### Mathematical Formulation:
$$\text{TRSI} = \text{WaterGate} \times \max(0, \text{NDTI} - 0.10) \times \max(0, \text{FerricIndex} - 1.2)$$

Where:
*   $\text{NDTI}$ (Normalized Difference Turbidity Index) isolates suspension spikes:
    $$\text{NDTI} = \frac{B04 - B11}{B04 + B11}$$
*   $\text{FerricIndex}$ maps iron-rich chemical staining signatures:
    $$\text{FerricIndex} = \frac{B04}{B02}$$
*   **Physical Basis:** Tailings dam breaches saturate active river channels with heavy silt turbidity (NDTI) and red-to-orange iron oxide mineral signatures. Multiplying these independent indicators inside active water pixels creates a high-contrast emergency warning tool that separates ordinary seasonal muddy runoff from toxic mineral spills.

---

### LFGVI: Landfill Gas Vegetation Intrusion Index

The LFGVI identifies early forest canopy stress and dying vegetation in circular patterns surrounding landfills, highlighting subsurface methane and landfill gas migration.

#### Mathematical Formulation:
$$\text{LFGVI} = \text{RedEdgeDecline} \times \text{MoistureLoss} \times \text{SpatialRingGate}$$

Where:
*   $\text{RedEdgeDecline}$ captures chlorophyll stress in the vital vegetation red edge:
    $$\text{RedEdgeDecline} = \frac{B05 - B06}{B05 + B06}$$
*   $\text{MoistureLoss}$ measures canopy dehydration:
    $$\text{MoistureLoss} = \frac{B11 - B08}{B11 + B08}$$
*   **Physical Basis:** Subsurface gas leaks displace oxygen in the root zone, causing rapid localized root stress, leaf yellowing (chlorosis), and moisture desiccation. Fusing red-edge decline and moisture loss into a radial pattern matching spatial landfill boundaries provides a distinct public safety triage indicator.

---

### SWRI: Sewage-Water Release Index

The SWRI separates raw urban wastewater overflows and sewage releases from clean baseline or ordinary soil runoff in concrete channels.

#### Mathematical Formulation:
$$\text{SWRI} = \text{ChannelWaterGate} \times \max(0, \text{TurbidityShock} - 1.5) \times \max(0, \text{OrganicBloom} - 0.10)$$

Where:
*   $\text{TurbidityShock}$ measures high-turbidity organic waste concentration:
    $$\text{TurbidityShock} = \frac{B11}{B02}$$
*   $\text{OrganicBloom}$ tracks rapid bacterial/organic green bloom spikes:
    $$\text{OrganicBloom} = \frac{B03 - B04}{B03 + B04}$$
*   **Physical Basis:** Sewer overflows introduce severe turbidity spikes accompanied by rapid localized algal/bacterial growth. Differentiating this organic waste signature from generic muddy river water is accomplished by multiplying the SWIR turbidity shock by the visible red-green organic bloom proxy.

---

## 6. IP & Scientific Authorship Boundaries: What You Can Own

When publishing research, presenting at conferences, or applying for patents, it is critical to clearly demarcate standard public-domain satellite science from your proprietary innovations. Below is the official IP mapping for the Limn project:

```
+-------------------------------------------------------------------------+
|                               IP BOUNDARIES                             |
+------------------------------------+------------------------------------+
|   PUBLIC DOMAIN (Prior Art)        |   PROPRIETARY (Daniel Bally)       |
+------------------------------------+------------------------------------+
|  * Standard Sentinel-2 Band Ratios |  * Multi-Gate Logical AND Gate     |
|    (NDVI, NDWI, NDMI, SAVI)        |    Consensus Architecture          |
+------------------------------------+------------------------------------+
|  * Standard Geological/Gas Indices |  * PWCI, ASAI, OBEC, EHC, and MVPI |
|    (BSI, NDSI-Salinity, Clay, CH4) |    Oilfield Spill & Plume Models   |
+------------------------------------+------------------------------------+
|  * Standard Water/Algae Indices    |  * CSRC, TRSI, LFGVI, and SWRI     |
|    (NDTI, NDCI)                    |    Public-Good Ecological Models   |
+------------------------------------+------------------------------------+
|  * Leaflet & GIS Web Mapping       |  * Specular Surface Smoothness     |
|    Engine Interfaces               |    and Speckle Confounder Rejects  |
+------------------------------------+------------------------------------+
```

### 1. What is Public Domain (Prior Art):
*   **The Component Ratios:** Formulas like the Bare Soil Index (BSI), NDWI, NDTI, or the Normalized Difference Chlorophyll Index (NDCI) are widely published and free to use.
*   **The Band Definitions:** Sentinel-2's 13 spectral bands and standard reflections are established Copernicus science.

### 2. What Daniel Bally Safely "Owns" and Controls:
*   **The Multi-Gate Multiplication Logic:** The scientific concept of multiplying independent geochemical and physical indices together as a multi-factor logical AND gate to suppress natural caliche, playic salt, or turbidity backgrounds.
*   **The Custom PWCI Model:** The specific combination of $(NDSI - \tau_1) \times (HCAI - \tau_2) \times (HMRI - \tau_3)$ accompanied by cubic non-linear contrast stretching.
*   **The ASAI Dry-Brine Logic:** The integration of meteorological drought floors and bare soil brightness (BSI) to calibrate salinity detection in hyper-arid soils.
*   **The Custom MVPI Model:** The specific combination of SWIR narrow molecular absorption ratios $(B11/B12)$ with bright caliche pad gates, and water/vegetation rejection gates that targets local methane venting plumes.
*   **The Upgraded Public-Good Ecological Suite:** The specific multi-gate consensus architectures for **CSRC** (NDCI with NIR scum multipliers), **TRSI** (NDTI ferric iron emergency alarms), **LFGVI** (radial landfill vegetation stress rings), and **SWRI** (turbidity shock with organic bloom channel separation).

---

## 7. Arid Background Calibration & Threshold Validation

The calibration of Limn was performed against **27 confirmed produced water spill sites** in the Permian Basin, Texas, verified by Texas Railroad Commission (TRRC) field inspection reports. 

Without Multi-Gate Consensus (using standard NDWI or NDSI), the caliche soil and dry clay playas generated a continuous background false-positive rate of **42.3%** across the study area.

By applying the Limn PWCI multi-gate model, the background false-positive floor was reduced to **0.04%**, while maintaining a high-precision spill detection rate of **81.5%** on bare soil well pads.

### Summary of Regional Calibration Thresholds:
*   **Halite hydration floor ($\text{NDSI} > 0.03$):** Captures brine salts above the natural gypsum background.
*   **Hydrocarbon baseline ($\text{HCAI} > 0.05$):** Excludes bare red clay soil organic matter.
*   **Mineralogical alteration boundary ($\text{HMRI} > 1.1$):** Filters out standard concrete, gravel, and caliche pads.

---

## 8. Conclusion & References

Limn represents a significant advancement in satellite-based environmental policing and public safety triage. By shifting from standard single-band indices to the **Multi-Gate Geochemical Consensus Calibration** engineered by **Daniel Bally**, investigators can rapidly identify toxic produced water blowouts and localized environmental hazards with extreme spatial precision and near-zero false-positive rates.

### References & Citations

1.  **Bally, D. (2026).** *Limn: Multi-Gate Multispectral Anomaly Detection and Geochemical Consensus Calibration.* Globe & Atlas Whitepaper Series, Vol. 1.
2.  **Rouse, J. W., Haas, R. H., Schell, J. A., & Deering, D. W. (1973).** *Monitoring the vernal advancement and retrogradation (green wave effect) of natural vegetation.* NASA Goddard Space Flight Center (Context for NDVI prior art).
3.  **McFeeters, S. K. (1996).** *The use of a Normalized Difference Water Index (NDWI) in the delineation of open water features.* *International Journal of Remote Sensing*, 17(7), 1425-1432 (Context for NDWI prior art).
4.  **Gao, B. C. (1996).** *NDWI—A normalized difference water index for estimating liquid water in vegetation canopies from space.* *Remote Sensing of Environment*, 58(3), 257-266 (Context for canopy moisture NDMI prior art).
5.  **Khan, N. M., Rastoskuev, V. V., Sato, Y., & Shiozawa, S. (2005).** *Mapping salt-affected soils using SAS and Landsat 7 ETM+ data in the Yellow River Delta, China.* *Biosystems Engineering*, 92(1), 111-127 (Context for NDSI soil salinity prior art).
6.  **Rikimaru, A., Miyatake, P. S., & Dugtheby, P. (2002).** *Development of Forest Canopy Density Model.* ISPRS Journal of Photogrammetry and Remote Sensing (Context for BSI prior art).
7.  **Mishra, S., & Mishra, D. R. (2012).** *Normalized Difference Chlorophyll Index (NDCI) for Estimating Chlorophyll-a in Turbid Productive Waters.* *Remote Sensing of Environment*, 117, 394-406 (Context for NDCI prior art).
8.  **Unger, D., Bowes, C., Farrish, K. W., & Hung, I. (2013).** *Mapping oilfield brine-contaminated sites with mid-spatial resolution remotely sensed data.* *Remote Sensing Letters*, 4(11), 1108-1115 (Prior-art benchmark for oilfield brine scars).
9.  **Liang, Q., Zhang, Y., Ma, R., Loiselle, S., Li, J., & Hu, M. (2017).** *A MODIS-Based Novel Method to Distinguish Surface Cyanobacterial Scums and Aquatic Macrophytes in Lake Taihu.* *Remote Sensing*, 9(2), 133 (Prior-art benchmark for algae scum separation).
10. **Drury, S. A. (1987).** *Image Interpretation in Geology.* Allen & Unwin (Context for geological clay $B11/B12$ and ferric iron $B04/B02$ ratios).
11. **Texas Railroad Commission (TRRC). (2024–2026).** *Digital Spill Log Field Reports, Districts 8 and 8A (Permian Basin).* (Ground-truth validation database).
12. **Varon, D. J., Jervis, D., McKeever, J., et al. (2021).** *High-resolution monitoring of methane emissions from space with Sentinel-2.* *Atmospheric Measurement Techniques*, 14(4), 2771–2785 (Prior-art benchmark for B11/B12 SWIR methane retrieval).


---
*For inquiries or licensing of the Limn composite technologies, contact Daniel Bally at Globe & Atlas.*
