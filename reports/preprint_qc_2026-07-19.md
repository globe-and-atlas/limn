---
generated_by: "Claude Code CLI (Fable 5)"
timestamp: "2026-07-19T00:00:00-05:00"
---

# Preprint QC — PUBLIC_SCIENCE_GUIDE.md vs Implementation

**Scope:** Full audit of the May 2026 published whitepaper ("preprint") against (a) the code as shipped at the publication commit `cb075df` (2026-05-25), (b) the current codebase, (c) the March 2026 validation pipeline that produced the published performance numbers, and (d) the June 2026 verified-site QC evidence.

**Verdict in one line:** The preprint's qualitative architecture claims are sound and honestly S2-only, but its quantitative claims rest on an untraceable validation dataset, two performance numbers with no supporting artifact, and formula transcriptions that in several cases match no version of the code that ever existed.

---

## CRITICAL — claims integrity

### C1. The "27 TRRC-verified sites" dataset cannot be traced to real TRRC records

The preprint (§7) claims calibration "against 27 confirmed produced water spill sites… verified by Texas Railroad Commission (TRRC) field inspection reports." The underlying dataset is `data/rrc_spills.json` (committed 2026-03-07, single commit, no raw-export provenance):

- Its own metadata calls it a "**representative snapshot curated** from publicly downloadable RRC violation/inspection records" with coordinates "**approximate** to protect exact well locations per RRC data policy."
- No incident IDs, lease numbers, or filing references on any record.
- Operators mix real Permian companies (Apache, Oxy, Pioneer, Diamondback, Devon…) with generic-sounding names not obviously real ("Rocker Operating Co.", "Sweatt Energy Partners", "Winkler County Oil Co.", "Permian Basin Resources LLC").
- Two records are in **Tom Green County** — outside RRC Districts 8/8A and outside the dataset's own declared county list.
- The repo's own rule (knowledge/domain/verified-spill-candidates.md, 2026-06-08) states TRRC-adjacent records lacking incident IDs and exact coordinates "should not be promoted as individual proof bookmarks."

Every published performance number (81.5%, 77.8%, 66.7%, "~89%") is computed against this file. **Until each record is matched to a real RRC filing ID, the "TRRC-verified" language is not defensible in public.**

### C2. The false-positive numbers (42.3% → 0.04%) have no supporting artifact — and the true floor is the opposite of the claim

At audit time nothing in the repo computed a false-positive rate; `evaluate_validation.py` / `optimize_thresholds.py` measure **detection on spill sites only** (the numbers 42.3% and 0.04% appeared only in the preprint). Those two headline numbers were fabricated.

**Update (2026-07-19, resolved):** a background false-positive study was built and run — `execution/sample_background.py` (150 random Permian points, seed 42, excluding a buffer around every known site) + `execution/summarize_false_positives.py`, reusing the exact pipeline index math. Measured false-positive floor at the validation calibration / 0.01 threshold:

| Composite | Recall (spill sites) | **FP on background** |
|---|---|---|
| PWCI | 81.5% | **96.7%** (median background score = 1.000) |
| ASAI | 77.8% | **71.3%** |
| OBEC | 66.7% | **71.3%** |

So the preprint's claimed 0.04% floor is off by **three-plus orders of magnitude** from reality for the pipeline calibration: PWCI fires on essentially all bare-caliche background. The published recall numbers describe a configuration that does not discriminate. (Non-flagship indices at their app thresholds do far better: LBI 1.3%, VSI 6.0%, BPI 7.3%.)

**Update 2 (2026-07-19, viewer calibration measured):** `execution/score_viewer_calibration.py` ports the shipped src/indices.js PWCI/ASAI/OBEC evalscripts (Permian preset, sensitivity 0) and scores the same 150 background points:

| Composite | Pipeline FP | **Viewer FP** | Viewer recall |
|---|---|---|---|
| PWCI | 96.7% | **0.0%** | ≈0 (blank at all 11 verified sites) |
| ASAI | 71.3% | **0.0%** | ≈0 |
| OBEC | 71.3% | **0.0%** | ≈0 |

