# Limn Atlas Manual Screenshot Tour

Purpose: a manual shooting guide for article images of six Limn Atlas indices. Use this when the automated exports are too flat and you want to compose the screenshots by eye in the Atlas UI.

Generated: 2026-06-13

## Manual Setup

Open `atlas.html` in Limn Atlas.

For each stop:
- Select the index by acronym in the sidebar search.
- Set the date exactly as listed.
- Set the window to `15d`.
- Set cloud to `30%` first.
- Set opacity around `0.75` to `0.90`.
- Turn on `Sentinel WMS`.
- Set the Sentinel zoom gate to `Z10+` or lower, because several tour stops sit at zoom 10 or 11. If the map says Sentinel is guarded below the zoom gate, lower the gate or zoom in.
- Wait until the tile status is no longer loading.
- If the overlay is blank, try cloud `60%` or `80%` before changing the date.

Recommended screenshots per stop:
- `01_overview`: zoom one level out from the bookmark.
- `02_bookmark`: exact bookmark zoom.
- `03_detail`: zoom one level in, or zoom to `14` if you want crisper local texture.
- `04_context`: same bookmark, but lower opacity or switch to base imagery/context for a clean locator image.

## Quick Tour Table

| Stop | Index | Article Place | Coordinates | Date | Window | Zoom | Why Here |
|---:|---|---|---|---|---|---:|---|
| 1 | BH-DFSI | Montecito corridor, California | `34.4400, -119.6300` | `2018-01-24` | `2018-01-09/2018-01-24` | 13 | Post-Thomas Fire debris-flow corridor with strong burn, soil, moisture, and slope signal. |
| 2 | SF-EII | Yosemite area, California | `37.7700, -119.5700` | `2021-08-01` | `2021-07-17/2021-08-01` | 11 | Drought-stressed Sierra vegetation during the 2021 California dry season. |
| 3 | PETI | Western Lake Erie | `41.6600, -83.1900` | `2019-08-01` | `2019-07-17/2019-08-01` | 10 | Bloom-prone western basin water with a clear algae/scum target. |
| 4 | EPDI | Missouri River floodplain | `38.9800, -92.3100` | `2019-02-16` | `2019-02-01/2019-02-16` | 11 | Flood-season turbidity and erosion-delivery signal. User wrote EDPI; Atlas key is `epdi`. |
| 5 | RRFI | Rio Grande riparian corridor, New Mexico | `35.6900, -105.9500` | `2021-05-18` | `2021-05-03/2021-05-18` | 11 | Drought-stressed riparian corridor with channel moisture decline and exposed banks. |
| 6 | TDR-ASI | Cerro de Pasco, Peru | `-10.6900, -76.2600` | `2021-08-01` | `2021-07-17/2021-08-01` | 11 | Active mining/tailings terrain with jarosite/sulfate-style staining context. |

## Stop 1 - BH-DFSI

Index: `BH-DFSI`

Name: Burnt Hillside Debris-Flow Susceptibility Index

Atlas key: `bhdfsi`

Coordinates: `34.4400, -119.6300`

Bookmark label: Montecito corridor - post-flow peak debris signal

Date: `2018-01-24`

WMS window: `2018-01-09/2018-01-24`

Suggested zooms:
- Overview: `12`
- Bookmark: `13`
- Detail: `14`

Formula: `BurnGate x SoilGate x MoistureProxy x ChromaticSlope`

What to frame:
- Start around the Montecito corridor below the Thomas Fire burn scar.
- For the article hero, frame the drainage corridor horizontally with the burned hills above it.
- In the detail shot, look for concentrated warm/orange signal along channels and disturbed slopes.

Why this stop is defensible:
- Atlas QC selected `2018-01-24` at zoom 13 with strong visible and high-signal coverage.
- The physics require co-occurrence of burn severity, exposed soil, moisture proxy, and slope chromatism, which matches the post-fire debris-flow use case.

External resource:
- USGS Montecito debris-flow data: https://www.usgs.gov/data/debris-flow-inundation-and-damage-data-9-january-2018-montecito-debris-flow-event

Satellite scene metadata from CDSE STAC:
- Platform: `sentinel-2a`
- Acquisition: `2018-01-22T18:54:21.026Z`
- Item ID: `S2A_MSIL2A_20180122T185421_N0500_R070_T11SKU_20230718T005408`
- Cloud cover: `0.0%`

