import './mocks.mjs';
/* ==========================================================================
   Limn - Core Logic (ES Module Entry Point)
   ========================================================================== */

import { getCDSEToken } from './auth.js';
import { verifiedBookmarks } from './verifiedBookmarks.js';
import { authorshipClaims } from './authorshipClaims.js';
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
    PALETTE_MSI_INV,
    CHART_COLORS
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
    closeReportModal,
    initRrcSpillOverlay,
    downloadHTMLReport
} from './report.js';
import {
    initLeafletMap,
    applyIndex as applyIndexDelegate,
    updateGifInset as updateGifInsetDelegate,
    getScriptContent,
    getWMSLayer
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

// Confirmed produced water spill incidents — all sourced from TRRC, NMED, or news.
// Coordinates are approximate (derived from geographic anchors, not survey data).
const SPILL_BOOKMARKS = [
    {
        id: 'lake-boehmer-pecos-orphan',
        label: 'Lake Boehmer (Imperial, TX)',
        date: '2021-01-01',
        displayDate: 'Continuous',
        lat: 31.224, lng: -102.729, zoom: 13,
        volume: 'Chronic Brine Lake (60+ acres)',
        source: 'Wikipedia / Marfa Public Radio',
        confidence: 'High (Exact GPS)',
        note: 'The ultimate calibration site. 60-acre hyper-saline lake in Pecos County continuously fed by a legacy 1951 Gulf Oil dry hole. Shows exceptionally strong PWCI, ASAI, and OBEC signatures across all acquisitions.'
    },
    {
        id: 'meister-2022',
        label: 'Meister Ranch Geyser',
        date: '2022-01-01',
        displayDate: 'Jan 2022',
        lat: 31.3826, lng: -102.6171, zoom: 14,
        volume: '~357,000 bbl over 14 days',
        source: 'TRRC / Karanam et al. 2024 (GRL)',
        confidence: 'High (Exact GPS)',
        note: 'Abandoned 194 Gulf Oil dry hole erupted a 100-ft brine geyser due to SWD injection-induced overpressure. Fuses high salinity with a specular surface smoothness proxy.'
    },
    {
        id: 'crane-crevice-2023',
        label: 'FM 329 Crevice, Crane Co.',
        date: '2023-12-07',
        displayDate: 'Dec 2023',
        lat: 31.370, lng: -102.620, zoom: 13,
        volume: '~14M gallons over 45 days',
        source: 'TRRC / Marfa Public Radio',
        confidence: 'Medium (~0.5km)',
        note: '300-ft ground crevice emitting 13,000 gal/hr of saline produced water, causing a 30-acre vegetation kill zone. RRC plugging cost $2.5M.'
    },
    {
        id: 'toyah-2024',
        label: 'Toyah Well Blowout',
        date: '2024-10-02',
        displayDate: 'Oct 2024',
        lat: 31.320, lng: -103.872, zoom: 14,
        volume: 'Active 19 days (volume unquantified)',
        source: 'TRRC / Texas Tribune / DeSmog',
        confidence: 'Medium (~1km)',
        note: '100-ft geyser of oily saline brine + H₂S gas from a 1961 dry hole, requiring local emergency response. Cleanly isolates using PWCI and OBEC.'
    },
    {
        id: 'apache-balmorhea-2020',
        label: 'Apache Corp. Balmorhea Spill',
        date: '2021-01-01',
        displayDate: 'Jul 2020',
        lat: 31.130, lng: -103.745, zoom: 13,
        volume: '77,500 BBL Produced Water',
        source: 'TRRC / Inside Climate News',
        confidence: 'Medium (~1km)',
        note: 'Massive produced water storage tank battery blowout north of Balmorhea. Heavy salt crystallization and vegetative damage documented on TRRC inspections persist in Sentinel imagery.'
    },
    {
        id: 'antina-ranch-2020',
        label: 'Antina Ranch (Chevron Estes)',
        date: '2020-12-10',
        displayDate: 'Dec 2020',
        lat: 31.50, lng: -102.85, zoom: 13,
        volume: 'Chronic Leaking Brine + Methane',
        source: 'TRRC / Inside Climate News',
        confidence: 'Regional (±10km)',
        note: 'Orphaned wells on Crane/Ward County ranch leaked highly saline wastewater and gas. Chevron settled landmark legacy-liability lawsuit with landowner in Dec 2025.'
    },
    {
        id: 'enlink-midstream-chickadee-2023',
        label: 'Midland Crude Spill (EnLink)',
        date: '2023-03-29',
        displayDate: 'Mar 2023',
        lat: 31.840, lng: -102.078, zoom: 13,
        volume: '9,583 BBL Crude Oil',
        source: 'Pipeline Safety Trust / EPA',
        confidence: 'Medium (~1.5km)',
        note: 'El Dorado Crude Station pipeline rupture south of Midland. 400,000+ gal of crude spilled. Crucial cross-calibration site: should spike HCAI (Hydrocarbons) but *not* brine/salinity (PWCI/ASAI).'
    },
    {
        id: 'eog-klondike-2025',
        label: 'EOG Klondike Pit, Eddy Co. NM',
        date: '2025-05-01',
        displayDate: 'Q2 2025',
        lat: 32.24, lng: -103.57, zoom: 13,
        volume: '~160,000 gal spilled, ~143,000 gal lost',
        source: 'NMED / WildEarth Guardians',
        confidence: 'Regional (±15km)',
        note: 'Equipment failure overflow at a produced water recycling pit on New Mexico State Trust Land, damaging over 20 acres of high-desert scrub.'
    },
    {
        id: 'oxy-mesa-verde-2025',
        label: 'OXY Mesa Verde East, NM',
        date: '2025-07-15',
        displayDate: 'Jul 2025',
        lat: 32.25, lng: -103.63, zoom: 13,
        volume: '~1.6M gal produced water + 126k gal crude',
        source: 'NMED / WildEarth Guardians',
        confidence: 'Regional (±5km)',
        note: 'Huge wastewater recycling facility failure on federal land in southeast New Mexico. One of the largest inland spills of Q3 2025.'
    }
];

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

const internalAppConfig = {
    SH_WMS_URL,
    SH_STAT_API_URL,
    ALL_DATES,
    INDICES,
    START_YEAR
};

// Modular Delegations
function applyIndex(isScrubbing = false) {
    applyIndexDelegate(state, window.CONFIG || internalAppConfig, isScrubbing);
    updateUI();
}
window.applyIndex = applyIndex;
window.downloadHTMLReport = downloadHTMLReport;

function updateUI() {
    updateUIDelegate(state, INDICES);
    
    // Geochemical Basin & Sensitivity Calibration UI Isolation
    const SPILL_INDEX_KEYS = ['pwi', 'pwoi', 'hpwi', 'lbi', 'fbc', 'reai', 'vcbi', 'aoi', 'cma', 'hmi', 'phi', 'tri', 'bpi', 'mvpi'];
    const isSpillIndex = SPILL_INDEX_KEYS.includes(state.activeIndex);
    
    const settingsContainers = document.querySelectorAll('#tab-settings .control-group');
    settingsContainers.forEach(container => {
        // Exclude opacity control from calibration isolation
        if (container.classList.contains('op-control')) return;
        
        const select = container.querySelector('select');
        const slider = container.querySelector('input[type="range"]');
        
        if (!isSpillIndex) {
            container.style.opacity = '0.4';
            container.style.pointerEvents = 'none';
            container.style.position = 'relative';
            
            // Add a clean overlay message if not already present
            let msgOverlay = container.querySelector('.calibration-overlay-msg');
            if (!msgOverlay) {
                msgOverlay = document.createElement('div');
                msgOverlay.className = 'calibration-overlay-msg';
                msgOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(10,11,20,0.45);color:var(--text-muted);font-size:9px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.05em;pointer-events:all;cursor:not-allowed;text-align:center;padding:0 12px;z-index:10;';
                msgOverlay.innerText = 'Spill Calibration Inactive';
                container.appendChild(msgOverlay);
            }
            if (select) select.disabled = true;
            if (slider) slider.disabled = true;
        } else {
            container.style.opacity = '1';
            container.style.pointerEvents = 'all';
            const msgOverlay = container.querySelector('.calibration-overlay-msg');
            if (msgOverlay) msgOverlay.remove();
            if (select) select.disabled = false;
            if (slider) slider.disabled = false;
        }
    });
}
window.updateUI = updateUI;

function updateGifInset() {
    updateGifInsetDelegate(state, window.CONFIG || internalAppConfig);
}

function showToast(message, type = 'info') {
    showToastDelegate(message, type);
}

// Globals for Report Generation (Exposed for report.js and charts.js)
window.aoiDrawnItem = null;
window.reportChartInst = null;
window.primaryChartInst = null;
window.secondaryChartInst = null;
window.reportMapInst = null;
window.reportDiffMapInst = null;

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
    compareType: 'swipe', // 'swipe' | 'diff' | 'cumulative'
    monthIndex: Math.max(0, ALL_DATES.length - 1),
    sarFusion: false, // track the state of the SAR Overlay toggle
    hlsEnabled: false, // NASA HLS temporal booster
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
window.CONFIG = Object.assign(window.CONFIG || {}, internalAppConfig);
window.ALL_DATES = ALL_DATES;
window.MONTHS = MONTHS;

// ── Civic Atlas & Authorship Helpers ─────────────────
export function updateAuthorshipCard(indexKey) {
    const card = document.getElementById('authorship-card');
    const title = document.getElementById('authorship-title');
    const claimStatus = document.getElementById('authorship-claim-status');
    const ownable = document.getElementById('authorship-ownable-details');
    const priorArt = document.getElementById('authorship-prior-art');

    if (!card) return;

    const claimData = authorshipClaims[indexKey];
    if (!claimData) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';
    if (title) title.textContent = INDICES[indexKey].name;
    if (claimStatus) {
        claimStatus.textContent = claimData.strength;
        claimStatus.className = 'claim-badge ' + (claimData.strength.toLowerCase().includes('very high') || claimData.strength.toLowerCase().includes('high') ? 'claim-badge--ownable' : 'claim-badge--shared');
    }
    if (ownable) ownable.textContent = claimData.claim;
    if (priorArt) priorArt.textContent = claimData.doNotClaim + ' ' + claimData.why;
}
window.updateAuthorshipCard = updateAuthorshipCard;

export function renderSpillBookmarks(indexKey = state.activeIndex) {
    const spillList = document.getElementById('spill-bookmark-list');
    if (!spillList) return;
    spillList.innerHTML = '';

    const isCivic = [
        'bhdfsi', 'peti', 'mppdi', 'ttapi', 'ecaci', 'lrdvsi', 
        'tdrasi', 'sfeii', 'wdacsi', 'cduai', 'csrc', 'trsi', 
        'lfgvi', 'swri', 'dwci', 'rrfi', 'epdi', 'hsai'
    ].includes(indexKey);

    const bookmarks = isCivic ? (verifiedBookmarks[indexKey] || []) : SPILL_BOOKMARKS;

    // Update section title & disclaimer conditionally
    const sectionTitle = document.querySelector('.spill-bookmarks-section h3');
    const sectionDisclaimer = document.querySelector('.spill-disclaimer');
    if (isCivic) {
        if (sectionTitle) sectionTitle.textContent = 'Curated Calibration Events';
        if (sectionDisclaimer) sectionDisclaimer.textContent = 'Global scientific validation scenarios';
    } else {
        if (sectionTitle) sectionTitle.textContent = 'Confirmed Spill Sites';
        if (sectionDisclaimer) sectionDisclaimer.textContent = 'TRRC/NMED confirmed · coordinates approximate';
    }

    bookmarks.forEach(spill => {
        const btn = document.createElement('button');
        btn.className = 'spill-bookmark-btn';
        btn.dataset.spillId = spill.id || spill.label.replace(/\s+/g, '-').toLowerCase();
        
        let tooltipText = '';
        if (isCivic) {
            tooltipText = `<strong>${spill.label}</strong><br>${spill.note}<br><br>📅 ${spill.date}<br>📡 ${spill.sourceLabel}`;
        } else {
            tooltipText = `<strong>${spill.label}</strong><br>${spill.note}<br><br>📅 ${spill.displayDate} &nbsp;|&nbsp; 📦 ${spill.volume}<br>📡 ${spill.source}<br>⚠ Coords: ${spill.confidence}`;
        }
        btn.setAttribute('data-tooltip', tooltipText);
        
        const displayDate = isCivic ? spill.date : spill.displayDate;
        btn.innerHTML = `<span class="spill-name">${spill.label}</span><span class="spill-date-tag">${displayDate}</span>`;
        
        btn.addEventListener('click', () => {
            // Find closest date in ALL_DATES
            const targetStr = spill.date; // e.g. "2018-01-09"
            const target = new Date(targetStr).getTime();
            let closestIdx = 0, minDiff = Infinity;
            ALL_DATES.forEach((d, i) => {
                const diff = Math.abs(new Date(d.value).getTime() - target);
                if (diff < minDiff) { minDiff = diff; closestIdx = i; }
            });

            // Set date
            state.monthIndex = closestIdx;
            const dateSingleEl = document.getElementById('date-single');
            if (dateSingleEl) dateSingleEl.value = closestIdx.toString();

            // Fly to location
            document.getElementById('disp-lat').innerText = spill.lat.toFixed(4) + '°';
            document.getElementById('disp-lng').innerText = spill.lng.toFixed(4) + '°';
            state.map.flyTo([spill.lat, spill.lng], spill.zoom, { duration: 1.5 });

            // Deselect preset location buttons and spill buttons
            document.querySelectorAll('.loc-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.spill-bookmark-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Force single date mode on bookmark click for instant cloud-free imagery
            if (state.mode !== 'single') {
                const mSing = document.getElementById('mode-single');
                if (mSing) {
                    mSing.click();
                } else {
                    state.mode = 'single';
                    applyIndex();
                }
            } else {
                applyIndex();
            }
            setTimeout(() => probeAcquisitions(), 1600);
        });
        spillList.appendChild(btn);
    });
}
window.renderSpillBookmarks = renderSpillBookmarks;

export function renderCivicComposites() {
    const listContainer = document.getElementById('civic-composite-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const civicKeys = [
        'bhdfsi', 'peti', 'mppdi', 'ttapi', 'ecaci', 'lrdvsi', 
        'tdrasi', 'sfeii', 'wdacsi', 'cduai', 'csrc', 'trsi', 
        'lfgvi', 'swri', 'dwci', 'rrfi', 'epdi', 'hsai'
    ];

    civicKeys.forEach(idxKey => {
        const cfg = INDICES[idxKey];
        if (!cfg) return;

        const btn = document.createElement('button');
        btn.className = 'index-btn flex-column';
        btn.dataset.index = idxKey;
        btn.style.width = '100%';
        btn.style.textAlign = 'left';
        btn.style.padding = '12px 16px';
        btn.style.marginBottom = '8px';
        btn.style.display = 'flex';
        btn.style.flexDirection = 'column';
        btn.style.gap = '4px';

        // Tooltip
        const tooltipText = `<strong>${cfg.name}</strong><br>${cfg.info}`;
        btn.setAttribute('data-tooltip', tooltipText);

        btn.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span class="index-short" style="font-weight: 700; font-size: 13px; color: var(--accent-blue);">${idxKey.toUpperCase()}</span>
                <span class="temporal-badge temporal-${cfg.temporal.toLowerCase().replace(/ /g, '-').replace(/\//g, '-').replace(/\+/g, 'plus')}" style="font-size: 9px;">${cfg.temporal}</span>
            </div>
            <span class="index-full" style="font-size: 11px; font-weight: 500; color: #fff; opacity: 0.95;">${cfg.name}</span>
            <span style="font-size: 10px; color: var(--text-dim); font-family: var(--font-mono);">${cfg.formula}</span>
        `;

        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.index-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeIndex = idxKey;
            
            // Render Dynamic Bookmarks for this civic composite
            renderSpillBookmarks(idxKey);
            
            // Update Authorship Card
            updateAuthorshipCard(idxKey);
            
            applyIndex();
        });

        listContainer.appendChild(btn);
    });
}
window.renderCivicComposites = renderCivicComposites;

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
    renderCivicComposites();
    renderSpillBookmarks(state.activeIndex);
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


state.visualFilter = 0.75;
let out = getScriptContent({ INDICES }, 'ndmi', false, false, state);
console.log(out);
