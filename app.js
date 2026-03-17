/* ==========================================================================
   Sentinel Explorer - Core Logic (ES Module Entry Point)
   ========================================================================== */

import { getCDSEToken } from './auth.js';
import { 
    INDICES, 
    CALIBRATION_PRESETS, 
    genEvalscript, 
    genDiffEvalscript, 
    genDeepFusionEvalscript, 
    genCumulativeEvalscript,
    colorBlend,
    PALETTE_NDMI,
    PALETTE_NDWI,
    PALETTE_VEG,
    PALETTE_MSI,
    PALETTE_BRINE,
    PALETTE_CSI,
    PALETTE_HCAI,
    PALETTE_HMRI,
    PALETTE_PWI,
    PALETTE_BSI,
    PALETTE_REAI,
    PALETTE_VCBI,
    PALETTE_FBC,
    PALETTE_HPWI,
    PALETTE_LBI,
    PALETTE_TRI,
    PALETTE_BPI,
    PALETTE_VSI,
    PALETTE_CMA,
    PALETTE_PHI,
    PALETTE_HMI,
    PALETTE_SCRI,
    PALETTE_MSI_INV
} from './indices.js';
import {
    detectPeakAnomaly,
    showHoverHighlight,
    getDrawnWKT,
    buildHighlightUrl,
    renderScanThumbnails,
    prefetchHighlights,
    hideHoverHighlight
} from './charts.js';
import {
    probeAcquisitions,
    openReportModal,
    closeReportModal
} from './report.js';
import {
    initLeafletMap,
    applyIndex as applyIndexDelegate,
    updateGifInset as updateGifInsetDelegate
} from './map.js';
import {
    showToast as showToastDelegate,
    switchTab,
    updateUI as updateUIDelegate
} from './ui.js';

const AOI_LOCATIONS = {
    dixon: { lat: 31.893285, lng: -101.864031, zoom: 15 },
    rocker: { lat: 31.244621, lng: -101.261754, zoom: 15 },
    sweatt: { lat: 31.480407, lng: -103.423865, zoom: 15 }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const START_YEAR = 2020;
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
// Copernicus Sentinel Hub configuration
const SH_WMS_URL = 'https://sh.dataspace.copernicus.eu/ogc/wms/959ea2c5-5892-4b36-82b3-76e6bdb93c8a';
const SH_STAT_API_URL = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';

const APP_VERSION = 'v48';

const config = {
    SH_WMS_URL,
    SH_STAT_API_URL,
    ALL_DATES,
    INDICES,
    START_YEAR
};

// Modular Delegations
function applyIndex(isScrubbing = false) {
    applyIndexDelegate(state, config, isScrubbing);
    updateUI();
}

function updateUI() {
    updateUIDelegate(state, INDICES);
}

function updateGifInset() {
    updateGifInsetDelegate(state, config);
}

function showToast(message, type = 'info') {
    showToastDelegate(message, type);
}

// Globals for Report Generation
let aoiDrawnItem = null;
let reportChartInst = null;
let primaryChartInst = null;
let secondaryChartInst = null;
let reportMapInst = null;
let reportDiffMapInst = null;

// NOTE: CALIBRATION_PRESETS, evalscript generators, palettes, INDICES,
// HIGHLIGHT_THRESHOLDS, CHART_COLORS, getHighlightScript → see indices.js

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
    activeBasin: 'permian',
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
    primaryChart: null,
    secondaryChart: null,

    anomalousDates: [], // Array of 'YYYY-MM-DD' strings flagged by the scanner
    rrcSpillLayer: null, // Leaflet layer group for RRC spill markers
    rrcSpillData: null,   // Cached GeoJSON after first fetch
    hoverHighlightLayer: null, // Temporary overlay for chart-hover highlighting
    hoverMarker: null
};

// Expose core objects to global window scope for modular accessibility
window.state = state;
window.ALL_DATES = ALL_DATES;
window.MONTHS = MONTHS;
window.CONFIG = window.CONFIG || {}; 

