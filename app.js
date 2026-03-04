/* ==========================================================================
   Sentinel Explorer - Core Logic
   ========================================================================== */

const AOI_LOCATIONS = {
    lea: { lat: 31.55, lng: -103.95, zoom: 15 },
    ward: { lat: 31.82, lng: -102.25, zoom: 15 },
    eddy: { lat: 32.85, lng: -103.45, zoom: 15 }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const START_YEAR = 2016;
const ALL_DATES = [];
const today = new Date(); // Reverted to testing current live data
let iterDate = new Date(Date.UTC(START_YEAR, 0, 1));

while (iterDate <= today) {
    let y = iterDate.getUTCFullYear();
    let m = iterDate.getUTCMonth();
    let d = iterDate.getUTCDate();

    let mm = String(m + 1).padStart(2, '0');
    let dd = String(d).padStart(2, '0');

    ALL_DATES.push({
        value: `${y}-${mm}-${dd}`,
        label: `${MONTHS[m]} ${d}, ${y}`,
        short: `${MONTHS[m]} ${d}, '${y.toString().slice(-2)}`,
        displayStr: `${MONTHS[m]} ${d}, ${y}`
    });

    iterDate.setUTCDate(iterDate.getUTCDate() + 5);
}



// Copernicus Sentinel Hub configuration
const CDSE_CLIENT_ID = 'sh-90db7a9c-41fd-4caf-935a-0be2f39b28ba';
const CDSE_CLIENT_SECRET = '10GC2CAhRnaKcONM5aVHlM6pAiWVnxxt';
const SH_WMS_URL = 'https://sh.dataspace.copernicus.eu/ogc/wms/959ea2c5-5892-4b36-82b3-76e6bdb93c8a';
const SH_STAT_API_URL = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';

let cachedAccessToken = null;
let tokenExpiry = null;

async function getCDSEToken() {
    if (cachedAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }
    // The Copernicus Keycloak server blocks direct frontend CORS requests.
    // We route the authentication handshake securely through a standard CORS proxy to bridge the divide.
    const authUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token');

    const resp = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: CDSE_CLIENT_ID,
            client_secret: CDSE_CLIENT_SECRET,
            grant_type: 'client_credentials'
        })
    });
    if (!resp.ok) throw new Error("Failed to authenticate with Copernicus OAuth API");
    const data = await resp.json();
    cachedAccessToken = data.access_token;
    tokenExpiry = Date.now() + ((data.expires_in - 60) * 1000);
    return cachedAccessToken;
}

const APP_VERSION = 'v17';

// Globals for Report Generation
let aoiDrawnItem = null;
let reportChartInst = null;
let reportMapInst = null;
let reportDiffMapInst = null;

// Evalscript wrapper utility
const genEvalscript = (bands, logic) => `
//VERSION=3
function setup() {
  return {
    input: [${bands.map(b => `'${b}'`).join(', ')}, "dataMask"],
    output: { bands: 4 }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0, 0, 0, 0];
  ${logic}
}
`;

// Multi-Temporal Evalscript wrapper for differences
const genDiffEvalscript = (bands, calcLogic) => `
//VERSION=3
function setup() {
  return {
    input: [${bands.map(b => `'${b}'`).join(', ')}, "dataMask"],
    output: { bands: 4 },
    mosaicking: "ORBIT"
  };
}
function evaluatePixel(samples) {
  if (samples.length < 2) return [0, 0, 0, 0.1]; // Need 2 dates
  let s1 = samples[samples.length - 1]; // oldest (T1)
  let s2 = samples[0]; // newest (T2)
  if (s1.dataMask === 0 || s2.dataMask === 0) return [0, 0, 0, 0];
  
  let val1 = ${calcLogic.replace(/sample/g, 's1')};
  let val2 = ${calcLogic.replace(/sample/g, 's2')};
  let diff = val2 - val1;
  
  if (diff < -0.15) return [1.0, 0.2, 0.2, 0.8]; // Strong decrease
  if (diff < -0.05) return [1.0, 0.4, 0.4, 0.6]; // Slight decrease
  if (diff > 0.15) return [0.2, 0.6, 1.0, 0.8]; // Strong increase
  if (diff > 0.05) return [0.4, 0.7, 1.0, 0.6]; // Slight increase
  return [0.2, 0.2, 0.2, 0.3]; // Stable
}
`;

// Advanced continuous color blending logic for evalscripts
function colorBlend(valExpr, stopsStr) {
    return `
  let v = Math.max(0, Math.min(1, ${valExpr}));
  const stops = ${stopsStr};
  let i = 0;
  while (i < stops.length - 1 && v >= stops[i+1][0]) { i++; }
  if (i === stops.length - 1) { 
      let s = stops[i];
      return [s[1]/255, s[2]/255, s[3]/255, 1];
  }
  let s0 = stops[i], s1 = stops[i+1];
  let t = (v - s0[0]) / (s1[0] - s0[0]);
  return [
      (s0[1] + t * (s1[1] - s0[1])) / 255,
      (s0[2] + t * (s1[2] - s0[2])) / 255,
      (s0[3] + t * (s1[3] - s0[3])) / 255,
      1
  ];`;
}

// Palette Definitions
const PALETTE_NDMI = "[[0, 212, 106, 36], [0.35, 239, 216, 122], [0.6, 28, 133, 166], [1, 10, 60, 100]]";
const PALETTE_NDWI = "[[0, 130, 70, 20], [0.35, 215, 170, 60], [0.6, 80, 150, 200], [1, 20, 80, 180]]";
const PALETTE_SI = "[[0, 36, 51, 64], [0.15, 180, 130, 40], [0.3, 220, 140, 50], [1, 240, 80, 30]]";
const PALETTE_VEG = "[[0, 160, 120, 50], [0.3, 210, 180, 60], [0.6, 90, 160, 60], [1, 20, 100, 40]]"; // Brown -> Yellow -> Dark Green
const PALETTE_MSI = "[[0, 28, 133, 166], [0.5, 239, 216, 122], [1, 212, 106, 36]]"; // Blue -> Yellow -> Orange (Inverse of NDMI)
const PALETTE_BRINE = "[[0, 10, 60, 100], [0.35, 120, 100, 50], [0.6, 240, 80, 30], [1, 230, 20, 20]]"; // Blue -> Brown -> Orange -> Red
const PALETTE_CSI = "[[0, 160, 120, 50], [0.5, 100, 220, 80], [1, 0, 255, 255]]"; // Brown -> Lime -> Cyan
const PALETTE_HCAI = "[[0, 245, 222, 179], [0.5, 139, 69, 19], [1, 0, 0, 0]]"; // Wheat -> SaddleBrown -> Black
const PALETTE_HMRI = "[[0, 230, 230, 250], [0.5, 128, 0, 128], [1, 255, 0, 255]]"; // Lavender -> Purple -> Magenta

