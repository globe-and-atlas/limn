import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

// Regression test for the Sentinel-only date-selector filter: without CDSE credentials configured,
// probeAcquisitions()/probeAtlasAcquisitions() fall into trial/mock mode, which must still (a) tag
// a subset of dates with '[S]' and (b) shrink each date <select> down from the full synthetic
// ~2200-entry daily range to just the mock-valid dates — i.e. actual filtering happened, not just
// decorative tagging on an unfiltered list.

const ROOT = path.resolve(import.meta.dirname, '..');
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
  }[ext] || 'application/octet-stream';
}

function createStaticServer(defaultFile) {
  return http.createServer((req, res) => {
    const requestUrl = new URL(req.url, 'http://127.0.0.1');
    const urlPath = decodeURIComponent(requestUrl.pathname);
    if (urlPath === '/config-v1.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      // No CDSE_CLIENT_ID/SECRET on purpose — forces trial/mock mode for both probes.
      res.end('window.CONFIG = Object.assign(window.CONFIG || {}, { IMAGE_PROVIDER: "gee", GEE_TILE_ENDPOINT: "/api/gee/tiles", ATLAS_GEE_TILE_ENDPOINT: "/api/gee/tiles" });');
      return;
    }
    if (urlPath.startsWith('/api/gee/tiles/')) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
      return;
    }
    const relativePath = urlPath === '/' ? defaultFile : urlPath.slice(1);
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

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function checkSelect(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const options = Array.from(el.querySelectorAll('option'));
    return {
      count: options.length,
      taggedCount: options.filter(o => o.textContent.includes('[S]')).length,
    };
  }, selector);
}

try {
  // ── Limn (index.html) ──────────────────────────────
  {
    const server = createStaticServer('index.html');
    const port = await listen(server);
    try {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.toString()));
      await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => {
        const sel = document.getElementById('date-single');
        return sel && sel.options.length > 0;
      }, { timeout: 15000 });

      // Give the async probeAcquisitions() (setTimeout 1600ms) time to resolve and rebuild the selector.
      await page.waitForFunction(() => {
        const sel = document.getElementById('date-single');
        return sel && Array.from(sel.options).some(o => o.textContent.includes('[S]'));
      }, { timeout: 15000 });

      if (pageErrors.length) {
        throw new Error(`Limn date-selector smoke saw page errors: ${pageErrors.join(' | ')}`);
      }

      const single = await checkSelect(page, '#date-single');
      if (!single) throw new Error('date-single not found');
      if (single.taggedCount === 0) throw new Error('No [S]-tagged options in date-single after probe');
      if (single.count !== single.taggedCount) {
        throw new Error(`date-single retained ${single.count - single.taggedCount} non-Sentinel option(s) after filtering`);
      }
      if (single.count >= 2000) {
        throw new Error(`date-single still has ${single.count} options — filtering did not shrink the full ~2200-entry range`);
      }

      console.log(`Limn date-selector filter OK (${single.count} valid dates, all tagged)`);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  }

  // ── Limn Atlas (atlas.html) ─────────────────────────
  {
    const server = createStaticServer('atlas.html');
    const port = await listen(server);
    try {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.toString()));
      await page.goto(`http://127.0.0.1:${port}/atlas.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('.atlas-btn.active') && document.getElementById('atlas-map')?._leaflet_id, { timeout: 15000 });

      // Atlas's first probe fires from the initial selectIndex()-triggered map.setView -> 'moveend'
      // -> setTimeout(1600ms). Wait for the dropdown to end up tagged.
      await page.waitForFunction(() => {
        const sel = document.getElementById('date-input');
        return sel && sel.tagName === 'SELECT' && Array.from(sel.options).some(o => o.textContent.includes('[S]'));
      }, { timeout: 15000 });

      if (pageErrors.length) {
        throw new Error(`Atlas date-selector smoke saw page errors: ${pageErrors.join(' | ')}`);
      }

      const atlasSelect = await checkSelect(page, '#date-input');
      if (!atlasSelect) throw new Error('date-input not found or not a <select>');
      if (atlasSelect.taggedCount === 0) throw new Error('No [S]-tagged options in Atlas date-input after probe');
      if (atlasSelect.count !== atlasSelect.taggedCount) {
        throw new Error(`Atlas date-input retained ${atlasSelect.count - atlasSelect.taggedCount} non-Sentinel option(s) after filtering`);
      }
      if (atlasSelect.count >= 2000) {
        throw new Error(`Atlas date-input still has ${atlasSelect.count} options — filtering did not shrink the full ~2200-entry range`);
      }

      console.log(`Atlas date-selector filter OK (${atlasSelect.count} valid dates, all tagged)`);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  }
} finally {
  await browser.close();
}
