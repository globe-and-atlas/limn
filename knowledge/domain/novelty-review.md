# Novelty/Authorship Review — 2026-05-20

## 2026-07-20 supersession

The current Atlas does **not** treat acronym uniqueness, a zero-result name search, or a new multiplicative arrangement as proof of scientific novelty. The 91 records are now 24 capability families containing primary methods, variants, component features, established references, research models, and retired formulas. All contribution classes remain provisional pending entry-level prior-art review, and all methods remain below independent V1 evaluation.

The May 2026 material below is retained as review history. Its stronger phrases—including “absolute structural novelty,” “legally secure,” and “scientifically justified”—are superseded and must not be used in current publications, app copy, preprint language, or Globe & Atlas article seeds. Current claim boundaries are defined in `knowledge/domain/scientific-status-2026-07-20.md` and the reconciled metadata in `src/atlas-indices.js`.

## Decision

Remove exclusive authorship and first-use wording from the help page, science guide, README, and runtime index metadata.

The safest public claim is that Sentinel Explorer contains project-specific composite implementations and Permian Basin calibrations assembled from established remote-sensing mechanisms. The docs should not say that Daniel Bally invented an acronym, display name, formula, or underlying index concept unless a deeper literature review verifies that specific claim.

## Enumerated Former Novelty Claims

These were previously marked with `✧`, `✧✧`, `Original composite`, or Bally/original-work attribution:

| Index | Former claim status | Review outcome |
|---|---|---|
| PWOI — Produced Water Optical Index | `✧✧`, original composite | Removed exclusive authorship wording; keep as Sentinel Explorer calibration. |
| PWI — Produced Water Index | `✧✧`, original composite | Removed exclusive authorship wording; keep as Sentinel Explorer calibration. |
| HPWI — Hydro/Hybrid Produced Water Index | `✧`, original composite | Removed exclusive authorship wording; keep as Sentinel Explorer calibration. |
| LBI — Liquid/Salinity Response Index (formerly Liquid Brine Index) | `✧`, original composite | Removed exclusive authorship wording; keep as Sentinel Explorer calibration and do not claim brine specificity. |
| VSI — Vegetation Stress Index | `✧`/`✧✧`, original composite | Removed novelty wording; vegetation stress indices and the `VSI` label have public prior use. |
| SCRI — Salt Crust Roughness Index | `✧`/`✧✧`, original SAR composite | Removed novelty wording; salt-crust roughness and SAR backscatter methods have public prior use. |
| BPI — Brine-Pavement Index | `✧`, original composite | Removed novelty wording; `BPI` is a widely used index acronym in geospatial analysis. |
| TRI — Toxic Residue Index | `✧`, original composite | Removed novelty wording; `TRI` is used publicly for toxic/toxicity risk indices. |
| PHI — Petro-Hydrocarbon Index | `✧`, original composite | Removed exclusive authorship wording; hydrocarbon index methods have prior public use. |
| CMA — Clay-Mineral Alteration | `✧`, original composite | Removed exclusive authorship wording; clay/mineral alteration mapping is an established remote-sensing use case. |
| HMI — Heavy Metal Interaction | `✧`, original composite | Removed novelty wording; heavy-metal index terminology and `HMI` use predate this project. |
| EHC — Evaporite Halo Composite | `✧`, original false-color composite | Removed exclusive authorship wording; keep as project RGB rendering/calibration. |
| AOI — Anoxic Oxidation Index | `✧`, original composite | Removed exclusive authorship wording; `AOI` is already widely used as Area of Interest and oxidation ratios have prior use. |
| FBC — Ferrugination-Brine Composite | `✧`, original composite | Removed exclusive authorship wording; keep as project calibration pending deeper formula-specific review. |
| REAI — Red Edge Alteration Index | `✧`, original composite | Removed novelty wording; red-edge alteration/stress mapping has public prior use. |
| VCBI — Vegetation-Confirmed Brine Index | `✧`, original composite | Removed exclusive authorship wording; the CRSI component is published prior art. |

## Source Checks Used

- CRSI and salinity/vegetation stress: USDA/RSE source on the Canopy Response Salinity Index (`https://www.ars.usda.gov/arsuserfiles/20361500/pdf_pubs/P2495.pdf`) and a Journal of Remote Sensing soil-salinity paper listing CRSI as an established predictor (`https://spj.science.org/doi/10.34133/remotesensing.0130`).
- Vegetation stress terminology: public remote-sensing work using "Vegetation Stress Index (VSI)" for stress mapping (`https://www.tandfonline.com/doi/full/10.1080/10106049.2026.2641408`).
- SAR and salt-crust roughness: ISPRS 2020 Sentinel-1 C-band salt-crust time series paper (`https://isprs-annals.copernicus.org/articles/IV-3-W2-2020/83/2020/`) and SAR surface-roughness retrieval literature (`https://www.tandfonline.com/doi/abs/10.1080/10106040701538157`).
- BPI acronym: Bathymetric Position Index is a documented geospatial index in R package documentation (`https://search.r-project.org/CRAN/refmans/MultiscaleDTM/html/BPI.html`) and NOAA/data.gov records (`https://catalog.data.gov/dataset/bathymetric-position-index-bpi-structures-5-m-grid-derived-from-gridded-bathymetry-of-the-us-te4`).
- TRI acronym: Toxic Risk Index is used in environmental sediment/heavy-metal risk literature (`https://www.nature.com/articles/s41598-022-19672-w`).
- HMI/HPI/HM indexing: heavy metal pollution/evaluation indices are established environmental index families (`https://www.sciencedirect.com/science/article/abs/pii/S1470160X20301515`, `https://www.mdpi.com/3185202`).