// Index Configs
const INDICES = {
    tc: {
        name: 'True Color',
        sensor: 'Sentinel-2 L2A',
        min: '0.0', max: '0.3',
        gradient: 'linear-gradient(to right, #000, #fff)',
        formula: 'RGB',
        info: 'Standard RGB bands (Red, Green, Blue) configured to provide human-readable, true-color imagery of the surface exactly as the eye would see it.',
        diffLabels: ['Decrease / Darker', 'Increase / Brighter'],
        evalscript: genEvalscript(['B04', 'B03', 'B02'], `
  let factor = 2.5;
  return [sample.B04 * factor, sample.B03 * factor, sample.B02 * factor, 1];
`),
        fisBands: ['B04', 'B03', 'B02'],
        fisLogic: `return [sample.B04, sample.B03, sample.B02];`
    },
    fc: {
        name: 'False Color (NIR)',
        sensor: 'Sentinel-2 L2A',
        min: '0.0', max: '0.3',
        gradient: 'linear-gradient(to right, #000, #fff)',
        formula: 'RGB (B08,B04,B03)',
        info: 'Utilizes Near-Infrared (NIR), Red, and Green bands. NIR reflects strongly off healthy vegetation while deeply absorbing water, making it ideal for highlighting plant health and defining sharp water boundaries.',
        diffLabels: ['Decrease / Darker', 'Increase / Brighter'],
        evalscript: genEvalscript(['B08', 'B04', 'B03'], `
  let factor = 2.5;
  return [sample.B08 * factor, sample.B04 * factor, sample.B03 * factor, 1];
`),
        fisBands: ['B08', 'B04', 'B03'],
        fisLogic: `return [sample.B08, sample.B04, sample.B03];`
    },
    ndmi: {
        name: 'Moisture Index (NDMI)',
        sensor: 'Sentinel-2 L2A',
        min: 'High Stress', max: 'High Moisture',
        gradient: 'linear-gradient(to right, #D46A24, #EFD87A, #1C85A6)',
        formula: '(B8A - B11) / (B8A + B11)',
        info: 'Normalized Difference Moisture Index uses NIR (B8A) and Short-wave Infrared (SWIR, B11). SWIR is highly sensitive to water content in leaves and soil. The normalized difference between NIR and SWIR closely tracks canopy water stress and topsoil moisture.',
        diffLabels: ['Drier / Moisture Loss', 'Wetter / Moisture Gain'],
        evalscript: genEvalscript(['B8A', 'B11'], `
  let sum = sample.B8A + sample.B11;
  if(sum === 0) return [0,0,0,0];
  let val = (sample.B8A - sample.B11) / sum;
  ${colorBlend('val + 0.3', PALETTE_NDMI)}
`),
        fisBands: ['B8A', 'B11'],
        fisLogic: `
  let sum = sample.B8A + sample.B11;
  if(sum === 0) return [0];
  return [(sample.B8A - sample.B11) / sum];
`
    },
    ndwi: {
        name: 'Wetness Index (NDWI)',
        sensor: 'Sentinel-2 L2A',
        min: 'Dry Surface', max: 'Saturated',
        gradient: 'linear-gradient(to right, #824614, #D7AA3C, #1450B4)',
        formula: '(B03 - B11) / (B03 + B11)',
        info: 'Normalized Difference Water Index uses Green (B03) and SWIR (B11) bands. Green reflects off visible water bodies, while SWIR strongly absorbs it. This ratio effectively isolates open surface water from dry land and vegetation anomalies.',
        diffLabels: ['Dries / Recedes', 'Wetter / Expands'],
        evalscript: genEvalscript(['B03', 'B11'], `
  let sum = sample.B03 + sample.B11;
  if(sum === 0) return [0,0,0,0];
  let val = (sample.B03 - sample.B11) / sum;
  ${colorBlend('val + 0.3', PALETTE_NDWI)}
`),
        fisBands: ['B03', 'B11'],
        fisLogic: `
  let sum = sample.B03 + sample.B11;
  if(sum === 0) return [0];
  return [(sample.B03 - sample.B11) / sum];
`
    },
    ndvi: {
        name: 'Vegetation Index (NDVI)',
        sensor: 'Sentinel-2 L2A',
        min: 'Barren', max: 'Lush Vegetation',
        gradient: 'linear-gradient(to right, #A07832, #D2B43C, #146428)',
        formula: '(B08 - B04) / (B08 + B04)',
        info: 'Normalized Difference Vegetation Index uses NIR (B08) and Red (B04). Chlorophyll absorbs Red light for photosynthesis, while leaf cell structures powerfully reflect NIR. This ratio is the standard proxy for surveying live, green vegetation density.',
        diffLabels: ['Unhealthier / Loss', 'Healthier / Gain'],
        evalscript: genEvalscript(['B08', 'B04'], `
  let sum = sample.B08 + sample.B04;
  if(sum === 0) return [0,0,0,0];
  let val = (sample.B08 - sample.B04) / sum;
  ${colorBlend('val + 0.1', PALETTE_VEG)}
`),
        fisBands: ['B08', 'B04'],
        fisLogic: `
  let sum = sample.B08 + sample.B04;
  if(sum === 0) return [0];
  return [(sample.B08 - sample.B04) / sum];
`
    },
    savi: {
        name: 'Arid Vegetation (SAVI)',
        sensor: 'Sentinel-2 L2A',
        min: 'Barren Soil', max: 'Dense Brush',
        gradient: 'linear-gradient(to right, #A07832, #D2B43C, #146428)',
        formula: '((B08 - B04) / (B08 + B04 + 0.5)) × 1.5',
        info: 'Soil Adjusted Vegetation Index is similar to NDVI but introduces a soil-brightness correction factor (L=0.5) to minimize the influence of background soil reflectance in arid, desert, or sparsely vegetated regions.',
        diffLabels: ['Unhealthier / Loss', 'Healthier / Gain'],
        evalscript: genEvalscript(['B08', 'B04'], `
  let sum = sample.B08 + sample.B04 + 0.5;
  if(sum === 0) return [0,0,0,0];
  let val = ((sample.B08 - sample.B04) / sum) * 1.5;
  ${colorBlend('val + 0.2', PALETTE_VEG)}
`),
        fisBands: ['B08', 'B04'],
        fisLogic: `
  let sum = sample.B08 + sample.B04 + 0.5;
  if(sum === 0) return [0];
  return [((sample.B08 - sample.B04) / sum) * 1.5];
`
    },
    msi: {
        name: 'Moisture Stress Index (MSI)',
        sensor: 'Sentinel-2 L2A',
        min: 'High Content', max: 'Severe Stress',
        gradient: 'linear-gradient(to right, #1C85A6, #EFD87A, #D46A24)',
        formula: 'B11 / B08',
        info: 'Moisture Stress Index is a simple band ratio of SWIR (B11) to NIR (B08). Higher values indicate lower moisture availability, inversely tracking drought stress and dry soil conditions impacting plant canopies.',
        diffLabels: ['More Stressed / Drier', 'Less Stressed / Wetter'],
        evalscript: genEvalscript(['B11', 'B08'], `
  if(sample.B08 === 0) return [0,0,0,0];
  let val = sample.B11 / sample.B08;
  // MSI typically ranges from 0.4 (low stress) to 2.0+ (high stress). 
  // We can map this to 0-1 for our colorBlend function.
  let mapped = Math.max(0, Math.min(1, (val - 0.4) / 1.6));
  ${colorBlend('mapped', PALETTE_MSI)}
`),
        fisBands: ['B11', 'B08'],
        fisLogic: `
  if(sample.B08 === 0) return [0];
  return [sample.B11 / sample.B08];
`
    },
    si: {
        name: 'Salinity Index (SI)',
        sensor: 'Sentinel-2 L2A',
        min: 'Low Salt', max: 'High Salt',
        gradient: 'linear-gradient(to right, #243340, #EFD87A, #F0501E)',
        formula: '(B11 - B08) / (B11 + B08)',
        info: 'Normalized Difference Salinity Index uses SWIR (B11) and NIR (B08) to detect surface salt crusts. Salt flats have high reflectance in both, enabling the detection of damaging soil salinity accumulations.',
        diffLabels: ['Saltier / Hazard', 'Less Salty / Recovery'],
        evalscript: genEvalscript(['B11', 'B08'], `
  let sum = sample.B11 + sample.B08;
  if(sum === 0) return [0,0,0,0];
  let val = (sample.B11 - sample.B08) / sum;
  // SI is Normalized Difference Salinity Index (NDSI)
  // Maps roughly -1 to +1. Land is typically negative. Salt flats are strongly positive.
  // We clamp and scale so only strictly positive values trigger the bright orange/reds.
  ${colorBlend('Math.max(0, val * 2)', PALETTE_SI)}
`),
        fisBands: ['B11', 'B08'],
        fisLogic: `
  let sum = sample.B11 + sample.B08;
  if(sum === 0) return [0];
  return [(sample.B11 - sample.B08) / sum];
`
    },
    brine: {
        name: 'Brine / Salt Water (NDSI)',
        sensor: 'Sentinel-2 L2A',
        min: 'Dry / Fresh', max: 'High Brine',
        gradient: 'linear-gradient(to right, #0A3C64, #786432, #F0501E, #E61414)',
        formula: '(B11 - B12) / (B11 + B12)',
        info: 'Utilizes the two SWIR bands (B11, B12) to detect highly absorptive brine and produced water spills. Brine significantly reduces the standard SWIR reflectance curve of typical soil, allowing for targeted chemical anomaly detection.',
        diffLabels: ['More Brine / Hazard', 'Less Brine / Recovery'],
        evalscript: genEvalscript(['B11', 'B12'], `
  let sum = sample.B11 + sample.B12;
  if(sum === 0) return [0,0,0,0];
  let val = (sample.B11 - sample.B12) / sum;
  ${colorBlend('Math.max(0, val * 2)', PALETTE_BRINE)}
`),
        fisBands: ['B11', 'B12'],
        fisLogic: `
  let sum = sample.B11 + sample.B12;
  if(sum === 0) return [0];
  return [(sample.B11 - sample.B12) / sum];
`
    },
    csi: {
        name: 'Contaminated Soil (Clay Ratio)',
        sensor: 'Sentinel-2 L2A',
        min: 'Healthy Soil', max: 'Contaminated',
        gradient: 'linear-gradient(to right, #A07832, #64DC50, #00FFFF)',
        formula: 'B11 / B12',
        info: 'Contaminated Soil / Clay Ratio uses the ratio of SWIR bands (B11/B12). This index is highly sensitive to clay minerals, helping distinguish mechanically disturbed, stripped, or eroded topsoil from healthy surrounding earth.',
        diffLabels: ['More Contaminated', 'Less Contaminated / Recovery'],
        evalscript: genEvalscript(['B11', 'B12'], `
  if(sample.B12 === 0) return [0,0,0,0];
  let val = sample.B11 / sample.B12;
  let mapped = Math.max(0, Math.min(1, (val - 0.5) / 2.0));
  ${colorBlend('mapped', PALETTE_CSI)}
`),
        fisBands: ['B11', 'B12'],
        fisLogic: `
  if(sample.B12 === 0) return [0];
  return [sample.B11 / sample.B12];
`
    },
    hcai: {
        name: 'Hydrocarbons (HCAI)',
        sensor: 'Sentinel-2 L2A',
        min: 'Background', max: 'High Contamination',
        gradient: 'linear-gradient(to right, #F5DEB3, #8B4513, #000000)',
        formula: '(B11 - B04) / (B11 + B04)',
        info: 'Hydrocarbon Absorption Index separates brine-only spills from produced water spills containing crude oil traces. Hydrocarbons strongly absorb red light (B04) but reflect SWIR (B11), creating a distinct oil/water signature.',
        diffLabels: ['More Hydrocarbons', 'Less / Recovery'],
        evalscript: genEvalscript(['B11', 'B04'], `
  let sum = sample.B11 + sample.B04;
  if(sum === 0) return [0,0,0,0];
  let val = (sample.B11 - sample.B04) / sum;
  let mapped = Math.max(0, val * 2);
  ${colorBlend('mapped', PALETTE_HCAI)}
`),
        fisBands: ['B11', 'B04'],
        fisLogic: `
  let sum = sample.B11 + sample.B04;
  if(sum === 0) return [0];
  return [(sample.B11 - sample.B04) / sum];
`
    },
    hmri: {
        name: 'Heavy Metals (HMRI)',
        sensor: 'Sentinel-2 L2A',
        min: 'Background', max: 'High Toxicity',
        gradient: 'linear-gradient(to right, #E6E6FA, #800080, #FF00FF)',
        formula: 'B12 / B03',
        info: 'Heavy Metal Reflectance Index tracks the ratio of SWIR (B12) to Green (B03) light. Soils subjected to severe brine/produced water contamination often precipitate heavy metals (barium, strontium) which alter background mineralogy and induce severe localized vegetation stress.',
        diffLabels: ['More Metals / Stress', 'Less / Recovery'],
        evalscript: genEvalscript(['B12', 'B03'], `
  if(sample.B03 === 0) return [0,0,0,0];
  let val = sample.B12 / sample.B03;
  let mapped = Math.max(0, Math.min(1, (val - 0.5) / 2.0));
  ${colorBlend('mapped', PALETTE_HMRI)}
`),
        fisBands: ['B12', 'B03'],
        fisLogic: `
  if(sample.B03 === 0) return [0];
  return [sample.B12 / sample.B03];
`
    },
    s1_sar: {
        name: 'SAR Moisture (VV/VH)',
        sensor: 'Sentinel-1 GRD',
        min: 'Dry / Smooth', max: 'Wet / Rough',
        gradient: 'linear-gradient(to right, #000000, #448833, #CCDD55)',
        formula: 'RGB [VV, VH, VV/VH]',
        info: 'Synthetic Aperture Radar utilizes C-band microwaves (VV/VH polarizations) which penetrate clouds and darkness to measure surface roughness and dielectric constant. Smooth water surfaces appear dark, while rough terrain or physical structures appear brightly reflective.',
        diffLabels: ['Smoother / Drier', 'Rougher / Wetter'],
        evalscript: `//VERSION=3
function setup() {
  return {
    input: ["VV", "VH", "dataMask"],
    output: { bands: 4 }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0,0];
  let vv = Math.max(0, Math.log10(sample.VV) * 10 + 20) / 20;
  let vh = Math.max(0, Math.log10(sample.VH) * 10 + 20) / 20;
  let ratio = vv / (vh + 0.001);
  return [vv, vh, ratio * 0.5, 1];
}`,
        fisBands: ['VV', 'VH'],
        fisLogic: `
  if (sample.VV <= 0) return [0];
  // Return the backscatter intensity directly for statistical trending
  return [sample.VV];
`
    },

    tc: {
        name: 'True Color (RGB)',
        sensor: 'Sentinel-2 L2A',
        min: '', max: '',
        gradient: 'none',
        formula: 'RGB [B04, B03, B02]',
        evalscript: genEvalscript(['B04', 'B03', 'B02'], `return [sample.B04 * 2.5, sample.B03 * 2.5, sample.B02 * 2.5, 1];`)
    },
    fc: {
        name: 'False Color (NIR)',
        sensor: 'Sentinel-2 L2A',
        min: '', max: '',
        gradient: 'none',
        formula: 'RGB [B08, B04, B03]',
        evalscript: genEvalscript(['B08', 'B04', 'B03'], `return [sample.B08 * 2.5, sample.B04 * 2.5, sample.B03 * 2.5, 1];`),
        diffscript: genDiffEvalscript(['B08', 'B04', 'B03'], `(sample.B08 + sample.B04 + sample.B03)/3`)
    }
};

