import assert from 'node:assert/strict';
import { ATLAS_INDICES } from '../src/atlas-indices.js';

const smpdi = ATLAS_INDICES.find(index => index.key === 'smpdi');
assert.ok(smpdi, 'SMPDI index exists');
assert.match(smpdi.evalscript, /waterContext/, 'SMPDI has a water-context gate');
assert.match(smpdi.evalscript, /landReject/, 'SMPDI has a land rejection gate');

const factory = new Function(`${smpdi.evalscript}\nreturn { setup, evaluatePixel };`);
const { setup, evaluatePixel } = factory();

assert.deepEqual(setup().output, { bands: 4 });

const vegetatedIsland = {
  dataMask: 1,
  B03: 0.08,
  B04: 0.05,
  B08: 0.45,
  B8A: 0.42,
  B11: 0.24,
  B12: 0.18,
};

const brightBareCoast = {
  dataMask: 1,
  B03: 0.18,
  B04: 0.20,
  B08: 0.26,
  B8A: 0.25,
  B11: 0.22,
  B12: 0.19,
};

const floatingMat = {
  dataMask: 1,
  B03: 0.09,
  B04: 0.04,
  B08: 0.18,
  B8A: 0.045,
  B11: 0.035,
  B12: 0.025,
};

assert.equal(evaluatePixel(vegetatedIsland)[3], 0, 'vegetated island land is transparent');
assert.equal(evaluatePixel(brightBareCoast)[3], 0, 'bright bare coast is transparent');
assert.ok(evaluatePixel(floatingMat)[3] > 0, 'floating water-context mat is rendered');

console.log('SMPDI water-context and land-rejection checks passed.');
