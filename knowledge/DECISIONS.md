# Architecture Decisions — sentinel-explorer

## Atlas is organized by capability family, not index count (2026-07-20)

**Decision:** Preserve all 91 Atlas records while organizing them into 24 capability families. Each record now carries a method role: 15 `primary`, 10 `variant`, 12 `component`, 1 `reference`, 51 `research-model`, and 2 `retired`. Family membership describes a shared physical question or decision; it does not establish scientific equivalence, novelty, or validation.

**Application boundary:** Limn Atlas defaults to family-first navigation, retains the 12-domain view as a secondary lens, and moves research models and retired formulas into a dedicated Research view. Core Limn's produced-water screen is unchanged because its negative-result evaluation is a separate evidence set. The produced-water preprint receives only a scope clarification for the four shared ecological examples.

**Editorial boundary:** The six G&A leads—BH-DFSI, LFMPI, PETI, EPDI, EC-ACI, and TDR-ASI—are primary methods inside six capability families. Article language must identify the family and method role and must not imply that a named method is an independently validated invention. Sibling variants can be used for comparison, not multiplied into additional novelty claims.

**Verification:** `tests/test_atlas_capability_families.mjs` requires complete family membership, stable role counts, no orphaned families, research/retired methods to remain non-live, and family/domain/research navigation to remain present.

---

## Core Limn and Atlas public science now use formula-fidelity status metadata (2026-07-20)

**Decision:** Keep the executable PWCI, ASAI, OBEC, and LBI math unchanged while revising their public names, formulas, and evidence labels to match the shipped evalscripts and July controls. The core app now shows formula and validation status in its legend and reports. LBI is now **Liquid/Salinity Response Index** because the preliminary standing-water sample overlaps freshwater controls.

**Atlas synchronization:** Atlas retains 37 live M3 screening proxies. Nested bookmark reconciliation is now explicit, TFIDI uses `2021-08-17`, and IPVSI uses `2021-09-01`, the strongest tested representative scenes. The current WMS audit is 35 `strong`, 2 `moderate` (RRFI and MP-PDI), and 0 weak/blank/error. Moderate dates remain event-aligned because brighter nearby dates did not materially improve the article truthfulness.

**G&A article leads:** BH-DFSI, LFMPI, PETI, EPDI, EC-ACI, and TDR-ASI are the current six lead candidates. Each stores its bookmark-date role, exact CDSE acquisition timestamp, cloud cover, article angle, and QC status. SF-EII was removed because its physical claim was retired; RRFI was removed from the lead set because its overlay remains moderate.

**Verification:** Core bookmark metadata is 13 pass / 0 warn / 0 fail. Atlas is 35 strong / 2 moderate. The evidence audit is 42/42 Gold-ready across the 37 live Atlas formulas plus five SAR/S5P demo layers. A six-target capture audit resolved 24 WMS images with CDSE acquisition metadata. Formula, browser, and catalog tests are the release gate.

**Claim boundary:** A visually strong bookmark means that the shipped screening proxy is legible at a cited event context. It does not validate the formula, map an official event perimeter, or establish causal attribution.

---

## Atlas v2 separates formulas, implementation, contribution, and validation (2026-07-20)

**Decision:** Treat the Atlas as 91 proposed remote-sensing specifications, not 91 novel or validated indices. Every entry now exposes an explicit formula version, proposed and implemented formulas, implementation maturity (M1–M3), contribution class (C1–C3), required inputs, operators, units, calibration state, and validation state.

**Scientific corrections:** Reconciled the public descriptions of all 23 live formulas that differed from their evalscripts; replaced LFMPI's pseudo-LFMC expression with a normalized NDMI-deficit screening proxy; corrected priority definitions including SACI, RDOCI, PWTDI, REENBI, TSEAI, NFCAI, and PUENPI; and reframed formulas that require temporal analysis, spatial operators, radiative transfer, inversion, or field calibration as research workflows rather than arithmetic indices. SF-EII and AMDPHI are no longer live because their existing evalscripts did not implement the claimed physical quantities.

**Resulting inventory:** 37 live screening proxies (M3), 16 executable non-live formulas (M2), and 38 specified concepts or retired formulas (M1). All entries remain below V1 independent evaluation. Bookmarks and citations provide inspectable event context, not accuracy evidence.

**Why:** The July 2026 audit found formula-to-code mismatches, unsupported dimensional operations, missing temporal/spatial operators, and sensor-resolution limits. A single novelty tier had also conflated originality, implementation, evidence, and validation.

**Verification:** `npm run test:atlas:formula`, focused LFMPI and SMPDI tests, JavaScript syntax checks, and `execution/audit_atlas_evalscripts.py` all pass; the audit covers all 37 renderable evalscripts.

