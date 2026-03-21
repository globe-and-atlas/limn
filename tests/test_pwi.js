const fs = require('fs');

const appJs = fs.readFileSync('app.js', 'utf8');

// We need to strip out things like window.document that node doesn't have 
// Just grabbing the exact definitions needed:
eval(`
const INDICES = {
    pwi: {
        evalscript: \`//VERSION=3
function setup() {
  return {
    input: ["B03", "B04", "B11", "B12", "dataMask"],
    output: { bands: 4 }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0,0];
  let sumBrine = sample.B11 + sample.B12;
  if(sumBrine === 0) return [0,0,0,0];
  let brine = (sample.B11 - sample.B12) / sumBrine;
  let sumHcai = sample.B11 + sample.B04;
  if(sumHcai === 0) return [0,0,0,0];
  let hcai = (sample.B11 - sample.B04) / sumHcai;
  if(sample.B03 === 0) return [0,0,0,0];
  let hmri = sample.B12 / sample.B03;
  let brineScore = Math.max(0, brine - 0.10);
  let hcaiScore = Math.max(0, (hcai - 0.30) * 2);
  let hmriScore = Math.max(0, (hmri - 2.0) * 2);
  let pwi = brineScore * hcaiScore * hmriScore;
  let mapped = Math.min(1, Math.pow(pwi * 100, 3));
  \${colorBlend('mapped', "[[0, 10, 10, 10, 0.0], [0.1, 0, 255, 255, 1.0], [0.5, 255, 0, 255, 1.0], [1, 204, 255, 0, 1.0]]")}
}\`
    }
};

function colorBlend(valExpr, stopsStr) {
    return \`
  let v = Math.max(0, Math.min(1, \${valExpr}));
  const stops = \${stopsStr};
  let i = 0;
  while (i < stops.length - 1 && v >= stops[i+1][0]) { i++; }
  if (i === stops.length - 1) { 
      let s = stops[i];
      let a = (s.length > 4) ? s[4] : 1.0;
      return [s[1]/255, s[2]/255, s[3]/255, a];
  }
  let s0 = stops[i], s1 = stops[i+1];
  let t = (v - s0[0]) / (s1[0] - s0[0]);
  let a0 = (s0.length > 4) ? s0[4] : 1.0;
  let a1 = (s1.length > 4) ? s1[4] : 1.0;
  return [
      (s0[1] + t * (s1[1] - s0[1])) / 255,
      (s0[2] + t * (s1[2] - s0[2])) / 255,
      (s0[3] + t * (s1[3] - s0[3])) / 255,
      a0 + t * (a1 - a0)
  ];\`;
}

console.log(INDICES.pwi.evalscript);
`);

