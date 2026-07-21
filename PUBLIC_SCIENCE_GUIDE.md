# Multi-Gate Spectral Consensus for Produced-Water Screening in Arid Basins: Architecture, a Verified-Site Program, and the Limits of Sentinel-2 Detection

**Author:** Daniel Bally
**Affiliation:** Globe & Atlas  
**Publication Date:** May 2026 · **Revision:** v2.0 — July 2026  
**Paper type:** Methodology and negative-result study  
**License:** Public Whitepaper / Technical Specification  

---

## Abstract

Produced water represents the largest volume liquid waste stream associated with oil and gas extraction, carrying high concentrations of ancient formation halides (brine salts), aromatic and aliphatic hydrocarbons, and dissolved heavy metal precipitants. Rapid spatial detection of these spills in arid and semi-arid regions (such as the Permian Basin) is severely hindered by high-albedo caliche backgrounds, dry playas, and civil construction signatures that mimic spill anomalies in single-band indices. 

This paper presents **Limn**, a multispectral methodology built on Copernicus Sentinel-2 imagery that tests whether thresholded surface-reflectance contrasts can screen produced-water events in arid terrain. We contribute three things. **First**, a reproducible multi-gate design pattern. **Second**, a documented event-site and background-control program. **Third**, and central to this revision, a **rigorous negative result**: under a full threshold sweep (1,224 gate configurations and per-index recall-vs-false-positive frontiers on a 32-record spill set and 150 background points), *no* tested configuration separates produced water from Permian caliche at a usable operating point. A small per-pixel LBI study produced responses at 2 of 4 standing-brine sites and 0 of 3 freshwater controls, but that control sample is too small to establish brine specificity (two-sided Fisher exact p≈0.43 for brine versus freshwater). Limn is therefore an **experimental screening methodology and a demonstration of a spectral limit**, not a validated diffuse-spill, standing-brine, or chemical detector.

---

## Contributions, Scope & Limitations (read first)

This is a **methodology and negative-result paper**, revised in July 2026 after an internal audit and a full validation study corrected the original (May 2026) draft. Readers should hold the following in view throughout:

**What this paper contributes:**

1. **A design pattern** — a reproducible product of thresholded, correlated surface contrasts for testing whether multi-gate screening improves arid anomaly separation (Section 3).
2. **A documented development-site and control program** — a reproducible sampling and falsification substrate, with explicit limits from generalized or parcel-level coordinates (Section 6).
3. **A rigorous, reproducible negative result** — a full threshold sweep showing that these Sentinel-2 composites do not separate produced water from Permian caliche at any operating point (Section 6).
4. **A bounded LBI hypothesis** — evaluated per pixel with its shipped evalscript, LBI responded at 2 of 4 standing-brine sites and 0 of 3 freshwater controls. The result motivates a larger standing-water study but does not establish brine specificity or detector accuracy (Section 6).

**What this paper does NOT claim:**

- It does **not** claim a validated produced-water detector. The flagship composites (PWCI, ASAI, OBEC) do not discriminate at a usable recall/false-positive point; any positive is an investigative lead only.
- It makes **no** quantitative accuracy or false-positive-suppression claim beyond the measured figures in Section 6, which are calibration diagnostics.
- The negative result is **bounded**: it concerns these S2 spectral composites at a 500 m single-scene reflectance scale over the Permian Basin. It does not speak to higher-resolution, multi-temporal, SAR, or hyperspectral methods, which remain open.

**Prior art vs. original work:** the component band ratios are established forms or broad project proxies and are not novel chemical retrievals. The original contributions are the packaged multi-gate *architecture*, calibration and control study, documented implementation history, and negative result—not the individual ratios. Full boundaries are in Section 6.

---

