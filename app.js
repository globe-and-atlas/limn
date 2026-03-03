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
const today = new Date();
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
const SH_WMS_URL = 'https://sh.dataspace.copernicus.eu/ogc/wms/959ea2c5-5892-4b36-82b3-76e6bdb93c8a';
const SH_FIS_URL = 'https://sh.dataspace.copernicus.eu/ogc/fis/959ea2c5-5892-4b36-82b3-76e6bdb93c8a';

// Globals for Report Generation
let aoiDrawnItem = null;
let reportChartInst = null;
let reportMapInst = null;

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

// Index Configs
const INDICES = {
    ndmi: {
        name: 'Moisture Index (NDMI)',
        sensor: 'Sentinel-2 L2A',
        min: 'High Stress', max: 'High Moisture',
        gradient: 'linear-gradient(to right, #D46A24, #EFD87A, #1C85A6)',
        formula: '(B8A - B11) / (B8A + B11)',
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
    s1_sar: {
        name: 'SAR Moisture (VV/VH)',
        sensor: 'Sentinel-1 GRD',
        min: 'Dry / Smooth', max: 'Wet / Rough',
        gradient: 'linear-gradient(to right, #000000, #448833, #CCDD55)',
        formula: 'RGB [VV, VH, VV/VH]',
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
    opacity: 0.85,
    overlayGroup: null,
    leftGroup: null,
    rightGroup: null,
    sbsControl: null,
    chartInst: null
};

// ── INIT ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
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
            // Optical Indexes Difference
            let calc = '0';
            if (activeIndex === 'ndmi') calc = '(sample.B8A - sample.B11)/(sample.B8A + sample.B11)';
            else if (activeIndex === 'ndwi') calc = '(sample.B03 - sample.B11)/(sample.B03 + sample.B11)';
            else if (activeIndex === 'si') calc = '(sample.B11 - sample.B08)/(sample.B11 + sample.B08)';
            else if (activeIndex === 'tc') calc = '(sample.B04*2)'; // simplistic proxy for RGB change

            let bands = ['B04', 'B03', 'B02'];
            if (activeIndex === 'ndmi') bands = ['B8A', 'B11'];
            if (activeIndex === 'ndwi') bands = ['B03', 'B11'];
            if (activeIndex === 'si') bands = ['B11', 'B08'];

            scriptContent = genDiffEvalscript(bands, calc);
        }
    }
    return scriptContent;
}

