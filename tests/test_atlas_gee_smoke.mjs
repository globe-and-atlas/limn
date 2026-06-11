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
let nonAtlasGeeTileHits = 0;

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
      res.end('window.CONFIG = Object.assign(window.CONFIG || {}, { IMAGE_PROVIDER: "gee", GEE_TILE_ENDPOINT: "/api/gee/tiles", ATLAS_GEE_TILE_ENDPOINT: "/api/gee/tiles" });');
      return;
    }

    if (urlPath.startsWith('/api/gee/tiles/')) {
      if (requestUrl.searchParams.get('app') === 'atlas') atlasGeeTileHits++;
      else nonAtlasGeeTileHits++;
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
  const sentinelRequests = [];
  page.on('pageerror', err => pageErrors.push(err.toString()));
  page.on('request', req => {
    const url = req.url();
    if (url.includes('sh.dataspace.copernicus.eu')) sentinelRequests.push(url);
  });

  await page.goto(`http://127.0.0.1:${port}/atlas.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.atlas-btn.active') && document.getElementById('atlas-map')?._leaflet_id, { timeout: 15000 });
  await page.waitForFunction(() => window.__atlasGeeTileCheck || true, { timeout: 500 }).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (pageErrors.length) {
    throw new Error(`Atlas smoke saw page errors: ${pageErrors.join(' | ')}`);
  }
  if (sentinelRequests.length) {
    throw new Error(`Atlas made Sentinel Hub requests under GEE default: ${sentinelRequests.slice(0, 3).join(' | ')}`);
  }
  if (atlasGeeTileHits < 1) {
    throw new Error('Atlas did not request any GEE tiles with app=atlas.');
  }
  if (nonAtlasGeeTileHits > 0) {
    throw new Error(`Atlas made ${nonAtlasGeeTileHits} GEE tile requests without app=atlas.`);
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

console.log(`Atlas GEE smoke OK (${atlasGeeTileHits} tile requests)`);
