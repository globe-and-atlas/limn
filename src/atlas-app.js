/* ==========================================================================
   Globe & Atlas · Limn — Atlas App
   Simplified viewer for the Global Spectral Index Atlas (91 novel indices).
   No produced-water tools. Each index navigates to a curated bookmark.
   ========================================================================== */

import { ATLAS_INDICES as NOVEL_INDICES, ATLAS_DOMAINS as NOVEL_DOMAINS } from './atlas-indices.js?v=4';
import { SAR_DEMO_INDICES, SAR_DEMO_DOMAIN } from './atlas-sar-demos.js?v=2';
import { S5P_DEMO_INDICES, S5P_DEMO_DOMAIN } from './atlas-s5p-demos.js?v=2';
import { countsAsAtlasCitation, getAtlasEvidence, getAtlasTrust } from './atlas-evidence.js?v=3';

// The 91 novel indices plus the live Sentinel-1 SAR and Sentinel-5P TROPOMI
// demonstrators (kept in separate modules so the novel catalog stays exactly
// 91). Downstream code uses the merged arrays transparently.
const ATLAS_INDICES = [...NOVEL_INDICES, ...SAR_DEMO_INDICES, ...S5P_DEMO_INDICES];
const ATLAS_DOMAINS = [...NOVEL_DOMAINS, SAR_DEMO_DOMAIN, S5P_DEMO_DOMAIN];

const DEFAULT_GEE_TILE_ENDPOINT = '/api/gee/tiles';
const DEFAULT_SH_WMS_URL = 'https://sh.dataspace.copernicus.eu/ogc/wms/959ea2c5-5892-4b36-82b3-76e6bdb93c8a';
const DEFAULT_SENTINEL_VIEWER_INSTANCE_ID = '83a6b821-c0ad-43b1-848f-06f7b6b528a7';
const DEFAULT_WMS_LAYER = 'AGRICULTURE';
const DEFAULT_SENTINEL_MIN_ZOOM = 14;
const CONTEXT_TRUE_COLOR_EVALSCRIPT = `//VERSION=3
function setup() {
  return { input: ['B04', 'B03', 'B02', 'dataMask'], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0,0];
  return [sample.B04*2.5, sample.B03*2.5, sample.B02*2.5, 1];
}`;

let runtimeAtlasImageProviderOverride = null;
let runtimeAtlasWmsSource = null;

