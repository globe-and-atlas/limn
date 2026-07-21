import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [app, html, help, report] = await Promise.all([
  read('../src/app.js'),
  read('../index.html'),
  read('../help.html'),
  read('../src/report.js'),
]);

assert.doesNotMatch(report, /renderReportChart/, 'report module has no call to the removed chart function');
assert.doesNotMatch(report, /genBtn\.onclick/, 'report module does not install a second generate-report handler');
assert.match(app, /function updateAnalyticsControlAvailability\(\)/, 'provider/AOI availability has one helper');
assert.match(app, /\['btn-scan-aoi', 'btn-generate-report'\]/, 'scan and report share the same provider guard');
assert.match(app, /providerReady[\s\S]*btn\.disabled = !providerReady/, 'investigate results expose unavailable layers as disabled');
assert.match(app, /setAttribute\('aria-pressed', 'true'\)/, 'toggle controls publish pressed state');

assert.match(html, /data-index="mvpi"/, 'MVPI legacy screen remains discoverable in the collapsed research library');
assert.match(html, /data-index="fc"/, 'false color remains discoverable in the additional reference library');
for (const key of ['tc', 'lbi', 'ndwi', 'awei', 'ndmi', 'savi', 'bsi', 'ndsi', 'swir_rgb', 'ndre']) {
  assert.match(html, new RegExp(`data-index="${key}"`), `primary investigation stack exposes ${key}`);
}
assert.match(html, /Gate diagnostics · component responses/i, 'Screen exposes a collapsed gate-diagnostic drawer');
for (const key of ['ndsi', 'si', 'hcai', 'ndoi', 'csi', 'hmri']) {
  assert.match(html, new RegExp(`triage-gate-details[\\s\\S]*data-index="${key}"`), `gate-diagnostic drawer exposes ${key}`);
}
assert.match(html, /broad-band component surfaces[\s\S]*not chemical measurements/i, 'gate diagnostics disclose their non-chemical interpretation boundary');
assert.match(html, /id="spill-evidence-timeline"/, 'Screen exposes the spill evidence timeline');
for (const stage of ['reference', 'before', 'event', 'after', 'late', 'latest']) {
  assert.match(html, new RegExp(`data-evidence-stage="${stage}"`), `timeline exposes the ${stage} scene target`);
}
for (const indexKey of ['tc', 'ndwi', 'lbi', 'pwi', 'pwoi']) {
  assert.match(html, new RegExp(`evidence-lens-btn[^>]*data-index="${indexKey}"`), `timeline exposes the ${indexKey} review lens`);
}
assert.match(html, /Repeated response supports persistence review, not source attribution/i, 'timeline preserves the attribution boundary');
assert.match(app, /function compareEvidenceStages[\s\S]*state\.compareType = 'swipe'/, 'timeline comparison shortcuts use honest swipe comparison');
assert.match(app, /timeline-road-check[\s\S]*layer-toggle\[data-layer=/, 'timeline exposes mapped-road context through the existing base-layer control');
assert.match(html, /Experimental composites — negative-result study/i, 'PWCI, ASAI, and OBEC are demoted into a negative-result research section');
assert.match(html, /id="btn-primary-compare"/, 'primary investigation stack exposes before/after compare');
assert.match(html, /data-quality="scl"/, 'UI exposes provider-aware pixel-quality status');
assert.match(app, /WMS: no SCL band/, 'UI discloses the L1C Sentinel WMS quality limitation');
assert.match(app, /const DEFAULT_INDEX = 'tc'/, 'True Color is the scientifically neutral default');
assert.match(help, /SECTION 2\.5: CIVIC ATLAS[^\n]*ARCHIVED[^\n]*[\s\S]*<div class="help-section" hidden aria-hidden="true">/, 'superseded Atlas cards are not shown in core Limn help');
for (const label of ['Automated Water Extraction Index', 'Normalized Difference Red-Edge Index', 'SWIR Surface Context']) {
  assert.match(help, new RegExp(label), `core help documents the ${label} context lens`);
}
assert.doesNotMatch(html, />Detection Lens</, 'focused workflow does not label a screening proxy as a detection lens');
assert.doesNotMatch(html, />Detection Sensitivity</, 'threshold control is not labeled as detector sensitivity');
assert.match(html, /id="btn-scan-aoi"[^>]*disabled[^>]*aria-disabled="true"/, 'scan begins unavailable until AOI/provider requirements are met');
assert.match(html, /id="btn-generate-report"[^>]*disabled/, 'report begins unavailable');
assert.match(html, /data-index="mvpi"[^>]*not a methane retrieval/i, 'MVPI control states the non-retrieval boundary');
for (const unsupportedLabel of ['Produced Water Chemical Index', 'Toxic Residue Index', 'Petro-Hydrocarbon Index', 'Heavy Metal Interaction', 'Salt Crust Roughness', 'Saline Content (Brine)']) {
  assert.ok(!html.includes(`>${unsupportedLabel}<`), `fixed controls do not display legacy chemical label: ${unsupportedLabel}`);
}

console.log('Core Limn UI control and report-handler contract checks passed.');