Caption angle:
This is the most straightforward disaster-risk stop: a post-fire catchment where slope, exposed soil, and recent debris-flow context all point in the same direction.

## Stop 2 - SF-EII

Index: `SF-EII`

Name: Wildfire Fuel Hazard and Canopy Dehydration Index

Atlas key: `sfeii`

Coordinates: `37.7700, -119.5700`

Bookmark label: Yosemite area - pre-fire fuel mapping

Date: `2021-08-01`

WMS window: `2021-07-17/2021-08-01`

Suggested zooms:
- Overview: `10`
- Bookmark: `11`
- Detail: `12` or `13`

Formula: `[(B8A-B11)/(B8A+B11)] x [1-(B08/B12)]`

What to frame:
- Find a composition with forest texture, exposed granite, and dry vegetation contrast.
- Avoid making the whole frame a uniform wash. Use opacity around `0.70` if the overlay gets too loud.
- The best article shot is probably an oblique-looking forest/terrain texture, not a pure heatmap wall.

Why this stop is defensible:
- The index targets canopy water stress using SWIR and red-edge/NIR behavior.
- The selected date sits inside peak summer dryness during California's severe 2021 drought.

External resource:
- US Drought Monitor: https://droughtmonitor.unl.edu/

Satellite scene metadata from CDSE STAC:
- Platform: `sentinel-2a`
- Acquisition: `2021-07-25T18:39:21.024Z`
- Item ID: `S2A_MSIL2A_20210725T183921_N0500_R070_T11SKC_20230128T150015`
- Cloud cover: `22.5%`

Caption angle:
Use this as a fuel-moisture and pre-ignition-risk image. The reference supports drought context; the screenshot should carry the local visual evidence.

## Stop 3 - PETI

Index: `PETI`

Name: Phycocyanin Eutrophication Toxicity Index

Atlas key: `peti`

Coordinates: `41.6600, -83.1900`

Bookmark label: Lake Erie - western algae bloom

Date: `2019-08-01`

WMS window: `2019-07-17/2019-08-01`

Suggested zooms:
- Overview: `9`
- Bookmark: `10`
- Detail: `11` or `12`

Formula: `NDCI x RedEdge slope x water gate x persistence`

What to frame:
- The western basin of Lake Erie is the subject.
- Try a wide shot first so Toledo, the western basin, and the bloom geometry are legible.
- Then zoom into the strongest yellow/green bloom mass for the article detail.

Why this stop is defensible:
- Western Lake Erie is a known cyanobacteria bloom setting.
- PETI is built around a virtual phycocyanin proxy: red-edge slope behavior, NDCI, and water gating.
- The selected date has a strong Sentinel-2 scene with low cloud cover.

External resource:
- Lake Taihu bloom science review, useful for phycocyanin and cyanobacterial bloom context: https://pmc.ncbi.nlm.nih.gov/articles/PMC4142240/

Satellite scene metadata from CDSE STAC:
- Platform: `sentinel-2b`
- Acquisition: `2019-08-01T16:28:39.024Z`
- Item ID: `S2B_MSIL2A_20190801T162839_N0500_R083_T17TKG_20230702T111055`
- Cloud cover: `0.0%`

Caption angle:
This is likely the easiest image to make compelling. Let the bloom shape be the story; keep the overlay enough to reveal the signal without hiding the water.

## Stop 4 - EPDI

Index: `EPDI`

Name: Erosion Pulse Delivery Index

Atlas key: `epdi`

Note: You wrote `EDPI`; the Atlas key and acronym are `EPDI`.

Coordinates: `38.9800, -92.3100`

Bookmark label: Missouri River post-flood turbidity

Date: `2019-02-16`

WMS window: `2019-02-01/2019-02-16`

Suggested zooms:
- Overview: `10`
- Bookmark: `11`
- Detail: `12`

Formula: `BSI_upslope_change x turbidity_downstream x persistence`

What to frame:
- Keep the Missouri River channel visible in the image.
- Look for the strongest contrast between water/turbidity corridors and surrounding floodplain or bare-soil textures.
- If the scene edge or nodata triangle intrudes, pan slightly while keeping the river corridor central.

Why this stop is defensible:
- Atlas QC selected `2019-02-16` as the strong proof date for the Missouri River floodplain target.
- EPDI is intended to show the delivery link: exposed/bare sediment source plus downstream turbidity signal.

External resource:
- California DWR Pajaro flood response, used as a phenomenon reference for erosion/flood response rather than the exact Missouri River location: https://water.ca.gov/News/Blog/2023/Mar-23/Pajaro-Flood-Response

