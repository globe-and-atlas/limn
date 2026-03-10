/* ==========================================================================
   Sentinel Explorer - Core Logic
   ========================================================================== */

const AOI_LOCATIONS = {
    dixon: { lat: 31.893285, lng: -101.864031, zoom: 15 },
    rocker: { lat: 31.244621, lng: -101.261754, zoom: 15 },
    sweatt: { lat: 31.480407, lng: -103.423865, zoom: 15 }
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

    iterDate.setUTCDate(iterDate.getUTCDate() + 1);
}



// Copernicus Sentinel Hub configuration
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

    try {
        const resp = await fetch(authUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CONFIG.CDSE_CLIENT_ID,
                client_secret: CONFIG.CDSE_CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });
        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Copernicus OAuth failed (HTTP ${resp.status}): ${errText.substring(0, 100)}`);
        }
        const data = await resp.json();
        cachedAccessToken = data.access_token;
        tokenExpiry = Date.now() + ((data.expires_in - 60) * 1000);
        return cachedAccessToken;
    } catch (e) {
        console.error("Auth Error:", e);
        cachedAccessToken = null;
        throw e;
    }
}

const APP_VERSION = 'v47';

// Globals for Report Generation
let aoiDrawnItem = null;
let reportChartInst = null;
let reportMapInst = null;
let reportDiffMapInst = null;

// Evalscript wrapper utility
const genEvalscript = (bands, logic) => `//VERSION=3
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
const genDiffEvalscript = (bands, calcLogic) => `//VERSION=3
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
  
  // Apply visual filter masking for difference heatmaps specifically
  // Difference maps are visually centered around 0 (no difference).
  // Thus we mask out pixels where the CHANGE (absolute difference) is below the percentage threshold.
  // diff generally spans roughly -0.3 to 0.3 for most indices, so we scale VISUAL_FILTER to compare it.
  if (typeof VISUAL_FILTER !== 'undefined' && Math.abs(diff) < (VISUAL_FILTER * 0.3)) {
      return [0, 0, 0, 0];
  }

  if (diff < -0.15) return [1.0, 0.2, 0.2, 0.8]; // Strong decrease
  if (diff < -0.05) return [1.0, 0.4, 0.4, 0.6]; // Slight decrease
  if (diff > 0.15) return [0.2, 0.6, 1.0, 0.8]; // Strong increase
  if (diff > 0.05) return [0.4, 0.7, 1.0, 0.6]; // Slight increase
  return [0.2, 0.2, 0.2, 0.3]; // Stable
}
`;

// Deep Fusion Evalscript wrapper (Multi-Source S1+S2)
const genDeepFusionEvalscript = (bands, logic) => `//VERSION=3
function setup() {
  return {
    input: [
    input: [
        { datasource: "S1GRD", bands: ["VV", "VH"] },
        { datasource: "S2L2A", bands: ["B02", "B03", "B04", "B08", "B11", "B12"], units: "REFLECTANCE" }
    ],
    ],
    output: { bands: 4 },
    mosaicking: "ORBIT"
  };
}

function evaluatePixel(samples, scenes) {
    // 1. Find most recent valid S2 sample (Chemical Signature)
    let s2 = null;
    for (let i = 0; i < samples.S2L2A.length; i++) {
        const s = samples.S2L2A[i];
        if (s.dataMask === 1 && (s.B02 > 0 || s.B11 > 0)) {
            s2 = s;
            break;
        }
    }
    if (!s2) return [0,0,0,0];

    // 2. Find most recent valid S1 sample (Physical Smoothness)
    let s1 = null;
    for (let i = 0; i < samples.S1GRD.length; i++) {
        const s = samples.S1GRD[i];
        // Loosened check: VH backscatter present
        if (s.VH !== 0 && s.VV !== 0) {
            s1 = s;
            break;
        }
    }
    
    // 3. Fallback: If no S1 data, return "Ghost Mode" (low opacity optical)
    if (!s1) {
        // Run logic with dummy S1 values to allow rendering
        const dummyS1 = { VV: 0.1, VH: 0.001 }; // Simulates smooth surface
        const sampleFlat = { ...dummyS1, ...s2 };
        // We'll wrap the logic to force low alpha/grey if no S1
        ${logic.replace(/sample/g, 'sampleFlat')}
        // After logic runs, it will return a colorBlend. We can't easily intercept it here
        // so we rely on the logic itself. But wait, logic is a text string.
        // Better: return logic but adjust smoothness manually if logic uses VH.
    }

    // 4. Map samples back to the logical sample object for the logic snippet
    const sampleFlat = { ...s1, ...s2 };
    ${logic.replace(/sample/g, 'sampleFlat')}
}
`;

// Multi-Temporal Evalscript for Cumulative MAX detection
const genCumulativeEvalscript = (bands, logic, paletteStr) => `//VERSION=3
function setup() {
  return {
    input: [${bands.map(b => `'${b}'`).join(', ')}, "dataMask"],
    output: { bands: 4 },
    mosaicking: "ORBIT"
  };
}

function evaluatePixel(samples) {
  let maxVal = 0;
  for (let i = 0; i < samples.length; i++) {
    let sample = samples[i];
    if (sample.dataMask === 0) continue;
    let val = ${logic};
    if (val > maxVal) maxVal = val;
  }
  
  if (maxVal === 0) return [0, 0, 0, 0];
  
  // Apply palette to the max discovered value
  ${colorBlend('maxVal', paletteStr)}
}
`;

