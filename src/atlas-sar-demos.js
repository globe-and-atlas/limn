/* ==========================================================================
   Globe & Atlas · Limn — Live Sentinel-1 SAR Demonstrators
   --------------------------------------------------------------------------
   These are NOT part of the 91 novel-index catalog. They are capability
   demonstrators that prove the Atlas's radar pipeline works end-to-end: each
   one renders live from the public Copernicus `SENTINEL1-GRD` layer (same
   instance the optical indices use). They cover SAR's three canonical
   scattering regimes — specular (water), double-bounce (urban), and volume
   (vegetation) — using established, single-scene techniques (not novel
   inventions), so they are marked with the `DEMO` badge rather than a novelty
   tier. Kept in a separate module so the novel catalog (atlas-indices.js)
   stays exactly 91 and merge surface stays small.
   ========================================================================== */

// Self-contained S1 evalscript builder (no dependency on atlas-indices.js).
// Uses Math.log/Math.LN10 (no Math.log10) for Sentinel Hub engine compatibility.
const sarES = (bands, logic) => `//VERSION=3
function setup() {
  return { input: [${bands.map(b => `'${b}'`).join(', ')}, "dataMask"], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0,0];
  ${logic}
}`;

export const SAR_DEMO_DOMAIN = { id: 'sar_live', label: 'Sentinel-1 SAR · Live', icon: '🛰️' };

export const SAR_DEMO_INDICES = [
  {
    key: 'sowf', acronym: 'S1-OWF', domain: 'sar_live',
    name: 'SAR Open-Water & Flood Mapping',
    platform: 'Sentinel-1 GRD', platformShort: 'S1', novelty: 'DEMO',
    canRender: true, wmsLayer: 'SENTINEL1-GRD', minZoom: 6,
    formula: 'water ⇐ VV_dB < −13 dB (specular reflection)',
    physics: 'Calm water is smooth at C-band, so it reflects radar away from the sensor (specular) and returns almost no backscatter — open water and floods appear dark in SAR, day or night, through cloud.',
    benefit: 'All-weather flood and surface-water mapping — the operational standard for disaster response when clouds blind optical sensors.',
    gradient: 'linear-gradient(to right,#0d2030,#0d2030,#1c6fa8,#5ec8e6,#aef0ff)',
    legend: ['Land', 'Open water'],
    bookmark: { lat: 29.1, lng: 116.3, zoom: 10, date: '2021-06-15', label: 'Poyang Lake, China — peak open-water geometry' },
    source: 'NASA Earth Observatory: Poyang Lake Extremes',
    sourceUrl: 'https://science.nasa.gov/earth/earth-observatory/poyang-lake-extremes-146987/',
    justification: 'Karpathy-loop WMS QC selected the June 15, 2021 Poyang frame at 29.10, 116.30, zoom 10 with the strongest measured open-water coverage and clearer river/floodplain geometry than the prior July bookmark.',
    evalscript: sarES(['VV'], `
      var db = 10 * Math.log(Math.max(sample.VV, 1e-4)) / Math.LN10;
      var w = Math.max(0, Math.min(1, (-13 - db) / 10));
      if (w <= 0.05) return [0,0,0,0];
      return [0.05, 0.3 + 0.4 * w, 0.6 + 0.4 * w, Math.min(0.95, 0.25 + 0.75 * w)];`)
  },
  {
    key: 'surb', acronym: 'S1-URB', domain: 'sar_live',
    name: 'SAR Urban Double-Bounce Backscatter',
    platform: 'Sentinel-1 GRD', platformShort: 'S1', novelty: 'DEMO',
    canRender: true, wmsLayer: 'SENTINEL1-GRD', minZoom: 6,
    formula: 'built-up ⇐ high VV_dB (double-bounce)',
    physics: 'Walls and streets form right-angle corner reflectors that bounce radar straight back to the sensor (double-bounce). Cities are among the brightest features in SAR and separate sharply from smooth terrain.',
    benefit: 'All-weather settlement and built-up-area mapping — the physical basis of global urban-footprint products.',
    gradient: 'linear-gradient(to right,#1a1208,#5a3410,#a85f18,#e08a26,#ffc34d)',
    legend: ['Smooth/water', 'Dense built-up'],
    bookmark: { lat: 30.04, lng: 31.24, zoom: 11, date: '2021-07-10', label: 'Cairo, Egypt — dense city double-bounce' },
    source: 'DLR Global Urban Footprint dataset',
    sourceUrl: 'https://geoservice.dlr.de/web/datasets/guf',
    justification: 'Karpathy-loop WMS QC selected July 10, 2021 at zoom 11 with 41.553% visible built-up signal and 10.645% high-signal coverage, making the Nile/city/desert contrast more legible than the prior zoom-10 bookmark.',
    evalscript: sarES(['VV'], `
      var db = 10 * Math.log(Math.max(sample.VV, 1e-4)) / Math.LN10;
      var u = Math.max(0, Math.min(1, (db + 8) / 12));
      if (u <= 0.12) return [0,0,0,0];
      return [0.9 * u, 0.4 * u, 0.1 * u, Math.min(0.95, 0.2 + 0.75 * u)];`)
  },
  {
    key: 'svvs', acronym: 'S1-VVS', domain: 'sar_live',
    name: 'SAR Vegetation Volume Scattering',
    platform: 'Sentinel-1 GRD', platformShort: 'S1', novelty: 'DEMO',
    canRender: true, wmsLayer: 'SENTINEL1-GRD', minZoom: 6,
    formula: 'canopy ⇐ VH_dB (cross-pol volume scattering)',
    physics: 'Randomly oriented branches and leaves depolarize the radar pulse, generating cross-polarized (VH) return through volume scattering. Dense canopy is bright in VH; bare or freshly cleared ground is dark.',
    benefit: 'All-weather forest-extent and deforestation monitoring — VH sees through the persistent cloud that blinds optical sensors over the tropics.',
    gradient: 'linear-gradient(to right,#7a2e0c,#a8551a,#cc8a2a,#5a9e2a,#2e7d1e)',
    legend: ['Bare/cleared', 'Dense canopy'],
    bookmark: { lat: -11.12, lng: -62.82, zoom: 11, date: '2021-07-26', label: 'Rondônia, Brazil — canopy/clearing SAR contrast' },
    source: 'USGS EROS Rondônia Earthshots',
    sourceUrl: 'https://eros.usgs.gov/earthshots/rondonia-brazil',
    justification: 'Karpathy-loop WMS QC selected a July 26, 2021 zoom-11 Rondônia frame with 87.804% visible canopy signal and 72.816% high-signal coverage after low-VH background transparency gating. This remains a demonstrator, not a novel proof target.',
    evalscript: sarES(['VH'], `
      var db = 10 * Math.log(Math.max(sample.VH, 1e-4)) / Math.LN10;
      var v = Math.max(0, Math.min(1, (db + 22) / 14));
      if (v <= 0.25) return [0,0,0,0];
      return [0.12, 0.25 + 0.55 * v, 0.12, Math.min(0.95, 0.2 + 0.75 * v)];`)
  },
];
