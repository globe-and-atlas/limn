---
generated_by: "Claude Code CLI (Fable 5)"
timestamp: "2026-07-20T00:00:00-05:00"
---

# Liquid/Salinity Response Index (LBI) — Preliminary Standing-Water Study

**Result: LBI produced a preliminary standing-water/salinity response, not a validated detector.**
The shipped per-pixel evalscript fired at 2/4 standing-brine sites and on **0/149** caliche and
**0/3** freshwater controls at the >1% coverage bar. Three freshwater controls are insufficient
to establish brine specificity: the brine-versus-freshwater comparison is not statistically
significant (two-sided Fisher exact p≈0.43).

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

**Brine vs. caliche descriptive separation: Youden's J = 0.50** (at coverage >1%: 50% of brine
sites vs 0% of caliche). Because caliche is dry ground, this primarily demonstrates that the
shipped response can distinguish some standing-water pixels from the sampled desert surface;
it does not establish chemical brine specificity.

### Per standing-brine site

| Site | Max pixel | Coverage | Note |
|---|---|---|---|
| Matador Desoto recycling pond | 1.000 | **14.6%** | Strong; **not** the calibration site — independent positive |
| Lake Boehmer brine lake | 0.399 | 4.5% | Fires; but is the app's stated LBI calibration site (circular) |
| Meister Ranch geyser pool | 0.000 | 0.0% | No response — likely no standing water in-scene at event date |
| Toyah well blowout pool | 0.000 | 0.0% | No response — likely no standing pool in-scene at event date |

## Interpretation

- **Observed background behavior is encouraging but bounded.** LBI renders on 0/149 caliche boxes and 0/3 freshwater controls at the >1% coverage bar. The freshwater sample is too small to support a specificity claim.
- **Observed response is incomplete.** LBI fires at 2/4 documented standing-brine sites, including the independent Matador Desoto pond (14.6% coverage). The two misses may reflect absent standing water, but target absence was not independently confirmed and cannot be assumed.
- **Scope of the claim.** The study supports further testing of LBI as a **standing-water/salinity response hypothesis**. It does not validate persistent hypersaline-brine detection and says nothing about diffuse produced-water spills on bare soil.

## Caveats

- Small positive N (4 sites, 2 firing) and especially small freshwater-control N (3). This is an exploratory response study, not a sensitivity, specificity, or accuracy estimate.
- Lake Boehmer is the app's calibration site (circular); the independent evidence rests mainly on the Matador pond hit plus the clean caliche/freshwater specificity.
- Freshwater controls are best-effort regional reservoirs; Balmorhea and Lake Colorado City are clearly fresh, Red Bluff is brackish (and shows only a trace, consistent with partial salinity).

## Recommended next step

Assemble an independent labeled set of at least 20–30 date-confirmed standing-brine positives plus substantial freshwater, brackish, naturally saline, industrial-water, shadow, and wet-soil controls. Pre-register the threshold and failure condition before re-running the per-pixel test. Only then should sensitivity or specificity be estimated.

_Data: `execution/lbi_spatial.csv` (shipped LBI per pixel; 4 brine, 3 freshwater, 149 caliche), `data/brine_validation_sites.json`. Reproduce: `execution/fetch_lbi_spatial.py` + `execution/analyze_lbi_brine.py`._