// Advanced continuous color blending logic for evalscripts
function colorBlend(valExpr, stopsStr) {
    return `
  let v = ${valExpr};
  if (isNaN(v)) return [0,0,0,0];
  if (typeof VISUAL_FILTER !== 'undefined' && v < VISUAL_FILTER) return [0,0,0,0];
  const stops = ${stopsStr};
  let i = 0;
  while (i < stops.length - 1 && v >= stops[i+1][0]) { i++; }
  if (i === stops.length - 1) { 
      let s = stops[i];
      let a = (s.length > 4) ? s[4] : 1.0;
      return [s[1]/255, s[2]/255, s[3]/255, a];
  }
  let s0 = stops[i], s1 = stops[i+1];
  let t = (v - s0[0]) / (s1[0] - s0[0]);
  let a0 = (s0.length > 4) ? s0[4] : 1.0;
  let a1 = (s1.length > 4) ? s1[4] : 1.0;
  return [
      (s0[1] + t * (s1[1] - s0[1])) / 255,
      (s0[2] + t * (s1[2] - s0[2])) / 255,
      (s0[3] + t * (s1[3] - s0[3])) / 255,
      a0 + t * (a1 - a0)
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
const PALETTE_PWI = "[[0, 0, 0, 0.0], [0.1, 0, 255, 255, 1.0], [0.5, 255, 0, 255, 1.0], [1, 255, 255, 0, 1.0]]"; // Restrictive: Trans -> Cyan -> Magenta -> Yellow
const PALETTE_BSI = "[[0, 0, 0, 0], [0.1, 68, 136, 51], [0.15, 210, 180, 60], [1, 160, 120, 50]]"; // Black -> Green -> Yellow -> Brown
const PALETTE_REAI = "[[0, 13, 26, 46], [0.35, 46, 92, 138], [0.65, 196, 122, 30], [1, 232, 196, 74]]"; // Navy -> Blue -> Bronze -> Yellow
const PALETTE_VCBI = "[[0, 10, 32, 16], [0.3, 26, 96, 48], [0.6, 200, 160, 0], [1, 224, 80, 16]]"; // Dark Green -> Forest -> Gold -> Orange
const PALETTE_FBC = "[[0, 26, 8, 0], [0.3, 139, 37, 0], [0.6, 212, 88, 26], [1, 255, 179, 71]]"; // Black -> Deep Red -> Burnt Orange -> Peach
const PALETTE_HPWI = "[[0, 44, 62, 80], [0.5, 241, 196, 15], [1, 231, 76, 60]]"; // Dark Blue -> Gold -> Red
const PALETTE_LBI = "[[0, 0, 0, 0], [0.3, 0, 210, 255], [0.7, 0, 136, 255], [1, 255, 0, 255]]";
const PALETTE_TRI = "[[0, 26, 10, 0], [0.3, 128, 64, 0], [0.7, 153, 51, 255], [1, 255, 0, 255]]";
const PALETTE_BPI = "[[0, 34, 34, 34], [0.3, 68, 68, 68], [0.7, 0, 255, 255], [1, 255, 255, 0]]";
const PALETTE_VSI = "[[0, 0, 85, 0], [0.3, 255, 255, 0], [0.7, 255, 136, 0], [1, 255, 0, 0]]";
const PALETTE_CMA = "[[0, 68, 34, 0], [0.3, 136, 68, 0], [0.7, 170, 136, 170], [1, 255, 255, 255]]";
const PALETTE_PHI = "[[0, 0, 0, 0], [0.3, 51, 51, 51], [0.7, 102, 51, 0], [1, 255, 204, 0]]";
const PALETTE_HMI = "[[0, 0, 17, 0], [0.3, 0, 68, 0], [0.7, 0, 255, 187], [1, 255, 255, 255]]";
const PALETTE_SCRI = "[[0, 0, 0, 0], [0.2, 75, 0, 130], [0.6, 231, 76, 60], [1, 241, 196, 15]]";
const PALETTE_MSI_INV = "[[0, 212, 106, 36], [0.5, 239, 216, 122], [1, 28, 133, 166]]";

// Index Configs
const INDICES = {
    tc: {
        name: 'True Color',
        sensor: 'Sentinel-2 L2A',
        temporal: 'Stable',
        min: '0.0', max: '0.3',
        gradient: 'linear-gradient(to right, #000, #fff)',
        formula: 'RGB',
        info: 'Standard RGB bands (Red, Green, Blue) configured to provide human-readable, true-color imagery of the surface exactly as the eye would see it.',
        diffLabels: ['Decrease / Darker', 'Increase / Brighter'],
        evalscript: genEvalscript(['B04', 'B03', 'B02'], `
  let factor = 2.5;
  let r = sample.B04 * factor;
  let g = sample.B03 * factor;
  let b = sample.B02 * factor;
  let brightness = (r + g + b) / 3;
  if (typeof VISUAL_FILTER !== 'undefined' && brightness < VISUAL_FILTER) return [0,0,0,0];
  return [r, g, b, 1];
`),
        fisBands: ['B04', 'B03', 'B02'],
        fisLogic: `return [sample.B04, sample.B03, sample.B02];`
    },
    fc: {
        name: 'False Color (NIR)',
        sensor: 'Sentinel-2 L2A',
        temporal: 'Stable',
        min: '0.0', max: '0.3',
        gradient: 'linear-gradient(to right, #000, #fff)',
        formula: 'RGB (B08,B04,B03)',
        info: 'Utilizes Near-Infrared (NIR), Red, and Green bands. NIR reflects strongly off healthy vegetation while deeply absorbing water, making it ideal for highlighting plant health and defining sharp water boundaries.',
        diffLabels: ['Decrease / Darker', 'Increase / Brighter'],
        evalscript: genEvalscript(['B08', 'B04', 'B03'], `
  let factor = 2.5;
  let r = sample.B08 * factor;
  let g = sample.B04 * factor;
  let b = sample.B03 * factor;
  let brightness = (r + g + b) / 3;
  if (typeof VISUAL_FILTER !== 'undefined' && brightness < VISUAL_FILTER) return [0,0,0,0];
  return [r, g, b, 1];
`),
        fisBands: ['B08', 'B04', 'B03'],
        fisLogic: `return [sample.B08, sample.B04, sample.B03];`
    },
    ndmi: {
        name: 'Moisture Index (NDMI)',
        sensor: 'Sentinel-2 L2A',
        temporal: 'Live',
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
        temporal: 'Live',
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
        temporal: 'Persistent',
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
        temporal: 'Persistent',
        min: 'Barren Soil', max: 'Dense Brush',
        gradient: 'linear-gradient(to right, #A07832, #D2B43C, #146428)',
        formula: '((B08 - B04) / (B08 + B04 + 0.5)) * 1.5',
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
        temporal: 'Live',
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
        temporal: '0-12M',
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
    bsi: {
        name: 'Bare Soil Index (BSI)',
        sensor: 'Sentinel-2 L2A',
        temporal: 'Persistent',
        min: 'Veg / Water', max: 'Bare Soil / Disturbance',
        gradient: 'linear-gradient(to right, #000000, #448833, #D2B43C, #A07832)',
        formula: '((B11+B04)-(B08+B02)) / ((B11+B04)+(B08+B02))',
        info: 'The Bare Soil Index (BSI) combines SWIR, Red, NIR, and Blue bands to distinguish bare ground from vegetation and water. High values indicate exposed soil, pad surfaces, or mechanical disturbances, providing a critical geographic baseline for PWI/FBC anomalies.',
        diffLabels: ['Revegetation', 'Soil Disturbance'],
        evalscript: genEvalscript(['B02', 'B04', 'B08', 'B11'], `
  let top = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
  let bot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
  if(bot === 0) return [0,0,0,0];
  let val = top / bot;
  // BSI maps -1 to +1. Land is typically 0.05-0.2.
  ${colorBlend('val', PALETTE_BSI)}
`),
        fisBands: ['B02', 'B04', 'B08', 'B11'],
        fisLogic: `
  let top = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
  let bot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
  if(bot === 0) return [0];
  return [top / bot];
`
    },
    ndsi: {
        name: 'Saline Content (NDSI) (Brine)',
        sensor: 'Sentinel-2 L2A',
        temporal: 'Persistent',
        min: 'Dry / Fresh', max: 'High Brine',
        gradient: 'linear-gradient(to right, #000000, #00FFFF, #FF00FF, #CCFF00)',
        formula: '(B11 - B12) / (B11 + B12)',
        info: 'Normalized Difference Salinity Index (specifically the Brine variant using SWIR B11/B12). This index isolates the unique absorptive signature of highly saline produced water, distinguishing it from standard moist soil or freshwater bodies.',
        diffLabels: ['Salinity Increase', 'Recovery'],
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
        temporal: 'Persistent',
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
        temporal: '0-6M',
        min: 'Background', max: 'High Contamination',
        gradient: 'linear-gradient(to right, #F5DEB3, #8B4513, #000000)',
        formula: '(B11 - B04) / (B11 + B04)',
        info: 'Hydrocarbon Absorption Index. Permian red dirt baseline is typically 0.15–0.30. Oil-contaminated surfaces absorb Red light dramatically, pushing HCAI to 0.40+ which clearly separates spills from bare soil.',
        diffLabels: ['More Hydrocarbons', 'Less / Recovery'],
        evalscript: genEvalscript(['B11', 'B04'], `
  let sum = sample.B11 + sample.B04;
  if(sum === 0) return [0,0,0,0];
  let val = (sample.B11 - sample.B04) / sum;
  let mapped = Math.max(0, (val - 0.30) * 3);
  ${colorBlend('mapped', PALETTE_HCAI)}
`),
        fisBands: ['B11', 'B04'],
        fisLogic: `
  let sum = sample.B11 + sample.B04;
  if(sum === 0) return [0];
  return [Math.max(0, ((sample.B11 - sample.B04) / sum) - 0.30)];
`
    },
    hmri: {
        name: 'Heavy Metals (HMRI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '12M+',
        min: 'Background', max: 'High Toxicity',
        gradient: 'linear-gradient(to right, #E6E6FA, #800080, #FF00FF)',
        formula: 'B12 / B03',
        info: 'Heavy Metal Reflectance Index tracks the ratio of SWIR (B12) to Green (B03) light. Permian caliche and red dirt baseline is high (1.5-1.9). Confirmed severe brine/produced water contamination precipitates heavy metals (barium, strontium) that push this ratio over 2.0.',
        diffLabels: ['More Metals / Stress', 'Less / Recovery'],
        evalscript: genEvalscript(['B12', 'B03'], `
  if(sample.B03 === 0) return [0,0,0,0];
  let val = sample.B12 / sample.B03;
  let mapped = Math.max(0, Math.min(1, (val - 2.0) / 3.0));
  ${colorBlend('mapped', PALETTE_HMRI)}
`),
        fisBands: ['B12', 'B03'],
        fisLogic: `
  if(sample.B03 === 0) return [0];
  return [Math.max(0, sample.B12 / sample.B03 - 2.0)];
`
    },
    ndoi: {
        name: 'Oil Slicks (NDOI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '0-3M',
        min: 'Background', max: 'Hydrocarbons',
        gradient: 'linear-gradient(to right, #2c3e50, #7f8c8d, #f1c40f, #e74c3c)',
        formula: '(B02 - B12) / (B02 + B12)',
        info: 'Normalized Difference Oil Index isolates thick crude oil/hydrocarbon slicks. It heavily contrasts the highly-absorptive SWIR2 band (B12) against the bright reflectance of the Blue band (B02).',
        diffLabels: ['Less Oil', 'Concentrated Oil'],
        evalscript: genEvalscript(['B02', 'B12'], `
  let sum = sample.B02 + sample.B12;
  if(sum === 0) return [0,0,0,0];
  let val = (sample.B02 - sample.B12) / sum;
  
  // NDOI usually ranges from -0.5 to 0.5. Oil pushes it positive.
  let mapped = Math.max(0, val * 2);
  ${colorBlend('mapped', `[
      [0.0, 43, 62, 80],
      [0.3, 127, 140, 141],
      [0.7, 241, 196, 15],
      [1.0, 231, 76, 60]
  ]`)}
`),
        fisBands: ['B02', 'B12'],
        fisLogic: `
  let sum = sample.B02 + sample.B12;
  if(sum === 0) return [0];
  return [(sample.B02 - sample.B12) / sum];
`
    },
    crsi: {
        name: 'Salt Stress (CRSI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '6-24M',
        min: 'Healthy Veg', max: 'Salt Shock',
        gradient: 'linear-gradient(to right, #27ae60, #f1c40f, #e67e22, #c0392b)',
        formula: 'sqrt((B08*B04 - B03*B02) / (B08*B04 + B03*B02))',
        info: 'Canopy Response Salinity Index. Directly measures the physiological stress of salt brine on sparse vegetation (like scrub brush) rather than looking for bare salt crusts. Excellent secondary indicator for brine spreading off-pad.',
        diffLabels: ['Healthy / Recovery', 'Salt-Induced Mortality'],
        evalscript: genEvalscript(['B02', 'B03', 'B04', 'B08'], `
  let top = (sample.B08 * sample.B04) - (sample.B03 * sample.B02);
  let bot = (sample.B08 * sample.B04) + (sample.B03 * sample.B02);
  if(bot === 0 || top < 0) return [0,0,0,0];
  
  let crsi = Math.sqrt(top / bot);
  
  // CRSI drops as salinity increases and vegetation dies.
  // We invert it so Red/High = Bad (Salt Shock).
  let mapped = 1.0 - Math.min(1, Math.max(0, crsi)); 
  ${colorBlend('mapped', `[
      [0.0, 39, 174, 96],
      [0.4, 241, 196, 15],
      [0.7, 230, 126, 34],
      [1.0, 192, 57, 43]
  ]`)}
`),
        fisBands: ['B02', 'B03', 'B04', 'B08'],
        fisLogic: `
  let top = (sample.B08 * sample.B04) - (sample.B03 * sample.B02);
  let bot = (sample.B08 * sample.B04) + (sample.B03 * sample.B02);
  if(bot === 0 || top < 0) return [0];
  let crsi = Math.sqrt(top / bot);
  return [1.0 - Math.min(1, Math.max(0, crsi))];
`
    },
    aoi: {
        name: 'Anoxic Oxidation (AOI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '0-6M',
        min: 'Background', max: 'Oxidized Minerals',
        gradient: 'linear-gradient(to right, #2c3e50, #8e44ad, #c0392b)',
        formula: '(B04 / B02) * (B11 / B12)',
        info: 'Detects the unique chemical signature of deep-earth formation water oxidizing on the surface. Combines an iron oxide ratio (Red/Blue) with a hydrocarbon absorption ratio (SWIR1/SWIR2) to identify the dark rust "scab" of a produced water spill.',
        diffLabels: ['Less Oxidation', 'Extreme Oxidation'],
        evalscript: genEvalscript(['B02', 'B04', 'B11', 'B12'], `
  if(sample.B02 === 0 || sample.B12 === 0) return [0,0,0,0];
  let ironOxide = sample.B04 / sample.B02;
  let hydrocarbon = sample.B11 / sample.B12;
  
  let aoi = ironOxide * hydrocarbon;
  
  // AOI background is typically ~1.5 to 2.0. Severe oxidation pushes it to 3.5+
  let mapped = Math.max(0, Math.min(1, (aoi - 2.0) / 2.0));
  
  ${colorBlend('mapped', `[
      [0.0, 44, 62, 80],    // Dark Slate
      [0.4, 142, 68, 173],  // Purple
      [0.8, 192, 57, 43],   // Deep Red
      [1.0, 255, 0, 0]      // Bright Red
  ]`)}
`),
        fisBands: ['B02', 'B04', 'B11', 'B12'],
        fisLogic: `
  if(sample.B02 === 0 || sample.B12 === 0) return [0];
  let aoi = (sample.B04 / sample.B02) * (sample.B11 / sample.B12);
  return [Math.max(0, (aoi - 2.0) / 2.0)];
`
    },
    ehc: {
        name: 'Evaporite Halo (Visual)',
        sensor: 'Sentinel-2 L2A',
        temporal: '0-3M',
        min: 'False Color RGB', max: '',
        gradient: 'linear-gradient(to right, #ff0000, #00ff00, #0000ff)',
        formula: 'R=NDOI, G=BSI, B=NDSI',
        info: 'A custom RGB false-color composite designed to highlight the geometry of a blowout. Shows a dark/red oily center, surrounded by a bright blue ring of crystallized salt, over a green mud footprint.',
        diffLabels: ['N/A', 'N/A'],
        evalscript: `//VERSION=3
            function setup() {
                return {
                    input: ["B02","B04","B08","B11","B12", "dataMask"],
                    output: { bands: 4 }
                };
            }
            function evaluatePixel(sample) {
                if(sample.dataMask === 0) return [0,0,0,0];
                
                // Red Channel = NDOI (Oil)
                let sumNdoi = sample.B02 + sample.B12;
                let ndoi = sumNdoi === 0 ? 0 : (sample.B02 - sample.B12) / sumNdoi;
                let red = Math.max(0, ndoi * 3); // Boost oil signal

                // Green Channel = BSI (Bare Soil/Mud)
                let bsiTop = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
                let bsiBot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
                let bsi = bsiBot === 0 ? 0 : bsiTop / bsiBot;
                let green = Math.max(0, bsi * 2);

                // Blue Channel = NDSI (Brine/Salt)
                let ndsiSum = sample.B11 + sample.B12;
                let ndsi = ndsiSum === 0 ? 0 : (sample.B11 - sample.B12) / ndsiSum;
                let blue = Math.max(0, ndsi * 4); // Salt is highly reflective
                
                let intensity = Math.max(red, green, blue);
                if (typeof VISUAL_FILTER !== 'undefined' && intensity < VISUAL_FILTER) return [0,0,0,0];

                return [red, green, blue, 1];
            }`,
        fisBands: ['B02', 'B04', 'B08', 'B11', 'B12'],
        fisLogic: `return [0];` // Complex RGB indices don't chart well
    },
    hpwi: {
        name: 'Hybrid Produced Water Index (HPWI)',
        sensor: 'S1+S2 Dual-Fusion',
        temporal: '0-3M',
        min: 'Background', max: 'Confirmed Liquid Spill',
        gradient: 'linear-gradient(to right, #000000, #00FFFF, #FF00FF, #CCFF00)',
        formula: 'PWI (Restrictive) * S1 Radar Smoothness Confirmation',
        info: 'HPWI is a "Double-Lock" verification system. It combines Sentinel-2 chemical signatures (Salinity/Hydrocarbons) with Sentinel-1 physical confirmation (Radar specular smoothness). This mode effectively eliminates false positives from dry salt crusts or bright minerals by requiring a physical liquid "smoothness" signature to be present on the radar return.',
        diffLabels: ['Stable (No Detection)', 'Spill Anomaly Detected'],
        evalscript: genEvalscript(['B02', 'B03', 'B11', 'B12'], `
  if (sample.dataMask === 0) return [0,0,0,0];

  // 1. Hydrocarbon gate (primary): NDOI
  let sumNdoi = sample.B02 + sample.B12;
  if (sumNdoi === 0) return [0,0,0,0];
  let ndoi = Math.max(0, (sample.B02 - sample.B12) / sumNdoi);

  // 2. Brine boost (additive): NDSI > 0.06 only (hardened for v31)
  let ndsiSum = sample.B11 + sample.B12;
  let ndsi = ndsiSum === 0 ? 0 : (sample.B11 - sample.B12) / ndsiSum;
  let brineThreshold = Math.max(0.04, 0.06 - (DETECTION_SENSITIVITY * 0.03));
  let brineBoost = Math.max(0, ndsi - brineThreshold) * 0.8;
  
  // Combined chemical signal
  let chemSignal = Math.min(1, ndoi + brineBoost);

  // 3. Surface Smoothness Proxy (S2 stand-in for SAR VH dampening)
  let sumSmooth = sample.B03 + sample.B11;
  let smoothness = sumSmooth === 0 ? 0 : (sample.B03 - sample.B11) / sumSmooth;
  let normSmooth = Math.max(0, Math.min(1, (smoothness + 0.3) / 0.6));

  // 4. Composite
  let score = chemSignal * normSmooth;
  let mapped = Math.max(0, Math.min(1, score * 6.0));

  ${colorBlend('mapped', `[
      [0.0, 17, 17, 17],
      [0.3, 75, 0, 130],
      [0.7, 231, 76, 60],
      [1.0, 241, 196, 15]
  ]`)}
`),
        fisBands: ['B02', 'B03', 'B11', 'B12'],
        fisLogic: `
  let sumNdoi = sample.B02 + sample.B12;
  if (sumNdoi === 0) return [0];
  let ndoi = Math.max(0, (sample.B02 - sample.B12) / sumNdoi);
  let ndsiSum = sample.B11 + sample.B12;
  let ndsi = ndsiSum === 0 ? 0 : (sample.B11 - sample.B12) / ndsiSum;
  let brineBoost = Math.max(0, ndsi - 0.03) * 0.8;
  let chemSignal = Math.min(1, ndoi + brineBoost);
  let sumSmooth = sample.B03 + sample.B11;
  let smooth = sumSmooth === 0 ? 0 : Math.max(0, Math.min(1, ((sample.B03 - sample.B11)/sumSmooth + 0.3) / 0.6));
  let hpwiResult = chemSignal * smooth * 6.0;
  return [Math.min(1, hpwiResult)];
`
    },
    fbc: {
        name: 'Ferrugination-Brine Composite (FBC)',
        sensor: 'Sentinel-2 L2A',
        temporal: '3-12M',
        min: 'Background', max: 'Iron+Brine Alteration',
        gradient: 'linear-gradient(to right, #1a0800, #8B2500, #D4581A, #FFB347)',
        formula: 'sqrt(ironScore × brineScore) × (1 − NDVI)',
        info: 'Ferrugination-Brine Composite — targets the iron oxidation signature unique to produced water spills. Deep Permian brine is rich in ferrous iron (Fe²⁺); when surfaced it oxidizes to ferric iron (Fe³⁺), creating rust-brown staining with a high Red/Blue ratio. Both the iron gate (B04/B02 > 1.4) and the brine gate (NDSI > 0.02) must be nonzero to fire — combined via geometric mean so a moderate signal on one gate does not completely zero a strong signal on the other. The vegetation gate (1−NDVI) ensures only bare-ground pixels qualify.',
        diffLabels: ['Less Alteration', 'Active Iron+Brine Event'],
        evalscript: genEvalscript(['B02', 'B03', 'B04', 'B08', 'B11', 'B12'], `
  if (sample.dataMask === 0 || sample.B02 === 0) return [0,0,0,0];

  // 1. Iron Oxide Gate: B04/B02 (Red/Blue)
  // Baseline bare soil: ~1.2–1.6. Iron alteration (Fe²⁺→Fe³⁺) pushes above 1.6.
  let ironOxide = sample.B04 / sample.B02;
  let ironThreshold = Math.max(1.3, 1.4 - (DETECTION_SENSITIVITY * 0.3));
  let ironScore = Math.max(0, (ironOxide - ironThreshold) / 1.0);

  // 2. Brine Gate: NDSI = (B11-B12)/(B11+B12)
  let ndsiSum = sample.B11 + sample.B12;
  if (ndsiSum === 0) return [0,0,0,0];
  let ndsi = (sample.B11 - sample.B12) / ndsiSum;
  let brineThreshold = Math.max(0.02, 0.04 - (DETECTION_SENSITIVITY * 0.08));
  let brineScore = Math.max(0, ndsi - brineThreshold);

  // 3. No-Vegetation Gate
  let ndviSum = sample.B08 + sample.B04;
  let ndvi = ndviSum === 0 ? 0 : (sample.B08 - sample.B04) / ndviSum;
  let noVeg = Math.max(0, 1.0 - Math.max(0, ndvi));

  // Composite: Product based with power scaling to suppress background "blobs"
  let fbc = (ironScore * brineScore) * noVeg;
  let mapped = Math.min(1, Math.pow(fbc, 1.4) * 150.0);

  ${colorBlend('mapped', `[
      [0.0,  26, 8, 0],
      [0.3, 139, 37, 0],
      [0.6, 212, 88, 26],
      [1.0, 255, 179, 71]
  ]`)}
`),
        fisBands: ['B02', 'B04', 'B08', 'B11', 'B12'],
        fisLogic: `
  if (sample.B02 === 0) return [0];
  let ironScore = Math.max(0, (sample.B04 / sample.B02) - (1.4 - DETECTION_SENSITIVITY)) / 1.0;
  let ndsiSum = sample.B11 + sample.B12;
  if (ndsiSum === 0) return [0];
  let ndsi = (sample.B11 - sample.B12) / ndsiSum;
  let brineScore = Math.max(0, ndsi - (0.02 - (DETECTION_SENSITIVITY * 0.1)));
  let ndviSum = sample.B08 + sample.B04;
  let noVeg = Math.max(0, 1.0 - Math.max(0, ndviSum === 0 ? 0 : (sample.B08 - sample.B04) / ndviSum));
  return [Math.min(1, Math.sqrt(ironScore * brineScore) * noVeg * 25.0)];
`
    },
    reai: {
        name: 'Red Edge Alteration Index (REAI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '3-12M',
        min: 'Background', max: 'Ferric Mineral + Brine',
        gradient: 'linear-gradient(to right, #0d1a2e, #2e5c8a, #c47a1e, #e8c44a)',
        formula: '(B06 / B05) × NDSI',
        info: 'Red Edge Alteration Index — exploits Sentinel-2\'s dedicated Red Edge bands (B05=705nm, B06=740nm), unused by any other index in this suite. In vegetated scenes these bands track chlorophyll. Over bare disturbed soil, a B06/B05 ratio exceeding ~1.10 indicates ferric mineral enrichment (goethite, hematite) from produced water iron precipitation. Multiplied by NDSI, it confirms co-located brine chemistry. Particularly sensitive to subtle early-stage iron staining invisible to the standard visible/SWIR indices.',
        diffLabels: ['No Alteration', 'Ferric + Brine Signal'],
        evalscript: genEvalscript(['B05', 'B06', 'B11', 'B12'], `
  if (sample.dataMask === 0 || sample.B05 === 0) return [0,0,0,0];

  // 1. Red Edge Iron Ratio: B06/B05
  let redEdge = sample.B06 / sample.B05;
  let ironThreshold = Math.max(1.08, 1.18 - (DETECTION_SENSITIVITY * 0.15));
  let ironScore = Math.max(0, (redEdge - ironThreshold) / 0.45);

  // 2. Brine confirmation
  let ndsiSum = sample.B11 + sample.B12;
  if (ndsiSum === 0) return [0,0,0,0];
  let ndsi = (sample.B11 - sample.B12) / ndsiSum;
  let brineThreshold = Math.max(0.06, 0.12 - (DETECTION_SENSITIVITY * 0.1));
  let brineScore = Math.max(0, ndsi - brineThreshold);

  let reai = ironScore * brineScore;
  let mapped = Math.min(1, Math.pow(reai, 2.0) * 100.0);

  ${colorBlend('mapped', `[
      [0.0,  13, 26, 46],
      [0.3,  46, 92, 138],
      [0.65, 196, 122, 30],
      [1.0,  232, 196, 74]
  ]`)}
`),
        fisBands: ['B05', 'B06', 'B11', 'B12'],
        fisLogic: `
  if (sample.B05 === 0) return [0];
  let ironScore = Math.max(0, (sample.B06 / sample.B05) - (1.08 - DETECTION_SENSITIVITY)) / 0.45;
  let ndsiSum = sample.B11 + sample.B12;
  let brineScore = ndsiSum === 0 ? 0 : Math.max(0, (sample.B11 - sample.B12) / ndsiSum - (0.05 - (DETECTION_SENSITIVITY * 0.2)));
  return [Math.min(1, ironScore * brineScore * 18.0)];
`
    },
    vcbi: {
        name: 'Vegetation-Confirmed Brine Index (VCBI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '6-24M',
        min: 'No Stress', max: 'Brine-Kill Zone',
        gradient: 'linear-gradient(to right, #0a2010, #1a6030, #c8a000, #e05010)',
        formula: 'max(0, −CRSI) × NDSI',
        info: 'Vegetation-Confirmed Brine Index — targets the off-pad migration front where produced water is actively killing surrounding brush and rangeland. CRSI measures the osmotic shock of brine on vegetation; as chloride concentrations rise, CRSI collapses toward zero and goes negative. Multiplied by NDSI (brine chemistry), the index isolates pixels where vegetation is simultaneously dying AND measurable salt chemistry is present. This catches the leading edge of a spill that may not yet show a strong chemical signature at ground zero.',
        diffLabels: ['Recovery / Less Stress', 'Active Brine-Kill'],
        evalscript: genEvalscript(['B02', 'B03', 'B04', 'B08', 'B11', 'B12'], `
  if (sample.dataMask === 0) return [0,0,0,0];

  // 1. Inverted CRSI: high = vegetation mortality from brine stress
  let top = (sample.B08 * sample.B04) - (sample.B03 * sample.B02);
  let bot = (sample.B08 * sample.B04) + (sample.B03 * sample.B02);
  let crsi = (bot <= 0 || top < 0) ? 0 : Math.sqrt(top / bot);
  // Invert: healthy veg = low score, brine-stressed/dead = high score
  let stressThreshold = 0.55 + (DETECTION_SENSITIVITY * 0.2);
  let stressScore = Math.max(0, stressThreshold - crsi) * (1.0 / 0.55);

  // 2. Brine chemistry at same pixel
  let ndsiSum = sample.B11 + sample.B12;
  if (ndsiSum === 0) return [0,0,0,0];
  let ndsi = (sample.B11 - sample.B12) / ndsiSum;
  let brineThreshold = Math.max(0.05, 0.10 - (DETECTION_SENSITIVITY * 0.08));
  let brineScore = Math.max(0, ndsi - brineThreshold);

  let vcbi = stressScore * brineScore;
  let mapped = Math.min(1, Math.pow(vcbi, 1.5) * 30.0);

  ${colorBlend('mapped', `[
      [0.0,  10, 32, 16],
      [0.3,  26, 96, 48],
      [0.65, 200, 160, 0],
      [1.0,  224, 80, 16]
  ]`)}
`),
        fisBands: ['B02', 'B03', 'B04', 'B08', 'B11', 'B12'],
        fisLogic: `
  let top = (sample.B08 * sample.B04) - (sample.B03 * sample.B02);
  let bot = (sample.B08 * sample.B04) + (sample.B03 * sample.B02);
  let crsi = (bot <= 0 || top < 0) ? 0 : Math.sqrt(top / bot);
  let stressScore = Math.max(0, (0.55 + DETECTION_SENSITIVITY) - crsi) / 0.55;
  let ndsiSum = sample.B11 + sample.B12;
  let brineScore = ndsiSum === 0 ? 0 : Math.max(0, (sample.B11 - sample.B12) / ndsiSum - (0.04 - (DETECTION_SENSITIVITY * 0.1)));
  return [Math.min(1, stressScore * brineScore * 10.0)];
`
    },
    pwi: {
        name: 'Produced Water Index (PWI) ✧✧',
        sensor: 'Sentinel-2 L2A',
        temporal: '0-3M',
        min: 'Background', max: 'Confirmed Spill',
        gradient: 'linear-gradient(to right, #000000, #00FFFF, #FF00FF, #CCFF00)',
        formula: '(NDSI - 0.05) * (HCAI - 0.20) * (HMRI - 1.5) [Balanced Recovery]',
        info: 'Produced Water Index — optimized for high-fidelity plume detection. Requires simultaneous elevation of Salinity (NDSI), Hydrocarbons (HCAI), and Heavy Metals (HMRI). Square-root scaling (120x boost) preserves plume continuity and faint anomaly detection.',
        diffLabels: ['Stable (No Detection)', 'Spill Anomaly Detected'],
        evalscript: genEvalscript(['B02', 'B03', 'B04', 'B08', 'B11', 'B12'], `
  // 1. Bare Soil Index (BSI) -- URBAN / WATER / VEG MASK
  let bsiTop = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
  let bsiBot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
  if (bsiBot === 0) return [0,0,0,0];
  let bsi = bsiTop / bsiBot;
  
  if (bsi <= -0.3) return [0,0,0,0];

  // 2. Brine (NDSI)
  let sumBrine = sample.B11 + sample.B12;
  if(sumBrine === 0) return [0,0,0,0];
  let brine = (sample.B11 - sample.B12) / sumBrine;
  
  // 3. Hydrocarbons (HCAI)
  let sumHcai = sample.B11 + sample.B04;
  if(sumHcai === 0) return [0,0,0,0];
  let hcai = (sample.B11 - sample.B04) / sumHcai;
  
  // 4. Heavy Metals (HMRI)
  if(sample.B03 === 0) return [0,0,0,0];
  let hmri = sample.B12 / sample.B03;
  
  // True Classic Calibration (March 4th Restrictive)
  let brineScore = Math.max(0, brine - 0.10);
  let hcaiScore = Math.max(0, (hcai - 0.30) * 2);
  let hmriScore = Math.max(0, (hmri - 2.0) * 2);
  
  let pwi = brineScore * hcaiScore * hmriScore;
  
  // Cubic scaling: aggressively suppresses background noise
  let mapped = Math.min(1.0, Math.pow(pwi * 20.0, 3.0));
  ${colorBlend('mapped', PALETTE_PWI)}
`),
        fisBands: ['B02', 'B03', 'B04', 'B08', 'B11', 'B12'],
        fisLogic: `
  let bsiTop = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
  let bsiBot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
  if (bsiBot === 0 || (bsiTop / bsiBot) <= -0.1) return [0];

  let sumNdsi = sample.B11 + sample.B12;
  if(sumNdsi === 0) return [0];
  let ndsi = (sample.B11 - sample.B12) / sumNdsi;
  
  let sumHcai = sample.B11 + sample.B04;
  if(sumHcai === 0) return [0];
  let hcai = (sample.B11 - sample.B04) / sumHcai;
  
  if(sample.B03 === 0) return [0];
  let hmri = sample.B12 / sample.B03;
  
  let pwi = Math.max(0, brine - 0.10) * Math.max(0, (hcai - 0.30) * 2) * Math.max(0, (hmri - 2.0) * 2);
  return [Math.min(1.0, Math.pow(pwi * 20.0, 3.0))];
`
    },
    lbi: {
        name: 'Liquid Brine Index (LBI) ✧',
        sensor: 'Sentinel-2 L2A',
        temporal: '0-3M',
        min: 'Background', max: 'Standing Brine Pool',
        gradient: 'linear-gradient(to right, #000000, #0055ff, #00d2ff, #ffffff)',
        formula: 'NDSI * NDWI * (1 - NDVI)',
        info: 'Liquid Brine Index — captures standing pools of hazardous produced water. Requires a brine chemical signature (NDSI), a standing water proxy (NDWI), and the absence of vegetation (1-NDVI). This index is designed to filter out legacy residues and focus on active, liquid releases.',
        diffLabels: ['Receding Liquid', 'New Pooling Event'],
        evalscript: genEvalscript(['B02', 'B03', 'B04', 'B08', 'B11', 'B12'], `
  let ndsiSum = sample.B11 + sample.B12;
  let ndsi = ndsiSum === 0 ? 0 : (sample.B11 - sample.B12) / ndsiSum;
  
  let ndwiSum = sample.B03 + sample.B11;
  let ndwi = ndwiSum === 0 ? 0 : (sample.B03 - sample.B11) / ndwiSum;
  
  let ndviSum = sample.B08 + sample.B04;
  let ndvi = ndviSum === 0 ? 0 : (sample.B08 - sample.B04) / ndviSum;
  
  let bsiTop = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
  let bsiBot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
  let bsi = bsiBot === 0 ? 0 : bsiTop / bsiBot;
  
  if (bsi <= -0.3) return [0,0,0,0]; // Loosened road mask for spill centers
  
  // Liquid gate shifted by +0.5 to catch "Wet Soil" signature in rangelands, plus BSI mask
  let score = Math.max(0, ndsi) * Math.max(0, ndwi + 0.5) * Math.max(0, 1.0 - ndvi) * Math.max(0, bsi + 0.3);
  let mapped = Math.min(1, score * 15.0);
  
  ${colorBlend('mapped', `[
      [0.0, 0, 0, 0],
      [0.3, 0, 85, 255],
      [0.7, 0, 210, 255],
      [1.0, 255, 255, 255]
  ]`)}
`),
        fisBands: ['B03', 'B04', 'B08', 'B11', 'B12'],
        fisLogic: `
  let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
  let ndwi = (sample.B03 + sample.B11) === 0 ? 0 : (sample.B03 - sample.B11) / (sample.B03 + sample.B11);
  let ndvi = (sample.B08 + sample.B04) === 0 ? 0 : (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  let bsi = (sample.B11+sample.B04+sample.B08+sample.B02) === 0 ? 0 : ((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02));
  return [Math.max(0, ndsi) * Math.max(0, ndwi + 0.5) * Math.max(0, 1.0 - ndvi) * Math.max(0, bsi + 0.3)];
`
    },
    tri: {
        name: 'Toxic Residue Index (TRI) ✧',
        sensor: 'Sentinel-2 L2A',
        temporal: '6M+',
        min: 'Background', max: 'Toxic Mineral Scab',
        gradient: 'linear-gradient(to right, #1a0a00, #804000, #9933ff, #ff00ff)',
        formula: 'NDSI * HMRI * AOI',
        info: 'Toxic Residue Index — detects the mineral "scab" left by produced water after evaporation. Combines salt chemistry (NDSI), heavy metal precipitation (HMRI), and anoxic oxidation (AOI). This is a forensic tool for identifying historical spill footprints where liquid is no longer present.',
        diffLabels: ['Residue Degradation', 'New Mineral Staining'],
        evalscript: genEvalscript(['B02', 'B03', 'B04', 'B11', 'B12'], `
  let ndsiSum = sample.B11 + sample.B12;
  let ndsi = ndsiSum === 0 ? 0 : (sample.B11 - sample.B12) / ndsiSum;
  
  let hmri = sample.B03 === 0 ? 0 : sample.B12 / sample.B03;
  
  let aoi = (sample.B02 === 0 || sample.B12 === 0) ? 0 : (sample.B04 / sample.B02) * (sample.B11 / sample.B12);
  
  let score = Math.max(0, ndsi - 0.05) * Math.max(0, (hmri - 1.5)/2) * Math.max(0, (aoi - 1.5)/2);
  let mapped = Math.min(1, Math.pow(score * 10, 2.0));
  
  ${colorBlend('mapped', `[
      [0.0, 26, 10, 0],
      [0.3, 128, 64, 0],
      [0.7, 153, 51, 255],
      [1.0, 255, 0, 255]
  ]`)}
`),
        fisBands: ['B02', 'B03', 'B04', 'B11', 'B12'],
        fisLogic: `
  let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
  let hmri = sample.B03 === 0 ? 0 : sample.B12 / sample.B03;
  let aoi = (sample.B02 === 0 || sample.B12 === 0) ? 0 : (sample.B04 / sample.B02) * (sample.B11 / sample.B12);
  return [Math.max(0, ndsi - 0.05) * Math.max(0, (hmri - 1.5)/2) * Math.max(0, (aoi - 1.5)/2)];
`
    },
    bpi: {
        name: 'Brine-Pavement Index (BPI) ✧',
        sensor: 'Sentinel-2 L2A',
        temporal: 'Live',
        min: 'Clean Surface', max: 'Contaminated Pavement',
        gradient: 'linear-gradient(to right, #222222, #444444, #00FFFF, #FFFF00)',
        formula: 'NDSI * HCAI * BSI',
        info: 'Brine-Pavement Index — optimized for detecting leaks on caliche pads and lease roads. Requires brine (NDSI) and hydrocarbon (HCAI) signals co-located on a bare/compacted soil surface (BSI). This is the primary tool for pad-level integrity monitoring.',
        diffLabels: ['Surface Recovery', 'Active Pad Pinhole'],
        evalscript: genEvalscript(['B02', 'B04', 'B08', 'B11', 'B12'], `
  let bsiTop = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
  let bsiBot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
  let bsi = bsiBot === 0 ? 0 : bsiTop / bsiBot;
  if (bsi <= -0.3) return [0,0,0,0]; // Loosened for pad-level spills
  
  let ndsiSum = sample.B11 + sample.B12;
  let ndsi = ndsiSum === 0 ? 0 : (sample.B11 - sample.B12) / ndsiSum;
  
  let hcaiSum = sample.B11 + sample.B04;
  let hcai = hcaiSum === 0 ? 0 : (sample.B11 - sample.B04) / hcaiSum;
  
  let score = Math.max(0, bsi + 0.3) * Math.max(0, ndsi - 0.03) * Math.max(0, hcai - 0.15);
  let mapped = Math.min(1, score * 30.0);
  
  ${colorBlend('mapped', `[
      [0.0, 34, 34, 34],
      [0.3, 68, 68, 68],
      [0.7, 0, 255, 255],
      [1.0, 255, 255, 0]
  ]`)}
`),
        fisBands: ['B02', 'B04', 'B08', 'B11', 'B12'],
        fisLogic: `
  let bsi = (sample.B11+sample.B04+sample.B08+sample.B02) === 0 ? 0 : ((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02));
  let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
  let hcai = (sample.B11 + sample.B04) === 0 ? 0 : (sample.B11 - sample.B04) / (sample.B11 + sample.B04);
  return [Math.max(0, bsi + 0.3) * Math.max(0, ndsi - 0.03) * Math.max(0, hcai - 0.15)];
`
    },
    vsi: {
        name: 'Vegetation Stress Index (VSI) ✧✧',
        sensor: 'Sentinel-2 L2A',
        temporal: '3-24M',
        min: 'Healthy', max: 'Metal/Brine Stress',
        gradient: 'linear-gradient(to right, #005500, #FFFF00, #FF8800, #FF0000)',
        formula: 'NDSI * RedEdgeDelta * MSI',
        info: 'Vegetation Stress Index — designed to detect the physiological impact of produced water before vegetation death. Uses Red-Edge blue-shifts (B07/B05) and SWIR/NIR moisture stress (B11/B8A) co-located with a salinity signature (NDSI).',
        diffLabels: ['Stress Alleviation', 'Escalating Toxicity'],
        evalscript: genEvalscript(['B05', 'B07', 'B11', 'B12', 'B8A'], `
  let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
  let redEdgeDelta = (sample.B07 + sample.B05) === 0 ? 0 : (sample.B07 - sample.B05) / (sample.B07 + sample.B05);
  let msi = sample.B8A === 0 ? 0 : sample.B11 / sample.B8A;
  
  let score = Math.max(0, ndsi) * Math.max(0, 0.4 - redEdgeDelta) * Math.max(0, msi - 1.0);
  let mapped = Math.min(1, score * 10.0);
  
  ${colorBlend('mapped', `[
      [0.0, 0, 85, 0],
      [0.3, 255, 255, 0],
      [0.7, 255, 136, 0],
      [1.0, 255, 0, 0]
  ]`)}
`),
        fisBands: ['B05', 'B07', 'B11', 'B12', 'B8A'],
        fisLogic: `
  let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
  let redEdgeDelta = (sample.B07 + sample.B05) === 0 ? 0 : (sample.B07 - sample.B05) / (sample.B07 + sample.B05);
  let msi = sample.B8A === 0 ? 0 : sample.B11 / sample.B8A;
  return [Math.max(0, ndsi) * Math.max(0, 0.4 - redEdgeDelta) * Math.max(0, msi - 1.0)];
`
    },
    cma: {
        name: 'Clay-Mineral Alteration (CMA) ✧',
        sensor: 'Sentinel-2 L2A',
        temporal: 'Persistent',
        min: 'Native Soil', max: 'Chemical Alteration',
        gradient: 'linear-gradient(to right, #442200, #884400, #AA88AA, #FFFFFF)',
        formula: 'NDSI * (B11/B12) * (B04/B02)',
        info: 'Clay-Mineral Alteration — a forensic index targeting the chemical modification of clay lattices by produced water residues. Uses SWIR-1/SWIR-2 ratios to isolate salt-clay interactions and visible ratios for iron-oxidation signatures.',
        diffLabels: ['Naturalization', 'Chemical Staining'],
        evalscript: genEvalscript(['B02', 'B04', 'B11', 'B12'], `
  let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
  let clayRatio = sample.B12 === 0 ? 0 : sample.B11 / sample.B12;
  let ironIndex = sample.B02 === 0 ? 0 : sample.B04 / sample.B02;
  
  let score = Math.max(0, ndsi) * Math.max(0, clayRatio - 1.2) * Math.max(0, ironIndex - 1.5);
  let mapped = Math.min(1, score * 15.0);
  
  ${colorBlend('mapped', `[
      [0.0, 68, 34, 0],
      [0.3, 136, 68, 0],
      [0.7, 170, 136, 170],
      [1.0, 255, 255, 255]
  ]`)}
`),
        fisBands: ['B02', 'B04', 'B11', 'B12'],
        fisLogic: `
  let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
  let clayRatio = (sample.B12 === 0) ? 0 : sample.B11 / sample.B12;
  let ironIndex = (sample.B02 === 0) ? 0 : sample.B04 / sample.B02;
  return [Math.max(0, ndsi) * Math.max(0, clayRatio - 1.2) * Math.max(0, ironIndex - 1.5)];
`
    },
    phi: {
        name: 'Petro-Hydrocarbon Index (PHI) ✧',
        sensor: 'Sentinel-2 L2A',
        temporal: '0-6M',
        min: 'Background', max: 'Hydrocarbon Rich',
        gradient: 'linear-gradient(to right, #000000, #333333, #663300, #FFCC00)',
        formula: 'NDSI * (B11/B12) * HCAI',
        info: 'Petro-Hydrocarbon Index — isolates oily brine from clean runoff by highlighting the unique SWIR absorption shoulder of petroleum hydrocarbons co-located with a salinity signature.',
        diffLabels: ['Oil Degradation', 'New Oil/Brine Event'],
        evalscript: genEvalscript(['B04', 'B11', 'B12'], `
  let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
  let shoulder = sample.B12 === 0 ? 0 : sample.B11 / sample.B12;
  let hcai = (sample.B11 + sample.B04) === 0 ? 0 : (sample.B11 - sample.B04) / (sample.B11 + sample.B04);
  
  let score = Math.max(0, ndsi) * Math.max(0, shoulder - 1.0) * Math.max(0, hcai - 0.2);
  let mapped = Math.min(1, score * 20.0);
  
  ${colorBlend('mapped', `[
      [0.0, 0, 0, 0],
      [0.3, 51, 51, 51],
      [0.7, 102, 51, 0],
      [1.0, 255, 204, 0]
  ]`)}
`),
        fisBands: ['B04', 'B11', 'B12'],
        fisLogic: `
  let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
  let shoulder = (sample.B12 === 0) ? 0 : sample.B11 / sample.B12;
  let hcai = (sample.B11 + sample.B04) === 0 ? 0 : (sample.B11 - sample.B04) / (sample.B11 + sample.B04);
  return [Math.max(0, ndsi) * Math.max(0, shoulder - 1.0) * Math.max(0, hcai - 0.2)];
`
    },
    hmi: {
        name: 'Heavy Metal Interaction (HMI) ✧',
        sensor: 'Sentinel-2 L2A',
        temporal: '12M+',
        min: 'Clean', max: 'Metal-Salt PPT',
        gradient: 'linear-gradient(to right, #001100, #004400, #00FFBB, #FFFFFF)',
        formula: '(B03/B02) * (B11/B12)',
        info: 'Heavy Metal Interaction — targets Barium and Strontium proxies via green-reflectance shifts (B03) and mineral salt precipitation signatures (B11/B12).',
        diffLabels: ['Site Detoxification', 'Metal Accumulation'],
        evalscript: genEvalscript(['B02', 'B03', 'B11', 'B12'], `
  let greenShift = sample.B02 === 0 ? 0 : sample.B03 / sample.B02;
  let saltPPT = sample.B12 === 0 ? 0 : sample.B11 / sample.B12;
  
  let score = Math.max(0, greenShift - 1.1) * Math.max(0, saltPPT - 1.2);
  let mapped = Math.min(1, score * 10.0);
  
  ${colorBlend('mapped', `[
      [0.0, 0, 17, 0],
      [0.3, 0, 68, 0],
      [0.7, 0, 255, 187],
      [1.0, 255, 255, 255]
  ]`)}
`),
        fisBands: ['B02', 'B03', 'B11', 'B12'],
        fisLogic: `
  let greenShift = (sample.B02 === 0) ? 0 : sample.B03 / sample.B02;
  let saltPPT = (sample.B12 === 0) ? 0 : sample.B11 / sample.B12;
  return [Math.max(0, greenShift - 1.1) * Math.max(0, saltPPT - 1.2)];
`
    },
    scri: {
        name: 'Salt Crust Roughness Index (SCRI) ✧✧',
        sensor: 'Sentinel-1 GRD',
        temporal: '3-12M',
        min: 'Background', max: 'Salt Crust Confirmed',
        gradient: 'linear-gradient(to right, #000000, #4b0082, #e74c3c, #f1c40f)',
        formula: 'log10(VH) + Salt_Proxy',
        info: 'Salt Crust Roughness Index — a visionary SAR-based tool. Leverages the characteristic backscatter changes of salt crystallization on the soil surface. This index penetrates dust and smoke, providing a mechanical verification of the chemical salinity signatures seen in optical data.',
        diffLabels: ['Smoothing / Naturalization', 'New Salt Roughness'],
        evalscript: `//VERSION=3
function setup() {
  return {
    input: ["VV", "VH", "dataMask"],
    output: { id: "default", bands: 4 }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0,1];
  let vh = 10 * Math.log10(sample.VH);
  let vv = 10 * Math.log10(sample.VV);
  let ratio = vh - vv;
  // Contrast hardened: -19dB floor, 6dB ratio bias, powered scaling
  let score = Math.max(0, (vh + 19) / 9) * Math.max(0, (ratio + 6) / 5);
  let mapped = Math.min(1, Math.pow(score * 0.5, 2.5));
  
  ${colorBlend('mapped', `[
      [0.0, 0, 0, 0],
      [0.3, 75, 0, 130],
      [0.7, 231, 76, 60],
      [1.0, 241, 196, 15]
  ]`)}
}`,
        fisBands: ['VV', 'VH'],
        fisLogic: `
  let vh = 10 * Math.log10(sample.VH);
  let vv = 10 * Math.log10(sample.VV);
  let score = Math.max(0, (vh + 19) / 9) * Math.max(0, (vh - vv + 6) / 5);
  return [Math.min(1, Math.pow(score * 0.5, 2.5))];
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
  // Convert power to decibels
  let vv_db = Math.max(0, Math.log10(sample.VV) * 10 + 20) / 20; 
  
  if (typeof VISUAL_FILTER !== 'undefined' && vv_db < VISUAL_FILTER) return [0,0,0,0];
  
  // Map backscatter to grayscale (smooth/dark -> rough/white)
  return [vv_db, vv_db, vv_db, 1];
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
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
};

const state = {
    map: null,
    baseLayerInst: null,
    activeLoc: 'dixon',
    activeIndex: 'ndmi',
    mode: 'single', // 'single' or 'compare'
    monthIndex: Math.max(0, ALL_DATES.length - 1),
    sarFusion: false, // track the state of the SAR Overlay toggle
    hlsEnabled: false, // NASA HLS temporal booster
    deepFusion: false, // True S1+S2 spectral fusion
    opacity: 0.85,
    visualFilter: 0,
    sensitivity: 0, // Dynamic threshold offset (-50 to 50)
    overlayGroup: null,
    leftGroup: null,
    rightGroup: null,
    sbsControl: null,
    chartInst: null,

    anomalousDates: [], // Array of 'YYYY-MM-DD' strings flagged by the scanner
    rrcSpillLayer: null, // Leaflet layer group for RRC spill markers
    rrcSpillData: null   // Cached GeoJSON after first fetch
};

// ── INIT ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const vBadge = document.getElementById('app-version-badge');
    if (vBadge) vBadge.textContent = APP_VERSION;

    // Inject Tooltips (Scientific Context) to Index Buttons
    document.querySelectorAll('.index-btn').forEach(btn => {
        const idx = btn.getAttribute('data-index');
        if (INDICES[idx] && INDICES[idx].info) {
            btn.classList.add('tooltip-wrapper'); // Ensure wrapper class is applied
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip-text';
            tooltip.innerHTML = `<strong>${INDICES[idx].name}</strong><br><br>${INDICES[idx].info}`;
            btn.appendChild(tooltip);
        }
    });

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

        // Populate timeline dropdown
        const selSingle = document.getElementById('date-single');
        selSingle.innerHTML = '';
        ALL_DATES.forEach((d, i) => {
            let opt = document.createElement('option');
            opt.value = i;
            opt.text = d.displayStr;
            selSingle.appendChild(opt);
        });

        state.monthIndex = ALL_DATES.length - 1;
        selSingle.value = state.monthIndex;


    }


    initMap();
    bindEvents();

    // Probe Acquisitions for the initial location
    probeAcquisitions();

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
function createGifPlayer(frames, imgEl, downloadBtn, width = 400, height = 330) {
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

    // Clean up any previously running timer on this specific image element
    if (imgEl._gifTimer) {
        clearInterval(imgEl._gifTimer);
    }

    const pause = () => {
        playing = false;
        if (imgEl._gifTimer) {
            clearInterval(imgEl._gifTimer);
            imgEl._gifTimer = null;
        }
        if (playBtnEl) { playBtnEl.textContent = '▶'; playBtnEl.classList.remove('active'); }
    };

    const play = () => {
        if (imgEl._gifTimer) clearInterval(imgEl._gifTimer);
        playing = true;
        if (playBtnEl) { playBtnEl.textContent = '⏸'; playBtnEl.classList.add('active'); }
        imgEl._gifTimer = setInterval(() => show(current + 1), intervalMs);
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
            gifWidth: width, gifHeight: height,
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

function getScriptContent(activeIndex, isDiff, isCumulative = false) {
    if (activeIndex === 'none') return '';
    const cfg = INDICES[activeIndex];
    if (!cfg) return '';
    let scriptContent = cfg.evalscript;

    if (isCumulative) {
        // Build the cumulative max-composite logic
        let logic = "";
        let palette = "[[0,0,0,0], [1,255,255,255]]"; // fallback

        // Note: we must strip the surrounding colorBlend and return [val] from the logic
        if (activeIndex === 'ndmi') { logic = "(sample.B8A - sample.B11) / (sample.B8A + sample.B11) + 0.3"; palette = PALETTE_NDMI; }
        else if (activeIndex === 'ndwi') { logic = "(sample.B03 - sample.B11) / (sample.B03 + sample.B11) + 0.3"; palette = PALETTE_NDWI; }
        else if (activeIndex === 'ndvi') { logic = "(sample.B08 - sample.B04) / (sample.B08 + sample.B04)"; palette = PALETTE_VEG; }
        else if (activeIndex === 'savi') { logic = "((sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.5)) * 1.5 + 0.2"; palette = PALETTE_VEG; }
        else if (activeIndex === 'msi') { logic = "sample.B11 / sample.B08"; palette = PALETTE_MSI; } // Corrected palette
        else if (activeIndex === 'si') { logic = "(sample.B11 - sample.B08) / (sample.B11 + sample.B08) + 0.5"; palette = PALETTE_SI; } // Corrected palette
        else if (activeIndex === 'ndsi') { logic = "(sample.B11 - sample.B12) / (sample.B11 + sample.B12) + 0.1"; palette = PALETTE_BRINE; }
        else if (activeIndex === 'bsi') { logic = "((sample.B11 + sample.B04) - (sample.B08 + sample.B02)) / ((sample.B11 + sample.B04) + (sample.B08 + sample.B02))"; palette = PALETTE_BSI; }
        else if (activeIndex === 'csi') { logic = "sample.B11 / sample.B12 - 0.5"; palette = PALETTE_CSI; }
        else if (activeIndex === 'hcai') { logic = "(sample.B11 - sample.B04) / (sample.B11 + sample.B04) + 0.1"; palette = PALETTE_HCAI; }
        else if (activeIndex === 'hmri') { logic = "sample.B12 / sample.B03 - 2.0"; palette = PALETTE_HMRI; }
        else if (activeIndex === 'ndoi') { logic = "(sample.B02 - sample.B12) / (sample.B02 + sample.B12)"; palette = "[ [0.0, 43, 62, 80], [0.3, 127, 140, 141], [0.7, 241, 196, 15], [1.0, 231, 76, 60] ]"; }
        else if (activeIndex === 'crsi') { logic = "1.0 - Math.min(1, Math.max(0, Math.sqrt(Math.max(0, ((sample.B08*sample.B04)-(sample.B03*sample.B02))/((sample.B08*sample.B04)+(sample.B03*sample.B02))))))"; palette = "[ [0.0, 39, 174, 96], [0.4, 241, 196, 15], [0.7, 230, 126, 34], [1.0, 192, 57, 43] ]"; }
        else if (activeIndex === 'aoi') { logic = "Math.max(0, (((sample.B04/sample.B02)*(sample.B11/sample.B12)) - 2.0) / 2.0)"; palette = "[ [0.0, 44, 62, 80], [0.4, 142, 68, 173], [0.8, 192, 57, 43], [1.0, 255, 0, 0] ]"; }
        else if (activeIndex === 'pwi') {
            logic = `
                (function() {
                    let bsiTop = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
                    let bsiBot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
                    if (bsiBot === 0 || (bsiTop / bsiBot) <= 0) return 0;
                    
                    let sumNdsi = sample.B11 + sample.B12;
                    if(sumNdsi === 0) return 0;
                    let ndsi = (sample.B11 - sample.B12) / sumNdsi;
                    
                    let sumHcai = sample.B11 + sample.B04;
                    if(sumHcai === 0) return 0;
                    let hcai = (sample.B11 - sample.B04) / sumHcai;
                    
                    let hmri = (sample.B03 === 0) ? 0 : sample.B12 / sample.B03;
                    
                    let pScore = Math.max(0, ndsi - 0.05) * Math.max(0, (hcai - 0.20) * 2.5) * Math.max(0, (hmri - 1.5) * 2.5);
                    return Math.min(1, Math.pow(pScore * 60.0, 1.5));
                })()
            `;
            palette = PALETTE_PWI;
        }

        let bands = ['B04', 'B03', 'B02'];
        if (activeIndex === 'ndmi') bands = ['B8A', 'B11'];
        if (activeIndex === 'ndwi') bands = ['B03', 'B11'];
        if (activeIndex === 'ndvi' || activeIndex === 'savi') bands = ['B08', 'B04'];
        if (activeIndex === 'msi' || activeIndex === 'si') bands = ['B11', 'B08'];
        if (activeIndex === 'ndsi' || activeIndex === 'csi') bands = ['B11', 'B12'];
        if (activeIndex === 'bsi') bands = ['B02', 'B04', 'B08', 'B11'];
        if (activeIndex === 'hcai') bands = ['B11', 'B04'];
        if (activeIndex === 'hmri') bands = ['B12', 'B03'];
        if (activeIndex === 'ndoi') bands = ['B02', 'B12'];
        if (activeIndex === 'crsi') bands = ['B02', 'B03', 'B04', 'B08'];
        if (activeIndex === 'aoi') bands = ['B02', 'B04', 'B11', 'B12'];
        if (activeIndex === 'pwi') bands = ['B02', 'B03', 'B04', 'B08', 'B11', 'B12'];
        if (activeIndex === 'lbi') {
            logic = `
                (function() {
                    let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
                    let ndwi = (sample.B03 + sample.B11) === 0 ? 0 : (sample.B03 - sample.B11) / (sample.B03 + sample.B11);
                    let ndvi = (sample.B08 + sample.B04) === 0 ? 0 : (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
                    let bsi = (sample.B11+sample.B04+sample.B08+sample.B02) === 0 ? 0 : ((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02));
                    return Math.max(0, ndsi) * Math.max(0, ndwi + 0.5) * Math.max(0, 1.0 - ndvi) * Math.max(0, bsi) * 40.0;
                })()
            `;
            palette = PALETTE_LBI;
            bands = ['B03', 'B04', 'B08', 'B11', 'B12'];
        }
        if (activeIndex === 'tri') {
            logic = `
                (function() {
                    let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
                    let hmri = sample.B03 === 0 ? 0 : sample.B12 / sample.B03;
                    let aoi = (sample.B02 === 0 || sample.B12 === 0) ? 0 : (sample.B04 / sample.B02) * (sample.B11 / sample.B12);
                    return Math.max(0, ndsi - 0.05) * Math.max(0, (hmri - 1.5)/2) * Math.max(0, (aoi - 1.5)/2) * 10;
                })()
            `;
            palette = PALETTE_TRI;
            bands = ['B02', 'B03', 'B04', 'B11', 'B12'];
        }
        if (activeIndex === 'bpi') {
            logic = `
                (function() {
                    let bsi = (sample.B11+sample.B04+sample.B08+sample.B02) === 0 ? 0 : ((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02));
                    let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
                    let hcai = (sample.B11 + sample.B04) === 0 ? 0 : (sample.B11 - sample.B04) / (sample.B11 + sample.B04);
                    return Math.max(0, bsi) * Math.max(0, ndsi - 0.03) * Math.max(0, hcai - 0.15) * 30.0;
                })()
            `;
            palette = PALETTE_BPI;
            bands = ['B02', 'B04', 'B08', 'B11', 'B12'];
        }
        if (activeIndex === 'hpwi') {
            if (state.deepFusion) {
                // HPWI 2.0: Deep Spectral Fusion (S1 VH/VV + S2 Optical) — Aligned with Balanced Spec
                let fusionLogic = `
                // 1. Sentinel-2 Chemical Signal (Salinity/Hydrocarbons/Metals)
                let sumNdsi = (sample.B11 + sample.B12);
                let ndsi = sumNdsi === 0 ? 0 : (sample.B11 - sample.B12) / sumNdsi;
                let sumHcai = (sample.B11 + sample.B04);
                let hcai = sumHcai === 0 ? 0 : (sample.B11 - sample.B04) / sumHcai;
                let hmri = (sample.B03 === 0) ? 0 : (sample.B12 / sample.B03);
                
                let brineScore = Math.max(0, ndsi - 0.10);
                let hydrocarbonScore = Math.max(0, (hcai - 0.30) * 2);
                let metalScore = Math.max(0, (hmri - 2.0) * 2);
                let chemPWI = brineScore * hydrocarbonScore * metalScore;

                // 2. Sentinel-1 Physical Signal (Radar Smoothness)
                // Smooth liquid surfaces cause VH/VV specular reflection (low backscatter)
                let vh_db = 10 * Math.log10(Math.max(0.0001, sample.VH));
                let smoothness = Math.max(0, Math.min(1, (-vh_db - 15) / 10)); // 1 = very smooth/liquid

                // 3. Fusion Logic: Chemical Signature MUST be confirmed by Physical Smoothness
                let combinedScore = chemPWI * smoothness;
                let mapped = Math.min(1.0, Math.pow(combinedScore * 20.0, 3.0));
                
                ${colorBlend('mapped', PALETTE_PWI)}
            `;
                return genDeepFusionEvalscript(['VV', 'VH', 'B02', 'B03', 'B04', 'B11', 'B12'], fusionLogic);
            } else {
                // Standard HPWI (Optical Proxy) - Aligned with Balanced Spec
                logic = `
                (function() {
                    let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
                    let hcai = (sample.B11 + sample.B04) === 0 ? 0 : (sample.B11 - sample.B04) / (sample.B11 + sample.B04);
                    let hmri = (sample.B03 === 0) ? 0 : (sample.B12 / sample.B03);
                    
                    let brineScore = Math.max(0, ndsi - 0.10);
                    let hydrocarbonScore = Math.max(0, (hcai - 0.30) * 2);
                    let metalScore = Math.max(0, (hmri - 2.0) * 2);
                    let chemPWI = brineScore * hydrocarbonScore * metalScore;

                    let sumSmooth = sample.B03 + sample.B11;
                    let normSmooth = Math.max(0, Math.min(1, ((sample.B03 - sample.B11)/sumSmooth + 0.3) / 0.6));
                    
                    let combined = chemPWI * normSmooth;
                    return Math.min(1.0, Math.pow(combined * 20.0, 3.0));
                })()
            `;
                palette = PALETTE_PWI;
                bands = ['B02', 'B03', 'B04', 'B11', 'B12'];
            }
        }
        if (activeIndex === 'vsi') {
            logic = `
                (function() {
                    let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
                    let redEdgeDelta = (sample.B07 + sample.B05) === 0 ? 0 : (sample.B07 - sample.B05) / (sample.B07 + sample.B05);
                    let msi = sample.B8A === 0 ? 0 : sample.B11 / sample.B8A;
                    return Math.max(0, ndsi) * Math.max(0, 0.4 - redEdgeDelta) * Math.max(0, msi - 1.0) * 10.0;
                })()
            `;
            palette = PALETTE_VSI;
            bands = ['B05', 'B07', 'B11', 'B12', 'B8A'];
        }
        if (activeIndex === 'cma') {
            logic = `
                (function() {
                    let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
                    let clayRatio = (sample.B12 === 0) ? 0 : sample.B11 / sample.B12;
                    let ironIndex = (sample.B02 === 0) ? 0 : sample.B04 / sample.B02;
                    return Math.max(0, ndsi) * Math.max(0, clayRatio - 1.2) * Math.max(0, ironIndex - 1.5) * 15.0;
                })()
            `;
            palette = PALETTE_CMA;
            bands = ['B02', 'B04', 'B11', 'B12'];
        }
        if (activeIndex === 'phi') {
            logic = `
                (function() {
                    let ndsi = (sample.B11 + sample.B12) === 0 ? 0 : (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
                    let shoulder = (sample.B12 === 0) ? 0 : sample.B11 / sample.B12;
                    let hcai = (sample.B11 + sample.B04) === 0 ? 0 : (sample.B11 - sample.B04) / (sample.B11 + sample.B04);
                    return Math.max(0, ndsi) * Math.max(0, shoulder - 1.0) * Math.max(0, hcai - 0.2) * 20.0;
                })()
            `;
            palette = PALETTE_PHI;
            bands = ['B04', 'B11', 'B12'];
        }
        if (activeIndex === 'hmi') {
            logic = `
                (function() {
                    let greenShift = (sample.B02 === 0) ? 0 : sample.B03 / sample.B02;
                    let saltPPT = (sample.B12 === 0) ? 0 : sample.B11 / sample.B12;
                    return Math.max(0, greenShift - 1.1) * Math.max(0, saltPPT - 1.2) * 10.0;
                })()
            `;
            palette = PALETTE_HMI;
            bands = ['B02', 'B03', 'B11', 'B12'];
        }
        if (activeIndex === 'scri') {
            logic = `
                (function() {
                    let vh = 10 * Math.log10(sample.VH);
                    let vv = 10 * Math.log10(sample.VV);
                    let ratio = vh - vv;
                    return Math.max(0, (vh + 20) / 10) * Math.max(0, (ratio + 5) / 5) * 0.5;
                })()
            `;
            palette = PALETTE_SCRI;
            bands = ['VV', 'VH'];
        }

        // Data fusion indices like HPWI are too complex for the basic cumulative script generator
        if (activeIndex !== 'hpwi') {
            if (activeIndex === 'msi') palette = PALETTE_MSI_INV;
            scriptContent = genCumulativeEvalscript(bands, logic, palette);
        }
    } else {
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
        } else if (isDiff) {
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
            else if (activeIndex === 'ndsi') calc = '-((sample.B11 - sample.B12)/(sample.B11 + sample.B12))';
            else if (activeIndex === 'bsi') calc = '-(((sample.B11 + sample.B04) - (sample.B08 + sample.B02)) / ((sample.B11 + sample.B04) + (sample.B08 + sample.B02)))';
            else if (activeIndex === 'csi') calc = '-(sample.B11 / sample.B12)';
            else if (activeIndex === 'hcai') calc = '-((sample.B11 - sample.B04)/(sample.B11 + sample.B04))';
            else if (activeIndex === 'hmri') calc = '-(sample.B12 / sample.B03)';
            else if (activeIndex === 'ndoi') calc = '-((sample.B02 - sample.B12)/(sample.B02 + sample.B12))';
            else if (activeIndex === 'crsi') calc = '-(Math.sqrt(Math.max(0, ((sample.B08*sample.B04)-(sample.B03*sample.B02))/((sample.B08*sample.B04)+(sample.B03*sample.B02)))))';
            else if (activeIndex === 'aoi') calc = '-((sample.B04/sample.B02)*(sample.B11/sample.B12))';
            else if (activeIndex === 'ehc') calc = '-(((sample.B02-sample.B12)/(sample.B02+sample.B12)) + ((sample.B11-sample.B12)/(sample.B11+sample.B12)))';
            else if (activeIndex === 'pwi') calc = '-((function(){ let bsiTop=(sample.B11+sample.B04)-(sample.B08+sample.B02); let bsiBot=(sample.B11+sample.B04)+(sample.B08+sample.B02); let bsi=(bsiBot===0)?0:(bsiTop/bsiBot); if(bsi<0.01)return 0; let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let hcai=(sample.B11+sample.B04===0)?0:(sample.B11-sample.B04)/(sample.B11+sample.B04); let hmri=(sample.B03===0)?0:sample.B12/sample.B03; return Math.max(0,ndsi-0.05)*Math.max(0,(hcai-0.20)*2.5)*Math.max(0,(hmri-1.5)*2.5); })())';
            else if (activeIndex === 'lbi') calc = '-((function(){ let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let ndwi=(sample.B03+sample.B11===0)?0:(sample.B03-sample.B11)/(sample.B03+sample.B11); let ndvi=(sample.B08+sample.B04===0)?0:(sample.B08-sample.B04)/(sample.B08+sample.B04); let bsi=(sample.B11+sample.B04+sample.B08+sample.B02===0)?0:((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02)); return Math.max(0,ndsi)*Math.max(0,ndwi+0.5)*Math.max(0,1.0-ndvi)*Math.max(0,bsi); })())';
            else if (activeIndex === 'tri') calc = '-((function(){ let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let hmri=(sample.B03===0)?0:sample.B12/sample.B03; let aoi=(sample.B02===0||sample.B12===0)?0:(sample.B04/sample.B02)*(sample.B11/sample.B12); return Math.max(0,ndsi-0.05)*Math.max(0,(hmri-1.5)/2)*Math.max(0,(aoi-1.5)/2); })())';
            else if (activeIndex === 'bpi') calc = '-((function(){ let bsi=(sample.B11+sample.B04+sample.B08+sample.B02===0)?0:((sample.B11+sample.B04)-(sample.B08+sample.B02))/((sample.B11+sample.B04)+(sample.B08+sample.B02)); let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let hcai=(sample.B11+sample.B04===0)?0:(sample.B11-sample.B04)/(sample.B11+sample.B04); return Math.max(0,bsi)*Math.max(0,ndsi-0.03)*Math.max(0,hcai-0.15); })())';
            else if (activeIndex === 'vsi') calc = '-((function(){ let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let redEdgeDelta=(sample.B07+sample.B05===0)?0:(sample.B07-sample.B05)/(sample.B07+sample.B05); let msi=(sample.B8A===0)?0:sample.B11/sample.B8A; return Math.max(0,ndsi)*Math.max(0,0.4-redEdgeDelta)*Math.max(0,msi-1.0); })())';
            else if (activeIndex === 'cma') calc = '-((function(){ let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let clayRatio=(sample.B12===0)?0:sample.B11/sample.B12; let ironIndex=(sample.B02===0)?0:sample.B04/sample.B02; return Math.max(0,ndsi)*Math.max(0,clayRatio-1.2)*Math.max(0,ironIndex-1.5); })())';
            else if (activeIndex === 'phi') calc = '-((function(){ let ndsi=(sample.B11+sample.B12===0)?0:(sample.B11-sample.B12)/(sample.B11+sample.B12); let shoulder=(sample.B12===0)?0:sample.B11/sample.B12; let hcai=(sample.B11+sample.B04===0)?0:(sample.B11-sample.B04)/(sample.B11+sample.B04); return Math.max(0,ndsi)*Math.max(0,shoulder-1.0)*Math.max(0,hcai-0.2); })())';
            else if (activeIndex === 'hmi') calc = '-((function(){ let greenShift=(sample.B02===0)?0:sample.B03/sample.B02; let saltPPT=(sample.B12===0)?0:sample.B11/sample.B12; return Math.max(0,greenShift-1.1)*Math.max(0,saltPPT-1.2); })())';
            else if (activeIndex === 'scri') calc = '-((function(){ let vh=10*Math.log10(sample.VH); let vv=10*Math.log10(sample.VV); let ratio=vh-vv; return Math.max(0,(vh+20)/10)*Math.max(0,(ratio+5)/5); })())';


            // Proxies for visual bands
            else if (activeIndex === 'tc') calc = '(sample.B04*2)'; // simplistic proxy for True Color change
            else if (activeIndex === 'fc') calc = '(sample.B08*2)'; // simplistic proxy for False Color change

            // Define physical spectral sampling arrays
            let bands = ['B04', 'B03', 'B02'];
            if (activeIndex === 'ndmi') bands = ['B8A', 'B11'];
            if (activeIndex === 'ndwi') bands = ['B03', 'B11'];
            if (activeIndex === 'ndvi' || activeIndex === 'savi') bands = ['B08', 'B04'];
            if (activeIndex === 'msi' || activeIndex === 'si') bands = ['B11', 'B08'];
            if (activeIndex === 'ndsi' || activeIndex === 'csi') bands = ['B11', 'B12'];
            if (activeIndex === 'bsi') bands = ['B02', 'B04', 'B08', 'B11'];
            if (activeIndex === 'hcai') bands = ['B11', 'B04'];
            if (activeIndex === 'hmri') bands = ['B12', 'B03'];
            if (activeIndex === 'ndoi') bands = ['B02', 'B12'];
            if (activeIndex === 'crsi') bands = ['B02', 'B03', 'B04', 'B08'];
            if (activeIndex === 'aoi') bands = ['B02', 'B04', 'B11', 'B12'];
            if (activeIndex === 'ehc') bands = ['B02', 'B12', 'B11'];
            if (activeIndex === 'pwi') bands = ['B02', 'B03', 'B04', 'B08', 'B11', 'B12'];
            if (activeIndex === 'lbi') bands = ['B02', 'B03', 'B04', 'B08', 'B11', 'B12'];
            if (activeIndex === 'tri') bands = ['B02', 'B03', 'B04', 'B11', 'B12'];
            if (activeIndex === 'bpi') bands = ['B02', 'B04', 'B08', 'B11', 'B12'];
            if (activeIndex === 'vsi') bands = ['B05', 'B07', 'B11', 'B12', 'B8A'];
            if (activeIndex === 'cma') bands = ['B02', 'B04', 'B11', 'B12'];
            if (activeIndex === 'phi') bands = ['B04', 'B11', 'B12'];
            if (activeIndex === 'hmi') bands = ['B02', 'B03', 'B11', 'B12'];
            if (activeIndex === 'scri') bands = ['VV', 'VH'];
            if (activeIndex === 'fc') bands = ['B08', 'B04', 'B03'];

            scriptContent = genDiffEvalscript(bands, calc);
        }
    }

    // Fallback for Data Fusion in Diff/Cumulative Modes (not supported by simple array builders)
    if (activeIndex === 'hpwi' && isDiff) {
        scriptContent = cfg.evalscript; // HPWI doesn't easily support temporal diffing due to multi-source limits in our current engine
    }

    // Inject visual filter and sensitivity globally into the raw script string
    const filterInject = `//VERSION=3\nconst VISUAL_FILTER = ${state.visualFilter};\nconst DETECTION_SENSITIVITY = ${state.sensitivity / 100};`;
    scriptContent = scriptContent.trim().replace(/\/\/\s*VERSION=3/i, filterInject);

    return scriptContent;
}

function getWMSLayer(timeStr, isDiff, overrideIndex = null) {
    const activeIdx = overrideIndex || state.activeIndex;
    const isCumulative = (state.mode === 'compare' && state.compareType === 'cumulative' && !overrideIndex);
    let scriptContent = getScriptContent(activeIdx, isDiff, isCumulative);

    let wmsLayerParam = 'AGRICULTURE';
    const cfg = INDICES[activeIdx];
    if (activeIdx === 's1_sar' || (cfg && cfg.sensor === 'Sentinel-1 GRD')) wmsLayerParam = 'SENTINEL1-GRD';
    if (state.hlsEnabled && activeIdx !== 's1_sar' && activeIdx !== 'hpwi') {
        // CDSE standard layer names for Landsat collections
        wmsLayerParam = SH_WMS_URL.includes('copernicus.eu') ? 'SENTINEL2-L2A,LANDSAT-8-L2A' : 'NASA-HLS';
    }

    // Handle Deep Fusion Multi-Source Request
    if (state.deepFusion && activeIdx === 'hpwi') {
        // CDSE multi-source WMS requires explicit collection identifiers
        wmsLayerParam = 'SENTINEL1-GRD,SENTINEL2-L2A';
    }

    console.log(`[WMS] Requesting Index: ${activeIdx} | Layers: ${wmsLayerParam} | DeepFusion: ${state.deepFusion} | HLS: ${state.hlsEnabled}`);

    // Auto-expand time window for Fusion to ensure intersection
    let queryTime = timeStr;
    if ((activeIdx === 'hpwi' || state.deepFusion) && !timeStr.includes('/')) {
        let dateObj = new Date(timeStr);
        let pastObj = new Date(dateObj);
        pastObj.setDate(pastObj.getDate() - 30);
        queryTime = pastObj.toISOString().split('T')[0] + '/' + timeStr;
    }

    // Deep Fusion UI Feedback (v33)
    const deepBox = document.getElementById('toggle-deep-fusion')?.parentElement;
    if (deepBox) {
        if (state.deepFusion && activeIdx !== 'hpwi') {
            deepBox.classList.add('fusion-active-warning');
            if (!document.getElementById('fusion-note')) {
                const note = document.createElement('div');
                note.id = 'fusion-note';
                note.className = 'fusion-status-indicator';
                note.textContent = '⚠ Inactive for current index';
                deepBox.appendChild(note);
            }
            deepBox.classList.add('fusion-active');
        } else {
            deepBox.classList.remove('fusion-active-warning', 'fusion-active');
            document.getElementById('fusion-note')?.remove();
        }
    }

    return L.tileLayer.wms(SH_WMS_URL, {
        layers: wmsLayerParam,
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        time: queryTime,
        maxcc: 20,
        showlogo: false,
        evalscript: btoa(unescape(encodeURIComponent(scriptContent))),
        opacity: overrideIndex ? 0.5 : state.opacity,
        attribution: 'Copernicus Sentinel Hub',
        tileSize: 256,
        minZoom: 10,
        zIndex: overrideIndex ? 20 : 10
    });
}

function applyIndex(isScrubbing = false) {
    if (!state.map) return;


    if (!isScrubbing) {
        if (state.overlayGroup) { state.map.removeLayer(state.overlayGroup); state.overlayGroup = null; }
        if (state.leftGroup) { state.map.removeLayer(state.leftGroup); state.leftGroup = null; }
        if (state.rightGroup) { state.map.removeLayer(state.rightGroup); state.rightGroup = null; }
        if (state.sbsControl) { state.map.removeControl(state.sbsControl); state.sbsControl = null; }
    }

    if (state.activeIndex === 'none') {
        updateUI();
        return;
    }

    let layersToGroup = [];
    let rightLayersGroup = [];

    if (state.mode === 'single') {
        if (!ALL_DATES[state.monthIndex]) return;
        const timeStr = ALL_DATES[state.monthIndex].value;

        if (isScrubbing && state.overlayGroup) {
            // OPTIMIZED PATH: Just update the WMS time parameter on existing layers
            state.overlayGroup.eachLayer(layer => {
                if (layer.setParams) {
                    layer.setParams({ time: timeStr }, false); // false = don't redraw immediately, let leaflet handle it
                }
            });
        } else {
            // FULL REBUILD PATH
            layersToGroup.push(getWMSLayer(timeStr, false));

            if (state.sarFusion && state.activeIndex !== 's1_sar') {
                layersToGroup.push(getWMSLayer(timeStr, false, 's1_sar'));
            }

            state.overlayGroup = L.layerGroup(layersToGroup).addTo(state.map);
        }
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
        } else if (state.compareType === 'cumulative') {
            const timeRange = `${t1}/${t2}`;
            const cumulativeLayer = getWMSLayer(timeRange, false, false); // isDiff=false here, we handle logic in getScriptContent
            layersToGroup.push(cumulativeLayer);

            if (state.sarFusion && state.activeIndex !== 's1_sar') {
                layersToGroup.push(getWMSLayer(timeRange, false, 's1_sar'));
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

    // Update Scientific Info Inset
    const infoContent = document.getElementById('scientific-info-content');
    if (infoContent) {
        let infoHtml = `<strong>${cfg.name}</strong><br>${cfg.info}`;
        if (cfg.formula) infoHtml += `<div style="margin-top:8px;font-family:'JetBrains Mono',monospace;color:var(--accent-cyan);opacity:0.8;font-size:9px;">${cfg.formula}</div>`;

        // Add Sensor Icon Legend (v35)
        infoHtml += `<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:9px;color:var(--text-dim);letter-spacing:0.02em;">
        [S] Sentinel-2 &nbsp; [L] Landsat-8 &nbsp; [F] Fusion
    </div>`;

        document.getElementById('scientific-info-content').innerHTML = infoHtml;
    }

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
    } else if (cfg.gradient && cfg.gradient !== 'none') {
        if (diffLegend) diffLegend.style.display = 'none';
        grad.style.display = 'block';
        document.getElementById('legend-min').style.display = 'block';
        document.getElementById('legend-max').style.display = 'block';
        grad.style.background = cfg.gradient;
    } else {
        grad.style.display = 'none';
        document.getElementById('legend-min').style.display = 'none';
        document.getElementById('legend-max').style.display = 'none';
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
    const btnCumulative = document.getElementById('btn-cumulative'); // Added this line
    if (btnSwipe && btnDiff && btnCumulative) { // Modified condition
        document.getElementById('btn-swipe').addEventListener('click', () => {
            state.compareType = 'swipe';
            document.getElementById('btn-swipe').classList.add('active');
            document.getElementById('btn-diff').classList.remove('active');
            document.getElementById('btn-cumulative').classList.remove('active');
            applyIndex();
        });
        document.getElementById('btn-diff').addEventListener('click', () => {
            state.compareType = 'diff';
            document.getElementById('btn-diff').classList.add('active');
            document.getElementById('btn-swipe').classList.remove('active');
            document.getElementById('btn-cumulative').classList.remove('active');
            applyIndex();
        });
        document.getElementById('btn-cumulative').addEventListener('click', () => {
            state.compareType = 'cumulative';
            document.getElementById('btn-cumulative').classList.add('active');
            document.getElementById('btn-swipe').classList.remove('active');
            document.getElementById('btn-diff').classList.remove('active');
            applyIndex();
        });
    }

    // Index Buttons & Temporal Badges
    document.querySelectorAll('.index-btn').forEach(btn => {
        // Create top container for Name + Badge
        const shortSpan = btn.querySelector('.index-short');
        if (shortSpan) {
            const topContainer = document.createElement('div');
            topContainer.className = 'index-btn-top';
            shortSpan.parentNode.insertBefore(topContainer, shortSpan);
            topContainer.appendChild(shortSpan);

            // Inject Temporal Relevance Badge into the top container
            const idxKey = btn.dataset.index;
            const cfg = INDICES[idxKey];
            if (cfg && cfg.temporal) {
                const badge = document.createElement('span');
                badge.className = `temporal-badge temporal-${cfg.temporal.toLowerCase().replace(/ /g, '-').replace(/\//g, '-').replace(/\+/g, 'plus')}`;
                badge.textContent = cfg.temporal;

                // If a tag-container exists (e.g. for Radar), use it. Otherwise use topContainer.
                const tagCont = btn.querySelector('.tag-container');
                if (tagCont) {
                    tagCont.appendChild(badge);
                } else {
                    topContainer.appendChild(badge);
                }

                // Add identifying class to the button itself for more complex styling if needed
                btn.classList.add(`rel-${cfg.temporal.toLowerCase().replace(/ /g, '-').replace(/\//g, '-').replace(/\+/g, 'plus')}`);
            }
        }

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

            // Re-probe acquisitions for the new view
            setTimeout(() => probeAcquisitions(), 1600);
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

    // Data Fusion & HLS Toggles
    const toggleSar = document.getElementById('toggle-sar-fusion');
    if (toggleSar) {
        toggleSar.addEventListener('change', (e) => {
            state.sarFusion = e.target.checked;
            applyIndex();
        });
    }

    const toggleHls = document.getElementById('toggle-hls-temporal');
    if (toggleHls) {
        toggleHls.addEventListener('change', (e) => {
            state.hlsEnabled = e.target.checked;
            applyIndex();
        });
    }

    const toggleDeep = document.getElementById('toggle-deep-fusion');
    if (toggleDeep) {
        toggleDeep.addEventListener('change', (e) => {
            state.deepFusion = e.target.checked;
            applyIndex();
        });
    }

    // RRC Spill Overlay Toggle
    const toggleRrc = document.getElementById('toggle-rrc-spills');
    if (toggleRrc) {
        toggleRrc.addEventListener('change', (e) => {
            if (e.target.checked) {
                initRrcSpillOverlay();
            } else {
                if (state.rrcSpillLayer) {
                    state.map.removeLayer(state.rrcSpillLayer);
                    state.rrcSpillLayer = null;
                }
                const badge = document.getElementById('rrc-spill-count');
                if (badge) badge.style.display = 'none';
            }
        });
    }


    // Single Date Dropdown
    const dateSingleEl = document.getElementById('date-single');
    if (dateSingleEl) {
        dateSingleEl.addEventListener('change', (e) => {
            state.monthIndex = parseInt(e.target.value, 10);
            if (state.mode === 'single') applyIndex();
        });
    }

    // Trendline Toggle
    const toggleTrendline = document.getElementById('toggle-trendline');
    if (toggleTrendline) {
        toggleTrendline.addEventListener('change', (e) => {
            if (reportChartInst && reportChartInst.data.datasets.length > 0) {
                // The smoothed trend is at index 0
                reportChartInst.data.datasets[0].hidden = !e.target.checked;
                reportChartInst.update();
            }
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

    // Visual filter (threshold mask) slider
    const vfSlider = document.getElementById('visual-filter-slider');
    const vfVal = document.getElementById('visual-filter-val');
    if (vfSlider) {
        let vfDebounce = null;
        vfSlider.addEventListener('input', (e) => {
            const pct = parseInt(e.target.value);
            // Map 0–100 slider pct to the 0.0–1.0 range used by VISUAL_FILTER in evalscripts
            state.visualFilter = pct / 100;
            if (vfVal) vfVal.textContent = pct === 0 ? 'Off' : pct + '%';
            // Debounce applyIndex calls — tile re-fetch is expensive
            clearTimeout(vfDebounce);
            vfDebounce = setTimeout(() => applyIndex(), 400);
        });
    }
    // Detection sensitivity slider
    const sensSlider = document.getElementById('sensitivity-slider');
    const sensVal = document.getElementById('sensitivity-val');
    if (sensSlider) {
        let sensDebounce = null;
        sensSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            state.sensitivity = val;
            if (sensVal) {
                if (val === 0) sensVal.textContent = 'Baseline';
                else if (val > 0) sensVal.textContent = '+' + val + '%';
                else sensVal.textContent = val + '%';
            }
            clearTimeout(sensDebounce);
            sensDebounce = setTimeout(() => applyIndex(), 400);
        });
    }

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

    let drawRect = new L.Draw.Rectangle(state.map, {
        shapeOptions: {
            color: '#1C85A6',
            weight: 2,
            fillOpacity: 0.1
        }
    });

    let drawPoly = new L.Draw.Polygon(state.map, {
        allowIntersection: false,
        showArea: true,
        shapeOptions: {
            color: '#FF8F00',
            weight: 2,
            fillOpacity: 0.1
        }
    });

    document.getElementById('btn-draw-aoi').addEventListener('click', () => {
        drawnItems.clearLayers();
        aoiDrawnItem = null;
        document.getElementById('btn-generate-report').disabled = true;
        drawPoly.disable();
        drawRect.enable();
    });

    document.getElementById('btn-draw-poly').addEventListener('click', () => {
        drawnItems.clearLayers();
        aoiDrawnItem = null;
        document.getElementById('btn-generate-report').disabled = true;
        drawRect.disable();
        drawPoly.enable();
    });

    state.map.on(L.Draw.Event.CREATED, function (e) {
        let layer = e.layer;
        drawnItems.addLayer(layer);
        aoiDrawnItem = layer;
        document.getElementById('btn-generate-report').disabled = false;
        const scanBtn = document.getElementById('btn-scan-aoi');
        if (scanBtn) scanBtn.disabled = false;
    });

    document.getElementById('btn-scan-aoi').addEventListener('click', async () => {
        if (!aoiDrawnItem) {
            alert("Please draw an Area of Interest (Rectangle or Polygon) first.");
            return;
        }

        const btn = document.getElementById('btn-scan-aoi');
        const originalText = btn.innerText;
        btn.innerText = "Scanning 1-Year History...";
        btn.disabled = true;

        try {
            // 1. Setup Temporal Range
            const endDate = new Date();
            const startDate = new Date();
            startDate.setUTCFullYear(startDate.getUTCFullYear() - 1); // 1 Year lookback

            // 2. Setup Evalscript
            // The scanner checks 3 primary indices: PWI, NDMI, NDWI, and Brine
            const pwiLogic = INDICES['pwi'].fisLogic;
            const fisScript = `//VERSION=3
const DETECTION_SENSITIVITY = ${state.sensitivity / 100};
function setup() {
  return {
    input: ["B11", "B12", "B04", "B03", "B8A", "dataMask"],
    output: [
      { id: "default", bands: 4, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "UINT8" }
    ]
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return { default: [NaN, NaN, NaN, NaN], dataMask: [0] };
  
  // 1. PWI
  let val_pwi = (function() { ${pwiLogic} })()[0];
  
  // 2. NDMI
  let sum_ndmi = sample.B8A + sample.B11;
  let val_ndmi = sum_ndmi === 0 ? NaN : (sample.B8A - sample.B11) / sum_ndmi;
  
  // 3. NDWI
  let sum_ndwi = sample.B03 + sample.B11;
  let val_ndwi = sum_ndwi === 0 ? NaN : (sample.B03 - sample.B11) / sum_ndwi;
  
  // 4. NDSI
  let sum_ndsi = sample.B11 + sample.B12;
  let val_ndsi = sum_ndsi === 0 ? NaN : (sample.B11 - sample.B12) / sum_ndsi;
  
  return { default: [val_pwi, val_ndmi, val_ndwi, val_ndsi], dataMask: [1] };
}`;

            const geojson = aoiDrawnItem.toGeoJSON();
            const statsPayload = {
                input: {
                    bounds: { geometry: geojson.geometry },
                    data: [{
                        type: "sentinel-2-l2a",
                        dataFilter: {
                            timeRange: { from: startDate.toISOString(), to: endDate.toISOString() },
                            mosaickingOrder: "mostRecent",
                            maxCloudCoverage: 100
                        }
                    }]
                },
                aggregation: {
                    timeRange: { from: startDate.toISOString(), to: endDate.toISOString() },
                    aggregationInterval: { of: "P5D" },
                    evalscript: fisScript,
                    resolution: 60
                }
            };

            const token = await getCDSEToken();
            const resp = await fetch(SH_STAT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(statsPayload)
            });

            if (!resp.ok) throw new Error("Statistical API failed");

            const data = await resp.json();

            // Clear existing anomalies
            state.anomalousDates = [];

            // Define "Danger" Thresholds (modified by sensitivity)
            const THRESHOLDS = {
                pwi: 0.10 - (state.sensitivity / 100 * 0.2),
                ndmi_spike: 0.35,
                ndsi: 0.15 - (state.sensitivity / 100 * 0.1)
            };

            if (data.data) {
                data.data.forEach(interval => {
                    let dateStr = interval.interval.from.slice(0, 10);
                    let bandsObj = interval.outputs?.default?.bands;
                    if (bandsObj && bandsObj.B0 && bandsObj.B0.stats.sampleCount > 0) {
                        let pwi = bandsObj.B0.stats.mean;
                        let ndmi = bandsObj.B1.stats.mean;
                        let ndwi = bandsObj.B2.stats.mean;
                        let ndsi = bandsObj.B3.stats.mean;

                        // Rule Engine: Flag if PWI spikes OR if there's a suspicious Brine + Moisture combination
                        if ((pwi !== null && pwi > THRESHOLDS.pwi) ||
                            (ndsi !== null && ndsi > THRESHOLDS.ndsi) ||
                            (ndmi !== null && ndmi > THRESHOLDS.ndmi_spike && ndwi !== null && ndwi < 0.1)) {
                            state.anomalousDates.push(dateStr);
                        }
                    }
                });
            }

            if (state.anomalousDates.length > 0) {
                alert(`Scan Complete: Identified ${state.anomalousDates.length} hazardous dates in the past year. Highlighting calendar.`);
            } else {
                alert("Scan Complete: No major anomalies detected above threshold.");
            }

            // Re-render UI to show highlights
            highlightAnomalies();

        } catch (err) {
            console.error("Anomaly scan failed", err);
            alert("Anomaly Scan failed. See console.");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    function highlightAnomalies() {
        if (!state.anomalousDates || state.anomalousDates.length === 0) return;

        ['date-single', 'date-t1', 'date-t2'].forEach(selectId => {
            const selectEl = document.getElementById(selectId);
            if (selectEl) {
                Array.from(selectEl.options).forEach(opt => {
                    if (state.anomalousDates.includes(opt.value)) {
                        if (!opt.text.includes('⚠️')) {
                            opt.text = '⚠️ ' + opt.text;
                            opt.style.color = '#FF8F00';
                            opt.style.fontWeight = 'bold';
                        }
                    }
                });
            }
        });
    }

    document.getElementById('btn-generate-report').addEventListener('click', async () => {
        if (!aoiDrawnItem) return;
        try {

            // 1. Populate Text Metadata
            const idx = INDICES[state.activeIndex];
            document.getElementById('report-date-run').innerText = new Date().toLocaleString();

            let bounds = aoiDrawnItem.getBounds();
            const geojson = aoiDrawnItem.toGeoJSON();
            let bboxStr = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
            let bStr = `N: ${bounds.getNorth().toFixed(4)}°, S: ${bounds.getSouth().toFixed(4)}°, E: ${bounds.getEast().toFixed(4)}°, W: ${bounds.getWest().toFixed(4)}°`;
            document.getElementById('report-aoi-bounds').innerText = bStr;

            document.getElementById('report-index-name').innerText = `${idx.name} [${idx.sensor}]`;
            document.getElementById('report-math').innerText = idx.formula;
            document.getElementById('report-info').innerText = idx.info || "No additional scientific context available.";

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

                let extraBands = ['B8A', 'B11', 'B03', 'B12'];
                let allBands = [...new Set([...idx.fisBands, ...extraBands])];
                let bandsStr = allBands.map(b => `'${b}'`).join(', ');
                const isSar = state.activeIndex === 's1_sar';

                const fisScript = `//VERSION=3
const DETECTION_SENSITIVITY = ${state.sensitivity / 100};
function setup() {
  return {
    input: [${bandsStr}, "dataMask"],
    output: [
      { id: "default", bands: ${isSar ? 1 : 4}, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "UINT8" }
    ]
  };
}
function evaluatePixel(sample) {
  let mask = sample.dataMask;
  if (mask === 0) return { default: ${isSar ? '[NaN]' : '[NaN, NaN, NaN, NaN]'}, dataMask: [0] };
  
  let val_active = (function() {
    ${idx.fisLogic}
  })()[0];

  ${isSar ? 'return { default: [val_active], dataMask: [1] };' : `
  let sum_ndmi = sample.B8A + sample.B11;
  let val_ndmi = sum_ndmi === 0 ? NaN : (sample.B8A - sample.B11) / sum_ndmi + 0.3;

  let sum_ndwi = sample.B03 + sample.B11;
  let val_ndwi = sum_ndwi === 0 ? NaN : (sample.B03 - sample.B11) / sum_ndwi + 0.3;

  let sum_ndsi = sample.B11 + sample.B12;
  let val_ndsi = sum_ndsi === 0 ? NaN : (sample.B11 - sample.B12) / sum_ndsi + 0.1;

  return { default: [val_active, val_ndmi, val_ndwi, val_ndsi], dataMask: [1] };
  `}
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
                    msi: '#D46A24', s1_sar: '#999999', ndsi: '#FF00FF', bsi: '#A07832', hcai: '#8B4513'
                };

                const activeKey = state.activeIndex;
                const cfg = INDICES[activeKey];

                const bboxCoords = bboxStr.split(',').map(Number);
                const collectionType = activeKey === 's1_sar' ? 'sentinel-1-grd' : 'sentinel-2-l2a';

                const statsPayload = {
                    input: {
                        bounds: {
                            geometry: geojson.geometry
                        },
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

                let reportMetadataHtml = '';

                // Fetch Scene Metadata & Weather Data helper
                async function gatherContextData(dateStr, geom, tokenStr) {
                    let ctxHtml = `<div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 10px; margin-bottom: 10px;">
                        <h5 style="margin: 0 0 8px 0; color: #fff;">Context for ${dateStr}</h5>`;

                    try {
                        // 1. Sentinel Hub Catalog API
                        let dateStart = `${dateStr}T00:00:00Z`;
                        let dateEnd = `${dateStr}T23:59:59Z`;

                        // We use sentinel-2-l2a collection for metadata because S1 doesn't have cloud cover/sun angles
                        const catalogPayload = {
                            collections: ["sentinel-2-l2a"],
                            datetime: `${dateStart}/${dateEnd}`,
                            intersects: geom,
                            limit: 1
                        };

                        const catResp = await fetch('https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStr}` },
                            body: JSON.stringify(catalogPayload)
                        });

                        if (catResp.ok) {
                            const catData = await catResp.json();
                            if (catData && catData.features && catData.features.length > 0) {
                                const props = catData.features[0].properties;
                                let cc = props['eo:cloud_cover'] !== undefined ? `${props['eo:cloud_cover'].toFixed(1)}%` : 'N/A';
                                let sunEl = props['view:sun_elevation'] !== undefined ? `${props['view:sun_elevation'].toFixed(1)}°` : 'N/A';
                                let sunAz = props['view:sun_azimuth'] !== undefined ? `${props['view:sun_azimuth'].toFixed(1)}°` : 'N/A';

                                ctxHtml += `<div style="margin-bottom: 5px;"><strong>Satellite Telemetry:</strong></div>
                                    <ul style="margin: 0 0 10px 0; padding-left: 20px;">
                                        <li>Cloud Cover: ${cc}</li>
                                        <li>Sun Elevation: ${sunEl}</li>
                                        <li>Sun Azimuth: ${sunAz}</li>
                                    </ul>`;
                            } else {
                                ctxHtml += `<p style="margin: 0 0 10px 0; font-style: italic;">No optical STAC metadata found for this exact date.</p>`;
                            }
                        }

                        // 2. Open-Meteo Historical API (Coordinates from Centroid)
                        // Simple centroid approximation from BBox for weather API
                        let centerLat = (bboxCoords[1] + bboxCoords[3]) / 2;
                        let centerLon = (bboxCoords[0] + bboxCoords[2]) / 2;

                        const meteoUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${centerLat}&longitude=${centerLon}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

                        const wxResp = await fetch(meteoUrl);
                        if (wxResp.ok) {
                            const wxData = await wxResp.json();
                            if (wxData && wxData.daily) {
                                let tempMax = wxData.daily.temperature_2m_max[0];
                                let tempMin = wxData.daily.temperature_2m_min[0];
                                let precip = wxData.daily.precipitation_sum[0];

                                ctxHtml += `<div style="margin-bottom: 5px;"><strong>Ground Weather (Open-Meteo):</strong></div>
                                    <ul style="margin: 0; padding-left: 20px;">
                                        <li>Max Temp: ${tempMax !== null ? tempMax + '°C' : 'N/A'}</li>
                                        <li>Min Temp: ${tempMin !== null ? tempMin + '°C' : 'N/A'}</li>
                                        <li>Precipitation: ${precip !== null ? precip + 'mm' : 'N/A'}</li>
                                    </ul>`;
                            }
                        } else {
                            ctxHtml += `<p style="margin: 0; font-style: italic;">Weather data unavailable.</p>`;
                        }

                    } catch (err) {
                        ctxHtml += `<p style="color: #ff6b6b; margin:0;">Error loading context: ${err.message}</p>`;
                    }

                    ctxHtml += `</div>`;
                    return ctxHtml;
                }

                if (activeKey !== 's1_sar') {
                    statsPayload.input.data[0].dataFilter.maxCloudCoverage = 100;
                }

                btn.innerText = "Querying CDSE Analytics Hub...";
                try {
                    const token = await getCDSEToken();

                    // Fetch metadata in parallel with statistics
                    if (state.mode === 'single') {
                        let targetDateStr = ALL_DATES[state.monthIndex].value;
                        reportMetadataHtml = await gatherContextData(targetDateStr, geojson.geometry, token);
                    } else {
                        let d1 = document.getElementById('date-t1').value;
                        let d2 = document.getElementById('date-t2').value;
                        if (d1 > d2) { const temp = d1; d1 = d2; d2 = temp; }

                        let html1 = await gatherContextData(d1, geojson.geometry, token);
                        let html2 = await gatherContextData(d2, geojson.geometry, token);
                        reportMetadataHtml = html1 + html2;
                    }

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
                            let bandsObj = interval.outputs?.default?.bands;
                            if (bandsObj && bandsObj.B0 && bandsObj.B0.stats.sampleCount > 0) {
                                let st0 = bandsObj.B0.stats;
                                if (st0.mean !== null && !isNaN(st0.mean)) {
                                    validData[dateStr] = {
                                        active: st0.mean,
                                        ndmi: bandsObj.B1?.stats?.mean ?? NaN,
                                        ndwi: bandsObj.B2?.stats?.mean ?? NaN,
                                        ndsi: bandsObj.B3?.stats?.mean ?? NaN
                                    };
                                }
                            }
                        });
                    }

                    let sortedDates = Object.keys(validData).sort((a, b) => new Date(a) - new Date(b));

                    if (sortedDates.length === 0) {
                        throw new Error(`Data Sparsity Error: CDSE Analytics Hub evaluated ${rawRecordsCount} time slices over the period, but 0 slices contained successfully computed index pixels for this AOI.`);
                    }

                    // 1. Interpolate '0' values (often false measurements/clouds for most indices)
                    let chartLabels = [];
                    let dataArr = [];
                    let ndmiArr = [];
                    let ndwiArr = [];
                    let ndsiArr = [];
                    let bsiArr = [];
                    let brineArr = [];

                    for (let i = 0; i < sortedDates.length; i++) {
                        let d = sortedDates[i];
                        let vals = validData[d];
                        let val = vals.active;

                        if (val === 0 || isNaN(val)) {
                            let leftVal = null, rightVal = null;
                            for (let j = i - 1; j >= 0; j--) {
                                if (validData[sortedDates[j]].active !== 0 && !isNaN(validData[sortedDates[j]].active)) { leftVal = validData[sortedDates[j]].active; break; }
                            }
                            for (let j = i + 1; j < sortedDates.length; j++) {
                                if (validData[sortedDates[j]].active !== 0 && !isNaN(validData[sortedDates[j]].active)) { rightVal = validData[sortedDates[j]].active; break; }
                            }
                            if (leftVal !== null && rightVal !== null) {
                                val = (leftVal + rightVal) / 2;
                            } else if (leftVal !== null) {
                                val = leftVal;
                            } else if (rightVal !== null) {
                                val = rightVal;
                            } else {
                                val = 0;
                            }
                        }

                        chartLabels.push(d.slice(0, 10)); // YYYY-MM-DD
                        dataArr.push(val);
                        ndmiArr.push(isNaN(vals.ndmi) ? null : vals.ndmi);
                        ndwiArr.push(isNaN(vals.ndwi) ? null : vals.ndwi);
                        ndsiArr.push(isNaN(vals.ndsi) ? null : vals.ndsi);
                    }

                    // 1.5 Secondary Smoothing (Detect anomalous sharp drops/outliers)
                    // If a point drops below 30% of the average of its immediate neighbors, 
                    // and those neighbors are reasonably elevated (e.g. > 0.05), we interpolate it.
                    let outliersSmoothed = 0;
                    for (let i = 1; i < dataArr.length - 1; i++) {
                        let prev = dataArr[i - 1];
                        let next = dataArr[i + 1];
                        let curr = dataArr[i];

                        let neighborAvg = (prev + next) / 2;

                        if (neighborAvg > 0.05) {
                            if (curr < (neighborAvg * 0.3)) {
                                dataArr[i] = neighborAvg; // Interpolate the outlier
                                outliersSmoothed++;
                            }
                        }
                    }

                    // 2. Metrics Calculation (Multi-Event Detection)
                    let leakEvents = [];
                    let isLeakActive = false;
                    let currentLeakStart = null;
                    let currentLeakMax = -Infinity;

                    let baseThreshold = 0.1; // Threshold for significant deviation

                    for (let i = 0; i < dataArr.length; i++) {
                        let val = dataArr[i];

                        if (!isLeakActive && val > baseThreshold) {
                            // Look back to find where it started rising
                            let startIdx = i;
                            while (startIdx > 0 && dataArr[startIdx - 1] < dataArr[startIdx] && dataArr[startIdx - 1] < baseThreshold) {
                                startIdx--;
                            }
                            isLeakActive = true;
                            currentLeakStart = chartLabels[startIdx];
                            currentLeakMax = val;
                        } else if (isLeakActive) {
                            if (val > currentLeakMax) {
                                currentLeakMax = val;
                            }

                            if (val < baseThreshold || i === dataArr.length - 1) {
                                // Leak ended
                                let endDate = (val < baseThreshold) ? chartLabels[i] : 'Ongoing';
                                leakEvents.push({
                                    start: currentLeakStart,
                                    end: endDate,
                                    max: currentLeakMax
                                });
                                isLeakActive = false;
                                currentLeakStart = null;
                                currentLeakMax = -Infinity;
                            }
                        }
                    }

                    // Update DOM Metrics Panel in LIVE app UI (not just export)
                    const metricPanel = document.getElementById('report-metrics-panel');
                    if (metricPanel) {
                        metricPanel.style.display = 'block';

                        let eventsContainer = document.getElementById('metric-leak-events');
                        if (eventsContainer) {
                            if (leakEvents.length === 0) {
                                eventsContainer.innerHTML = '<span style="color: var(--text-muted);">No significant anomalous events detected above baseline threshold.</span>';
                            } else {
                                let html = leakEvents.map((evt, idx) => `
                                    <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                        <strong style="color: var(--accent-orange);">Event ${idx + 1}:</strong> 
                                        <span style="font-family: var(--font-mono);">${evt.start}</span> to <span style="font-family: var(--font-mono);">${evt.end}</span><br>
                                        <span style="color: var(--text-muted); font-size: 11px;">Peak Severity: ${evt.max.toFixed(4)}</span>
                                    </div>
                                `).join('');

                                if (outliersSmoothed > 0) {
                                    html += `<div style="color: var(--text-dim); font-size: 10px; margin-top: 4px;">*Includes ${outliersSmoothed} interpolated outlier${outliersSmoothed > 1 ? 's' : ''}</div>`;
                                }
                                eventsContainer.innerHTML = html;
                            }
                        }
                    }

                    // Render Scanned Anomalies Screenshots
                    const anomaliesPanel = document.getElementById('report-scanned-anomalies-panel');
                    const anomaliesList = document.getElementById('scanned-anomalies-list');
                    if (state.anomalousDates && state.anomalousDates.length > 0) {
                        if (anomaliesPanel) anomaliesPanel.style.display = 'block';
                        if (anomaliesList) {
                            let anomalyHtml = '';
                            state.anomalousDates.forEach(dateStr => {
                                let tcScript = getScriptContent('tc', false, false);
                                let pwiScript = getScriptContent('pwi', false, false);

                                // To prevent blank/transparent images due to clouds or orbit gaps on specific days,
                                // we request a 10-day composite window around the anomaly date
                                let d = new Date(dateStr);
                                let start_d = new Date(d); start_d.setDate(d.getDate() - 5);
                                let end_d = new Date(d); end_d.setDate(d.getDate() + 5);
                                let timeWindow = `${start_d.toISOString().slice(0, 10)}/${end_d.toISOString().slice(0, 10)}`;

                                let tcUrl = `${SH_WMS_URL}?service=WMS&request=GetMap&version=1.3.0&layers=AGRICULTURE&format=image/jpeg&transparent=false&width=400&height=400&crs=CRS:84&bbox=${bboxStr}&time=${timeWindow}&maxcc=20&evalscript=${btoa(unescape(encodeURIComponent(tcScript)))}`;
                                let pwiUrl = `${SH_WMS_URL}?service=WMS&request=GetMap&version=1.3.0&layers=AGRICULTURE&format=image/png&transparent=true&width=400&height=400&crs=CRS:84&bbox=${bboxStr}&time=${timeWindow}&maxcc=20&evalscript=${btoa(unescape(encodeURIComponent(pwiScript)))}`;

                                anomalyHtml += `
                                <div style="position: relative; width: 100%; aspect-ratio: 1; border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                                    <img src="${tcUrl}" style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit: cover; background: #222;" alt="Base">
                                    <img src="${pwiUrl}" style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit: cover; opacity: 0.85;" alt="PWI">
                                    <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.8); border: 1px solid rgba(255,140,0,0.5); padding: 4px 8px; border-radius: 4px; color: var(--accent-orange); font-family: var(--font-mono); font-size: 11px; font-weight: bold;">
                                        ⚠️ ${dateStr}
                                    </div>
                                </div>
                                `;
                            });
                            anomaliesList.innerHTML = anomalyHtml;
                        }
                    } else {
                        if (anomaliesPanel) anomaliesPanel.style.display = 'none';
                        if (anomaliesList) anomaliesList.innerHTML = '';
                    }

                    // Mount Metadata HTML
                    const metaPanel = document.getElementById('report-metadata-panel');
                    if (metaPanel) {
                        metaPanel.style.display = 'block';
                        document.getElementById('metadata-content').innerHTML = reportMetadataHtml || '<p>Metadata gathering failed.</p>';
                    }

                    // Calculate Smoothed Trendline (3-point centered moving average)
                    let trendlineData = [];
                    for (let i = 0; i < dataArr.length; i++) {
                        let sum = 0;
                        let count = 0;
                        // Window of -1 to +1
                        for (let j = Math.max(0, i - 1); j <= Math.min(dataArr.length - 1, i + 1); j++) {
                            sum += dataArr[j];
                            count++;
                        }
                        trendlineData.push(sum / count);
                    }

                    const showTrend = document.getElementById('toggle-trendline') ? document.getElementById('toggle-trendline').checked : true;

                    let chartDatasets = [];

                    if (document.getElementById('toggle-trendline') && document.getElementById('toggle-trendline').checked) {
                        chartDatasets.push({
                            label: "Smoothed Trend",
                            data: trendlineData,
                            borderColor: '#FF8F00',
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHitRadius: 10,
                            spanGaps: true,
                            order: 1
                        });
                    }

                    chartDatasets.push({
                        label: cfg.name,
                        data: dataArr,
                        borderColor: CHART_COLORS[activeKey] || '#ffffff',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.1,
                        pointRadius: 3,
                        pointHitRadius: 10,
                        spanGaps: true,
                        order: 2
                    });

                    if (activeKey !== 's1_sar') {
                        if (activeKey !== 'ndmi') {
                            chartDatasets.push({
                                label: "Moisture Context (NDMI)",
                                data: ndmiArr,
                                borderColor: CHART_COLORS.ndmi,
                                backgroundColor: 'transparent',
                                borderWidth: 1.5,
                                borderDash: [5, 5],
                                fill: false,
                                tension: 0.3,
                                pointRadius: 1,
                                spanGaps: true,
                                order: 3,
                                hidden: true
                            });
                        }
                        if (activeKey !== 'ndwi') {
                            chartDatasets.push({
                                label: "Wetness Context (NDWI)",
                                data: ndwiArr,
                                borderColor: CHART_COLORS.ndwi,
                                backgroundColor: 'transparent',
                                borderWidth: 1.5,
                                borderDash: [5, 5],
                                fill: false,
                                tension: 0.3,
                                pointRadius: 1,
                                spanGaps: true,
                                order: 4,
                                hidden: true
                            });
                        }
                        if (activeKey !== 'ndsi') {
                            chartDatasets.push({
                                label: "Salinity Context (NDSI)",
                                data: ndsiArr,
                                borderColor: CHART_COLORS.ndsi,
                                backgroundColor: 'transparent',
                                borderWidth: 1.5,
                                borderDash: [5, 5],
                                fill: false,
                                tension: 0.3,
                                pointRadius: 1,
                                spanGaps: true,
                                order: 5,
                                hidden: true
                            });
                        }
                        if (activeKey !== 'bsi') {
                            chartDatasets.push({
                                label: "Bare Soil Context (BSI)",
                                data: bsiArr,
                                borderColor: CHART_COLORS.bsi,
                                backgroundColor: 'transparent',
                                borderWidth: 1.5,
                                borderDash: [2, 2],
                                fill: false,
                                tension: 0.3,
                                pointRadius: 1,
                                spanGaps: true,
                                order: 6,
                                hidden: true
                            });
                        }
                    }

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
                    L.geoJSON(geojson, {
                        style: { color: '#1C85A6', weight: 3, fillOpacity: 0.2 }
                    }).addTo(reportMapInst._drawnItems);

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

                    L.geoJSON(geojson, {
                        style: { color: '#1C85A6', weight: 3, fillOpacity: 0.2 }
                    }).addTo(reportMapInst);
                    L.geoJSON(geojson, {
                        style: { color: '#1C85A6', weight: 3, fillOpacity: 0.2 }
                    }).addTo(window.reportMapInstT2);

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
                    L.geoJSON(geojson, {
                        style: { color: '#FF8F00', weight: 3, fillOpacity: 0.15 }
                    }).addTo(reportDiffMapInst._drawnItems);

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

                // Calculate dynamic GIF dimensions based on AOI aspect ratio to prevent squashing
                let latRad = bounds.getCenter().lat * Math.PI / 180;
                let aspect = (bounds.getEast() - bounds.getWest()) * Math.cos(latRad) / (bounds.getNorth() - bounds.getSouth());

                let gifW = 400;
                let gifH = Math.round(400 / aspect);
                if (gifH > 400) {
                    gifH = 400;
                    gifW = Math.round(400 * aspect);
                }
                gifW = Math.max(100, Math.floor(gifW));
                gifH = Math.max(100, Math.floor(gifH));
                let canvasH = gifH + 30; // +30 for footer

                // Generate Standard Imagery URLs (Backgrounds) — always TC, MAXCC=60 for good coverage
                const bgUrls = frameIndices.map(i => {
                    const dateStr = ALL_DATES[i].value;
                    let dPrior = new Date(dateStr);
                    dPrior.setUTCDate(dPrior.getUTCDate() - 20);
                    let pStr = dPrior.toISOString().split('T')[0];
                    let rangeStr = `${pStr}/${dateStr}`;
                    return `${SH_WMS_URL}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${wmsLayerParam}&FORMAT=image/png&TRANSPARENT=false&VERSION=1.3.0&TIME=${rangeStr}&MAXCC=60&WIDTH=${gifW}&HEIGHT=${gifH}&CRS=CRS:84&BBOX=${bboxStr}&EVALSCRIPT=${encodeURIComponent(b64TcBg)}`;
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
                    return `${SH_WMS_URL}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${wmsLayerParam}&FORMAT=image/png&TRANSPARENT=true&VERSION=1.3.0&TIME=${rangeStr}&MAXCC=60&WIDTH=${gifW}&HEIGHT=${gifH}&CRS=CRS:84&BBOX=${bboxStr}&EVALSCRIPT=${encodeURIComponent(diffB64Math)}`;
                });

                gifLoader.innerText = `Fetching ${bgUrls.length * 2} satellite frames...`;

                // Canvas composite renderer helper
                const renderCanvas = (bgBlob, diffBlob, dateText, overlayAlpha = 1.0) => {
                    return new Promise((resolve) => {
                        const canvas = document.createElement('canvas');
                        canvas.width = gifW;
                        canvas.height = canvasH;
                        const ctx = canvas.getContext('2d');

                        const drawFooter = () => {
                            ctx.globalAlpha = 1.0;
                            ctx.fillStyle = '#111111';
                            ctx.fillRect(0, gifH, gifW, 30);
                            ctx.fillStyle = '#ffffff';
                            ctx.font = '600 13px sans-serif';
                            ctx.textBaseline = 'middle';
                            ctx.textAlign = 'center';
                            ctx.fillText(dateText, gifW / 2, gifH + 15);
                            resolve(canvas.toDataURL('image/jpeg', 0.95));
                        };

                        const drawDiffOverlay = () => {
                            if (!diffBlob) { drawFooter(); return; }
                            const diffUrl = URL.createObjectURL(diffBlob);
                            const dfImg = new Image();
                            dfImg.crossOrigin = 'Anonymous';
                            dfImg.onload = () => {
                                ctx.globalAlpha = overlayAlpha;
                                ctx.drawImage(dfImg, 0, 0, gifW, gifH);
                                ctx.globalAlpha = 1.0;
                                drawFooter();
                            };
                            dfImg.onerror = drawFooter;
                            dfImg.src = diffUrl;
                        };

                        if (!bgBlob) {
                            // Placeholder for frames where WMS returned no data
                            ctx.fillStyle = '#1a1c28';
                            ctx.fillRect(0, 0, gifW, gifH);
                            ctx.fillStyle = 'rgba(255,255,255,0.25)';
                            ctx.font = '13px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('No imagery available', gifW / 2, gifH / 2);
                            drawDiffOverlay();
                            return;
                        }

                        const bgUrl = URL.createObjectURL(bgBlob);
                        const bgImg = new Image();
                        bgImg.crossOrigin = 'Anonymous';
                        bgImg.onload = () => { ctx.drawImage(bgImg, 0, 0, gifW, gifH); drawDiffOverlay(); };
                        bgImg.onerror = () => {
                            // Image bytes couldn't be decoded (probably WMS XML error) — show placeholder
                            ctx.fillStyle = '#1a1c28';
                            ctx.fillRect(0, 0, gifW, gifH);
                            ctx.fillStyle = 'rgba(255,255,255,0.25)';
                            ctx.font = '13px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('No imagery available', gifW / 2, gifH / 2);
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
                    createGifPlayer(canvases, gifImgDiff, gifBtnDiff, gifW, canvasH);
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
                    return `${SH_WMS_URL}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${wmsLayerParam}&FORMAT=image/png&TRANSPARENT=true&VERSION=1.3.0&TIME=${rangeStr}&MAXCC=60&WIDTH=${gifW}&HEIGHT=${gifH}&CRS=CRS:84&BBOX=${bboxStr}&EVALSCRIPT=${encodeURIComponent(b64IndexScript)}`;
                });

                const buildIndexGif = async (bgBlobs) => {
                    const indexBlobs = await Promise.all(indexUrls.map(u =>
                        fetch(u).then(r => r.ok ? r.blob() : null).catch(() => null)
                    ));
                    // 0.65 opacity overlay to see aerial below
                    const canvases = await Promise.all(bgBlobs.map((b, i) => renderCanvas(b, indexBlobs[i], ALL_DATES[frameIndices[i]].displayStr, 0.65)));
                    gifContIndex.style.display = 'block';
                    createGifPlayer(canvases, gifImgIndex, gifBtnIndex, gifW, canvasH);
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

        const getWmsUrl = (timeRangeStr, evalB64, transparent) => {
            return `${SH_WMS_URL}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${wmsLayerParam}&FORMAT=image/png&TRANSPARENT=${transparent}&VERSION=1.3.0&TIME=${timeRangeStr}&MAXCC=60&WIDTH=600&HEIGHT=400&CRS=CRS:84&BBOX=${bboxStr}&EVALSCRIPT=${encodeURIComponent(evalB64)}`;
        };

        let mapHtml = "";

        // Grab metrics data
        let mMaxD = document.getElementById('metric-max-date') ? document.getElementById('metric-max-date').innerText : '--';
        let mMaxV = document.getElementById('metric-max-val') ? document.getElementById('metric-max-val').innerText : '--';
        let mAvgD = document.getElementById('metric-avg-dates') ? document.getElementById('metric-avg-dates').innerText : '--';
        let mAvgV = document.getElementById('metric-avg-val') ? document.getElementById('metric-avg-val').innerText : '--';
        let mLeak = document.getElementById('metric-leak-start') ? document.getElementById('metric-leak-start').innerText : '--';

        let metricsHtml = `
            <div style="margin-top: 20px; padding: 15px; background: #1a1a1a; border-radius: 6px; border: 1px solid #333;">
                <h4 style="margin: 0 0 10px 0; color: #33AAFF; font-size: 14px; text-transform: uppercase;">Key Metrics</h4>
                <table style="width: 100%; font-size: 13px; color: #ddd; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 5px 0;"><strong>Max Single Date:</strong></td>
                        <td style="padding: 5px 0;">${mMaxD} (<span style="color: #F0501E; font-family: monospace;">${mMaxV}</span>)</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Highest 5-Scene Avg:</strong></td>
                        <td style="padding: 5px 0;">${mAvgD} (<span style="color: #F0501E; font-family: monospace;">${mAvgV}</span>)</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; vertical-align: top;"><strong>Likely Leak Start:</strong></td>
                        <td style="padding: 5px 0; color: #33AAFF; font-family: monospace;">${mLeak}</td>
                    </tr>
                </table>
            </div>
        `;

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

            // The diff logic uses the true time-range syntax for the evalscript
            const diffB64Math = safeB64(getScriptContent(state.activeIndex, true));
            const diffIdxB64 = await fetchAsBase64(getWmsUrl(`${rd1}/${rd2}`, diffB64Math, true));

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
                    borderWidth: ds.borderWidth,
                    fill: ds.fill,
                    tension: ds.tension,
                    pointRadius: ds.pointRadius,
                    pointHitRadius: ds.pointHitRadius,
                    spanGaps: ds.spanGaps,
                    hidden: ds.hidden,
                    order: ds.order
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


// ── RRC Spill Overlay ─────────────────────────────────────────────────────────
// Loads ./data/rrc_spills.json (once, cached in state.rrcSpillData) and renders
// orange/red Leaflet circleMarkers. Each marker has a popup with date, volume,
// operator, county, and RRC district. A sidebar badge shows the total count.

async function initRrcSpillOverlay() {
    // Remove any existing layer first
    if (state.rrcSpillLayer) {
        state.map.removeLayer(state.rrcSpillLayer);
        state.rrcSpillLayer = null;
    }

    // Fetch and cache data
    if (!state.rrcSpillData) {
        try {
            const resp = await fetch('./data/rrc_spills.json');
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            state.rrcSpillData = await resp.json();
        } catch (err) {
            console.error('[RRC Overlay] Failed to load spill data:', err);
            return;
        }
    }

    const features = state.rrcSpillData.features || [];

    // Radius by volume (BBL)
    const getRadius = (vol) => {
        if (vol >= 2000) return 13;
        if (vol >= 1000) return 10;
        if (vol >= 500) return 7;
        return 5;
    };

    // Color ramp: orange → deep red
    const getColor = (vol) => {
        if (vol >= 2000) return '#FF1744';  // Major — bright red
        if (vol >= 1000) return '#FF5722';  // Significant — deep orange-red
        if (vol >= 500) return '#FF6B35';  // Moderate — orange
        return '#FF9060';                    // Minor — pale orange
    };

    const spillMarkers = [];

    features.forEach(f => {
        const p = f.properties;
        const coords = f.geometry.coordinates; // GeoJSON: [lng, lat]
        const lat = coords[1], lng = coords[0];

        const vol = p.volume_bbl || 0;
        const radius = getRadius(vol);
        const color = getColor(vol);

        const marker = L.circleMarker([lat, lng], {
            radius: radius,
            fillColor: color,
            color: '#1a0a00',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.88
        });

        const volStr = vol.toLocaleString();
        const severityEmoji =
            vol >= 2000 ? '🔴 Major' :
                vol >= 1000 ? '🟠 Significant' :
                    vol >= 500 ? '🟡 Moderate' : '⚪ Minor';

        marker.bindPopup(`
            <div style="font-family:'Space Grotesk',sans-serif;min-width:230px;color:#f0f0f0;">
                <div style="font-size:11px;font-weight:700;color:#FF6B35;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">⚠ RRC Spill Incident</div>
                <div style="font-weight:600;font-size:13px;margin-bottom:8px;color:#fff;">${p.incident_type}</div>
                <table style="font-size:11px;border-collapse:collapse;width:100%;">
                    <tr><td style="color:#999;padding:2px 8px 2px 0;white-space:nowrap;">Operator</td><td style="color:#fff;">${p.operator}</td></tr>
                    <tr><td style="color:#999;padding:2px 8px 2px 0;">County</td><td style="color:#fff;">${p.county} — RRC District ${p.district}</td></tr>
                    <tr><td style="color:#999;padding:2px 8px 2px 0;">Date</td><td style="color:#fff;">${p.date}</td></tr>
                    <tr><td style="color:#999;padding:2px 8px 2px 0;">Volume</td><td style="color:${color};font-weight:700;">${volStr} BBL &nbsp;${severityEmoji}</td></tr>
                </table>
                <div style="margin-top:9px;padding:8px;background:rgba(255,107,53,.1);border-radius:4px;border:1px solid rgba(255,107,53,.25);font-size:11px;color:#ccc;line-height:1.5;">${p.description}</div>
                <div style="margin-top:7px;font-size:10px;color:#555;">Source: TX RRC Inspections &amp; Violations — rrc.texas.gov</div>
            </div>
        `, { maxWidth: 310, className: 'rrc-spill-popup' });

        spillMarkers.push(marker);
    });

    state.rrcSpillLayer = L.layerGroup(spillMarkers).addTo(state.map);

    // Update sidebar count badge
    const badge = document.getElementById('rrc-spill-count');
    if (badge) {
        badge.textContent = `${features.length} incidents loaded`;
        badge.style.display = 'block';
    }

    console.log(`[RRC Overlay] Rendered ${spillMarkers.length} spill incidents.`);
}


/**
 * SENSOR PROBE: Queries the CDSE Catalog for historical acquisitions at current center.
 * Identifies which days have Sentinel-2, Landsat-8, or both to color-code the dropdown.
 */
async function probeAcquisitions() {
    if (!state.map) return;
    try {
        const center = state.map.getCenter();
        const token = await getCDSEToken();
        const bbox = [center.lng - 0.05, center.lat - 0.05, center.lng + 0.05, center.lat + 0.05];

        // Search back the last 12 months for density
        const latest = new Date();
        const past = new Date();
        past.setMonth(past.getMonth() - 12);

        const collections = ["sentinel-2-l2a", "landsat-8-l1l2"];
        const sensorMap = {}; // dateStr -> Set of sensors

        for (const colId of collections) {
            const payload = {
                collections: [colId],
                datetime: `${past.toISOString().split('.')[0]}Z/${latest.toISOString().split('.')[0]}Z`,
                bbox: bbox,
                limit: 100
            };

            try {
                const resp = await fetch('https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });

                if (!resp.ok) {
                    const errBody = await resp.text();
                    console.warn(`[Probe] Catalog Failed for ${colId} (${resp.status}):`, errBody);
                    continue;
                }

                const data = await resp.json();
                if (data && data.features) {
                    data.features.forEach(f => {
                        const dateStr = f.properties.datetime.split('T')[0];
                        if (!sensorMap[dateStr]) sensorMap[dateStr] = new Set();
                        if (colId.includes('sentinel-2')) sensorMap[dateStr].add('S2');
                        if (colId.includes('landsat')) sensorMap[dateStr].add('L8');
                    });
                }
            } catch (innerError) {
                console.warn(`[Probe] Error fetching ${colId}:`, innerError);
            }
        }

        // Update the Dropdown Options
        document.querySelectorAll('#date-single option, #date-t1 option, #date-t2 option').forEach(opt => {
            let val = opt.value;
            const idxKey = opt.parentElement.id === 'date-single' ? parseInt(opt.value) : ALL_DATES.findIndex(d => d.value === opt.value);
            const originalLabel = ALL_DATES[idxKey] ? (opt.parentElement.id === 'date-single' ? ALL_DATES[idxKey].displayStr : ALL_DATES[idxKey].label) : opt.value;

            const sensors = sensorMap[val];
            // Restore original label and clear class
            opt.textContent = originalLabel;
            opt.className = '';

            // Re-apply anomaly marker if needed (prevents probe from stripping it)
            if (state.anomalousDates && state.anomalousDates.includes(val)) {
                opt.textContent = '⚠️ ' + opt.textContent;
                opt.style.color = '#FF8F00';
                opt.style.fontWeight = 'bold';
            }

            if (sensors) {
                if (sensors.has('S2') && sensors.has('L8')) {
                    opt.className = 'opt-fusion';
                    opt.textContent += ' [F]';
                } else if (sensors.has('S2')) {
                    opt.className = 'opt-s2';
                    opt.textContent += ' [S]';
                } else if (sensors.has('L8')) {
                    opt.className = 'opt-l8';
                    opt.textContent += ' [L]';
                }
            } else {
                opt.className = '';
            }
        });

    } catch (e) {
        console.warn("Probe failed:", e);
    }
}