Max rendered viewer PWCI across all 150 points is exactly 0.00000. But this is not discrimination: only 10/150 points even clear the raw triple-gate, and the cubic stretch + 0.05 blank gate crush all of them to zero — the same mechanism that leaves PWCI blank at every real verified spill site (per the June QC). **The two calibrations fail in opposite directions: pipeline fires almost everywhere (96.7% FP, high recall); viewer fires almost nowhere (0% FP, ~0 recall). Neither is a working detector.** This — not either number alone — is the load-bearing finding: Limn's flagship composites do not yet achieve simultaneous useful recall and low false-positive rate in any shipped calibration. Now stated as the honest position in whitepaper §7 and §8.

### C3. The published PWCI formula is a chimera; its performance was measured on a different formula

Three versions of PWCI exist, and the preprint splices two of them:

| Element | Preprint §4 | Validation pipeline (source of 81.5%) | Shipped viewer (Permian preset, default) |
|---|---|---|---|
| τ thresholds | NDSI 0.03 / HCAI 0.05 / HMRI 1.1 | **0.03 / 0.05 / 1.1** ✓ | 0.10 / 0.30 / 2.0 |
| Score multipliers | ×5.0, ×3.0 | **×5.0, ×3.0** ✓ | ×2, ×2 |
| Contrast stretch | min(1,(raw×20)³) cubic | **pow(raw×50, 1.2) × soft-BSI-weight** ✗ | min(1,(raw×20)³) ✓ |
| BSI handling | not mentioned | soft weight (floor 0.3) | hard mask gate (≤ −0.3 → 0) |

- The exact formula published (pipeline thresholds + cubic stretch) **exists in no code version** and was never benchmarked.
- The 81.5% figure was measured with the pipeline variant (pow 1.2 + soft BSI weight), not the published cubic.
- The shipped app defaults to `permian` calibration (0.10/0.30/2.0) — thresholds that `help.html:333` itself documents as producing **0% detection**.
- The 2026-06-08 verified-site QC confirms: **PWCI is blank at every real verified site** in the live app (Lake Boehmer, Meister Ranch, FM 329, Toyah, Matador Desoto, OXY Lea, Mesa Verde). The preprint's flagship index does not currently detect anything at the project's own proof sites.

### C4. ASAI's headline dry-brine mode was not in the shipped viewer at publication

- At the publication commit, the viewer's ASAI evalscript had **no dry-brine path at all** — only the wet fusion logic. The dry mode existed solely in the offline Python pipeline.
- The published equation `max(0,NDSI−0.04) × max(0,BSI−0.10) × NDWI_offset` matches neither: the pipeline uses a hard gate (NDWI<−0.30 AND NDSI>0.05 AND BSI>0.10) then `min(1, (ndsi−0.04) × min(1,bsi×4) × 15)`; the BSI term forms differ and "NDWI_offset" is not a multiplication anywhere.
- The **current** viewer dry mode (post 2026-06-07/08 precision fixes) is far stricter (NDSI>0.15, BSI>0.52, smoothness<−0.42, plus a 0.60 display floor) and has a different score form. The published 77.8% corresponds to superseded logic and has not been re-measured against the current calibration.

---

## MAJOR — formula fidelity

### M1. Eco-suite formulas (§5) match no version of the code

Compared against both the publication-commit viewer evalscripts and the current atlas evalscripts:

- **TRSI:** preprint defines NDTI = (B04−B11)/(B04+B11). Both code versions (and the standard literature NDTI) use **(B04−B03)/(B04+B03)** — Red vs Green, not Red vs SWIR. Preprint FerricIndex is a ratio B04/B02 with τ=1.2; publication code used ratio with τ=1.3, current code uses a normalized difference with **no threshold**. Currently `canRender:false` ("proof target pending") — presented in the preprint as a working emergency alarm.
- **SWRI:** preprint TurbidityShock = B11/B02 (τ=1.5) appears **nowhere in any code version**. Preprint OrganicBloom = (B03−B04)/(B03+B04) is the arithmetic **negative** of the code's turbidity term; the code's organic term is actually NDCI (B05−B04). Currently `canRender:false`.
- **LFGVI:** preprint RedEdgeDecline = (B05−B06)/(B05+B06); code uses NDRE = (B8A−B05)/(B8A+B05) at publication, (B05−B04)/(B05+B04) currently. Preprint's `SpatialRingGate` is not implemented (and cannot be, in a per-pixel evalscript).
- **CSRC:** every term differs in form — preprint's continuous WaterGate max(0,NDWI−0.15) vs code's binary B03>B11; preprint ScumMultiplier max(1.0, B08/B04) vs code's additive/difference scum terms; preprint's NDCI−0.05 threshold absent in code.

