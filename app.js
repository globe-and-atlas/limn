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
`)
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
`)
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
  // Maps roughly -1 to +1, we scale to 0-1 for the palette
  ${colorBlend('(val + 0.2) * 1.5', PALETTE_SI)}
`)
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
    if (slider) {
        slider.max = Math.max(0, ALL_DATES.length - 1);
        slider.value = state.monthIndex;
    }
    if (ticksContainer) {
        ticksContainer.innerHTML = '';
        let lastDisplayedYear = 0;
        ALL_DATES.forEach((d, i) => {
            let currentYear = parseInt(d.value.split('-')[0]);
            if (currentYear > lastDisplayedYear) { // Tick mark for first date of a new year
                lastDisplayedYear = currentYear;
                let span = document.createElement('span');
                span.textContent = "'" + d.value.split('-')[0].slice(2);
                span.style.position = 'absolute';
                span.style.left = `${(i / (ALL_DATES.length - 1)) * 100}%`;
                ticksContainer.appendChild(span);
            }
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

function getWMSLayer(timeStr, isDiff) {
    const cfg = INDICES[state.activeIndex];

    // Auto-generate the diff script logic if not explicitly provided
    let scriptContent = cfg.evalscript;
    if (isDiff) {
        if (cfg.diffscript) {
            scriptContent = cfg.diffscript;
        } else {
            // Extract mathematical intent from the formula string to feed genDiffEvalscript
            let calc = '0';
            if (state.activeIndex === 'ndmi') calc = '(sample.B8A - sample.B11)/(sample.B8A + sample.B11)';
            else if (state.activeIndex === 'ndwi') calc = '(sample.B03 - sample.B11)/(sample.B03 + sample.B11)';
            else if (state.activeIndex === 'si') calc = 'Math.sqrt(sample.B02 * sample.B04)*8';
            else if (state.activeIndex === 'tc') calc = '(sample.B04*2)'; // simplistic proxy for RGB change

            let bands = ['B04', 'B03', 'B02'];
            if (state.activeIndex === 'ndmi') bands = ['B8A', 'B11'];
            if (state.activeIndex === 'ndwi') bands = ['B03', 'B11'];
            if (state.activeIndex === 'si') bands = ['B02', 'B04'];

            scriptContent = genDiffEvalscript(bands, calc);
        }
    }

    return L.tileLayer.wms(SH_WMS_URL, {
        layers: 'AGRICULTURE',
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
    const cfg = INDICES[state.activeIndex];
    document.getElementById('active-index-name').innerText = cfg.name;
    document.getElementById('legend-min').innerText = cfg.min;
    document.getElementById('legend-max').innerText = cfg.max;
    document.getElementById('formula-display').innerText = cfg.formula;

    const grad = document.getElementById('legend-gradient');
    const diffLegend = document.getElementById('diff-legend');

    if (diffLegend) diffLegend.style.display = 'none';

    if (state.mode === 'compare' && state.compareType === 'diff') {
        if (diffLegend) diffLegend.style.display = 'block';
        grad.style.display = 'none';
        document.getElementById('legend-min').style.display = 'none';
        document.getElementById('legend-max').style.display = 'none';
    } else if (cfg.gradient === 'none') {
        grad.style.display = 'none';
        document.getElementById('legend-min').style.display = 'none';
        document.getElementById('legend-max').style.display = 'none';
    } else {
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
        });
    });

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
    const timeSlider = document.getElementById('time-slider');
    timeSlider.addEventListener('input', (e) => {
        state.monthIndex = parseInt(e.target.value);
        document.getElementById('current-month-display').innerText = ALL_DATES[state.monthIndex].displayStr;

        if (state.mode === 'single') applyIndex();
    });

    const opSlider = document.getElementById('opacity-slider');
    opSlider.addEventListener('input', (e) => {
        state.opacity = parseInt(e.target.value) / 100;
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
}
