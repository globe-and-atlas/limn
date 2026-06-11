# Knowledge Index — Sentinel Explorer

## Domain Knowledge
- [architecture.md](domain/architecture.md) — Module structure, data flow, global state, key patterns
- [spectral-indices.md](domain/spectral-indices.md) — 2026-06-08 current index registry, evalscript logic, band combinations, calibration presets, and produced-water render opacity guards
- [spectral-indices-full.md](domain/spectral-indices-full.md) — Full architecture reference: all indices with formulas, evalscripts, citations, delta logic
- [api-contracts.md](domain/api-contracts.md) — Sentinel Hub WMS, Statistics API, CDSE Auth, RRC GeoJSON schema
- [deps.md](domain/deps.md) — 2026-06-07 Node browser-test dependency notes
- [known-quirks.md](domain/known-quirks.md) — Non-obvious behaviors and intentional design decisions
- [novelty-review.md](domain/novelty-review.md) — 2026-05-24 update verifying the absolute novelty boundaries of all flagship composites via OpenAlex and arXiv literature reviews
- [verified-spill-candidates.md](domain/verified-spill-candidates.md) — 2026-06-08 source-review ledger for produced-water spill candidates promoted, rejected, or held for exact coordinates


## Procedural Knowledge
- [debugging.md](procedural/debugging.md) — How to diagnose tile load failures, auth errors, evalscript bugs
- [adding-index.md](procedural/adding-index.md) — Step-by-step: adding a new spectral index end-to-end
- [validation-summary.md](procedural/validation-summary.md) — 2026-03-08 validation run: FBC/HPWI/PWI detection rates on 32 RRC spill sites
- [ui-layouts.md](procedural/ui-layouts.md) — 2026-06-08 notes on retired top bookmark rail, embedded bookmark locations, and desktop-first Produced Water Screen Spill flow
- [public-doc-voice.md](procedural/public-doc-voice.md) — 2026-05-24 guidance separating public science language from private ownership notes
- [atlas_viewer_validation.md](procedural/atlas_viewer_validation.md) — 2026-06-07 validation checklist for Limn Atlas WMS config, catalog metadata, search, and browser smoke tests
- [limn_spill_bookmark_qc.md](procedural/limn_spill_bookmark_qc.md) — 2026-06-07 source/date/precision validation for Permian produced-water spill bookmarks
- [limn_hotspot_loop.md](procedural/limn_hotspot_loop.md) — 2026-06-07 Karpathy-loop workflow for measured produced-water bookmark/index refinement
- [atlas_hotspot_loop.md](procedural/atlas_hotspot_loop.md) — 2026-06-07 Karpathy-loop workflow for measured Atlas bookmark/hotspot refinement
- [shareable_sentinel_only.md](procedural/shareable_sentinel_only.md) — 2026-06-10 launch and verification notes for the Sentinel-only Produced Water share view

## Session & Decisions
- [SESSION.md](SESSION.md) — Active session state and last known state
- [DECISIONS.md](DECISIONS.md) — Architecture decisions (S2-only proxy for APEX/HPWI)
- [REFLECTIONS.jsonl](REFLECTIONS.jsonl) — Session reflections for significant work

## Error Log
- [ERRORS.md](ERRORS.md) — Chronological bug log with root causes and fixes
