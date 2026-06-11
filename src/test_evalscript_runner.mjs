import './mocks.mjs';
/* ==========================================================================
   Limn - Core Logic (ES Module Entry Point)
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
    probeAcquisitions as probeAcquisitionsFromReport,
    openReportModal,
    closeReportModal,
    initRrcSpillOverlay,
    downloadHTMLReport
} from './report.js?v=77';
import {
    initLeafletMap,
    applyIndex as applyIndexDelegate,
    updateGifInset as updateGifInsetDelegate,
    getScriptContent,
    getImageryProvider,
    getIndexLayer
} from './map.js?v=77';
import {
    showToast as showToastDelegate,
    switchTab,
    updateUI as updateUIDelegate
} from './ui.js?v=77';

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
        date: '2026-01-01',
        displayDate: 'Continuous',
        lat: 31.226, lng: -102.729, zoom: 14,
        volume: 'Chronic Brine Lake (60+ acres)',
        source: 'Wikipedia / Marfa Public Radio',
        sourceUrl: 'https://texasstandard.org/stories/lake-boehmer-toxic-water-oil-well-leak/',
        sourceUrls: [
            'https://texasstandard.org/stories/lake-boehmer-toxic-water-oil-well-leak/',
            'https://mapcarta.com/W461021594'
        ],
        evidenceClass: 'chronic-brine-positive',
        eventDate: 'continuous since ~2003',
        dateRole: 'representative continuous imagery date',
        confidence: 'High (Exact GPS)',
        note: 'The ultimate calibration site. 60-acre hyper-saline lake in Pecos County continuously fed by a legacy 1951 Gulf Oil dry hole. Current proof/support targets: OBEC and ASAI sharply isolate the standing brine lake, while LBI shows the active liquid-brine body. Strict PWCI intentionally stays off open water.',
        indices: ['hpwi', 'lbi', 'pwoi'],
    },
    {
        id: 'meister-2022',
        label: 'Meister Ranch Geyser',
        date: '2022-01-02',
        displayDate: 'Jan 2022',
        lat: 31.3826, lng: -102.6171, zoom: 15,
        volume: '~357,000 bbl over 14 days',
        source: 'TRRC / Karanam et al. 2024 (GRL)',
        sourceUrl: 'https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2024GL109435',
        sourceUrls: [
            'https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2024GL109435',
            'https://www.firstalert7.com/2022/01/28/rrc-reports-heavy-contamination-crane-county-blowout-source-water-pressure-still-unknown/'
        ],
        evidenceClass: 'produced-water-positive',
        eventDate: '2022-01-02/2022-01-14',
        dateRole: 'event-window imagery date',
        confidence: 'High (Exact GPS)',
        note: 'Abandoned 1946 Gulf Oil dry hole erupted a 100-ft brine geyser due to SWD injection-induced overpressure. Loop-reviewed proof path uses LBI at the documented coordinates and event-window date. PWCI and ASAI were blank at the measured proof frames, so this bookmark should demo liquid-brine signal rather than dry salt-crust chemistry.',
        indices: ['lbi'],
    },
    {
        id: 'crane-crevice-2023',
        label: 'FM 329 Crevice, Crane Co.',
        date: '2023-12-07',
        displayDate: 'Dec 2023',
        lat: 31.370, lng: -102.620, zoom: 14,
        volume: '~14M gallons over 45 days',
        source: 'TRRC / Marfa Public Radio',
        sourceUrl: 'https://www.marfapublicradio.org/environment/2024-02-05/state-spends-millions-to-plug-massive-well-leak-in-the-oil-fields-of-crane-county',
        sourceUrls: [
            'https://www.marfapublicradio.org/environment/2024-02-05/state-spends-millions-to-plug-massive-well-leak-in-the-oil-fields-of-crane-county',
            'https://bigbendsentinel.com/2024/01/10/railroad-commission-claims-gas-leak-to-hide-produced-water-destruction/'
        ],
        evidenceClass: 'produced-water-positive',
        eventDate: '2023-12-07',
        dateRole: 'event start imagery date',
        confidence: 'Medium (~0.5km)',
        note: '300-ft ground crevice emitting 13,000 gal/hr of saline produced water, causing a 30-acre vegetation kill zone. Loop-reviewed proof path uses LBI at the documented crevice coordinates; PWCI was blank under strict gates.',
        indices: ['lbi'],
    },
    {
        id: 'toyah-2024',
        label: 'Toyah Well Blowout',
        date: '2024-10-02',
        displayDate: 'Oct 2024',
        lat: 31.320, lng: -103.872, zoom: 15,
        volume: 'Active 19 days (volume unquantified)',
        source: 'TRRC / Texas Tribune / DeSmog',
        sourceUrl: 'https://www.texastribune.org/2024/10/22/west-texas-well-blowout-oil-gas-sealed/',
        sourceUrls: [
            'https://www.texastribune.org/2024/10/22/west-texas-well-blowout-oil-gas-sealed/',
            'https://www.desmog.com/2024/10/04/texas-railroad-commission-kinder-morgan-oil-well-blowout-erupts-in-west-texas-permian-basin/'
        ],
        evidenceClass: 'produced-water-positive',
        eventDate: '2024-10-02',
        dateRole: 'event start date',
        confidence: 'Medium (~1km)',
        note: '100-ft geyser of oily saline brine + H2S gas from a 1961 dry hole, requiring local emergency response. Current proof/support targets: OBEC gives the clearest pad-scale signal and LBI shows liquid-brine response; PWCI stays blank under strict gates.',
        indices: ['hpwi', 'lbi'],
    },
    {
        id: 'apache-balmorhea-2020',
        label: 'Apache Corp. Balmorhea Spill',
        date: '2021-01-01',
        displayDate: 'Jul 2020',
        lat: 31.130, lng: -103.745, zoom: 13,
        volume: '77,500 BBL Produced Water',
        source: 'TRRC / Inside Climate News',
        sourceUrl: 'https://texasstandard.org/stories/oil-and-gas-companies-spill-millions-of-gallons-of-wastewater-in-texas/',
        sourceUrls: [
            'https://texasstandard.org/stories/oil-and-gas-companies-spill-millions-of-gallons-of-wastewater-in-texas/'
        ],
        evidenceClass: 'produced-water-context',
        eventDate: '2020-07-29',
        dateRole: 'post-event residue imagery date',
        confidence: 'Medium (~1km)',
        note: 'Context-only bookmark. Massive produced water storage tank battery blowout north of Balmorhea. The current baseline found only weak broad residue/facility signal, so this is retained for source context rather than proof-grade index validation.',
        indices: [],
    },
    {
        id: 'antina-ranch-2021',
        label: 'Antina Ranch (Chevron Estes)',
        date: '2021-06-17',
        displayDate: 'Jun 2021',
        lat: 31.50, lng: -102.85, zoom: 13,
        volume: 'Chronic Leaking Brine + Methane',
        source: 'TRRC / Inside Climate News',
        sourceUrl: 'https://www.firstalert7.com/2021/06/17/abandoned-chevron-well-springs-leak-leaves-one-rancher-demanding-answers/',
        sourceUrls: [
            'https://www.firstalert7.com/2021/06/17/abandoned-chevron-well-springs-leak-leaves-one-rancher-demanding-answers/',
            'https://texasstandard.org/stories/west-texas-permian-basin-abondoned-orphan-oil-gas-wells-leaking/'
        ],
        evidenceClass: 'produced-water-context',
        eventDate: '2021-06-17',
        dateRole: 'documented report date',
        confidence: 'Regional (±10km)',
        note: 'Context-only regional bookmark. Orphaned wells on Crane/Ward County ranch leaked highly saline wastewater and gas. Loop review found OBEC/LBI context signal, but the source location remains regional rather than proof-grade GPS.',
        indices: ['hpwi', 'lbi'],
    },
    {
        id: 'enlink-midstream-chickadee-2023',
        label: 'Midland Crude Spill (EnLink)',
        date: '2023-03-29',
        displayDate: 'Mar 2023',
        lat: 31.840, lng: -102.078, zoom: 13,
        volume: '9,583 BBL Crude Oil',
        source: 'Pipeline Safety Trust / EPA',
        sourceUrl: 'https://pstrust.org/enlink-midstreams-chickadee-pipeline-ruptured-and-spilled-402486-gallons-of-crude-oil-just-south-of-midland-texas/',
        sourceUrls: [
            'https://pstrust.org/enlink-midstreams-chickadee-pipeline-ruptured-and-spilled-402486-gallons-of-crude-oil-just-south-of-midland-texas/'
        ],
        evidenceClass: 'hydrocarbon-negative-control',
        eventDate: '2023-03-29',
        dateRole: 'event date',
        confidence: 'Medium (~1.5km)',
        note: 'El Dorado Crude Station pipeline rupture south of Midland. 400,000+ gal of crude spilled. Negative-control target: PWCI and ASAI stay blank/weak here, supporting produced-water specificity against a crude-oil event.',
        indices: [],
    },
    {
        id: 'eog-klondike-2025',
        label: 'EOG Klondike Pit, Lea Co. NM',
        date: '2025-07-10',
        displayDate: 'Jun 2025',
        lat: 32.24, lng: -103.57, zoom: 14,
        volume: '~160,000 gal spilled, ~143,000 gal lost',
        source: 'NMED / WildEarth Guardians',
        sourceUrl: 'https://pdf.wildearthguardians.org/support_docs/20250728-Q2-2025-Oil-Gas-Waste-Watch.pdf',
        sourceUrls: [
            'https://pdf.wildearthguardians.org/support_docs/20250728-Q2-2025-Oil-Gas-Waste-Watch.pdf'
        ],
        evidenceClass: 'produced-water-context',
        eventDate: '2025-06-10',
        dateRole: 'post-event context imagery date',
        confidence: 'Regional (±15km)',
        note: 'Context-only regional bookmark. Equipment failure overflow at a produced water reuse pit on New Mexico State Trust Land in Lea County, damaging over 20 acres of high-desert scrub. Current context-support lenses are LBI, OBEC, and ASAI; source precision remains regional rather than proof-grade GPS.',
        indices: ['lbi', 'hpwi', 'pwoi'],
    },
    {
        id: 'oxy-mesa-verde-2025',
        label: 'OXY Mesa Verde East, NM',
        date: '2025-07-15',
        displayDate: 'Jul 2025',
        lat: 32.25, lng: -103.63, zoom: 12,
        volume: '~1.6M gal produced water + 126k gal crude',
        source: 'NMED / WildEarth Guardians',
        sourceUrl: 'https://pdf.wildearthguardians.org/site/DocServer/Q3%202025%20Waste%20Watch%20Report.pdf',
        sourceUrls: [
            'https://pdf.wildearthguardians.org/site/DocServer/Q3%202025%20Waste%20Watch%20Report.pdf'
        ],
        evidenceClass: 'produced-water-context',
        eventDate: '2025-07-15',
        dateRole: 'event date',
        confidence: 'Regional (±5km)',
        note: 'Context-only regional bookmark. Huge wastewater recycling facility failure on federal land in southeast New Mexico. Current context-support lenses are LBI plus moderate OBEC/ASAI; PWCI stays blank.',
        indices: ['lbi', 'hpwi', 'pwoi'],
    },
    {
        id: 'black-river-cimarex-2023',
        label: 'Black River PW Truck Rollover',
        date: '2023-10-03',
        displayDate: 'Oct 2023',
        lat: 32.219252, lng: -104.222885, zoom: 16,
        volume: '65 BBL Produced Water Lost',
        source: 'NMOCD closure report',
        sourceUrl: 'https://ocdimage.emnrd.nm.gov/imaging/Filestore/SantaFe/NF/20250224/nAPP2327753740_02_24_2025_11_30_44.pdf',
        sourceUrls: [
            'https://ocdimage.emnrd.nm.gov/imaging/Filestore/SantaFe/NF/20250224/nAPP2327753740_02_24_2025_11_30_44.pdf'
        ],
        evidenceClass: 'produced-water-context',
        eventDate: '2023-10-03',
        dateRole: 'event date',
        confidence: 'High (Exact GPS)',
        note: 'Cimarex/Coterra closure report documents a third-party truck rollover releasing produced water at the Black River / John D. Forehand Road crossing. The release is small for Sentinel-2, so use OBEC/LBI here as exact-location support context rather than a standalone proof-of-volume claim. Current ASAI is blank after stricter dry-brine gating.',
        indices: ['hpwi', 'lbi'],
    },
    {
        id: 'matador-desoto-spring-2025',
        label: 'Matador Desoto Spring Pond, NM',
        date: '2025-09-21',
        displayDate: 'Sep 2025',
        lat: 32.07605, lng: -103.28241, zoom: 16,
        volume: '6,354 BBL Produced Water',
        source: 'NMOCD NOR / WildEarth Guardians',
        sourceUrl: 'https://ocdimage.emnrd.nm.gov/imaging/filestore/SantaFe/NF/20250921/nAPP2526466779_09_21_2025_06_33_33.pdf',
        sourceUrls: [
            'https://ocdimage.emnrd.nm.gov/imaging/filestore/SantaFe/NF/20250921/nAPP2526466779_09_21_2025_06_33_33.pdf',
            'https://pdf.wildearthguardians.org/site/DocServer/Q3%202025%20Waste%20Watch%20Report.pdf'
        ],
        evidenceClass: 'produced-water-positive',
        eventDate: '2025-09-21',
        dateRole: 'event date',
        confidence: 'High (Facility GPS)',
        note: 'NMOCD notification documents a large Desoto Spring Recycling Pond produced-water release. Loop-reviewed proof defaults: OBEC and LBI produce a sharp pond-scale signal at the documented facility coordinates; PWCI stayed blank.',
        indices: ['hpwi', 'lbi', 'pwoi'],
    },
    {
        id: 'oxy-lea-flowline-2026',
        label: 'OXY Lea Flowline Release',
        date: '2026-05-24',
        displayDate: 'May 2026',
        lat: 32.692986, lng: -103.174825, zoom: 15,
        volume: '942 BBL Produced Water, 412 BBL Lost',
        source: 'NMOCD spill database',
        sourceUrl: 'https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/Spills/SpillSearchResults.aspx?Ogrid=16696&OperatorSearchClause=ogrid',
        sourceUrls: [
            'https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/Spills/SpillSearchResults.aspx?Ogrid=16696&OperatorSearchClause=ogrid'
        ],
        evidenceClass: 'produced-water-positive',
        eventDate: '2026-05-24',
        dateRole: 'event date',
        confidence: 'High (Exact NMOCD row)',
        note: 'NMOCD row nAPP2614556829 documents a major OXY produced-water release from an injection flowline in Lea County: 942 BBL released and 412 BBL lost. Current baseline support uses LBI; strict PWCI, ASAI, and OBEC are blank or weak in the available scene.',
        indices: ['lbi'],
    },
    {
        id: 'oxy-sand-dunes-2026',
        label: 'OXY Sand Dunes Water Tank',
        date: '2026-05-06',
        displayDate: 'May 2026',
        lat: 32.24671, lng: -103.78661, zoom: 16,
        volume: '500 BBL Produced Water, 160 BBL Lost',
        source: 'NMOCD spill database',
        sourceUrl: 'https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/Spills/SpillSearchResults.aspx?Ogrid=16696&OperatorSearchClause=ogrid',
        sourceUrls: [
            'https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/Spills/SpillSearchResults.aspx?Ogrid=16696&OperatorSearchClause=ogrid'
        ],
        evidenceClass: 'produced-water-context',
        eventDate: '2026-04-21',
        dateRole: 'post-event peak-signal imagery date',
        confidence: 'High (Exact NMOCD row)',
        note: 'NMOCD row nAPP2611452043 documents a major OXY Sand Dunes Water Tank Facility produced-water release in Eddy County: 500 BBL released and 160 BBL lost. Loop review found only a BPI facility/tank signal; this is context, not chemistry proof.',
        indices: ['bpi'],
    }
];

const INDEX_SHORT_LABELS = {
    pwi: 'PWCI', pwoi: 'ASAI', hpwi: 'OBEC', ehc: 'EHC', lbi: 'LBI', bpi: 'BPI', fbc: 'FBC', vsi: 'VSI', mvpi: 'MVPI',
};
const DEFAULT_SPILL_ID = 'lake-boehmer-pecos-orphan';
const DEFAULT_INDEX = 'hpwi';
const COG_PROVIDER_KEYS = new Set(['cog', 'sentinel-cog', 'sentinel2-cog']);
const COG_SUPPORTED_INDEX_KEYS = new Set(['none', 'tc', 'truecolor', 'true-color', 'pwi', 'hpwi', 'pwoi', 'lbi']);
const COG_SCREEN_INDEX_KEYS = new Set(['hpwi', 'lbi', 'pwoi', 'pwi']);

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



// Imagery provider configuration.
const SH_WMS_URL = 'https://sh.dataspace.copernicus.eu/ogc/wms/959ea2c5-5892-4b36-82b3-76e6bdb93c8a';
const SH_STAT_API_URL = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';

const APP_VERSION = 'v49';

const internalAppConfig = {
    IMAGE_PROVIDER: 'cog',
    GEE_TILE_ENDPOINT: '/api/gee/tiles',
    COG_TILE_ENDPOINT: '/api/cog/tiles',
    ALLOW_SENTINEL_FALLBACK: false,
    SENTINEL_CREDIT_GUARD: true,
    SENTINEL_LIVE_TILES: false,
    SENTINEL_MIN_ZOOM: 14,
    SH_WMS_URL,
    SH_STAT_API_URL,
    ALL_DATES,
    INDICES,
    START_YEAR
};
let runtimeImageProviderOverride = null;

function isSentinelOnlyShareMode() {
    if (window.LIMN_SHARE_SENTINEL_ONLY === true) return true;
    const params = new URLSearchParams(window.location.search || '');
    const shareMode = params.get('share') || params.get('mode') || '';
    return shareMode === 'sentinel-only' || shareMode === 'sentinel';
}

function applySentinelOnlyShareConfig(config) {
    config.IMAGE_PROVIDER = 'sentinelhub';
    config.IMAGERY_PROVIDER = 'sentinelhub';
    config.ALLOW_SENTINEL_FALLBACK = true;
    config.SENTINEL_CREDIT_GUARD = true;
    config.SENTINEL_LIVE_TILES = true;
    return config;
}

// Modular Delegations
function getActiveConfig() {
    const merged = { ...internalAppConfig, ...(window.CONFIG || {}) };
    if (runtimeImageProviderOverride) {
        merged.IMAGE_PROVIDER = runtimeImageProviderOverride;
        merged.IMAGERY_PROVIDER = runtimeImageProviderOverride;
        if (runtimeImageProviderOverride === 'sentinelhub') {
            merged.ALLOW_SENTINEL_FALLBACK = true;
        }
    }
    if (isSentinelOnlyShareMode()) applySentinelOnlyShareConfig(merged);
    const requestedProvider = String(merged.IMAGE_PROVIDER || merged.IMAGERY_PROVIDER || 'gee').toLowerCase();
    if (requestedProvider === 'sentinelhub' && merged.ALLOW_SENTINEL_FALLBACK !== true) {
        merged.IMAGE_PROVIDER = internalAppConfig.IMAGE_PROVIDER;
        merged.IMAGERY_PROVIDER = internalAppConfig.IMAGE_PROVIDER;
    }
    return merged;
}

function getActiveProvider() {
    return getImageryProvider(getActiveConfig());
}

function getDefaultProviderLabel() {
    const cfg = { ...internalAppConfig, ...(window.CONFIG || {}) };
    if (isSentinelOnlyShareMode()) return 'SENTINEL';
    const requestedProvider = String(cfg.IMAGE_PROVIDER || cfg.IMAGERY_PROVIDER || internalAppConfig.IMAGE_PROVIDER).toLowerCase();
    if (requestedProvider === 'sentinelhub' && cfg.ALLOW_SENTINEL_FALLBACK !== true) {
        return internalAppConfig.IMAGE_PROVIDER.toUpperCase();
    }
    return requestedProvider.toUpperCase();
}

function isCogProviderActive() {
    return COG_PROVIDER_KEYS.has(getActiveProvider());
}

function isGeeProviderActive() {
    return getActiveProvider() !== 'sentinelhub';
}

function sentinelFeatureUnavailable(featureName) {
    const providerLabel = isCogProviderActive() ? 'Sentinel-2 COG tiles' : 'Earth Engine tiles';
    showToast(`${featureName} still uses Sentinel Hub/CDSE. ${providerLabel} are enabled by default, so this action is paused until a provider-neutral analytics endpoint is wired.`, 'warning');
}

async function probeAcquisitions() {
    if (isGeeProviderActive()) return;
    if (isSentinelCreditGuardBlocking()) return;
    return probeAcquisitionsFromReport();
}

function applyIndex(isScrubbing = false) {
    enforceCogIndexSupport({ silent: isScrubbing });
    enforceCogTemporalConstraints();
    syncSentinelCreditGuardState();
    state.indexVisible = true;
    applyIndexDelegate(state, getActiveConfig(), isScrubbing);
    updateUI();
}
window.applyIndex = applyIndex;
window.downloadHTMLReport = downloadHTMLReport;

function updateUI() {
    updateUIDelegate(state, INDICES);
    setCogUiAvailability();
    updateSentinelGuardUI();
    
    // Geochemical Basin & Sensitivity Calibration UI Isolation
    const SPILL_INDEX_KEYS = ['pwi', 'pwoi', 'hpwi', 'ehc', 'lbi', 'fbc', 'reai', 'vcbi', 'aoi', 'cma', 'hmi', 'phi', 'tri', 'bpi', 'mvpi'];
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
    if (isGeeProviderActive()) return;
    updateGifInsetDelegate(state, getActiveConfig());
}

function showToast(message, type = 'info') {
    showToastDelegate(message, type);
}

const tileErrorToastState = {
    message: '',
    at: 0
};

function getTileErrorMessage(event) {
    const err = event?.error;
    if (window.sentinelHubLastError?.isQuotaExhausted) {
        return 'Sentinel Hub quota exhausted: processing units or request credits are unavailable for this account.';
    }
    if (err?.isQuotaExhausted) {
        return 'Sentinel Hub quota exhausted: processing units or request credits are unavailable for this account.';
    }
    if (err?.status === 403) {
        return err.detail ? `Sentinel Hub denied tile access: ${err.detail}` : 'Sentinel Hub denied tile access with HTTP 403.';
    }
    if (err?.status === 429) {
        return err.detail
            ? `Sentinel Hub rate limited the tile request: ${err.detail}`
            : 'Sentinel Hub rate limited tile requests. Limn is cooling down before retrying.';
    }
    if (err?.status) {
        return err.detail
            ? `Sentinel Hub tile error HTTP ${err.status}: ${err.detail}`
            : `Sentinel Hub tile error HTTP ${err.status}.`;
    }
    return `Sentinel Hub tile request failed for ${event?.layer || 'selected'}; checking account quota and network status.`;
}

function showDedupedTileToast(message) {
    const now = Date.now();
    if (tileErrorToastState.message === message && now - tileErrorToastState.at < 15000) return;
    tileErrorToastState.message = message;
    tileErrorToastState.at = now;
    showToast(message, 'error');
}

function showTileErrorToast(event) {
    showDedupedTileToast(getTileErrorMessage(event));
}

window.addEventListener('sentinelhuberror', (event) => {
    const detail = event.detail || {};
    if (detail.isQuotaExhausted) {
        showDedupedTileToast('Sentinel Hub quota exhausted: processing units or request credits are unavailable for this account.');
        return;
    }
    if (detail.status) {
        showDedupedTileToast(detail.message || `Sentinel Hub request failed with HTTP ${detail.status}.`);
    }
});

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
    activeIndex: DEFAULT_INDEX,
    activeSpillId: DEFAULT_SPILL_ID,
    activeBasin: 'permian',
    mode: 'single', // 'single' or 'compare'
    compareType: 'swipe', // 'swipe' | 'diff' | 'cumulative'
    monthIndex: Math.max(0, ALL_DATES.length - 1),
    sarFusion: false, // track the state of the SAR Overlay toggle
    hlsEnabled: false, // NASA HLS temporal booster
    opacity: 0.85,
    indexVisible: true,
    visualFilter: 0,
    sensitivity: 0, // Dynamic threshold offset (-50 to 50)
    sentinelLiveTiles: false,
    sentinelMinZoom: 14,
    sentinelGuardInitialized: false,
    sentinelRateLimitedUntil: 0,
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
window.CONFIG = getActiveConfig();
window.ALL_DATES = ALL_DATES;
window.MONTHS = MONTHS;
window.getLimnProviderState = () => ({
    provider: getActiveProvider(),
    defaultProvider: getDefaultProviderLabel().toLowerCase(),
    runtimeImageProviderOverride,
    sentinelOnlyShareMode: isSentinelOnlyShareMode(),
    sentinelLiveTiles: state.sentinelLiveTiles === true,
    sentinelMinZoom: state.sentinelMinZoom,
    sentinelRateLimitedUntil: state.sentinelRateLimitedUntil || 0,
    zoom: state.map?.getZoom?.() ?? null,
    guardBlocking: isSentinelCreditGuardBlocking(),
    status: document.getElementById('sentinel-guard-status')?.textContent || ''
});

function getSpillById(spillId) {
    return SPILL_BOOKMARKS.find(spill => spill.id === spillId) || SPILL_BOOKMARKS[0];
}

function getDemoSpillBookmarks(indexKey = null) {
    return SPILL_BOOKMARKS.filter(spill => {
        const indices = spill.indices || [];
        const providerReadyIndices = isCogProviderActive()
            ? indices.filter(idx => COG_SUPPORTED_INDEX_KEYS.has(idx))
            : indices;
        if (indexKey) return providerReadyIndices.includes(indexKey);
        return providerReadyIndices.length > 0;
    });
}

function getActiveSpill() {
    return getSpillById(state.activeSpillId);
}

function setClosestDateForSpill(spill) {
    const targetStr = spill?.date || spill?.displayDate;
    const target = new Date(targetStr).getTime();
    if (Number.isNaN(target)) return;

    let closestIdx = 0;
    let minDiff = Infinity;
    ALL_DATES.forEach((dateOption, index) => {
        const diff = Math.abs(new Date(dateOption.value).getTime() - target);
        if (diff < minDiff) {
            minDiff = diff;
            closestIdx = index;
        }
    });

    state.monthIndex = closestIdx;
    const dateSingleEl = document.getElementById('date-single');
    if (dateSingleEl) dateSingleEl.value = closestIdx.toString();
}

function updateWorkflowSummary(spill = getActiveSpill(), indexKey = state.activeIndex) {
    const indexConfig = INDICES[indexKey];
    const lensEl = document.getElementById('workflow-lens');
    const siteEl = document.getElementById('workflow-site');
    const evidenceEl = document.getElementById('workflow-evidence');

    if (lensEl) {
        const shortLabel = INDEX_SHORT_LABELS[indexKey] || indexKey.toUpperCase();
        const longName = indexConfig?.name?.replace(/\s*\(formerly.*?\)/i, '') || shortLabel;
        lensEl.textContent = shortLabel;
        lensEl.title = longName;
    }
    if (siteEl && spill) siteEl.textContent = spill.label;
    if (evidenceEl && spill) {
        const evidenceClass = (spill.evidenceClass || 'screening target').replace(/-/g, ' ');
        const displayDate = spill.displayDate || spill.date;
        evidenceEl.textContent = `${displayDate} · ${evidenceClass}`;
    }
}

function markActiveWorkflowControls() {
    document.querySelectorAll('.triage-tag-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.index === state.activeIndex);
    });
    document.querySelectorAll('.triage-bm-btn, .spill-bookmark-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.spillId === state.activeSpillId);
    });
    document.querySelectorAll('.triage-bm-row').forEach(row => {
        row.classList.toggle('active', row.dataset.spillId === state.activeSpillId);
    });
    document.querySelectorAll('.triage-bm-chip').forEach(chip => {
        const isActiveSite = chip.dataset.spillId === state.activeSpillId;
        const isActiveIndex = chip.dataset.index === state.activeIndex;
        const isActive = state.indexVisible && isActiveSite && isActiveIndex;
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function selectSpill(spill, { fly = false } = {}) {
    if (!spill) return;
    state.activeSpillId = spill.id || DEFAULT_SPILL_ID;
    setClosestDateForSpill(spill);

    document.getElementById('disp-lat').innerText = spill.lat.toFixed(4) + '°';
    document.getElementById('disp-lng').innerText = spill.lng.toFixed(4) + '°';
    if (fly && state.map) {
        state.map.flyTo([spill.lat, spill.lng], spill.zoom, { duration: 1.5 });
    }

    updateWorkflowSummary(spill, state.activeIndex);
    markActiveWorkflowControls();
}

function hideIndexOverlay() {
    if (!state.map) return;
    if (state.sbsControl) {
        try { state.sbsControl.remove(); } catch (_) {}
        state.sbsControl = null;
    }
    ['overlayGroup', 'leftGroup', 'rightGroup'].forEach(key => {
        if (state[key]) {
            state.map.removeLayer(state[key]);
            state[key] = null;
        }
    });
    state.indexVisible = false;
    markActiveWorkflowControls();
}

function getProviderReadyBookmarkIndices(spill) {
    const indices = spill?.indices || [];
    return isCogProviderActive()
        ? indices.filter(idx => COG_SUPPORTED_INDEX_KEYS.has(idx))
        : indices;
}

function isIndexProviderReady(indexKey) {
    return !isCogProviderActive() || COG_SUPPORTED_INDEX_KEYS.has(indexKey);
}

let lastCogUnsupportedToast = '';

function enforceCogIndexSupport({ silent = false } = {}) {
    if (!isCogProviderActive() || COG_SUPPORTED_INDEX_KEYS.has(state.activeIndex)) return true;
    const previousIndex = state.activeIndex;
    state.activeIndex = DEFAULT_INDEX;
    state.indexVisible = true;
    if (!silent && previousIndex !== lastCogUnsupportedToast) {
        const label = INDEX_SHORT_LABELS[previousIndex] || previousIndex.toUpperCase();
        showToast(`${label} is not ported to the COG renderer yet. Switched to OBEC for the current demo provider.`, 'warning');
        lastCogUnsupportedToast = previousIndex;
    }
    return false;
}

function enforceCogTemporalConstraints() {
    if (!isCogProviderActive()) return;
    if (state.compareType === 'diff' || state.compareType === 'cumulative') {
        state.compareType = 'swipe';
    }
}

function setCogUiAvailability() {
    const isCog = isCogProviderActive();
    document.body.classList.toggle('provider-cog', isCog);

    document.querySelectorAll('.index-btn[data-index]').forEach(btn => {
        const key = btn.dataset.index;
        const supported = !isCog || COG_SUPPORTED_INDEX_KEYS.has(key);
        btn.disabled = !supported;
        btn.classList.toggle('is-provider-disabled', !supported);
        btn.setAttribute('aria-disabled', supported ? 'false' : 'true');
        if (!supported) {
            btn.title = 'Not available in the current COG renderer.';
        } else if (btn.title === 'Not available in the current COG renderer.') {
            btn.removeAttribute('title');
        }
    });

    document.querySelectorAll('.triage-tag-pill[data-index]').forEach(pill => {
        const key = pill.dataset.index;
        const visible = !isCog || COG_SCREEN_INDEX_KEYS.has(key);
        pill.hidden = !visible;
        pill.disabled = !visible;
        pill.classList.toggle('is-provider-disabled', !visible);
    });

    const btnSwipe = document.getElementById('btn-swipe');
    const btnDiff = document.getElementById('btn-diff');
    const btnCumulative = document.getElementById('btn-cumulative');
    if (btnSwipe && btnDiff && btnCumulative) {
        btnSwipe.classList.toggle('active', state.compareType === 'swipe');
        btnDiff.classList.toggle('active', state.compareType === 'diff');
        btnCumulative.classList.toggle('active', state.compareType === 'cumulative');
        [btnDiff, btnCumulative].forEach(btn => {
            btn.disabled = isCog;
            btn.classList.toggle('is-provider-disabled', isCog);
            btn.setAttribute('aria-disabled', isCog ? 'true' : 'false');
            btn.title = isCog ? 'COG mode supports single-date and swipe compare only.' : '';
        });
    }
}

function syncSentinelCreditGuardState() {
    if (state.sentinelGuardInitialized) return;
    const config = getActiveConfig();
    state.sentinelLiveTiles = config.SENTINEL_LIVE_TILES === true;
    runtimeImageProviderOverride = config.SENTINEL_LIVE_TILES === true && getImageryProvider(config) === 'sentinelhub'
        ? 'sentinelhub'
        : null;
    if (isSentinelOnlyShareMode()) {
        runtimeImageProviderOverride = 'sentinelhub';
        state.sentinelLiveTiles = true;
    }
    const configuredMinZoom = Number(config.SENTINEL_MIN_ZOOM || state.sentinelMinZoom || 14);
    state.sentinelMinZoom = Number.isFinite(configuredMinZoom) ? configuredMinZoom : 14;
    state.sentinelGuardInitialized = true;
}

function updateSentinelGuardUI() {
    const provider = getActiveProvider();
    const isSentinel = provider === 'sentinelhub';
    const guardEnabled = getActiveConfig().SENTINEL_CREDIT_GUARD !== false;
    const minZoom = state.sentinelMinZoom || 14;
    const currentZoom = state.map?.getZoom?.() ?? 0;
    const sentinelActive = isSentinel && state.sentinelLiveTiles === true;
    const toggle = document.getElementById('toggle-sentinel-live');
    const zoomSlider = document.getElementById('sentinel-min-zoom');
    const zoomVal = document.getElementById('sentinel-min-zoom-val');
    const status = document.getElementById('sentinel-guard-status');
    const guardMini = document.querySelector('.sentinel-guard-mini');
    const shareMode = isSentinelOnlyShareMode();

    if (toggle) {
        toggle.checked = shareMode ? true : sentinelActive;
        toggle.disabled = shareMode || !guardEnabled;
        toggle.title = shareMode
            ? 'Sentinel-only share mode is locked to guarded WMS tiles'
            : sentinelActive
            ? 'Switch back to the default COG/GEE renderer'
            : 'Switch this session to guarded Sentinel Hub WMS tiles';
    }
    if (guardMini) {
        guardMini.classList.toggle('is-armed', shareMode || sentinelActive);
        guardMini.classList.toggle('is-share-mode', shareMode);
    }
    if (zoomSlider) {
        zoomSlider.value = String(minZoom);
        zoomSlider.disabled = !guardEnabled;
    }
    if (zoomVal) zoomVal.textContent = `${minZoom}+`;

    if (!status) return;
    if (shareMode && state.sentinelRateLimitedUntil > Date.now()) {
        const seconds = Math.max(1, Math.ceil((state.sentinelRateLimitedUntil - Date.now()) / 1000));
        status.textContent = `Share mode: cooling down ${seconds}s.`;
    } else if (shareMode && currentZoom < minZoom) {
        status.textContent = `Share mode: Sentinel-only, guarded until zoom ${minZoom}+ (current ${currentZoom}).`;
    } else if (shareMode) {
        status.textContent = `Share mode: Sentinel-only WMS armed at zoom ${currentZoom}.`;
    } else if (!guardEnabled) {
        status.textContent = 'Guard disabled by config. Sentinel Hub requests are allowed.';
    } else if (!isSentinel) {
        status.textContent = `${getDefaultProviderLabel()} active. Toggle Sentinel to request guarded WMS tiles.`;
    } else if (!state.sentinelLiveTiles) {
        status.textContent = 'Disarmed. Sentinel Hub WMS tiles are blocked.';
    } else if (state.sentinelRateLimitedUntil > Date.now()) {
        const seconds = Math.max(1, Math.ceil((state.sentinelRateLimitedUntil - Date.now()) / 1000));
        status.textContent = `Rate limited. Cooling down ${seconds}s before more Sentinel WMS tiles.`;
    } else if (currentZoom < minZoom) {
        status.textContent = `Armed, but blocked until zoom ${minZoom}+ (current ${currentZoom}).`;
    } else {
        status.textContent = `Armed. Sentinel Hub WMS may request tiles at zoom ${currentZoom}.`;
    }
}

function isSentinelCreditGuardBlocking() {
    if (getActiveProvider() !== 'sentinelhub') return false;
    const config = getActiveConfig();
    if (config.SENTINEL_CREDIT_GUARD === false) return false;
    const currentZoom = state.map?.getZoom?.() ?? 0;
    return !state.sentinelLiveTiles || currentZoom < state.sentinelMinZoom;
}


export function renderSpillBookmarks(indexKey = state.activeIndex) {
    const spillList = document.getElementById('spill-bookmark-list');
    if (!spillList) return;
    spillList.innerHTML = '';

    const bookmarks = getDemoSpillBookmarks(indexKey);

    // Update section title & disclaimer
    const sectionTitle = document.querySelector('.spill-bookmarks-section h3');
    const sectionDisclaimer = document.querySelector('.spill-disclaimer');
    if (sectionTitle) sectionTitle.textContent = 'Screening Sites';
    if (sectionDisclaimer) sectionDisclaimer.textContent = 'Only sites with a current measured chip for this lens are listed.';

    bookmarks.forEach(spill => {
        const btn = document.createElement('button');
        btn.className = 'spill-bookmark-btn';
        btn.dataset.spillId = spill.id || spill.label.replace(/\s+/g, '-').toLowerCase();
        btn.classList.toggle('active', btn.dataset.spillId === state.activeSpillId);

        const tooltipText = `<strong>${spill.label}</strong><br>${spill.note}<br><br>📅 ${spill.displayDate} &nbsp;|&nbsp; 📦 ${spill.volume}<br>📡 ${spill.source}<br>⚠ Coords: ${spill.confidence}`;
        btn.setAttribute('data-tooltip', tooltipText);

        btn.innerHTML = `<span class="spill-name">${spill.label}</span><span class="spill-date-tag">${spill.displayDate}</span>`;
        
        btn.addEventListener('click', () => {
            selectSpill(spill, { fly: true });

            // Deselect preset location buttons and spill buttons
            document.querySelectorAll('.loc-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.spill-bookmark-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            markActiveWorkflowControls();

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

// ── INIT ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (isSentinelOnlyShareMode()) {
        document.body.classList.add('sentinel-only-share-mode');
    }

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


    const initialSpill = getActiveSpill();
    const initialMapLocation = initialSpill
        ? { lat: initialSpill.lat, lng: initialSpill.lng, zoom: initialSpill.zoom }
        : AOI_LOCATIONS[state.activeLoc];
    state.map = initLeafletMap('map', initialMapLocation);
    
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
        showTileErrorToast(e);
    });
    state.map.on('sentinelguard', (e) => {
        updateSentinelGuardUI();
        const detail = e?.status || {};
        if (detail.reason === 'disarmed') {
            showToast('Sentinel Hub live tiles are disarmed. Enable them in Settings to spend credits.', 'info');
        } else if (detail.reason === 'zoom') {
            showToast(`Sentinel Hub guarded below zoom ${detail.minZoom}. Zoom in to render WMS tiles.`, 'info');
        }
    });
    state.map.on('sentinelratelimit', (e) => {
        const retryAfterMs = Number(e?.retryAfterMs || 15000);
        state.sentinelRateLimitedUntil = Math.max(state.sentinelRateLimitedUntil || 0, Date.now() + retryAfterMs);
        updateSentinelGuardUI();
        showDedupedTileToast(`Sentinel Hub rate limit reached. Cooling down ${Math.ceil(retryAfterMs / 1000)}s before retrying WMS tiles.`);
    });
    state.map.on('zoomend', () => {
        updateSentinelGuardUI();
        if (getActiveProvider() === 'sentinelhub' && state.indexVisible) applyIndex();
    });

    // Initialize Base Layer
    state.baseLayerInst = L.tileLayer(BASE_LAYERS.imagery, { maxZoom: 18 }).addTo(state.map);
    state.baseLayerInst.bringToBack();

    bindEvents();
    syncSentinelCreditGuardState();
    updateSentinelGuardUI();

    // Initial Data Load
    selectSpill(getActiveSpill());
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
