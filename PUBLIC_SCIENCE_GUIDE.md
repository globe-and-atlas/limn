# Multi-Gate Spectral Consensus for Produced-Water Screening in Arid Basins: Architecture, a Verified-Site Program, and the Limits of Sentinel-2 Detection

**Author & Primary Inventor:** Daniel Bally  
**Affiliation:** Globe & Atlas  
**Publication Date:** May 2026 · **Revision:** v2.0 — July 2026  
**Paper type:** Methodology and negative-result study  
**License:** Public Whitepaper / Technical Specification  

---

## Abstract

Produced water represents the largest volume liquid waste stream associated with oil and gas extraction, carrying high concentrations of ancient formation halides (brine salts), aromatic and aliphatic hydrocarbons, and dissolved heavy metal precipitants. Rapid spatial detection of these spills in arid and semi-arid regions (such as the Permian Basin) is severely hindered by high-albedo caliche backgrounds, dry playas, and civil construction signatures that mimic spill anomalies in single-band indices. 

This paper presents **Limn**, a multispectral methodology built on Copernicus Sentinel-2 imagery that pursues produced-water screening via **Multi-Gate Geochemical Consensus** — multiplying spectral proxies for salinity, hydrocarbon-related contrast, and mineralogical response into non-linear logical-AND structures intended to suppress the bare-desert false-positive floor that defeats single-band indices. We contribute three things. **First**, the multi-gate consensus architecture as a reproducible design pattern for arid-terrain anomaly screening. **Second**, a disciplined verified-site program: documented produced-water events with regulator filing references and exact coordinates, suitable as a public evaluation substrate. **Third**, and central to this revision, a **rigorous negative result**: under a full threshold sweep (1,224 gate configurations and per-index recall-vs-false-positive frontiers on a 32-record spill set and 150 background points), *no* configuration of these Sentinel-2 spectral composites separates produced water from Permian caliche at a usable operating point. We also report a **narrowly positive result**: evaluated per pixel with its shipped evalscript, the Liquid Brine Index is brine-specific (0 of 149 caliche and 0 of 3 freshwater controls activate; standing brine does, including an independent recycling-pond hit; brine-vs-caliche Youden's J = 0.50), making it a promising specific screening candidate for standing brine bodies at small positive N. The composites and their implementation are documented in full; the honest conclusion is that Limn is an **experimental screening methodology and a demonstration of a spectral limit** for diffuse produced-water detection — not a validated diffuse-spill detector — with standing-brine screening as its one surviving positive avenue.

---

## Contributions, Scope & Limitations (read first)

This is a **methodology and negative-result paper**, revised in July 2026 after an internal audit and a full validation study corrected the original (May 2026) draft. Readers should hold the following in view throughout:

**What this paper contributes:**

1. **A design pattern** — multi-gate geochemical consensus (logical-AND of independent spectral proxies) for suppressing false positives in arid anomaly screening (Section 3).
2. **A verified-site program** — produced-water events with regulator filing references and exact coordinates, a reusable public validation substrate (Section 7).
3. **A rigorous, reproducible negative result** — a full threshold sweep showing that these Sentinel-2 composites do not separate produced water from Permian caliche at any operating point (Section 7).
4. **A narrowly positive result** — evaluated per pixel with its shipped evalscript, the Liquid Brine Index is brine-specific (0 of 149 caliche and 0 of 3 freshwater controls activate; standing brine does, J = 0.50 vs caliche). It is a promising specific standing-brine screening candidate at small positive N — the one discriminating index in the suite (Section 7).

**What this paper does NOT claim:**

- It does **not** claim a validated produced-water detector. The flagship composites (PWCI, ASAI, OBEC) do not discriminate at a usable recall/false-positive point; any positive is an investigative lead only.
- It makes **no** quantitative accuracy or false-positive-suppression claim beyond the measured figures in Section 7, which are calibration diagnostics.
- The negative result is **bounded**: it concerns these S2 spectral composites at a 500 m single-scene reflectance scale over the Permian Basin. It does not speak to higher-resolution, multi-temporal, SAR, or hyperspectral methods, which remain open.

**Prior art vs. original work:** the component band ratios (NDVI, NDWI, NDMI, NDSI, BSI, SAVI, NDCI, NDTI, NDOI, clay/ferric ratios) are established literature, correctly implemented but not novel. The original contributions are the consensus *architecture*, the calibration study, the verified-site program, and the negative result — not the individual ratios. Full boundaries in Section 6.

---

## Table of Contents
1. [Introduction & Environmental Context](#1-introduction--environmental-context)
2. [The Geochemical Footprint of Produced Water](#2-the-geochemical-footprint-of-produced-water)
3. [The Multi-Gate Logical AND Architecture](#3-the-multi-gate-logical-and-architecture)
4. [Project-Specific Produced-Water Screening Composites](#4-project-specific-produced-water-screening-composites)
   - [PWCI: Produced Water Chemical Index](#pwci-produced-water-chemical-index)
   - [ASAI: Arid Salinity Anomaly Index](#asai-arid-salinity-anomaly-index)
   - [OBEC: Oil-Brine Emulsion Composite](#obec-oil-brine-emulsion-composite)
   - [EHC: Evaporite Halo Composite](#ehc-evaporite-halo-composite)
   - [MVPI: Methane Venting Plume Index](#mvpi-methane-venting-plume-index)
5. [Atlas-Linked Public-Good Screening Methods](#5-atlas-linked-public-good-screening-methods)
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

Only when all configured proxy gates exceed their thresholds does the consensus index evaluate to a non-zero value. The gates reuse correlated surface reflectance and do not isolate a unique produced-water chemical footprint in the current evaluation.

---

## 4. Project-Specific Produced-Water Screening Composites

The following spectral architectures were implemented and calibrated for Limn by **Daniel Bally**. The individual ratios derive from established remote-sensing practice; literature priority for the packaged formulas is not asserted here.

> **Formula provenance note (v2.0):** Two calibrations of these composites exist. The **development-pipeline calibration** is the configuration whose recall and background-activation rates are reported in Section 7. The **interactive viewer calibration** applies stricter basin presets and is the formula rendered by the app. Neither is validated. Each formulation below identifies which configuration it describes.

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

5.  **Non-Linear Contrast Stretching with Bare-Soil Weight (development-pipeline form):**
    $$w_{\text{BSI}} = \min(1.0, \max(0.3, \text{BSI} \times 5.0 + 0.3))$$
    $$\text{PWCI}_{\text{final}} = \min(1.0, (\text{PWCI}_{\text{raw}} \times 50.0)^{1.2} \times w_{\text{BSI}})$$
    The soft bare-soil weight prevents mixed or vegetation-edge pixels from zeroing the three-gate score. This is the exact configuration whose 81.5% development recall—and 96.7% background activation—is reported in Section 7.

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

*   **Implementation behavior:** The super-linear stretch creates a sharp "knee." Marginal composite scores collapse toward zero while larger scores saturate toward $1.0$. This changes display contrast; it does not establish that a high score is genuine contamination. The viewer's cubic variant makes the knee steeper still.

---

### ASAI: Arid Salinity Anomaly Index

The ASAI is designed for high-sensitivity detection in hyper-arid soils. It operates in two distinct meteorological modes — a wet-path smoothness/salinity fusion and a dry-brine logic gate that fires when moisture indicators fall below regional baselines. The final score is the maximum of the two modes.

#### Dry-Brine Mode (development-pipeline form):

The dry path activates only when a three-condition arid gate is satisfied:

$$\text{Gate}_{\text{dry}}: \quad \text{NDWI} < -0.30 \;\land\; \text{NDSI} > 0.05 \;\land\; \text{BSI} > 0.10$$

When the gate is open, the dry score is:

$$\text{ASAI}_{\text{dry}} = \min(1.0,\; \max(0, \text{NDSI} - 0.04) \times \min(1.0, \text{BSI} \times 4.0) \times 15.0)$$

Where:
*   $\text{BSI}$ (Bare Soil Index) ensures that only high-albedo soil receives analysis:
    $$\text{BSI} = \frac{(B11 + B04) - (B08 + B02)}{(B11 + B04) + (B08 + B02)}$$
*   $\text{NDWI} = (B03 - B11)/(B03 + B11)$ acts as the desiccation gate — deeply negative NDWI certifies dry bare ground before any salinity claim is made.
*   **Screening hypothesis:** In highly desiccated bare soil, standard water indices are suppressed. ASAI combines brightness (BSI) with a shortwave salinity proxy (NDSI) to screen for salt-crust-like response. Adding this mode raised development recall from 29.6% to 77.8%, but background activation was 71.3%; it did not prevent natural-background false positives (Section 7).
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
*   **Historical development-only dry path:** the evaluation pipeline also tested a secondary ASAI-like arid path: $\min(1, \max(0,\text{NDSI}-0.04) \times \min(1,\text{BSI}\times3.5) \times 14)$. It contributed to the 66.7% development recall and 71.3% background activation. The shipped OBEC evalscript does **not** contain this path.
*   **Screening hypothesis:** Green-vs-SWIR contrast can respond to smooth or wet surfaces, and NDOI/NDSI-like ratios can respond to surface material differences. Their product is an optical anomaly proxy, not an oil/brine-emulsion or chemical retrieval.

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

## 5. Atlas-Linked Public-Good Screening Methods

Beyond localized industrial produced-water screening, four historical examples connect this preprint to the broader Limn Atlas research catalog. They illustrate how multi-gate and rejection logic can be specified for other environmental questions; they are not additional evidence for the produced-water results and are not claimed here as four independent scientific inventions.

> **Atlas v2 status:** CSRC is a live **variant** in the *Aquatic Blooms & Pigments* family; LFGVI is a live **component feature** in *Landfill Surface Context*; TRSI and SWRI are non-live **research models** in *Water Condition & Plumes*. Atlas family and method-role labels govern their public interpretation. None has reached independent V1 evaluation, and this section does not transfer Limn's produced-water evidence to them.

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

The development-pipeline calibration of Limn was benchmarked against a working set of **27 Permian Basin produced-water spill records** compiled from public Texas Railroad Commission (TRRC) violation and inspection data, with coordinates generalized per RRC data policy. This set is a **development benchmark, not an independently audited ground-truth registry**: the records do not all carry individual incident identifiers, and the reported detection rates below are internal calibration results rather than peer-reviewed accuracy figures. A separate review set of **11 named sites** with exact coordinates and regulator filing references is the basis for the interactive demo bookmarks; it is an evaluation set, not proof of detection.

### Measured detection performance (batch validation, 2026-03-28, n = 27, threshold 0.01):

| Composite | Detection rate | Notes |
|---|---|---|
| PWCI (development pipeline) | 81.5% | Recall-only; background activation was 96.7% |
| ASAI (with dry-brine mode) | 77.8% | Recall-only; background activation was 71.3% |
| OBEC | 66.7% | Recall-only; background activation was 71.3% |

These are **spill-site recall rates only**, and recall in isolation is not evidence of precision. A background false-positive study (150 randomly sampled Permian Basin points carrying no produced-water event, 2026-07-19) was run against **both** shipped calibrations to test the multi-gate suppression claim directly. **The results are reported here in full in the interest of scientific honesty, and they show that neither calibration is yet a working discriminating detector:**

| | Spill-site recall | Background false-positive rate |
|---|---|---|
| **Development-pipeline calibration** | PWCI 81.5% / ASAI 77.8% / OBEC 66.7% | PWCI **96.7%** / ASAI **71.3%** / OBEC **71.3%** |
| **Interactive-viewer calibration** | ≈0 (renders blank at all 11 exact-coordinate verified spill sites) | PWCI **0.0%** / ASAI **0.0%** / OBEC **0.0%** |

The two calibrations fail in opposite directions. The **pipeline** calibration reaches high recall but fires on almost all bare-caliche background (PWCI's median background score is 1.0 — maximum), so its recall must not be read as accuracy. The **viewer** calibration produces essentially zero background false positives, but it achieves that by firing on almost nothing at all: its strict triple-gate (notably HMRI > 2.0, which even the metal-rich caliche median only just reaches) plus a cubic contrast stretch drives the rendered score to zero on every one of the 150 background points — and, per the site-level QC, on every one of the 11 real verified spill sites too.

To test whether this is merely a tuning problem — a discriminating calibration waiting between the two extremes — a full threshold sweep was run (2026-07-20): PWCI's three internal gates were swept across 1,224 combinations, and every composite's continuous score was traced across all detection thresholds, measuring spill recall (32-record TRRC set) against background false-positive rate (150 points) **at each fixed threshold**. The result is decisive and negative:

- **PWCI does not separate produced water from Permian caliche at any threshold.** Its best recall-minus-false-positive operating point is ~19% recall at ~9% false positives; its continuous score is effectively saturated (Youden's J ≈ 0.00 — recall and false-positive rate rise together). The high pipeline "recall" was an artifact of firing on ~97% of background.
- **No other composite reaches a usable operating point either.** The best separation found was ASAI at ~53% recall / ~30% false positives — still far from a deployable detector.

**A per-pixel (spatial) check.** Because the box-mean discards localized structure — a small bright spill feature can be visible in the rendered map yet invisible in a 500 m average — the shipped viewer PWCI was also evaluated per pixel: for each site, the fraction of pixels that render (coverage) and the brightest pixel. This confirms rather than reverses the finding. Bright PWCI pixels do occur, but they appear at **12% of background sites versus only 6% of spill sites** (best spatial Youden's J = 0.03). The visual differences PWCI shows in-app are therefore real pixels but **not spill-specific** — they arise on ordinary caliche at least as often as at spills, the per-pixel face of the same false-positive behavior. The negative result holds at native resolution (`reports/pwci_spatial_test_2026-07-20.md`).

The honest conclusion is therefore stronger than "not yet tuned": for these Sentinel-2 spectral composites — whether read as a 500 m regional mean or per pixel — **no configuration delivers simultaneous useful recall and low false-positive rate**. The multi-gate architecture is a sound design principle (Section 3), but these particular bands at this scale do not carry enough separating signal to realize it against the Permian caliche background. This is a bounded negative result — it does not rule out higher-resolution, multi-temporal, SAR, or hyperspectral approaches — but it is the truthful current status. Accordingly this release makes **no detection-accuracy or false-positive claim**; Limn is presented as an experimental screening methodology and an investigative-lead tool, not a validated detector. Full method and figures: `reports/threshold_sweep_2026-07-20.md`, `reports/preprint_qc_2026-07-19.md`, and the `execution/*_false_positive_summary.md` artifacts.

### Where a real response survives: the Liquid Brine Index on standing water

The negative result concerns *diffuse produced-water spills on bare soil* — the hard problem where chemical consensus was supposed to help and does not. It does **not** condemn every index equally. The **Liquid Brine Index (LBI)** behaves differently, and — evaluated correctly — is the one genuinely discriminating index in the suite.

An important methodological correction underlies this. A first pass evaluated LBI as a 500 m box mean and found brine/freshwater overlap (mean 0.062 vs 0.044). That method is invalid for water bodies: a 500 m mean mixes a small pond with surrounding land, driving NDWI negative and disabling LBI's own water gates, and it used a batch approximation lacking the shipped index's standing-water bypass. Re-run with the **actual shipped evalscript, per pixel** (coverage = fraction of pixels that render at LBI ≥ 0.08), the picture changes:

- **Specificity is clean.** LBI renders on **0 of 149** bare-caliche controls and **0 of 3** freshwater reservoirs at the >1% coverage bar. It does not fire on ordinary fresh water (Balmorhea Lake and Lake Colorado City both zero), so it is **brine-specific, not a generic water detector**.
- **It responds to standing brine.** 2 of 4 documented standing-brine sites render, including a strong, independent (non-calibration) hit at the Matador Desoto recycling pond (14.6% coverage). The two non-responding sites are geyser pools whose standing water was plausibly absent in the queried scene.
- **Brine vs. caliche: Youden's J = 0.50** — the only clean separation obtained anywhere in this study.

The positive sample is small (four sites), so this is a validation of *response and specificity*, not a large-sample accuracy estimate; LBI is best described as a **promising, specific screening candidate for standing brine bodies** (evaporation and recycling ponds, brine lakes, large blowout pools) — a spectrally distinct and tractable target — pending a larger labeled positive set. It says nothing about diffuse spills, which remain the negative result above. Full detail: `reports/lbi_brine_validation_2026-07-20.md`.

> **Calibration-configuration caveat.** The 81.5% / 77.8% / 66.7% rates were produced by the **development-pipeline** configuration (Sections 4). The **interactive map viewer** ships a stricter calibration (higher basin-preset thresholds, hard bare-soil masks, steeper stretch, and a June 2026 noise-suppression pass on the dry-brine gates). It renders blank at all 11 reviewed positive sites as well as all 150 controls. Neither configuration is a validated detector.

### Summary of Development-Pipeline Thresholds (PWCI):
*   **NDSI floor ($\text{NDSI} > 0.03$):** Admits positive shortwave-ratio response; not a direct halite measurement.
*   **HCAI floor ($\text{HCAI} > 0.05$, ×5.0 gain):** Admits positive SWIR/red contrast; not a hydrocarbon retrieval.
*   **HMRI floor ($\text{HMRI} > 1.1$, ×3.0 gain):** Admits a high SWIR-2/green ratio; not a heavy-metal retrieval.
*   *(The interactive viewer's Permian preset raises these to 0.10 / 0.30 / 2.0 for low-noise visual triage.)*

---

## 8. Conclusion & References

Limn proposes a design principle — **Multi-Gate Geochemical Consensus Calibration** — for shifting produced-water screening away from single-band indices toward multi-chemical consensus on bare arid soils. The architecture (Section 3) is sound in principle: requiring simultaneous salinity, hydrocarbon, and mineralogical elevation is the right way to attack the bare-desert false-positive floor.

Honesty about where the work stands, however, is essential. As Section 7 documents, a full threshold sweep shows this is not a tuning problem to be solved with better thresholds: across the entire configuration space, these Sentinel-2 composites do not separate produced water from Permian caliche at a usable operating point — PWCI shows essentially zero separation, and the best index reaches only ~53% recall at ~30% false positives. The multi-gate principle is sound, but **these particular spectral bands, at a 500 m single-scene sampling scale, do not carry enough separating signal** to realize it here. That is a bounded, honest negative result — it says nothing against higher-resolution, multi-temporal, SAR, or hyperspectral methods, which are the natural next avenues. Accordingly Limn is presented as an **experimental screening methodology and investigative-lead tool**, not a validated detector: any positive is a lead to be confirmed with field or higher-resolution data, never a standalone determination, and the quantitative figures here are calibration diagnostics, not accuracy claims.

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

**v2.0 — July 2026 (repositioned as a methodology / negative-result paper).** After a background false-positive study and a full threshold sweep, the evidence showed that no configuration of these Sentinel-2 composites discriminates produced water from Permian caliche at a usable operating point. This revision:

- Retitled and re-abstracted the paper as a methodology and negative-result study; added a front-matter **Contributions, Scope & Limitations** section.
- Added the threshold-sweep verdict to Section 7 (PWCI Youden's J ≈ 0.00; best composite ASAI ~53% recall / ~30% FP) and the measured false-positive floors (pipeline PWCI 96.7%; viewer ~0% but blank at real sites too).
- Validated LBI (small N) as a specific standing-brine screening candidate via a **per-pixel** test with the shipped evalscript, correcting an earlier box-mean pass whose brine/freshwater "overlap" was an artifact of averaging small water bodies over 500 m (which drives NDWI negative and disables the water gates). Corrected result: 0 of 149 caliche and 0 of 3 freshwater controls activate; standing brine does (independent recycling-pond hit); brine-vs-caliche Youden's J = 0.50. Retained the Liquid Brine Index name.
- Corrected an internal threshold-mismatch error (the earlier "LBI 63% recall at 1.3% FP" paired two different thresholds).
- Repositioned all claims: no validated detector, no accuracy or false-positive-suppression claim; contributions are the architecture, the verified-site program, and the negative result.

**v1.1 — July 2026 (formula-fidelity and validation-transparency pass).** Following an internal QC audit against the codebase and validation pipeline, this revision:

- Corrected the PWCI, ASAI, and OBEC formulations to match the development implementation (contrast stretch, dry-brine gate conditions, smoothness proxy, and chemical-signal terms), and explicitly separated the **development pipeline calibration** from the stricter **interactive viewer calibration**.
- Rewrote the Section 5 ecological composite formulas (CSRC, TRSI, LFGVI, SWRI) to match shipped code, defined NDOI, corrected the NDTI definition, and flagged TRSI/SWRI as context targets pending proof rendering.
- Removed the unsupported false-positive figures then in circulation (previously "42.3% → 0.04%"); the later July background study supplies the measured rates now reported in v2.0.
- Reframed the "27 TRRC-verified sites" as a compiled development benchmark (coordinates generalized, not all incident-ID-audited) and introduced the 11-site exact-coordinate proof set.
- Corrected the "~89% consensus" language (README) — genuine flagship consensus rates are lower and are stated as such.
- Added the MVPI salt cross-talk and single-scene retrieval caveats; fixed editorial errors ("four"→"five" composites; the orphaned $\beta_i$ term).

The v1.0 architecture, authorship, and physical-basis claims are unchanged; v1.1 corrects quantitative and formula-transcription accuracy only.

---
*For inquiries or licensing of the Limn composite technologies, contact Daniel Bally at Globe & Atlas.*
