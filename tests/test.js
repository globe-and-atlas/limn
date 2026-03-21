const puppeteer = require('puppeteer-core');
(async () => {
    const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    await page.goto('http://127.0.0.1:8089');
    await page.click('#btn-diff');
    // Draw AOI Programmatically via map reference
    await page.evaluate(() => {
        const b = L.latLngBounds([31.5, -104.0], [31.6, -103.9]);
        const rect = L.rectangle(b);
        window.state.map.fire('draw:created', { layer: rect });
        document.getElementById('btn-generate-report').click();
    });
    await new Promise(r => setTimeout(r, 4000));
    await browser.close();
    process.exit(0);
})();
