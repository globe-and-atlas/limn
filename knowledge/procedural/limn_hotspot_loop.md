# Limn Produced-Water Hotspot Loop

Last updated: 2026-06-08

Use this workflow before promoting or changing produced-water spill bookmarks in `src/app.js`.

## Command

Focused proof/default baseline check (all 14 current bookmarks — the earlier 9-target list predated the 2026-06-08 NM expansion and the 2026-07-24 calibration site):

```bash
python3 execution/limn_hotspot_loop.py \
  --targets lake-boehmer-pecos-orphan,meister-2022,crane-crevice-2023,toyah-2024,apache-balmorhea-2020,antina-ranch-2021,enlink-midstream-chickadee-2023,eog-klondike-2025,oxy-mesa-verde-2025,black-river-cimarex-2023,matador-desoto-spring-2025,oxy-lea-flowline-2026,oxy-sand-dunes-2026,brine-calibration-31892-2025 \
  --indices pwi,pwoi,hpwi,lbi,bpi \
  --include-control-negatives \
  --size 320 \
  --budget-per-target 1
```

> **2026-07-24 fix:** the loop's inline `materialize()` now applies `adaptEvalscriptForSentinelWms(script, false)` (matching `getScriptContent()` in `src/map.js`). Before this fix — from 2026-07-21 to 2026-07-24 — every request returned `HTTP 400: Collection 'S2L1C' has no band 'SCL'` and the loop was completely non-functional. If you see that error again, the adapter call was lost. See `knowledge/ERRORS.md`.

Exploratory fallback check for weak proof targets:

```bash
python3 execution/limn_hotspot_loop.py \
  --targets meister-2022,crane-crevice-2023,apache-balmorhea-2020 \
  --indices hpwi,lbi,fbc,tri,bpi,vsi,reai,vcbi \
  --allow-all-indices \
  --size 320 \
  --budget-per-target 10 \
  --step-days 15 \
  --post-event-days 60
```

The script writes:

- `.tmp/limn_hotspot_loop/results.tsv`
- `.tmp/limn_hotspot_loop/*_summary.json`
- `.tmp/limn_hotspot_loop/*_shortlist.md`
- `.tmp/limn_hotspot_loop/*.png`

## Promotion Rules

- Promote only candidates with `promotable: true`.
- Promote only candidates whose thumbnail is visually coherent.
- Keep exact/medium proof targets near documented coordinates.
- Use `produced-water-context` for regional source locations even when the WMS signal is strong.
- Do not promote full-frame or opaque-everywhere fallback layers as proof.
- Treat PWCI as a strict high-confidence AND gate; blank PWCI on open water or dry residues is expected.
- Do not promote candidates whose best measured scene precedes the documented event date, unless the bookmark is explicitly a non-event baseline/control.
- Bookmark chips in the Screen sidebar should advertise only current measured promotable results. Use empty `indices: []` for negative controls or context sites whose intended lesson is that the proof lens stays blank.
- After changing evalscript thresholds, rerun `execution/limn_hotspot_loop.py` and then `python3 execution/audit_spill_index_claims.py --summary <summary.json> --fail-on-fail`.

## 2026-06-07 Baseline Result

Final edited-bookmark baseline artifact: `.tmp/limn_hotspot_loop/20260607-221436_summary.json`.

Strong/promotable defaults:

- Lake Boehmer: OBEC and ASAI
- Meister Ranch Geyser: LBI
- Crane Crevice: LBI
- Antina Ranch context: OBEC and LBI
- EOG Klondike context: ASAI

Moderate/promotable defaults:

- Toyah: OBEC
- OXY Mesa Verde context: OBEC and ASAI

Explicit non-proof/control defaults:

- Apache Balmorhea: context-only; BPI weak at current proof frame
- EnLink Chickadee: crude-oil negative control; PWCI blank and ASAI weak

## 2026-06-08 Expansion Result

Final edited-default artifact for new promoted/context additions: `.tmp/limn_hotspot_loop/20260607-231012_summary.json`.

Strong/promotable new defaults:

- Black River PW Truck Rollover: OBEC, LBI, and ASAI
- Matador Desoto Spring Pond: OBEC, LBI, and ASAI
- OXY Lea Flowline: ASAI

Context-only new default:

- OXY Sand Dunes Water Tank: BPI context only; this is a tank/facility signal, not produced-water chemistry proof

Reviewed but not promoted:

- Devon Pinnacle State #035H: exact verified C-141 event, but event-date PWCI/OBEC were blank/weak and the strongest ASAI candidate was pre-event broad context
- WPX RDX Federal 17 #016H: exact NMOCD row, but ASAI was uniform-frame rejected, PWCI/OBEC were blank, and BPI was only broad context

## 2026-06-08 Current-Threshold Claim Audit

Current baseline artifact after ASAI tightening: `.tmp/limn_hotspot_loop/20260608-143636_summary.json`.

Changes made from the previous chip set:

- Lake Boehmer: added LBI because current LBI is strong/promotable and gives a clear liquid-brine read alongside OBEC/ASAI.
- Toyah: added LBI because current LBI is strong/promotable and useful as liquid-brine support next to OBEC.
- EOG Klondike: added LBI and OBEC as context-support chips; the bookmark remains regional/context-only.
- OXY Mesa Verde: added LBI as context support; OBEC/ASAI remain moderate context signals.
- Apache Balmorhea: removed BPI chip because current BPI is weak/non-promotable.
- EnLink Chickadee: removed PWCI/ASAI chips because this is a negative control and both remain blank/non-promotable.
- Black River: removed ASAI because current ASAI is blank; retained OBEC/LBI as exact-location support context.
- OXY Lea Flowline: removed ASAI because current ASAI is blank; switched advertised support path to LBI.
- Sidebar label changed from Verified Sites to Screening Sites so context/control bookmarks are not presented as proof-grade detections.

Deterministic claim check:

```bash
python3 execution/audit_spill_index_claims.py \
  --summary .tmp/limn_hotspot_loop/20260608-143636_summary.json \
  --fail-on-fail
```
