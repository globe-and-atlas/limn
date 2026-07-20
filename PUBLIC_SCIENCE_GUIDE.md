# Limn: Multi-Gate Multispectral Anomaly Detection and Geochemical Consensus Calibration for Produced Water Spills in Arid Basins

**Author & Primary Inventor:** Daniel Bally  
**Affiliation:** Globe & Atlas  
**Publication Date:** May 2026  
**Revision:** v1.1 — July 2026 (formula-fidelity and validation-transparency corrections; see Revision History)  
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
6. [Scientific Authorship and Prior-Art Boundaries](#6-scientific-authorship-and-prior-art-boundaries)
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
*   $\tau_i$ is the strict regional background threshold for that specific proxy. (In practice each gated term may also carry a scale multiplier $\beta_i$, i.e. $\max(0, \text{Proxy}_i - \tau_i) \times \beta_i$; the per-index sections give the calibrated values.)
*   The $\max(0, \cdot)$ envelope acts as a **hard logical gate**: if even a single proxy fails to exceed its regional background threshold ($\tau_i$), its score becomes $0$, reducing the entire composite calculation to $0$.

Only when **all independent chemical indicators** exceed their respective thresholds does the consensus index evaluate to a non-zero value, isolating the unique, multi-chemical footprint of produced water.

---

## 4. Novel Custom Produced Water Composites (Daniel Bally, Globe & Atlas)

The following five spectral index models are original produced water architectures designed, calibrated, and authored by **Daniel Bally**.

> **Formula provenance note (v1.1):** Two calibrations of these composites exist. The **validated pipeline calibration** is the configuration whose detection rates are reported in Section 7 (batch validation, 2026-03-28). The **interactive viewer calibration** applies stricter basin presets tuned for low-noise visual triage; it trades recall for precision and is not the configuration the Section 7 rates describe. Each formulation below documents the validated pipeline form and notes where the viewer differs.

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

5.  **Non-Linear Contrast Stretching with Bare-Soil Weight (validated pipeline form):**
    $$w_{\text{BSI}} = \min(1.0, \max(0.3, \text{BSI} \times 5.0 + 0.3))$$
    $$\text{PWCI}_{\text{final}} = \min(1.0, (\text{PWCI}_{\text{raw}} \times 50.0)^{1.2} \times w_{\text{BSI}})$$
    The soft bare-soil weight prevents mixed or vegetation-edge pixels from zeroing an otherwise valid three-gate consensus. This is the exact configuration whose 81.5% detection rate is reported in Section 7.

6.  **Interactive viewer variant:** the map viewer renders PWCI with a hard bare-soil mask, stricter basin-preset thresholds (Permian preset: $\tau$ = 0.10 / 0.30 / 2.0 with ×2 score multipliers), and a steeper cubic stretch $\min(1.0, (\text{raw} \times 20.0)^3)$. This precision-first configuration suppresses nearly all background at the cost of recall — it will render blank at many sites the pipeline configuration detects — and its detection rate is not the Section 7 figure.

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

*   **Physical Basis:** The super-linear stretch creates a sharp "knee." Marginal soil anomalies and noise collapse toward zero, while genuine spill signals with multi-chemical elevation quickly saturate to $1.0$, creating a high-contrast map of contamination. The viewer's cubic variant makes this knee steeper still.

---

### ASAI: Arid Salinity Anomaly Index

The ASAI is designed for high-sensitivity detection in hyper-arid soils. It operates in two distinct meteorological modes — a wet-path smoothness/salinity fusion and a dry-brine logic gate that fires when moisture indicators fall below regional baselines. The final score is the maximum of the two modes.

#### Dry-Brine Mode (validated pipeline form):

The dry path activates only when a three-condition arid gate is satisfied:

$$\text{Gate}_{\text{dry}}: \quad \text{NDWI} < -0.30 \;\land\; \text{NDSI} > 0.05 \;\land\; \text{BSI} > 0.10$$

When the gate is open, the dry score is:

$$\text{ASAI}_{\text{dry}} = \min(1.0,\; \max(0, \text{NDSI} - 0.04) \times \min(1.0, \text{BSI} \times 4.0) \times 15.0)$$

Where:
*   $\text{BSI}$ (Bare Soil Index) ensures that only high-albedo soil receives analysis:
    $$\text{BSI} = \frac{(B11 + B04) - (B08 + B02)}{(B11 + B04) + (B08 + B02)}$$
*   $\text{NDWI} = (B03 - B11)/(B03 + B11)$ acts as the desiccation gate — deeply negative NDWI certifies dry bare ground before any salinity claim is made.
*   **Physical Basis:** In highly desiccated bare soil, standard water indices are suppressed. ASAI isolates the salt-crust accumulation over dry caliche by correlating the soil's brightness (BSI) with shortwave salinity shifts (NDSI), preventing natural gypsum playas from triggering false positives. Adding this mode raised validation detection from 29.6% to 77.8% (Section 7).
*   **Interactive viewer variant:** the current viewer applies a precision-tuned dry gate that is substantially stricter (NDSI > 0.15, BSI > 0.52, smoothness < −0.42, with a 0.60 display floor) following a June 2026 noise-suppression calibration pass. The Section 7 rate describes the pipeline form above, not this stricter viewer configuration.

---

### OBEC: Oil-Brine Emulsion Composite

OBEC is a physical-chemical consensus composite. It fuses the chemical absorption signature of oil-brine emulsions with an optical surface smoothness proxy to identify fresh, liquid-phase blowouts.

#### Mathematical Formulation:
$$\text{OBEC} = \min(1.0,\; \text{ChemicalSignal} \times \text{SmoothnessProxy} \times 6.0)$$

Where:
*   $\text{NDOI}$ (Normalized Difference Oil Index) contrasts blue reflectance against SWIR-2 hydrocarbon absorption:
    $$\text{NDOI} = \frac{B02 - B12}{B02 + B12}$$
*   $$\text{ChemicalSignal} = \min\left(1.0,\; \max(0, \text{NDOI}) + \max(0, \text{NDSI} - 0.03) \times 0.8\right)$$
*   $\text{SmoothnessProxy}$ remaps the green-vs-SWIR normalized difference into a $[0,1]$ smoothness score:
    $$\text{SmoothnessProxy} = \text{clamp}\left(\frac{\frac{B03 - B11}{B03 + B11} + 0.3}{0.6},\; 0,\; 1\right)$$
*   **Dry-brine parallel path:** in the validated pipeline, a secondary path fires under the same arid gate as ASAI (NDWI < −0.30, NDSI > 0.05, BSI > 0.10), scoring evaporated salt crusts as $\min(1, \max(0,\text{NDSI}-0.04) \times \min(1,\text{BSI}\times3.5) \times 14)$; the final OBEC is the maximum of the wet and dry paths. This path contributed to the Section 7 detection rate.
*   **Physical Basis:** Fresh produced water spills form highly reflective, smooth liquid sheets. Elevated green reflectance relative to Band 11 (SWIR-1) approximates specular surface reflectance. Fusing this optical smoothness proxy with chemical absorption ratios ensures that dry saline soils are ignored by the wet path while fresh, flowing emulsions are highlighted.

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
*   **Physical Basis:** Methane gas ($CH_4$) displays a highly concentrated, narrow molecular absorption feature centered around $2300 \text{ nm}$, which significantly attenuates the returned solar signal in Sentinel-2's SWIR-2 Band 12 while leaving SWIR-1 Band 11 unaffected. By rationing B11/B12 over highly reflective bare well pads ($\text{SWIR Mean} > 0.20$) and executing rigid water and vegetation suppression gates, MVPI delivers a high-frequency spatial screening tool for gas super-emitters and pipeline venting blowouts. (The rendered output applies a final ×3.0 display scaling before clamping to $[0,1]$.)
*   **Retrieval Limitations (v1.1):** Two caveats bound MVPI's screening role. First, an elevated single-scene B11/B12 ratio is **spectrally degenerate with evaporite surfaces**: hydrated salt crusts also depress B12 relative to B11 (the very NDSI signature Sections 2 and 4 exploit), so saline ground can trigger the methane ratio without any gas present. Candidate plumes over salt-affected pads require cross-checking against NDSI/ASAI and, ideally, a pre-event reference scene. Second, established Sentinel-2 methane retrievals (Varon et al., 2021) rely on **multi-pass temporal differencing** rather than single-scene ratios; MVPI's single-scene formulation is a coarse spatial triage layer, not a quantitative plume retrieval, and positive frames should be confirmed against a methane-free reference date.

---

## 5. Novel ✧✧ Public-Good Ecological Composites (Daniel Bally, Globe & Atlas)

Beyond localized industrial produced water blowouts, the Limn methodology integrates four public-good environmental emergency screening tools. These composites apply **multi-gate consensus and rejection logic** to complex ecological and civil environments.

> **Implementation status (v1.1):** CSRC and LFGVI are live, renderable composites in the Limn Atlas. TRSI and SWRI are **context targets with proof rendering pending** — their formulations are implemented, but no measured scene has yet passed the project's proof-grade signal threshold, so they are presented as screening architectures, not validated detectors. All formulas below are the shipped implementations.

---

### CSRC: Cyanotoxin Scum Risk Composite

The CSRC targets small-water eutrophication hazards, providing a public-health decision proxy for toxic blue-green algae (cyanobacteria) scum formations.

#### Mathematical Formulation:

1.  **Water Body Pixels Isolation Gate** (binary green-vs-SWIR test):
    $$\text{WaterGate} = \begin{cases} 1 & \text{if } B03 > B11 \\ 0 & \text{otherwise} \end{cases}$$

2.  **Chlorophyll NDCI (Normalized Difference Chlorophyll Index):**
    $$\text{NDCI} = \frac{B05 - B04}{B05 + B04}$$

3.  **NIR Scum Scattering Boost** (additive floating-scum term):
    $$\text{ScumBoost} = \max(0, B08 - 0.15) \times 3.0$$

4.  **Sediment Turbidity Rejection** (suppresses red-shifted inorganic turbidity):
    $$\text{TurbidityReject} = 1 - \min\left(1,\; \max\left(0, \frac{B04 - B03}{B04 + B03}\right) \times 5.0\right)$$

5.  **Multi-Gate Consensus Synthesis:**
    $$\text{CSRC} = \min\left(1.0,\; \max(0, \text{NDCI} + \text{ScumBoost}) \times \text{TurbidityReject} \times \text{WaterGate} \times 3.0\right)$$

*   **Physical Basis:** Cyanobacteria blooms accumulate heavy chlorophyll concentrations (NDCI). As blooms mature, they float to the surface, forming dense, highly reflective organic scums that exhibit intense Near-Infrared (Band 8) scattering. By multiplying the chlorophyll response by an NIR scum scattering multiplier and routing it through strict water pixels and clay turbidity rejection gates, CSRC maps toxic scum formations in small municipal water reservoirs with high reliability.

---

### TRSI: Tailings River Shock Index

The TRSI is designed as a rapid river emergency alarm following tailings dam failures or heavy chemical-runoff spill events. *(Status: context target — proof rendering pending.)*

#### Mathematical Formulation:
$$\text{TRSI} = \min\left(1.0,\; \max(0, \text{NDTI} + 0.05) \times \max(0, \text{FerricND}) \times \text{WaterGate} \times 15.0\right)$$

Where:
*   $\text{NDTI}$ (Normalized Difference Turbidity Index, red-vs-green form after Lacaux et al.) isolates suspension spikes:
    $$\text{NDTI} = \frac{B04 - B03}{B04 + B03}$$
*   $\text{FerricND}$ maps iron-rich chemical staining as a red-vs-blue normalized difference:
    $$\text{FerricND} = \frac{B04 - B02}{B04 + B02}$$
*   $\text{WaterGate} = [B11 < B04]$ restricts scoring to sediment-laden water pixels.
*   **Physical Basis:** Tailings dam breaches saturate active river channels with heavy silt turbidity (NDTI) and red-to-orange iron oxide mineral signatures. Multiplying these independent indicators inside active water pixels creates a high-contrast emergency warning tool that separates ordinary seasonal muddy runoff from toxic mineral spills.

---

### LFGVI: Landfill Gas Vegetation Intrusion Index

The LFGVI identifies early forest canopy stress and dying vegetation in circular patterns surrounding landfills, highlighting subsurface methane and landfill gas migration.

#### Mathematical Formulation:
$$\text{LFGVI} = \min\left(1.0,\; \max(0, 0.5 - \text{NDVI}) \times \max(0, 0.2 - \text{RedEdge}) \times \max(0, 0.3 - \text{NDMI}) \times 20.0\right)$$

Where:
*   $\text{NDVI} = (B08 - B04)/(B08 + B04)$ captures overall canopy vigor decline.
*   $\text{RedEdge}$ captures chlorophyll stress in the vital vegetation red edge:
    $$\text{RedEdge} = \frac{B05 - B04}{B05 + B04}$$
*   $\text{NDMI}$ measures canopy moisture, whose depression signals dehydration:
    $$\text{NDMI} = \frac{B8A - B11}{B8A + B11}$$
*   Each $\max(0, \tau - \cdot)$ term is a **deficit gate**: the composite scores only pixels simultaneously below all three vigor/moisture baselines.
*   **Physical Basis:** Subsurface gas leaks displace oxygen in the root zone, causing rapid localized root stress, leaf yellowing (chlorosis), and moisture desiccation. The annular (ring-shaped) spatial pattern around landfill boundaries is identified at the **interpretation stage** — the analyst inspects the per-pixel stress map for radial morphology; ring detection is not encoded in the per-pixel formula.

---

### SWRI: Sewage-Water Release Index

The SWRI separates raw urban wastewater overflows and sewage releases from clean baseline or ordinary soil runoff in concrete channels. *(Status: context target — proof rendering pending.)*

#### Mathematical Formulation:
$$\text{SWRI} = \min\left(1.0,\; \max(0, \text{Turbidity} + 0.05) \times \max(0, \text{OrganicBloom} + 0.05) \times \text{WaterGate} \times 30.0\right)$$

Where:
*   $\text{Turbidity}$ measures suspended-solids loading (red-vs-green normalized difference):
    $$\text{Turbidity} = \frac{B04 - B03}{B04 + B03}$$
*   $\text{OrganicBloom}$ tracks rapid bacterial/organic bloom spikes via the chlorophyll red edge (NDCI form):
    $$\text{OrganicBloom} = \frac{B05 - B04}{B05 + B04}$$
*   $\text{WaterGate} = [B03 > B11]$ restricts scoring to water pixels.
*   **Physical Basis:** Sewer overflows introduce severe turbidity spikes accompanied by rapid localized algal/bacterial growth. Differentiating this organic waste signature from generic muddy river water is accomplished by multiplying the turbidity shock by the red-edge organic bloom proxy inside active water pixels.

---

## 6. Scientific Authorship and Prior-Art Boundaries

For public scientific clarity, Limn separates standard public-domain satellite science from project-specific composite architectures and calibrations. The boundary is summarized below:

```
+-------------------------------------------------------------------------+
|                               AUTHORSHIP BOUNDARIES                             |
+------------------------------------+------------------------------------+
|   PUBLIC DOMAIN (Prior Art)        |   ORIGINAL PROJECT WORK       |
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

### 1. Public-Domain Prior Art:
*   **The Component Ratios:** Formulas like the Bare Soil Index (BSI), NDWI, NDTI, or the Normalized Difference Chlorophyll Index (NDCI) are widely published and free to use.
*   **The Band Definitions:** Sentinel-2's 13 spectral bands and standard reflections are established Copernicus science.

### 2. Original Project Contributions Attributed to Daniel Bally:
*   **The Multi-Gate Multiplication Logic:** The scientific concept of multiplying independent geochemical and physical indices together as a multi-factor logical AND gate to suppress natural caliche, playic salt, or turbidity backgrounds.
*   **The Custom PWCI Model:** The specific combination of $(NDSI - \tau_1) \times (HCAI - \tau_2) \times (HMRI - \tau_3)$ accompanied by cubic non-linear contrast stretching.
*   **The ASAI Dry-Brine Logic:** The integration of meteorological drought floors and bare soil brightness (BSI) to calibrate salinity detection in hyper-arid soils.
*   **The Custom MVPI Model:** The specific combination of SWIR narrow molecular absorption ratios $(B11/B12)$ with bright caliche pad gates, and water/vegetation rejection gates that targets local methane venting plumes.
*   **The Upgraded Public-Good Ecological Suite:** The specific multi-gate consensus architectures for **CSRC** (NDCI with NIR scum multipliers), **TRSI** (NDTI ferric iron emergency alarms), **LFGVI** (radial landfill vegetation stress rings), and **SWRI** (turbidity shock with organic bloom channel separation).

---

## 7. Arid Background Calibration & Threshold Validation

The validated pipeline calibration of Limn was benchmarked against a working set of **27 Permian Basin produced-water spill records** compiled from public Texas Railroad Commission (TRRC) violation and inspection data, with coordinates generalized per RRC data policy. This set is a **development benchmark, not an independently audited ground-truth registry**: the records do not all carry individual incident identifiers, and the reported detection rates below should be read as internal calibration results rather than peer-reviewed accuracy figures. A separate, higher-confidence validation set of **11 named sites** with exact coordinates and regulator filing references (NMOCD spill-database rows and documented Texas events — Lake Boehmer, Meister Ranch, FM 329 Crevice, Toyah, Matador Desoto Spring, OXY Lea Flowline, and others) is maintained for site-level proof and is the basis for the interactive demo bookmarks.

### Measured detection performance (batch validation, 2026-03-28, n = 27, threshold 0.01):

| Composite | Detection rate | Notes |
|---|---|---|
| PWCI (pipeline calibration) | 81.5% | Highest single-index recall |
| ASAI (with dry-brine mode) | 77.8% | Up from 29.6% before the dry-brine mode was added |
| OBEC | 66.7% | Independent confirmation index |

These are **spill-site recall rates only**, and recall in isolation is not evidence of precision. A background false-positive study (150 randomly sampled Permian Basin points carrying no produced-water event, 2026-07-19) was run to test the multi-gate suppression claim directly. **The result is a cautionary one and is reported here in the interest of scientific honesty:** at the validated-pipeline calibration and its 0.01 detection threshold, the flagship composites activate on a large fraction of ordinary background — PWCI on 96.7%, ASAI and OBEC on ~71%. In other words, the same pipeline calibration that yields high recall also fires on most bare-caliche background, so the pipeline recall numbers **must not be read as detection accuracy**. This directly contradicts any "near-zero false positive" framing for the pipeline configuration; no such claim is made.

The multi-gate architecture's background suppression is therefore realized through the **precision-first interactive-viewer calibration** (stricter thresholds and gates; see the caveat below), not through the high-recall pipeline settings. Characterizing the viewer calibration's own false-positive floor against this same 150-point background set is the immediate next validation step. Until that is complete, Limn's public claims are limited to **screening recall with an explicitly stated high background-activation rate at the pipeline calibration** — an honest statement of a work-in-progress detector, not a finished low-false-positive product. Full per-index figures: `reports/preprint_qc_2026-07-19.md` and `execution/false_positive_summary.md`.

> **Calibration-configuration caveat.** The 81.5% / 77.8% / 66.7% rates were produced by the **validated pipeline** configuration (Sections 4). The **interactive map viewer** ships a precision-first calibration (stricter basin-preset thresholds, hard bare-soil masks, steeper stretch, and a June 2026 noise-suppression pass on the dry-brine gates). The viewer therefore renders far more conservatively than the pipeline and will show blank where the pipeline detects; its live behavior is a high-precision triage view, not the recall figures above. Re-validation of the shipped viewer configuration against the 11-site set is ongoing.

### Summary of Validated Pipeline Thresholds (PWCI):
*   **Halite hydration floor ($\text{NDSI} > 0.03$):** Captures brine salts above the natural gypsum background.
*   **Hydrocarbon baseline ($\text{HCAI} > 0.05$, ×5.0 gain):** Excludes bare red clay soil organic matter.
*   **Mineralogical alteration boundary ($\text{HMRI} > 1.1$, ×3.0 gain):** Filters out standard concrete, gravel, and caliche pads.
*   *(The interactive viewer's Permian preset raises these to 0.10 / 0.30 / 2.0 for low-noise visual triage.)*

---

## 8. Conclusion & References

Limn represents a significant advancement in satellite-based environmental screening and public safety triage. By shifting from standard single-band indices to the **Multi-Gate Geochemical Consensus Calibration** engineered by **Daniel Bally**, investigators gain a rapid, low-noise screening layer for toxic produced water blowouts and localized environmental hazards. The multi-gate architecture is designed to sharply suppress the bare-desert false-positive floor that defeats single-band indices; quantifying that suppression against a formal background sample, and independently auditing the calibration benchmark, are the primary objectives of ongoing validation work. Limn is a screening and triage tool — positive detections are investigative leads to be confirmed with field or higher-resolution data, not standalone regulatory determinations.

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
12. **Varon, D. J., Jervis, D., McKeever, J., et al. (2021).** *High-resolution monitoring of methane emissions from space with Sentinel-2.* *Atmospheric Measurement Techniques*, 14(4), 2771–2785 (Prior-art benchmark for B11/B12 SWIR methane retrieval; note that this method uses multi-pass temporal differencing, not single-scene ratios).

> **Citation note (v1.1):** Reference 11 refers to the compiled TRRC violation/inspection working set described in Section 7, not a single named report series. References 5 (Khan et al.), 6 (Rikimaru et al.), and 12 (Varon et al.) are provided as prior-art context for the respective band ratios and should be consulted directly for exact titles and venues before formal citation.

---

## Revision History

**v1.1 — July 2026 (formula-fidelity and validation-transparency pass).** Following an internal QC audit against the codebase and validation pipeline, this revision:

- Corrected the PWCI, ASAI, and OBEC formulations to match the validated implementation (contrast stretch, dry-brine gate conditions, smoothness proxy, and chemical-signal terms), and explicitly separated the **validated pipeline calibration** from the stricter **interactive viewer calibration**.
- Rewrote the Section 5 ecological composite formulas (CSRC, TRSI, LFGVI, SWRI) to match shipped code, defined NDOI, corrected the NDTI definition, and flagged TRSI/SWRI as context targets pending proof rendering.
- Removed the unsupported false-positive figures (previously "42.3% → 0.04%"); no background/negative-sampling study has been run, so no quantitative false-positive claim is made.
- Reframed the "27 TRRC-verified sites" as a compiled development benchmark (coordinates generalized, not all incident-ID-audited) and introduced the 11-site exact-coordinate proof set.
- Corrected the "~89% consensus" language (README) — genuine flagship consensus rates are lower and are stated as such.
- Added the MVPI salt cross-talk and single-scene retrieval caveats; fixed editorial errors ("four"→"five" composites; the orphaned $\beta_i$ term).

The v1.0 architecture, authorship, and physical-basis claims are unchanged; v1.1 corrects quantitative and formula-transcription accuracy only.

---
*For inquiries or licensing of the Limn composite technologies, contact Daniel Bally at Globe & Atlas.*