function buildSentinelWmsUrl(instanceId) {
  const value = String(instanceId || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://sh.dataspace.copernicus.eu/ogc/wms/${value}`;
}

function getConfiguredAtlasWmsUrl(cfg) {
  const configuredUrl = cfg.SH_WMS_URL || cfg.ATLAS_WMS_URL;
  if (configuredUrl) return String(configuredUrl);
  return buildSentinelWmsUrl(cfg.SH_INSTANCE_ID || cfg.SENTINEL_HUB_INSTANCE_ID || cfg.WMS_INSTANCE_ID)
    || DEFAULT_SH_WMS_URL;
}

function getAtlasWmsSources(cfg) {
  const configuredUrl = getConfiguredAtlasWmsUrl(cfg);
  const viewerUrl = cfg.ATLAS_VIEWER_WMS_URL
    || cfg.SENTINEL_VIEWER_WMS_URL
    || buildSentinelWmsUrl(cfg.ATLAS_VIEWER_INSTANCE_ID || cfg.SENTINEL_VIEWER_INSTANCE_ID || DEFAULT_SENTINEL_VIEWER_INSTANCE_ID);

  return [
    {
      id: 'configured',
      label: 'Configured Copernicus',
      shortLabel: 'Configured',
      url: String(configuredUrl),
      enabled: Boolean(configuredUrl),
    },
    {
      id: 'viewer',
      label: 'Sentinel Viewer',
      shortLabel: 'Viewer',
      url: String(viewerUrl || ''),
      enabled: Boolean(viewerUrl),
    },
  ];
}

function resolveAtlasWmsSource(cfg) {
  const sources = getAtlasWmsSources(cfg);
  const requested = String(runtimeAtlasWmsSource || cfg.ATLAS_WMS_SOURCE || 'configured').toLowerCase();
  return sources.find(source => source.id === requested && source.enabled)
    || sources.find(source => source.id === 'configured' && source.enabled)
    || sources.find(source => source.id === 'viewer' && source.enabled)
    || {
      id: 'configured',
      label: 'Configured Copernicus',
      shortLabel: 'Configured',
      url: DEFAULT_SH_WMS_URL,
      enabled: true,
    };
}

function getAtlasConfig() {
  const cfg = window.CONFIG || {};
  const wmsSources = getAtlasWmsSources(cfg);
  const wmsSource = resolveAtlasWmsSource(cfg);
  const requestedProvider = String(runtimeAtlasImageProviderOverride || cfg.ATLAS_IMAGE_PROVIDER || cfg.IMAGE_PROVIDER || 'gee').toLowerCase();
  const allowSentinelFallback = runtimeAtlasImageProviderOverride === 'sentinelhub' || cfg.ALLOW_SENTINEL_FALLBACK === true;
  let imageProvider = requestedProvider === 'cog' && !cfg.ATLAS_IMAGE_PROVIDER && !runtimeAtlasImageProviderOverride
    ? 'gee'
    : requestedProvider;
  if (imageProvider === 'sentinelhub' && !allowSentinelFallback) imageProvider = 'gee';

  const configuredMinZoom = Number(cfg.ATLAS_SENTINEL_MIN_ZOOM || cfg.SENTINEL_MIN_ZOOM || DEFAULT_SENTINEL_MIN_ZOOM);
  return {
    imageProvider,
    geeTileEndpoint: String(cfg.ATLAS_GEE_TILE_ENDPOINT || cfg.GEE_TILE_ENDPOINT || DEFAULT_GEE_TILE_ENDPOINT).replace(/\/+$/, ''),
    geeApiKey: cfg.GEE_API_KEY || '',
    wmsUrl: wmsSource.url,
    wmsSource: wmsSource.id,
    wmsSourceLabel: wmsSource.label,
    wmsSources,
    wmsLayer: cfg.ATLAS_WMS_LAYER || cfg.SH_WMS_LAYER || DEFAULT_WMS_LAYER,
    sentinelCreditGuard: cfg.ATLAS_SENTINEL_CREDIT_GUARD ?? cfg.SENTINEL_CREDIT_GUARD ?? true,
    sentinelLiveTiles: cfg.ATLAS_SENTINEL_LIVE_TILES ?? cfg.SENTINEL_LIVE_TILES ?? false,
    sentinelMinZoom: Number.isFinite(configuredMinZoom) ? configuredMinZoom : DEFAULT_SENTINEL_MIN_ZOOM,
  };
}

let atlasConfig = getAtlasConfig();

function refreshAtlasConfig() {
  atlasConfig = getAtlasConfig();
  return atlasConfig;
}

let map, wmsLayer, bookmarkFocusLayer, activeKey = null;
let BASE_TILES;
let pendingTiles = 0;
let currentLinkedInGroundTruthDraft = '';
let currentCaptureFrame = {};
const bookmarkFocusMarkers = new Map();
const state = {
  date: '2021-08-01',
  opacity: 0.85,
  base: 'esri',
  maxcc: 30,
  windowDays: 15,
  paused: false,
  bookmarkFocusVisible: false,
  captureView: 'overlay',
  captureSplit: 50,
  sentinelLiveTiles: false,
  sentinelMinZoom: DEFAULT_SENTINEL_MIN_ZOOM,
  sentinelGuardInitialized: false,
  sentinelRateLimitedUntil: 0,
  captureMode: false,
};

window.getAtlasProviderState = () => {
  refreshAtlasConfig();
  return {
    provider: atlasConfig.imageProvider,
    defaultProvider: getDefaultAtlasProviderLabel().toLowerCase(),
    runtimeAtlasImageProviderOverride,
    wmsSource: atlasConfig.wmsSource,
    wmsSourceLabel: atlasConfig.wmsSourceLabel,
    sentinelLiveTiles: state.sentinelLiveTiles === true,
    sentinelMinZoom: state.sentinelMinZoom,
    sentinelRateLimitedUntil: state.sentinelRateLimitedUntil || 0,
    zoom: map?.getZoom?.() ?? null,
    guardStatus: map ? getAtlasSentinelGuardStatus() : null,
    bookmarkFocusVisible: state.bookmarkFocusVisible === true,
    bookmarkFocusCount: bookmarkFocusMarkers.size,
    status: document.getElementById('atlas-sentinel-status')?.textContent || '',
  };
};

window.getAtlasBookmarkFocusState = () => ({
  visible: state.bookmarkFocusVisible === true,
  markerCount: bookmarkFocusMarkers.size,
  expectedCount: getBookmarkFocusEntries().length,
  activeKey,
});

window.getAtlasCaptureState = () => ({
  enabled: state.captureMode === true,
  activeKey,
  view: state.captureView,
  split: state.captureSplit,
  overlayOpacity: wmsLayer?.options?.opacity ?? null,
  overlayClipPath: wmsLayer?.getContainer?.()?.style?.clipPath || '',
  ...currentCaptureFrame,
});

function setTileStatus(message = '', type = 'info') {
  const status = document.getElementById('tile-status');
  if (!status) return;
  status.textContent = message;
  status.className = message ? `visible ${type}` : '';
}

function isGeeProvider() {
  return ['gee', 'earthengine', 'earth-engine'].includes(atlasConfig.imageProvider);
}

function isSentinelProvider() {
  return atlasConfig.imageProvider === 'sentinelhub';
}

function getDefaultAtlasProviderLabel() {
  const cfg = window.CONFIG || {};
  const requestedProvider = String(cfg.ATLAS_IMAGE_PROVIDER || cfg.IMAGE_PROVIDER || 'gee').toLowerCase();
  if (requestedProvider === 'sentinelhub' && cfg.ALLOW_SENTINEL_FALLBACK !== true) return 'GEE';
  if (requestedProvider === 'cog' && !cfg.ATLAS_IMAGE_PROVIDER) return 'GEE';
  return requestedProvider.toUpperCase();
}

function syncAtlasSentinelState() {
  if (state.sentinelGuardInitialized) return;
  refreshAtlasConfig();
  state.sentinelLiveTiles = atlasConfig.sentinelLiveTiles === true && atlasConfig.imageProvider === 'sentinelhub';
  state.sentinelMinZoom = atlasConfig.sentinelMinZoom;
  runtimeAtlasImageProviderOverride = state.sentinelLiveTiles ? 'sentinelhub' : null;
  refreshAtlasConfig();
  state.sentinelGuardInitialized = true;
}

function getAtlasSentinelGuardStatus() {
  if (!isSentinelProvider()) return { blocked: false, reason: 'provider' };
  if (atlasConfig.sentinelCreditGuard === false) return { blocked: false, reason: 'disabled' };
  if (!state.sentinelLiveTiles) return { blocked: true, reason: 'disarmed' };
  if (state.sentinelRateLimitedUntil > Date.now()) {
    return { blocked: true, reason: 'cooldown', until: state.sentinelRateLimitedUntil };
  }
  const zoom = Number(map?.getZoom?.() ?? 0);
  const minZoom = Number(state.sentinelMinZoom || atlasConfig.sentinelMinZoom || DEFAULT_SENTINEL_MIN_ZOOM);
  if (Number.isFinite(minZoom) && zoom < minZoom) return { blocked: true, reason: 'zoom', zoom, minZoom };
  return { blocked: false, reason: 'armed', zoom, minZoom };
}

function updateAtlasSentinelUI() {
  refreshAtlasConfig();
  const guardEnabled = atlasConfig.sentinelCreditGuard !== false;
  const isSentinel = isSentinelProvider();
  const sentinelActive = isSentinel && state.sentinelLiveTiles === true;
  const minZoom = state.sentinelMinZoom || atlasConfig.sentinelMinZoom || DEFAULT_SENTINEL_MIN_ZOOM;
  const currentZoom = map?.getZoom?.() ?? 0;
  const toggle = document.getElementById('atlas-toggle-sentinel-live');
  const sourceSelect = document.getElementById('atlas-sentinel-source');
  const zoomSlider = document.getElementById('atlas-sentinel-min-zoom');
  const zoomVal = document.getElementById('atlas-sentinel-min-zoom-val');
  const status = document.getElementById('atlas-sentinel-status');
  const panel = document.querySelector('.atlas-sentinel-panel');

  if (toggle) {
    toggle.checked = sentinelActive;
    toggle.disabled = !guardEnabled;
    toggle.title = sentinelActive
      ? 'Switch Atlas back to its default provider'
      : 'Switch this Atlas session to guarded Sentinel Hub WMS tiles';
  }
  if (sourceSelect) {
    for (const option of sourceSelect.options) {
      const source = atlasConfig.wmsSources.find(item => item.id === option.value);
      option.disabled = !source?.enabled;
      option.textContent = source?.shortLabel || option.textContent;
    }
    sourceSelect.value = atlasConfig.wmsSource;
    sourceSelect.title = `Sentinel WMS source: ${atlasConfig.wmsSourceLabel}`;
  }
  if (panel) panel.classList.toggle('is-armed', sentinelActive);
  if (zoomSlider) {
    zoomSlider.value = String(minZoom);
    zoomSlider.disabled = !guardEnabled;
  }
  if (zoomVal) zoomVal.textContent = `Z${minZoom}+`;

  if (!status) return;
  if (!guardEnabled) {
    status.textContent = 'Guard disabled. Sentinel WMS may request tiles.';
  } else if (!isSentinel) {
    status.textContent = `${getDefaultAtlasProviderLabel()} active. Sentinel source: ${atlasConfig.wmsSourceLabel}.`;
  } else if (!state.sentinelLiveTiles) {
    status.textContent = 'Sentinel disarmed. WMS tiles blocked.';
  } else if (state.sentinelRateLimitedUntil > Date.now()) {
    const seconds = Math.max(1, Math.ceil((state.sentinelRateLimitedUntil - Date.now()) / 1000));
    status.textContent = `Rate limited. Cooling down ${seconds}s.`;
  } else if (currentZoom < minZoom) {
    status.textContent = `Armed, blocked until Z${minZoom}+ (current Z${currentZoom}).`;
  } else {
    status.textContent = `Sentinel ${atlasConfig.wmsSourceLabel} armed at Z${currentZoom}.`;
  }
}

function getWmsCarrierLayer(idx) {
  if (!idx.canRender) return atlasConfig.wmsLayer;
  return idx.wmsLayer || atlasConfig.wmsLayer;
}

function getDisplayEvalscript(idx) {
  return idx.canRender ? idx.evalscript : CONTEXT_TRUE_COLOR_EVALSCRIPT;
}

// --- Coverage model ------------------------------------------------------
// The 91 novel indices render at three levels. 'live' = renders now with a
// reviewed proof target. 'pending' = layer-capable but no confirmed proof
// target yet (Codex marks these in the platform string). 'sensor' = needs an
// instrument the public WMS can't
// serve (hyperspectral, thermal, etc.). Demonstrators (novelty 'DEMO') are
// NOT part of the 91 — they're counted separately so the novel total stays 91.
function isDemo(idx) {
  return idx.novelty === 'DEMO';
}

function coverageTier(idx) {
  if (idx.canRender) return 'live';
  if (/proof target pending/i.test(idx.platform || '')) return 'pending';
  return 'sensor';
}

function coverageCounts() {
  const c = { live: 0, pending: 0, sensor: 0, demo: 0 };
  for (const i of ATLAS_INDICES) {
    if (isDemo(i)) { c.demo++; continue; }
    c[coverageTier(i)]++;
  }
  return c;
}

// Clean short tag for the sidebar button (proof-pending indices carry a verbose
// platformShort, so derive a concise label from the tier instead).
function tierTag(idx) {
  const tier = coverageTier(idx);
  if (tier === 'pending' && /sentinel-1|s1/i.test(`${idx.platform} ${idx.platformShort}`)) return 'S1 · soon';
  if (tier === 'pending' && /tropomi|s5p/i.test(`${idx.platform} ${idx.platformShort}`)) return 'S5P · soon';
  if (tier === 'pending') return 'S2 · soon';
  return idx.platformShort;
}

// Bands the index's evalscript actually reads (from setup().input, minus dataMask).
function indexBands(idx) {
  const m = (idx.evalscript || '').match(/input\s*:\s*\[([^\]]*)\]/);
  if (!m) return [];
  return m[1].split(',')
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(b => b && b !== 'dataMask');
}

