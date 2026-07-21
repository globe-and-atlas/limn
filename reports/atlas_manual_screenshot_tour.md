# Limn Atlas Manual Screenshot Tour — v2

Updated: 2026-07-20

Purpose: compose article-ready Globe & Atlas images for the six recommended Atlas leads. This replaces the June tour: SF-EII is retired from live rendering, RRFI remains only moderate, and EPDI now uses the event-aligned Pajaro bookmark.

## Setup

- Open `atlas.html`.
- Select the listed acronym.
- Use the listed bookmark date, a 15-day window, and 30% cloud cover.
- Turn on Sentinel WMS and wait for the overlay to finish.
- Use Capture → Split for the clearest context-versus-proxy image.
- Treat the bookmark date as a WMS-window endpoint. Use the acquisition timestamp below in technical captions.

Recommended frames: one regional overview, one bookmark frame, one detail, and one true-color context frame.

## Tour

| Stop | Index | Place | Coordinates | Bookmark date | Zoom | Acquisition (UTC) |
|---:|---|---|---|---|---:|---|
| 1 | BH-DFSI | Montecito corridor, California | 34.4400, -119.6300 | 2018-01-24 | 13 | 2018-01-22T18:54:21.026Z |
| 2 | LFMPI | Angeles National Forest, California | 34.2800, -118.0200 | 2021-08-01 | 11 | 2021-08-01T18:29:21.024Z |
| 3 | PETI | Western Lake Erie | 41.6600, -83.1900 | 2019-08-01 | 10 | 2019-08-01T16:28:39.024Z |
| 4 | EPDI | Pajaro River, California | 36.9000, -121.7500 | 2023-03-17 | 11 | 2023-03-15T18:51:39.024Z |
| 5 | EC-ACI | Phoenix, Arizona | 33.4500, -112.0700 | 2021-07-20 | 11 | 2021-07-16T18:09:21.024Z |
| 6 | TDR-ASI | Cerro de Pasco, Peru | -10.6900, -76.2600 | 2021-08-01 | 11 | 2021-07-24T15:17:09.024Z |

## 1. BH-DFSI — Montecito

Formula shown in Atlas: `max(0,0.15−NBR) × max(0,BSI+0.1) × max(0,0.35−NDVI)`.

Frame the drainage corridor below the Thomas Fire burn scar. The story is post-fire exposed-surface context after the Montecito event. Do not call the output slope, rainfall, susceptibility, or an official debris-flow boundary.

## 2. LFMPI — Angeles National Forest

Formula shown in Atlas: `FuelGate × WaterReject × (1−NDMI)/2`.

Keep chaparral texture and terrain visible. This is the clearest article replacement for retired SF-EII because the formula direction is stable and transparent. Describe it as a normalized canopy-moisture-deficit proxy—not percent live-fuel moisture or ignition risk.

## 3. PETI — Western Lake Erie

Formula shown in Atlas: `WaterGate × max(0,NDCI × RedEdgeContrast × 8)`.

Use a wide western-basin frame, then a closer bloom-shape detail. Describe red/red-edge bloom context. Sentinel-2 lacks a dedicated phycocyanin band here, and the image does not identify species, toxin concentration, or drinking-water safety.

## 4. EPDI — Pajaro River

Formula shown in Atlas: `0.5 × BareSurfaceHeuristic + 3 × TurbidityContrast × WaterGate`.

Center the Pajaro floodplain and levee-breach context. The live formula is same-scene bare-surface plus water contrast; it does not calculate upslope/downstream routing, change, or persistence.

## 5. EC-ACI — Phoenix

Frame a recognizable urban-to-desert gradient with enough vegetation contrast to make exposed surfaces legible. Use “heat-vulnerability surface context.” Sentinel-2 optical reflectance is not a land-surface-temperature retrieval and does not measure health outcomes.

## 6. TDR-ASI — Cerro de Pasco

Formula shown in Atlas: `max(0,RedBlueContrast−0.05) × max(0,B11/B12−1) × 3`.

Center the mine and tailings terrain. Describe an iron/SWIR mining-surface proxy. Do not identify jarosite, sulfate, acidity, or a tailings-release boundary from this image alone.

## Caption template

> Limn Atlas [ACRONYM] screening proxy over [place]. Bookmark window ending [date]; representative Sentinel-2 acquisition [timestamp UTC]. The overlay shows [measured optical context], not [excluded causal or accuracy claim]. Event/place context: [source].

## Source and capture notes

- Scene timestamps were resolved through CDSE STAC during the 2026-07-20 capture audit.
- Capture manifest: `.tmp/atlas_article_captures/20260720-v2-audit/manifest.json`.
- Review: `reports/atlas_article_candidate_review_2026-07-20.md`.
- Strong overlay means visually legible at the selected bookmark; it does not mean independently validated.
