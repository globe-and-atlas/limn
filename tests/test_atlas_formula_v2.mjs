import assert from 'node:assert/strict';

import { ATLAS_INDICES } from '../src/atlas-indices.js';

assert.equal(ATLAS_INDICES.length, 91, 'Atlas retains exactly 91 proposed specifications');
assert.equal(new Set(ATLAS_INDICES.map(index => index.key)).size, 91, 'Atlas keys remain unique');

const requiredFields = [
  'formula',
  'proposedFormula',
  'formulaStatus',
  'capability',
  'methodRole',
  'contribution',
  'contributionStatus',
  'maturity',
  'requiredInputs',
  'temporalOperator',
  'spatialOperator',
  'units',
  'calibrationStatus',
  'validationStatus',
  'eventEvidenceStatus',
  'articleSuitability',
  'articleAngle',
  'bookmarkDateRole',
  'articleQcStatus',
  'formulaVersion',
];

for (const index of ATLAS_INDICES) {
  for (const field of requiredFields) {
    assert.ok(index[field], `${index.acronym} has ${field}`);
  }
  assert.match(index.contribution, /^C[123]$/, `${index.acronym} uses a neutral contribution code`);
  assert.match(index.maturity, /^M[123]$/, `${index.acronym} uses an implementation maturity code`);
  assert.equal(index.formulaVersion, '2.0', `${index.acronym} uses formula schema v2`);
  assert.match(index.validationStatus, /below V1/, `${index.acronym} does not imply independent validation`);
  assert.doesNotMatch(index.platform, /proof target/i, `${index.acronym} does not expose a bookmark as proof`);
  if (index.canRender) {
    assert.equal(index.maturity, 'M3', `${index.acronym} live proxy is M3`);
    assert.ok(index.implementedFormula, `${index.acronym} live proxy exposes its implemented formula`);
  }
}

assert.equal(ATLAS_INDICES.filter(index => index.canRender).length, 37, 'Two misleading live formulas are retired pending calibration');
assert.equal(ATLAS_INDICES.filter(index => index.maturity === 'M3').length, 37, 'M3 count matches live proxies');
assert.equal(ATLAS_INDICES.filter(index => index.maturity === 'M2').length, 16, 'M2 count matches executable non-live formulas');
assert.equal(ATLAS_INDICES.filter(index => index.maturity === 'M1').length, 38, 'M1 count includes concepts and two retired formulas');

const byKey = key => {
  const index = ATLAS_INDICES.find(candidate => candidate.key === key);
  assert.ok(index, `${key} exists`);
  return index;
};

const lfmpi = byKey('lfmpi');
assert.equal(lfmpi.formula, 'FuelGate × WaterReject × (1 − NDMI) / 2');
assert.doesNotMatch(lfmpi.evalscript, /let denom=|sample\.B12/, 'LFMPI removes the pseudo-LFMC expression');
assert.match(lfmpi.evalscript, /\(1-ndmi\)\*0\.5/, 'LFMPI implements normalized NDMI deficit');
assert.match(lfmpi.evalscript, /\[1,226,102,90\]/, 'LFMPI high deficit renders red rather than green');

assert.equal(byKey('sfeii').canRender, false, 'SF-EII is retired from live rendering pending calibration');
assert.match(byKey('sfeii').formulaStatus, /Rebuild required/);
assert.equal(byKey('amdphi').canRender, false, 'AMDPHI is retired from live rendering pending field calibration');
assert.match(byKey('amdphi').implementedFormula, /retired from live display/);

assert.doesNotMatch(byKey('saci').formula, /AOD_550/, 'SACI public formula matches the actual UVAI input');
assert.match(byKey('rdoci').formula, /aCDOM/, 'RDOCI uses absorption for spectral slope');
assert.doesNotMatch(byKey('pwtdi').formula, /NDWI_1020|B09 proxy/, 'PWTDI removes unsupported Sentinel-2 970/1020 nm retrieval');
assert.match(byKey('reenbi').formula, /R803 \/ Rc803/, 'REENBI uses conventional continuum removal');
assert.doesNotMatch(byKey('tseai').formula, /\/ Σ/, 'TSEAI removes the dimensionally incompatible ratio');
assert.match(byKey('nfcai').physics, /launched in 2025/, 'NFCAI has the correct NISAR launch year');
assert.doesNotMatch(byKey('puenpi').formula, /− NPP_PACE/, 'PUENPI no longer subtracts aquatic production as a loss term');

assert.equal(byKey('tfidi').bookmark.date, '2021-08-17', 'TFIDI uses the stronger tested tidal-zone date');
assert.equal(byKey('ipvsi').bookmark.date, '2021-09-01', 'IPVSI uses the stronger tested invasion-context date');
assert.match(byKey('lfmpi').articleSuitability, /Recommended/, 'LFMPI replaces retired SF-EII in the article lead set');
assert.ok(byKey('lfmpi').acquisitionTimestamp, 'Recommended article leads expose a representative acquisition timestamp');
assert.doesNotMatch(byKey('sfeii').articleSuitability, /Recommended/, 'Retired SF-EII is not an article lead');

const reconciledLiveKeys = [
  'bhdfsi', 'saci', 'peti', 'csrc', 'rrfi', 'epdi', 'fcli', 'cbsdi',
  'kcdsi', 'cduai', 'mppdi', 'pdsdi', 'wdacsi', 'tdrasi', 'hsai',
  'pcadi', 'lfgvi', 'lrdvsi', 'ttapi', 'tperi', 'sabsi', 'tfidi', 'wdptzi',
];

for (const key of reconciledLiveKeys) {
  const index = byKey(key);
  assert.ok(index.implementedFormula, `${index.acronym} has an explicit implemented formula`);
  assert.notEqual(index.formula, index.legacyFormula, `${index.acronym} public formula was reconciled from its legacy claim`);
}

console.log('Atlas v2 formula schema, retirement, and live-formula reconciliation checks passed.');
