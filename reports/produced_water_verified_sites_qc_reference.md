# Limn Produced-Water Verified Sites QC Reference

Generated: 2026-06-08  
Purpose: internal expert QC reference for Limn produced-water screening bookmarks.

This document separates documented source validity from current Limn demo suitability. A site can be source-valid but still excluded from the click-through demo if the current Sentinel-2 lenses do not produce a measured, promotable signal at the bookmark/date.

## QC Status Legend

- **Proof/demo**: source-valid and current measured chip(s) pass the hotspot claim audit.
- **Context/demo**: source-valid and useful for context/support, but not proof-grade because of regional coordinates, broad facility signal, or non-chemistry support.
- **Registry only**: retained for traceability/QC, but hidden from the Screen demo list because no current applicable chip is defensible.
- **Negative control**: retained to test produced-water specificity against a non-produced-water event.

Barrel conversions use `1 bbl = 42 gal` where source material reports gallons.

## Current Demo-Visible Sites

| Site | Location | Event date / imagery date | Source / agency basis | Reported amount / extent | Current Limn QC role | Current demo chips | QC notes |
|---|---|---|---|---|---|---|---|
| Lake Boehmer | Imperial, Pecos County, TX; `31.226, -102.729` | Continuous since ~2003; representative imagery `2026-01-01` | Texas Standard / Marfa Public Radio reporting on legacy oil-well brine lake; Mapcarta location reference | ~60+ acre chronic hypersaline brine lake | Proof/demo chronic-brine positive | OBEC, LBI, ASAI | Excellent calibration target for standing brine. PWCI intentionally stays off because strict PWCI requires co-located hydrocarbon/heavy-metal signature rather than open brine water. |
| Meister Ranch Geyser | Crane County, TX; `31.3826, -102.6171` | Event window `2022-01-02` to `2022-01-14`; imagery `2022-01-02` | TRRC / Karanam et al. 2024 GRL; CBS7 reporting on RRC contamination findings | ~357,000 bbl over 14 days; reported ~100-ft brine geyser | Proof/demo produced-water positive | LBI | Best current proof path is active liquid brine. PWCI and ASAI are blank at measured proof frames, so this is not a dry salt-crust demo. |
| FM 329 Crevice, Crane Co. | Crane County, TX near FM 329; `31.370, -102.620` | Event start `2023-12-07`; imagery `2023-12-07` | TRRC / Marfa Public Radio; Big Bend Sentinel reporting | ~14M gal over 45 days (~333,000 bbl); reported 13,000 gal/hr; ~30-acre vegetation kill zone; ~300-ft ground crevice | Proof/demo produced-water positive | LBI | Medium coordinate confidence (~0.5 km), but current LBI provides the measured demo signal. Strict PWCI is blank. |
| Toyah Well Blowout | Near Toyah / Reeves County, TX; `31.320, -103.872` | Event start `2024-10-02`; imagery `2024-10-02` | TRRC / Texas Tribune / DeSmog reporting | Active 19 days; volume unquantified; reported ~100-ft geyser of oily saline brine plus H2S | Proof/demo produced-water positive | OBEC, LBI | OBEC gives the clearest pad-scale signal; LBI adds liquid-brine support. PWCI remains blank under strict gates. |
| Antina Ranch / Chevron Estes | Crane/Ward County ranch context, TX; `31.50, -102.85` | Report date `2021-06-17`; imagery `2021-06-17` | CBS7 / Texas Standard reporting on orphaned Chevron/Estes-area leaks | Chronic leaking brine/wastewater plus methane; source reporting does not give a reliable bbl total | Context/demo | OBEC, LBI | Regional precision (~10 km). Useful context support, not proof-grade GPS validation. |
| EOG Klondike Pit, Lea Co. NM | Lea County, NM regional context; `32.24, -103.57` | Event/report date `2025-06-10`; imagery `2025-07-10` | NMED / WildEarth Guardians Waste Watch reporting | ~160,000 gal spilled (~3,810 bbl); ~143,000 gal lost (~3,405 bbl); reported >20 acres high-desert scrub damage | Context/demo | LBI, OBEC, ASAI | Regional precision (~15 km). Good context support, not proof-grade exact source validation. |
| OXY Mesa Verde East, NM | Southeast NM regional context; `32.25, -103.63` | Event date `2025-07-15`; imagery `2025-07-15` | NMED / WildEarth Guardians Waste Watch reporting | ~1.6M gal produced water (~38,100 bbl) plus ~126,000 gal crude (~3,000 bbl) | Context/demo | LBI, OBEC, ASAI | Regional precision (~5 km). LBI is the strongest current support path; OBEC/ASAI are moderate context signals; PWCI is blank. |
| Black River PW Truck Rollover | Black River / John D. Forehand Road crossing, Eddy Co. NM; `32.219252, -104.222885` | Event date `2023-10-03`; imagery `2023-10-03` | NMOCD/Coterra closure report | 65 bbl produced water lost | Context/demo exact-location support | OBEC, LBI | Small release for Sentinel-2, so use as exact-location support/context rather than proof-of-volume. Current ASAI is blank after stricter dry-brine gating. |
| Matador Desoto Spring Pond, NM | Desoto Spring Recycling Pond / facility coordinates, NM; `32.07605, -103.28241` | Event date `2025-09-21`; imagery `2025-09-21` | NMOCD notification / WildEarth Guardians Q3 2025 reporting | 6,354 bbl produced water | Proof/demo produced-water positive | OBEC, LBI, ASAI | Strong pond-scale signal at documented facility coordinates. PWCI stays blank, which is acceptable for this open/facility water case. |
| OXY Lea Flowline Release | Lea County, NM; `32.692986, -103.174825` | Event date `2026-05-24`; imagery `2026-05-24` | NMOCD spill database row `nAPP2614556829` | 942 bbl produced water released; 412 bbl lost | Proof/demo produced-water positive | LBI | Current baseline support is LBI. PWCI, ASAI, and OBEC are blank or weak in the available scene. |
| OXY Sand Dunes Water Tank | Eddy County, NM; `32.24671, -103.78661` | Event date `2026-04-21`; imagery `2026-05-06` | NMOCD spill database row `nAPP2611452043` | 500 bbl produced water released; 160 bbl lost | Context/demo facility signal | BPI | BPI is tank/facility context, not chemistry proof. Keep as context unless experts decide facility-context examples should be separated from produced-water chemistry examples. |

