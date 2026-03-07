const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');
// mock browser environment
const window = {};
const document = {
  addEventListener: () => {},
  getElementById: () => ({ addEventListener: () => {}, classList: { add: ()=>{}, remove: ()=>{} }, style: {} }),
  querySelectorAll: () => []
};
const L = { tileLayer: { wms: () => {} }, layerGroup: () => ({ addTo: () => {} }), control: { sideBySide: () => ({ addTo: () => {} }) } };
const fetch = () => Promise.resolve({ json: () => Promise.resolve([]) });
const btoa = (s) => Buffer.from(s).toString('base64');
const APP_VERSION = 'v22';

eval(code);

global.state.visualFilter = 0.5;
console.log(getScriptContent('hpwi', false, false));
console.log('-----');
console.log(getScriptContent('pwi', false, false));