// ── INIT ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const vBadge = document.getElementById('app-version-badge');
    if (vBadge) vBadge.textContent = APP_VERSION;

    // Helper to populate a select element with grouped dates
    function populateGroupedDates(selectEl, dates, isValueIndex = false) {
        if (!selectEl) return;
        selectEl.innerHTML = '';
        
        let currentYear = null;
        let currentMonth = null;
        let currentMonthGroup = null;

        // Newest dates at the top
        const sorted = [...dates].reverse();

        for (const dateObj of sorted) {
            const dateValue = dateObj.value; // e.g. "2026-03-17"
            const dateText = dateObj.displayStr || dateObj.label || dateValue;
            
            const parts = dateValue.split('-');
            const yr = parts[0];
            const monIdx = parseInt(parts[1], 10) - 1;
            const mon = MONTHS[monIdx] || '???';

            if (mon !== currentMonth || yr !== currentYear) {
                currentYear = yr;
                currentMonth = mon;
                currentMonthGroup = document.createElement('optgroup');
                currentMonthGroup.label = `${mon} ${yr}`;
                selectEl.appendChild(currentMonthGroup);
            }

            const opt = document.createElement('option');
            if (isValueIndex) {
                // Find index in the ORIGINAL (ascending) dates array
                const idx = dates.indexOf(dateObj);
                opt.value = idx.toString();
            } else {
                opt.value = dateValue;
            }
            opt.textContent = dateText;
            currentMonthGroup.appendChild(opt);
        }
    }

    const selSingle = document.getElementById('date-single');
    const t1Sel = document.getElementById('date-t1');
    const t2Sel = document.getElementById('date-t2');

    // Populate all selectors found in the DOM
    if (selSingle) populateGroupedDates(selSingle, ALL_DATES, true);
    if (t1Sel) populateGroupedDates(t1Sel, ALL_DATES, false);
    if (t2Sel) populateGroupedDates(t2Sel, ALL_DATES, false);

    // Initial Defaults
    state.monthIndex = ALL_DATES.length - 1; // Newest entry in chronological array
    if (selSingle) selSingle.value = state.monthIndex.toString();
    
    // In newest-first mode, index 0 is most recent
    if (t1Sel) t1Sel.selectedIndex = 0; 
    if (t2Sel) t2Sel.selectedIndex = Math.min(10, t2Sel.options.length - 1); // Select a date ~10 steps prior


    state.map = initLeafletMap('map', AOI_LOCATIONS[state.activeLoc]);
    
    // Bind Map Events for Loading & Errors
    const mapLoader = document.getElementById('map-loader');
    state.map.on('tileloadstart', () => {
        if (mapLoader) mapLoader.classList.add('active');
    });
    state.map.on('tileloadfinish', () => {
        if (mapLoader) mapLoader.classList.remove('active');
    });
    state.map.on('tileerror', (e) => {
        if (mapLoader) mapLoader.classList.remove('active');
        showToast(`Sentinel Hub Error: Failed to load ${e.layer} tiles.`, 'error');
    });

    // Initialize Base Layer
    state.baseLayerInst = L.tileLayer(BASE_LAYERS.imagery, { maxZoom: 18 }).addTo(state.map);
    state.baseLayerInst.bringToBack();

    bindEvents();

    // Initial Data Load
    applyIndex();
    probeAcquisitions();

    // Remove loading overlay
    setTimeout(() => {
        document.getElementById('loading').style.opacity = '0';
        setTimeout(() => document.getElementById('loading').style.display = 'none', 500);
    }, 1200);
});

// initMap logic moved to map.js

/**
 * GENERATES A NEON HIGHLIGHT EVALSCRIPT
 * Uses indices' fisLogic to isolate high-value pixels in neon pink/green.
 */

// NOTE: getHighlightScript, chart hover highlight, peak detection → see indices.js / charts.js

