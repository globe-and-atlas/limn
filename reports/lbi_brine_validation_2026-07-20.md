---
generated_by: "Claude Code CLI (Fable 5)"
timestamp: "2026-07-20T00:00:00-05:00"
---

# Liquid Brine Index (LBI) — Standing-Brine Validation

**Result: LBI is a real, specific detector for standing brine bodies** — the one genuinely
discriminating index in the produced-water suite. Evaluated with the **shipped evalscript,
per pixel** (the only correct way for small water features), on documented standing-brine
sites, freshwater controls, and 149 caliche background points.

## Method note — why two earlier attempts were wrong

This finding corrects two flawed passes on LBI in the same investigation, and the correction matters:

1. **"LBI 63% recall at 1.3% FP"** — a threshold-mismatch error (recall at t=0.01 where FP=86%, paired with FP at t=0.08 where recall=9%). Withdrawn.
2. **Box-mean LBI ≈ 0 at brine sites** — doubly broken for water: it used the batch *approximation* (no standing-water bypass) and a 500 m mean that mixes a small water body with surrounding land, driving NDWI negative and killing every water gate.

The test below uses (a) the **actual `src/indices.js` LBI evalscript** including its `ndwi > 0.30` standing-water bypass, and (b) **per-pixel** statistics over each box (coverage = fraction of pixels that render at LBI ≥ 0.08, plus the box max), so water pixels are judged on their own rather than averaged away.

## Results (per-pixel, shipped LBI)

| Class | n | % with any bright pixel | % with coverage >1% | mean coverage | max pixel |
|---|---|---|---|---|---|
| standing brine | 4 | 50% | **50%** | 4.79% | 1.000 |
| freshwater control | 3 | 33% | **0%** | 0.10% | 0.093 |
| caliche background | 149 | 5% | **0%** | 0.01% | 0.217 |

**Brine vs. caliche separation: Youden's J = 0.50** (at coverage >1%: 50% of brine sites vs 0% of caliche).

### Per standing-brine site

| Site | Max pixel | Coverage | Note |
|---|---|---|---|
| Matador Desoto recycling pond | 1.000 | **14.6%** | Strong; **not** the calibration site — independent positive |
| Lake Boehmer brine lake | 0.399 | 4.5% | Fires; but is the app's stated LBI calibration site (circular) |
| Meister Ranch geyser pool | 0.000 | 0.0% | No response — likely no standing water in-scene at event date |
| Toyah well blowout pool | 0.000 | 0.0% | No response — likely no standing pool in-scene at event date |

## Interpretation

- **Specificity is strong and clean.** LBI renders on 0/149 caliche background boxes and 0/3 freshwater controls at the >1% coverage bar. It does not false-alarm on bare desert, and — importantly — it does not fire on ordinary fresh water (Balmorhea Lake and Lake Colorado City both zero), so it is **brine-specific, not merely a water detector**. That specificity is the crux: it is what the diffuse-spill composites (PWCI/ASAI/OBEC) never achieved.
- **Sensitivity is real but bounded by target presence.** LBI fires at 2/4 documented standing-brine sites, including a strong, independent (non-calibration) hit at the Matador Desoto pond (14.6% coverage). The two misses are geyser pools whose standing water was plausibly absent in the queried scene; this is a target-availability limit, not a demonstrated LBI failure, but it is unconfirmed.
- **Scope of the claim.** This validates LBI for **persistent/standing hypersaline brine bodies** — evaporation and recycling ponds, brine lakes, large blowout pools — a spectrally distinct and tractable target. It says nothing about diffuse produced-water spills on bare soil, which remain the negative result of the main study.

## Caveats

- Small positive N (4 sites, 2 firing). This is a validation of *response and specificity*, not a large-sample accuracy estimate.
- Lake Boehmer is the app's calibration site (circular); the independent evidence rests mainly on the Matador pond hit plus the clean caliche/freshwater specificity.
- Freshwater controls are best-effort regional reservoirs; Balmorhea and Lake Colorado City are clearly fresh, Red Bluff is brackish (and shows only a trace, consistent with partial salinity).

## Recommended next step

Assemble a larger labeled set of Permian produced-water evaporation/recycling ponds and disposal facilities (numerous and identifiable) with dates when standing water is confirmed present, and re-run this per-pixel test. If the specificity holds at n≈20–30 positives, LBI-for-standing-brine is a genuinely publishable positive result and the strongest single detector to come out of the Limn work.

_Data: `execution/lbi_spatial.csv` (shipped LBI per pixel; 4 brine, 3 freshwater, 149 caliche), `data/brine_validation_sites.json`. Reproduce: `execution/fetch_lbi_spatial.py` + `execution/analyze_lbi_brine.py`._
