/* ==========================================================================
   Limn – Index Definitions & Evalscript Utilities
   Extracted from app.js for modularity
   ========================================================================== */

export const CALIBRATION_PRESETS = {
    permian: {
        name: "Permian Basin (Arid)",
        bsiMask: -0.3,
        bsiOffset: 0.3,
        ndwiOffset: 0.5,
        pwiSalinityOffset: 0.10,
        pwiHydrocarbonOffset: 0.30,
        pwiHmriOffset: 2.0
    },
    standard: {
        name: "Standard (Temperate/Wet)",
        bsiMask: -0.1,
        bsiOffset: 0.0,
        ndwiOffset: 0.0,
        pwiSalinityOffset: 0.05,
        pwiHydrocarbonOffset: 0.15,
        pwiHmriOffset: 1.5
    }
};

// Evalscript wrapper utility
export const genEvalscript = (bands, logic) => `//VERSION=3
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
export const genDiffEvalscript = (bands, calcLogic) => `//VERSION=3
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
export const genDeepFusionEvalscript = (bands, logic) => `//VERSION=3
function setup() {
  return {
    input: [
      { datasource: "sentinel-2-l2a", id: "s2", bands: ["B02", "B03", "B04", "B05", "B07", "B08", "B8A", "B11", "B12", "dataMask"] },
      { datasource: "sentinel-1-grd", id: "s1", bands: ["VV", "VH"] }
    ],
    output: { bands: 4 },
    mosaicking: "ORBIT"
  };
}

function evaluatePixel(samples, scenes) {
    // 1. Find most recent valid S2 sample
    let s2 = null;
    const s2Samples = samples.s2 || [];
    for (let i = 0; i < s2Samples.length; i++) {
        const s = s2Samples[i];
        if (s.dataMask === 1 && (s.B02 > 0 || s.B11 > 0)) {
            s2 = s;
            break;
        }
    }
    if (!s2) return [0,0,0,0];

    // 2. Find most recent valid S1 sample
    let s1 = null;
    const s1Samples = samples.s1 || [];
    for (let i = 0; i < s1Samples.length; i++) {
        const s = s1Samples[i];
        if (s.VH !== 0 && s.VV !== 0) {
            s1 = s;
            break;
        }
    }
    
    // 3. Construct flattened sample with safe fallbacks
    // If S1 is missing (e.g. no recent overpass), we use a placeholder that won't trigger the alert
    const effectiveS1 = s1 || { VV: 0.5, VH: 0.05, dataMask: 1 };
    
    // Manual merge for maximum compatibility
    const sampleFlat = {};
    for (let key in effectiveS1) sampleFlat[key] = effectiveS1[key];
    for (let key in s2) sampleFlat[key] = s2[key];

    ${logic.replace(/sample/g, 'sampleFlat')}
}
`;

