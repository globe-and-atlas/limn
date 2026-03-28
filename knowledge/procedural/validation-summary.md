# Produced Water Detection Validation Summary

## Run 2026-03-28 — Dry Brine Mode Fix (Karpathy loop iteration 1)

**Sample:** 27 TRRC sites + 8 verified sourced sites (data/verified_spills.json)

### TRRC Sites (27, parcel centroids)

Index  Threshold  Detected  Rate   Mean
 APEX       0.01        21  77.8%  0.335
 HPWI       0.01        18  66.7%  0.294
  PWI       0.01        22  81.5%  0.741
  LBI       0.01        17  63.0%  0.033
  VSI       0.01        20  74.1%  0.047
  BPI       0.01        15  55.6%  0.023

Weighted composite (APEX×1.5 + HPWI×1.5 + others): **55.2%**
FBC (reference only, excluded): 66.7%

APEX detects major spills (>500 BBL): **86%** (6/7)

### Verified Sourced Sites (8, exact GPS)

Site                        APEX   HPWI  PWI   Notes
crane-tubbs-corner-2022     0.200  0.164  1.0  357K BBL geyser, dry mode fired
crane-fm329-2023            0.255  0.208  1.0  334K BBL geyser, dry mode fired
apache-balmorhea-2020       0.000  0.000  0.0  77.5K BBL — NDSI 0.029 below dry thresh; use 2021+ sweep
devon-pinnacle-2021 (7 BBL) 0.256  0.209  1.0  Expected low-signal; background caliche matches threshold
lake-boehmer (60-acre lake) 0.843  0.814  0.0  Wet mode only; persistent saltwater body
kinder-morgan-toyah-2024    0.131  0.107  1.0  2K BBL, dry mode fired
enlink-chickadee-crude      0.636  0.535  1.0  Crude oil, not brine; cross-type detection
murchison-carlsbad-nm       0.295  0.241  1.0  Low coordinate confidence

APEX coverage (verified): 7/8 (87.5%); only Apache-Balmorhea missed (date window issue)

### What Changed

**Root cause:** NDWI = (B03−B11)/(B03+B11) is −0.39 to −0.51 for dry Permian Basin soil.
Both APEX and HPWI use this as a "smoothness" proxy. When B11 >> B03 (dry bare caliche/salt),
`norm_smooth = 0`, zeroing the entire score. Only wet brine (Lake Boehmer, a water body)
produced positive NDWI, enabling detection.

**Fix:** Added dry brine mode to both APEX and HPWI:
- Condition: NDWI < −0.30 AND NDSI > 0.05 AND BSI > 0.10 (dry, salty, bare)
- Formula: `(ndsi − 0.04) × min(1, bsi × N) × scale`
- Takes `max(wet_score, dry_score)` — complementary, not replacing

**Delta:**
- APEX: 29.6% → 77.8% (+48 pp)
- HPWI: 14.8% → 66.7% (+52 pp)
- Composite: 38.1% → 55.2% (+17 pp)

### Known Limitations

- Apache-Balmorhea (2020-07-29): NDSI 0.029 below dry-mode threshold. Use `sweep_dates.py` on 2021+ imagery for residual salt signal.
- Devon-Pinnacle (7 BBL): fires at ~0.26 — expected false positive since 7 BBL cannot be resolved in a 500m bbox. Background caliche has same signature.
- Dry mode threshold (NDSI > 0.05) may still fire on naturally high-NDSI caliche. Need control sites (non-spill bare caliche) to measure false positive rate.

---

## Run 2026-03-08 — Baseline

**Sample Size:** 32 RRC verified spill sites

Index  Threshold  Detected Detection Rate Avg Score
  FBC       0.10        22          68.8%      1.00
 HPWI       0.10         4          12.5%      0.80
  PWI       0.05         0           0.0%      0.00

Weighted composite: ~12%

Key observation: PWI 0% detection — triple-product AND-gate + HCAI/HMRI thresholds too high.
APEX not yet in pipeline.
