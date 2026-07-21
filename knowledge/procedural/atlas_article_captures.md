# Atlas Article Captures

Last updated: 2026-07-20

## Current G&A lead set

Use BH-DFSI, LFMPI, PETI, EPDI, EC-ACI, and TDR-ASI as the default six article candidates. SF-EII is retired from the live catalog, and RRFI remains useful context but is not a lead because its current overlay is only moderate.

Each candidate is the primary method in a capability family. Captions and drafts should name the family once, describe the selected method's role, and avoid presenting sibling variants as independent inventions. The current pairings are BH-DFSI / Fire Effects & Recovery, LFMPI / Fuel Moisture Context, PETI / Aquatic Blooms & Pigments, EPDI / Water Condition & Plumes, EC-ACI / Urban Surface Condition, and TDR-ASI / Mining Surfaces & Risk.

Use `execution/capture_atlas_articles.py` when generating article-ready Limn Atlas assets from selected index bookmarks.

## Command

```bash
python3 execution/capture_atlas_articles.py \
  --targets bhdfsi,lfmpi,peti,epdi,ecaci,tdrasi \
  --run-id 20260720-v2-articles \
  --size 1200x800 \
  --window-days 15 \
  --maxcc 30
```

## Outputs

The script writes to `.tmp/atlas_article_captures/<run-id>/`.

For each index, it writes four PNGs:
- `01_regional_overlay.png`
- `02_bookmark_overlay.png`
- `03_detail_overlay.png`
- `04_true_color_context.png`

Each PNG has a same-named JSON sidecar. The run also writes `manifest.json` and `manifest.md`.

## Provider Contract

- Image captures use Sentinel Hub WMS only.
- The script does not request GEE tiles.
- The script does not request COG tiles.
- Local `config-v1.js` may provide the active WMS endpoint, but the endpoint value is not printed or written to sidecars.
- Metadata sidecars record the endpoint as a label such as `local-config`.

## Scene Metadata

Use public CDSE STAC for scene metadata. It returns Sentinel item IDs, acquisition datetimes, platform names, cloud cover, and sun geometry without using Sentinel Hub processing units.

Sentinel Hub Catalog is not the preferred metadata source for this workflow because it can consume or require account processing units. If using it as a fallback, send ISO timestamp ranges, not WMS-style date-only ranges.

## 2026-06-13 Run

Historical run retained for provenance; use the current lead set above for new work.

Run ID: `20260613-selected-sentinel`

Targets:
- `bhdfsi`
- `sfeii`
- `peti`
- `epdi`
- `rrfi`
- `tdrasi`

Verification:
- 6 targets resolved.
- 24 PNGs written.
- 24 JSON sidecars written.
- 24 sidecars include `CDSE STAC` scene metadata.
- `manifest.json` records `uses_gee: false`.
- `manifest.json` records `uses_cog: false`.
- Secret-bearing values were not found in generated JSON sidecars.

## Manual Screenshot Tour

When automated WMS exports are too flat for article composition, use `reports/atlas_manual_screenshot_tour.md`.

The tour provides:
- Manual Atlas setup instructions.
- Coordinates, dates, WMS windows, and zoom suggestions.
- External references from the Atlas registry.
- CDSE STAC acquisition metadata from the generated capture sidecars.
- Caption guidance that distinguishes exact-event references from phenomenon references.