## Registry-Only / Non-Demo Entries

| Site | Location | Event date / imagery date | Source / agency basis | Reported amount / extent | Current Limn QC role | Why not demo-visible |
|---|---|---|---|---|---|---|
| Apache Corp. Balmorhea Spill | North of Balmorhea, TX; `31.130, -103.745` | Event `2020-07-29`; imagery `2021-01-01` | TRRC / Inside Climate News / Texas Standard reporting | 77,500 bbl produced water | Registry only produced-water context | Current baseline found only weak broad residue/facility signal. No current applicable chip is defensible, so it is hidden from Screen/HUD demo lists while retained for source/QC traceability. |
| Midland Crude Spill / EnLink Chickadee | South of Midland, TX; `31.840, -102.078` | Event and imagery `2023-03-29` | Pipeline Safety Trust / EPA-linked reporting | 9,583 bbl crude oil (~402,486 gal) | Negative control | This is crude oil, not produced water. PWCI and ASAI should stay blank/weak; hidden from the produced-water demo list to avoid implying a produced-water detection. |

## Sites Reviewed But Not Promoted

These are not in `SPILL_BOOKMARKS`, but they are relevant to expert QC because they were reviewed during the produced-water expansion pass.

| Candidate | Source basis | Reported amount | QC outcome |
|---|---|---:|---|
| Devon Pinnacle State #035H | NMOCD C-141 / local verified dataset | 7 bbl produced water + 7 bbl crude | Not promoted. Event-date PWCI/OBEC were blank or weak; strongest ASAI candidate was pre-event broad context. |
| WPX RDX Federal 17 #016H | NMOCD spill database row `nAPP2614229487` | 303 bbl produced water | Not promoted. ASAI was uniform-frame rejected; PWCI/OBEC blank; BPI broad context only. |
| Murchison Carlsbad NM candidate | Local verified dataset | unresolved | Not promoted. Coordinate confidence/source detail not sufficient. |
| COG Q1 2025 large produced-water spill | WildEarth Guardians Q1 2025 reporting | unresolved in current registry | Backlog only. Needs exact NMOCD row and coordinates before bookmark promotion. |

## Source Links

