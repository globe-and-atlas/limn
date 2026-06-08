/* ==========================================================================
   Globe & Atlas · Limn — Atlas App
   Simplified viewer for the Global Spectral Index Atlas (91 novel indices).
   No produced-water tools. Each index navigates to a curated bookmark.
   ========================================================================== */

import { ATLAS_INDICES as NOVEL_INDICES, ATLAS_DOMAINS as NOVEL_DOMAINS } from './atlas-indices.js';
import { SAR_DEMO_INDICES, SAR_DEMO_DOMAIN } from './atlas-sar-demos.js';
import { S5P_DEMO_INDICES, S5P_DEMO_DOMAIN } from './atlas-s5p-demos.js';

// The 91 novel indices plus the live Sentinel-1 SAR and Sentinel-5P TROPOMI
// demonstrators (kept in separate modules so the novel catalog stays exactly
// 91). Downstream code uses the merged arrays transparently.
const ATLAS_INDICES = [...NOVEL_INDICES, ...SAR_DEMO_INDICES, ...S5P_DEMO_INDICES];
const ATLAS_DOMAINS = [...NOVEL_DOMAINS, SAR_DEMO_DOMAIN, S5P_DEMO_DOMAIN];

const DEFAULT_SH_WMS_URL = 'https://sh.dataspace.copernicus.eu/ogc/wms/959ea2c5-5892-4b36-82b3-76e6bdb93c8a';
const DEFAULT_WMS_LAYER = 'AGRICULTURE';
const CONTEXT_TRUE_COLOR_EVALSCRIPT = `//VERSION=3
function setup() {
  return { input: ['B04', 'B03', 'B02', 'dataMask'], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0,0];
  return [sample.B04*2.5, sample.B03*2.5, sample.B02*2.5, 1];
}`;

function getAtlasConfig() {
  const cfg = window.CONFIG || {};
  const instanceId = cfg.SH_INSTANCE_ID || cfg.SENTINEL_HUB_INSTANCE_ID || cfg.WMS_INSTANCE_ID;
  const configuredUrl = cfg.SH_WMS_URL || cfg.ATLAS_WMS_URL;
  return {
    wmsUrl: configuredUrl || (instanceId ? `https://sh.dataspace.copernicus.eu/ogc/wms/${instanceId}` : DEFAULT_SH_WMS_URL),
    wmsLayer: cfg.ATLAS_WMS_LAYER || cfg.SH_WMS_LAYER || DEFAULT_WMS_LAYER,
  };
}

const atlasConfig = getAtlasConfig();

let map, wmsLayer, activeKey = null;
let BASE_TILES;
let pendingTiles = 0;
const state = { date: '2021-08-01', opacity: 0.85, base: 'esri', maxcc: 30, windowDays: 15, paused: false };

function setTileStatus(message = '', type = 'info') {
  const status = document.getElementById('tile-status');
  if (!status) return;
  status.textContent = message;
  status.className = message ? `visible ${type}` : '';
}