function getWMSLayer(timeStr, isDiff) {
    let scriptContent = getScriptContent(state.activeIndex, isDiff);

    let wmsLayerParam = 'AGRICULTURE';
    if (state.activeIndex === 's1_sar') wmsLayerParam = 'SENTINEL1-GRD';

    return L.tileLayer.wms(SH_WMS_URL, {
        layers: wmsLayerParam,
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        time: timeStr,
        maxcc: 20,
        showlogo: false,
        evalscript: btoa(scriptContent),
        opacity: state.opacity,
        attribution: 'Copernicus Sentinel Hub',
        tileSize: 256,
        minZoom: 10,
        zIndex: 10
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

    if (state.mode === 'single') {
        const timeStr = ALL_DATES[state.monthIndex].value;
        const layer = getWMSLayer(timeStr, false);
        state.overlayGroup = L.layerGroup([layer]).addTo(state.map);
    } else {
        const t1 = document.getElementById('date-t1').value;
        const t2 = document.getElementById('date-t2').value;

        if (state.compareType === 'swipe') {
            const l_layer = getWMSLayer(t1, false);
            const r_layer = getWMSLayer(t2, false);

            state.leftGroup = L.layerGroup([l_layer]).addTo(state.map);
            state.rightGroup = L.layerGroup([r_layer]).addTo(state.map);

            state.sbsControl = L.control.sideBySide(l_layer, r_layer).addTo(state.map);
        } else if (state.compareType === 'diff') {
            const timeRange = `${t1}/${t2}`;
            const diffLayer = getWMSLayer(timeRange, true);
            state.overlayGroup = L.layerGroup([diffLayer]).addTo(state.map);
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

    const grad = document.getElementById('legend-gradient');
    const diffLegend = document.getElementById('diff-legend');

    if (diffLegend) diffLegend.style.display = 'none';

    if (state.mode === 'compare' && state.compareType === 'diff') {
        if (diffLegend) {
            diffLegend.style.display = 'block';
            diffLegend.style.position = 'absolute';
            diffLegend.style.bottom = '10px';
            diffLegend.style.left = '16px';
            diffLegend.style.right = '16px';
            diffLegend.style.zIndex = '1000';
            diffLegend.style.background = 'rgba(0,0,0,0.8)';
            diffLegend.style.padding = '10px';
            diffLegend.style.borderRadius = '6px';
            diffLegend.style.border = '1px solid var(--border-color)';

            // Append it to the map area instead of inside the small sidebar box
            document.querySelector('.map-container').appendChild(diffLegend);
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

        // 1. Populate Text Metadata
        const idx = INDICES[state.activeIndex];
        document.getElementById('report-date-run').innerText = new Date().toLocaleString();

        let bounds = aoiDrawnItem.getBounds();
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

            const fisScript = `//VERSION=3
function setup() {
  return {
    input: [${idx.fisBands.map(b => `'${b}'`).join(', ')}, "dataMask"],
    output: { bands: 1, sampleType: 'FLOAT32' }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [NaN];
  ${idx.fisLogic}
}`;

            const b64Data = btoa(fisScript);

            // Determine Temporal Range
            let timeRange;
            let chartTitleLabel = "";

            if (state.mode === 'compare') {
                let d1 = document.getElementById('date-t1').value;
                let d2 = document.getElementById('date-t2').value;

                if (d1 > d2) {
                    const temp = d1;
                    d1 = d2;
                    d2 = temp;
                }

                // Timeline: selected range plus and minus two months
                let d1D = new Date(d1);
                let d2D = new Date(d2);
                let startD = new Date(Date.UTC(d1D.getUTCFullYear(), d1D.getUTCMonth() - 2, d1D.getUTCDate()));
                let endD = new Date(Date.UTC(d2D.getUTCFullYear(), d2D.getUTCMonth() + 2, d2D.getUTCDate()));

                if (endD > today) endD = today;

                timeRange = `${startD.toISOString().split('T')[0]}/${endD.toISOString().split('T')[0]}`;
                chartTitleLabel = `Date Range +/- 2 Months`;
            } else {
                // Timeline: selected date plus and minus two months
                let targetDateStr = ALL_DATES[state.monthIndex].value;
                let sd = new Date(targetDateStr);
                let startD = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth() - 2, sd.getUTCDate()));
                let endD = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth() + 2, sd.getUTCDate()));

                if (endD > today) endD = today;

                timeRange = `${startD.toISOString().split('T')[0]}/${endD.toISOString().split('T')[0]}`;
                chartTitleLabel = `Selected Date +/- 2 Months`;
            }

            const CHART_COLORS = {
                ndmi: '#1C85A6',
                ndwi: '#1450B4',
                ndvi: '#146428',
                savi: '#A07832',
                msi: '#D46A24',
                s1_sar: '#999999'
            };

            const activeKey = state.activeIndex;
            const cfg = INDICES[activeKey];
            let layerParam = 'AGRICULTURE';
            let maxccParam = '&MAXCC=30';
            if (activeKey === 's1_sar') {
                layerParam = 'SENTINEL1-GRD';
                maxccParam = '';
            }

            const url = `${SH_FIS_URL}?LAYER=${layerParam}&TIME=${timeRange}&BBOX=${bboxStr}&CRS=CRS:84&RESOLUTION=20m${maxccParam}&EVALSCRIPT=${encodeURIComponent(b64Data)}`;

            btn.innerText = "Processing Data Layers...";
            try {
                const resp = await fetch(url);
                const data = await resp.json();
                let c0 = data.C0 || [];
                let validData = {};
                c0.forEach(entry => {
                    if (entry.basicStats && entry.basicStats.mean !== "NaN" && entry.basicStats.mean !== null) {
                        validData[entry.date] = entry.basicStats.mean;
                    }
                });

                let sortedDates = Object.keys(validData).sort((a, b) => new Date(a) - new Date(b));

                if (sortedDates.length === 0) {
                    alert("No valid statistical data found for this bounding box (possibly due to clouds or data sparsity).");
                    btn.innerText = "Generate Selected Report";
                    btn.disabled = false;
                    return;
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

        // 4. Show Map in Modal
        let activeBaseKey = 'imagery';
        document.querySelectorAll('.layer-toggle').forEach(btn => {
            if (btn.classList.contains('active')) activeBaseKey = btn.dataset.layer;
        });

        if (!reportMapInst) {
            reportMapInst = L.map('report-map', {
                zoomControl: true,
                attributionControl: false,
                dragging: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                keyboard: false
            });
            reportMapInst.baseLayer = L.tileLayer(BASE_LAYERS[activeBaseKey], { maxZoom: 18 }).addTo(reportMapInst);
        } else {
            if (reportMapInst.baseLayer) reportMapInst.removeLayer(reportMapInst.baseLayer);
            reportMapInst.baseLayer = L.tileLayer(BASE_LAYERS[activeBaseKey], { maxZoom: 18 }).addTo(reportMapInst);
        }

        let overlayLayer = null;
        if (state.mode === 'single') {
            overlayLayer = getWMSLayer(ALL_DATES[state.monthIndex].value, false);
        } else {
            let rd1 = document.getElementById('date-t1').value;
            let rd2 = document.getElementById('date-t2').value;
            if (rd1 > rd2) { const tmp = rd1; rd1 = rd2; rd2 = tmp; }

            if (state.compareType === 'swipe') {
                overlayLayer = getWMSLayer(rd2, false); // Just show the 'after' image for swipe
            } else {
                overlayLayer = getWMSLayer(`${rd1}/${rd2}`, true);
            }
        }

        // 3. Show Modal
        document.getElementById('report-modal').style.display = 'flex';

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
            if (overlayLayer) {
                reportMapInst.overlayLayer = overlayLayer.addTo(reportMapInst);
            }
        }, 150);

        // 5. Generate Animated GIF if Compare Mode
        const gifSection = document.getElementById('report-gif-section');
        if (state.mode === 'compare') {
            gifSection.style.display = 'block';

            const gifLoader = document.getElementById('gif-loader-text');
            const gifImg = document.getElementById('report-gif-result');
            const gifBtn = document.getElementById('btn-download-gif');

            gifLoader.style.display = 'block';
            gifLoader.innerText = 'Calculating temporal frames...';
            gifImg.style.display = 'none';
            gifBtn.style.pointerEvents = 'none';
            gifBtn.style.opacity = '0.5';

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

            const isDiffAnim = state.compareType === 'diff';
            const b64MathStd = btoa(INDICES[state.activeIndex].evalscript);

            // For base maps in diff mode, fallback to true color if possible
            let b64Bg = b64MathStd;
            if (isDiffAnim && state.activeIndex !== 's1_sar') {
                b64Bg = btoa(INDICES['tc'].evalscript);
            }

            let diffB64Math = "";
            if (isDiffAnim) diffB64Math = btoa(getScriptContent(state.activeIndex, true));

            // Generate Standard Imagery URLs (Backgrounds)
            const bgUrls = frameIndices.map(i => {
                const dateStr = ALL_DATES[i].value;
                let dTarget = new Date(dateStr);
                let dPrior = new Date(dTarget);
                dPrior.setUTCDate(dPrior.getUTCDate() - 20);
                let pStr = dPrior.toISOString().split('T')[0];
                let rangeStr = `${pStr}/${dateStr}`;
                return `${SH_WMS_URL}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${wmsLayerParam}&FORMAT=image/png&TRANSPARENT=false&VERSION=1.3.0&TIME=${rangeStr}&MAXCC=15&WIDTH=400&HEIGHT=300&CRS=CRS:84&BBOX=${bboxStr}&EVALSCRIPT=${encodeURIComponent(b64Bg)}`;
            });

            // Generate Difference Mask URLs
            let diffUrls = [];
            if (isDiffAnim) {
                diffUrls = frameIndices.map(i => {
                    const dateStr = ALL_DATES[i].value;
                    let dBase = new Date(d1);
                    dBase.setUTCDate(dBase.getUTCDate() - 20); // buffer
                    let baseStr = dBase.toISOString().split('T')[0];
                    let dCurr = new Date(dateStr);
                    if (dCurr <= dBase) dCurr.setUTCDate(dBase.getUTCDate() + 10);
                    let currStr = dCurr.toISOString().split('T')[0];
                    let rangeStr = `${baseStr}/${currStr}`;
                    return `${SH_WMS_URL}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${wmsLayerParam}&FORMAT=image/png&TRANSPARENT=true&VERSION=1.3.0&TIME=${rangeStr}&MAXCC=15&WIDTH=400&HEIGHT=300&CRS=CRS:84&BBOX=${bboxStr}&EVALSCRIPT=${encodeURIComponent(diffB64Math)}`;
                });
            }

            gifLoader.innerText = `Fetching ${bgUrls.length * (isDiffAnim ? 2 : 1)} satellite frames...`;

            // Canvas composite renderer helper
            const renderCanvas = (bgBlob, diffBlob, dateText) => {
                return new Promise((resolve) => {
                    const bgUrl = URL.createObjectURL(bgBlob);
                    const diffUrl = diffBlob ? URL.createObjectURL(diffBlob) : null;

                    const bgImg = new Image();
                    bgImg.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = 400;
                        canvas.height = 330;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(bgImg, 0, 0, 400, 300);

                        const drawFooter = () => {
                            ctx.fillStyle = '#111111';
                            ctx.fillRect(0, 300, 400, 30);
                            ctx.fillStyle = '#ffffff';
                            ctx.font = '600 13px sans-serif';
                            ctx.textBaseline = 'middle';
                            ctx.textAlign = 'center';
                            ctx.fillText(dateText, 200, 315);
                            resolve(canvas.toDataURL('image/jpeg', 0.95));
                        };

                        if (diffUrl) {
                            const dfImg = new Image();
                            dfImg.onload = () => {
                                ctx.drawImage(dfImg, 0, 0, 400, 300);
                                drawFooter();
                            };
                            dfImg.onerror = drawFooter;
                            dfImg.src = diffUrl;
                        } else {
                            drawFooter();
                        }
                    };
                    bgImg.onerror = () => resolve(bgUrl);
                    bgImg.src = bgUrl;
                });
            };

            const buildStandardGif = async () => {
                const blobs = await Promise.all(bgUrls.map(u => fetch(u).then(r => r.blob())));
                const canvases = await Promise.all(blobs.map((b, i) => renderCanvas(b, null, ALL_DATES[frameIndices[i]].displayStr)));

                return new Promise(resolve => {
                    gifshot.createGIF({ images: canvases, gifWidth: 400, gifHeight: 330, interval: 0.35, sampleInterval: 10 }, obj => {
                        if (!obj.error) {
                            gifImg.src = obj.image;
                            gifBtn.href = obj.image;
                            gifContStd.style.display = 'block';
                        }
                        resolve();
                    });
                });
            };

            const buildDiffGif = async () => {
                const bgBlobs = await Promise.all(bgUrls.map(u => fetch(u).then(r => r.blob())));
                const diffBlobs = await Promise.all(diffUrls.map(u => fetch(u).then(r => r.blob())));
                const canvases = await Promise.all(bgBlobs.map((b, i) => renderCanvas(b, diffBlobs[i], ALL_DATES[frameIndices[i]].displayStr)));

                return new Promise(resolve => {
                    gifshot.createGIF({ images: canvases, gifWidth: 400, gifHeight: 330, interval: 0.35, sampleInterval: 10 }, obj => {
                        if (!obj.error) {
                            gifImgDiff.src = obj.image;
                            gifBtnDiff.href = obj.image;
                            gifContDiff.style.display = 'block';
                        }
                        resolve();
                    });
                });
            };

            (async () => {
                try {
                    gifLoader.innerText = 'Encoding Standard Imagery GIF...';
                    await buildStandardGif();

                    if (isDiffAnim) {
                        gifLoader.innerText = 'Encoding Difference Heatmap GIF...';
                        await buildDiffGif();
                    }

                    gifLoader.style.display = 'none';
                } catch (e) {
                    gifLoader.innerText = 'Failed to fetch or encode imagery for GIFs.';
                    console.error("GIF Render Error:", e);
                }
            })();

        } else {
            gifSection.style.display = 'none';
        }

    });

    document.getElementById('btn-close-report').addEventListener('click', () => {
        document.getElementById('report-modal').style.display = 'none';
    });

}