## Table of Contents
1. [Introduction & Environmental Context](#1-introduction--environmental-context)
2. [The Geochemical Footprint of Produced Water](#2-the-geochemical-footprint-of-produced-water)
3. [The Multi-Gate Logical AND Architecture](#3-the-multi-gate-logical-and-architecture)
4. [Project-Specific Produced-Water Screening Composites](#4-project-specific-produced-water-screening-composites)
   - [PWCI: Produced-Water Contrast Index](#pwci-produced-water-contrast-index)
   - [ASAI: Arid Salinity Anomaly Index](#asai-arid-salinity-anomaly-index)
   - [OBEC: Optical Brightness/Edge Contrast](#obec-optical-brightnessedge-contrast)
   - [EHC: Three-Channel Surface Context Composite](#ehc-three-channel-surface-context-composite)
   - [MVPI legacy: Single-Scene SWIR Ratio Screen](#mvpi-legacy-single-scene-swir-ratio-screen)
5. [Scientific Authorship and Prior-Art Boundaries](#5-scientific-authorship-and-prior-art-boundaries)
6. [Arid Background Calibration & Threshold Validation](#6-arid-background-calibration--threshold-validation)
7. [Conclusion & References](#7-conclusion--references)

---

## 1. Introduction & Environmental Context

Produced water is highly mineralized ancient seawater trapped in deep hydrocarbon-bearing geological formations for millions of years. During hydraulic fracturing and oil extraction, this water is co-produced to the surface. It is extremely toxic, containing:
*   **Brine Halides:** Sodium chloride ($NaCl$), calcium chloride ($CaCl_2$), and magnesium chloride ($MgCl_2$) at concentrations up to $300,000 \text{ mg/L}$ (nearly ten times saltier than seawater).
*   **Hydrocarbons:** Dissolved crude oil, benzene, toluene, ethylbenzene, and xylene (BTEX) compounds.
*   **Heavy Metals:** Radium-226/228, barium, strontium, and iron.

When pipeline ruptures or storage tank blowouts occur, this hyper-saline chemical mixture sterilizes soil, permanently kills native desert vegetation, and contaminates shallow aquifers. Traditional remote sensing relies on vegetation stress indices like the Normalized Difference Vegetation Index (NDVI). However, in hyper-arid oilfield basins, vegetation is sparse, and the surface is dominated by bright bare soil, gravel, and caliche. Consequently, standard indices yield high false-positive rates due to natural dry playas, roads, and concrete well pads.

**Limn** tests whether multiple broad surface contrasts can be combined to reduce single-ratio ambiguity on bare soils. The July results show that these combinations do not provide direct chemical or mineralogical consensus.

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

The central project implementation is a **Multi-Gate Logical AND Architecture** packaged by Daniel Bally for this investigation. Product-of-thresholded-features designs are not claimed as a new general mathematical operation.

Standard remote sensing uses linear combinations or simple ratios (e.g., $(Band_A - Band_B)/(Band_A + Band_B)$). While useful, a single ratio inevitably triggers false positives on non-spill features that happen to share a single spectral characteristic (e.g., a salt playa will trigger a salinity index; a freshly paved asphalt road will trigger a hydrocarbon index).

The architecture requires multiple correlated surface-reflectance contrasts to be simultaneously elevated. These terms are multiplied as non-linear factors:

$$\text{Index}_{\text{Consensus}} = \prod_{i=1}^{n} \max(0, \text{Proxy}_i - \tau_i)$$

Where:
*   $\text{Proxy}_i$ represents a spectral band ratio or index; the terms are not assumed independent.
*   $\tau_i$ is the strict regional background threshold for that specific proxy. (In practice each gated term may also carry a scale multiplier $\beta_i$, i.e. $\max(0, \text{Proxy}_i - \tau_i) \times \beta_i$; the per-index sections give the calibrated values.)
*   The $\max(0, \cdot)$ envelope acts as a **hard logical gate**: if even a single proxy fails to exceed its regional background threshold ($\tau_i$), its score becomes $0$, reducing the entire composite calculation to $0$.

Only when all configured proxy gates exceed their thresholds does the consensus index evaluate to a non-zero value. The gates reuse correlated surface reflectance and do not isolate a unique produced-water chemical footprint in the current evaluation.

---

## 4. Project-Specific Produced-Water Screening Composites

The following spectral architectures were implemented and calibrated for Limn by **Daniel Bally**. The individual ratios derive from established remote-sensing practice; literature priority for the packaged formulas is not asserted here.

### Current investigation workflow

The shipped viewer defaults to True Color and treats all index outputs as evidence lenses. Analysts first verify the documented site/date, clear-pixel quality, and visible surface; then use before/after imagery and established contextual formulas (MNDWI, AWEIsh, NDMI, SAVI, BSI, NDRE, dual-SWIR contrast, and SWIR false color). LBI is a preliminary liquid/salinity-response hypothesis. A collapsed Gate Diagnostics drawer exposes the six broad-band component responses used by the composite hypotheses: dual-SWIR, SWIR1–NIR, SWIR1–Red, Blue–SWIR2, SWIR1/SWIR2, and SWIR2/Green. Their legacy acronyms are retained for reproducibility, but none measures salinity, petroleum, contamination, or heavy-metal concentration. PWCI, ASAI, and OBEC are retained in a separate collapsed negative-result study drawer, not promoted as primary detectors. Agreement among correlated optical responses is not independent confirmation.

The default COG renderer makes negative screening results visible without changing the formulas. For PWCI, ASAI, OBEC, and LBI, a muted neutral veil marks clear pixels that were evaluated but did not cross the display threshold; muted color marks a non-zero sub-threshold score; only bright palette colors mark threshold-passing candidates. The score, gates, thresholds, and statistical interpretation are unchanged. This prevents a valid negative screen from being mistaken for a failed or missing tile.

Sentinel-2 SCL classes 4–7 are allowed in the primary L2A COG/GEE optical render paths; no-data, saturated/defective, dark-feature, cloud shadow, cloud/cirrus, and snow/ice classes are masked. The optional bundled Sentinel Hub WMS carrier is L1C and has no SCL band, so the app disables that gate and labels the limitation when WMS is active. Pixel masking does not eliminate residual atmospheric, adjacency, mixed-pixel, or substrate effects. Sentinel-1 VV is available as roughness/moisture-sensitive surface context, not as a source-attribution or orbit-matched change product.

> **Formula provenance note (v2.0):** Two calibrations of these composites exist. The **development-pipeline calibration** is the configuration whose recall and background-activation rates are reported in Section 6. The **interactive viewer calibration** applies stricter basin presets and is the formula rendered by the app. Neither is validated. Each formulation below identifies which configuration it describes.

---

### PWCI: Produced-Water Contrast Index

PWCI is the core three-ratio screening architecture. It requires simultaneous elevated dual-SWIR, SWIR1–Red, and SWIR2/Green surface contrasts. The historical component names NDSI, HCAI, and HMRI are retained for reproducibility; none directly retrieves salinity, hydrocarbons, or heavy metals.

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
    The soft bare-soil weight prevents mixed or vegetation-edge pixels from zeroing the three-gate score. This is the exact configuration whose 81.5% development recall—and 96.7% background activation—is reported in Section 6.

6.  **Interactive viewer variant:** the map viewer renders PWCI with a hard bare-soil mask, stricter basin-preset thresholds (Permian preset: $\tau$ = 0.10 / 0.30 / 2.0 with ×2 score multipliers), and a steeper cubic stretch $\min(1.0, (\text{raw} \times 20.0)^3)$. This precision-first configuration suppresses nearly all background at the cost of recall—it renders blank at the reviewed sites—and its response rate is not the Section 6 development-pipeline figure.

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
*   **Screening hypothesis:** In highly desiccated bare soil, standard water indices are suppressed. ASAI combines brightness (BSI) with a shortwave salinity proxy (NDSI) to screen for salt-crust-like response. Adding this mode raised development recall from 29.6% to 77.8%, but background activation was 71.3%; it did not prevent natural-background false positives (Section 6).
*   **Interactive viewer variant:** the current viewer applies a precision-tuned dry gate that is substantially stricter (NDSI > 0.15, BSI > 0.52, smoothness < −0.42, with a 0.60 display floor) following a June 2026 noise-suppression calibration pass. The Section 6 rate describes the pipeline form above, not this stricter viewer configuration.

---

### OBEC: Optical Brightness/Edge Contrast

OBEC is an experimental optical-contrast composite. It combines Blue–SWIR2, dual-SWIR, and MNDWI-derived surface terms; it does not retrieve oil, brine, emulsions, or blowouts.

#### Mathematical Formulation:
$$\text{OBEC} = \min(1.0,\; \text{SurfaceSignal} \times \text{WetnessTerm} \times 6.0)$$

Where:
*   $\text{NDOI}$ (Normalized Difference Oil Index) contrasts blue reflectance against SWIR-2 hydrocarbon absorption:
    $$\text{NDOI} = \frac{B02 - B12}{B02 + B12}$$
*   $$\text{SurfaceSignal} = \min\left(1.0,\; \max(0, \text{NDOI}) + \max(0, \text{NDSI} - 0.03) \times 0.8\right)$$
*   $\text{WetnessTerm}$ remaps the Green-vs-SWIR normalized difference into a $[0,1]$ surface term:
    $$\text{WetnessTerm} = \text{clamp}\left(\frac{\frac{B03 - B11}{B03 + B11} + 0.3}{0.6},\; 0,\; 1\right)$$
*   **Historical development-only dry path:** the evaluation pipeline also tested a secondary ASAI-like arid path: $\min(1, \max(0,\text{NDSI}-0.04) \times \min(1,\text{BSI}\times3.5) \times 14)$. It contributed to the 66.7% development recall and 71.3% background activation. The shipped OBEC evalscript does **not** contain this path.
*   **Screening hypothesis:** Green-vs-SWIR contrast can respond to smooth or wet surfaces, and NDOI/NDSI-like ratios can respond to surface material differences. Their product is an optical anomaly proxy, not an oil/brine-emulsion or chemical retrieval.

---

### EHC: Three-Channel Surface Context Composite

EHC is a diagnostic visualization that maps three broad surface contrasts to RGB channels. It exposes spatial pattern but does not classify spill morphology or chemical zones.

#### Channel Configuration:
$$\text{Red} = \text{Blue--SWIR2 contrast} \quad (\text{NDOI legacy key})$$
$$\text{Green} = \text{BSI} \quad (\text{Bare Soil Index})$$
$$\text{Blue} = \text{dual-SWIR contrast} \quad (\text{NDSI legacy key})$$

```
                   EHC channel interpretation

                   Red   = Blue–SWIR2 contrast
                   Green = Bare Soil Index
                   Blue  = dual-SWIR contrast

                   Colors and spatial patterns are contextual,
                   not chemical or morphology classes.
```

*   **Interpretation limit:** red, green, and blue are contrast channels—not oil, mud, and salt classes. Any apparent concentric pattern requires event records, temporal imagery, and field evidence before it can be interpreted causally.

---

### MVPI legacy: Single-Scene SWIR Ratio Screen

The legacy MVPI layer is a single-scene B11/B12 surface-ratio screen over bright, sparsely vegetated ground. It is retained as a falsifiable experiment, not as a methane retrieval or plume detector.

#### Mathematical Formulation:
$$\text{MVPI} = \text{MethaneRatio} \times \text{BrightGroundGate} \times \text{WaterReject} \times \text{VegReject}$$

Where:
*   $\text{SWIRRatioScore}$ thresholds the B11/B12 surface ratio; an elevated value is not uniquely attributable to methane:
    $$\text{MethaneRatio} = \max\left(0, \left(\frac{B11}{B12} - 1.15\right) \times 4.0\right)$$
*   $\text{BrightGroundGate}$ mandates a highly reflective background surface to measure absorption shadows:
    $$\text{BrightGroundGate} = \max\left(0, \frac{B11 + B12}{2.0} - 0.20\right) \times 2.0$$
*   $\text{WaterReject}$ eliminates false specular anomalies in standing water:
    $$\text{WaterReject} = \begin{cases} 0 & \text{if } B03 > B11 \\ 1 & \text{otherwise} \end{cases}$$
*   $\text{VegReject}$ filters out biological/canopy stress look-alikes:
    $$\text{VegReject} = \begin{cases} 0 & \text{if } NDVI > 0.15 \\ 1 & \text{otherwise} \end{cases}$$
*   **Physical basis and limit:** methane affects Sentinel-2 SWIR radiance, but operational retrieval requires scene fitting and generally a methane-free reference observation. Soil, evaporites, moisture, illumination, and atmospheric differences can also change B11/B12. The rendered output applies a final ×3.0 display scaling before clamping to $[0,1]$.
*   **Retrieval Limitations (v1.1):** Two caveats bound MVPI's screening role. First, an elevated single-scene B11/B12 ratio is **spectrally degenerate with evaporite surfaces**: hydrated salt crusts also depress B12 relative to B11 (the very NDSI signature Sections 2 and 4 exploit), so saline ground can trigger the methane ratio without any gas present. Candidate plumes over salt-affected pads require cross-checking against NDSI/ASAI and, ideally, a pre-event reference scene. Second, established Sentinel-2 methane retrievals (Varon et al., 2021) rely on **multi-pass temporal differencing** rather than single-scene ratios; MVPI's single-scene formulation is a coarse spatial triage layer, not a quantitative plume retrieval, and positive frames should be confirmed against a methane-free reference date.

---

## 5. Scientific Authorship and Prior-Art Boundaries

For public scientific clarity, Limn separates standard satellite science from project-specific implementations and experiments. Standard Sentinel-2 bands and established formulas—including NDVI, SAVI, MNDWI, AWEI, NDMI, NDRE, and BSI—are prior art. Generic product-of-features gating, thresholding, and nonlinear display stretches are also not claimed as mathematical inventions.

### 1. Public-Domain Prior Art:
*   **The Component Ratios:** Formulas such as BSI, NDVI, MNDWI/AWEI, NDMI, NDRE, and related normalized differences are established methods or generic contrasts.
*   **The Band Definitions:** Sentinel-2's 13 spectral bands and standard reflections are established Copernicus science.

### 2. Original Project Contributions Attributed to Daniel Bally:
*   **Reproducible implementation:** The named PWCI, ASAI, OBEC, LBI, EHC, and MVPI project formulas, their software packaging, exact thresholds, display mappings, and change history.
*   **Evaluation and falsification record:** The event/control design, formula-parity work, background-activation results, full threshold sweep, and explicit negative conclusion.
*   **Operational evidence workflow:** The context-first sequence of True Color, pixel QA, temporal comparison, established water/moisture/soil/vegetation lenses, and explicitly bounded experimental composites.

These statements claim project authorship and reproducibility, not literature priority, patentability, chemical specificity, or validated detector performance. MVPI is a single-scene SWIR ratio screen and not a methane retrieval.

---

## 6. Arid Background Calibration & Threshold Validation

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

The honest conclusion is therefore stronger than "not yet tuned": for these Sentinel-2 spectral composites—whether read as a 500 m regional mean or per pixel—**no configuration delivers simultaneous useful recall and low background activation**. The experiment does not validate multi-gate multiplication as a general solution; it documents a reproducible architecture and shows that these particular bands, formulas, and samples do not separate produced-water sites from the Permian caliche background. This bounded negative result does not rule out higher-resolution, rigorously paired multi-temporal, SAR-change, or hyperspectral approaches. Accordingly this release makes **no detection-accuracy or false-positive-suppression claim**; Limn is an experimental methodology and investigative context tool, not a validated detector. Full method and figures: `reports/threshold_sweep_2026-07-20.md`, `reports/preprint_qc_2026-07-19.md`, and the `execution/*_false_positive_summary.md` artifacts.

### LBI standing-water response: a small-N hypothesis

The negative result concerns *diffuse produced-water spills on bare soil*. LBI addresses a different target—standing water—and its per-pixel behavior justifies a larger experiment, but the present sample cannot establish a detector.

An important methodological correction underlies this. A first pass evaluated LBI as a 500 m box mean and found brine/freshwater overlap (mean 0.062 vs 0.044). That method is invalid for water bodies: a 500 m mean mixes a small pond with surrounding land, driving NDWI negative and disabling LBI's own water gates, and it used a batch approximation lacking the shipped index's standing-water bypass. Re-run with the **actual shipped evalscript, per pixel** (coverage = fraction of pixels that render at LBI ≥ 0.08), the picture changes:

- **Observed response:** 2 of 4 documented standing-brine sites rendered, including the Matador Desoto recycling pond (14.6% coverage).
- **Observed controls:** 0 of 149 caliche boxes and 0 of 3 freshwater controls rendered at the >1% coverage bar.
- **Inference limit:** 0 of only 3 freshwater controls yields a wide uncertainty interval; brine versus freshwater is not statistically significant (two-sided Fisher exact p≈0.43). Brine versus caliche primarily demonstrates water/surface separation, not chemical specificity.

The result is best described as a **preliminary standing-water/salinity response hypothesis**. A larger, independent set of date-confirmed brine, freshwater, brackish, naturally saline, and industrial-water controls is required before specificity, sensitivity, or accuracy language is defensible. It says nothing about diffuse spills, which remain the negative result above. Full detail: `reports/lbi_brine_validation_2026-07-20.md`.

> **Calibration-configuration caveat.** The 81.5% / 77.8% / 66.7% rates were produced by the **development-pipeline** configuration (Section 4). The **interactive map viewer** ships a stricter calibration (higher basin-preset thresholds, hard bare-soil masks, steeper stretch, and a June 2026 noise-suppression pass on the dry-brine gates). It renders blank at all 11 reviewed positive sites as well as all 150 controls. Neither configuration is a validated detector.

### Summary of Development-Pipeline Thresholds (PWCI):
*   **NDSI floor ($\text{NDSI} > 0.03$):** Admits positive shortwave-ratio response; not a direct halite measurement.
*   **HCAI floor ($\text{HCAI} > 0.05$, ×5.0 gain):** Admits positive SWIR/red contrast; not a hydrocarbon retrieval.
*   **HMRI floor ($\text{HMRI} > 1.1$, ×3.0 gain):** Admits a high SWIR-2/green ratio; not a heavy-metal retrieval.
*   *(The interactive viewer's Permian preset raises these to 0.10 / 0.30 / 2.0 for low-noise visual triage.)*

---

## 7. Conclusion & References

Limn evaluates a reproducible **multi-gate surface-contrast architecture** for testing whether several broad Sentinel-2 responses can separate produced-water events from arid background. The gates encode correlated optical contrasts rather than direct salinity, hydrocarbon, or mineralogical measurements.

As Section 6 documents, a full threshold sweep shows this is not a tuning problem to be solved with better thresholds: across the tested configuration space, these Sentinel-2 composites do not separate produced water from Permian caliche at a usable operating point—PWCI shows essentially zero separation, and the best tested composite reaches only ~53% recall at ~30% background activation. This does not validate the architecture in principle; it establishes that **these particular bands, formulas, and 500 m single-scene samples do not provide adequate separation in this experiment**. That bounded negative result leaves higher-resolution, rigorously paired multi-temporal, SAR-change, and hyperspectral approaches open. Limn is therefore an experimental methodology and investigative context tool, not a detector; any response requires independent field or higher-resolution confirmation.

### References & Citations

1.  **Bally, D. (2026).** *Multi-Gate Spectral Consensus for Produced-Water Screening in Arid Basins: Architecture, a Verified-Site Program, and the Limits of Sentinel-2 Detection.* Globe & Atlas Whitepaper Series, Vol. 1.
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

> **Citation note (v1.1):** Reference 11 refers to the compiled TRRC violation/inspection working set described in Section 6, not a single named report series. References 5 (Khan et al.), 6 (Rikimaru et al.), and 12 (Varon et al.) are provided as prior-art context for the respective band ratios and should be consulted directly for exact titles and venues before formal citation.

---

## Revision History

**v2.0 — July 2026 (repositioned as a methodology / negative-result paper).** After a background false-positive study and a full threshold sweep, the evidence showed that no configuration of these Sentinel-2 composites discriminates produced water from Permian caliche at a usable operating point. This revision:

- Retitled and re-abstracted the paper as a methodology and negative-result study; added a front-matter **Contributions, Scope & Limitations** section.
- Added the threshold-sweep verdict to Section 6 (PWCI Youden's J ≈ 0.00; best composite ASAI ~53% recall / ~30% background activation) and the measured background floors (pipeline PWCI 96.7%; viewer ~0% but blank at real sites too).
- Re-evaluated LBI per pixel using the shipped standing-water bypass. LBI responded at 2 of 4 standing-brine sites and 0 of 3 freshwater controls, but this small comparison is not statistically significant (two-sided Fisher exact p≈0.43) and does not establish brine specificity. Renamed it Liquid/Salinity Response Index.
- Corrected an internal threshold-mismatch error (the earlier "LBI 63% recall at 1.3% FP" paired two different thresholds).
- Repositioned all claims: no validated detector, no accuracy or false-positive-suppression claim; contributions are the packaged architecture, documented development/control program, and negative result.

**v1.1 — July 2026 (formula-fidelity and validation-transparency pass).** Following an internal QC audit against the codebase and validation pipeline, this revision:

- Corrected the PWCI, ASAI, and OBEC formulations to match the development implementation (contrast stretch, dry-brine gate conditions, smoothness proxy, and chemical-signal terms), and explicitly separated the **development pipeline calibration** from the stricter **interactive viewer calibration**.
- Removed Atlas ecological methods from this produced-water paper so product formulas, claims, and evaluation records remain separate.
- Removed the unsupported false-positive figures then in circulation (previously "42.3% → 0.04%"); the later July background study supplies the measured rates now reported in v2.0.
- Reframed the "27 TRRC-verified sites" as a compiled development benchmark (coordinates generalized, not all incident-ID-audited) and introduced the 11-site exact-coordinate review set.
- Corrected the "~89% consensus" language (README) — genuine flagship consensus rates are lower and are stated as such.
- Added the MVPI salt cross-talk and single-scene retrieval caveats; fixed editorial errors ("four"→"five" composites; the orphaned $\beta_i$ term).

Historical v1.0/v1.1 authorship and physical-basis claims are superseded wherever they conflict with this revision's evidence boundaries.

---
*For inquiries about the Limn methodology, contact Daniel Bally at Globe & Atlas.*
