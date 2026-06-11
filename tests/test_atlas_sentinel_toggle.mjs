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
let atlasWmsTileHits = 0;

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
      atlasWmsTileHits++;
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
  if (atlasWmsTileHits !== 0) {
    throw new Error(`Atlas made ${atlasWmsTileHits} WMS requests before Sentinel was toggled on.`);
  }
  if (atlasGeeTileHits < 1) {
    throw new Error('Atlas did not request GEE tiles before Sentinel toggle.');
  }

  await page.evaluate(() => {
    const zoom = document.getElementById('atlas-sentinel-min-zoom');
    zoom.value = '3';
    zoom.dispatchEvent(new Event('input', { bubbles: true }));
    zoom.dispatchEvent(new Event('change', { bubbles: true }));
    const toggle = document.getElementById('atlas-toggle-sentinel-live');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
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
  if (!sentinel.attribution.includes('Copernicus Sentinel Hub')) {
    throw new Error(`Atlas attribution did not switch to Sentinel Hub: ${sentinel.attribution}`);
  }
  if (atlasWmsTileHits < 1) {
    throw new Error('Atlas Sentinel toggle did not request the guarded WMS endpoint.');
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

  if (pageErrors.length) {
    throw new Error(`Atlas Sentinel toggle saw page errors: ${pageErrors.join(' | ')}`);
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

console.log(`Atlas Sentinel toggle smoke OK (${atlasGeeTileHits} GEE, ${atlasWmsTileHits} WMS requests)`);
