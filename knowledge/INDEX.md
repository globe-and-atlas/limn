# Knowledge Index — Sentinel Explorer

## Domain Knowledge
- [architecture.md](domain/architecture.md) — Module structure, data flow, global state, key patterns
- [spectral-indices.md](domain/spectral-indices.md) — All indices, evalscript logic, band combinations, calibration presets
- [spectral-indices-full.md](domain/spectral-indices-full.md) — Full architecture reference: all indices with formulas, evalscripts, citations, delta logic
- [api-contracts.md](domain/api-contracts.md) — Sentinel Hub WMS, Statistics API, CDSE Auth, RRC GeoJSON schema
- [known-quirks.md](domain/known-quirks.md) — Non-obvious behaviors and intentional design decisions
- [novelty-review.md](domain/novelty-review.md) — 2026-05-20 review removing exclusive novelty/authorship claims from custom index docs

## Procedural Knowledge
- [debugging.md](procedural/debugging.md) — How to diagnose tile load failures, auth errors, evalscript bugs
- [adding-index.md](procedural/adding-index.md) — Step-by-step: adding a new spectral index end-to-end
- [validation-summary.md](procedural/validation-summary.md) — 2026-03-08 validation run: FBC/HPWI/PWI detection rates on 32 RRC spill sites

## Session & Decisions
- [SESSION.md](SESSION.md) — Active session state and last known state
- [DECISIONS.md](DECISIONS.md) — Architecture decisions (S2-only proxy for APEX/HPWI)

## Error Log
- [ERRORS.md](ERRORS.md) — Chronological bug log with root causes and fixes