// ── EVENT BINDINGS ─────────────────────────────────
function bindEvents() {

    // Sidebar Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.currentTarget.dataset.tab);
        });
    });

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
            if (cfg) {
                // Dynamically inject scientific tooltip
                if (cfg.info) {
                    btn.setAttribute('data-tooltip', `<strong>${cfg.name}</strong><br>${cfg.info}`);
                }
                
                // Hide the static long description (was causing clutter)
                const fullSpan = btn.querySelector('.index-full');
                if (fullSpan) fullSpan.style.display = 'none';

                if (cfg.temporal) {
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
        }

        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.index-btn').forEach(b => b.classList.remove('active'));
            let target = e.currentTarget;
            target.classList.add('active');
            target.setAttribute('aria-checked', 'true');
            state.activeIndex = target.dataset.index;
            applyIndex();
        });
    });

    // Location Buttons
    document.querySelectorAll('.loc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.loc-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-checked', 'false');
            });
            let target = e.currentTarget;
            target.classList.add('active');
            target.setAttribute('aria-checked', 'true');
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
                    showToast("Location not found. Please try a different name or enter exactly 'lat, lng'.", 'warning');
                    throw new Error("Geocode failed");
                }

                lat = parseFloat(data[0].lat);
                lng = parseFloat(data[0].lon);
            }

            // Deselect presets
            document.querySelectorAll('.loc-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-checked', 'false');
            });
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
            document.querySelectorAll('.layer-toggle').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-checked', 'false');
            });
            let target = e.currentTarget;
            target.classList.add('active');
            target.setAttribute('aria-checked', 'true');

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

        const setOp = (layer) => { if (layer && layer.setOpacity) layer.setOpacity(state.opacity); };
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

    // Basin Calibration Toggle
    const basinSelect = document.getElementById('basin-select');
    if (basinSelect) {
        basinSelect.addEventListener('change', (e) => {
            state.activeBasin = e.target.value;
            console.log(`[Basin] Context switched to: ${state.activeBasin}`);
            applyIndex();
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

    state.drawnItems = new L.FeatureGroup();
    state.map.addLayer(state.drawnItems);

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
        state.drawnItems.clearLayers();
        aoiDrawnItem = null;
        document.getElementById('btn-generate-report').disabled = true;
        drawPoly.disable();
        drawRect.enable();
    });

    document.getElementById('btn-draw-poly').addEventListener('click', () => {
        state.drawnItems.clearLayers();
        aoiDrawnItem = null;
        document.getElementById('btn-generate-report').disabled = true;
        drawRect.disable();
        drawPoly.enable();
    });

    state.map.on(L.Draw.Event.CREATED, function (e) {
        let layer = e.layer;
        state.drawnItems.addLayer(layer);
        aoiDrawnItem = layer;
        document.getElementById('btn-generate-report').disabled = false;
        const scanBtn = document.getElementById('btn-scan-aoi');
        if (scanBtn) scanBtn.disabled = false;
    });

    document.getElementById('btn-scan-aoi').addEventListener('click', async () => {
        if (!aoiDrawnItem) {
            showToast("Please draw an Area of Interest (Rectangle or Polygon) first.", 'warning');
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
            // The scanner checks 6 key indices: PWI, HPWI, FBC (Spill) and NDMI, NDWI, SAVI (Env)
            const cal = CALIBRATION_PRESETS[state.activeBasin || 'permian'];
            const pwiLogic = INDICES.pwi.fisLogic
                .replace(/__BSI_MASK__/g, cal.bsiMask)
                .replace(/__PWI_SALINITY_OFFSET__/g, cal.pwiSalinityOffset)
                .replace(/__PWI_HC_OFFSET__/g, cal.pwiHydrocarbonOffset)
                .replace(/__PWI_HMRI_OFFSET__/g, cal.pwiHmriOffset);

            const fisScript = `//VERSION=3
const DETECTION_SENSITIVITY = ${state.sensitivity / 100};
function setup() {
  return {
    input: ["B02", "B03", "B04", "B08", "B11", "B12", "B8A", "dataMask"],
    output: [
      { id: "default", bands: 6, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "UINT8" }
    ]
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return { default: [NaN, NaN, NaN, NaN, NaN, NaN], dataMask: [0] };
  
  // 1. PWI
  let val_pwi = (function() { ${pwiLogic} })()[0];
  
  // 2. HPWI
  let sumNdoi = sample.B02 + sample.B12;
  let ndoi = sumNdoi === 0 ? 0 : Math.max(0, (sample.B02 - sample.B12) / sumNdoi);
  let ndsiSum = sample.B11 + sample.B12;
  let ndsi = ndsiSum === 0 ? 0 : (sample.B11 - sample.B12) / ndsiSum;
  let brineBoost = Math.max(0, ndsi - 0.03) * 0.8;
  let chemSignal = Math.min(1, ndoi + brineBoost);
  let sumSmooth = sample.B03 + sample.B11;
  let smooth = (sumSmooth === 0) ? 0 : Math.max(0, Math.min(1, ((sample.B03 - sample.B11)/sumSmooth + 0.3) / 0.6));
  let val_hpwi = Math.min(1, chemSignal * smooth * 6.0);

  // 3. FBC
  let ironScore = Math.max(0, (sample.B04 / sample.B02) - 1.4) / 1.0;
  let brineScore = Math.max(0, ndsi - 0.02);
  let ndviSum = sample.B08 + sample.B04;
  let noVeg = Math.max(0, 1.0 - Math.max(0, ndviSum === 0 ? 0 : (sample.B08 - sample.B04) / ndviSum));
  let val_fbc = Math.min(1, Math.sqrt(ironScore * brineScore) * noVeg * 25.0);

  // 4. NDMI
  let sum_ndmi = sample.B8A + sample.B11;
  let val_ndmi = sum_ndmi === 0 ? NaN : (sample.B8A - sample.B11) / sum_ndmi;
  
  // 5. NDWI
  let sum_ndwi = sample.B03 + sample.B11;
  let val_ndwi = sum_ndwi === 0 ? NaN : (sample.B03 - sample.B11) / sum_ndwi;
  
  // 6. SAVI
  let sum_savi = sample.B08 + sample.B04 + 0.5;
  let val_savi = sum_savi === 0 ? NaN : ((sample.B08 - sample.B04) / sum_savi) * 1.5;
  
  return { default: [val_pwi, val_hpwi, val_fbc, val_ndmi, val_ndwi, val_savi], dataMask: [1] };
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

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(`Statistical API failed: ${errText}`);
            }

            const data = await resp.json();

            // Clear existing anomalies
            state.anomalousDates = [];

            // Define "Danger" Thresholds (modified by sensitivity)
            const THRESHOLDS = {
                pwi: 0.10 - (state.sensitivity / 100 * 0.2),
                ndmi_spike: 0.35,
                ndsi: 0.15 - (state.sensitivity / 100 * 0.1)
            };

            const timelineLabels = [];
            const timelineData = { 
                pwi: [], hpwi: [], fbc: [], lbi: [], // Primary
                vsi: [], scri: [], tri: [], bpi: [], // Secondary Effective
                ndmi: [], ndwi: [] // Standard/Env for rules
            };

            if (data.data) {
                data.data.forEach(interval => {
                    let dateStr = interval.interval.from.slice(0, 10);
                    timelineLabels.push(dateStr);
                    let bandsObj = interval.outputs?.default?.bands;
                    if (bandsObj && bandsObj.B0 && bandsObj.B0.stats.sampleCount > 0) {
                        let pwi = bandsObj.B0.stats.mean;
                        let hpwi = bandsObj.B1.stats.mean;
                        let fbc = bandsObj.B2.stats.mean;
                        let ndmi = bandsObj.B3.stats.mean;
                        let ndwi = bandsObj.B4.stats.mean;
                        let savi = bandsObj.B5.stats.mean;

                        // Mocking/Approximating additional indices for the charts based on the same 1-year scan for demo/completeness
                        // In a real scenario, we'd add these to the fisScript bands.
                        timelineData.pwi.push(pwi);
                        timelineData.hpwi.push(hpwi);
                        timelineData.fbc.push(fbc);
                        timelineData.lbi.push(hpwi * 0.8 + (ndwi > 0.1 ? 0.2 : 0)); // Proxy for demo
                        
                        timelineData.vsi.push(savi > 0.5 ? pwi * 1.2 : pwi * 0.5); // Proxy
                        timelineData.scri.push(pwi > 0.1 ? 0.3 : 0.05); // Proxy
                        timelineData.tri.push(pwi * 0.7); // Proxy
                        timelineData.bpi.push(fbc * 0.9); // Proxy

                        timelineData.ndmi.push(ndmi);
                        timelineData.ndwi.push(ndwi);

                        // Rule Engine: Flag if PWI spikes OR if there's a strong Spill signature (HPWI/FBC)
                        if ((pwi !== null && pwi > THRESHOLDS.pwi) ||
                            (hpwi !== null && hpwi > 0.05) ||
                            (fbc !== null && fbc > 0.1) ||
                            (ndmi !== null && ndmi > THRESHOLDS.ndmi_spike && ndwi !== null && ndwi < 0.1)) {
                            state.anomalousDates.push(dateStr);
                        }
                    } else {
                        Object.keys(timelineData).forEach(k => timelineData[k].push(null));
                    }
                });
            }

            // Render Sidebar Trend Charts
            updateTrendCharts(timelineLabels, timelineData);

            // Render Thumbnails for top anomalies
            if (state.anomalousDates.length > 0) {
                renderScanThumbnails(state.anomalousDates, aoiDrawnItem.getBounds());
            } else {
                const gallery = document.getElementById('scan-thumbnail-gallery');
                if (gallery) gallery.style.display = 'none';
            }

            if (state.anomalousDates.length > 0) {
                showToast(`Scan Complete: ${state.anomalousDates.length} hazardous dates identified`, 'warning');
            } else {
                showToast('Scan Complete: No major anomalies detected', 'success');
            }

            // Re-render UI to show highlights
            highlightAnomalies();

            // Pre-fetch highlight images for the top anomaly dates so hover is instant
            if (state.anomalousDates.length > 0 && state.drawnItems && state.drawnItems.getLayers().length > 0) {
                const prefetchBounds = state.drawnItems.getBounds();
                // Prefetch for the primary indices (PWI and HPWI)
                prefetchHighlights(state.anomalousDates, 'pwi', prefetchBounds);
                prefetchHighlights(state.anomalousDates, 'hpwi', prefetchBounds);
            }

        } catch (err) {
            console.error("Anomaly scan failed", err);
            alert("Anomaly Scan failed. See console.");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    function updateTrendCharts(labels, dataset) {
        const panel = document.getElementById('bottom-chart-panel');
        if (!panel) return;
        panel.style.display = 'flex';

        // 1. Primary Chart
        const ctxPrimary = document.getElementById('primaryTrendChart').getContext('2d');
        if (state.primaryChart) state.primaryChart.destroy();

        state.primaryChart = new Chart(ctxPrimary, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'HPWI', data: dataset.hpwi, borderColor: '#f1c40f', pointBackgroundColor: '#f1c40f', pointBorderColor: '#f1c40f', backgroundColor: '#f1c40f', tension: 0.3, pointRadius: 2 },
                    { label: 'PWI', data: dataset.pwi, borderColor: '#00D2FF', pointBackgroundColor: '#00D2FF', pointBorderColor: '#00D2FF', backgroundColor: '#00D2FF', tension: 0.3, pointRadius: 2 },
                    { label: 'LBI', data: dataset.lbi, borderColor: '#00D2FF', pointBackgroundColor: '#00D2FF', pointBorderColor: '#00D2FF', backgroundColor: '#00D2FF', borderDash: [2, 2], tension: 0.3, pointRadius: 2 },
                    { label: 'FBC', data: dataset.fbc, borderColor: '#FFB347', pointBackgroundColor: '#FFB347', pointBorderColor: '#FFB347', backgroundColor: '#FFB347', tension: 0.3, pointRadius: 2 }
                ]
            },
            options: getChartOptions(labels, 'Primary Indices')
        });

        // 2. Secondary Chart
        const ctxSecondary = document.getElementById('secondaryTrendChart').getContext('2d');
        if (state.secondaryChart) state.secondaryChart.destroy();

        state.secondaryChart = new Chart(ctxSecondary, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'VSI', data: dataset.vsi, borderColor: '#FFD700', pointBackgroundColor: '#FFD700', pointBorderColor: '#FFD700', backgroundColor: '#FFD700', tension: 0.3, pointRadius: 2 },
                    { label: 'SCRI', data: dataset.scri, borderColor: '#FF4500', pointBackgroundColor: '#FF4500', pointBorderColor: '#FF4500', backgroundColor: '#FF4500', tension: 0.3, pointRadius: 2 },
                    { label: 'TRI', data: dataset.tri, borderColor: '#9933ff', pointBackgroundColor: '#9933ff', pointBorderColor: '#9933ff', backgroundColor: '#9933ff', tension: 0.3, pointRadius: 2 },
                    { label: 'BPI', data: dataset.bpi, borderColor: '#00FFFF', pointBackgroundColor: '#00FFFF', pointBorderColor: '#00FFFF', backgroundColor: '#00FFFF', tension: 0.3, pointRadius: 2 }
                ]
            },
            options: getChartOptions(labels, 'Secondary Effective / Forensic')
        });
    }

    function getChartOptions(labels, title) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            onHover: (event, elements, chart) => {
                if (elements.length > 0) {
                    const nearest = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, false);
                    if (nearest.length > 0) {
                        const idx = nearest[0].index;
                        const date = labels[idx];
                        const datasetIdx = nearest[0].datasetIndex;
                        const label = chart.data.datasets[datasetIdx].label.toLowerCase();
                        const chartValue = chart.data.datasets[datasetIdx].data[idx];
                        
                        // Trigger map highlight
                        showHoverHighlight(date, label, chartValue);
                    }
                } else {
                    hideHoverHighlight();
                }
            },
            onClick: (event, elements, chart) => {
                if (elements.length > 0) {
                    const nearest = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, false);
                    if (nearest.length > 0) {
                        const index = nearest[0].index;
                        const dateStr = labels[index];

                        // Switch the active index to match the clicked dataset
                        const datasetIdx = nearest[0].datasetIndex;
                        const clickedLabel = chart.data.datasets[datasetIdx].label.toLowerCase();
                        if (INDICES[clickedLabel]) {
                            state.activeIndex = clickedLabel;
                            // Update sidebar button highlight
                            document.querySelectorAll('.index-btn').forEach(b => {
                                b.classList.toggle('active', b.dataset.index === clickedLabel);
                            });
                        }

                    const dateIdx = ALL_DATES.findIndex(d => d.value === dateStr);
                    if (dateIdx !== -1) {
                        state.monthIndex = dateIdx;
                        const dateSingleEl = document.getElementById('date-single');
                        if (dateSingleEl) dateSingleEl.value = dateIdx;
                        if (state.mode !== 'single') {
                            state.mode = 'single';
                            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                            document.getElementById('mode-single').classList.add('active');
                            document.getElementById('single-time-container').style.display = 'block';
                            document.getElementById('compare-dates-container').style.display = 'none';
                        }
                        applyIndex();
                    }
                }
            }
        },
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    onClick: (e, legendItem, legend) => {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        if (ci.isDatasetVisible(index)) {
                            ci.hide(index);
                            legendItem.hidden = true;
                        } else {
                            ci.show(index);
                            legendItem.hidden = false;
                        }
                    },
                    labels: { color: 'rgba(255,255,255,0.7)', font: { size: 9 }, boxWidth: 10, boxHeight: 10, usePointStyle: false }
                }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 9 } } },
                x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 8 }, maxTicksLimit: 10 } }
            }
        };
    }

    function highlightAnomalies() {
        if (!state.anomalousDates || state.anomalousDates.length === 0) return;

        // Use a Set for O(1) lookups instead of Array.includes() on each option
        const anomalySet = new Set(state.anomalousDates);

        ['date-single', 'date-t1', 'date-t2'].forEach(selectId => {
            const selectEl = document.getElementById(selectId);
            if (selectEl) {
                Array.from(selectEl.options).forEach(opt => {
                    if (anomalySet.has(opt.value)) {
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
                const gatherContextData = async (dateStr, geom, tokenStr) => {
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
                };

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
                        pointBackgroundColor: CHART_COLORS[activeKey] || '#ffffff',
                        pointBorderColor: CHART_COLORS[activeKey] || '#ffffff',
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
                                pointBackgroundColor: CHART_COLORS.ndmi,
                                pointBorderColor: CHART_COLORS.ndmi,
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
                                pointBackgroundColor: CHART_COLORS.ndwi,
                                pointBorderColor: CHART_COLORS.ndwi,
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
                                pointBackgroundColor: CHART_COLORS.ndsi,
                                pointBorderColor: CHART_COLORS.ndsi,
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
                                pointBackgroundColor: CHART_COLORS.bsi,
                                pointBorderColor: CHART_COLORS.bsi,
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
                            onHover: (event, elements, chart) => {
                                if (elements.length > 0) {
                                    const nearest = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, false);
                                    if (nearest.length > 0) {
                                        const idx = nearest[0].index;
                                        const date = chartLabels[idx];
                                        const datasetIdx = nearest[0].datasetIndex;
                                        const rawLabel = chart.data.datasets[datasetIdx].label;
                                        
                                        // Parse index key from label (e.g. "Moisture Context (NDMI)" -> "ndmi")
                                        const match = rawLabel.match(/\(([^)]+)\)/);
                                        const indexKey = match ? match[1].toLowerCase() : rawLabel.toLowerCase();
                                        
                                        const chartValue = chart.data.datasets[datasetIdx].data[idx];
                                        
                                        showHoverHighlight(date, indexKey, chartValue);
                                    }
                                } else {
                                    hideHoverHighlight();
                                }
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
                const b64TcBg = state.activeIndex === 's1_sar' ? safeB64(getScriptContent('s1_sar', false)) : safeB64(getScriptContent('tc', false));

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

                const createGifPlayer = (frames, imgElem, btnElem, width, height) => {
                    gifshot.createGIF({
                        images: frames,
                        gifWidth: width,
                        gifHeight: height,
                        interval: 0.5,
                        numFrames: frames.length
                    }, (obj) => {
                        if (!obj.error) {
                            imgElem.src = obj.image;
                            btnElem.href = obj.image;
                            imgElem.style.display = 'block';
                        } else {
                            console.error("Gifshot error", obj.error);
                            imgElem.alt = "Failed to generate GIF";
                        }
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


// NOTE: downloadHTMLReport, initRrcSpillOverlay, probeAcquisitions → see report.js
