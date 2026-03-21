const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');
code = code.split('// ── EVENT BINDINGS')[0]; // discard DOM stuff

// mock enough to run the string building
let mockCode = `
const document = {getElementById:()=>({addEventListener:()=>{}, classList:{add:()=>{},remove:()=>{}}, style:{}})};
const L = {tileLayer:{wms:()=>{}}, layerGroup:()=>({addTo:()=>{}}), control:{sideBySide:()=>({addTo:()=>{}})}};
const window = {};
` + code + `
state.visualFilter = 0.75;
let out = getScriptContent('ndmi', false, false);
console.log(out);
`;
fs.writeFileSync('test_evalscript_runner.js', mockCode);
