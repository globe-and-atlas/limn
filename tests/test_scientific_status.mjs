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
assert.match(INDICES.lbi.validationStatus, /did not establish brine-specific separation/);
assert.doesNotMatch(INDICES.hpwi.formula, /dry/i, 'shipped OBEC formula does not imply the historical dry path');
assert.doesNotMatch(INDICES.hpwi.max, /emulsion/i, 'OBEC legend does not imply an emulsion retrieval');
assert.doesNotMatch(INDICES.pwi.max, /chemical/i, 'PWCI legend does not imply a chemical retrieval');
assert.doesNotMatch(INDICES.lbi.max, /brine pool/i, 'LBI legend does not imply brine specificity');

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.match(indexHtml, /id="scientific-status-display"/, 'core legend exposes scientific status');
assert.doesNotMatch(indexHtml, /proven support|validated support/i, 'core controls avoid unsupported validation language');

console.log('Core Limn formula-fidelity and scientific-status checks passed.');