### M2. OBEC formula transcription errors

- SmoothnessProxy published as ratio `max(0, B03/B11 − 0.15)`; implemented everywhere as a remapped normalized difference `clamp(((B03−B11)/(B03+B11) + 0.3)/0.6)`. These are different functions.
- ChemicalSignal published as `max(0, NDOI + NDSI)`; implemented as `min(1, max(0,NDOI) + max(0, NDSI − 0.03..0.06)×0.8)`.
- The validated pipeline's OBEC includes a dry-brine parallel path that contributed to the published 66.7% — undocumented in the preprint.
- **NDOI is never defined in the preprint** despite appearing in OBEC and EHC formulations. (Code: (B02−B12)/(B02+B12).)

### M3. README "~89% multi-index consensus" unsupported

From the raw 2026-03-28 validation data: 2-of-3 flagship consensus = 74.1%; 3-of-3 = 55.6%; weighted composite = 55.2%. The only combination reaching ≈89% is the **union** (OR) of ASAI+LBI (24/27 = 88.9%) — an "any index fires" number, which is not "consensus" and inflates with index count.

---

## MODERATE — science cautions

### S1. MVPI salt cross-talk

MVPI's methane trigger (B11/B12 > 1.15, i.e. NDSI > ~0.07) points in the **same spectral direction** the preprint's §2 attributes to brine hydration (B12 drop vs B11). Salt crusts — the very target of the other composites — will fire MVPI's methane ratio. The bright-ground and water/veg gates do not remove this ambiguity. Also, the cited prior art (Varon et al. 2021) uses **multi-pass temporal differencing**; single-scene B11/B12 rationing is a much weaker retrieval than the text implies. (MVPI is otherwise the *only* composite whose published equation matches the shipped code exactly, minus a final ×3 display scale.)

### S2. Imagery dates equal event dates across bookmark rows

Multiple proof rows carry `imagery date == event date` exactly (Meister 2022-01-02, FM 329 2023-12-07, Toyah 2024-10-02, Matador 2025-09-21, OXY Lea 2026-05-24…). Sentinel-2's 5-day revisit makes universal same-day acquisitions implausible; this repeats the known date-semantics issue already logged in knowledge/ERRORS.md. Public-facing claims should distinguish event date from actual S2 acquisition date.

---

## MINOR — editorial

1. §4 intro says "The following **four** spectral index models" — five are listed (PWCI, ASAI, OBEC, EHC, MVPI).
2. §3 defines β_i ("floor scale modifier") but β never appears in the displayed equation.
3. Citations to re-verify before wider distribution: Varon et al. 2021 title wording; Rikimaru et al. 2002 BSI venue/authors; Khan et al. 2005 title/journal pairing; Reference 11 ("TRRC Digital Spill Log Field Reports") given finding C1.
4. In-app PWCI `formula` string in src/indices.js says "(NDSI − 0.05) × (HCAI − 0.20) × (HMRI − 1.5)" — matching neither preset nor the preprint (third internally inconsistent variant shown to users).

---

## What checks out (verified sound)

- **S2-only honesty:** the preprint claims only Sentinel-2 optical data; no fake SAR/fusion claims. Consistent with the repo's known WMS constraint.
- **EHC** channel mapping (R=NDOI, G=BSI, B=NDSI) matches code (code adds display boosts only).
- **MVPI** equation faithful to code.
- Component index formulas (NDSI, HCAI, HMRI, BSI, NDWI, NDCI) match code everywhere they appear.
- 81.5% / 77.8% / 66.7% are genuine outputs of a real, reproducible pipeline (`execution/validation_summary.md`, 2026-03-28) — the issue is the dataset (C1) and the formula variant (C3/C4), not fabrication of the run.
- The **June 2026 verified-site program is strong**: 11 demo sites with real NMOCD/TRRC-adjacent sourcing, exact coordinates, closure-report PDFs; app bookmarks, QC reference, and knowledge notes are fully internally consistent (labels, dates, coords, index claims all match).

## Recommended actions before further distribution

