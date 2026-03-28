# Session State — sentinel-explorer

## Last Known State

Spectral index library validated. 2026-03-08 validation run: FBC/HPWI/PWI detection rates documented in `knowledge/procedural/validation-summary.md`. WMS deep-fusion S1+S2 evalscripts blocked for APEX/HPWI — use S2-only proxy. Auth via CDSE OAuth2.

## Active Checkpoints

### 2026-03-28 — Karpathy loop iteration 1 complete
- Added: execution/optimize_thresholds.py, execution/sweep_dates.py (new)
- Fixed: execution/evaluate_validation.py (full rewrite, all indices)
- Fixed: execution/batch_analyze_spills.py — APEX/HPWI dry brine mode; --spills/--output/--force args; bsi/ndsi/ndvi moved to shared intermediates
- Added: data/verified_spills.json — 8 sourced spill sites with GPS coordinates
- Added: .claude/agents/calibration-agent.md
- Root cause found: APEX/HPWI zeroed for dry Permian Basin bare soil (NDWI -0.4 kills norm_smooth)
- Fix: dry brine mode — NDWI<-0.30 + NDSI>0.05 + BSI>0.10 triggers NDSI×BSI product formula
- Results: APEX 29.6%→77.8%, HPWI 14.8%→66.7%, composite 38.1%→55.2%
- Apache-Balmorhea: still 0 — date is July 2020, NDSI 0.029 too low; needs sweep_dates on 2021+ imagery
- Next: run sweep_dates.py on verified_spills.json; add control sites to measure false positive rate on non-spill caliche