---

## Preprint claims reconciled to pipeline-vs-viewer reality (2026-07-19)

**Decision:** Public docs (PUBLIC_SCIENCE_GUIDE.md, README.md, SENTINEL_SCIENCE_GUIDE.md, help.html) now explicitly distinguish two calibrations and state the detection numbers as recall-only.

- **Validated pipeline calibration** (`execution/batch_analyze_spills.py`): PWCI τ=0.03/0.05/1.1 with ×5/×3 gains and pow(raw×50,1.2)×soft-BSI stretch; ASAI/OBEC dry gate NDWI<−0.30 ∧ NDSI>0.05 ∧ BSI>0.10. This is the source of PWCI 81.5% / ASAI 77.8% / OBEC 66.7% (2026-03-28, n=27).
- **Interactive viewer calibration** (`src/indices.js` + Permian preset): PWCI τ=0.10/0.30/2.0 with ×2/×2 gains, hard BSI mask, cubic (raw×20)³ stretch; ASAI dry gate hardened 2026-06-07/08 to NDSI>0.15, BSI>0.52, smoothness<−0.42, 0.60 floor. Precision-first; renders blank at many pipeline-detected sites.

**Why:** QC (`reports/preprint_qc_2026-07-19.md`) found the May-2026 preprint published a PWCI formula that was a splice of both (never benchmarked as written), unsupported false-positive numbers (42.3%/0.04% — no negative-sampling run exists), an untraceable "27 TRRC-verified" dataset (`data/rrc_spills.json` self-describes as a curated snapshot with generalized coordinates), and §5 eco formulas matching no code version. Removing/qualifying these protects the publication's credibility.

**Follow-ups:** (1) ~~run a background/false-positive study~~ and (2) ~~measure viewer-calibration FP~~ **BOTH DONE 2026-07-19.** Scripts: `execution/sample_background.py` (150 Permian background points, raw bands persisted), `summarize_false_positives.py` (pipeline), `score_viewer_calibration.py` (faithful port of shipped src/indices.js evalscripts, Permian preset).

**KEY FINDING — neither shipped calibration discriminates:**
- Pipeline calibration: recall PWCI 81.5% / ASAI 77.8% / OBEC 66.7%, but FP PWCI **96.7%** / ASAI **71.3%** / OBEC **71.3%** (median PWCI background score = 1.000). Fires almost everywhere.
- Viewer calibration: FP **0.0%** on all three (max rendered PWCI across 150 pts = 0.00000), but renders blank at all 11 verified spill sites too. Fires almost nowhere. Mechanism: strict triple-gate (HMRI>2.0) + cubic stretch + 0.05 blank gate crush everything; only 10/150 points even clear the raw gate and none survive the stretch.
- Conclusion: Limn's flagship composites do not yet achieve useful recall AND low FP in any shipped config. Whitepaper §7/§8 repositioned to "experimental screening methodology, not validated detector."

**Threshold sweep DONE 2026-07-20** (`execution/sweep_thresholds.py`, `reports/threshold_sweep_2026-07-20.md`) — fetched raw bands for all 32 TRRC records (`fetch_spill_bands.py` → `spill_bands.csv`), swept PWCI's 3 internal gates (1,224 combos) + per-index ROC frontier at fixed thresholds.

**VERDICT — no discriminating calibration exists:** PWCI best operating point ~19% recall / ~9% FP, continuous-score Youden's J ≈ 0.00 (the 81.5% "recall" was firing on 97% of background). Best of any composite = ASAI ~53% recall / ~30% FP. The "middle calibration probably exists" hypothesis is refuted: these S2 bands at 500 m single-scene scale do not separate produced water from Permian caliche at any threshold. Bounded negative result (leaves higher-res/temporal/SAR/hyperspectral open).

**CORRECTION:** earlier "LBI 63% recall at 1.3% FP" was a threshold-mismatch error (recall at t=0.01 where FP=86%, paired with FP at t=0.08 where recall=9%). At fixed thresholds LBI peaks ~22%/20%. `summarize_false_positives.py` now warns against pairing its columns. This also withdrew earlier option (c) "reframe around indices that work" — none discriminate well.

**Recommendation to author = (a):** publish as an honest, earned negative-result / methodology paper (scope claim to S2/500 m/single-scene; multi-gate architecture + verified-site program + rigorous spectral-limit demonstration are the contribution). Still open: attach real RRC incident IDs; explore a different sensing modality if a detector is wanted.

**Author positioning decision (surfaced, not mine to make):** publish as honest work-in-progress/negative-result methodology (a); hold distribution until a discriminating calibration exists (b); or reframe around the indices/verified-site program that do work (c). See QC report "Author decision needed".

---

