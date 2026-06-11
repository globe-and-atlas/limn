import assert from 'node:assert/strict';
import { ATLAS_INDICES } from '../src/atlas-indices.js';

const lfmpi = ATLAS_INDICES.find(index => index.key === 'lfmpi');
assert.ok(lfmpi, 'LFMPI index exists');
assert.match(lfmpi.evalscript, /waterReject/, 'LFMPI has a water rejection gate');
assert.match(lfmpi.evalscript, /liveFuel/, 'LFMPI has a live-fuel gate');

const factory = new Function(`${lfmpi.evalscript}\nreturn { setup, evaluatePixel };`);
const { setup, evaluatePixel } = factory();

assert.deepEqual(setup().output, { bands: 4 });

const waterLike = {
  dataMask: 1,
  B02: 0.05,
  B03: 0.12,
  B04: 0.03,
  B8A: 0.02,
  B11: 0.006,
  B12: 0.004,
};

const dryVegetatedFuel = {
  dataMask: 1,
  B02: 0.04,
  B03: 0.06,
  B04: 0.05,
  B8A: 0.35,
  B11: 0.30,
  B12: 0.25,
};

const bareSoil = {
  dataMask: 1,
  B02: 0.08,
  B03: 0.10,
  B04: 0.15,
  B8A: 0.18,
  B11: 0.28,
  B12: 0.25,
};

assert.equal(evaluatePixel(waterLike)[3], 0, 'water is transparent/no-risk');
assert.ok(evaluatePixel(dryVegetatedFuel)[3] > 0, 'dry vegetated fuel is rendered as risk');
assert.equal(evaluatePixel(bareSoil)[3], 0, 'bare non-fuel soil is transparent/no-risk');

console.log('LFMPI water rejection and live-fuel gate checks passed.');
