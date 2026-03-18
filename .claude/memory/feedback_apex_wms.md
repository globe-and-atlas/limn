---
name: No deep fusion evalscript for APEX or HPWI
description: WMS cannot handle multi-datasource evalscripts — APEX and HPWI must use S2-only optical proxy
type: feedback
---

Never add `deepEvalscript` using `genDeepFusionEvalscript` to APEX or HPWI in indices.js.

**Why:** Sentinel Hub WMS rejects multi-datasource evalscripts (simultaneous S1+S2) with HTTP 400. This was the root cause of APEX loading failures when the Radar Confirmation toggle was on.

**How to apply:** APEX and HPWI always use the S2-only optical proxy evalscript (`genEvalscript`). The `deepFusion` state flag has no effect on these indices — do not branch on it when building their WMS layers.
