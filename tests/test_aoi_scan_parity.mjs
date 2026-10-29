import assert from 'node:assert/strict';

import { AOI_HISTORY_KEYS, buildAoiHistoryEvalscript, CALIBRATION_PRESETS, INDICES } from '../src/indices.js';

const basin = 'permian';
const sensitivity = 25;
const cal = CALIBRATION_PRESETS[basin];
const script = buildAoiHistoryEvalscript(basin, sensitivity);
const scanner = new Function(`${script}\nreturn { setup, evaluatePixel };`)();

assert.equal(scanner.setup().output[0].bands, AOI_HISTORY_KEYS.length);
for (const key of AOI_HISTORY_KEYS) {
    for (const band of INDICES[key].fisBands) {
        assert.ok(scanner.setup().input.includes(band), `${key} requires ${band}`);
    }
}

const samples = [
    { B02: 0.08, B03: 0.12, B04: 0.26, B05: 0.16, B07: 0.25, B08: 0.14, B8A: 0.15, B11: 0.52, B12: 0.31, SCL: 5, dataMask: 1 },
    { B02: 0.05, B03: 0.16, B04: 0.04, B05: 0.05, B07: 0.05, B08: 0.02, B8A: 0.02, B11: 0.015, B12: 0.012, SCL: 6, dataMask: 1 },
    { B02: 0.14, B03: 0.18, B04: 0.21, B05: 0.23, B07: 0.28, B08: 0.32, B8A: 0.33, B11: 0.24, B12: 0.22, SCL: 4, dataMask: 1 },
];

for (const sample of samples) {
    const actual = scanner.evaluatePixel(sample).default;
    for (const [position, key] of AOI_HISTORY_KEYS.entries()) {
        const logic = INDICES[key].fisLogic
            .replaceAll('__BSI_MASK__', String(cal.bsiMask))
            .replaceAll('__BSI_OFFSET__', String(cal.bsiOffset))
            .replaceAll('__NDWI_OFFSET__', String(cal.ndwiOffset))
            .replaceAll('__PWI_SALINITY_OFFSET__', String(cal.pwiSalinityOffset))
            .replaceAll('__PWI_HC_OFFSET__', String(cal.pwiHydrocarbonOffset))
            .replaceAll('__PWI_HMRI_OFFSET__', String(cal.pwiHmriOffset));
        const expected = new Function('sample', 'DETECTION_SENSITIVITY', logic)(sample, sensitivity / 100)[0];
        assert.ok(Number.isFinite(actual[position]), `${key} returned a finite scan value`);
        assert.ok(Math.abs(actual[position] - expected) < 1e-12, `${key} scan matches map scalar logic`);
    }
}

const invalid = scanner.evaluatePixel({ ...samples[0], SCL: 9 });
assert.equal(invalid.dataMask[0], 0, 'high-probability cloud is masked');
assert.ok(invalid.default.every(Number.isNaN), 'masked pixels do not contaminate AOI means');

console.log('AOI scan/map per-pixel formula parity checks passed.');
