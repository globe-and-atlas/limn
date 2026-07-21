import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

let atlasGeeTileHits = 0;
let configuredWmsTileHits = 0;
let viewerWmsTileHits = 0;

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
  }[ext] || 'application/octet-stream';
}

function createStaticServer() {
  return http.createServer((req, res) => {
    const requestUrl = new URL(req.url, 'http://127.0.0.1');
    const urlPath = decodeURIComponent(requestUrl.pathname);

    if (urlPath === '/config-v1.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      res.end(`window.CONFIG = Object.assign(window.CONFIG || {}, {
        IMAGE_PROVIDER: "gee",
        GEE_TILE_ENDPOINT: "/api/gee/tiles",
        ATLAS_GEE_TILE_ENDPOINT: "/api/gee/tiles",
        SH_WMS_URL: "/atlas-wms",
        ATLAS_VIEWER_WMS_URL: "/viewer-wms",
        SENTINEL_CREDIT_GUARD: true,
        SENTINEL_LIVE_TILES: false,
        SENTINEL_MIN_ZOOM: 14,
        ALLOW_SENTINEL_FALLBACK: false
      });`);
      return;
    }

    if (urlPath.startsWith('/api/gee/tiles/')) {
      if (requestUrl.searchParams.get('app') === 'atlas') atlasGeeTileHits++;
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(TRANSPARENT_PNG);
      return;
    }

    if (urlPath === '/atlas-wms') {
      configuredWmsTileHits++;
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(TRANSPARENT_PNG);
      return;
    }

    if (urlPath === '/viewer-wms') {
      viewerWmsTileHits++;
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(TRANSPARENT_PNG);
      return;
    }

    const relativePath = urlPath === '/' ? 'atlas.html' : urlPath.slice(1);
    const filePath = path.normalize(path.join(ROOT, relativePath));
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}

const executablePath = CHROME_PATHS.find(candidate => fs.existsSync(candidate));
if (!executablePath) {
  throw new Error(`No Chrome/Chromium executable found. Checked: ${CHROME_PATHS.join(', ')}`);
}

const server = createStaticServer();
const port = await listen(server);
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.toString()));

  await page.goto(`http://127.0.0.1:${port}/atlas.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.getAtlasProviderState && document.querySelector('.atlas-btn.active'), { timeout: 15000 });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const initial = await page.evaluate(() => window.getAtlasProviderState());
  if (initial.provider !== 'gee') {
    throw new Error(`Atlas should default to GEE, got ${initial.provider}`);
  }
  if (initial.wmsSource !== 'configured') {
    throw new Error(`Atlas should default to the configured WMS source, got ${initial.wmsSource}`);
  }
  if (configuredWmsTileHits !== 0 || viewerWmsTileHits !== 0) {
    throw new Error(`Atlas made WMS requests before Sentinel was toggled on (${configuredWmsTileHits} configured, ${viewerWmsTileHits} viewer).`);
  }
  if (atlasGeeTileHits < 1) {
    throw new Error('Atlas did not request GEE tiles before Sentinel toggle.');
  }

  const familyNavigation = await page.evaluate(async () => {
    const snapshot = () => ({
      activeMode: document.querySelector('[data-sidebar-mode].active')?.dataset.sidebarMode || '',
      buttons: document.querySelectorAll('.atlas-btn').length,
      sections: document.querySelectorAll('.domain-section').length,
      activeKey: document.querySelector('.atlas-btn.active')?.dataset.key || '',
    });
    const capabilities = snapshot();
    document.querySelector('[data-sidebar-mode="research"]').click();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const research = snapshot();
    document.querySelector('[data-sidebar-mode="domains"]').click();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const domains = snapshot();
    document.querySelector('[data-sidebar-mode="capabilities"]').click();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const restored = snapshot();
    return { capabilities, research, domains, restored };
  });
  if (
    familyNavigation.capabilities.activeMode !== 'capabilities'
    || familyNavigation.capabilities.buttons !== 43
    || familyNavigation.research.activeMode !== 'research'
    || familyNavigation.research.buttons !== 53
    || familyNavigation.domains.activeMode !== 'domains'
    || familyNavigation.domains.buttons !== 96
    || familyNavigation.restored.activeMode !== 'capabilities'
    || familyNavigation.restored.buttons !== 43
    || !familyNavigation.restored.activeKey
  ) {
    throw new Error(`Atlas family/domain/research navigation is inconsistent: ${JSON.stringify(familyNavigation)}`);
  }

  const hitsBeforeGroundTruthCheck = {
    gee: atlasGeeTileHits,
    configured: configuredWmsTileHits,
    viewer: viewerWmsTileHits,
  };
  const groundTruthPanel = await page.evaluate(() => {
    const draft = document.getElementById('gt-linkedin-draft')?.textContent || '';
    return {
      hasPanel: !!document.getElementById('info-linkedin-ground-truth'),
      hasRule: !!Array.from(document.querySelectorAll('.gt-post-rule'))
        .some(el => el.textContent.includes('One image. One observation. One reason it matters. One interpretive prompt.')),
      hasVisualAnchor: !!document.getElementById('gt-visual-anchor')?.textContent?.includes('method from the'),
      hasFamilyBoundary: draft.includes('capability') && draft.includes('not as an independently validated invention'),
      hasObservation: !!document.getElementById('gt-observation')?.textContent?.trim(),
      hasWhy: !!document.getElementById('gt-why')?.textContent?.trim(),
      hasQuestion: !!document.getElementById('gt-question')?.textContent?.includes('?'),
      hasCopyButton: !!document.getElementById('copy-linkedin-ground-truth'),
      draftWordCount: draft.split(/\s+/).filter(Boolean).length,
    };
  });
  if (!groundTruthPanel.hasPanel || !groundTruthPanel.hasRule || !groundTruthPanel.hasVisualAnchor || !groundTruthPanel.hasFamilyBoundary) {
    throw new Error(`Atlas LinkedIn Ground Truth panel did not render expected guidance: ${JSON.stringify(groundTruthPanel)}`);
  }
  if (!groundTruthPanel.hasObservation || !groundTruthPanel.hasWhy || !groundTruthPanel.hasQuestion || !groundTruthPanel.hasCopyButton) {
    throw new Error(`Atlas LinkedIn Ground Truth panel is missing post ingredients: ${JSON.stringify(groundTruthPanel)}`);
  }
  if (groundTruthPanel.draftWordCount < 30 || groundTruthPanel.draftWordCount > 300) {
    throw new Error(`Atlas LinkedIn draft should be concise and under 300 words, got ${groundTruthPanel.draftWordCount}`);
  }
  if (
    atlasGeeTileHits !== hitsBeforeGroundTruthCheck.gee
    || configuredWmsTileHits !== hitsBeforeGroundTruthCheck.configured
    || viewerWmsTileHits !== hitsBeforeGroundTruthCheck.viewer
  ) {
    throw new Error('Atlas LinkedIn Ground Truth panel should not request provider tiles.');
  }

  const hitsBeforeCaptureToggle = {
    gee: atlasGeeTileHits,
    configured: configuredWmsTileHits,
    viewer: viewerWmsTileHits,
  };
  await page.click('#toggle-capture');
  await page.waitForFunction(() => window.getAtlasCaptureState?.().enabled === true, { timeout: 5000 });
  const captureMode = await page.evaluate(() => {
    const state = window.getAtlasCaptureState();
    return {
      ...state,
      layoutActive: document.querySelector('.atlas-layout')?.classList.contains('capture-mode') === true,
      sidebarHidden: window.getComputedStyle(document.getElementById('atlas-sidebar')).display === 'none',
      hudHidden: window.getComputedStyle(document.querySelector('.atlas-hud')).display === 'none',
      infoHidden: window.getComputedStyle(document.getElementById('info-panel')).display === 'none',
      cardVisible: window.getComputedStyle(document.getElementById('capture-card')).display !== 'none',
      legendHidden: window.getComputedStyle(document.querySelector('.atlas-legend')).display === 'none',
      hasModeButtons: document.querySelectorAll('.capture-mode-btn[data-capture-view]').length === 4,
      hasSplitSlider: !!document.getElementById('capture-split-slider'),
      providerLabel: document.getElementById('capture-provider-label')?.textContent || '',
      overlayDisabled: document.querySelector('[data-capture-view="overlay"]')?.disabled === true,
      splitDisabled: document.querySelector('[data-capture-view="split"]')?.disabled === true,
      statusVisible: document.getElementById('capture-status')?.classList.contains('visible') === true,
    };
  });
  if (!captureMode.layoutActive || !captureMode.sidebarHidden || !captureMode.hudHidden || !captureMode.infoHidden || !captureMode.cardVisible) {
    throw new Error(`Atlas capture mode did not simplify the screenshot frame: ${JSON.stringify(captureMode)}`);
  }
  if (!captureMode.acronym || !captureMode.name || !captureMode.place || !captureMode.modeLabel || !captureMode.hook || !captureMode.prompt) {
    throw new Error(`Atlas capture overlay is missing selected-index context: ${JSON.stringify(captureMode)}`);
  }
  if (
    captureMode.view !== 'context'
    || captureMode.interpretationAvailable
    || !captureMode.legendHidden
    || !captureMode.hasModeButtons
    || !captureMode.hasSplitSlider
    || !captureMode.overlayDisabled
    || !captureMode.splitDisabled
    || !captureMode.statusVisible
    || !captureMode.providerLabel.includes('GEE context only')
    || !captureMode.status.includes('Sentinel WMS')
  ) {
    throw new Error(`Atlas GEE capture should be context-only and should not offer false Split interpretation: ${JSON.stringify(captureMode)}`);
  }

  await page.click('#exit-capture');
  await page.waitForFunction(() => window.getAtlasCaptureState?.().enabled === false, { timeout: 5000 });
  await new Promise(resolve => setTimeout(resolve, 400));
  if (
    atlasGeeTileHits !== hitsBeforeCaptureToggle.gee
    || configuredWmsTileHits !== hitsBeforeCaptureToggle.configured
    || viewerWmsTileHits !== hitsBeforeCaptureToggle.viewer
  ) {
    throw new Error('Atlas capture mode should not request provider tiles.');
  }

  await page.click('#toggle-pause');
  await page.click('#toggle-capture');
  await page.waitForFunction(() => window.getAtlasCaptureState?.().enabled === true, { timeout: 5000 });
  const unavailableCapture = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.capture-mode-btn[data-capture-view]'));
    return {
      ...window.getAtlasCaptureState(),
      layoutUnavailable: document.querySelector('.atlas-layout')?.classList.contains('capture-overlay-unavailable') === true,
      overlayDisabled: buttons.find(btn => btn.dataset.captureView === 'overlay')?.disabled === true,
      splitDisabled: buttons.find(btn => btn.dataset.captureView === 'split')?.disabled === true,
      contextDisabled: buttons.find(btn => btn.dataset.captureView === 'context')?.disabled === true,
      sliderDisabled: document.getElementById('capture-split-slider')?.disabled === true,
      statusVisible: document.getElementById('capture-status')?.classList.contains('visible') === true,
    };
  });
  if (
    unavailableCapture.overlayAvailable
    || unavailableCapture.view !== 'context'
    || !unavailableCapture.layoutUnavailable
    || !unavailableCapture.overlayDisabled
    || !unavailableCapture.splitDisabled
    || unavailableCapture.contextDisabled
    || !unavailableCapture.sliderDisabled
    || !unavailableCapture.statusVisible
    || !unavailableCapture.status.includes('Render overlay first')
  ) {
    throw new Error(`Atlas capture mode should mark unavailable overlays clearly: ${JSON.stringify(unavailableCapture)}`);
  }
  await page.click('#exit-capture');
  await page.click('#toggle-pause');
  await new Promise(resolve => setTimeout(resolve, 1000));

  const focusInitial = await page.evaluate(() => window.getAtlasBookmarkFocusState());
  if (focusInitial.visible) {
    throw new Error('Atlas bookmark focus layer should be off by default.');
  }
  if (focusInitial.expectedCount < 90) {
    throw new Error(`Atlas bookmark focus layer should see the catalog bookmarks, got ${focusInitial.expectedCount}.`);
  }

  const hitsBeforeFocusToggle = {
    gee: atlasGeeTileHits,
    configured: configuredWmsTileHits,
    viewer: viewerWmsTileHits,
  };
  await page.click('#toggle-bookmark-focus');
  await page.waitForFunction(() => {
    const state = window.getAtlasBookmarkFocusState();
    return state.visible
      && state.markerCount === state.expectedCount
      && document.querySelectorAll('.atlas-bookmark-focus-point').length === state.expectedCount;
  }, { timeout: 5000 });
  await new Promise(resolve => setTimeout(resolve, 300));
  if (
    atlasGeeTileHits !== hitsBeforeFocusToggle.gee
    || configuredWmsTileHits !== hitsBeforeFocusToggle.configured
    || viewerWmsTileHits !== hitsBeforeFocusToggle.viewer
  ) {
    throw new Error('Atlas bookmark focus toggle should not request provider tiles.');
  }

  await page.click('#toggle-bookmark-focus');
  await page.waitForFunction(() => {
    const state = window.getAtlasBookmarkFocusState();
    return !state.visible && document.querySelectorAll('.atlas-bookmark-focus-point').length === 0;
  }, { timeout: 5000 });

  await page.click('#toggle-bookmark-focus');
  await page.waitForFunction(() => document.querySelectorAll('.atlas-bookmark-focus-point').length > 0, { timeout: 5000 });
  await page.click('#toggle-pause');
  const clickedFocusKey = await page.evaluate(() => {
    const active = window.getAtlasBookmarkFocusState().activeKey;
    const target = Array.from(document.querySelectorAll('.atlas-bookmark-focus-point'))
      .find(el => {
        const key = el.dataset.key;
        return key
          && key !== active
          && document.querySelector(`.atlas-btn[data-key="${key}"]:not(.stub)`);
      });
    if (!target) return '';
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return target.dataset.key;
  });
  if (!clickedFocusKey) {
    throw new Error('Atlas bookmark focus smoke could not find a non-active point to click.');
  }
  await page.waitForFunction(
    key => window.getAtlasBookmarkFocusState().activeKey === key,
    { timeout: 5000 },
    clickedFocusKey
  );
  await page.click('#toggle-pause');
  await new Promise(resolve => setTimeout(resolve, 1000));

  await page.evaluate(() => {
    const zoom = document.getElementById('atlas-sentinel-min-zoom');
    zoom.value = '17';
    zoom.dispatchEvent(new Event('input', { bubbles: true }));
    zoom.dispatchEvent(new Event('change', { bubbles: true }));
    const toggle = document.getElementById('atlas-toggle-sentinel-live');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const blocked = await page.evaluate(() => window.getAtlasProviderState());
  if (blocked.provider !== 'sentinelhub' || !blocked.sentinelLiveTiles) {
    throw new Error(`Atlas should be armed under the zoom guard, got ${JSON.stringify(blocked)}`);
  }
  if (blocked.guardStatus?.reason !== 'zoom') {
    throw new Error(`Atlas should block armed Sentinel below the zoom gate, got ${JSON.stringify(blocked.guardStatus)}`);
  }
  if (configuredWmsTileHits !== 0 || viewerWmsTileHits !== 0) {
    throw new Error(`Atlas requested WMS while armed below zoom gate (${configuredWmsTileHits} configured, ${viewerWmsTileHits} viewer).`);
  }

  await page.evaluate(() => {
    const source = document.getElementById('atlas-sentinel-source');
    source.value = 'viewer';
    source.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const blockedViewer = await page.evaluate(() => window.getAtlasProviderState());
  if (blockedViewer.wmsSource !== 'viewer') {
    throw new Error(`Atlas should allow source selection while blocked by zoom, got ${blockedViewer.wmsSource}`);
  }
  if (blockedViewer.guardStatus?.reason !== 'zoom') {
    throw new Error(`Atlas source switch should preserve the zoom guard, got ${JSON.stringify(blockedViewer.guardStatus)}`);
  }
  if (configuredWmsTileHits !== 0 || viewerWmsTileHits !== 0) {
    throw new Error(`Atlas source switch bypassed the zoom guard (${configuredWmsTileHits} configured, ${viewerWmsTileHits} viewer).`);
  }

  await page.evaluate(() => {
    const source = document.getElementById('atlas-sentinel-source');
    source.value = 'configured';
    source.dispatchEvent(new Event('change', { bubbles: true }));
    const zoom = document.getElementById('atlas-sentinel-min-zoom');
    zoom.value = '3';
    zoom.dispatchEvent(new Event('input', { bubbles: true }));
    zoom.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(resolve => setTimeout(resolve, 1600));

  const sentinel = await page.evaluate(() => ({
    providerState: window.getAtlasProviderState(),
    attribution: Array.from(document.querySelectorAll('.leaflet-control-attribution'))
      .map(e => e.textContent)
      .join(' | '),
  }));

  if (sentinel.providerState.provider !== 'sentinelhub') {
    throw new Error(`Atlas Sentinel toggle should select Sentinel Hub, got ${sentinel.providerState.provider}`);
  }
  if (!sentinel.providerState.sentinelLiveTiles) {
    throw new Error('Atlas Sentinel toggle should arm live tiles.');
  }
  if (sentinel.providerState.wmsSource !== 'configured') {
    throw new Error(`Atlas Sentinel toggle should keep the configured WMS source, got ${sentinel.providerState.wmsSource}`);
  }
  if (!sentinel.attribution.includes('Copernicus Sentinel Hub')) {
    throw new Error(`Atlas attribution did not switch to Sentinel Hub: ${sentinel.attribution}`);
  }
  if (configuredWmsTileHits < 1) {
    throw new Error('Atlas Sentinel toggle did not request the configured WMS endpoint.');
  }
  if (viewerWmsTileHits !== 0) {
    throw new Error('Atlas requested the viewer WMS endpoint before the source was switched.');
  }

  await page.evaluate(() => {
    const source = document.getElementById('atlas-sentinel-source');
    source.value = 'viewer';
    source.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(resolve => setTimeout(resolve, 1600));

  const viewer = await page.evaluate(() => window.getAtlasProviderState());
  if (viewer.wmsSource !== 'viewer') {
    throw new Error(`Atlas source selector should switch to viewer, got ${viewer.wmsSource}`);
  }
  if (viewer.provider !== 'sentinelhub') {
    throw new Error(`Atlas source switch should keep Sentinel Hub active, got ${viewer.provider}`);
  }
  if (viewerWmsTileHits < 1) {
    throw new Error('Atlas source selector did not request the viewer WMS endpoint while Sentinel was armed.');
  }

  const hitsBeforeWmsCapture = {
    gee: atlasGeeTileHits,
    configured: configuredWmsTileHits,
    viewer: viewerWmsTileHits,
  };
  await page.click('#toggle-capture');
  await page.waitForFunction(() => window.getAtlasCaptureState?.().enabled === true, { timeout: 5000 });
  await page.click('[data-capture-view="split"]');
  await page.evaluate(() => {
    const slider = document.getElementById('capture-split-slider');
    slider.value = '62';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const state = window.getAtlasCaptureState?.();
    return state?.view === 'split' && state?.split === 62 && state?.overlayClipPath.includes('62%');
  }, { timeout: 5000 });
  const wmsSplitCapture = await page.evaluate(() => ({
    ...window.getAtlasCaptureState(),
    splitVisible: window.getComputedStyle(document.querySelector('.capture-split-divider')).display !== 'none',
    sliderVisible: document.querySelector('.capture-split-control')?.classList.contains('visible') === true,
    modeLabel: document.getElementById('capture-mode-label')?.textContent || '',
    providerLabel: document.getElementById('capture-provider-label')?.textContent || '',
    boostedLayer: !!document.querySelector('.leaflet-layer.capture-interpretation-layer'),
  }));
  if (
    !wmsSplitCapture.interpretationAvailable
    || !wmsSplitCapture.splitVisible
    || !wmsSplitCapture.sliderVisible
    || !wmsSplitCapture.modeLabel.includes('Split')
    || !wmsSplitCapture.providerLabel.includes('Sentinel WMS')
    || !wmsSplitCapture.boostedLayer
  ) {
    throw new Error(`Atlas Sentinel WMS capture should expose boosted Split interpretation: ${JSON.stringify(wmsSplitCapture)}`);
  }
  await page.click('#exit-capture');
  await page.waitForFunction(() => window.getAtlasCaptureState?.().enabled === false, { timeout: 5000 });
  await new Promise(resolve => setTimeout(resolve, 400));
  if (
    atlasGeeTileHits !== hitsBeforeWmsCapture.gee
    || configuredWmsTileHits !== hitsBeforeWmsCapture.configured
    || viewerWmsTileHits !== hitsBeforeWmsCapture.viewer
  ) {
    throw new Error('Atlas Sentinel WMS capture mode should not request provider tiles.');
  }

  await page.evaluate(() => {
    const toggle = document.getElementById('atlas-toggle-sentinel-live');
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(resolve => setTimeout(resolve, 1200));

  const restored = await page.evaluate(() => window.getAtlasProviderState());
  if (restored.provider !== 'gee') {
    throw new Error(`Atlas Sentinel toggle-off should restore GEE, got ${restored.provider}`);
  }
  if (restored.sentinelLiveTiles) {
    throw new Error('Atlas Sentinel toggle-off should disarm live tiles.');
  }
  const viewerHitsAfterDisarm = viewerWmsTileHits;
  await page.evaluate(() => {
    const source = document.getElementById('atlas-sentinel-source');
    source.value = 'configured';
    source.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  const sourceAfterDisarm = await page.evaluate(() => window.getAtlasProviderState());
  if (sourceAfterDisarm.wmsSource !== 'configured') {
    throw new Error(`Atlas source selector should switch while disarmed, got ${sourceAfterDisarm.wmsSource}`);
  }
  if (viewerWmsTileHits !== viewerHitsAfterDisarm) {
    throw new Error('Atlas source switch requested WMS tiles while Sentinel was disarmed.');
  }

  if (pageErrors.length) {
    throw new Error(`Atlas Sentinel toggle saw page errors: ${pageErrors.join(' | ')}`);
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

console.log(`Atlas Sentinel toggle smoke OK (${atlasGeeTileHits} GEE, ${configuredWmsTileHits} configured WMS, ${viewerWmsTileHits} viewer WMS requests)`);