const BASE_LAYERS = {
    imagery: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    topo: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
};

const state = {
    map: null,
    baseLayerInst: null,
    activeLoc: 'lea',
    activeIndex: 'ndmi',
    mode: 'single', // 'single' or 'compare'
    monthIndex: Math.max(0, ALL_DATES.length - 1),
    sarFusion: false, // track the state of the SAR Overlay toggle
    opacity: 0.85,
    overlayGroup: null,
    leftGroup: null,
    rightGroup: null,
    sbsControl: null,
    chartInst: null
};

// ── INIT ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const vBadge = document.getElementById('app-version-badge');
    if (vBadge) vBadge.textContent = APP_VERSION;

    // Populate Compare Mode DOM dropdowns
    const t1Sel = document.getElementById('date-t1');
    const t2Sel = document.getElementById('date-t2');
    if (t1Sel && t2Sel) {
        ALL_DATES.forEach((d, i) => {
            let opt1 = document.createElement('option');
            opt1.value = d.value;
            opt1.textContent = d.label;
            t1Sel.appendChild(opt1);

            let opt2 = document.createElement('option');
            opt2.value = d.value;
            opt2.textContent = d.label;
            t2Sel.appendChild(opt2);
        });

        // Defaults: T1 = ~1 year ago, T2 = latest
        t1Sel.selectedIndex = Math.max(0, ALL_DATES.length - 13);
        t2Sel.selectedIndex = Math.max(0, ALL_DATES.length - 1);
    }

    // Configure single mode slider & ticks
    const slider = document.getElementById('time-slider');
    const ticksContainer = document.getElementById('slider-ticks-container');
    const sliderFill = document.getElementById('time-slider-fill');

    if (slider) {
        slider.max = Math.max(0, ALL_DATES.length - 1);
        slider.value = state.monthIndex;
        // initial fill
        if (sliderFill) {
            const pct = (slider.value / slider.max) * 100;
            sliderFill.style.width = `${pct}%`;
        }
    }

    if (ticksContainer) {
        ticksContainer.innerHTML = '';
        let lastDisplayedYear = 0;
        ALL_DATES.forEach((d, i) => {
            let currentYear = parseInt(d.value.split('-')[0]);

            // We want tick marks for EVERY date for interactive snapping,
            // but we only want labels for the start of the year so it doesn't get cluttered.
            let div = document.createElement('div');
            div.className = 'tick-mark';
            div.style.left = `${(i / (ALL_DATES.length - 1)) * 100}%`;

            let tooltip = document.createElement('div');
            tooltip.className = 'tick-tooltip';
            tooltip.innerText = d.short;
            div.appendChild(tooltip);

            // Add year labels sparsely
            if (currentYear > lastDisplayedYear) {
                lastDisplayedYear = currentYear;
                let label = document.createElement('div');
                label.className = 'tick-label';
                label.innerText = "'" + String(currentYear).slice(-2);
                div.appendChild(label);
            }

            // Make the tick clickable
            div.addEventListener('click', () => {
                if (state.monthIndex !== i) {
                    slider.value = i;
                    // manually trigger the logic the slider input event would do
                    state.monthIndex = parseInt(i, 10);
                    document.getElementById('current-month-display').innerText = ALL_DATES[state.monthIndex].displayStr;
                    if (sliderFill) {
                        const pct = (i / slider.max) * 100;
                        sliderFill.style.width = `${pct}%`;
                    }
                    applyIndex();
                }
            });

            ticksContainer.appendChild(div);
        });
    }

    // Set initial display before initMap overwrites via applyIndex()
    document.getElementById('current-month-display').innerText = ALL_DATES[state.monthIndex].displayStr;


    initMap();
    bindEvents();

    // Remove loading overlay
    setTimeout(() => {
        document.getElementById('loading').style.opacity = '0';
        setTimeout(() => document.getElementById('loading').style.display = 'none', 500);
    }, 1200);
});

function initMap() {
    const startLoc = AOI_LOCATIONS[state.activeLoc];
    state.map = L.map('map', {
        center: [startLoc.lat, startLoc.lng],
        zoom: startLoc.zoom,
        zoomControl: false,
        attributionControl: true
    });

    L.control.zoom({ position: 'bottomleft' }).addTo(state.map);

    // Add base layer
    state.baseLayerInst = L.tileLayer(BASE_LAYERS.imagery, { maxZoom: 18 }).addTo(state.map);

    applyIndex();
}

// ─── GIF Frame Player ─────────────────────────────────────────────────────────
// Injects playback controls (play/pause, step, seek, speed) below imgEl.
// Uses pre-rendered data-URL frames from renderCanvas — no re-fetch needed.
// Also triggers gifshot encoding in background so downloadBtn gets a real GIF file.
function createGifPlayer(frames, imgEl, downloadBtn) {
    if (!frames || frames.length === 0) return;

    // Forward-declared mutable refs (closures capture by reference)
    let current = 0;
    let playing = false;
    let intervalMs = 400;
    let timer = null;
    let playBtnEl = null;
    let counterEl = null;
    let seekFillEl = null;

    const clamp = (i) => ((i % frames.length) + frames.length) % frames.length;

    const show = (idx) => {
        current = clamp(idx);
        imgEl.src = frames[current];
        if (counterEl) counterEl.textContent = `${current + 1} / ${frames.length}`;
        if (seekFillEl) seekFillEl.style.width = `${((current + 1) / frames.length) * 100}%`;
    };

    const pause = () => {
        playing = false;
        clearInterval(timer); timer = null;
        if (playBtnEl) { playBtnEl.textContent = '▶'; playBtnEl.classList.remove('active'); }
    };

    const play = () => {
        clearInterval(timer);
        playing = true;
        if (playBtnEl) { playBtnEl.textContent = '⏸'; playBtnEl.classList.add('active'); }
        timer = setInterval(() => show(current + 1), intervalMs);
    };

    // ── Build controls row ──────────────────────────────────
    const row = document.createElement('div');
    row.className = 'gif-player-controls';

    const mkBtn = (label, title, onClick) => {
        const b = document.createElement('button');
        b.className = 'gif-player-btn';
        b.textContent = label; b.title = title;
        b.addEventListener('click', onClick);
        return b;
    };

    row.appendChild(mkBtn('⏮', 'First frame', () => { pause(); show(0); }));
    row.appendChild(mkBtn('◀', 'Previous frame', () => { pause(); show(current - 1); }));

    playBtnEl = mkBtn('⏸', 'Play / Pause', () => playing ? pause() : play());
    playBtnEl.classList.add('active');
    row.appendChild(playBtnEl);

    row.appendChild(mkBtn('▶', 'Next frame', () => { pause(); show(current + 1); }));
    row.appendChild(mkBtn('⏭', 'Last frame', () => { pause(); show(frames.length - 1); }));

    // Seek bar
    const seekBar = document.createElement('div');
    seekBar.className = 'gif-player-seek';
    seekFillEl = document.createElement('div');
    seekFillEl.className = 'gif-player-seek-fill';
    seekBar.appendChild(seekFillEl);
    seekBar.addEventListener('click', (e) => {
        const r = seekBar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        pause();
        show(Math.round(ratio * (frames.length - 1)));
    });
    row.appendChild(seekBar);

    counterEl = document.createElement('span');
    counterEl.className = 'gif-player-counter';
    row.appendChild(counterEl);

    // Speed group
    const speedGroup = document.createElement('div');
    speedGroup.className = 'gif-speed-group';
    [{ label: '0.5×', ms: 800 }, { label: '1×', ms: 400 }, { label: '2×', ms: 200 }, { label: '4×', ms: 100 }].forEach((s, i) => {
        const sb = document.createElement('button');
        sb.className = 'gif-speed-btn' + (i === 1 ? ' active' : '');
        sb.textContent = s.label;
        sb.addEventListener('click', () => {
            intervalMs = s.ms;
            speedGroup.querySelectorAll('.gif-speed-btn').forEach(b => b.classList.remove('active'));
            sb.classList.add('active');
            if (playing) play();
        });
        speedGroup.appendChild(sb);
    });
    row.appendChild(speedGroup);

    // Remove existing controls if any
    const existingControls = imgEl.parentElement.querySelectorAll('.gif-player-controls');
    existingControls.forEach(c => c.remove());

    // Insert controls after the img
    imgEl.insertAdjacentElement('afterend', row);

    // Start player
    show(0);
    play();

    // ── Background GIF encoding for download ───────────────
    if (downloadBtn) {
        downloadBtn.style.opacity = '0.4';
        downloadBtn.style.pointerEvents = 'none';
        downloadBtn.title = 'Encoding GIF…';
        gifshot.createGIF({
            images: frames,
            gifWidth: 400, gifHeight: 330,
            interval: intervalMs / 1000,
            sampleInterval: 10
        }, obj => {
            if (!obj.error) {
                downloadBtn.href = obj.image;
                downloadBtn.style.opacity = '1';
                downloadBtn.style.pointerEvents = '';
                downloadBtn.title = 'Download GIF';
            }
        });
    }
}