// Human-readable bands line for the info panel. Live/pending entries have a real
// evalscript, so list the bands; sensor-limited stubs render True Color only.
function bandsLabel(idx) {
  if (coverageTier(idx) === 'sensor') {
    return `Requires ${idx.platformShort} — not computable from Sentinel-2`;
  }
  const bands = indexBands(idx);
  return bands.length ? bands.join(', ') : '—';
}

function renderEvidencePanel(index) {
  const trust = getAtlasTrust(index);
  const trustEl = document.getElementById('info-trust');
  const evidenceEl = document.getElementById('info-evidence');
  if (!trustEl || !evidenceEl) return;

  trustEl.textContent = `${trust.label} · ${trust.citationCount} cited sources`;
  trustEl.className = `info-badge info-trust info-trust--${trust.tier.toLowerCase()}`;
  trustEl.title = trust.description;

  evidenceEl.replaceChildren();
  const evidence = getAtlasEvidence(index);
  const citedSources = evidence.filter(countsAsAtlasCitation);
  const referenceLinks = evidence.filter(item => item.url && !item.technical && !countsAsAtlasCitation(item));
  const technicalLinks = evidence.filter(item => item.url && item.technical === true);

  function appendEvidenceGroup(title, items, options = {}) {
    if (!items.length) return;
    const groupTitle = document.createElement('div');
    groupTitle.className = 'evidence-group-title';
    groupTitle.textContent = title;

    const list = document.createElement('div');
    list.className = 'evidence-list';
    items.slice(0, 4).forEach((item, index) => {
      const link = document.createElement('a');
      link.className = 'evidence-link';
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = item.note || item.label;

      const type = document.createElement('span');
      type.className = 'evidence-type';
      type.textContent = options.numbered ? `Source ${index + 1}` : item.type;

      const label = document.createElement('span');
      label.className = 'evidence-label';
      label.textContent = item.label;

      link.append(type, label);
      list.append(link);
    });
    evidenceEl.append(groupTitle, list);
  }

  appendEvidenceGroup('Cited sources', citedSources, { numbered: true });
  appendEvidenceGroup('Supporting references', referenceLinks);
  appendEvidenceGroup('Technical checks', technicalLinks);
}

function firstSentence(text, fallback = '') {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return fallback;
  const match = clean.match(/^(.+?[.!?])(\s|$)/);
  return (match ? match[1] : clean).trim();
}

function sentenceCase(text) {
  const clean = String(text || '').trim();
  if (!clean) return '';
  return clean.charAt(0).toLowerCase() + clean.slice(1);
}

function trimWords(text, limit) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= limit) return words.join(' ');
  return `${words.slice(0, limit).join(' ')}...`;
}

function linkedinGroundTruthForIndex(idx) {
  const bm = idx.bookmark || {};
  const bands = bandsLabel(idx);
  const visualAnchor = `One Atlas render of ${idx.acronym} over ${bm.label || 'the selected bookmark'} on ${bm.date || state.date}.`;
  const observation = `${idx.acronym} uses ${bands} to make ${sentenceCase(firstSentence(idx.physics, idx.name))}`;
  const why = firstSentence(idx.benefit, 'It turns an otherwise subtle landscape condition into a visible inspection target.');
  const question = `Where would ${idx.acronym} clarify the scene, and what nearby look-alikes could make it lie?`;
  const post = [
    `One image worth studying this week: ${idx.acronym} over ${bm.label || 'a selected Atlas bookmark'}.`,
    '',
    `The observation is simple: ${trimWords(observation, 42)}`,
    '',
    `Why it matters: ${trimWords(why, 34)}`,
    '',
    `The interpretive prompt I keep coming back to: ${question}`
  ].join('\n');

  return {
    visualAnchor,
    observation,
    why,
    question,
    post: trimWords(post, 295),
  };
}

function renderLinkedInGroundTruth(idx) {
  const draft = linkedinGroundTruthForIndex(idx);
  currentLinkedInGroundTruthDraft = draft.post;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('gt-visual-anchor', draft.visualAnchor);
  setText('gt-observation', draft.observation);
  setText('gt-why', draft.why);
  setText('gt-question', draft.question);
  setText('gt-linkedin-draft', draft.post);
}

function captureFrameForIndex(idx) {
  const bm = idx.bookmark || {};
  const place = `${bm.label || 'Selected Atlas bookmark'} · ${bm.date || state.date}`;
  const modeLabel = captureModeLabel(idx);
  const hook = trimWords(
    `Compare the satellite context with the ${idx.acronym} result to see what the index makes easier to inspect than true color alone.`,
    32
  );
  const prompt = `Use Split when posting: context shows the landscape, ${idx.acronym} shows the candidate signal, and the next step is checking look-alikes before trusting it.`;

  return {
    acronym: idx.acronym,
    name: idx.name,
    place,
    modeLabel,
    overlayLabel: `${idx.acronym} overlay`,
    hook,
    prompt,
    aspect: '1200x628',
  };
}

function captureModeLabel(idx) {
  if (state.captureView === 'context') return 'Satellite context only';
  if (state.captureView === 'split') return `Split: context vs ${idx.acronym}`;
  return `Satellite context + ${idx.acronym} overlay`;
}

function activeCaptureIndex() {
  return ATLAS_INDICES.find(i => i.key === activeKey) || null;
}

