---
generated_by: "Claude Code CLI (Fable 5)"
timestamp: "2026-07-20T00:00:00-05:00"
---

# Limn QC & Validation Investigation — Summary

**Scope:** QC of the published Limn whitepaper (`PUBLIC_SCIENCE_GUIDE.md`, May 2026) against the actual implementation, followed by the validation studies needed to resolve what it could honestly claim. Concluded with a repositioning of the paper.

---

## What I searched

- **The published whitepaper** — all 9 composite formulas, calibration/threshold claims, the "27 TRRC sites / 42.3% → 0.04% false-positive / ~89% consensus" numbers, references.
- **Production code** — `src/indices.js` (evalscripts + calibration presets), `src/app.js`, `src/map.js`, `help.html`, plus the code as it stood at the publication commit (`cb075df`) via git history.
- **Validation pipeline** — `execution/batch_analyze_spills.py`, `evaluate_validation.py`, `optimize_thresholds.py`, `validation_summary.md`, `best_thresholds.json`, and the raw `validation_raw.csv`.
- **Ground-truth data** — `data/rrc_spills.json`, `data/verified_spills.json`, `src/verifiedBookmarks.js`, `reports/produced_water_verified_sites_qc_reference.md`, and the knowledge base (`knowledge/domain/`, `ERRORS.md`, `DECISIONS.md`).
- **Live Sentinel-2 sampling** — 150 background points + 32 spill sites via the Copernicus Statistics API, to run the studies the repo had never run.

---

## What I discovered — QC findings (ranked)

### Critical

1. **The "27 TRRC-verified sites" dataset is untraceable.** `data/rrc_spills.json` self-describes as a "representative snapshot curated" with "approximate" coordinates, no incident IDs, mixes real operators with generic-sounding ones, and includes counties outside its own declared list. Every published performance number rests on it.
2. **The false-positive numbers were fabricated.** Nothing in the repo computed a false-positive rate; "42.3% → 0.04%" appeared only in the paper.
3. **The published PWCI formula was a chimera never benchmarked** — it spliced the validation-pipeline thresholds with the viewer's cubic stretch, a combination that existed in no code version. The shipped app defaults to thresholds `help.html` itself documented as producing 0% detection.
4. **ASAI's headline dry-brine mode wasn't in the shipped viewer** at publication (pipeline-only); the published equation matched neither.

### Major

5. **The §5 eco-suite formulas (CSRC/TRSI/LFGVI/SWRI) matched no code version** — e.g. TRSI's NDTI definition contradicted both the code and the standard literature form; NDOI was used but never defined.
2. **OBEC formula transcription errors** (ratio vs. normalized-difference smoothness proxy).
3. **README "~89% consensus" was unsupported** — the real figure was an ASAI∪OBEC *union* (not consensus); true flagship consensus is 55–74%.

### Moderate / minor

