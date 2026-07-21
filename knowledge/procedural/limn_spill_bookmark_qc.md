# Limn Spill Bookmark QC

Last updated: 2026-07-20

## Current baseline

The current core Limn inventory contains 13 bookmarks. Metadata QC is 13 pass, 0 warn, 0 fail. Passing means that source, date role, location precision, and evidence-class metadata are internally coherent; it does not mean the selected spectral index detected the documented event.

Use this check after changing `SPILL_BOOKMARKS` in `src/app.js`.

## Command

```bash
python3 execution/qc_limn_spill_bookmarks.py --fail-on-fail
```

The script parses the static `SPILL_BOOKMARKS` array and writes:

- `.tmp/limn_spill_bookmark_qc.json`
- `.tmp/limn_spill_bookmark_qc.md`

## Bookmark Metadata Rules

Each bookmark should include:

- `sourceUrl` or `sourceUrls`
- `evidenceClass`
- `eventDate`
- `dateRole`
- `confidence`

Valid evidence classes:

- `produced-water-positive`
- `chronic-brine-positive`
- `produced-water-context`
- `hydrocarbon-negative-control`

## Interpretation

- `pass`: source URL exists, date logic matches, and the evidence class is internally honest. Positive classes need proof-grade enough location precision; context and control classes may pass as explicitly labeled non-proof bookmarks.
- `warn`: source/date support is adequate, but a positive bookmark has regional/context-only precision or other support ambiguity.
- `fail`: missing source URL, invalid date, or date that does not relate to the documented event.

Historical baseline (2026-06-07): the inventory then contained 9 bookmarks and passed 9/9. Use the 13-bookmark current baseline above for release checks.