function getScriptContent(activeIndex, isDiff) {
    const cfg = INDICES[activeIndex];
    let scriptContent = cfg.evalscript;

    if (isDiff) {
        if (cfg.diffscript) {
            scriptContent = cfg.diffscript;
        } else if (activeIndex === 's1_sar') {
            // SAR Difference Evalscript
            scriptContent = `//VERSION=3
function setup() {
  return {
    input: ["VV", "dataMask"],
    output: { bands: 4 },
    mosaicking: "ORBIT"
  };
}
function evaluatePixel(samples) {
  if (samples.length < 2) return [0, 0, 0, 0.1];
  let s1 = samples[samples.length - 1]; // oldest
  let s2 = samples[0]; // newest
  if (s1.dataMask === 0 || s2.dataMask === 0) return [0, 0, 0, 0];
  
  let val1 = Math.log10(s1.VV);
  let val2 = Math.log10(s2.VV);
  let diff = val2 - val1;
  
  if (diff < -0.2) return [1.0, 0.2, 0.2, 0.8]; // Decrease
  if (diff > 0.2) return [0.2, 0.6, 1.0, 0.8]; // Increase
  return [0.2, 0.2, 0.2, 0.3]; // Stable
}
`;
        } else {
            let calc = '0';

            // Healthy / Wet / Vegetation Indices (Increase = Blue/Green/Good, Decrease = Red/Loss)
            if (activeIndex === 'ndvi') calc = '(sample.B08 - sample.B04)/(sample.B08 + sample.B04)';
            else if (activeIndex === 'ndmi') calc = '(sample.B8A - sample.B11)/(sample.B8A + sample.B11)';
            else if (activeIndex === 'ndwi') calc = '(sample.B03 - sample.B11)/(sample.B03 + sample.B11)';
            else if (activeIndex === 'savi') calc = '(((sample.B08 - sample.B04)/(sample.B08 + sample.B04 + 0.5)) * 1.5)';

            // Hazard / Arid / Contamination Indices 
            // We intrinsically NEGATE the calculations here. By doing so, an INCREASE in contamination/stress
            // generates a negative delta algebra, correctly mapping the visual threshold to RED/LOSS.
            else if (activeIndex === 'msi') calc = '-(sample.B11 / sample.B08)';
            else if (activeIndex === 'si') calc = '-((sample.B11 - sample.B08)/(sample.B11 + sample.B08))';
            else if (activeIndex === 'brine') calc = '-((sample.B11 - sample.B12)/(sample.B11 + sample.B12))';
            else if (activeIndex === 'csi') calc = '-(sample.B11 / sample.B12)';

            // Proxies for visual bands
            else if (activeIndex === 'tc') calc = '(sample.B04*2)'; // simplistic proxy for True Color change
            else if (activeIndex === 'fc') calc = '(sample.B08*2)'; // simplistic proxy for False Color change

            // Define physical spectral sampling arrays
            let bands = ['B04', 'B03', 'B02'];
            if (activeIndex === 'ndmi') bands = ['B8A', 'B11'];
            if (activeIndex === 'ndwi') bands = ['B03', 'B11'];
            if (activeIndex === 'ndvi' || activeIndex === 'savi') bands = ['B08', 'B04'];
            if (activeIndex === 'msi' || activeIndex === 'si') bands = ['B11', 'B08'];
            if (activeIndex === 'brine' || activeIndex === 'csi') bands = ['B11', 'B12'];
            if (activeIndex === 'fc') bands = ['B08', 'B04', 'B03'];

            scriptContent = genDiffEvalscript(bands, calc);
        }
    }
    return scriptContent;
}

function getWMSLayer(timeStr, isDiff, overrideIndex = null) {
    const activeIdx = overrideIndex || state.activeIndex;
    let scriptContent = getScriptContent(activeIdx, isDiff);

    let wmsLayerParam = 'AGRICULTURE';
    if (activeIdx === 's1_sar') wmsLayerParam = 'SENTINEL1-GRD';

    return L.tileLayer.wms(SH_WMS_URL, {
        layers: wmsLayerParam,
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        time: timeStr,
        maxcc: 20,
        showlogo: false,
        evalscript: btoa(scriptContent),
        opacity: overrideIndex ? 0.5 : state.opacity,
        attribution: 'Copernicus Sentinel Hub',
        tileSize: 256,
        minZoom: 10,
        zIndex: overrideIndex ? 20 : 10
    });
}

function clearLayers() {
    if (state.overlayGroup) { state.map.removeLayer(state.overlayGroup); state.overlayGroup = null; }
    if (state.leftGroup) { state.map.removeLayer(state.leftGroup); state.leftGroup = null; }
    if (state.rightGroup) { state.map.removeLayer(state.rightGroup); state.rightGroup = null; }
    if (state.sbsControl) { state.map.removeControl(state.sbsControl); state.sbsControl = null; }
}

function applyIndex() {
    clearLayers();

    if (state.activeIndex === 'none') {
        updateUI();
        return; // Skip adding WMS imagery layers entirely
    }

    const layersToGroup = [];
    const rightLayersGroup = [];

    if (state.mode === 'single') {
        const timeStr = ALL_DATES[state.monthIndex].value;
        layersToGroup.push(getWMSLayer(timeStr, false));

        if (state.sarFusion && state.activeIndex !== 's1_sar') {
            layersToGroup.push(getWMSLayer(timeStr, false, 's1_sar'));
        }

        state.overlayGroup = L.layerGroup(layersToGroup).addTo(state.map);
    } else {
        const t1 = document.getElementById('date-t1').value;
        const t2 = document.getElementById('date-t2').value;

        if (state.compareType === 'swipe') {
            const l_layer = getWMSLayer(t1, false);
            const r_layer = getWMSLayer(t2, false);

            layersToGroup.push(l_layer);
            rightLayersGroup.push(r_layer);

            if (state.sarFusion && state.activeIndex !== 's1_sar') {
                const s1_l_layer = getWMSLayer(t1, false, 's1_sar');
                const s1_r_layer = getWMSLayer(t2, false, 's1_sar');
                layersToGroup.push(s1_l_layer);
                rightLayersGroup.push(s1_r_layer);
            }

            state.leftGroup = L.layerGroup(layersToGroup).addTo(state.map);
            state.rightGroup = L.layerGroup(rightLayersGroup).addTo(state.map);

            state.sbsControl = L.control.sideBySide(state.leftGroup.getLayers(), state.rightGroup.getLayers()).addTo(state.map);
        } else if (state.compareType === 'diff') {
            const timeRange = `${t1}/${t2}`;
            const diffLayer = getWMSLayer(timeRange, true);
            layersToGroup.push(diffLayer);

            if (state.sarFusion && state.activeIndex !== 's1_sar') {
                layersToGroup.push(getWMSLayer(timeRange, true, 's1_sar'));
            }

            state.overlayGroup = L.layerGroup(layersToGroup).addTo(state.map);
        }
    }

    updateUI();
}

function updateUI() {
    if (state.activeIndex === 'none') {
        document.querySelector('.legend-panel').style.display = 'none';
        document.getElementById('btn-generate-report').disabled = true; // Disable report on none
        return;
    } else {
        document.querySelector('.legend-panel').style.display = 'block';
        if (document.getElementById('btn-generate-report').innerText !== "Querying Database...") {
            // Only re-enable if there is a drawn item
            if (document.querySelector('.leaflet-interactive')) {
                document.getElementById('btn-generate-report').disabled = false;
            }
        }
    }

    const cfg = INDICES[state.activeIndex];
    document.getElementById('active-index-name').innerText = cfg.name;
    document.getElementById('sensor-tag-display').innerText = cfg.sensor;
    document.getElementById('legend-min').innerText = cfg.min;
    document.getElementById('legend-max').innerText = cfg.max;
    document.getElementById('formula-display').innerText = cfg.formula;

    const diffPos = document.getElementById('diff-label-pos');
    const diffNeg = document.getElementById('diff-label-neg');
    if (diffPos && diffNeg) {
        if (cfg.diffLabels) {
            diffNeg.innerText = cfg.diffLabels[0];
            diffPos.innerText = cfg.diffLabels[1];
        } else {
            diffNeg.innerText = "Decrease (Loss)";
            diffPos.innerText = "Increase (Gain)";
        }
    }

    const grad = document.getElementById('legend-gradient');
    const diffLegend = document.getElementById('diff-legend');

    if (diffLegend) diffLegend.style.display = 'none';

    if (state.mode === 'compare' && state.compareType === 'diff') {
        if (diffLegend) {
            diffLegend.style.display = 'block';
        }
        grad.style.display = 'none';
        document.getElementById('legend-min').style.display = 'none';
        document.getElementById('legend-max').style.display = 'none';
    } else if (cfg.gradient === 'none') {
        grad.style.display = 'none';
        document.getElementById('legend-min').style.display = 'none';
        document.getElementById('legend-max').style.display = 'none';
    } else {
        if (diffLegend) diffLegend.style.display = 'none';
        grad.style.display = 'block';
        document.getElementById('legend-min').style.display = 'block';
        document.getElementById('legend-max').style.display = 'block';
        grad.style.background = cfg.gradient;
    }
}