function getIndexLayer(idx) {
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

function sensorNote(idx) {
  const tier = coverageTier(idx);
  if (tier === 'live') return '';
  if (tier === 'pending') {
    return 'Sentinel-2 can compute this index — a peak-signal proof location is still being validated. Showing True Color context here.';
  }
  return `Live rendering needs ${idx.platformShort} — concept entry; showing True Color context here.`;
}

function getTileErrorMessage(layerName, error) {
  const status = error?.status;
  if (status) return `Atlas tiles failed for ${layerName} (HTTP ${status}). Check WMS config, layer, quota, and date coverage.`;
  return `Atlas tiles failed for ${layerName}. Check WMS config, layer, quota, and date coverage.`;
}

// --- No-data detection ---------------------------------------------------
// Sentinel Hub returns a fully transparent PNG (HTTP 200) when the time window
// has no cloud-free scene. Tiles load via blob:// URLs (same-origin), so
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

// --- Fetch-based WMS tile layer ------------------------------------------
// Uses fetch() instead of <img src> so we get actual HTTP status codes on
// failure, and tiles load via blob:// URLs (same-origin, no CORS needed).
// Mirrors the RateLimitedWMS pattern in map.js.
const FetchWMS = L.TileLayer.WMS.extend({
  createTile(coords, done) {
    const img = document.createElement('img');
    this._fetchTile(this.getTileUrl(coords), img, done, 2);
    return img;
  },

  _fetchTile(url, img, done, retriesLeft) {
    fetch(url)
      .then(async r => {
        if (r.status === 429 && retriesLeft > 0) {
          setTimeout(() => this._fetchTile(url, img, done, retriesLeft - 1), 2000);
          return null;
        }
        if (!r.ok) {
          const text = await r.text().catch(() => '');
          const err = new Error(`HTTP ${r.status}`);
          err.status = r.status;
          err.detail = text.slice(0, 200);
          throw err;
        }
        return r.blob();
      })
      .then(blob => {
        if (!blob) return;
        const objUrl = URL.createObjectURL(blob);
        img.onload = () => { URL.revokeObjectURL(objUrl); done(null, img); };
        img.onerror = () => { URL.revokeObjectURL(objUrl); done(new Error('decode failed'), img); };
        img.src = objUrl;
      })
      .catch(e => done(e, img));
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

function applyWMS(evalscript, date, opts = {}) {
  if (wmsLayer) { map.removeLayer(wmsLayer); wmsLayer = null; }
  if (!evalscript) return;

  pendingTiles = 0;
  const encoded = encodeScript(evalscript);
  const windowDays = state.windowDays;
  const endDate = date;
  const startDate = new Date(new Date(date).getTime() - windowDays * 86400000)
    .toISOString().split('T')[0];
  const timeStr = `${startDate}/${endDate}`;
  const layerName = opts.layer || atlasConfig.wmsLayer;

  updateWindowDisplay(date, windowDays);
  setTileStatus('');

  // Per-batch counters (closure-scoped to this layer instance).
  let batchTiles = 0;
  let batchWithData = 0;
  let batchErrored = false;

  function settleBatch() {
    if (pendingTiles > 0) return;
    if (batchErrored) return; // a tileerror already set a more specific message
    if (batchTiles > 0 && batchWithData === 0) {
      setTileStatus(
        'No cloud-free scene in this window — widen the window or raise cloud tolerance.',
        'info'
      );
    } else {
      setTileStatus('');
    }
  }

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
    tileSize: 256,
    minZoom: opts.minZoom != null ? opts.minZoom : 10,
    updateWhenIdle: true,
  });
  wmsLayer.on('tileloadstart', () => {
    pendingTiles++;
    if (pendingTiles === 1) setTileStatus('Loading…', 'loading');
  });
  wmsLayer.on('tileload', (event) => {
    pendingTiles = Math.max(0, pendingTiles - 1);
    batchTiles++;
    if (tileHasData(event.tile)) batchWithData++;
    settleBatch();
  });
  wmsLayer.on('tileerror', (event) => {
    pendingTiles = Math.max(0, pendingTiles - 1);
    batchErrored = true;
    setTileStatus(getTileErrorMessage(layerName, event.error), 'error');
  });
  wmsLayer.addTo(map);
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
    applyWMS(getDisplayEvalscript(idx), bm.date, { layer: getIndexLayer(idx), minZoom: idx.minZoom });
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
  document.getElementById('info-bands').textContent = bandsLabel(idx);
  document.getElementById('info-formula').textContent = idx.formula;
  document.getElementById('info-physics').textContent = idx.physics;
  document.getElementById('info-benefit').textContent = idx.benefit;
  document.getElementById('info-bookmark').textContent =
    `📍 ${bm.label} · ${bm.date}`;

  const sourceEl = document.getElementById('info-source');
  if (idx.source) {
    if (idx.sourceUrl) {
      sourceEl.innerHTML = `<a href="${idx.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #00D2FF; text-decoration: none; border-bottom: 1px dashed rgba(0,210,255,0.4);">${idx.source} ↗</a>`;
    } else {
      sourceEl.textContent = idx.source;
    }
  } else {
    sourceEl.textContent = 'Standard Platform / Sensor Reference';
  }
  document.getElementById('info-justification').textContent = idx.justification ||
    (idx.canRender ? 'Peak-signal proof target for this renderable index.' : 'Context target for a non-renderable sensor concept.');

  // Info-panel height can change with the new content — keep the legend clear of it.
  positionLegend();
}

// Draw the active index at the current view/date (incurs Copernicus usage).
function renderActive() {
  if (!activeKey) return;
  const idx = ATLAS_INDICES.find(i => i.key === activeKey);
  if (idx) applyWMS(getDisplayEvalscript(idx), state.date, { layer: getIndexLayer(idx), minZoom: idx.minZoom });
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
    btn.title = 'Pause tiles to pan and zoom without using Copernicus credits';
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

  L.control.zoom({ position: 'bottomright' }).addTo(map);

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
    if (wmsLayer) wmsLayer.setOpacity(state.opacity);
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

  // Pause tiles — drop the WMS overlay so pan/zoom uses zero Copernicus credits.
  // Toggling back ("Render here") redraws the active index at the current view.
  setPauseButton();
  document.getElementById('toggle-pause').addEventListener('click', () => {
    if (!state.paused) {
      state.paused = true;
      if (wmsLayer) { map.removeLayer(wmsLayer); wmsLayer = null; }
      setTileStatus('Tiles paused — pan and zoom freely (no Copernicus usage). Click “▶ Render here” to draw the active index.', 'info');
    } else {
      state.paused = false;
      setTileStatus('');
      renderActive();
    }
    setPauseButton();
  });

  // Info toggle — keep the legend visible by lifting it above the info panel
  document.getElementById('toggle-info').addEventListener('click', () => {
    document.getElementById('info-panel').classList.toggle('hidden');
    positionLegend();
  });
  window.addEventListener('resize', positionLegend);

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