function renderCaptureOverlay(idx) {
  currentCaptureFrame = captureFrameForIndex(idx);

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('capture-title', currentCaptureFrame.acronym);
  setText('capture-name', currentCaptureFrame.name);
  setText('capture-place', currentCaptureFrame.place);
  setText('capture-mode-label', currentCaptureFrame.modeLabel);
  setText('capture-overlay-label', currentCaptureFrame.overlayLabel);
  setText('capture-split-overlay-label', currentCaptureFrame.overlayLabel);
  setText('capture-hook', currentCaptureFrame.hook);
  setText('capture-prompt', currentCaptureFrame.prompt);
}

function applyCaptureComparison() {
  const mapArea = document.getElementById('atlas-map-area');
  if (mapArea) mapArea.style.setProperty('--capture-split', `${state.captureSplit}%`);

  const layerContainer = wmsLayer?.getContainer?.();
  if (!wmsLayer || !layerContainer) return;

  if (!state.captureMode) {
    layerContainer.style.clipPath = '';
    wmsLayer.setOpacity(state.opacity);
    return;
  }

  if (state.captureView === 'context') {
    layerContainer.style.clipPath = '';
    wmsLayer.setOpacity(0);
    return;
  }

  wmsLayer.setOpacity(state.opacity);
  layerContainer.style.clipPath = state.captureView === 'split'
    ? `inset(0 0 0 ${state.captureSplit}%)`
    : '';
}

