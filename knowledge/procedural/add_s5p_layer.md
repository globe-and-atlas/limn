# Add a Sentinel-5P (TROPOMI) layer to the Atlas WMS instance

**Goal:** unblock the atmospheric trace-gas indices (SACI + the TROPOMI set) so they
render live in Limn Atlas, the same way Sentinel-1 SAR now does.

**Why it's needed:** the Atlas WMS instance (`959ea2c5-5892-4b36-82b3-76e6bdb93c8a`)
currently advertises only Sentinel-2 layers plus `SENTINEL1-GRD`. There is **no
Sentinel-5P layer**, and in Sentinel Hub one WMS layer binds to exactly one data
collection. Until an S5P layer exists on the instance, passing an S5P evalscript to
any existing layer fails. This is a **dashboard configuration task** — it cannot be
done from code.

---

## Part A — Create the layer (Copernicus Sentinel Hub Dashboard)

1. **Sign in** to the CDSE Sentinel Hub Dashboard with the same Copernicus account
   the instance belongs to:
   - https://shapps.dataspace.copernicus.eu/dashboard/  → **Configuration Utility**
   - (Reachable from https://dataspace.copernicus.eu → *Sentinel Hub* → *Dashboard*.)

2. **Open the Atlas configuration.** In Configuration Utility, find the configuration
   whose **Instance ID** is `959ea2c5-5892-4b36-82b3-76e6bdb93c8a`. (The WMS endpoint
   `…/ogc/wms/<instanceId>` uses this ID.) Open it — you'll see its existing layers
   (`AGRICULTURE`, `TRUE_COLOR`, `SENTINEL1-GRD`, …).

3. **Add a data source for Sentinel-5P** (if not already present):
   - Click **+ Add new layer**.
   - For **Data source**, choose **+ Add new data source** → select **Sentinel-5P L2**
     (Copernicus / CDSE collection). Save the data source.

4. **Name the layer.** Set the layer **ID** to something stable and descriptive — this
   string becomes the WMS `layers=` value the Atlas will request. Suggested:
   - `SENTINEL5P` (generic), or per-product like `S5P-NO2`, `S5P-AER`.
   - Keep it uppercase/hyphenated to match the existing convention.

5. **Leave the layer evalscript as default.** The Atlas overrides the evalscript per
   request (it sends its own), so the configured layer only needs to bind to the S5P
   data source. A trivial default (e.g., return NO2 grayscale) is fine.

6. **Set sensible defaults** on the layer:
   - **Mosaicking:** `mostRecent` or `ORBIT` (S5P is daily, coarse).
   - No cloud-cover filter equivalent — `maxcc` does not apply to S5P (Atlas passes it
     anyway; S5P ignores it).

7. **Save the configuration.**

---

## Part B — Verify the layer exists (from this repo)

```bash
INST=959ea2c5-5892-4b36-82b3-76e6bdb93c8a
# 1. Confirm the new layer is advertised:
curl -s "https://sh.dataspace.copernicus.eu/ogc/wms/$INST?service=WMS&request=GetCapabilities&version=1.3.0" \
  | grep -oE "<Name>[^<]+</Name>" | grep -i "S5P\|SENTINEL5\|TROPOMI\|NO2\|AER"
```

```bash
# 2. Prove a live S5P GetMap renders (NO2 is the most reliable first test —
#    industrial/urban plumes are strong and obvious). Replace LAYER with your ID.
LAYER=SENTINEL5P
ES='//VERSION=3
function setup(){return{input:["NO2","dataMask"],output:{bands:4}};}
function evaluatePixel(s){if(s.dataMask===0)return[0,0,0,0];var v=Math.max(0,Math.min(1,s.NO2/0.0002));return[v,0.3*(1-v),0.6*(1-v),0.85];}'
B64=$(node -e "process.stdout.write(encodeURIComponent(Buffer.from(process.argv[1]).toString('base64')))" "$ES")
# Over China/N. India (high NO2), wide bbox, recent week:
curl -s "https://sh.dataspace.copernicus.eu/ogc/wms/$INST?service=WMS&request=GetMap&version=1.3.0&layers=$LAYER&format=image/png&transparent=true&width=256&height=256&crs=CRS:84&showlogo=false&bbox=100,20,120,40&time=2021-12-01/2021-12-08&evalscript=$B64" \
  -o .tmp/s5p_probe.png -w "HTTP %{http_code} | %{size_download} bytes\n"
```

If that returns a multi-KB PNG (not an XML `ServiceException`), the pipeline works.

---

## Part C — Wire the indices live (code)

For each S5P index, mirror what was done for the S1 demos:

- Set `canRender: true` and `wmsLayer: '<your layer ID>'`.
- Replace the True-Color stub `evalscript` with an S5P evalscript.
- Ensure `source` / `sourceUrl` / `justification` exist (renderable doc-validation).
- Coarse resolution (~3.5–7 km) → pick a **regional bookmark** (country-scale bbox),
  not a 10 m city view. Consider a low `bookmark.zoom` (e.g., 4–6).

**Available S5P bands** (use as `input` in the evalscript): `CO`, `HCHO`, `NO2`,
`O3`, `SO2`, `CH4`, `AER_AI_340_380`, `AER_AI_354_388`, `AER_LH`, plus cloud bands.
Values are **physical units** (e.g., NO2 in mol/m², AER_AI dimensionless ≈ −2…+5), so
scale in the evalscript.

### Science caveat for SACI specifically
SACI's formula is `AOD_UV340 / AOD_550`. TROPOMI provides the **UV Aerosol Index**
(`AER_AI_340_380`), **not** AOD at 550 nm. So a live SACI must render as a **proxy**
built from the UV aerosol index (same proxy convention used for FGDCI and the fusion
indices), not the literal ratio. The exact mapping is a science-owner decision —
flag it in the index's `justification`, as FGDCI does.

**Recommended order:** prove the pipeline with a simple **NO2** demonstrator first
(strong, obvious signal), then tackle SACI's aerosol-index proxy.

---

## Notes
- Free CDSE tier includes Sentinel-5P; no extra cost, but it draws on the same
  processing-unit quota as S2/S1.
- The dashboard UI labels shift over time — exact menu wording may differ from the
  steps above, but the flow (configuration → add layer → pick Sentinel-5P L2 data
  source → name → save) is stable.
- Pure-S5P indices unlock; **fusion** indices (e.g., `TSEAI` = S5P + S2) still need a
  backend/Processing API and remain context-only.
