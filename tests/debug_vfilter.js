const fs = require('fs');

const code = fs.readFileSync('app.js', 'utf8');

// Pull out colorBlend and genEvalscript, etc
// We don't need the DOM, we can just run the regex replacement logic on the literal strings directly.
let state = { visualFilter: 0.5 };

function mockColorBlend(valExpr, stopsStr) {
    return `
  let v = ${valExpr};
  if (typeof VISUAL_FILTER !== 'undefined' && v < VISUAL_FILTER) return [0,0,0,0];
  const stops = ${stopsStr};
`;
}

function genEvalscript(bands, logic) {
    return `//VERSION=3
function setup() {
  return {
    input: [${bands.map(b => `'${b}'`).join(', ')}, "dataMask"],
    output: { bands: 4 }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0,0];
  ${logic}
}
`;
}

// simulate ndmi
let ndmiLogic = `
  let sum = sample.B8A + sample.B11;
  if(sum === 0) return [0,0,0,0];
  let val = (sample.B8A - sample.B11) / sum;
  ${mockColorBlend('val + 0.3', "PALETTE_NDMI")}
`;
let ndmiScript = genEvalscript(['B8A', 'B11'], ndmiLogic);

// Test injection
const filterInject = `//VERSION=3\nconst VISUAL_FILTER = ${state.visualFilter};`;
let finalScript = ndmiScript.replace(/\/\/\s*VERSION=3/i, filterInject);

console.log("=== FINAL SCRIPT ===");
console.log(finalScript);