function syncCaptureControls() {
  const layout = document.querySelector('.atlas-layout');
  if (layout) {
    layout.classList.toggle('capture-view-context', state.captureView === 'context');
    layout.classList.toggle('capture-view-overlay', state.captureView === 'overlay');
    layout.classList.toggle('capture-view-split', state.captureView === 'split');
  }

  document.querySelectorAll('.capture-mode-btn').forEach(btn => {
    const active = btn.dataset.captureView === state.captureView;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  const splitControl = document.querySelector('.capture-split-control');
  if (splitControl) splitControl.classList.toggle('visible', state.captureView === 'split');

  const splitSlider = document.getElementById('capture-split-slider');
  if (splitSlider) splitSlider.value = String(state.captureSplit);

  const idx = activeCaptureIndex();
  if (idx) renderCaptureOverlay(idx);
  applyCaptureComparison();
}

function setCaptureView(view) {
  if (!['context', 'overlay', 'split'].includes(view)) return;
  state.captureView = view;
  syncCaptureControls();
}

function setCaptureMode(enabled) {
  state.captureMode = enabled === true;
  const layout = document.querySelector('.atlas-layout');
  if (layout) layout.classList.toggle('capture-mode', state.captureMode);

  const toggle = document.getElementById('toggle-capture');
  if (toggle) {
    toggle.classList.toggle('capture-active', state.captureMode);
    toggle.setAttribute('aria-pressed', state.captureMode ? 'true' : 'false');
  }

  const idx = activeCaptureIndex();
  if (idx) renderCaptureOverlay(idx);
  syncCaptureControls();
  positionLegend();
}

function getBookmarkFocusEntries() {
  return ATLAS_INDICES.filter(idx => {
    const bm = idx.bookmark || {};
    return Number.isFinite(Number(bm.lat)) && Number.isFinite(Number(bm.lng));
  });
}

function bookmarkFocusColor(idx) {
  const tier = coverageTier(idx);
  if (isDemo(idx)) return '#00FFB2';
  if (tier === 'live') return '#00D2FF';
  if (tier === 'pending') return '#FFB454';
  return '#94A3B8';
}

function bookmarkFocusStyle(idx, isActive = false) {
  const color = isActive ? '#00FFB2' : bookmarkFocusColor(idx);
  return {
    radius: isActive ? 7 : 4,
    color,
    weight: isActive ? 2.5 : 1.25,
    opacity: isActive ? 1 : 0.78,
    fillColor: color,
    fillOpacity: isActive ? 0.78 : 0.38,
    className: `atlas-bookmark-focus-point${isActive ? ' is-active' : ''}`,
    pane: 'atlasBookmarkFocusPane',
  };
}

function ensureBookmarkFocusLayer() {
  if (bookmarkFocusLayer) return bookmarkFocusLayer;
  bookmarkFocusLayer = L.layerGroup();
  bookmarkFocusMarkers.clear();

  for (const idx of getBookmarkFocusEntries()) {
    const bm = idx.bookmark;
    const marker = L.circleMarker(
      [Number(bm.lat), Number(bm.lng)],
      bookmarkFocusStyle(idx, idx.key === activeKey)
    );
    marker.bindTooltip(`${idx.acronym} · ${bm.label}`, {
      direction: 'top',
      opacity: 0.95,
      className: 'atlas-bookmark-focus-tooltip',
    });
    marker.on('add', () => {
      const el = marker.getElement?.();
      if (el) {
        el.dataset.key = idx.key;
        el.setAttribute('aria-label', `${idx.acronym} bookmark focus point`);
      }
    });
    marker.on('click', () => selectIndex(idx.key));
    marker.addTo(bookmarkFocusLayer);
    bookmarkFocusMarkers.set(idx.key, marker);
  }

  return bookmarkFocusLayer;
}

function updateBookmarkFocusButton() {
  const btn = document.getElementById('toggle-bookmark-focus');
  if (!btn) return;
  btn.classList.toggle('is-active', state.bookmarkFocusVisible);
  btn.setAttribute('aria-pressed', state.bookmarkFocusVisible ? 'true' : 'false');
  btn.title = state.bookmarkFocusVisible
    ? 'Hide bookmark focus points'
    : `Show ${getBookmarkFocusEntries().length} bookmark focus points`;
}

function updateBookmarkFocusMarkers() {
  if (!bookmarkFocusLayer) return;
  for (const idx of getBookmarkFocusEntries()) {
    const marker = bookmarkFocusMarkers.get(idx.key);
    if (!marker) continue;
    marker.setStyle(bookmarkFocusStyle(idx, idx.key === activeKey));
  }
}

function setBookmarkFocusVisible(visible) {
  state.bookmarkFocusVisible = visible === true;
  const layer = ensureBookmarkFocusLayer();
  if (state.bookmarkFocusVisible) {
    if (!map.hasLayer(layer)) layer.addTo(map);
  } else if (map.hasLayer(layer)) {
    map.removeLayer(layer);
  }
  updateBookmarkFocusMarkers();
  updateBookmarkFocusButton();
}

function sensorNote(idx) {
  const tier = coverageTier(idx);
  if (tier === 'live') return '';
  if (tier === 'pending') {
    return 'Sentinel-2 can compute this index — a peak-signal proof location is still being validated. Showing True Color context here.';
  }
  return `Live rendering needs ${idx.platformShort} — concept entry; showing True Color context here.`;
}

function extractProviderErrorMessage(text) {
  if (!text) return '';

  try {
    const data = JSON.parse(text);
    return data.detail || data.description || data.message || data.error || '';
  } catch (_) {
    // Sentinel Hub WMS errors are usually XML ServiceException reports.
  }

  const cdataMatch = text.match(/<!\[CDATA\[\s*([\s\S]*?)\s*\]\]>/);
  if (cdataMatch) return cdataMatch[1].replace(/\s+/g, ' ').trim();

  const serviceMatch = text.match(/<ServiceException[^>]*>\s*([\s\S]*?)\s*<\/ServiceException>/i);
  if (serviceMatch) {
    return serviceMatch[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return text.replace(/\s+/g, ' ').trim().slice(0, 240);
}

async function buildProviderFetchError(response) {
  const text = await response.text().catch(() => '');
  const detail = extractProviderErrorMessage(text);
  const err = new Error(detail ? `HTTP ${response.status}: ${detail}` : `HTTP ${response.status}`);
  err.status = response.status;
  err.statusText = response.statusText;
  err.detail = detail;
  err.isQuotaExhausted = /insufficient processing units|additional credits|requests available|quota/i.test(detail);
  return err;
}

function getTileErrorMessage(layerName, error) {
  const status = error?.status;
  const providerLabel = isGeeProvider() ? 'Earth Engine' : 'Sentinel Hub WMS';
  if (status === 429) {
    return error?.detail
      ? `Atlas ${providerLabel} rate limited ${layerName}: ${error.detail}`
      : `Atlas ${providerLabel} rate limited ${layerName}. Cooling down before retrying.`;
  }
  if (status === 403 && error?.isQuotaExhausted) {
    return `Atlas ${providerLabel} quota/credits unavailable for ${layerName}: ${error.detail}`;
  }
  if (status === 403 && error?.detail) {
    return `Atlas ${providerLabel} denied ${layerName}: ${error.detail}`;
  }
  if (error?.detail) {
    return `Atlas ${providerLabel} tiles failed for ${layerName} (HTTP ${status || 'error'}): ${error.detail}`;
  }
  if (status) return `Atlas ${providerLabel} tiles failed for ${layerName} (HTTP ${status}). Check provider config and date coverage.`;
  return `Atlas ${providerLabel} tiles failed for ${layerName}. Check provider config and date coverage.`;
}

// --- No-data detection ---------------------------------------------------
// Providers can return a fully transparent PNG (HTTP 200) when the time window
// has no available scene. Tiles load via blob:// URLs (same-origin), so
// canvas pixel reads are always untainted — no crossOrigin needed.
const NODATA_CANVAS = document.createElement('canvas');
NODATA_CANVAS.width = NODATA_CANVAS.height = 8;
const NODATA_CTX = NODATA_CANVAS.getContext('2d', { willReadFrequently: true });

function tileHasData(img) {
  try {
    NODATA_CTX.clearRect(0, 0, 8, 8);
    NODATA_CTX.drawImage(img, 0, 0, 8, 8);
    const { data } = NODATA_CTX.getImageData(0, 0, 8, 8);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 8) return true;
    }
    return false;
  } catch {
    return true;
  }
}

// --- Fetch-based tile layers ---------------------------------------------
// Uses fetch() instead of <img src> so we get actual HTTP status codes on
// failure, and tiles load via blob:// URLs (same-origin, no CORS needed).
// Mirrors the RateLimitedWMS pattern in map.js.
const FetchTile = L.TileLayer.extend({
  initialize(url, options = {}) {
    L.TileLayer.prototype.initialize.call(this, url, options);
    this._queue = [];
    this._active = 0;
    this._maxConcurrent = options.maxConcurrent || 2;
    this._retries = options.retries ?? 4;
    this._retryDelay = options.retryDelay || 1500;
  },

  createTile(coords, done) {
    const img = document.createElement('img');
    this._enqueue(this.getTileUrl(coords), img, done, this._retries);
    return img;
  },

  _enqueue(url, img, done, retriesLeft) {
    this._queue.push({ url, img, done, retriesLeft });
    this._drain();
  },

  _drain() {
    while (this._active < this._maxConcurrent && this._queue.length > 0) {
      this._active++;
      this._fetchTile(this._queue.shift());
    }
  },

  _release(error, img, done) {
    this._active--;
    this._drain();
    done(error, img);
  },

  _fetchTile({ url, img, done, retriesLeft }) {
    fetch(url)
      .then(async r => {
        if (r.status === 429 && retriesLeft > 0) {
          this._active--;
          this._drain();
          setTimeout(
            () => this._enqueue(url, img, done, retriesLeft - 1),
            this._retryDelay * Math.max(1, this._retries - retriesLeft + 1)
          );
          return null;
        }
        if (!r.ok) {
          throw await buildProviderFetchError(r);
        }
        return r.blob();
      })
      .then(blob => {
        if (!blob) return;
        const objUrl = URL.createObjectURL(blob);
        img.onload = () => { URL.revokeObjectURL(objUrl); this._release(null, img, done); };
        img.onerror = () => { URL.revokeObjectURL(objUrl); this._release(new Error('decode failed'), img, done); };
        img.src = objUrl;
      })
      .catch(e => this._release(e, img, done));
  }
});

let atlasSentinelWmsCooldownUntil = 0;

function getRetryAfterMs(response, fallbackMs) {
  const retryAfter = response.headers.get('retry-after');
  if (!retryAfter) return fallbackMs;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const retryDate = Date.parse(retryAfter);
  if (Number.isFinite(retryDate)) return Math.max(fallbackMs, retryDate - Date.now());
  return fallbackMs;
}

function setAtlasSentinelWmsCooldown(delayMs) {
  atlasSentinelWmsCooldownUntil = Math.max(atlasSentinelWmsCooldownUntil, Date.now() + delayMs);
}

const FetchWMS = L.TileLayer.WMS.extend({
  initialize(url, options = {}) {
    L.TileLayer.WMS.prototype.initialize.call(this, url, options);
    this._queue = [];
    this._active = 0;
    this._cooldownTimer = null;
    this._maxConcurrent = options.maxConcurrent || 1;
    this._retries = options.retries ?? 1;
    this._retryDelay = options.retryDelay || 8000;
  },

  createTile(coords, done) {
    const img = document.createElement('img');
    this._enqueue(this.getTileUrl(coords), img, done, this._retries);
    return img;
  },

  _enqueue(url, img, done, retriesLeft) {
    this._queue.push({ url, img, done, retriesLeft });
    this._drain();
  },

  _drain() {
    const cooldownRemaining = atlasSentinelWmsCooldownUntil - Date.now();
    if (cooldownRemaining > 0) {
      if (!this._cooldownTimer) {
        this._cooldownTimer = setTimeout(() => {
          this._cooldownTimer = null;
          this._drain();
        }, cooldownRemaining + 50);
      }
      return;
    }

    while (this._active < this._maxConcurrent && this._queue.length > 0) {
      this._active++;
      this._fetchTile(this._queue.shift());
    }
  },

  _release(error, img, done) {
    this._active--;
    this._drain();
    done(error, img);
  },

  _fetchTile({ url, img, done, retriesLeft }) {
    fetch(url)
      .then(async r => {
        if (r.status === 429 && retriesLeft > 0) {
          const retryDelayMs = getRetryAfterMs(
            r,
            this._retryDelay * Math.max(1, this._retries - retriesLeft + 1)
          );
          setAtlasSentinelWmsCooldown(retryDelayMs);
          this.fire('ratelimit', { retryAfterMs: retryDelayMs });
          this._active--;
          setTimeout(() => this._enqueue(url, img, done, retriesLeft - 1), retryDelayMs);
          return null;
        }
        if (!r.ok) {
          throw await buildProviderFetchError(r);
        }
        return r.blob();
      })
      .then(blob => {
        if (!blob) return;
        const objUrl = URL.createObjectURL(blob);
        img.onload = () => { URL.revokeObjectURL(objUrl); this._release(null, img, done); };
        img.onerror = () => { URL.revokeObjectURL(objUrl); this._release(new Error('decode failed'), img, done); };
        img.src = objUrl;
      })
      .catch(e => this._release(e, img, done));
  }
});

function stripComments(script) {
  return script
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/([^:]|^)\/\/.*$/gm, '$1')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .join('\n');
}

function encodeScript(script) {
  const bytes = new TextEncoder().encode(stripComments(script));
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
}

function getTimeWindow(date) {
  const windowDays = state.windowDays;
  const endDate = date;
  const startDate = new Date(new Date(date).getTime() - windowDays * 86400000)
    .toISOString().split('T')[0];
  return { startDate, endDate, timeStr: `${startDate}/${endDate}`, windowDays };
}

function watchTileBatch(layer, layerName) {
  let batchTiles = 0;
  let batchWithData = 0;
  let batchErrored = false;

  function settleBatch() {
    if (pendingTiles > 0) return;
    if (batchErrored) return;
    if (batchTiles > 0 && batchWithData === 0) {
      setTileStatus(
        'No scene data in this window — widen the window or raise cloud tolerance.',
        'info'
      );
    } else {
      setTileStatus('');
    }
  }

  layer.on('tileloadstart', () => {
    pendingTiles++;
    if (pendingTiles === 1) setTileStatus('Loading…', 'loading');
  });
  layer.on('tileload', (event) => {
    pendingTiles = Math.max(0, pendingTiles - 1);
    batchTiles++;
    if (tileHasData(event.tile)) batchWithData++;
    settleBatch();
  });
  layer.on('tileerror', (event) => {
    pendingTiles = Math.max(0, pendingTiles - 1);
    batchErrored = true;
    setTileStatus(getTileErrorMessage(layerName, event.error), 'error');
  });
  layer.on('ratelimit', (event) => {
    const retryAfterMs = Number(event?.retryAfterMs || 15000);
    state.sentinelRateLimitedUntil = Math.max(state.sentinelRateLimitedUntil || 0, Date.now() + retryAfterMs);
    updateAtlasSentinelUI();
    setTileStatus(`Sentinel Hub rate limit reached — cooling down ${Math.ceil(retryAfterMs / 1000)}s.`, 'error');
  });
}

function buildGeeUrl(idx, date, opts = {}) {
  const { timeStr, endDate } = getTimeWindow(date);
  const params = new URLSearchParams({
    app: 'atlas',
    index: idx.key,
    acronym: idx.acronym || idx.key,
    time: timeStr,
    date: endDate,
    source: idx.canRender ? 'index' : 'context',
    platform: idx.platformShort || idx.platform || '',
    minZoom: String(opts.minZoom != null ? opts.minZoom : 10),
    maxcc: String(state.maxcc)
  });
  if (atlasConfig.geeApiKey) params.set('key', atlasConfig.geeApiKey);
  return `${atlasConfig.geeTileEndpoint}/{z}/{x}/{y}?${params.toString()}`;
}

function applyGEE(idx, date, opts = {}) {
  refreshAtlasConfig();
  if (wmsLayer) { map.removeLayer(wmsLayer); wmsLayer = null; }
  if (!idx) return;

  pendingTiles = 0;
  const { windowDays } = getTimeWindow(date);
  const layerName = idx.acronym || idx.key;

  updateWindowDisplay(date, windowDays);
  setTileStatus('');

  wmsLayer = new FetchTile(buildGeeUrl(idx, date, opts), {
    opacity: state.opacity,
    attribution: 'Google Earth Engine / Limn Atlas',
    tileSize: 256,
    minZoom: opts.minZoom != null ? opts.minZoom : 10,
    updateWhenIdle: true,
    detectRetina: true,
    maxConcurrent: 2,
    retries: 4,
    retryDelay: 1800,
  });
  watchTileBatch(wmsLayer, layerName);
  wmsLayer.addTo(map);
  applyCaptureComparison();
}

function applyWMS(evalscript, date, opts = {}) {
  refreshAtlasConfig();
  if (wmsLayer) { map.removeLayer(wmsLayer); wmsLayer = null; }
  if (!evalscript) return;

  pendingTiles = 0;
  const encoded = encodeScript(evalscript);
  const { timeStr, windowDays } = getTimeWindow(date);
  const layerName = opts.layer || atlasConfig.wmsLayer;

  updateWindowDisplay(date, windowDays);
  setTileStatus('');

  wmsLayer = new FetchWMS(atlasConfig.wmsUrl, {
    layers: layerName,
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    time: timeStr,
    maxcc: state.maxcc,
    showlogo: false,
    evalscript: encoded,
    opacity: state.opacity,
    attribution: 'Copernicus Sentinel Hub',
    tileSize: 512,
    minZoom: opts.minZoom != null ? opts.minZoom : 10,
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 0,
    maxConcurrent: 1,
    retries: 1,
    retryDelay: 10000,
  });
  watchTileBatch(wmsLayer, layerName);
  wmsLayer.addTo(map);
  applyCaptureComparison();
}

function applyAtlasTiles(idx, date) {
  refreshAtlasConfig();
  const opts = { layer: getWmsCarrierLayer(idx), minZoom: idx.minZoom };
  if (isGeeProvider()) {
    applyGEE(idx, date, opts);
    updateAtlasSentinelUI();
    return;
  }

  const guardStatus = getAtlasSentinelGuardStatus();
  if (guardStatus.blocked) {
    if (wmsLayer) { map.removeLayer(wmsLayer); wmsLayer = null; }
    pendingTiles = 0;
    updateWindowDisplay(date, state.windowDays);
    updateAtlasSentinelUI();
    if (guardStatus.reason === 'zoom') {
      setTileStatus(`Sentinel guarded below Z${guardStatus.minZoom}. Zoom in or lower the Sentinel zoom gate.`, 'info');
    } else if (guardStatus.reason === 'cooldown') {
      const seconds = Math.max(1, Math.ceil((guardStatus.until - Date.now()) / 1000));
      setTileStatus(`Sentinel Hub cooling down ${seconds}s after rate limit.`, 'info');
    } else {
      setTileStatus('Sentinel WMS is disarmed. Toggle Sentinel on to request live tiles.', 'info');
    }
    return;
  }

  applyWMS(getDisplayEvalscript(idx), date, opts);
  updateAtlasSentinelUI();
}

function selectIndex(key) {
  const idx = ATLAS_INDICES.find(i => i.key === key);
  if (!idx) return;

  activeKey = key;

  // Highlight active button
  document.querySelectorAll('.atlas-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-key="${key}"]`);
  if (btn) {
    btn.classList.add('active');
    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  updateBookmarkFocusMarkers();

  // Navigate to bookmark
  const bm = idx.bookmark;
  state.date = bm.date;
  document.getElementById('date-input').value = bm.date;

  map.setView([bm.lat, bm.lng], bm.zoom, { animate: true });

  // Apply WMS (evalscript or TC fallback shown transparently).
  // When paused, skip the tile request entirely so panning/browsing is free.
  if (state.paused) {
    if (wmsLayer) { map.removeLayer(wmsLayer); wmsLayer = null; }
    updateWindowDisplay(bm.date, state.windowDays);
    setTileStatus('Tiles paused — click “▶ Render here” to draw this index.', 'info');
  } else {
    applyAtlasTiles(idx, bm.date);
  }
  const note = document.getElementById('sensor-note');
  note.textContent = sensorNote(idx);
  note.className = `cov-note cov-note--${coverageTier(idx)}`;

  // Update legend
  const grad = document.getElementById('legend-gradient');
  grad.style.background = idx.gradient || 'linear-gradient(to right, #111, #fff)';
  document.getElementById('legend-label').textContent = idx.acronym;
  const scale = Array.isArray(idx.legend) && idx.legend.length === 2 ? idx.legend : ['Low', 'High'];
  document.getElementById('legend-low').textContent = scale[0];
  document.getElementById('legend-high').textContent = scale[1];

  // Update info panel
  document.getElementById('info-acronym').textContent = idx.acronym;
  document.getElementById('info-name').textContent = idx.name;
  document.getElementById('info-platform').textContent = idx.platform;
  document.getElementById('info-novelty').textContent = `Novelty: ${idx.novelty}`;
  renderEvidencePanel(idx);
  document.getElementById('info-bands').textContent = bandsLabel(idx);
  document.getElementById('info-formula').textContent = idx.formula;
  document.getElementById('info-physics').textContent = idx.physics;
  document.getElementById('info-benefit').textContent = idx.benefit;
  renderLinkedInGroundTruth(idx);
  renderCaptureOverlay(idx);
  document.getElementById('info-bookmark').textContent =
    `📍 ${bm.label} · ${bm.date}`;

  document.getElementById('info-justification').textContent = idx.justification ||
    (idx.canRender ? 'Peak-signal proof target for this renderable index.' : 'Context target for a non-renderable sensor concept.');

  // Info-panel height can change with the new content — keep the legend clear of it.
  positionLegend();
}

// Draw the active index at the current view/date (incurs provider tile usage).
function renderActive() {
  if (!activeKey) return;
  const idx = ATLAS_INDICES.find(i => i.key === activeKey);
  if (idx) applyAtlasTiles(idx, state.date);
}

// Control-change refresh (date/cloud/window) — suppressed while paused.
function refreshTiles() {
  if (state.paused) return;
  renderActive();
}

function setPauseButton() {
  const btn = document.getElementById('toggle-pause');
  if (!btn) return;
  if (state.paused) {
    btn.textContent = '▶ Render here';
    btn.classList.add('armed');
    btn.title = 'Draw the active index at the current view';
  } else {
    btn.textContent = '⏸ Pause tiles';
    btn.classList.remove('armed');
    btn.title = 'Pause tiles to pan and zoom without provider requests';
  }
}

// Order within a domain: doable first (live → pending), can't-do-yet
// (sensor-limited) last; within each tier, T1 → T2 → T3.
const TIER_RANK = { live: 0, pending: 1, sensor: 2 };
const NOVELTY_RANK = { T1: 0, T2: 1, T3: 2, DEMO: 3 };
function sidebarSort(a, b) {
  const t = TIER_RANK[coverageTier(a)] - TIER_RANK[coverageTier(b)];
  if (t !== 0) return t;
  return (NOVELTY_RANK[a.novelty] ?? 9) - (NOVELTY_RANK[b.novelty] ?? 9);
}

function buildSidebar() {
  const container = document.getElementById('domain-list');
  for (const domain of ATLAS_DOMAINS) {
    const indices = ATLAS_INDICES.filter(i => i.domain === domain.id).sort(sidebarSort);
    if (!indices.length) continue;

    const section = document.createElement('div');
    section.className = 'domain-section';

    const header = document.createElement('button');
    header.className = 'domain-header';
    header.innerHTML = `<span class="domain-icon">${domain.icon}</span><span>${domain.label}</span><span class="domain-count">${indices.length}</span>`;
    header.addEventListener('click', () => {
      section.classList.toggle('collapsed');
    });

    const body = document.createElement('div');
    body.className = 'domain-body';

    for (const idx of indices) {
      const tier = coverageTier(idx);
      const btn = document.createElement('button');
      btn.className = `atlas-btn cov-${tier}`;
      btn.dataset.key = idx.key;
      if (!idx.canRender) btn.classList.add('stub');

      btn.innerHTML = `
        <span class="btn-acronym"><span class="cov-dot cov-dot--${tier}"></span>${idx.acronym}</span>
        <span class="btn-meta">
          <span class="btn-platform">${tierTag(idx)}</span>
          <span class="btn-novelty tier-${idx.novelty.toLowerCase()}">${idx.novelty}</span>
        </span>
      `;
      btn.title = `${idx.name} — ${tier === 'live' ? 'live-mappable' : tier === 'pending' ? 'Sentinel-2-capable, proof pending' : 'sensor-limited (context only)'}`;
      btn.addEventListener('click', () => selectIndex(idx.key));
      body.appendChild(btn);
    }

    section.appendChild(header);
    section.appendChild(body);
    container.appendChild(section);
  }
}

// Lift the legend to sit just above the info panel when it's open, so both are
// visible at once; otherwise let it fall back to its default bottom (CSS).
function positionLegend() {
  const legend = document.querySelector('.atlas-legend');
  const info = document.getElementById('info-panel');
  if (!legend || !info) return;
  if (state.captureMode) {
    legend.style.bottom = '';
    return;
  }
  if (info.classList.contains('hidden')) {
    legend.style.bottom = '';
  } else {
    legend.style.bottom = `${info.offsetHeight + 14}px`;
  }
}

function updateWindowDisplay(date, windowDays) {
  const el = document.getElementById('date-window-display');
  if (!el) return;
  const end = new Date(date);
  const start = new Date(end.getTime() - windowDays * 86400000);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  el.textContent = `📅 ${fmt(start)} → ${fmt(end)}`;
}

// Populate the coverage summary + About panel counts from live catalog data,
// so the figures stay correct as indices are reclassified.
function buildAboutPanel() {
  const c = coverageCounts();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const novelTotal = c.live + c.pending + c.sensor;
  set('coverage-summary', `${novelTotal} novel · ${c.live} live · +${c.demo} demos`);
  set('about-count-live', c.live);
  set('about-count-pending', c.pending);
  set('about-count-sensor', c.sensor);
  set('about-count-demo', c.demo);

  // Novelty-tier tally over the 91 novel catalog (exclude demonstrators).
  const nov = { T1: 0, T2: 0, T3: 0 };
  for (const i of ATLAS_INDICES) {
    if (isDemo(i)) continue;
    if (nov[i.novelty] != null) nov[i.novelty]++;
  }
  set('about-nov-t1', `· ${nov.T1}`);
  set('about-nov-t2', `· ${nov.T2}`);
  set('about-nov-t3', `· ${nov.T3}`);
}

function initMap() {
  BASE_TILES = {
    esri: L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Esri WorldImagery', maxZoom: 20 }
    ),
    osm: L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap', maxZoom: 19 }
    )
  };

  map = L.map('atlas-map', {
    center: [20, 0],
    zoom: 3,
    zoomControl: false,
    attributionControl: true
  });

  BASE_TILES[state.base].addTo(map);

  map.createPane('atlasBookmarkFocusPane');
  map.getPane('atlasBookmarkFocusPane').style.zIndex = 575;

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  map.on('zoomend', () => {
    updateAtlasSentinelUI();
    if (isSentinelProvider() && !state.paused && activeKey) renderActive();
  });

  // Base layer toggle
  document.getElementById('toggle-base').addEventListener('click', () => {
    const keys = Object.keys(BASE_TILES);
    const next = keys[(keys.indexOf(state.base) + 1) % keys.length];
    map.removeLayer(BASE_TILES[state.base]);
    state.base = next;
    BASE_TILES[state.base].addTo(map);
    document.getElementById('toggle-base').textContent =
      next === 'esri' ? '🛰 Satellite' : '🗺 Map';
  });
}

function initControls() {
  syncAtlasSentinelState();
  updateAtlasSentinelUI();

  // Date input
  const dateInput = document.getElementById('date-input');
  dateInput.value = state.date;
  dateInput.addEventListener('change', () => {
    state.date = dateInput.value;
    refreshTiles();
  });

  // Opacity slider
  const opSlider = document.getElementById('opacity-slider');
  opSlider.value = state.opacity;
  opSlider.addEventListener('input', () => {
    state.opacity = parseFloat(opSlider.value);
    if (state.captureMode) {
      applyCaptureComparison();
    } else if (wmsLayer) {
      wmsLayer.setOpacity(state.opacity);
    }
  });

  // Search filter
  const search = document.getElementById('idx-search');
  search.addEventListener('input', () => {
    const q = normalizeSearchText(search.value);
    document.querySelectorAll('.atlas-btn').forEach(btn => {
      const key = btn.dataset.key;
      const idx = ATLAS_INDICES.find(i => i.key === key);
      if (!idx) return;
      const domain = ATLAS_DOMAINS.find(d => d.id === idx.domain);
      const searchable = [
        idx.key,
        idx.acronym,
        idx.name,
        idx.domain,
        domain?.label,
        idx.platform,
        idx.platformShort,
      ].map(normalizeSearchText).join(' ');
      const match = !q || searchable.includes(q);
      btn.style.display = match ? '' : 'none';
    });
    // Show all domain sections when filtering
    if (q) {
      document.querySelectorAll('.domain-section').forEach(s => s.classList.remove('collapsed'));
    }
  });

  // Cloud cover slider
  const maxccSlider = document.getElementById('maxcc-slider');
  const maxccValue = document.getElementById('maxcc-value');
  maxccSlider.value = state.maxcc;
  maxccSlider.addEventListener('input', () => {
    state.maxcc = parseInt(maxccSlider.value, 10);
    maxccValue.textContent = `${state.maxcc}%`;
    refreshTiles();
  });

  // Date window pills
  document.querySelectorAll('.window-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      state.windowDays = parseInt(pill.dataset.days, 10);
      document.querySelectorAll('.window-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      refreshTiles();
    });
  });

  // Pause tiles — drop the provider overlay so pan/zoom uses zero tile requests.
  // Toggling back ("Render here") redraws the active index at the current view.
  setPauseButton();
  document.getElementById('toggle-pause').addEventListener('click', () => {
    if (!state.paused) {
      state.paused = true;
      if (wmsLayer) { map.removeLayer(wmsLayer); wmsLayer = null; }
      setTileStatus('Tiles paused — pan and zoom freely without provider tile requests. Click “▶ Render here” to draw the active index.', 'info');
    } else {
      state.paused = false;
      setTileStatus('');
      renderActive();
    }
    setPauseButton();
  });

  updateBookmarkFocusButton();
  const bookmarkFocusToggle = document.getElementById('toggle-bookmark-focus');
  if (bookmarkFocusToggle) {
    bookmarkFocusToggle.addEventListener('click', () => {
      setBookmarkFocusVisible(!state.bookmarkFocusVisible);
    });
  }

  const captureToggle = document.getElementById('toggle-capture');
  if (captureToggle) {
    captureToggle.addEventListener('click', () => {
      setCaptureMode(!state.captureMode);
    });
  }

  const exitCapture = document.getElementById('exit-capture');
  if (exitCapture) {
    exitCapture.addEventListener('click', () => {
      setCaptureMode(false);
    });
  }

  document.querySelectorAll('.capture-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setCaptureView(btn.dataset.captureView);
    });
  });

  const captureSplitSlider = document.getElementById('capture-split-slider');
  if (captureSplitSlider) {
    captureSplitSlider.value = String(state.captureSplit);
    captureSplitSlider.addEventListener('input', (event) => {
      state.captureSplit = Number(event.target.value);
      applyCaptureComparison();
    });
  }

  const sentinelToggle = document.getElementById('atlas-toggle-sentinel-live');
  if (sentinelToggle) {
    sentinelToggle.addEventListener('change', (event) => {
      if (event.target.checked) {
        runtimeAtlasImageProviderOverride = 'sentinelhub';
        state.sentinelLiveTiles = true;
        state.sentinelRateLimitedUntil = 0;
      } else {
        if (runtimeAtlasImageProviderOverride === 'sentinelhub') runtimeAtlasImageProviderOverride = null;
        state.sentinelLiveTiles = false;
        state.sentinelRateLimitedUntil = 0;
      }
      refreshAtlasConfig();
      updateAtlasSentinelUI();
      if (!state.paused) renderActive();
    });
  }

  const sentinelSource = document.getElementById('atlas-sentinel-source');
  if (sentinelSource) {
    sentinelSource.addEventListener('change', (event) => {
      runtimeAtlasWmsSource = event.target.value;
      state.sentinelRateLimitedUntil = 0;
      refreshAtlasConfig();
      updateAtlasSentinelUI();
      if (isSentinelProvider() && !state.paused) renderActive();
    });
  }

  const sentinelZoom = document.getElementById('atlas-sentinel-min-zoom');
  if (sentinelZoom) {
    sentinelZoom.value = String(state.sentinelMinZoom);
    sentinelZoom.addEventListener('input', (event) => {
      state.sentinelMinZoom = Number(event.target.value);
      updateAtlasSentinelUI();
    });
    sentinelZoom.addEventListener('change', () => {
      updateAtlasSentinelUI();
      if (isSentinelProvider() && !state.paused) renderActive();
    });
  }

  // Info toggle — keep the legend visible by lifting it above the info panel
  document.getElementById('toggle-info').addEventListener('click', () => {
    document.getElementById('info-panel').classList.toggle('hidden');
    positionLegend();
  });
  window.addEventListener('resize', positionLegend);

  const copyLinkedIn = document.getElementById('copy-linkedin-ground-truth');
  if (copyLinkedIn) {
    copyLinkedIn.addEventListener('click', async () => {
      if (!currentLinkedInGroundTruthDraft) return;
      try {
        await navigator.clipboard.writeText(currentLinkedInGroundTruthDraft);
        copyLinkedIn.textContent = 'Copied';
        window.setTimeout(() => { copyLinkedIn.textContent = 'Copy draft'; }, 1600);
      } catch {
        copyLinkedIn.textContent = 'Copy failed';
        window.setTimeout(() => { copyLinkedIn.textContent = 'Copy draft'; }, 1600);
      }
    });
  }

  // About / coverage overlay
  const aboutOverlay = document.getElementById('about-overlay');
  const openAbout = () => aboutOverlay.classList.remove('hidden');
  const closeAbout = () => aboutOverlay.classList.add('hidden');
  document.getElementById('about-btn').addEventListener('click', openAbout);
  document.getElementById('about-close').addEventListener('click', closeAbout);
  aboutOverlay.addEventListener('click', (e) => {
    if (e.target === aboutOverlay) closeAbout(); // click backdrop to dismiss
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !aboutOverlay.classList.contains('hidden')) closeAbout();
  });
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export async function initAtlas() {
  initMap();
  buildSidebar();
  buildAboutPanel();
  initControls();

  // Auto-select first renderable index
  const first = ATLAS_INDICES.find(i => i.canRender);
  if (first) selectIndex(first.key);
}