8. MVPI salt cross-talk (its methane ratio fires on the same brine signature the other indices target).
2. Imagery date == event date on many bookmarks (implausible given S2's 5-day revisit).
3. Editorial: "four"→"five" composites, an orphaned β term, an internally inconsistent in-app formula string.

**What checked out:** MVPI/EHC formulas matched code; all component ratios (NDSI, HCAI, HMRI, BSI, NDCI) were transcribed correctly; the 81.5/77.8/66.7% recall numbers were genuine pipeline outputs (the issue was the dataset and formula variant, not fabrication); the **11-site verified-site program is genuinely strong** (real NMOCD/TRRC sourcing, exact coordinates, closure PDFs).

---

## What I discovered — the validation studies

### 1. Background false-positive study (150 Permian points, no events)

The multi-gate "near-zero false positive" claim was not just unsupported — **the truth is roughly the opposite** for the calibration that produced the published recall:

| Composite | Recall (spill sites) | **False positives (background)** |
|---|---|---|
| PWCI | 81.5% | **96.7%** (median background score = 1.000) |
| ASAI | 77.8% | **71.3%** |
| OBEC | 66.7% | **71.3%** |

The high recall was an artifact of firing on nearly all background.

### 2. Shipped-viewer calibration false-positive

Ported the actual `src/indices.js` evalscripts and scored the same points: **0.0% false positives** (max rendered PWCI = 0.00000) — but the viewer also renders **blank at all 11 real verified spill sites**. It hits 0% by detecting essentially nothing.

**The two shipped calibrations fail in opposite directions:** pipeline fires almost everywhere; viewer fires almost nowhere. Neither is a working detector.

### 3. Threshold sweep — does *any* calibration work?

Swept PWCI's three internal gates across 1,224 combinations and traced every composite's recall-vs-false-positive frontier at fixed thresholds (32 spill sites, 150 background):

- **PWCI does not discriminate at any threshold** — best ~19% recall / ~9% FP; Youden's J ≈ 0.00 (recall and FP rise together).
- **No composite reaches a usable point** — best was ASAI ~53% recall / ~30% FP.
- **Verdict:** for these Sentinel-2 spectral composites, at a 500 m single-scene scale, no threshold separates produced water from Permian caliche. A **bounded negative result** (silent on higher-res / multi-temporal / SAR / hyperspectral).

### Self-correction

An earlier claim of mine — "LBI does 63% recall at 1.3% FP" — was a **threshold-mismatch error** (recall measured at t=0.01 where FP is 86%, paired with FP at t=0.08 where recall is 9%). At any fixed threshold, LBI peaks ~22%/20%. Corrected in all docs; a guard was added to the summarizer.

---

## What survives as legitimate

- **The multi-gate consensus architecture** — a sound design pattern (didn't pay off here, but valid).
- **The negative result itself** — rigorous, reproducible, and useful to the field.
- **The verified-site program** — real sourcing/coordinates/QC discipline; a reusable asset.
- **LBI — validated (small-N) as a specific standing-brine detector.** Per-pixel test with the shipped evalscript: fires on standing brine (incl. an independent non-calibration pond hit at 14.6% coverage) but on **0/149 caliche and 0/3 freshwater** at >1% coverage — brine-specific, Youden's J = 0.50 brine-vs-caliche. The one genuinely discriminating detector to come out of Limn, scoped to standing brine bodies (evaporation/recycling ponds, brine lakes). Not a general produced-water detector; needs a larger positive set to firm up. See `reports/lbi_brine_validation_2026-07-20.md`. (Two earlier passes on LBI were flawed — a threshold mismatch and a box-mean that breaks on small water bodies — both corrected here.)
- **Component ratios** (NDVI/NDWI/NDMI/NDSI/BSI/NDCI/…) — legitimate, correctly implemented, but established prior art, not novel.

---

## Bugs found & fixed along the way

- `execution/batch_analyze_spills.py` — missing `from pathlib import Path` made the whole validation pipeline non-runnable (`NameError`). Fixed.
- CDSE token expiry — a single upfront token 401s after ~10 min, which silently poisoned the first sampling run (93% "no data"). Added periodic refresh.
- Transitive `uuid` CVE-2026-41907 (medium) via `@google/earthengine` — pinned to 11.1.1 via npm `overrides`; GitHub alert cleared.

---

## Outcome

The whitepaper was repositioned (**v2.0**, path "a") as an honest **methodology / negative-result paper**: retitled, re-abstracted around four contributions, with a front-matter "Contributions, Scope & Limitations" section and the sweep verdict + LBI finding in §7. All work is committed and pushed to `globe-and-atlas/limn` (canonical remote), tags `preprint-v1.1` and `preprint-v2.0`.

**Open follow-ons (not done):** targeted standing-brine validation for LBI; a different sensing modality if a working detector is wanted; attaching real RRC incident IDs to the 27-record benchmark.

**Artifacts:** `reports/preprint_qc_2026-07-19.md` (full QC), `reports/threshold_sweep_2026-07-20.md` (sweep), `execution/false_positive_summary.md` + `execution/viewer_false_positive_summary.md` (FP studies), `execution/sample_background.py` / `score_viewer_calibration.py` / `sweep_thresholds.py` / `fetch_spill_bands.py` (reproducible scripts).
