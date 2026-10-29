const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const ASSET_CACHE = path.join(ROOT, '.tmp', 'browser-assets');

async function loadScriptFixtures() {
    fs.mkdirSync(ASSET_CACHE, { recursive: true });
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const urls = [...html.matchAll(/<script src="(https:\/\/[^\"]+)"/g)].map(match => match[1]);
    const fixtures = new Map();
    for (const url of urls) {
        const file = path.join(ASSET_CACHE, require('node:crypto').createHash('sha256').update(url).digest('hex') + '.js');
        if (!fs.existsSync(file)) {
            const fixtureUrl = url
                .replace('https://cdn.jsdelivr.net/gh/digidem/leaflet-side-by-side@2.0.0/leaflet-side-by-side.min.js', 'https://unpkg.com/leaflet-side-by-side@2.0.0/leaflet-side-by-side.js')
                .replace('https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js', 'https://unpkg.com/chart.js@4.4.2/dist/chart.umd.js');
            const response = await fetch(fixtureUrl, { signal: AbortSignal.timeout(20000) });
            if (!response.ok) throw new Error(`Browser fixture download failed: ${url} HTTP ${response.status}`);
            fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
        }
        fixtures.set(url, fs.readFileSync(file));
    }
    return fixtures;
}
const TRANSPARENT_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
);
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
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
    }[ext] || 'application/octet-stream';
}

function createStaticServer() {
    return http.createServer((req, res) => {
        const urlPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
        if (urlPath === '/config-v1.js') {
            const cogMode = String(req.headers.referer || '').includes('provider=cog');
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(cogMode
                ? 'window.CONFIG = Object.assign(window.CONFIG || {}, { IMAGE_PROVIDER: "cog", COG_TILE_ENDPOINT: "/api/cog/tiles" });'
                : 'window.CONFIG = Object.assign(window.CONFIG || {}, { IMAGE_PROVIDER: "gee", GEE_TILE_ENDPOINT: "/api/gee/tiles" });');
            return;
        }

        if (urlPath.startsWith('/api/gee/tiles/')) {
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(TRANSPARENT_PNG);
            return;
        }

        if (urlPath.startsWith('/api/cog/tiles/')) {
            const metadata = { item: 'S2A_13RGQ_20251202_1_L2A', datetime: '2025-12-02T17:45:34Z', cloud: 0.001561 };
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'X-Limn-COG-Metadata': encodeURIComponent(JSON.stringify(metadata)),
            });
            res.end(TRANSPARENT_PNG);
            return;
        }

        const relativePath = urlPath === '/' ? 'index.html' : urlPath.slice(1);
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

(async () => {
    const fixtures = await loadScriptFixtures();
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

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (fixtures.has(request.url())) {
            request.respond({ status: 200, contentType: 'text/javascript', body: fixtures.get(request.url()) });
        } else if (request.url().startsWith(`http://127.0.0.1:${port}/`) || request.url().startsWith('data:') || request.url().startsWith('blob:')) {
            request.continue();
        } else {
            // Basemaps, fonts, and remote services are outside this credential-free smoke.
            request.respond({ status: 200, body: '' });
        }
    });
    const pageErrors = [];
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => {
        pageErrors.push(err.toString());
        console.log('PAGE ERROR:', err.toString());
    });

    try {
        await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.L && window.state && window.state.map && document.getElementById('btn-diff'), { timeout: 15000 });
        await page.evaluate(() => {
            document.getElementById('mode-compare').click();
            document.getElementById('btn-diff').click();
            const b = L.latLngBounds([31.5, -104.0], [31.6, -103.9]);
            const rect = L.rectangle(b);
            window.state.map.fire('draw:created', { layer: rect });
        });
        const smokeState = await page.evaluate(() => ({
            mode: window.state.mode,
            drawnLayers: window.state.drawnItems?.getLayers?.().length || 0,
            reportDisabled: document.getElementById('btn-generate-report').disabled,
            reportTitle: document.getElementById('btn-generate-report').title,
        }));
        if (smokeState.mode !== 'compare' || smokeState.drawnLayers < 1 || !smokeState.reportDisabled || !/guarded Sentinel analytics provider/i.test(smokeState.reportTitle)) {
            throw new Error(`Unexpected browser smoke state: ${JSON.stringify(smokeState)}`);
        }

        if (pageErrors.length) {
            throw new Error(`Browser smoke test saw page errors: ${pageErrors.join(' | ')}`);
        }

        await page.goto(`http://127.0.0.1:${port}/index.html?provider=cog`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.getElementById('cog-scene-status')?.textContent.includes('S2A_13RGQ_20251202_1_L2A'), { timeout: 15000 });
        const sceneText = await page.$eval('#cog-scene-status', element => element.textContent);
        if (!sceneText.includes('2025-12-02') || !sceneText.includes('dates above are search targets')) {
            throw new Error(`COG acquisition provenance is missing: ${sceneText}`);
        }
        if (pageErrors.length) {
            throw new Error(`COG browser smoke saw page errors: ${pageErrors.join(' | ')}`);
        }
        await page.waitForFunction(() => getComputedStyle(document.getElementById('loading')).display === 'none');
        await page.select('#guide-site', 'oxy-lea-flowline-2026');
        await page.click('[data-lens="ndwi"]');
        await page.waitForFunction(() => window.state.activeIndex === 'ndwi' && window.state.activeSpillId === 'oxy-lea-flowline-2026');
        await page.click('#guide-compare-action');
        await page.waitForFunction(() => window.state.mode === 'compare' && !document.getElementById('guide-pair').hidden);
        const earlier = await page.$eval('#date-t1', select => select.options[select.options.length - 2].value);
        await page.select('#date-t1', earlier);
        await page.click('#guide-explore');
        await page.waitForFunction(() => window.state.mode === 'single' && !document.getElementById('guide-single').hidden);
        await page.select('#guide-research-lens', 'lbi');
        await page.waitForFunction(() => window.state.activeIndex === 'lbi');
        await page.click('#guide-advanced');
        await page.waitForFunction(() => document.body.classList.contains('light-advanced'));
        await page.click('#guide-explore');
        await page.waitForFunction(() => !document.body.classList.contains('light-advanced'));
        await page.setViewport({ width: 1440, height: 1000 });
        await page.screenshot({ path: path.join(ROOT, '.tmp', 'light-explorer-desktop.png') });
        await page.setViewport({ width: 390, height: 844 });
        const mobile = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
        if (mobile.scroll > mobile.viewport) throw new Error(`Mobile horizontal overflow: ${JSON.stringify(mobile)}`);
        await page.screenshot({ path: path.join(ROOT, '.tmp', 'light-explorer-mobile.png') });
        const tileFilters = await page.$$eval('.leaflet-tile-pane img', images => images.map(image => getComputedStyle(image).filter));
        if (!tileFilters.length || tileFilters.some(filter => filter !== 'none')) {
            throw new Error(`Map tiles must not have edge-producing CSS filters: ${JSON.stringify(tileFilters)}`);
        }

    } finally {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
})();
