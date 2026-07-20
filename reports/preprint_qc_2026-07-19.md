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

So the preprint's claimed 0.04% floor is off by **three-plus orders of magnitude** from reality for the pipeline calibration: PWCI fires on essentially all bare-caliche background. The published recall numbers describe a configuration that does not discriminate. (These FP numbers use the pipeline index math; the stricter shipped-viewer calibration's own FP is not yet measured — see follow-ups. Non-flagship indices at their app thresholds do far better: LBI 1.3%, VSI 6.0%, BPI 7.3%.)

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
2. **Re-validate with the current viewer calibration** — still open, now the top priority. The pipeline FP floor is catastrophic (C2); the shipped viewer uses stricter thresholds/gates and is expected to be far better, but its FP is **not yet measured**. Persist raw bands in `background_raw.csv` and score the viewer evalscripts against the same 150 points to get the number that actually describes the product.
3. **Rebase validation claims on the traceable verified-site set** (NMOCD rows with IDs + the documented TX events), or attach real RRC incident IDs to each of the 27 records; reword "TRRC-verified" until then. *(Docs now label the 27-record set a development benchmark; ID attachment still open.)*
4. ~~Rewrite §5 eco formulas; fix TRSI NDTI; define NDOI; fix four→five and β_i orphan~~ **DONE (2026-07-19, v1.1).**
5. ~~Reconcile PWCI's three inconsistent threshold statements~~ **DONE (2026-07-19):** preprint, in-app formula string, and help.html now all describe the pipeline-vs-viewer split consistently. Implementing the documented dry-brine modes identically across pipeline and viewer remains a code follow-up.

### Author decision needed
The measured **96.7% PWCI background false-positive rate** (pipeline calibration) is now stated in the public whitepaper §7. This is honest but consequential for a flagship publication. Before any new external distribution, decide whether to (a) publish with this transparency as-is, (b) hold §7 numbers until the viewer-calibration FP is measured and lead with that instead, or (c) restructure the paper around the viewer as the operational detector. This is a positioning call for the author, not a code fix.
