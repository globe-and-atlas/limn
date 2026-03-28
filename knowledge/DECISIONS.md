# Architecture Decisions — sentinel-explorer

## S2-only proxy for APEX/HPWI indices

**Decision:** Use Sentinel-2 only evalscripts for APEX and HPWI indices rather than multi-datasource S1+S2 fusion.

**Why:** Sentinel Hub WMS rejects multi-datasource evalscripts (S1+S2) with a 400 error when requesting APEX/HPWI. S2-only proxies produce equivalent detection quality for these indices.

**How applied:** `known-quirks.md` documents this. Evalscript selection logic checks index type before choosing fusion vs S2-only.

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
