# Limn and Limn Atlas Scientific Status — 2026-07-20

This is the current claim boundary for both applications. Core Limn and Limn Atlas are separate products and must not share validation claims.

## Core Limn: produced-water screening

### What is implemented

- **PWCI:** BSI-gated multiplication of thresholded dual-SWIR, SWIR/Red, and SWIR2/Green ratios, followed by a cubic display stretch.
- **ASAI:** dual-path Sentinel-2 proxy: an NDWI-derived wet/smoothness path and a high-NDSI, high-BSI dry-surface path.
- **OBEC:** Blue/SWIR2 contrast plus a dual-SWIR boost, multiplied by an NDWI-derived surface term.
- **LBI:** dual-SWIR, wetness, low-vegetation, and surface gates, with an open-water bypass for the BSI term.

These are implemented screening architectures. The component ratios are broad optical proxies; they are not direct retrievals of produced water, hydrocarbons, heavy metals, oil emulsions, or brine concentration.

### What the July controls found

| Configuration | PWCI | ASAI | OBEC | Interpretation |
|---|---:|---:|---:|---|
| Development pipeline recall | 81.5% | 77.8% | 66.7% | Recall on a 27-record generalized-coordinate development set |
| Development pipeline background activation | 96.7% | 71.3% | 71.3% | High recall was paired with high activation on 150 Permian background controls |
| Shipped viewer, 11 reviewed positives | 0/11 | 0/11 | 0/11 | Precision-first gates suppressed the reviewed positives |
| Shipped viewer, 150 background controls | 0/150 | 0/150 | 0/150 | A blank viewer is not evidence of specificity |

A 1,224-combination PWCI threshold sweep found no useful operating point at the tested 500 m, single-scene support. Best PWCI was approximately 19% recall at 9% background activation; the best tested composite was ASAI at approximately 53% recall and 30% background activation. This is a bounded negative result for the tested data and support—not a conclusion about higher-resolution, multitemporal, SAR, or hyperspectral approaches.

### LBI preliminary result

The current small-sample study contains 4 standing-brine sites, 3 freshwater/brackish controls, and 150 caliche background points. LBI showed low caliche activation but overlapping standing-brine and freshwater responses. It is therefore labeled **Liquid/Salinity Response Index** in the app and must not be called brine-specific or a validated produced-water detector. The per-pixel standing-water study remains the next decisive test.

### Bookmark status

`execution/qc_limn_spill_bookmarks.py --fail-on-fail` passes all 13 current bookmarks. Event dates, imagery-date roles, source URLs, evidence classes, and coordinate-precision labels are internally consistent. These are representative inspection sites; evidence-class labels describe the documented event context, not successful spectral detection.

## Limn Atlas: research catalog and renderer

- 91 documented methods organized into 24 capability families across 12 application domains.
- Method roles: 15 primary methods, 10 variants, 12 component features, 1 established reference, 51 research models, and 2 retired formulas.
- 37 live screening proxies (M3), 16 executable non-live formulas (M2), and 38 formula/workflow specifications or retired formulas (M1).
- All entries remain below independent V1 evaluation.
- SF-EII and AMDPHI are retired from live rendering.
- LFMPI is a normalized NDMI-deficit proxy, not percent live-fuel moisture.
- Formula descriptions for 23 live layers are reconciled to the shipped evalscripts.
- Contribution type (C1–C3), implementation maturity (M1–M3), event context, calibration, and validation are separate fields.

### Bookmark and article status

The 2026-07-20 public-WMS audit found no weak, blank, or erroring live bookmark. After adopting stronger tested dates for TFIDI (`2021-08-17`) and IPVSI (`2021-09-01`), 35 live bookmarks are strong and two are moderate (RRFI and MP-PDI). Overlay strength means the visualization is legible; it does not establish scientific accuracy.

Recommended Globe & Atlas article leads are BH-DFSI, LFMPI, PETI, EPDI, EC-ACI, and TDR-ASI. Each combines a strong current overlay, an interpretable story, event/place context, and a resolved representative Sentinel acquisition timestamp. Bookmark dates remain WMS-window endpoints and must not be printed as acquisition timestamps.

Each lead is a **primary method inside a capability family**, not a standalone novelty claim: BH-DFSI (Fire Effects & Recovery), LFMPI (Fuel Moisture Context), PETI (Aquatic Blooms & Pigments), EPDI (Water Condition & Plumes), EC-ACI (Urban Surface Condition), and TDR-ASI (Mining Surfaces & Risk). Article seeds should name that relationship and use sibling variants only as comparisons.

### Cross-product boundary

Core Limn and Limn Atlas are independent scientific products. Their methods, formulas, evidence, results, validation claims, manuscripts, and supplements must not be used in or imported into one another. The GSIA preprint and 91-method catalog are Atlas-only publications.

## Publication language

Use: “screening proxy,” “surface context,” “candidate signal,” “implemented formula,” “representative acquisition,” and “not independently validated.”

Avoid: “confirmed detection,” “proof target,” “validated detector,” “high-confidence chemical anomaly,” “brine-specific,” and any claim that a strong overlay maps an official event boundary.