- Lake Boehmer: [Texas Standard](https://texasstandard.org/stories/lake-boehmer-toxic-water-oil-well-leak/), [Mapcarta](https://mapcarta.com/W461021594)
- Meister Ranch Geyser: [Karanam et al. 2024 GRL](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2024GL109435), [CBS7](https://www.firstalert7.com/2022/01/28/rrc-reports-heavy-contamination-crane-county-blowout-source-water-pressure-still-unknown/)
- FM 329 Crevice: [Marfa Public Radio](https://www.marfapublicradio.org/environment/2024-02-05/state-spends-millions-to-plug-massive-well-leak-in-the-oil-fields-of-crane-county), [Big Bend Sentinel](https://bigbendsentinel.com/2024/01/10/railroad-commission-claims-gas-leak-to-hide-produced-water-destruction/)
- Toyah Well Blowout: [Texas Tribune](https://www.texastribune.org/2024/10/22/west-texas-well-blowout-oil-gas-sealed/), [DeSmog](https://www.desmog.com/2024/10/04/texas-railroad-commission-kinder-morgan-oil-well-blowout-erupts-in-west-texas-permian-basin/)
- Apache Balmorhea: [Texas Standard](https://texasstandard.org/stories/oil-and-gas-companies-spill-millions-of-gallons-of-wastewater-in-texas/)
- Antina Ranch: [CBS7](https://www.firstalert7.com/2021/06/17/abandoned-chevron-well-springs-leak-leaves-one-rancher-demanding-answers/), [Texas Standard](https://texasstandard.org/stories/west-texas-permian-basin-abondoned-orphan-oil-gas-wells-leaking/)
- EnLink Chickadee crude spill: [Pipeline Safety Trust](https://pstrust.org/enlink-midstreams-chickadee-pipeline-ruptured-and-spilled-402486-gallons-of-crude-oil-just-south-of-midland-texas/)
- EOG Klondike: [WildEarth Guardians Q2 2025 Waste Watch](https://pdf.wildearthguardians.org/support_docs/20250728-Q2-2025-Oil-Gas-Waste-Watch.pdf)
- OXY Mesa Verde: [WildEarth Guardians Q3 2025 Waste Watch](https://pdf.wildearthguardians.org/site/DocServer/Q3%202025%20Waste%20Watch%20Report.pdf)
- Black River: [NMOCD / closure report PDF](https://ocdimage.emnrd.nm.gov/imaging/Filestore/SantaFe/NF/20250224/nAPP2327753740_02_24_2025_11_30_44.pdf)
- Matador Desoto Spring: [NMOCD notification PDF](https://ocdimage.emnrd.nm.gov/imaging/filestore/SantaFe/NF/20250921/nAPP2526466779_09_21_2025_06_33_33.pdf), [WildEarth Guardians Q3 2025 Waste Watch](https://pdf.wildearthguardians.org/site/DocServer/Q3%202025%20Waste%20Watch%20Report.pdf)
- OXY NMOCD rows: [NMOCD spill search for OXY USA Inc.](https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/Spills/SpillSearchResults.aspx?Ogrid=16696&OperatorSearchClause=ogrid)
- Devon Pinnacle: [NMOCD C-141 PDF](https://ocdimage.emnrd.nm.gov/imaging/filestore/SantaFe/NF/20220405/nAPP2127347137_04_05_2022_01_51_45.pdf)
- WPX RDX Federal: [NMOCD spill search for WPX Energy Permian LLC](https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/Spills/SpillSearchResults.aspx?Ogrid=246289&OperatorSearchClause=ogrid)
- COG Q1 2025 backlog: [WildEarth Guardians Q1 2025 Waste Watch](https://pdf.wildearthguardians.org/site/DocServer/Q1_2025%20_Oil_Gas_Waste_Watch.pdf)

## Expert QC Questions

- Which context/demo bookmarks should be split into a separate "regional context" list for presentations?
- Should small exact-coordinate releases such as Black River be retained as support/context despite sub-pixel volume?
- Which Texas RRC narratives need direct incident IDs or exact agency coordinates before being treated as proof-grade?
- Should facility/pad-context lenses such as BPI be shown in the produced-water demo flow, or kept in an infrastructure-support appendix?
- For mixed produced-water plus crude events, should reviewers require separate chemistry confirmation before promoting PWCI-style claims?

## Verification Artifacts

- Bookmark metadata QC: `.tmp/limn_spill_bookmark_qc.md`
- Current chip-claim audit: `.tmp/spill_index_claim_audit.md`
- Current hotspot baseline summary: `.tmp/limn_hotspot_loop/20260608-143636_summary.json`
- Claim audit command:

```bash
python3 execution/audit_spill_index_claims.py \
  --summary .tmp/limn_hotspot_loop/20260608-143636_summary.json \
  --fail-on-fail
```
