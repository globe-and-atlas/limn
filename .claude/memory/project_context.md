---
name: Sentinel Explorer — project context
description: Core facts about Sentinel Explorer for auto-loading each session
type: project
---

**Project:** Sentinel Explorer
**Purpose:** Browser-based GIS tool for visualizing Sentinel-2 (and some S1) satellite imagery over the Permian Basin to detect produced water spills, vegetation stress, and brine contamination via spectral indices.
**Stack:** Vanilla JS ES modules, Leaflet 1.9, Chart.js, Sentinel Hub WMS + Statistics API (CDSE). No build step — plain HTML/JS/CSS served statically.
**Deploy:** Static files, opened via `open index.html` locally. GitHub repo: dbally-gis/sentinel-explorer.
**Owner:** Daniel Bally

**Key constraints:**
- Sentinel Hub WMS only supports single-datasource evalscripts — never use `genDeepFusionEvalscript` for WMS layers (causes HTTP 400)
- APEX and HPWI are S2-only optical proxies — they do NOT use actual Sentinel-1 data. Labels must reflect this.
- Statistics API (FIS scan) returns bands by position (B0, B1, B2…) — band order in evalscript return array is the source of truth
- Rate limit: 429s from Sentinel Hub handled by RateLimitedWMS (max 4 concurrent, retry 3x with 2s backoff)
- Cache busting: bump `?v=NN` in all 4 script tags in index.html when deploying changes
- `probeAcquisitions` catalog API uses limit=100 — do NOT hide date options without catalog results (would truncate date range to Dec 2025)
- `ALL_DATES` built from START_YEAR=2020 to today — ~2,200+ daily entries

**Out of scope:**
- True S1+S2 Process API fusion (would require OAuth2 proxy + custom GridLayer — assessed but not implemented)
- Server-side processing or build pipeline
