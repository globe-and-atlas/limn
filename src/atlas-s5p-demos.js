/* ==========================================================================
   Globe & Atlas · Limn — Live Sentinel-5P (TROPOMI) Demonstrators
   --------------------------------------------------------------------------
   Like the SAR demonstrators, these are NOT part of the 91 novel-index
   catalog — they are capability demonstrators that prove the Atlas's
   atmospheric pipeline works. Each renders live from a dedicated Sentinel-5P
   layer configured on the public Copernicus instance:
       SENTINEL-5P-NO  → tropospheric NO2
       SP5-SO2         → SO2
   (The aerosol layer `S5P-AER` powers the catalog index SACI, wired in
   atlas-indices.js — not here.)

   Sentinel-5P is coarse (~3.5–7 km) and daily-swath, so these use regional
   bookmarks at low zoom (minZoom: 3) and benefit from a wider date window to
   fill orbit gaps. Values are physical units, scaled in the evalscript.
   Marked `DEMO` (established retrievals, not novel inventions).
   ========================================================================== */

const s5pES = (bands, logic) => `//VERSION=3
function setup() {
  return { input: [${bands.map(b => `'${b}'`).join(', ')}, "dataMask"], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0,0];
  ${logic}
}`;

export const S5P_DEMO_DOMAIN = { id: 's5p_live', label: 'Sentinel-5P · Live', icon: '💨' };

export const S5P_DEMO_INDICES = [
  {
    key: 's5pno2', acronym: 'S5P-NO2', domain: 's5p_live',
    name: 'Tropospheric NO₂ Pollution',
    platform: 'Sentinel-5P TROPOMI', platformShort: 'S5P', novelty: 'DEMO',
    canRender: true, wmsLayer: 'SENTINEL-5P-NO', minZoom: 3,
    formula: 'tropospheric NO₂ vertical column (mol/m²)',
    physics: 'NO₂ from combustion — traffic, power plants, heavy industry — is retrieved by TROPOMI at ~5.5 km. Persistent hotspots trace megacities and industrial belts; the signal climbs in winter and fell visibly during 2020 lockdowns.',
    benefit: 'Daily global air-quality and emissions monitoring — sees pollution directly, through the cloud-free gaps optical sensors miss.',
    gradient: 'linear-gradient(to right,#0038b8,#3a6fc0,#dfe7ef,#d96a36,#d11f2a)',
    legend: ['Clean air', 'High NO₂'],
    bookmark: { lat: 35.38, lng: 115.12, zoom: 5, date: '2021-12-10', label: 'North China Plain — winter NO₂ peak' },
    source: 'ACP China NO₂ satellite and ground-observation study',
    sourceUrl: 'https://acp.copernicus.org/articles/21/7723/2021/',
    justification: 'Karpathy-loop WMS QC selected December 10, 2021 at 35.38, 115.12, zoom 5 as the strongest measured North China Plain frame. Winter over the region carries an unmistakable persistent tropospheric NO₂ signal.',
    evalscript: s5pES(['NO2'], `
      var v = Math.max(0, Math.min(1, sample.NO2 / 0.00014));
      if (v <= 0.05) return [0,0,0,0];
      return [v, 0.22 * (1 - v), 0.72 * (1 - v), Math.min(0.95, 0.2 + 0.75 * v)];`)
  },
  {
    key: 's5pso2', acronym: 'S5P-SO2', domain: 's5p_live',
    name: 'Volcanic SO₂ Plume',
    platform: 'Sentinel-5P TROPOMI', platformShort: 'S5P', novelty: 'DEMO',
    canRender: true, wmsLayer: 'SP5-SO2', minZoom: 3,
    formula: 'SO₂ vertical column (mol/m²)',
    physics: 'Erupting and degassing volcanoes inject sulfur dioxide into the atmosphere; TROPOMI maps the column daily and tracks the plume as it drifts downwind — a key input to aviation-hazard and climate-forcing assessment.',
    benefit: 'Near-real-time volcanic SO₂ and aviation-hazard monitoring, worldwide and unobstructed by cloud.',
    gradient: 'linear-gradient(to right,#f5f23d,#f2c024,#ef901c,#e85a16,#d11f1f)',
    legend: ['Background', 'Dense SO₂ plume'],
    bookmark: { lat: 28.0, lng: -19.0, zoom: 6, date: '2021-11-01', label: 'La Palma eruption — dense SO₂ plume' },
    source: 'CAMS monitoring of La Palma SO₂ plume',
    sourceUrl: 'https://atmosphere.copernicus.eu/cams-monitors-transport-so2-la-palma-volcano',
    justification: 'Karpathy-loop WMS QC selected November 1, 2021 at 28.00, -19.00, zoom 6 during the active Cumbre Vieja eruption, with the strongest measured SO₂ plume coverage after transparent background gating. The event remained active from September into December 2021, so the date is inside the documented volcanic emission window.',
    evalscript: s5pES(['SO2'], `
      var v = Math.max(0, Math.min(1, sample.SO2 / 0.0008));
      if (v <= 0.06) return [0,0,0,0];
      return [0.95, 0.85 * (1 - v) + 0.1, 0.15, Math.min(0.95, 0.2 + 0.75 * v)];`)
  },
];
