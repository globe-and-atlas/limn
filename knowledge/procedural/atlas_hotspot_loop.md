# Atlas Hotspot Loop

Last updated: 2026-06-07

Use `directives/find_hotspots.md` for Atlas bookmark refinement. The deterministic runner is:

```bash
python3 execution/hotspot_loop.py --targets SACI,FGDCI,S1-OWF,S1-URB,S1-VVS,S5P-NO2,S5P-SO2 --size 384 --budget-per-index 28 --date-days 30 --step-days 15 --zoom-radius 1 --coarse-delta 0.5 --refine-delta 0.12
```

Outputs are written under `.tmp/hotspot_loop/`:

- `results.tsv` is append-only and protected by `results.tsv.lock`.
- Per-candidate PNG thumbnails include the run id in the filename.
- Each target gets an `<acronym>_shortlist.md` ranked by verdict and score.
- `<run_id>_summary.json` records the best candidate per target.

Promotion rules:

- Do not promote on score alone.
- Visually inspect the top thumbnail against the baseline thumbnail.
- Reject candidates that trip `uniform_guard`.
- Reject candidates that are broad full-frame tint rather than a recognizable plume, bloom, city, burn scar, water body, or other index-specific feature.
- Keep S5P at low zoom and use a wider window (`--s5p-window-days 30`) because swaths are coarse and gappy.
- If a layer only looks strong because a proxy paints most of the scene, mark the concept proof-target pending instead of keeping it as a live proof claim.

2026-06-07 results:

- BH-DFSI promoted to a January 24, 2018 zoom-13 Montecito target.
- SACI background gating added and promoted to an August 11, 2021 Bootleg Fire smoke target.
- S1-OWF, S1-URB, S1-VVS background gates added and demonstrator bookmarks refined.
- S5P-SO2 background gating added and bookmark refined to a November 1, 2021 La Palma plume.
- S5P-NO2 stayed effectively unchanged; the current North China Plain bookmark was already proof-grade.
- FGDCI was demoted to proof-target pending because the single-scene VV−VH proxy remained too uniform for a defensible freeze/thaw anomaly claim.
