# Novelty/Authorship Review — 2026-05-20

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
| LBI — Liquid Brine Index | `✧`, original composite | Removed exclusive authorship wording; keep as Sentinel Explorer calibration. |
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
