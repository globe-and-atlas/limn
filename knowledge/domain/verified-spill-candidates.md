# Verified Produced-Water Spill Candidates

Last updated: 2026-07-24

Use this note when deciding whether a documented spill belongs in `SPILL_BOOKMARKS`.

## 2026-07-24 — User-reported calibration target (unsourced)

- `brine-calibration-31892-2025` — User-reported wet brine activity Nov–Dec 2025 at exact coordinates **lat 31.892457, lng -101.864001** (active Permian oilfield pad cluster, Midland County area). Added to `SPILL_BOOKMARKS` as `produced-water-context` and as a testing/calibration target at the user's explicit request.
  - **Measured (fixed hotspot loop, 2026-07-24, ±45-day sweep across the window):** peak coherent signal is **OBEC (`hpwi`) at 2025-12-01**, ~1.4% largest connected component — pad-scale blobs aligned with the well pads in true color, not a single large release footprint. PWCI/ASAI/LBI blank-to-weak. BPI/FBC/VSI/REAI scored "strong" but are the broad-firing indices flagged in the 2026-07-23 QC (fire at background + the crude control too), so not treated as evidence; VSI was uniform-guard rejected.
  - **Provider caveat:** the OBEC signal is scene/provider dependent — visible via Sentinel WMS but faint on the default COG scene for the same window. Advertised chip is `hpwi` with an explicit note about this.
  - **Provenance:** NO public regulator filing resolved for these coordinates. `sourceUrl` is empty; `execution/qc_limn_spill_bookmarks.py` therefore (correctly) reports this one bookmark as `fail` on the missing-source rule. Not resolved by adding a Copernicus Browser link (disallowed as a numbered source per the 2026-06-16 rule below). **To graduate this from calibration-target to a context/proof bookmark, a public NMOCD/TRRC filing or news/agency source for the Nov–Dec 2025 activity must be found.**

## Promoted in 2026-06-08 Pass

- `black-river-cimarex-2023` — NMOCD/Coterra closure report documents a 2023-10-03 produced-water truck rollover at Black River / John D. Forehand Road. Promoted because OBEC, LBI, and ASAI were measured strong at exact GPS coordinates. Source: https://ocdimage.emnrd.nm.gov/imaging/Filestore/SantaFe/NF/20250224/nAPP2327753740_02_24_2025_11_30_44.pdf
- `matador-desoto-spring-2025` — NMOCD/WildEarth sources document a large Desoto Spring Recycling Pond produced-water release on 2025-09-21. Promoted because OBEC and LBI were measured strong and pond-scale at facility coordinates. Source: https://ocdimage.emnrd.nm.gov/imaging/filestore/SantaFe/NF/20250921/nAPP2526466779_09_21_2025_06_33_33.pdf
- `oxy-lea-flowline-2026` — NMOCD spill database row `nAPP2614556829` documents a 2026-05-24 OXY injection-flowline produced-water release, 942 BBL released / 412 BBL lost, at exact row coordinates. Promoted as ASAI-only because PWCI/OBEC were weak or blank. Source: https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/Spills/SpillSearchResults.aspx?Ogrid=16696&OperatorSearchClause=ogrid
- `oxy-sand-dunes-2026` — NMOCD spill database row `nAPP2611452043` documents a 2026-04-21 OXY Sand Dunes Water Tank produced-water release, 500 BBL released / 160 BBL lost. Kept as `produced-water-context` because the measured signal is BPI tank/facility context rather than chemistry proof. Source: https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/Spills/SpillSearchResults.aspx?Ogrid=16696&OperatorSearchClause=ogrid

Measured artifact: `.tmp/limn_hotspot_loop/20260607-231012_summary.json`.

## Verified But Not Promoted

- `devon-pinnacle-eddy-nm-2021` — NMOCD C-141/local verified dataset documents 7 BBL produced water plus 7 BBL crude at exact GPS coordinates on 2021-09-27. Not promoted because the event-date PWCI/OBEC signal was blank or weak, and the strongest ASAI candidate was pre-event broad terrain context. Source: https://ocdimage.emnrd.nm.gov/imaging/filestore/SantaFe/NF/20220405/nAPP2127347137_04_05_2022_01_51_45.pdf
- `wpx-rdx-federal-2026` — NMOCD spill database row `nAPP2614229487` documents a 2026-05-21 WPX RDX Federal 17 #016H produced-water release, 303 BBL, at exact row coordinates. Not promoted because ASAI was uniform-frame rejected, PWCI/OBEC were blank, and BPI was only moderate/broad context. Source: https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/Spills/SpillSearchResults.aspx?Ogrid=246289&OperatorSearchClause=ogrid
- `murchison-carlsbad-nm-2024` — Local verified dataset has a 2024-12-01 candidate with low coordinate confidence. Not promoted until exact public filing/source coordinates are resolved.
- COG Q1 2025 large produced-water spill — WildEarth Q1 2025 report describes a very large produced-water release, but the exact NMOCD row and coordinates were not resolved in this pass. Backlog only until exact source row is pinned. Source: https://pdf.wildearthguardians.org/site/DocServer/Q1_2025%20_Oil_Gas_Waste_Watch.pdf

## Texas RRC / TRRC Review Rule

Texas RRC/TRRC-adjacent narratives can be source-valid but still fail bookmark-grade requirements if they lack incident IDs, exact coordinates, or a tight event date. The local `data/rrc_spills.json` validation records remain useful for aggregate validation, but they should not be promoted as individual proof bookmarks until each record has:

- a public source URL or regulator filing identifier,
- exact or defensibly bounded coordinates,
- an event date or clearly stated post-event imagery date,
- measured hotspot-loop output showing a non-uniform visible signal.

