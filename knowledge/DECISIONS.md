# Architecture Decisions — sentinel-explorer

## Preprint claims reconciled to pipeline-vs-viewer reality (2026-07-19)

**Decision:** Public docs (PUBLIC_SCIENCE_GUIDE.md, README.md, SENTINEL_SCIENCE_GUIDE.md, help.html) now explicitly distinguish two calibrations and state the detection numbers as recall-only.

- **Validated pipeline calibration** (`execution/batch_analyze_spills.py`): PWCI τ=0.03/0.05/1.1 with ×5/×3 gains and pow(raw×50,1.2)×soft-BSI stretch; ASAI/OBEC dry gate NDWI<−0.30 ∧ NDSI>0.05 ∧ BSI>0.10. This is the source of PWCI 81.5% / ASAI 77.8% / OBEC 66.7% (2026-03-28, n=27).
- **Interactive viewer calibration** (`src/indices.js` + Permian preset): PWCI τ=0.10/0.30/2.0 with ×2/×2 gains, hard BSI mask, cubic (raw×20)³ stretch; ASAI dry gate hardened 2026-06-07/08 to NDSI>0.15, BSI>0.52, smoothness<−0.42, 0.60 floor. Precision-first; renders blank at many pipeline-detected sites.

**Why:** QC (`reports/preprint_qc_2026-07-19.md`) found the May-2026 preprint published a PWCI formula that was a splice of both (never benchmarked as written), unsupported false-positive numbers (42.3%/0.04% — no negative-sampling run exists), an untraceable "27 TRRC-verified" dataset (`data/rrc_spills.json` self-describes as a curated snapshot with generalized coordinates), and §5 eco formulas matching no code version. Removing/qualifying these protects the publication's credibility.

**Follow-ups still open (not code-fixable in this pass):** (1) run an actual background/false-positive study before any FP claim returns; (2) re-validate the shipped viewer calibration against the 11-site exact-coordinate set; (3) attach real RRC incident IDs to the 27-record benchmark or keep it labeled as a development benchmark.

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