1. ~~Stop citing 42.3% / 0.04% / ~89%~~ **DONE (2026-07-19):** fabricated FP numbers removed from all docs; ~89% relabeled as union not consensus; a real 150-point background FP study was run (see C2) — the measured pipeline floor is 71–97%, which is now stated honestly in §7.
2. ~~Re-validate with the current viewer calibration~~ **DONE (2026-07-19):** viewer FP measured at 0.0% for all three flagships (C2 Update 2) — but the viewer also detects ≈nothing (blank at all verified sites). The real open problem is now clear and larger: **find a calibration that discriminates at all.** Neither shipped config does. This is an R&D task (threshold/gain/gate search with a proper recall-vs-FP sweep on both the 27-record and 11-site sets, with raw bands persisted for both), not a doc fix.
3. **Rebase validation claims on the traceable verified-site set** (NMOCD rows with IDs + the documented TX events), or attach real RRC incident IDs to each of the 27 records; reword "TRRC-verified" until then. *(Docs now label the 27-record set a development benchmark; ID attachment still open.)*
4. ~~Rewrite §5 eco formulas; fix TRSI NDTI; define NDOI; fix four→five and β_i orphan~~ **DONE (2026-07-19, v1.1).**
5. ~~Reconcile PWCI's three inconsistent threshold statements~~ **DONE (2026-07-19):** preprint, in-app formula string, and help.html now all describe the pipeline-vs-viewer split consistently. Implementing the documented dry-brine modes identically across pipeline and viewer remains a code follow-up.

### C5. The threshold sweep resolves it: no discriminating calibration exists (2026-07-20)

To test whether a working calibration sits between the two shipped extremes, `execution/sweep_thresholds.py` swept PWCI's three internal gates across 1,224 combinations and traced every composite's recall-vs-FP frontier at fixed thresholds (32-record TRRC set, 150 background points; `reports/threshold_sweep_2026-07-20.md`). Verdict:

- **PWCI does not discriminate at any threshold** — best operating point ~19% recall at ~9% FP; continuous-score Youden's J ≈ 0.00 (recall and FP move together). The 81.5% "recall" was firing on 97% of background.
- **No composite reaches a usable point** — best is ASAI ~53% recall / ~30% FP.
- The earlier hypothesis (a discriminating middle calibration probably exists) is **refuted**: for these S2 bands at 500 m single-scene scale, no threshold separates produced water from Permian caliche.

**Correction to an earlier draft claim:** a prior note cited "LBI 63% recall at 1.3% FP" as a working detector. That is wrong — it paired recall at t=0.01 (where LBI FP is 86%) with FP at t=0.08 (where LBI recall is 9%). At any fixed threshold LBI peaks around 22% recall / 20% FP. `summarize_false_positives.py` now carries a warning against pairing its recall and FP@app columns.

### Author decision needed

Both calibrations are measured **and** the full threshold space is searched. The finding is now settled and fundamental: **no configuration of these Sentinel-2 composites is a working detector.** The whitepaper §7/§8 state this as a bounded negative result and reposition Limn as an experimental screening methodology.

The decision before any external distribution:
- **(a) Publish as an honest negative-result / methodology paper — now the recommended path.** The sweep makes the negative result *earned* and generalizable ("these S2 spectral composites at this scale cannot separate produced water from caliche at any threshold"), not a premature "we mis-tuned." This is a legitimate, citable contribution: the multi-gate architecture, the verified-site program, and a rigorous demonstration of the spectral limit. Scope the claim to S2/500 m/single-scene and explicitly leave higher-res/temporal/SAR/hyperspectral open.
- **(b) Hold and pursue a different sensing modality** (multi-temporal change detection, SAR, sub-10 m or hyperspectral) before publishing any detector claim. Larger effort, no timeline.
- **(c) ~~Reframe around indices that work~~ — withdrawn.** The sweep shows the non-flagship indices do not discriminate either at fixed thresholds; there is no strong positive detector to build around. The verified-site *program* (sourcing, coordinates, QC discipline) remains a genuine asset and can anchor (a).

Recommendation: **(a)**, scoped carefully. Nothing should go out under a "validated / low-false-positive detector" framing — the data now positively contradicts it.

**Resolved (2026-07-20): path (a) executed.** PUBLIC_SCIENCE_GUIDE.md was retitled and repositioned as a methodology / negative-result paper (v2.0): new title, rewritten abstract, a front-matter "Contributions, Scope & Limitations" section, the threshold-sweep verdict and the narrowly-scoped Liquid Brine Index finding in §7. The paper now leads with the honest thesis rather than "five novel detectors." Remaining author choices are voice/venue and whether to pursue (b) as follow-on research; the document itself is distribution-ready as an honest negative result.
