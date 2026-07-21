import assert from 'node:assert/strict';

import {
  CALIBRATION_PRESETS,
  INDICES,
  adaptEvalscriptForSentinelWms,
  getHighlightScript,
} from '../src/indices.js';

const cal = CALIBRATION_PRESETS.permian;
const sensitivity = 0.25;
const sample = {
  B02: 0.08,
  B03: 0.12,
  B04: 0.26,
  B05: 0.16,
  B06: 0.23,
  B07: 0.25,
  B08: 0.14,
  B8A: 0.15,
  B11: 0.52,
  B12: 0.31,
  VV: 0.02,
  VH: 0.006,
  dataMask: 1,
};

const clamp = value => Math.max(0, Math.min(1, value));
const close = (actual, expected, label) => {
  assert.ok(Number.isFinite(actual), `${label} returns a finite analytical value`);
  assert.ok(Math.abs(actual - expected) < 1e-12, `${label}: expected ${expected}, received ${actual}`);
};

function analyticsValue(key) {
  const logic = INDICES[key].fisLogic
    .replaceAll('__BSI_MASK__', String(cal.bsiMask))
    .replaceAll('__BSI_OFFSET__', String(cal.bsiOffset))
    .replaceAll('__NDWI_OFFSET__', String(cal.ndwiOffset))
    .replaceAll('__PWI_SALINITY_OFFSET__', String(cal.pwiSalinityOffset))
    .replaceAll('__PWI_HC_OFFSET__', String(cal.pwiHydrocarbonOffset))
    .replaceAll('__PWI_HMRI_OFFSET__', String(cal.pwiHmriOffset));
  return new Function('sample', 'DETECTION_SENSITIVITY', logic)(sample, sensitivity)[0];
}

const ndsi = (sample.B11 - sample.B12) / (sample.B11 + sample.B12);
const ndwi = (sample.B03 - sample.B11) / (sample.B03 + sample.B11);
const ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
const bsi = ((sample.B11 + sample.B04) - (sample.B08 + sample.B02)) /
  ((sample.B11 + sample.B04) + (sample.B08 + sample.B02));
const hcai = (sample.B11 - sample.B04) / (sample.B11 + sample.B04);
const hmri = sample.B12 / sample.B03;

close(
  analyticsValue('awei'),
  sample.B02 + 2.5 * sample.B03 - 1.5 * (sample.B08 + sample.B11) - 0.25 * sample.B12,
  'AWEIsh'
);
close(analyticsValue('ndre'), (sample.B8A - sample.B05) / (sample.B8A + sample.B05), 'NDRE');
close(analyticsValue('swir_rgb'), Math.max(sample.B12, sample.B11, sample.B04), 'SWIR context scalar statistics');

{
  const radarProxy = clamp((ndwi + 0.3) / 0.6);
  const salinityGate = clamp((ndsi - 0.035) / 0.16);
  const wet = radarProxy > 0.58 && salinityGate > 0
    ? clamp(radarProxy * 0.42 + salinityGate * 0.58)
    : 0;
  const dry = ndwi < -0.42 && ndsi > 0.15 && bsi > 0.52
    ? clamp((ndsi - 0.15) / 0.16 * 0.45 + 0.55)
    : 0;
  const mapped = clamp(Math.max(wet, dry));
  close(analyticsValue('pwoi'), mapped < 0.60 ? 0 : mapped, 'ASAI');
}

{
  const ndoi = Math.max(0, (sample.B02 - sample.B12) / (sample.B02 + sample.B12));
  const brineThreshold = Math.max(0.04, 0.06 - sensitivity * 0.03);
  const chem = Math.min(1, ndoi + Math.max(0, ndsi - brineThreshold) * 0.8);
  const smooth = clamp((ndwi + 0.3) / 0.6);
  const mapped = clamp(chem * smooth * 6);
  close(analyticsValue('hpwi'), mapped < 0.08 ? 0 : mapped, 'OBEC');
}

{
  const red = Math.max(0, ((sample.B02 - sample.B12) / (sample.B02 + sample.B12)) * 3);
  const green = Math.max(0, bsi * 2);
  const blue = Math.max(0, ndsi * 4);
  close(analyticsValue('ehc'), clamp(Math.max(red, green, blue)), 'EHC scalar statistics');
}

{
  const ironThreshold = Math.max(1.3, 1.4 - sensitivity * 0.3);
  const iron = Math.max(0, sample.B04 / sample.B02 - ironThreshold);
  const brineThreshold = Math.max(0.02, 0.04 - sensitivity * 0.08);
  const brine = Math.max(0, ndsi - brineThreshold);
  const noVeg = Math.max(0, 1 - Math.max(0, ndvi));
  close(analyticsValue('fbc'), clamp(Math.pow(iron * brine * noVeg, 1.4) * 150), 'FBC');
}

{
  const ironThreshold = Math.max(1.08, 1.18 - sensitivity * 0.15);
  const iron = Math.max(0, sample.B06 / sample.B05 - ironThreshold) / 0.45;
  const brineThreshold = Math.max(0.06, 0.12 - sensitivity * 0.1);
  const brine = Math.max(0, ndsi - brineThreshold);
  close(analyticsValue('reai'), clamp(Math.pow(iron * brine, 2) * 100), 'REAI');
}

{
  const top = sample.B08 * sample.B04 - sample.B03 * sample.B02;
  const bot = sample.B08 * sample.B04 + sample.B03 * sample.B02;
  const crsi = bot <= 0 || top < 0 ? 0 : Math.sqrt(top / bot);
  const stress = Math.max(0, 0.55 + sensitivity * 0.2 - crsi) / 0.55;
  const brine = Math.max(0, ndsi - Math.max(0.05, 0.10 - sensitivity * 0.08));
  close(analyticsValue('vcbi'), clamp(Math.pow(stress * brine, 1.5) * 30), 'VCBI');
}