// Multi-Temporal Evalscript for Cumulative MAX detection
export const genCumulativeEvalscript = (bands, logic, paletteStr) => `//VERSION=3
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
export function colorBlend(valExpr, stopsStr) {
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
// Palette Definitions
export const PALETTE_NDMI = "[[0, 212, 106, 36], [0.35, 239, 216, 122], [0.6, 28, 133, 166], [1, 10, 60, 100]]";
export const PALETTE_NDWI = "[[0, 130, 70, 20], [0.35, 215, 170, 60], [0.6, 80, 150, 200], [1, 20, 80, 180]]";
export const PALETTE_SI = "[[0, 36, 51, 64], [0.15, 180, 130, 40], [0.3, 220, 140, 50], [1, 240, 80, 30]]";
export const PALETTE_VEG = "[[0, 160, 120, 50], [0.3, 210, 180, 60], [0.6, 90, 160, 60], [1, 20, 100, 40]]"; // Brown -> Yellow -> Dark Green
export const PALETTE_MSI = "[[0, 28, 133, 166], [0.5, 239, 216, 122], [1, 212, 106, 36]]"; // Blue -> Yellow -> Orange (Inverse of NDMI)
export const PALETTE_BRINE = "[[0, 10, 60, 100], [0.35, 120, 100, 50], [0.6, 240, 80, 30], [1, 230, 20, 20]]"; // Blue -> Brown -> Orange -> Red
export const PALETTE_CSI = "[[0, 160, 120, 50], [0.5, 100, 220, 80], [1, 0, 255, 255]]"; // Brown -> Lime -> Cyan
export const PALETTE_HCAI = "[[0, 245, 222, 179], [0.5, 139, 69, 19], [1, 0, 0, 0]]"; // Wheat -> SaddleBrown -> Black
export const PALETTE_HMRI = "[[0, 230, 230, 250], [0.5, 128, 0, 128], [1, 255, 0, 255]]"; // Lavender -> Purple -> Magenta
export const PALETTE_PWI = "[[0, 0, 0, 0.0], [0.1, 0, 255, 255, 1.0], [0.5, 255, 0, 255, 1.0], [1, 255, 255, 0, 1.0]]"; // Restrictive: Trans -> Cyan -> Magenta -> Yellow
export const PALETTE_BSI = "[[0, 0, 0, 0], [0.1, 68, 136, 51], [0.15, 210, 180, 60], [1, 160, 120, 50]]"; // Black -> Green -> Yellow -> Brown
export const PALETTE_REAI = "[[0, 13, 26, 46], [0.35, 46, 92, 138], [0.65, 196, 122, 30], [1, 232, 196, 74]]"; // Navy -> Blue -> Bronze -> Yellow
export const PALETTE_VCBI = "[[0, 10, 32, 16], [0.3, 26, 96, 48], [0.6, 200, 160, 0], [1, 224, 80, 16]]"; // Dark Green -> Forest -> Gold -> Orange
export const PALETTE_FBC = "[[0, 26, 8, 0], [0.3, 139, 37, 0], [0.6, 212, 88, 26], [1, 255, 179, 71]]"; // Black -> Deep Red -> Burnt Orange -> Peach
export const PALETTE_HPWI = "[[0, 44, 62, 80], [0.5, 241, 196, 15], [1, 231, 76, 60]]"; // Dark Blue -> Gold -> Red
export const PALETTE_LBI = "[[0, 0, 0, 0], [0.3, 0, 210, 255], [0.7, 0, 136, 255], [1, 255, 0, 255]]";
export const PALETTE_TRI = "[[0, 26, 10, 0], [0.3, 128, 64, 0], [0.7, 153, 51, 255], [1, 255, 0, 255]]";
export const PALETTE_BPI = "[[0, 34, 34, 34], [0.3, 68, 68, 68], [0.7, 0, 255, 255], [1, 255, 255, 0]]";
export const PALETTE_VSI = "[[0, 0, 85, 0], [0.3, 255, 255, 0], [0.7, 255, 136, 0], [1, 255, 0, 0]]";
export const PALETTE_CMA = "[[0, 68, 34, 0], [0.3, 136, 68, 0], [0.7, 170, 136, 170], [1, 255, 255, 255]]";
export const PALETTE_APEX = "[[0, 0, 0, 0, 0.0], [0.45, 0, 0, 0, 0.0], [0.55, 0, 220, 255, 1.0], [0.75, 255, 0, 255, 1.0], [1, 140, 0, 255, 1.0]]"; // Trans until 0.45 → Cyan → Magenta → Purple
export const PALETTE_PHI = "[[0, 0, 0, 0], [0.3, 51, 51, 51], [0.7, 102, 51, 0], [1, 255, 204, 0]]";
export const PALETTE_HMI = "[[0, 0, 17, 0], [0.3, 0, 68, 0], [0.7, 0, 255, 187], [1, 255, 255, 255]]";
export const PALETTE_SCRI = "[[0, 0, 0, 0], [0.2, 75, 0, 130], [0.6, 231, 76, 60], [1, 241, 196, 15]]";
export const PALETTE_MSI_INV = "[[0, 212, 106, 36], [0.5, 239, 216, 122], [1, 28, 133, 166]]";
export const PALETTE_METHANE = "[[0.0, 13, 23, 27], [0.3, 245, 120, 20], [0.75, 255, 180, 0], [1.0, 255, 255, 200]]";

export const INDICES = {
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
    pwoi: {
        name: "ASAI — Arid Salinity Anomaly Index (formerly PWOI / APEX)",
        sensor: "Sentinel-2 L2A",
        min: 0,
        max: 1,
        gradient: 'linear-gradient(to right, #000000, #00DCFF, #FF00FF, #8C00FF)',
        formula: "Specular Smoothness Proxy × Salinity/Crust Signature",
        info: "Globe & Atlas · Limn composite calibration. Uses optical surface smoothness (B03/B11 ratio) as a proxy for specular surface reflectance, cross-referenced with salinity indicators, plus a dry-brine mode that fires when NDWI is deeply negative but NDSI is elevated — mapping dry evaporated salt crusts in arid environments without requiring active radar data. Formerly known as Produced Water Optical Index (PWOI) or APEX Anomaly Index.",
        diffLabels: ["Stable (No Detection)", "Salinity Anomaly Detected"],
        // WMS-compatible S2-only evalscript (optical proxy for radar smoothness)
        evalscript: genEvalscript(['B02', 'B03', 'B04', 'B08', 'B11', 'B12'], `
  // WET PATH — optical proxy for SAR surface smoothness
  // smooth/wet surfaces → high oVal, mirrors low SAR VH backscatter
  let sum = sample.B03 + sample.B11;
  let oVal = sum === 0 ? 0 : (sample.B03 - sample.B11) / sum;
  let radarProxy = Math.max(0, Math.min(1.2, (oVal + 0.3) / 0.6));
  let ndsiDen = sample.B11 + sample.B12;
  let ndsiVal = ndsiDen === 0 ? 0 : (sample.B11 - sample.B12) / ndsiDen;
  let brineBoost = Math.max(0, ndsiVal) * 0.4;
  let moisture = oVal + 0.3 + brineBoost;
  let wetScore = (radarProxy > 0.50 && moisture > 0.30)
      ? (radarProxy * 0.4) + (moisture * 0.6) + 0.25
      : (radarProxy * 0.3) + (moisture * 0.7);

  // DRY BRINE PATH — evaporated salt crusts: dry bare soil + elevated NDSI
  let bsiDen = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
  let bsiDry = bsiDen === 0 ? 0 : ((sample.B11 + sample.B04) - (sample.B08 + sample.B02)) / bsiDen;
  let dryScore = 0;
  if (oVal < -0.30 && ndsiVal > 0.05 && bsiDry > 0.10) {
      dryScore = Math.max(0, Math.min(1, (ndsiVal - 0.05) / 0.20 * 0.45 + 0.55));
  }

  let finalVal = Math.min(Math.max(Math.max(wetScore, 0), dryScore), 1);
  ${colorBlend('finalVal', PALETTE_APEX)}
