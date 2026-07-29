# Limn Atlas — Globe & Atlas Article Candidate Review

Generated: 2026-07-20

## Verdict

The current six-story lead set is suitable for Globe & Atlas articles after replacing retired SF-EII with LFMPI and replacing moderate RRFI with EC-ACI. All six are primary methods inside distinct capability families, with strong public-WMS overlays, defensible context, and a representative Sentinel-2 acquisition resolved through CDSE STAC.

| Lead | Capability family | Role | Story | Bookmark window end | Representative acquisition (UTC) | Cloud | Caption boundary |
|---|---|---|---|---|---|---:|---|
| BH-DFSI | Fire Effects & Recovery | Primary | Montecito post-fire surface context | 2018-01-24 | 2018-01-22T18:54:21.026Z | 0.00% | Surface-context proxy, not debris-flow susceptibility or an official inundation boundary |
| LFMPI | Fuel Moisture Context | Primary | Angeles NF canopy moisture deficit | 2021-08-01 | 2021-08-01T18:29:21.024Z | 0.09% | NDMI-deficit proxy, not percent LFMC or fire probability |
| PETI | Aquatic Blooms & Pigments | Primary | Western Lake Erie bloom context | 2019-08-01 | 2019-08-01T16:28:39.024Z | 0.00% | Bloom context, not species identity, phycocyanin concentration, or toxin risk |
| EPDI | Water Condition & Plumes | Primary | Pajaro levee-breach sediment context | 2023-03-17 | 2023-03-15T18:51:39.024Z | 6.90% | Same-scene bare/water contrast, not routed sediment delivery or persistence |
| EC-ACI | Urban Surface Condition | Primary | Phoenix exposed-surface heat context | 2021-07-20 | 2021-07-16T18:09:21.024Z | 16.71% | Optical heat-vulnerability context, not land-surface temperature or health outcome |
| TDR-ASI | Mining Surfaces & Risk | Primary | Cerro de Pasco mining-area context | 2021-08-01 | 2021-07-24T15:17:09.024Z | 0.00% | Iron/SWIR surface context, not mineral identification or a mapped tailings release |

## 2026-07-25 amendment — EC-ACI water gate and ramp controls

The live EC-ACI formula now includes an explicit water rejection gate:
`WaterReject × max(0, 0.4 − NDVI) × max(0, MSI − 0.8) × 3`.

Use EC-ACI language as water-rejected low-canopy/dry-surface context. The gate is intended to keep canals, ponds, and rivers from rendering as high dry-surface score; it is not a water classifier, impervious-surface classifier, land-surface-temperature retrieval, or heat-island-intensity measurement.

The current EC-ACI bookmark endpoint is `2021-07-05`, replacing `2021-07-20` after a no-data gap was found in the older WMS render. The revised-date acquisition timestamp is not yet verified, so do not reuse the `2021-07-16T18:09:21.024Z` timestamp from the July 20 capture audit for new captions.

Atlas also now has a HUD `Ramp` selector for screenshot legibility. Non-native ramps change overlay colors only; they do not change the index formula, date, provider, cloud tolerance, or Sentinel search window.

## Seed framing rule

Open each article with the environmental question and location, then identify the displayed formula as the family's primary Atlas method. Explain one sibling variant or component only when it reveals a useful limitation. Never turn sibling methods into multiple novelty claims, and never describe a family assignment as validation.

## Catalog-wide bookmark audit

- Live layers audited: 37.
- Strong at the retained date after updates: 35.
- Moderate: RRFI and MP-PDI.
- Weak, blank, or erroring: 0.
- Strong overlay is an editorial-legibility measure only; it is not detector validation.

Date changes adopted:

- TFIDI: `2021-10-01` → `2021-08-17` (moderate → strong in the date sweep).
- IPVSI: `2021-10-01` → `2021-09-01` (moderate → strong in the date sweep).

Dates intentionally not changed:

- RRFI remains `2021-05-18`; the tested alternatives did not improve it beyond moderate.
- MP-PDI remains `2021-06-02` because it is event-aligned to the X-Press Pearl spill; a brighter pre-event date would weaken the article’s event logic.

## Timestamp rule

Atlas `bookmark.date` is the end of a 15-day WMS search window. The actual acquisition timestamp must come from the capture sidecar/CDSE STAC record. Article captions should list both values when the distinction matters.

## Evidence rule

External sources establish event or place context. Atlas imagery shows what the implemented proxy rendered over that context. Neither one, alone or together, establishes accuracy, causation, or an official boundary.
