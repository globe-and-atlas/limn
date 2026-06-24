# Atlas Evidence Standard

Last updated: 2026-06-17

Atlas renderable bookmarks should carry a visible evidence pack rather than a single loose citation.

## Evidence Pack

Each live/renderable bookmark should expose:

- Cited sources: incident/instance-specific support such as social media posts, news stories, agency/government reports, local records, datasets, or domain sources about the real-world bookmark event.
- Technical imagery check: Copernicus Browser link with bookmark latitude, longitude, zoom, and date.
- Technical sensor reference: official Sentinel-1, Sentinel-2, or Sentinel-5P collection documentation.
- Technical service reference: Copernicus Sentinel Hub OGC WMS documentation.

Copernicus Browser, Sentinel Hub sensor documentation, and Sentinel Hub WMS/service documentation are useful technical verification links. They do not count as numbered cited sources.

## Trust Tiers

- Gold evidence: renderable bookmark with at least three reachable incident/instance cited-source URLs, a bookmark date, and a primary source URL.
- Context only: non-renderable concept or proof-target-pending bookmark.
- Audit Gold-ready: stricter than the UI label; requires at least three reachable incident/instance cited-source URLs and a reachable primary bookmark source.

## Audit Command

```bash
python3 execution/audit_atlas_evidence.py
```

Outputs:

- `.tmp/atlas_evidence_audit.json`
- `.tmp/atlas_evidence_audit.md`

The audit imports the public JS catalog in a fresh Node process and does bounded concurrent HTTP checks. It does not read `config-v1.js`, `.env`, OAuth tokens, Sentinel Hub secrets, or service-account credentials.

## Current Baseline

2026-06-17 incident-source deep dive batch 2 result:

- Renderable bookmarks: 44
- Gold-ready evidence packs: 44
- Needs evidence cleanup: 0
- Three cited-source rows: 28
- Four cited-source rows: 13
- Five cited-source rows: 3

Rows promoted to Gold-ready by this pass: SF-EII, LFMPI, SACI, CSRC, RRFI, FCLI, SMPDI, CD-UAI, PDSDI, CCTTI, WDA-CSI, EC-ACI, HSAI, PCADI, TT-API, TPERI, PCEI, MEPSI, PDCSI, DLPEHI, MHSSP, TFIDI, WDPTZI, IPVSI, WVTDI, S1-URB, S1-VVS, and S5P-NO2.

URLs pruned or replaced in this pass included blocked CAL FIRE incident-list pages, blocked MDPI pages, Google Scholar lookup links, timeout-prone OpenKnowledge/Zenodo pages, expired-certificate archival pages, and dashboard/publication landing pages that intermittently failed audit reachability. Prefer reachable agency, university, government, open-access journal, or data-portal pages that document the bookmark incident, place, or observed domain.

Reachability hardening on 2026-06-17 replaced three later-failing sources with audit-stable alternatives:

- TDR-ASI: SITU Cerro de Pasco environmental-crime documentation replaced a failed Climate Crime Analysis page.
- PCADI: SEMCOG pavement condition open-data layer replaced the intermittent Michigan TAMC dashboard URL.
- MHSSP: LSU repository mirror replaced the intermittent USGS publication landing page for the Mississippi River Delta methane ebullition study.

2026-06-17 incident-source deep dive batch 1 result:

- Renderable bookmarks: 44
- Gold-ready evidence packs: 16
- Needs evidence cleanup: 28
- One cited-source rows: 21
- Two cited-source rows: 7
- Three cited-source rows: 9
- Four cited-source rows: 5
- Five cited-source rows: 2

Rows promoted to Gold-ready by this pass: BH-DFSI, PETI, EPDI, CBSDI, KCDSI, OWSI, MP-PDI, NPDefI, TDR-ASI, AMDPHI, LFGVI, LRD-VSI, SABSI, LISI, S1-OWF, and S5P-SO2.

2026-06-16 corrected citation-count audit result:

- Renderable bookmarks: 44
- Gold-ready evidence packs: 0
- Needs evidence cleanup: 44
- Zero cited-source rows: 4
- One cited-source rows: 28
- Two cited-source rows: 12

If a source site blocks the audit with 403/timeout, replace the primary source with a reachable source that is still topic-matched. Do not let generic imagery, sensor, or service references hide a broken or missing incident citation.

Strong verified rows use `src/atlas-verification.js`. The audit intentionally fails Strong rows when any curated cited source is unreachable. Technical Copernicus/Sentinel Hub links are reported separately and never make a row Gold-ready.

## 2026-06-16 Citation Count Correction

Daniel clarified that Copernicus Browser and Sentinel Hub platform links should not count as numbered cited sources. Numbered cited sources should be incident/instance support: social posts, news stories, agency/government reports, local records, datasets, or similar evidence about the specific bookmark event or place. Method papers can remain visible as supporting references, but they do not satisfy the incident/instance citation count.

Implementation notes:

- `src/atlas-evidence.js` marks technical links with `countsAsCitation: false` and `technical: true`.
- `getAtlasTrust()` uses cited-source counts for Bronze/Silver/Gold labels.
- The info panel shows numbered `Cited sources` separately from unnumbered `Supporting references` and `Technical checks`.
- `execution/audit_atlas_evidence.py` reports `citationUrlCount`, `referenceUrlCount`, and `technicalUrlCount` separately.

## 2026-06-16 Weak-Tier Promotion Notes

The final weak-tier cleanup promoted EPDI, MP-PDI, TDR-ASI, HSAI, LFGVI, OWSI, LRD-VSI, TT-API, MEPSI, and WDPTZI to Strong after replacing source-place mismatches and generic citations with reachable site/region-specific sources.

Current cold-eyes report path:

- `.tmp/atlas_cold_eyes_verifiability_review.md`

The 2026-06-17 source deep dive added curated Strong verification entries for BH-DFSI and PETI. TFIDI remains a one-source renderable row that still needs incident/domain source cleanup.
