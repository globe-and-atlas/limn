const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Mock browser environment
const window = {};
const document = {
  addEventListener: () => { },
  getElementById: () => ({ addEventListener: () => { }, classList: { add: () => { }, remove: () => { } }, style: {} }),
  querySelectorAll: () => []
};
const L = { tileLayer: { wms: () => { } }, layerGroup: () => ({ addTo: () => { } }), control: { sideBySide: () => ({ addTo: () => { } }) } };
const fetch = () => Promise.resolve({ json: () => Promise.resolve([]) });
const btoa = (s) => Buffer.from(s).toString('base64');
const APP_VERSION = 'v23';
const CONFIG = { CDSE_CLIENT_ID: 'x', CDSE_CLIENT_SECRET: 'y' };

// We need to strip the "const state =" part to override it or just let it be.
// But evaluation usually works if we provide the dependencies.
eval(code);

// Override state properties for testing
state.visualFilter = 0.5;
state.sensitivity = 0;

console.log('--- HPWI ---');
console.log(getScriptContent('hpwi', false, false));
console.log('--- PWI ---');
console.log(getScriptContent('pwi', false, false));
console.log('--- VSI DIFF ---');
console.log(getScriptContent('vsi', true, false));
console.log('--- PHI CUMULATIVE ---');
console.log(getScriptContent('phi', false, true));
console.log('--- SCRI (SAR) ---');
console.log(getScriptContent('scri', false, false));
