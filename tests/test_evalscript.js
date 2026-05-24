const fs = require('fs');
let code = fs.readFileSync('src/app.js', 'utf8');
code = code.split('// ── EVENT BINDINGS')[0]; // discard DOM stuff

// mock enough to run the string building
let mockCode = `import './mocks.mjs';
` + code + `
state.visualFilter = 0.75;
let out = getScriptContent({ INDICES }, 'ndmi', false, false, state);
console.log(out);
`;
fs.writeFileSync('src/test_evalscript_runner.mjs', mockCode);