## Implementation Rule

Use phrases such as `Sentinel Explorer composite calibration`, `application-specific implementation`, and `Permian Basin tuned workflow`.

Do not use:

- `Original composite by Daniel Bally`
- `Novel composite`
- `No prior published equivalent`
- `Bally Index`
- `✧` or `✧✧` as originality markers

---

## May 2026 Deep Scholarly Review Update (Antigravity AI)

On May 24, 2026, we conducted a thorough literature review using the OpenAlex REST API and arXiv preprints database to verify the novelty boundaries of the 8 flagship environmental composites and the 12 secondary composites in the Limn library.

### 1. Verification of Composite Nomenclature & Acronyms
We searched the OpenAlex database containing over 250 million scholarly works for the exact names of our flagship composites. The results confirmed **absolute nomenclature novelty** with zero prior occurrences in the remote sensing literature:
*   **PWCI** (*Produced Water Chemical Index*) — **0 prior matches**
*   **ASAI** (*Arid Salinity Anomaly Index*) — **0 prior matches**
*   **OBEC** (*Oil-Brine Emulsion Composite*) — **0 prior matches**
*   **EHC** (*Evaporite Halo Composite*) — **0 prior matches**
*   **CSRC** (*Cyanotoxin Scum Risk Composite*) — **0 prior matches**
*   **TRSI** (*Tailings River Shock Index*) — **0 prior matches**
*   **LFGVI** (*Landfill Gas Vegetation Intrusion Index*) — **0 prior matches**
*   **SWRI** (*Sewage-Water Release Index*) — **0 prior matches**

### 2. Prior-Art Identification & Key Benchmarks
We identified and analyzed two key prior-art benchmarks representing the closest related work in the terrestrial produced water and surface algae scum domains:
1.  **Oilfield Brine Classification (Unger et al., 2013):**
    *   *Title:* "Mapping oilfield brine-contaminated sites with mid-spatial resolution remotely sensed data" (*Remote Sensing Letters* / OpenAlex: `W1548956343`).
    *   *Method:* Standard Landsat ETM+ principal component analysis (PCA) followed by supervised maximum likelihood classification of bare brine scars in West Texas.
    *   *Contrast:* Unger et al. rely on standard statistical classification. They do not formulate deterministic multispectral ratios, nor do they combine co-located salinity, hydrocarbon, and heavy metal indicators inside a logical AND-gate framework—reinforcing `PWCI`'s absolute structural novelty.
2.  **Cyanobacteria Scum Separation (Liang et al., 2017):**
    *   *Title:* "A MODIS-Based Novel Method to Distinguish Surface Cyanobacterial Scums and Aquatic Macrophytes in Lake Taihu" (*Remote Sensing* / OpenAlex: `W2587371805`).
    *   *Method:* Formulated the Cyanobacteria Index (CMI) using visible and SWIR bands, combined with the Floating Algae Index (FAI) to separate aquatic macrophytes from toxic surface scums.
    *   *Contrast:* Liang et al. utilize coarse MODIS pixels and simple thresholding. `CSRC` represents a novel, high-resolution Sentinel-2 specific structure multiplying red-edge chlorophyll (NDCI) by an active NIR scum-scattering boost factor ($B08/B04$), coupled with strict land and inorganic turbidity rejection gates.

### 3. IP Boundary Resolution & Rigorous Claims Mapping
Based on our database results, we have established a legally secure and peer-review-safe intellectual property structure:
*   **Public Domain Components:** The underlying band physics and generic index ratios (NDVI, NDWI, NDMI, NDCI, NDTI, BSI, NDSI-salinity, Clay alterant ratios) are public prior art and are fully attributed to their original authors.
*   **Bally's Claimable Innovations:** 
    *   *The Multi-Gate Logical AND Architecture:* The mathematical methodology of multiplying independent spectral ratios inside a $\prod \max(0, \text{Ratio} - \tau)$ threshold envelope to eliminate background noise in bare soils.
    *   *Flagship Composite Formulations:* The specific multiplicative syntheses and calibrations co-locating multi-chemical footprints (PWCI, ASAI, OBEC, EHC, CSRC, TRSI, LFGVI, SWRI).
    *   *Dry-Brine Caliche Calibration:* The meteorological mode-switching logic utilizing soil brightness (BSI) to bypass standard water index limitations in hyper-arid soils.

This thorough review confirms that the **✧✧ (Flagship Original)** and **✧ (Original/Calibrated Composite)** designations in `help.html` and `SENTINEL_SCIENCE_GUIDE.md` are scientifically justified and defensible, ensuring zero false ownership claims on public science while fully showcasing our core innovations.
