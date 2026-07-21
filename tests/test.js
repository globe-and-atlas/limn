const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
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
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end('window.CONFIG = Object.assign(window.CONFIG || {}, { IMAGE_PROVIDER: "gee", GEE_TILE_ENDPOINT: "/api/gee/tiles" });');
            return;
        }

        if (urlPath.startsWith('/api/gee/tiles/')) {
            res.writeHead(200, { 'Content-Type': 'image/png' });
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
    } finally {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
})();