// ── EVENT BINDINGS ─────────────────────────────────
function bindEvents() {
    // Mode Switcher
    const mSing = document.getElementById('mode-single');
    const mComp = document.getElementById('mode-compare');
    const cSing = document.getElementById('single-time-container');
    const cComp = document.getElementById('compare-dates-container');

    mSing.addEventListener('click', () => {
        state.mode = 'single';
        mSing.classList.add('active'); mComp.classList.remove('active');
        cSing.style.display = 'block'; cComp.style.display = 'none';
        applyIndex();
    });

    mComp.addEventListener('click', () => {
        state.mode = 'compare';
        mComp.classList.add('active'); mSing.classList.remove('active');
        cComp.style.display = 'block'; cSing.style.display = 'none';
        applyIndex();
    });

    // Compare Layout Toggle
    const btnSwipe = document.getElementById('btn-swipe');
    const btnDiff = document.getElementById('btn-diff');
    if (btnSwipe && btnDiff) {
        btnSwipe.addEventListener('click', (e) => {
            state.compareType = 'swipe';
            btnSwipe.classList.add('active');
            btnDiff.classList.remove('active');
            applyIndex();
        });
        btnDiff.addEventListener('click', (e) => {
            state.compareType = 'diff';
            btnDiff.classList.add('active');
            btnSwipe.classList.remove('active');
            applyIndex();
        });
    }

    // Index Buttons
    document.querySelectorAll('.index-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.index-btn').forEach(b => b.classList.remove('active'));
            let target = e.currentTarget;
            target.classList.add('active');
            state.activeIndex = target.dataset.index;
            applyIndex();
        });
    });

    // Location Buttons
    document.querySelectorAll('.loc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.loc-btn').forEach(b => b.classList.remove('active'));
            let target = e.currentTarget;
            target.classList.add('active');
            let key = target.dataset.loc;
            state.activeLoc = key;
            const loc = AOI_LOCATIONS[key];

            document.getElementById('disp-lat').innerText = loc.lat.toFixed(4) + '°';
            document.getElementById('disp-lng').innerText = loc.lng.toFixed(4) + '°';

            state.map.flyTo([loc.lat, loc.lng], loc.zoom, { duration: 1.5 });
            document.getElementById('loc-search-input').value = '';
        });
    });

    // Custom Location Search
    const searchBtn = document.getElementById('btn-search-loc');
    const searchInput = document.getElementById('loc-search-input');

    const handleLocationSearch = async () => {
        const query = searchInput.value.trim();
        if (!query) return;

        searchBtn.innerText = '...';
        searchBtn.disabled = true;

        try {
            // Check if it's already coordinates: "31.55, -103.95" or "31.55 -103.95"
            // Matches optional minus, digits, period, optional space/comma
            const coordRegex = /^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/;
            const match = query.match(coordRegex);

            let lat, lng;

            if (match) {
                // Direct coordinates
                lat = parseFloat(match[1]);
                lng = parseFloat(match[2]);
            } else {
                // Name lookup via Nominatim
                const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
                const data = await resp.json();

                if (!data || data.length === 0) {
                    alert("Location not found. Please try a different name or enter exactly 'lat, lng'.");
                    throw new Error("Geocode failed");
                }

                lat = parseFloat(data[0].lat);
                lng = parseFloat(data[0].lon);
            }

            // Deselect presets
            document.querySelectorAll('.loc-btn').forEach(b => b.classList.remove('active'));
            state.activeLoc = 'custom';

            document.getElementById('disp-lat').innerText = lat.toFixed(4) + '°';
            document.getElementById('disp-lng').innerText = lng.toFixed(4) + '°';

            // Fly to the new location
            state.map.flyTo([lat, lng], 14, { duration: 1.5 });

        } catch (err) {
            console.error("Location search error:", err);
        } finally {
            searchBtn.innerText = 'GO';
            searchBtn.disabled = false;
        }
    };

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', handleLocationSearch);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleLocationSearch();
        });
    }

    // Base Layer Buttons
    document.querySelectorAll('.layer-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.layer-toggle').forEach(b => b.classList.remove('active'));
            let target = e.currentTarget;
            target.classList.add('active');

            const lKey = target.dataset.layer;
            state.map.removeLayer(state.baseLayerInst);
            state.baseLayerInst = L.tileLayer(BASE_LAYERS[lKey], { maxZoom: 18 }).addTo(state.map);
            state.baseLayerInst.bringToBack();
        });
    });

    // SAR Fusion Toggle
    const toggleSar = document.getElementById('toggle-sar-fusion');
    if (toggleSar) {
        toggleSar.addEventListener('change', (e) => {
            state.sarFusion = e.target.checked;
            applyIndex();
        });
    }

    // Sliders
    const slider = document.getElementById('time-slider');
    const sliderFill = document.getElementById('time-slider-fill');
    if (slider) {
        slider.addEventListener('input', (e) => {
            state.monthIndex = parseInt(e.target.value, 10);
            document.getElementById('current-month-display').innerText = ALL_DATES[state.monthIndex].displayStr;

            if (sliderFill) {
                const pct = (state.monthIndex / slider.max) * 100;
                sliderFill.style.width = `${pct}%`;
            }
            if (state.mode === 'single') applyIndex();
        });
    }

    const opSlider = document.getElementById('opacity-slider');
    const opSliderFill = document.getElementById('opacity-slider-fill');
    opSlider.addEventListener('input', (e) => {
        state.opacity = parseInt(e.target.value) / 100;

        if (opSliderFill) {
            opSliderFill.style.width = `${e.target.value}%`;
        }

        const setOp = (layer) => { if (layer && layer.setOpacity) layer.setOpacity(state.opacity); }
        if (state.overlayGroup) state.overlayGroup.eachLayer(setOp);
        if (state.leftGroup) state.leftGroup.eachLayer(setOp);
        if (state.rightGroup) state.rightGroup.eachLayer(setOp);
    });

    // Compare Dates
    document.getElementById('date-t1').addEventListener('change', () => { if (state.mode === 'compare') applyIndex(); });
    document.getElementById('date-t2').addEventListener('change', () => { if (state.mode === 'compare') applyIndex(); });

    // Map Mouse Move for exact coordinate tracking (optional enhancement)
    state.map.on('mousemove', function (e) {
        document.getElementById('disp-lat').innerText = e.latlng.lat.toFixed(4) + '°';
        document.getElementById('disp-lng').innerText = e.latlng.lng.toFixed(4) + '°';
    });

    // ==========================================================================
    // Report & AOI Logic
    // ==========================================================================

    const drawnItems = new L.FeatureGroup();
    state.map.addLayer(drawnItems);

    let drawControl = new L.Draw.Rectangle(state.map, {
        shapeOptions: {
            color: '#1C85A6',
            weight: 2,
            fillOpacity: 0.1
        }
    });

    document.getElementById('btn-draw-aoi').addEventListener('click', () => {
        drawnItems.clearLayers();
        aoiDrawnItem = null;
        document.getElementById('btn-generate-report').disabled = true;
        drawControl.enable();
    });

    state.map.on(L.Draw.Event.CREATED, function (e) {
        let layer = e.layer;
        drawnItems.addLayer(layer);
        aoiDrawnItem = layer;
        document.getElementById('btn-generate-report').disabled = false;
    });

    document.getElementById('btn-generate-report').addEventListener('click', async () => {
        if (!aoiDrawnItem) return;
        try {

            // 1. Populate Text Metadata
            const idx = INDICES[state.activeIndex];
            document.getElementById('report-date-run').innerText = new Date().toLocaleString();

            let bounds = aoiDrawnItem.getBounds();
            let bboxStr = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
            let bStr = `N: ${bounds.getNorth().toFixed(4)}°, S: ${bounds.getSouth().toFixed(4)}°, E: ${bounds.getEast().toFixed(4)}°, W: ${bounds.getWest().toFixed(4)}°`;
            document.getElementById('report-aoi-bounds').innerText = bStr;

            document.getElementById('report-index-name').innerText = `${idx.name} [${idx.sensor}]`;
            document.getElementById('report-math').innerText = idx.formula;

            if (state.mode === 'single') {
                document.getElementById('report-time').innerText = ALL_DATES[state.monthIndex].displayStr;
            } else {
                const d1 = document.getElementById('date-t1').value;
                const d2 = document.getElementById('date-t2').value;
                const t1Obj = ALL_DATES.find(d => d.value === d1);
                const t2Obj = ALL_DATES.find(d => d.value === d2);
                document.getElementById('report-time').innerText = `${t1Obj ? t1Obj.displayStr : d1} to ${t2Obj ? t2Obj.displayStr : d2} (Change Analysis)`;
            }

            let isOptical = (state.activeIndex === 'tc' || state.activeIndex === 'fc');
            const btn = document.getElementById('btn-generate-report');
            const chartSection = document.querySelector('.report-chart');

            if (isOptical) {
                chartSection.style.display = 'none';
            } else {
                chartSection.style.display = 'block';

                // 2. Generate Real Statistical Data via FIS
                btn.innerText = "Querying Database...";
                btn.disabled = true;

                let bandsStr = idx.fisBands.map(b => `'${b}'`).join(', ');
                const fisScript = `//VERSION=3
function setup() {
  return {
    input: [${bandsStr}, "dataMask"],
    output: [
      { id: "default", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "UINT8" }
    ]
  };
}
function evaluatePixel(sample) {
  let mask = sample.dataMask;
  let val = NaN;
  if (mask === 1) {
    val = (function() {
      ${idx.fisLogic}
    })()[0];
  }
  return { default: [val], dataMask: [mask] };
}`;

                // Determine Temporal Range
                let startD, endD, chartTitleLabel;

                if (state.mode === 'compare') {
                    let d1 = document.getElementById('date-t1').value;
                    let d2 = document.getElementById('date-t2').value;
                    if (d1 > d2) { const temp = d1; d1 = d2; d2 = temp; }
                    let d1D = new Date(d1);
                    let d2D = new Date(d2);
                    startD = new Date(Date.UTC(d1D.getUTCFullYear(), d1D.getUTCMonth() - 3, d1D.getUTCDate()));
                    endD = new Date(Date.UTC(d2D.getUTCFullYear(), d2D.getUTCMonth() + 3, d2D.getUTCDate()));
                    if (endD > today) endD = today;
                    chartTitleLabel = `Comparative T1/T2 Range`;
                } else {
                    let targetDateStr = ALL_DATES[state.monthIndex].value;
                    let sd = new Date(targetDateStr);
                    startD = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth() - 6, sd.getUTCDate()));
                    endD = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth() + 6, sd.getUTCDate()));
                    if (endD > today) endD = today;
                    chartTitleLabel = `Selected Date +/- 6 Months`;
                }

                const CHART_COLORS = {
                    ndmi: '#1C85A6', ndwi: '#1450B4', ndvi: '#146428', savi: '#A07832',
                    msi: '#D46A24', s1_sar: '#999999'
                };

                const activeKey = state.activeIndex;
                const cfg = INDICES[activeKey];

                const bboxCoords = bboxStr.split(',').map(Number);
                const collectionType = activeKey === 's1_sar' ? 'sentinel-1-grd' : 'sentinel-2-l2a';

                const statsPayload = {
                    input: {
                        bounds: { bbox: bboxCoords },
                        data: [{
                            type: collectionType,
                            dataFilter: {
                                timeRange: { from: startD.toISOString(), to: endD.toISOString() },
                                mosaickingOrder: "mostRecent"
                            }
                        }]
                    },
                    aggregation: {
                        timeRange: { from: startD.toISOString(), to: endD.toISOString() },
                        aggregationInterval: { of: "P5D" }, // Sample every 5 days for robust trendline
                        evalscript: fisScript,
                        resolution: 60
                    }
                };

                if (activeKey !== 's1_sar') {
                    statsPayload.input.data[0].dataFilter.maxCloudCoverage = 100;
                }

                btn.innerText = "Querying CDSE Analytics Hub...";
                try {
                    const token = await getCDSEToken();
                    const resp = await fetch(SH_STAT_API_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(statsPayload)
                    });

                    if (!resp.ok) {
                        const errPayload = await resp.text();
                        throw new Error(`CDSE API returned HTTP ${resp.status}: ${errPayload.substring(0, 150)}`);
                    }

                    const data = await resp.json();
                    let validData = {};
                    let rawRecordsCount = 0;

                    if (data.data) {
                        rawRecordsCount = data.data.length;
                        data.data.forEach(interval => {
                            let dateStr = interval.interval.from.slice(0, 10);
                            let statsObj = interval.outputs?.default?.bands?.B0?.stats;
                            if (statsObj && statsObj.sampleCount > 0 && statsObj.mean !== null && !isNaN(statsObj.mean)) {
                                validData[dateStr] = statsObj.mean;
                            }
                        });
                    }

                    let sortedDates = Object.keys(validData).sort((a, b) => new Date(a) - new Date(b));

                    if (sortedDates.length === 0) {
                        throw new Error(`Data Sparsity Error: CDSE Analytics Hub evaluated ${rawRecordsCount} time slices over the period, but 0 slices contained successfully computed index pixels for this AOI.`);
                    }

                    let chartLabels = sortedDates.map(d => d.slice(0, 10)); // YYYY-MM-DD
                    let chartDatasets = [{
                        label: cfg.name,
                        data: sortedDates.map(d => validData[d]),
                        borderColor: CHART_COLORS[activeKey] || '#ffffff',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        fill: true,
                        tension: 0.1,
                        pointRadius: 3,
                        pointHitRadius: 10,
                        spanGaps: true
                    }];

                    document.querySelector('.report-chart h3').innerText = `Multivariate Statistical Trends (AOI Mean) - ${chartTitleLabel}`;

                    const ctx = document.getElementById('reportChart').getContext('2d');
                    if (reportChartInst) reportChartInst.destroy();

                    reportChartInst = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: chartLabels,
                            datasets: chartDatasets
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: {
                                mode: 'index',
                                intersect: false,
                            },
                            plugins: {
                                legend: {
                                    display: true,
                                    labels: { color: 'rgba(255,255,255,0.8)', usePointStyle: true, boxWidth: 8 }
                                },
                                tooltip: {
                                    callbacks: {
                                        title: (ctx) => {
                                            return ctx[0].label;
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    grid: { color: 'rgba(255,255,255,0.05)' },
                                    ticks: { color: 'rgba(255,255,255,0.5)' }
                                },
                                x: {
                                    grid: { color: 'rgba(255,255,255,0.05)' },
                                    ticks: { color: 'rgba(255,255,255,0.5)', maxRotation: 45, minRotation: 45, maxTicksLimit: 12 }
                                }
                            }
                        }
                    });

                } catch (e) {
                    console.error("Failed to fetch statistical timeline", e);
                    alert("Statistical rendering failed. See console.");
                    btn.innerText = "Generate Selected Report";
                    btn.disabled = false;
                    return;
                }
            }

            btn.innerText = "Generate Selected Report";
            btn.disabled = false;

            // 4. Show Maps in Modal
            const diffContainer = document.getElementById('report-map-diff-container');
            const mapLabel = document.getElementById('report-map-label');
            const mapWrapperSingle = document.getElementById('report-map');
            const mapWrapperCompare = document.getElementById('side-by-side-maps');

            let activeBaseKey = 'imagery';
            document.querySelectorAll('.layer-toggle').forEach(btn => {
                if (btn.classList.contains('active')) activeBaseKey = btn.dataset.layer;
            });

            // --- Primary map (imagery / T2 date) ---
            if (!reportMapInst) {
                reportMapInst = L.map('report-map', {
                    zoomControl: true, attributionControl: false,
                    dragging: false, scrollWheelZoom: false,
                    doubleClickZoom: false, keyboard: false
                });
                reportMapInst.baseLayer = L.tileLayer(BASE_LAYERS[activeBaseKey], { maxZoom: 18 }).addTo(reportMapInst);
            } else {
                if (reportMapInst.baseLayer) reportMapInst.removeLayer(reportMapInst.baseLayer);
                reportMapInst.baseLayer = L.tileLayer(BASE_LAYERS[activeBaseKey], { maxZoom: 18 }).addTo(reportMapInst);
            }

            let overlayLayer = null;
            let rd1Compare = null, rd2Compare = null;
            if (state.mode === 'single') {
                mapWrapperSingle.style.display = 'block';
                mapWrapperCompare.style.display = 'none';

                overlayLayer = getWMSLayer(ALL_DATES[state.monthIndex].value, false);
                mapLabel.innerText = 'Area of Interest (AOI)';
                diffContainer.style.display = 'none';

                setTimeout(() => {
                    reportMapInst.invalidateSize();
                    reportMapInst.fitBounds(bounds, { padding: [20, 20] });

                    if (reportMapInst._drawnItems) reportMapInst._drawnItems.clearLayers();
                    else {
                        reportMapInst._drawnItems = new L.FeatureGroup();
                        reportMapInst.addLayer(reportMapInst._drawnItems);
                    }
                    L.rectangle(bounds, { color: '#1C85A6', weight: 3, fillOpacity: 0.2 }).addTo(reportMapInst._drawnItems);

                    if (reportMapInst.overlayLayer) reportMapInst.removeLayer(reportMapInst.overlayLayer);
                    if (overlayLayer) reportMapInst.overlayLayer = overlayLayer.addTo(reportMapInst);
                }, 150);

            } else {
                rd1Compare = document.getElementById('date-t1').value;
                rd2Compare = document.getElementById('date-t2').value;
                if (rd1Compare > rd2Compare) { const tmp = rd1Compare; rd1Compare = rd2Compare; rd2Compare = tmp; }

                mapWrapperSingle.style.display = 'none';
                mapWrapperCompare.style.display = 'flex';
                mapLabel.innerText = `Side by Side: T1 (${rd1Compare}) vs T2 (${rd2Compare})`;
                diffContainer.style.display = 'block';

                setTimeout(() => {
                    // We recycle reportMapInst for T1, and reportDiffMapInst (or a new one) for T2
                    if (!reportMapInst) {
                        reportMapInst = L.map('report-map-t1', {
                            zoomControl: false, attributionControl: false,
                            dragging: false, scrollWheelZoom: false,
                            doubleClickZoom: false, keyboard: false
                        });
                    } else {
                        // map already exists, just reparent if needed
                        reportMapInst.remove();
                        reportMapInst = L.map('report-map-t1', {
                            zoomControl: false, attributionControl: false,
                            dragging: false, scrollWheelZoom: false,
                            doubleClickZoom: false, keyboard: false
                        });
                    }

                    if (window.reportMapInstT2) {
                        window.reportMapInstT2.remove();
                    }

                    window.reportMapInstT2 = L.map('report-map-t2', {
                        zoomControl: false, attributionControl: false,
                        dragging: false, scrollWheelZoom: false,
                        doubleClickZoom: false, keyboard: false
                    });

                    L.tileLayer(BASE_LAYERS[activeBaseKey], { maxZoom: 18 }).addTo(reportMapInst);
                    L.tileLayer(BASE_LAYERS[activeBaseKey], { maxZoom: 18 }).addTo(window.reportMapInstT2);

                    reportMapInst.invalidateSize();
                    window.reportMapInstT2.invalidateSize();

                    reportMapInst.fitBounds(bounds, { padding: [10, 10] });
                    window.reportMapInstT2.fitBounds(bounds, { padding: [10, 10] });

                    L.rectangle(bounds, { color: '#1C85A6', weight: 3, fillOpacity: 0.2 }).addTo(reportMapInst);
                    L.rectangle(bounds, { color: '#1C85A6', weight: 3, fillOpacity: 0.2 }).addTo(window.reportMapInstT2);

                    getWMSLayer(rd1Compare, false).addTo(reportMapInst);
                    getWMSLayer(rd2Compare, false).addTo(window.reportMapInstT2);

                    // Init diff map below side-by-side
                    if (!reportDiffMapInst) {
                        reportDiffMapInst = L.map('report-map-diff', {
                            zoomControl: false, attributionControl: false,
                            dragging: false, scrollWheelZoom: false,
                            doubleClickZoom: false, keyboard: false
                        });
                        reportDiffMapInst.baseLayer = L.tileLayer(BASE_LAYERS[activeBaseKey], { maxZoom: 18 }).addTo(reportDiffMapInst);
                    } else {
                        if (reportDiffMapInst.baseLayer) reportDiffMapInst.removeLayer(reportDiffMapInst.baseLayer);
                        reportDiffMapInst.baseLayer = L.tileLayer(BASE_LAYERS[activeBaseKey], { maxZoom: 18 }).addTo(reportDiffMapInst);
                    }

                    reportDiffMapInst.invalidateSize();
                    reportDiffMapInst.fitBounds(bounds, { padding: [20, 20] });

                    if (reportDiffMapInst._drawnItems) reportDiffMapInst._drawnItems.clearLayers();
                    else {
                        reportDiffMapInst._drawnItems = new L.FeatureGroup();
                        reportDiffMapInst.addLayer(reportDiffMapInst._drawnItems);
                    }
                    L.rectangle(bounds, { color: '#FF8F00', weight: 3, fillOpacity: 0.15 }).addTo(reportDiffMapInst._drawnItems);

                    if (reportDiffMapInst.overlayLayer) reportDiffMapInst.removeLayer(reportDiffMapInst.overlayLayer);
                    reportDiffMapInst.overlayLayer = getWMSLayer(`${rd1Compare}/${rd2Compare}`, true).addTo(reportDiffMapInst);
                }, 150);
            }

            // 3. Show Modal
            document.getElementById('report-modal').style.display = 'flex';

            // 5. Generate Animated GIF if Compare Mode
            const gifSection = document.getElementById('report-gif-section');
            if (state.mode === 'compare') {
                gifSection.style.display = 'block';

                const gifLoader = document.getElementById('gif-loader-text');
                const gifImgDiff = document.getElementById('report-gif-result-diff');
                const gifBtnDiff = document.getElementById('btn-download-gif-diff');
                const gifContDiff = document.getElementById('gif-container-diff');

                gifLoader.style.display = 'block';
                gifLoader.innerText = 'Calculating temporal frames...';

                let d1 = document.getElementById('date-t1').value;
                let d2 = document.getElementById('date-t2').value;
                if (d1 > d2) { const temp = d1; d1 = d2; d2 = temp; }

                const t1ObjIdx = ALL_DATES.findIndex(d => d.value === d1);
                const t2ObjIdx = ALL_DATES.findIndex(d => d.value === d2);

                // Build indices for max 12 frames
                let frameIndices = [];
                const steps = 12;
                if (t2ObjIdx - t1ObjIdx <= steps) {
                    for (let i = t1ObjIdx; i <= t2ObjIdx; i++) frameIndices.push(i);
                } else {
                    const stepRate = (t2ObjIdx - t1ObjIdx) / steps;
                    for (let i = 0; i < steps; i++) {
                        frameIndices.push(Math.round(t1ObjIdx + i * stepRate));
                    }
                    frameIndices.push(t2ObjIdx);
                    frameIndices = [...new Set(frameIndices)];
                }

                // Generate URLs
                let wmsLayerParam = 'AGRICULTURE';
                if (state.activeIndex === 's1_sar') wmsLayerParam = 'SENTINEL1-GRD';

                const isDiffAnim = true; // Always build the Difference Heatmap GIF

                // Standard imagery GIF always uses True Color — reliable across all WMS time-range requests.
                // Index-specific visualization is the diff heatmap GIF's job.
                const safeB64 = (str) => btoa(unescape(encodeURIComponent(str)));
                const b64TcBg = state.activeIndex === 's1_sar'
                    ? safeB64(getScriptContent('s1_sar', false))  // SAR stays SAR for background
                    : safeB64(getScriptContent('tc', false));      // All optical indices use TC

                let diffB64Math = safeB64(getScriptContent(state.activeIndex, true));

                // Generate Standard Imagery URLs (Backgrounds) — always TC, MAXCC=60 for good coverage
                const bgUrls = frameIndices.map(i => {
                    const dateStr = ALL_DATES[i].value;
                    let dPrior = new Date(dateStr);
                    dPrior.setUTCDate(dPrior.getUTCDate() - 20);
                    let pStr = dPrior.toISOString().split('T')[0];
                    let rangeStr = `${pStr}/${dateStr}`;
                    return `${SH_WMS_URL}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${wmsLayerParam}&FORMAT=image/png&TRANSPARENT=false&VERSION=1.3.0&TIME=${rangeStr}&MAXCC=60&WIDTH=400&HEIGHT=300&CRS=CRS:84&BBOX=${bboxStr}&EVALSCRIPT=${encodeURIComponent(b64TcBg)}`;
                });

                // Generate Difference Mask URLs — capture-to-capture (each frame = change from previous frame)
                // Always generated now
                let diffUrls = frameIndices.map((idx, pos) => {
                    const currDateStr = ALL_DATES[idx].value;
                    // Previous frame for comparison (use T1 for first frame, previous frame date for rest)
                    const prevIdx = pos === 0 ? t1ObjIdx : frameIndices[pos - 1];
                    const prevDateStr = ALL_DATES[prevIdx].value;
                    // Small buffer: start a few days before prevDate for cloud avoidance
                    let dPrev = new Date(prevDateStr);
                    dPrev.setUTCDate(dPrev.getUTCDate() - 5);
                    let pBuffStr = dPrev.toISOString().split('T')[0];
                    let rangeStr = `${pBuffStr}/${currDateStr}`;
                    return `${SH_WMS_URL}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${wmsLayerParam}&FORMAT=image/png&TRANSPARENT=true&VERSION=1.3.0&TIME=${rangeStr}&MAXCC=60&WIDTH=400&HEIGHT=300&CRS=CRS:84&BBOX=${bboxStr}&EVALSCRIPT=${encodeURIComponent(diffB64Math)}`;
                });

                gifLoader.innerText = `Fetching ${bgUrls.length * 2} satellite frames...`;

                // Canvas composite renderer helper
                const renderCanvas = (bgBlob, diffBlob, dateText, overlayAlpha = 1.0) => {
                    return new Promise((resolve) => {
                        const canvas = document.createElement('canvas');
                        canvas.width = 400;
                        canvas.height = 330;
                        const ctx = canvas.getContext('2d');

                        const drawFooter = () => {
                            ctx.globalAlpha = 1.0;
                            ctx.fillStyle = '#111111';
                            ctx.fillRect(0, 300, 400, 30);
                            ctx.fillStyle = '#ffffff';
                            ctx.font = '600 13px sans-serif';
                            ctx.textBaseline = 'middle';
                            ctx.textAlign = 'center';
                            ctx.fillText(dateText, 200, 315);
                            resolve(canvas.toDataURL('image/jpeg', 0.95));
                        };

                        const drawDiffOverlay = () => {
                            if (!diffBlob) { drawFooter(); return; }
                            const diffUrl = URL.createObjectURL(diffBlob);
                            const dfImg = new Image();
                            dfImg.crossOrigin = 'Anonymous';
                            dfImg.onload = () => {
                                ctx.globalAlpha = overlayAlpha;
                                ctx.drawImage(dfImg, 0, 0, 400, 300);
                                ctx.globalAlpha = 1.0;
                                drawFooter();
                            };
                            dfImg.onerror = drawFooter;
                            dfImg.src = diffUrl;
                        };

                        if (!bgBlob) {
                            // Placeholder for frames where WMS returned no data
                            ctx.fillStyle = '#1a1c28';
                            ctx.fillRect(0, 0, 400, 300);
                            ctx.fillStyle = 'rgba(255,255,255,0.25)';
                            ctx.font = '13px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('No imagery available', 200, 150);
                            drawDiffOverlay();
                            return;
                        }

                        const bgUrl = URL.createObjectURL(bgBlob);
                        const bgImg = new Image();
                        bgImg.crossOrigin = 'Anonymous';
                        bgImg.onload = () => { ctx.drawImage(bgImg, 0, 0, 400, 300); drawDiffOverlay(); };
                        bgImg.onerror = () => {
                            // Image bytes couldn't be decoded (probably WMS XML error) — show placeholder
                            ctx.fillStyle = '#1a1c28';
                            ctx.fillRect(0, 0, 400, 300);
                            ctx.fillStyle = 'rgba(255,255,255,0.25)';
                            ctx.font = '13px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('No imagery available', 200, 150);
                            drawDiffOverlay();
                        };
                        bgImg.src = bgUrl;
                    });
                };

                const buildDiffGif = async (bgBlobs) => {
                    const diffBlobs = await Promise.all(diffUrls.map(u =>
                        fetch(u).then(r => r.ok ? r.blob() : null).catch(() => null)
                    ));
                    const canvases = await Promise.all(bgBlobs.map((b, i) => renderCanvas(b, diffBlobs[i], ALL_DATES[frameIndices[i]].displayStr)));
                    gifContDiff.style.display = 'block';
                    createGifPlayer(canvases, gifImgDiff, gifBtnDiff);
                };

                const gifContIndex = document.getElementById('gif-container-index');
                const gifImgIndex = document.getElementById('report-gif-result-index');
                const gifBtnIndex = document.getElementById('btn-download-gif-index');
                const gifIndexTitle = document.getElementById('gif-index-title');
                const idxName = INDICES[state.activeIndex]?.name || state.activeIndex.toUpperCase();
                if (gifIndexTitle) gifIndexTitle.innerText = `${idxName} — Index Gradient`;

                // Build index-specific evalscript URLs (one per frame, single-date)
                const b64IndexScript = safeB64(getScriptContent(state.activeIndex, false));
                const indexUrls = frameIndices.map(i => {
                    const dateStr = ALL_DATES[i].value;
                    let dPrior = new Date(dateStr);
                    dPrior.setUTCDate(dPrior.getUTCDate() - 20);
                    let pStr = dPrior.toISOString().split('T')[0];
                    let rangeStr = `${pStr}/${dateStr}`;
                    // Set TRANSPARENT=true to allow base aerials to show underneath
                    return `${SH_WMS_URL}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${wmsLayerParam}&FORMAT=image/png&TRANSPARENT=true&VERSION=1.3.0&TIME=${rangeStr}&MAXCC=60&WIDTH=400&HEIGHT=300&CRS=CRS:84&BBOX=${bboxStr}&EVALSCRIPT=${encodeURIComponent(b64IndexScript)}`;
                });

                const buildIndexGif = async (bgBlobs) => {
                    const indexBlobs = await Promise.all(indexUrls.map(u =>
                        fetch(u).then(r => r.ok ? r.blob() : null).catch(() => null)
                    ));
                    // 0.65 opacity overlay to see aerial below
                    const canvases = await Promise.all(bgBlobs.map((b, i) => renderCanvas(b, indexBlobs[i], ALL_DATES[frameIndices[i]].displayStr, 0.65)));
                    gifContIndex.style.display = 'block';
                    createGifPlayer(canvases, gifImgIndex, gifBtnIndex);
                };

                (async () => {
                    try {
                        gifLoader.innerText = 'Pre-fetching Aerial Base Layers...';
                        const bgBlobs = await Promise.all(bgUrls.map(u =>
                            fetch(u).then(r => r.ok ? r.blob() : null).catch(() => null)
                        ));

                        gifLoader.innerText = `Encoding ${idxName} Index Gradient GIF...`;
                        await buildIndexGif(bgBlobs);

                        gifLoader.innerText = 'Encoding Difference Heatmap GIF...';
                        await buildDiffGif(bgBlobs);

                        gifLoader.style.display = 'none';
                    } catch (e) {
                        gifLoader.innerText = 'Failed to fetch or encode imagery for GIFs.';
                        console.error("GIF Render Error:", e);
                    }
                })();

            } else {
                gifSection.style.display = 'none';
            }
        } catch (fatal_err) {
            console.error(fatal_err);
            const errBtn = document.getElementById('btn-generate-report');
            errBtn.innerText = "Crash: " + fatal_err.message;
            errBtn.style.color = "red";
            errBtn.disabled = false;
        }

    });

    document.getElementById('btn-close-report').addEventListener('click', () => {
        document.getElementById('report-modal').style.display = 'none';
    });

}

