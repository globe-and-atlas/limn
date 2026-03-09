const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Regex to turn "const state =" into "global.state =" so we can access it
code = code.replace(/const state =/g, 'global.state =');

// Mock browser environment
global.window = {};
global.document = {
  addEventListener: () => { },
  getElementById: () => ({ addEventListener: () => { }, classList: { add: () => { }, remove: () => { } }, style: {} }),
  querySelectorAll: () => []
};
global.L = { tileLayer: { wms: () => { } }, layerGroup: () => ({ addTo: () => { } }), control: { sideBySide: () => ({ addTo: () => { } }) } };
global.fetch = () => Promise.resolve({ json: () => Promise.resolve([]) });
global.btoa = (s) => Buffer.from(s).toString('base64');
global.APP_VERSION = 'v23';
global.CONFIG = { CDSE_CLIENT_ID: 'x', CDSE_CLIENT_SECRET: 'y' };

eval(code);

// Now global.state should be defined
state.visualFilter = 0.5;
state.sensitivity = 0;

console.log('--- HPWI 2.0 (DEEP FUSION) ---');
state.deepFusion = true;
console.log(getScriptContent('hpwi', false, false));

console.log('--- PWI (HLS ENABLED) ---');
state.deepFusion = false;
state.hlsEnabled = true;
// Note: getScriptContent logic for HLS depends on wmsLayerParam which is in getWMSLayer.
// getScriptContent itself is collection-agnostic unless bands change.
console.log(getScriptContent('pwi', false, false));