// ── HTML REPORT EXPORT ────────────────────────────
function downloadHTMLReport() {
    const runDate = document.getElementById('report-date-run').innerText;
    const aoiBounds = document.getElementById('report-aoi-bounds').innerText;
    const indexName = document.getElementById('report-index-name').innerText;
    const mathLogic = document.getElementById('report-math').innerHTML;
    const timeText = document.getElementById('report-time').innerText;

    let activeBaseKey = 'imagery';
    document.querySelectorAll('.layer-toggle').forEach(btn => {
        if (btn.classList.contains('active')) activeBaseKey = btn.dataset.layer;
    });
    const baseLayerUrl = BASE_LAYERS[activeBaseKey];

    let wmsUrl = "";
    let wmsParams = {};
    if (reportMapInst && reportMapInst.overlayLayer) {
        wmsUrl = reportMapInst.overlayLayer._url;
        wmsParams = reportMapInst.overlayLayer.wmsParams;
    }

    const bounds = aoiDrawnItem.getBounds();
    const boundsArr = [
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()]
    ];

    const gifImg = document.getElementById('report-gif-result');
    const gifImgDiff = document.getElementById('report-gif-result-diff');

    let gifHtml = "";

    if (gifImg && gifImg.src && document.getElementById('gif-container-standard').style.display !== 'none') {
        gifHtml += `
        <div style="margin-top: 30px; text-align: center;">
            <h3 style="color: #1C85A6;">Standard Change (GIF)</h3>
            <img src="${gifImg.src}" style="max-width: 100%; border-radius: 6px; border: 1px solid #333;" />
        </div>`;
    }

    if (gifImgDiff && gifImgDiff.src && document.getElementById('gif-container-diff').style.display !== 'none') {
        gifHtml += `
        <div style="margin-top: 30px; text-align: center;">
            <h3 style="color: #F0501E;">Difference Heatmap (GIF)</h3>
            <img src="${gifImgDiff.src}" style="max-width: 100%; border-radius: 6px; border: 1px solid #333;" />
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
                    legend: { display: true, labels: { color: 'rgba(255,255,255,0.8)', usePointStyle: true, boxWidth: 8 } },
                    tooltip: { callbacks: { title: function(ctx) { return ctx[0].label; } } }
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
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { font-family: sans-serif; background-color: #121212; color: #fff; margin: 40px; }
        .container { max-width: 900px; margin: auto; background: #1e1e1e; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        h1, h2, h3 { color: #1C85A6; }
        .meta-box { background: rgba(0,0,0,0.3); padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #333; line-height: 1.5; }
        .meta-box p { margin: 5px 0; }
        .chart-wrapper { height: 400px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid #333; padding: 15px; margin-top: 20px; }
        #map { height: 350px; background: #000; border-radius: 6px; border: 1px solid #333; margin-top: 20px; }
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
            <p><strong>Math Logic:</strong><br/>${mathLogic}</p>
        </div>

        <h3>Area of Interest (AOI)</h3>
        <div id="map"></div>

        ${chartContainerHtml}
        
        ${gifHtml}
    </div>

    <script>
        const map = L.map('map', { scrollWheelZoom: false, attributionControl: false }).fitBounds(${JSON.stringify(boundsArr)}, { padding: [20, 20] });
        L.tileLayer('${baseLayerUrl}', { maxZoom: 18 }).addTo(map);
        
        ${wmsUrl ? `L.tileLayer.wms('${wmsUrl}', ${JSON.stringify(wmsParams)}).addTo(map);` : ''}

        L.rectangle(${JSON.stringify(boundsArr)}, { color: '#1C85A6', weight: 3, fillOpacity: 0.2 }).addTo(map);

        ${chartScriptHtml}
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sentinel_Report_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
}