Satellite scene metadata from CDSE STAC:
- Platform: `sentinel-2a`
- Acquisition: `2019-02-16T17:04:01.024Z`
- Item ID: `S2A_MSIL2A_20190216T170401_N0500_R069_T15SWD_20221126T132911`
- Cloud cover: `35.51%`

Caption angle:
Phrase this as a sediment-delivery proxy over a floodplain, not as proof of one specific documented disaster site. The screenshot is the local evidence; the reference supports the general use case.

## Stop 5 - RRFI

Index: `RRFI`

Name: Riparian Refuge Failure Index

Atlas key: `rrfi`

Coordinates: `35.6900, -105.9500`

Bookmark label: Rio Grande riparian corridor NM

Date: `2021-05-18`

WMS window: `2021-05-03/2021-05-18`

Suggested zooms:
- Overview: `10`
- Bookmark: `11`
- Detail: `12`

Formula: `NDVI_riparian_loss x NDWI_channel_decline x BSI_bank_exposure`

What to frame:
- Center the river corridor.
- Keep enough surrounding land in view so riparian contrast reads clearly.
- If the overlay is subtle, use a closer detail shot and keep the opacity high.

Why this stop is defensible:
- The index combines riparian vegetation decline, channel moisture decline, and exposed bank/bare-soil behavior.
- Atlas QC selected this date as a strong target for the Rio Grande corridor during drought stress.

External resource:
- National Park Service Rio Grande flow context: https://www.nps.gov/bibe/learn/nature/rio-grande.htm

Satellite scene metadata from CDSE STAC:
- Platform: `sentinel-2a`
- Acquisition: `2021-05-11T17:49:11.024Z`
- Item ID: `S2A_MSIL2A_20210511T174911_N0500_R141_T13SCV_20230312T182635`
- Cloud cover: `2.49%`

Caption angle:
Use this as the ecological-health stop in the tour: a river corridor losing moisture and vegetation refuge function.

## Stop 6 - TDR-ASI

Index: `TDR-ASI`

Name: Tailings Dam Runout and Acid Silt Index

Atlas key: `tdrasi`

Coordinates: `-10.6900, -76.2600`

Bookmark label: Cerro de Pasco Peru - mining tailings

Date: `2021-08-01`

WMS window: `2021-07-17/2021-08-01`

Suggested zooms:
- Overview: `10`
- Bookmark: `11`
- Detail: `12` or `13`

Formula: `jarosite_signal x sulfate_absorption x mine_proximity_weight`

What to frame:
- Center the mine/tailings terrain, then pan until the scene edge/nodata border is out of frame if possible.
- The detail shot should focus on stained or disturbed mine surfaces, not an overly wide landscape view.
- This one benefits from manual framing more than most of the automated exports.

Why this stop is defensible:
- Cerro de Pasco is visually and materially aligned with the index target: mining, tailings, acid drainage, sulfate/iron staining context.
- The index is a forensic tailings/runout proxy, not a formal incident boundary map.

External resource:
- European Environment Agency Aznalcollar mine accident report, useful as a tailings-failure and acid-silt phenomenon reference rather than the exact Cerro de Pasco location: https://www.eea.europa.eu/publications/92-9167-052-9-sum/page001.html

Satellite scene metadata from CDSE STAC:
- Platform: `sentinel-2b`
- Acquisition: `2021-07-24T15:17:09.024Z`
- Item ID: `S2B_MSIL2A_20210724T151709_N0500_R125_T18LUP_20230214T044040`
- Cloud cover: `0.0%`

Caption angle:
Use this as the industrial/mining close. Be careful with language: "tailings and acid-silt proxy signal" is stronger and safer than claiming a specific mapped spill extent.

## Source And Citation Notes

Primary technical source for map settings: Limn Atlas registry in `src/atlas-indices.js`.

Scene metadata source: public CDSE STAC search, not GEE and not COG.

For article captions, use these labels:
- "Bookmark date" for the Atlas target date.
- "WMS window" for the 15-day Sentinel render window.
- "Acquisition" for the CDSE STAC Sentinel-2 scene selected from that window.

Avoid saying the screenshot proves an official event boundary unless the external source is for the same location and event. BH-DFSI and PETI are the strongest matches. EPDI and TDR-ASI use external resources as phenomenon references, while the Atlas bookmark supplies the visual target.