// Helper: Build clean WMS params for offline HTML export (bypasses Leaflet object serialization)
function buildHTMLWMSParams(timeStr, isDiff) {
    const scriptContent = getScriptContent(state.activeIndex, isDiff);
    const wmsLayer = state.activeIndex === 's1_sar' ? 'SENTINEL1-GRD' : 'AGRICULTURE';
    return {
        service: 'WMS',
        request: 'GetMap',
        version: '1.3.0',
        layers: wmsLayer,
        format: 'image/png',
        transparent: true,
        time: timeStr,
        maxcc: 20,
        evalscript: btoa(unescape(encodeURIComponent(scriptContent)))
    };
}

// ── HTML REPORT EXPORT ────────────────────────────
async function downloadHTMLReport() {
    const btn = document.getElementById('btn-print-report');
    if (btn) {
        btn.innerText = "Building Offline Report... Please Wait";
        btn.disabled = true;
    }

    try {
        const runDate = document.getElementById('report-date-run').innerText;
        const aoiBounds = document.getElementById('report-aoi-bounds').innerText;
        const indexName = document.getElementById('report-index-name').innerText;
        const mathLogic = document.getElementById('report-math').innerHTML;
        const infoText = document.getElementById('report-info').innerText;
        const timeText = document.getElementById('report-time').innerText;

        let isCompare = state.mode === 'compare';
        const activeCfg = INDICES[state.activeIndex] || {};

        const bounds = aoiDrawnItem.getBounds();
        const bboxStr = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;

        // Helpers for fetching WMS as Base64 for offline embedding
        const fetchAsBase64 = async (url) => {
            try {
                const resp = await fetch(url);
                if (!resp.ok) return null;
                const blob = await resp.blob();
                return new Promise((res) => {
                    const reader = new FileReader();
                    reader.onloadend = () => res(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.warn("Failed to fetch map overlay for offline export", e);
                return null;
            }
        };

        const wmsLayerParam = state.activeIndex === 's1_sar' ? 'SENTINEL1-GRD' : 'AGRICULTURE';
        const safeB64 = (str) => btoa(unescape(encodeURIComponent(str)));

        let b64TcBg = state.activeIndex === 's1_sar'
            ? safeB64(getScriptContent('s1_sar', false))
            : safeB64(getScriptContent('tc', false));

        const getWmsUrl = (timeStr, evalB64, transparent) => {
            return `${SH_WMS_URL}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${wmsLayerParam}&FORMAT=image/png&TRANSPARENT=${transparent}&VERSION=1.3.0&TIME=${timeStr}&MAXCC=60&WIDTH=600&HEIGHT=400&CRS=CRS:84&BBOX=${bboxStr}&EVALSCRIPT=${encodeURIComponent(evalB64)}`;
        };

        let mapHtml = "";

        if (isCompare) {
            let rd1 = document.getElementById('date-t1').value;
            let rd2 = document.getElementById('date-t2').value;
            if (rd1 > rd2) { const tmp = rd1; rd1 = rd2; rd2 = tmp; }

            let getPStr = (dStr) => {
                let dPrior = new Date(dStr); dPrior.setUTCDate(dPrior.getUTCDate() - 20);
                return dPrior.toISOString().split('T')[0];
            };

            const t1BgB64 = await fetchAsBase64(getWmsUrl(`${getPStr(rd1)}/${rd1}`, b64TcBg, false));
            const t1IdxB64 = await fetchAsBase64(getWmsUrl(`${getPStr(rd1)}/${rd1}`, safeB64(getScriptContent(state.activeIndex, false)), true));

            const t2BgB64 = await fetchAsBase64(getWmsUrl(`${getPStr(rd2)}/${rd2}`, b64TcBg, false));
            const t2IdxB64 = await fetchAsBase64(getWmsUrl(`${getPStr(rd2)}/${rd2}`, safeB64(getScriptContent(state.activeIndex, false)), true));

            const diffIdxB64 = await fetchAsBase64(getWmsUrl(`${rd1}/${rd2}`, safeB64(getScriptContent(state.activeIndex, true)), true));

            const stackImgs = (bg, fg, label) => `
                <div style="position: relative; width: 100%; height: 260px; background: #000; border-radius: 6px; overflow: hidden; border: 1px solid #333;">
                    ${bg ? `<img src="${bg}" style="position: absolute; width: 100%; height: 100%; object-fit: cover;" />` : ''}
                    ${fg ? `<img src="${fg}" style="position: absolute; width: 100%; height: 100%; object-fit: cover; mix-blend-mode: normal;" />` : ''}
                    <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; color: #fff;">${label}</div>
                </div>
            `;

            mapHtml = `
            <h3>Side-by-Side Analysis (T1 vs T2)</h3>
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <div style="flex: 1;">${stackImgs(t1BgB64, t1IdxB64, `T1: ${rd1}`)}</div>
                <div style="flex: 1;">${stackImgs(t2BgB64, t2IdxB64, `T2: ${rd2}`)}</div>
            </div>
            <h3 style="color: #F0501E; margin-top: 30px;">Difference Heatmap (\u0394 T1 \u2192 T2)</h3>
            <p style="font-size: 13px; color: #bbb; margin-top: -10px; margin-bottom: 15px;">
                <strong style="color: #FF3333;">Red</strong> = ${activeCfg.diffLabels ? activeCfg.diffLabels[0] : 'Decrease'} &nbsp;|&nbsp; 
                <strong style="color: #33AAFF;">Blue</strong> = ${activeCfg.diffLabels ? activeCfg.diffLabels[1] : 'Increase'}
            </p>
            ${stackImgs(t2BgB64, diffIdxB64, 'Delta Extent')}
            `;
        } else {
            let rd = ALL_DATES[state.monthIndex].value;
            let getPStr = (dStr) => {
                let dPrior = new Date(dStr); dPrior.setUTCDate(dPrior.getUTCDate() - 20);
                return dPrior.toISOString().split('T')[0];
            };
            const sBgB64 = await fetchAsBase64(getWmsUrl(`${getPStr(rd)}/${rd}`, b64TcBg, false));
            const sIdxB64 = await fetchAsBase64(getWmsUrl(`${getPStr(rd)}/${rd}`, safeB64(getScriptContent(state.activeIndex, false)), true));

            mapHtml = `
            <h3>Area of Interest (AOI)</h3>
            <div style="position: relative; width: 100%; height: 350px; background: #000; border-radius: 6px; overflow: hidden; border: 1px solid #333;">
                ${sBgB64 ? `<img src="${sBgB64}" style="position: absolute; width: 100%; height: 100%; object-fit: cover;" />` : ''}
                ${sIdxB64 ? `<img src="${sIdxB64}" style="position: absolute; width: 100%; height: 100%; object-fit: cover; mix-blend-mode: normal;" />` : ''}
            </div>
            `;
        }

        let gifHtml = "";
        const diffBtn = document.getElementById('btn-download-gif-diff');
        const idxBtn = document.getElementById('btn-download-gif-index');

        // Note: the gifshot encoder creates a 'data:' URI and places it directly in the 'href'
        if (diffBtn && diffBtn.href && diffBtn.href.startsWith('data:image/gif')) {
            gifHtml += `
            <div style="margin-top: 30px; text-align: center;">
                <h3 style="color: #F0501E;">Difference Heatmap (GIF)</h3>
                <img src="${diffBtn.href}" style="max-width: 100%; border-radius: 6px; border: 1px solid #333;" />
            </div>`;
        }

        if (idxBtn && idxBtn.href && idxBtn.href.startsWith('data:image/gif')) {
            gifHtml += `
            <div style="margin-top: 30px; text-align: center;">
                <h3 style="color: #1C85A6;">Index Gradient (GIF)</h3>
                <img src="${idxBtn.href}" style="max-width: 100%; border-radius: 6px; border: 1px solid #333;" />
            </div>`;
        }

        let chartContainerHtml = "";
        let chartScriptHtml = "";

        if (reportChartInst && document.querySelector('.report-chart').style.display !== 'none') {
            const cleanData = {
                labels: reportChartInst.data.labels,
                datasets: reportChartInst.data.datasets.map(ds => ({
                    label: ds.label,
                    data: ds.data,
                    borderColor: ds.borderColor,
                    backgroundColor: ds.backgroundColor,
                    fill: ds.fill,
                    tension: ds.tension,
                    pointRadius: ds.pointRadius,
                    pointHitRadius: ds.pointHitRadius,
                    spanGaps: ds.spanGaps
                }))
            };

            chartContainerHtml = `
            <div class="chart-wrapper">
                <canvas id="chart"></canvas>
            </div>`;

            chartScriptHtml = `
            const ctx = document.getElementById('chart').getContext('2d');
            const chartData = ${JSON.stringify(cleanData)};
            
            new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { 
                        legend: { display: true, labels: { color: 'rgba(255,255,255,0.8)', usePointStyle: true, boxWidth: 8 } }
                    },
                    scales: {
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', maxRotation: 45, minRotation: 45, maxTicksLimit: 12 } }
                    }
                }
            });`;
        }

        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Sentinel Report - ${runDate}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>
    <style>
        body { font-family: sans-serif; background-color: #121212; color: #fff; margin: 40px; }
        .container { max-width: 900px; margin: auto; background: #1e1e1e; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        h1, h2, h3 { color: #1C85A6; }
        .meta-box { background: rgba(0,0,0,0.3); padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #333; line-height: 1.5; }
        .meta-box p { margin: 5px 0; font-size: 14px; }
        .chart-wrapper { height: 400px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid #333; padding: 15px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Sentinel Explorer Report</h1>
        
        <div class="meta-box">
            <p><strong>Generated:</strong> ${runDate}</p>
            <p><strong>AOI Bounds:</strong> ${aoiBounds}</p>
            <p><strong>Active Index:</strong> ${indexName}</p>
            <p><strong>Selected Date(s):</strong> ${timeText}</p>
            <p><strong>Scientific Context:</strong><br/>${infoText}</p>
            <p style="margin-top: 10px; font-family: monospace; color: #1C85A6;">${mathLogic}</p>
        </div>

        ${mapHtml}

        ${chartContainerHtml}
        
        ${gifHtml}
    </div>

    <script>
        ${chartScriptHtml}
    </script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sentinel-report-${Date.now()}.html`;
        a.click();
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error("Report Export Failed:", err);
        alert("Failed to build offline report. See console.");
    } finally {
        if (btn) {
            btn.innerText = "Save Report (.html)";
            btn.disabled = false;
        }
    }
}