## Canonical remote is globe-and-atlas/limn (2026-07-19)

**Decision:** `public` (<https://github.com/globe-and-atlas/limn>) is the legit/canonical remote; `origin` (dbally-gis/limn) is legacy. Local `main` now tracks `public/main`, so plain `git push` / `git pull` go to globe-and-atlas.

**Why:** Owner confirmed globe-and-atlas/limn is the authoritative copy; origin had drifted and is no longer the publication home.

**How applied:** `git branch -u public/main` set on 2026-07-19. Push to `origin` only if explicitly asked.

---

## Atlas LinkedIn guidance stays inside the info panel (2026-06-23)

**Decision:** Add LinkedIn-caliber Ground Truth guidance as a selected-index info-panel section instead of creating a new Atlas category or navigation lane.

**Why:** The useful editorial habit is not taxonomy; it is making each renderable index explain one image, one observation, one reason it matters, and one open question. Keeping it inside the selected-index panel makes Atlas teach the posting format without changing the scientific catalog.

**How applied:** `atlas.html` exposes the LinkedIn Ground Truth card, and `src/atlas-app.js` derives the visual anchor, observation, interpretation, question, and copyable draft from existing index metadata.

---

## Atlas WMS source switch stays session-scoped (2026-06-16)

**Decision:** Let Limn Atlas switch between the configured Copernicus WMS endpoint and the Sentinel Viewer WMS endpoint at runtime through the Atlas HUD.

**Why:** The configured account can run out of credits while the viewer endpoint still has usable quota. Editing `config-v1.js` during a live Atlas session is too slow and too easy to get wrong.

**How applied:** `src/atlas-app.js` resolves `configured` and `viewer` WMS sources separately. The source selector changes only the active WMS endpoint; it does not arm Sentinel live tiles or bypass the minimum zoom guard.

---

## S2-only proxy for APEX/HPWI indices

**Decision:** Use Sentinel-2 only evalscripts for APEX and HPWI indices rather than multi-datasource S1+S2 fusion.

**Why:** Sentinel Hub WMS rejects multi-datasource evalscripts (S1+S2) with a 400 error when requesting APEX/HPWI. S2-only proxies produce equivalent detection quality for these indices.

**How applied:** `known-quirks.md` documents this. Evalscript selection logic checks index type before choosing fusion vs S2-only.

---

## Deep Fusion removed (2026-05-23)

**Decision:** Removed the "Radar Confirmation (OBEC & ASAI)" deep fusion checkbox and all associated state/handler code.

**Why:** `deepEvalscript` was never defined on any index in `indices.js`. The `state.deepFusion && cfg.deepEvalscript` branch in `map.js` was always a no-op. The checkbox appeared functional but had zero effect on rendered tiles. Also cleaned up stale `hpwi` key references in `map.js` that survived the HPWI→OBEC/pwoi rename.

**Files changed:** `index.html` (removed checkbox), `src/app.js` (removed state + handler), `src/map.js` (removed dead branch + stale `hpwi` conditions).

---

## Dry brine mode as parallel formula path (not replacement)

**Decision:** Add a dry-brine detection path to APEX and HPWI as a `max(wet, dry)` complement, not a conditional branch that replaces the wet formula.

**Why:** Replacing the wet formula would break detection for standing water bodies (e.g. Lake Boehmer, 60-acre saltwater lake — APEX 0.843 wet mode). A `max()` over both paths preserves all existing detections while recovering dry/evaporated sites. Triggered only when all three dry conditions hold (NDWI < −0.30, NDSI > 0.05, BSI > 0.10) to minimize false positives.

**Validation delta (2026-03-28):** APEX 29.6% → 77.8% (+48 pp), HPWI 14.8% → 66.7% (+52 pp).

**Open risk:** Dry-mode NDSI > 0.05 gate may fire on natural high-NDSI caliche. False positive rate on non-spill control sites not yet measured. Do not trust dry-mode scores in isolation without PWI cross-confirmation.

---

## Soft BSI weight for PWI (floor at 0.3)

**Decision:** Replace the hard BSI gate (`if bsi <= 0.01 return 0`) with a soft weight `bsi_weight = clamp(bsi × 5.0 + 0.3, 0.3, 1.0)`.

**Why:** TRRC spill records use parcel centroid coordinates, not the exact spill GPS. A 500m bbox around a centroid frequently captures mixed caliche + vegetation pixels, depressing BSI near zero even at confirmed spill sites. The hard gate produced 0% PWI detection on the 2026-03-08 validation run.

**How applied:** `pwi = pow(pwi_base × 50.0, 1.2) × bsi_weight`. Floor of 0.3 ensures a centroid mis-hit doesn't zero the full score; sites with strong spill chemistry still reach 1.0 via the cubic scaling.