{
  const raw = Math.max(0, ndsi - cal.pwiSalinityOffset) *
    Math.max(0, (hcai - cal.pwiHydrocarbonOffset) * 2) *
    Math.max(0, (hmri - cal.pwiHmriOffset) * 2);
  const mapped = bsi <= cal.bsiMask ? 0 : clamp(Math.pow(raw * 20, 3));
  close(analyticsValue('pwi'), mapped < 0.05 ? 0 : mapped, 'PWCI');
}

{
  const standingWater = ndwi > 0.30;
  const surface = standingWater ? 1 : Math.max(0, bsi + 0.20);
  const raw = bsi <= -0.25 && !standingWater ? 0 :
    Math.max(0, ndsi - 0.02) * Math.max(0, ndwi + 0.40) * Math.max(0, 0.45 - ndvi) * surface;
  const mapped = clamp(raw * 20);
  close(analyticsValue('lbi'), mapped < 0.08 ? 0 : mapped, 'LBI');
}

{
  const aoi = (sample.B04 / sample.B02) * (sample.B11 / sample.B12);
  const raw = Math.max(0, ndsi - 0.05) * Math.max(0, (hmri - 1.5) / 2) * Math.max(0, (aoi - 1.5) / 2);
  close(analyticsValue('tri'), clamp(Math.pow(raw * 10, 2)), 'TRI');
}

{
  const raw = Math.max(0, bsi + cal.bsiOffset) * Math.max(0, ndsi - 0.03) * Math.max(0, hcai - 0.15);
  close(analyticsValue('bpi'), bsi <= cal.bsiMask ? 0 : clamp(raw * 30), 'BPI');
}

{
  const redEdge = (sample.B07 - sample.B05) / (sample.B07 + sample.B05);
  const msi = sample.B11 / sample.B8A;
  const raw = Math.max(0, ndsi) * Math.max(0, 0.4 - redEdge) * Math.max(0, msi - 1);
  close(analyticsValue('vsi'), clamp(raw * 10), 'VSI');
}

{
  const raw = Math.max(0, ndsi) * Math.max(0, sample.B11 / sample.B12 - 1.2) * Math.max(0, sample.B04 / sample.B02 - 1.5);
  close(analyticsValue('cma'), clamp(raw * 15), 'CMA');
}

{
  const raw = Math.max(0, ndsi) * Math.max(0, sample.B11 / sample.B12 - 1) * Math.max(0, hcai - 0.2);
  close(analyticsValue('phi'), clamp(raw * 20), 'PHI');
}

{
  const raw = Math.max(0, sample.B03 / sample.B02 - 1.1) * Math.max(0, sample.B11 / sample.B12 - 1.2);
  close(analyticsValue('hmi'), clamp(raw * 10), 'HMI');
}

{
  const vhDb = 10 * Math.log10(sample.VH);
  const vvDb = 10 * Math.log10(sample.VV);
  const score = Math.max(0, (vhDb + 19) / 9) * Math.max(0, (vhDb - vvDb + 6) / 5);
  close(analyticsValue('scri'), clamp(Math.pow(score * 0.5, 2.5)), 'SCRI');
}

{
  const methane = Math.max(0, (sample.B11 / sample.B12 - 1.15) * 4);
  const ground = Math.max(0, ((sample.B11 + sample.B12) / 2 - 0.20) * 2);
  const water = sample.B03 > sample.B11 ? 0 : 1;
  const veg = ndvi > 0.15 ? 0 : 1;
  close(analyticsValue('mvpi'), clamp(water * veg * ground * methane * 3), 'MVPI legacy screen');
}

close(analyticsValue('s1_sar'), clamp((Math.log10(sample.VV) * 10 + 20) / 20), 'Sentinel-1 VV context');

assert.match(INDICES.ndwi.name, /MNDWI/);
assert.match(INDICES.ndsi.name, /NDTI\/NBR2/);
assert.match(INDICES.awei.validationStatus, /not a salinity/i);
assert.match(INDICES.ndre.validationStatus, /Vegetation-context/i);
assert.match(INDICES.awei.evalscript, /sample\.SCL === 4[\s\S]*sample\.SCL === 7/, 'optical evalscripts apply the clear-pixel SCL gate');
{
  const l1cWmsScript = adaptEvalscriptForSentinelWms(INDICES.hpwi.evalscript, false);
  assert.doesNotMatch(l1cWmsScript, /['"]SCL['"]|sample\.SCL/, 'L1C Sentinel WMS script omits the unavailable SCL band and gate');
  const l2aWmsScript = adaptEvalscriptForSentinelWms(INDICES.hpwi.evalscript, true);
  assert.match(l2aWmsScript, /['"]SCL['"]/i, 'L2A Sentinel WMS script preserves SCL when explicitly configured');
  assert.doesNotMatch(getHighlightScript('hpwi', '#ffffff', 0.2), /['"]SCL['"]|sample\.SCL/, 'WMS highlight scripts default to L1C-compatible inputs');
  assert.match(getHighlightScript('hpwi', '#ffffff', 0.2, false, 'permian', true), /['"]SCL['"]/, 'WMS highlight scripts can opt into SCL for L2A configurations');
}
assert.doesNotMatch(INDICES.hcai.name, /^Hydrocarbons/);
assert.doesNotMatch(INDICES.hmri.name, /^Heavy Metals/);
assert.doesNotMatch(INDICES.mvpi.validationStatus, /validated methane/i);

console.log('Core map/statistics formula parity checks passed.');
