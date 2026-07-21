import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { INDICES } from '../src/indices.js';

const coreKeys = ['pwoi', 'hpwi', 'pwi', 'lbi'];

for (const key of coreKeys) {
  const index = INDICES[key];
  assert.ok(index, `${key} exists`);
  assert.ok(index.formula, `${key} exposes its shipped formula`);
  assert.ok(index.formulaStatus, `${key} exposes implementation status`);
  assert.ok(index.validationStatus, `${key} exposes evidence status`);
}

assert.match(INDICES.pwoi.validationStatus, /71\.3% background activation/);
assert.match(INDICES.hpwi.validationStatus, /71\.3% background activation/);
assert.match(INDICES.pwi.validationStatus, /96\.7% background activation/);
assert.match(INDICES.lbi.name, /Liquid\/Salinity Response Index/);
assert.match(INDICES.lbi.validationStatus, /2\/4 standing-brine sites versus 0\/3 freshwater controls/);
assert.match(INDICES.lbi.validationStatus, /p≈0\.43/);
assert.doesNotMatch(INDICES.hpwi.formula, /dry/i, 'shipped OBEC formula does not imply the historical dry path');
assert.doesNotMatch(INDICES.hpwi.max, /emulsion/i, 'OBEC legend does not imply an emulsion retrieval');
assert.doesNotMatch(INDICES.pwi.max, /chemical/i, 'PWCI legend does not imply a chemical retrieval');
assert.doesNotMatch(INDICES.lbi.max, /brine pool/i, 'LBI legend does not imply brine specificity');
assert.match(INDICES.ndwi.name, /MNDWI/, 'Green–SWIR water index is correctly identified as MNDWI');
assert.match(INDICES.pwi.name, /Produced-Water Contrast Index/);
assert.match(INDICES.ehc.name, /Surface Context Composite/);
assert.match(INDICES.scri.name, /SAR Surface-Contrast Index/);
assert.match(INDICES.mvpi.validationStatus, /not a methane retrieval/i);

for (const key of ['ndsi', 'hcai', 'hmri', 'ndoi', 'aoi', 'ehc', 'fbc', 'reai', 'vcbi', 'tri', 'bpi', 'vsi', 'cma', 'phi', 'hmi', 'scri', 'mvpi']) {
  assert.ok(INDICES[key].formula, `${key} exposes an implemented formula`);
  assert.ok(INDICES[key].validationStatus, `${key} exposes a scientific boundary`);
}

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.match(indexHtml, /id="scientific-status-display"/, 'core legend exposes scientific status');
assert.doesNotMatch(indexHtml, /proven support|validated support/i, 'core controls avoid unsupported validation language');

console.log('Core Limn formula-fidelity and scientific-status checks passed.');