`),
        // Note: No deepEvalscript for PWOI — WMS cannot handle multi-datasource S1+S2 format.
        // Deep Fusion toggle has no effect on PWOI; optical proxy evalscript is always used.
        fisBands: ['B02', 'B03', 'B04', 'B08', 'B11', 'B12'],
        fisLogic: `
  let sum = sample.B03 + sample.B11;
  let oVal = sum === 0 ? 0 : (sample.B03 - sample.B11) / sum;
  let radarProxy = Math.max(0, Math.min(1.2, (oVal + 0.3) / 0.6));
  let ndsiDen = sample.B11 + sample.B12;
  let ndsiVal = ndsiDen === 0 ? 0 : (sample.B11 - sample.B12) / ndsiDen;
  let brineBoost = Math.max(0, ndsiVal) * 0.4;
  let moisture = oVal + 0.3 + brineBoost;
  let wetScore = (radarProxy > 0.50 && moisture > 0.30)
      ? (radarProxy * 0.4 + moisture * 0.6 + 0.25)
      : (radarProxy * 0.3 + moisture * 0.7);
  let bsiDen = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
  let bsiDry = bsiDen === 0 ? 0 : ((sample.B11 + sample.B04) - (sample.B08 + sample.B02)) / bsiDen;
  let dryScore = (oVal < -0.30 && ndsiVal > 0.05 && bsiDry > 0.10)
      ? Math.max(0, Math.min(1, (ndsiVal - 0.05) / 0.20 * 0.45 + 0.55))
      : 0;
  return [Math.min(Math.max(Math.max(wetScore, 0), dryScore), 1)];
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
        info: 'Globe & Atlas · Limn composite calibration. Detects the chemical signature of deep-earth formation water oxidizing on the surface. Combines an iron oxide ratio (B04/B02) with a hydrocarbon absorption ratio (B11/B12) to identify the dark rust surface alteration characteristic of produced water spills.',
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
        name: 'EHC — Evaporite Halo Composite (formerly Evaporite Halo / Visual)',
        sensor: 'Sentinel-2 L2A',
        temporal: '0-3M',
        min: 'False Color RGB', max: '',
        gradient: 'linear-gradient(to right, #ff0000, #00ff00, #0000ff)',
        formula: 'R=NDOI, G=BSI, B=NDSI',
        info: 'Globe & Atlas · Limn false-color composite calibration. Maps NDOI → Red (oil center), BSI → Green (mud footprint), NDSI → Blue (crystallized salt ring) to visually isolate the spatial morphology of blowout events (blowout morphology view). Useful for distinguishing localized anomalies from expanding plumes. Formerly known as Evaporite Halo / Visual composite.',
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
        name: 'OBEC — Oil-Brine Emulsion Composite (formerly HPWI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '0-3M',
        min: 'Background', max: 'Liquid Emulsion',
        gradient: 'linear-gradient(to right, #000000, #00FFFF, #FF00FF, #CCFF00)',
        formula: 'Chemical Signal (NDOI + NDSI) × Specular Smoothness Proxy',
        info: 'Globe & Atlas · Limn composite calibration. Fuses hydrocarbon/brine chemical signatures (NDOI + NDSI) with an optical surface smoothness proxy (B03/B11 ratio) that approximates specular surface reflectance. Designed as a physical-chemical consensus validator for PWCI/ASAI. All bands Sentinel-2 only. Formerly known as Hybrid Produced Water Index (HPWI).',
        diffLabels: ['Stable (No Detection)', 'Emulsion Anomaly Detected'],
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
        info: 'Globe & Atlas · Limn composite calibration. Targets the iron oxidation signature associated with produced water spills: deep Permian brine is rich in ferrous iron (Fe²⁺); when surfaced it oxidizes to ferric iron (Fe³⁺), creating rust-brown staining detectable via the Red/Blue ratio. Both the iron gate (B04/B02 > 1.4) and the brine gate (NDSI > 0.02) must fire simultaneously. The vegetation gate (1−NDVI) restricts detection to bare-ground pixels.',
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
        info: 'Globe & Atlas · Limn composite calibration. Uses Sentinel-2\'s dedicated Red Edge bands (B05=705nm, B06=740nm). Over bare disturbed soil, a B06/B05 ratio exceeding ~1.10 indicates ferric mineral enrichment (goethite, hematite) from produced water iron precipitation — multiplied by NDSI to confirm co-located brine chemistry. Particularly sensitive to subtle early-stage iron staining invisible to standard visible/SWIR indices.',
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
        info: 'Globe & Atlas · Limn composite calibration. Targets the off-pad migration front where produced water is actively killing surrounding brush. CRSI measures osmotic shock on vegetation; as chloride concentrations rise, CRSI collapses and goes negative. Multiplied by NDSI (brine chemistry), the index catches pixels where vegetation is simultaneously dying AND salt chemistry is measurable — the leading edge of a spill that may not yet show a strong chemical signature at its origin.',
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
        name: 'PWCI — Produced Water Chemical Index (formerly PWI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '0-3M',
        min: 'Background', max: 'Chemical Anomaly',
        gradient: 'linear-gradient(to right, #000000, #00FFFF, #FF00FF, #CCFF00)',
        formula: '(NDSI - 0.05) * (HCAI - 0.20) * (HMRI - 1.5) [Balanced Recovery]',
        info: 'Globe & Atlas · Limn composite calibration. Requires simultaneous elevation of Salinity (NDSI), Hydrocarbons (HCAI), and Heavy Metals (HMRI) — a three-way AND gate that suppresses caliche background noise and construction anomalies. Cubic scaling suppresses marginal noise while isolating high-confidence chemical anomalies. Formerly known as Produced Water Index (PWI).',
        diffLabels: ['Stable (No Detection)', 'Chemical Anomaly Detected'],
        evalscript: genEvalscript(['B02', 'B03', 'B04', 'B08', 'B11', 'B12'], `
  // 1. Bare Soil Index (BSI) -- URBAN / WATER / VEG MASK
  let bsiTop = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
  let bsiBot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
  if (bsiBot === 0) return [0,0,0,0];
  let bsi = bsiTop / bsiBot;
  
  if (bsi <= __BSI_MASK__) return [0,0,0,0];

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
  let brineScore = Math.max(0, brine - __PWI_SALINITY_OFFSET__);
  let hcaiScore = Math.max(0, (hcai - __PWI_HC_OFFSET__) * 2);
  let hmriScore = Math.max(0, (hmri - __PWI_HMRI_OFFSET__) * 2);
  
  let pwi = brineScore * hcaiScore * hmriScore;
  
  // Cubic scaling: aggressively suppresses background noise
  let mapped = Math.min(1.0, Math.pow(pwi * 20.0, 3.0));
  ${colorBlend('mapped', PALETTE_PWI)}
`),
        fisBands: ['B02', 'B03', 'B04', 'B08', 'B11', 'B12'],
        fisLogic: `
  let bsiTop = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
  let bsiBot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
  if (bsiBot === 0 || (bsiTop / bsiBot) <= __BSI_MASK__) return [0];

  let sumNdsi = sample.B11 + sample.B12;
  if(sumNdsi === 0) return [0];
  let ndsi = (sample.B11 - sample.B12) / sumNdsi;
  
  let sumHcai = sample.B11 + sample.B04;
  if(sumHcai === 0) return [0];
  let hcai = (sample.B11 - sample.B04) / sumHcai;
  
  if(sample.B03 === 0) return [0];
  let hmri = sample.B12 / sample.B03;
  
  let pwi = Math.max(0, ndsi - __PWI_SALINITY_OFFSET__) * Math.max(0, (hcai - __PWI_HC_OFFSET__) * 2) * Math.max(0, (hmri - __PWI_HMRI_OFFSET__) * 2);
  return [Math.min(1.0, Math.pow(pwi * 20.0, 3.0))];
`
    },
    lbi: {
        name: 'Liquid Brine Index (LBI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '0-3M',
        min: 'Background', max: 'Standing Brine Pool',
        gradient: 'linear-gradient(to right, #000000, #0055ff, #00d2ff, #ffffff)',
        formula: 'NDSI * NDWI * (1 - NDVI)',
        info: 'Globe & Atlas · Limn composite calibration. Captures standing pools of hazardous produced water. Requires a brine chemical signature (NDSI), a standing water proxy (NDWI adjusted for the very negative desert baseline), and the absence of vegetation (1−NDVI). Filters out legacy dry residues — focuses on active liquid releases.',
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
  
  if (bsi <= __BSI_MASK__) return [0,0,0,0]; // Loosened road mask for spill centers
  
  // Liquid gate shifted by +0.5 to catch "Wet Soil" signature in rangelands, plus BSI mask
  let score = Math.max(0, ndsi) * Math.max(0, ndwi + __NDWI_OFFSET__) * Math.max(0, 1.0 - ndvi) * Math.max(0, bsi + __BSI_OFFSET__);
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
  return [Math.max(0, ndsi) * Math.max(0, ndwi + __NDWI_OFFSET__) * Math.max(0, 1.0 - ndvi) * Math.max(0, bsi + __BSI_OFFSET__)];
`
    },
    tri: {
        name: 'Toxic Residue Index (TRI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '6M+',
        min: 'Background', max: 'Toxic Mineral Scab',
        gradient: 'linear-gradient(to right, #1a0a00, #804000, #9933ff, #ff00ff)',
        formula: 'NDSI * HMRI * AOI',
        info: 'Globe & Atlas · Limn composite calibration. Forensic tool for identifying historical spill footprints where liquid is no longer present. Detects the mineral "scab" left by produced water after evaporation — combining salt chemistry (NDSI), heavy metal precipitation (HMRI), and anoxic iron oxidation (AOI) in a three-way product gate.',
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
        name: 'Brine-Pavement Index (BPI)',
        sensor: 'Sentinel-2 L2A',
        temporal: 'Live',
        min: 'Clean Surface', max: 'Contaminated Pavement',
        gradient: 'linear-gradient(to right, #222222, #444444, #00FFFF, #FFFF00)',
        formula: 'NDSI * HCAI * BSI',
        info: 'Globe & Atlas · Limn composite calibration. Optimized for detecting leaks on caliche pads and lease roads — the primary tool for pad-level integrity monitoring. Requires brine (NDSI) and hydrocarbon (HCAI) signals co-located on a bare/compacted surface (BSI gate). Distinguishes pad pinhole leaks from off-pad vegetation kill zones.',
        diffLabels: ['Surface Recovery', 'Active Pad Pinhole'],
        evalscript: genEvalscript(['B02', 'B04', 'B08', 'B11', 'B12'], `
  let bsiTop = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
  let bsiBot = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
  let bsi = bsiBot === 0 ? 0 : bsiTop / bsiBot;
  if (bsi <= __BSI_MASK__) return [0,0,0,0]; // Loosened for pad-level spills
  
  let ndsiSum = sample.B11 + sample.B12;
  let ndsi = ndsiSum === 0 ? 0 : (sample.B11 - sample.B12) / ndsiSum;
  
  let hcaiSum = sample.B11 + sample.B04;
  let hcai = hcaiSum === 0 ? 0 : (sample.B11 - sample.B04) / hcaiSum;
  
  let score = Math.max(0, bsi + __BSI_OFFSET__) * Math.max(0, ndsi - 0.03) * Math.max(0, hcai - 0.15);
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
  return [Math.max(0, bsi + __BSI_OFFSET__) * Math.max(0, ndsi - 0.03) * Math.max(0, hcai - 0.15)];
`
    },
    vsi: {
        name: 'Vegetation Stress Index (VSI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '3-24M',
        min: 'Healthy', max: 'Metal/Brine Stress',
        gradient: 'linear-gradient(to right, #005500, #FFFF00, #FF8800, #FF0000)',
        formula: 'NDSI * RedEdgeDelta * MSI',
        info: 'Globe & Atlas · Limn composite calibration. Detects the physiological impact of produced water before vegetation death — sub-lethal brine toxicity in surviving desert scrub. Uses Red-Edge blue-shifts (B07/B05) and SWIR/NIR moisture stress (B11/B8A) co-located with a salinity signature (NDSI). Earlier warning than VCBI, which requires vegetation mortality.',
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
        name: 'Clay-Mineral Alteration (CMA)',
        sensor: 'Sentinel-2 L2A',
        temporal: 'Persistent',
        min: 'Native Soil', max: 'Chemical Alteration',
        gradient: 'linear-gradient(to right, #442200, #884400, #AA88AA, #FFFFFF)',
        formula: 'NDSI * (B11/B12) * (B04/B02)',
        info: 'Globe & Atlas · Limn composite calibration. Forensic index targeting the chemical modification of clay lattices by produced water residues. Uses SWIR-1/SWIR-2 ratios to isolate salt-clay interactions and visible Red/Blue ratios for iron-oxidation signatures. Persistent indicator — clay lattice disruption survives long after surface brine has evaporated.',
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
        name: 'Petro-Hydrocarbon Index (PHI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '0-6M',
        min: 'Background', max: 'Hydrocarbon Rich',
        gradient: 'linear-gradient(to right, #000000, #333333, #663300, #FFCC00)',
        formula: 'NDSI * (B11/B12) * HCAI',
        info: 'Globe & Atlas · Limn composite calibration. Isolates oily brine from clean runoff by combining the SWIR absorption shoulder of petroleum hydrocarbons (B11/B12 ratio), HCAI hydrocarbon signal, and NDSI salinity — a three-factor gate that separates oilfield produced water from natural saline seeps or irrigation drainage.',
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
        name: 'Heavy Metal Interaction (HMI)',
        sensor: 'Sentinel-2 L2A',
        temporal: '12M+',
        min: 'Clean', max: 'Metal-Salt PPT',
        gradient: 'linear-gradient(to right, #001100, #004400, #00FFBB, #FFFFFF)',
        formula: '(B03/B02) * (B11/B12)',
        info: 'Globe & Atlas · Limn composite calibration. Targets Barium and Strontium precipitation from produced water — heavy metals that settle into soil as brine evaporates. Uses green-reflectance shifts (B03/B02) caused by metal toxicity suppressing organic matter, combined with mineral salt precipitation signatures (B11/B12). Persistent for 12+ months after initial spill.',
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
        name: 'Salt Crust Roughness Index (SCRI)',
        sensor: 'Sentinel-1 GRD',
        temporal: '3-12M',
        min: 'Background', max: 'Salt Crust Confirmed',
        gradient: 'linear-gradient(to right, #000000, #4b0082, #e74c3c, #f1c40f)',
        formula: 'log10(VH) + Salt_Proxy',
        info: 'Globe & Atlas · Limn SAR-based composite calibration. Leverages the characteristic backscatter signature of salt crystallization on the soil surface: low VH (smooth surface, no volume scattering) combined with elevated VH relative to background. Penetrates dust, smoke, and cloud — provides mechanical verification of chemical salinity signatures seen in optical indices.',
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
    mvpi: {
        name: 'Methane Venting Plume Index (MVPI)',
        sensor: 'Sentinel-2 L2A',
        temporal: 'Live',
        min: 'Clean Ground', max: 'Methane Plume Anomaly',
        gradient: 'linear-gradient(to right, #0d171b, #f57814, #ffb400)',
        formula: 'Bright Soil × SWIR Methane Ratio × Water/Veg Gates',
        info: 'Methane super-emitter screening. Targets localized high-concentration venting plumes over highly reflective oil pads and soils by isolating B11/B12 gas absorption features.',
        diffLabels: ['Plume Dispersal', 'Plume Expansion'],
        evalscript: genEvalscript(['B03', 'B04', 'B08', 'B11', 'B12'], `
  if (sample.dataMask === 0) return [0,0,0,0];
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  let methaneRatio = sample.B11 / Math.max(sample.B12, 0.001);
  let methaneScore = Math.max(0.0, (methaneRatio - 1.15) * 4.0);
  let swirMean = (sample.B11 + sample.B12) / 2.0;
  let groundGate = Math.max(0.0, (swirMean - 0.20) * 2.0);
  let waterReject = sample.B03 > sample.B11 ? 0.0 : 1.0;
  let vegReject = ndvi > 0.15 ? 0.0 : 1.0;
  let score = waterReject * vegReject * groundGate * methaneScore;
  let mapped = Math.min(1.0, score * 3.0);
  ${colorBlend('mapped', PALETTE_METHANE)}
`),
        fisBands: ['B03', 'B04', 'B08', 'B11', 'B12'],
        fisLogic: `
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  let methaneRatio = sample.B11 / Math.max(sample.B12, 0.001);
  let methaneScore = Math.max(0.0, (methaneRatio - 1.15) * 4.0);
  let swirMean = (sample.B11 + sample.B12) / 2.0;
  let groundGate = Math.max(0.0, (swirMean - 0.20) * 2.0);
  let waterReject = sample.B03 > sample.B11 ? 0.0 : 1.0;
  let vegReject = ndvi > 0.15 ? 0.0 : 1.0;
  return [waterReject * vegReject * groundGate * methaneScore];
`
    }
};

// Per-index thresholds matching the scan rule engine
export const HIGHLIGHT_THRESHOLDS = {
    pwi:  0.10,   // Produced Water Composite — scan flags > 0.10
    hpwi: 0.05,   // Hot-Pixel PW Index — scan flags > 0.05
    pwoi: 0.05,   // PWOI Produced Water Optical Index — scan flags > 0.05
    fbc:  0.10,   // Forensic Brine Composite — scan flags > 0.1
    lbi:  0.08,   // Proxy for leachate/brine
    ndmi: 0.35,   // Normalized Diff Moisture — anomaly when high + dry
    ndwi: 0.15,   // Water 
    si:   0.15,   // Salinity Index
    ndsi: 0.15,   // Saline Content (Brine)
    bsi:  0.10,   // Bare Soil Index
    csi:  1.20,   // Contaminated Soil (Clay Ratio > 1.2 is anomalous)
    hcai: 0.10,   // Hydrocarbons (offset-adjusted, > 0.10 above baseline)
    hmri: 0.10,   // Heavy Metals (offset-adjusted, > 0.10 above baseline)
    ndoi: 0.15,   // Oil Slicks
    msi:  1.20,   // Moisture Stress (ratio > 1.2 = stressed)
    savi: 0.25,   // Vegetation (highlight low-veg/barren areas)
    vsi:  0.10,   // Proxy
    scri: 0.10,   // Proxy
    tri:  0.08,   // Proxy
    bpi:  0.08,    // Proxy
    mvpi: 0.10
};

export const CHART_COLORS = {
    ndmi: '#1C85A6', ndwi: '#1450B4', ndvi: '#146428', savi: '#A07832',
    msi: '#D46A24', s1_sar: '#999999', ndsi: '#FF00FF', bsi: '#A07832', hcai: '#8B4513',
    hpwi: '#f1c40f', pwi: '#00D2FF', lbi: '#00D2FF', fbc: '#FFB347',
    vsi: '#FFD700', scri: '#FF4500', tri: '#9933ff', bpi: '#00FFFF',
    tc: '#FFFFFF', fc: '#FF0000', si: '#00FFFF', csi: '#8B4513',
    hmri: '#808080', ndoi: '#000000', crsi: '#FF5555', aoi: '#5555FF',
    ehc: '#333333', reai: '#FF0055', vcbi: '#AA0000', cma: '#AA88AA',
    phi: '#FF00FF', hmi: '#444444', pwoi: '#8C00FF',
    mvpi: '#f57814'
};

export function getHighlightScript(indexKey, hexColor, chartValue, includeContext = false, activeBasin = 'permian') {
    const cfg = INDICES[indexKey];
    if (!cfg || !cfg.fisLogic) return '';
    
    // Apply Dynamic Calibration Placeholders to the logic
    const cal = CALIBRATION_PRESETS[activeBasin || 'permian'];
    let logic = cfg.fisLogic
        .replace(/__BSI_MASK__/g, cal.bsiMask)
        .replace(/__BSI_OFFSET__/g, cal.bsiOffset)
        .replace(/__NDWI_OFFSET__/g, cal.ndwiOffset)
        .replace(/__PWI_SALINITY_OFFSET__/g, cal.pwiSalinityOffset)
        .replace(/__PWI_HC_OFFSET__/g, cal.pwiHydrocarbonOffset)
        .replace(/__PWI_HMRI_OFFSET__/g, cal.pwiHmriOffset);

    // If context is requested, we need B04, B03, B02 for True Color background
    const bandsList = [...new Set([...(cfg.fisBands || []), 'B04', 'B03', 'B02'])];
    
    // Use dynamic chart value as the highlight threshold if available
    let rawThreshold = HIGHLIGHT_THRESHOLDS[indexKey] || 0.20;
    if (chartValue !== undefined && chartValue !== null && !isNaN(chartValue)) {
        rawThreshold = Math.min(parseFloat(chartValue), rawThreshold);
    }
    
    const threshold = (rawThreshold * 0.90).toFixed(5);
    
    // Convert hex to float RGB
    let r = 1.0, g = 0.0, b = 1.0;
    if (hexColor && hexColor.startsWith('#') && hexColor.length === 7) {
        r = parseInt(hexColor.slice(1, 3), 16) / 255;
        g = parseInt(hexColor.slice(3, 5), 16) / 255;
        b = parseInt(hexColor.slice(5, 7), 16) / 255;
    }
    
    return `//VERSION=3
function setup() {
  return {
    input: [${bandsList.map(b => `'${b}'`).join(', ')}, "dataMask"],
    output: { bands: 4 }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0, 0, 0, 0];
  const calculate = (sample) => {
    ${logic}
  };
  let result = calculate(sample);
  let val = Array.isArray(result) ? result[0] : result;
  
  if (${!includeContext}) {
     // OFFSCREEN PEAK DETECTION MODE
     // Encode the continuous value (mapped to 0..1) into 24-bit truecolor RGB
     // so the JS canvas can resolve ties among 16.7 million levels.
     let norm = (val + 1.0) / 4.0;
     let v = Math.max(0.0, Math.min(1.0, norm));
     let v24 = Math.floor(v * 16777215); // 2^24 - 1
     
     let cR = Math.floor(v24 / 65536) / 255.0;
     let cG = Math.floor((v24 % 65536) / 256) / 255.0;
     let cB = (v24 % 256) / 255.0;
     
     return [cR, cG, cB, 1.0];
  } else {
     // THUMBNAIL VISUAL MODE
     // Blend highlights over True Color background at 60% opacity
     let factor = 2.5;
     let tR = sample.B04 * factor;
     let tG = sample.B03 * factor;
     let tB = sample.B02 * factor;

     if (val >= ${threshold}) {
         return [
             (tR * 0.4) + (${r.toFixed(3)} * 0.6),
             (tG * 0.4) + (${g.toFixed(3)} * 0.6),
             (tB * 0.4) + (${b.toFixed(3)} * 0.6),
             1.0
         ]; 
     } else {
         return [tR, tG, tB, 1.0];
     }
  }
}`;
}

export function getShortIndexName(indexKey) {
    if (!indexKey) return '';
    const mapping = {
        pwi: 'PWCI',
        hpwi: 'OBEC',
        pwoi: 'ASAI',
        ehc: 'EHC',
        ndvi: 'NDVI',
        savi: 'SAVI',
        ndmi: 'NDMI',
        ndwi: 'NDWI',
        ndsi: 'NDSI',
        bsi: 'BSI',
        lbi: 'LBI',
        fbc: 'FBC',
        vsi: 'VSI',
        scri: 'SCRI',
        tri: 'TRI',
        bpi: 'BPI',
        phi: 'PHI',
        cma: 'CMA',
        hmi: 'HMI',
        vcbi: 'VCBI',
        reai: 'REAI',
        aoi: 'AOI',
        tc: 'True Color',
        fc: 'False Color',
        mvpi: 'MV-PI'
    };
    return mapping[indexKey.toLowerCase()] || indexKey.toUpperCase();
}
