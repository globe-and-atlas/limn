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

let wmsHits = 0;
let geeHits = 0;
let cogHits = 0;

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
        COG_TILE_ENDPOINT: "/api/cog/tiles",
        SH_WMS_URL: "/sentinel-wms",
        SENTINEL_CREDIT_GUARD: true,
        SENTINEL_LIVE_TILES: false,
        SENTINEL_MIN_ZOOM: 14,
        ALLOW_SENTINEL_FALLBACK: false
      });`);
      return;
    }

    if (urlPath.startsWith('/api/gee/tiles/')) {
      geeHits++;
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(TRANSPARENT_PNG);
      return;
    }

    if (urlPath.startsWith('/api/cog/tiles/')) {
      cogHits++;
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(TRANSPARENT_PNG);
      return;
    }

    if (urlPath === '/sentinel-wms') {
      wmsHits++;
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(TRANSPARENT_PNG);
      return;
    }

    const relativePath = urlPath === '/' ? 'share.html' : urlPath.slice(1);
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

  await page.goto(`http://127.0.0.1:${port}/share.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.getLimnProviderState && window.state?.map, { timeout: 15000 });
  await new Promise(resolve => setTimeout(resolve, 1600));

  const shareState = await page.evaluate(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
    provider: window.getLimnProviderState().provider,
    defaultProvider: window.getLimnProviderState().defaultProvider,
    sentinelOnlyShareMode: window.getLimnProviderState().sentinelOnlyShareMode,
    sentinelLiveTiles: window.getLimnProviderState().sentinelLiveTiles,
    guardBlocking: window.getLimnProviderState().guardBlocking,
    status: window.getLimnProviderState().status,
    toggleChecked: document.getElementById('toggle-sentinel-live')?.checked,
    toggleDisabled: document.getElementById('toggle-sentinel-live')?.disabled,
    bodyClass: document.body.className,
    attribution: Array.from(document.querySelectorAll('.leaflet-control-attribution'))
      .map(e => e.textContent)
      .join(' | '),
  }));

  if (shareState.pathname !== '/index.html' || !shareState.search.includes('share=sentinel-only')) {
    throw new Error(`share.html should redirect into index share mode: ${JSON.stringify(shareState)}`);
  }
  if (shareState.provider !== 'sentinelhub') {
    throw new Error(`share mode should force Sentinel Hub, got ${shareState.provider}`);
  }
  if (!shareState.sentinelOnlyShareMode || !shareState.sentinelLiveTiles) {
    throw new Error(`share mode did not arm Sentinel-only state: ${JSON.stringify(shareState)}`);
  }
  if (!shareState.toggleChecked || !shareState.toggleDisabled) {
    throw new Error(`share mode should lock the Sentinel toggle on: ${JSON.stringify(shareState)}`);
  }
  if (!shareState.bodyClass.includes('sentinel-only-share-mode')) {
    throw new Error(`share mode body class missing: ${shareState.bodyClass}`);
  }
  if (!shareState.status.includes('Share mode: Sentinel-only')) {
    throw new Error(`share status should identify Sentinel-only mode: ${shareState.status}`);
  }
  if (!shareState.attribution.includes('Copernicus Sentinel Hub')) {
    throw new Error(`share mode attribution did not switch to Sentinel Hub: ${shareState.attribution}`);
  }
  if (wmsHits < 1) {
    throw new Error('share mode did not request the rate-limited Sentinel WMS endpoint.');
  }
  if (geeHits !== 0 || cogHits !== 0) {
    throw new Error(`share mode should not request GEE/COG tiles; saw GEE=${geeHits}, COG=${cogHits}`);
  }
  if (pageErrors.length) {
    throw new Error(`share mode saw page errors: ${pageErrors.join(' | ')}`);
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

console.log(`Produced Water share Sentinel-only smoke OK (${wmsHits} WMS, ${geeHits} GEE, ${cogHits} COG requests)`);
