import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout } from 'node:timers/promises';

const probe = net.createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const child = spawn(process.execPath, ['server/gee_tile_server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DEPLOY_COG_ONLY: '1', COG_PREWARM_ON_START: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stderr.on('data', data => { logs += data; });
const base = `http://127.0.0.1:${port}`;
try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
        try { if ((await fetch(`${base}/healthz`)).ok) { ready = true; break; } } catch (_) {}
        await setTimeout(100);
    }
    assert.ok(ready, `server starts: ${logs}`);
    for (const route of ['/', '/src/app.js', '/src/response-intervals.js', '/src/vendor/leaflet-side-by-side.js', '/style.css', '/data/rrc_spills.json']) {
        assert.equal((await fetch(base + route)).status, 200, route);
    }
    for (const route of ['/.env', '/package.json', '/server/gee_tile_server.mjs', '/execution/render_cog_tile.py', '/knowledge/SESSION.md', '/.tmp/test', '/src/AGENTS.md', '/atlas.html', '/api/gee/tiles/1/1/1', '/api/cog/prewarm']) {
        assert.equal((await fetch(base + route)).status, 404, route);
    }
    assert.equal((await fetch(base + '/%ZZ')).status, 400);
    const config = await (await fetch(base + '/config-v1.js')).text();
    assert.match(config, /IMAGE_PROVIDER: "cog"/);
    assert.doesNotMatch(config, /CLIENT_SECRET|PRIVATE_KEY|SERVICE_ACCOUNT/);
    assert.equal((await fetch(base + '/api/cog/tiles/14/3516/6694?index=invalid')).status, 400);
    console.log('Render public routes, health, and generated configuration passed.');
} finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
}
