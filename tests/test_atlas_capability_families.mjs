import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  ATLAS_CAPABILITIES,
  ATLAS_INDICES,
  ATLAS_METHOD_ROLES,
} from '../src/atlas-indices.js';

assert.equal(ATLAS_CAPABILITIES.length, 24, 'Atlas exposes 24 capability families');
assert.equal(new Set(ATLAS_CAPABILITIES.map(family => family.id)).size, 24, 'Capability ids are unique');

const familyIds = new Set(ATLAS_CAPABILITIES.map(family => family.id));
const roleIds = new Set(Object.keys(ATLAS_METHOD_ROLES));
const expectedRoles = {
  primary: 15,
  variant: 10,
  component: 12,
  reference: 1,
  'research-model': 51,
  retired: 2,
};
const actualRoles = Object.fromEntries([...roleIds].map(role => [role, 0]));

for (const index of ATLAS_INDICES) {
  assert.ok(familyIds.has(index.capability), `${index.acronym} belongs to a declared capability family`);
  assert.ok(roleIds.has(index.methodRole), `${index.acronym} uses a declared method role`);
  actualRoles[index.methodRole]++;
  if (index.methodRole === 'research-model' || index.methodRole === 'retired') {
    assert.equal(index.canRender, false, `${index.acronym} research/retired role is not presented as a live result`);
  }
}

assert.deepEqual(actualRoles, expectedRoles, 'Method-role inventory stays intentional');

for (const family of ATLAS_CAPABILITIES) {
  const members = ATLAS_INDICES.filter(index => index.capability === family.id);
  assert.ok(members.length > 0, `${family.label} has at least one method`);
  assert.ok(family.description, `${family.label} explains its physical/decision scope`);
}

const byKey = key => ATLAS_INDICES.find(index => index.key === key);
for (const key of ['bhdfsi', 'lfmpi', 'peti', 'epdi', 'ecaci', 'tdrasi']) {
  assert.equal(byKey(key)?.methodRole, 'primary', `${key} article lead is a primary family method`);
}
assert.equal(byKey('sfeii')?.methodRole, 'retired', 'SF-EII remains traceable but retired');
assert.equal(byKey('amdphi')?.methodRole, 'retired', 'AMDPHI remains traceable but retired');

const atlasHtml = fs.readFileSync(new URL('../atlas.html', import.meta.url), 'utf8');
const atlasApp = fs.readFileSync(new URL('../src/atlas-app.js', import.meta.url), 'utf8');
const articleCapture = fs.readFileSync(new URL('../execution/capture_atlas_articles.py', import.meta.url), 'utf8');
for (const mode of ['capabilities', 'domains', 'research']) {
  assert.match(atlasHtml, new RegExp(`data-sidebar-mode="${mode}"`), `Atlas exposes the ${mode} navigation view`);
}
assert.match(atlasHtml, /id="info-capability"/, 'Selected methods expose their capability family');
assert.match(atlasHtml, /id="info-method-role"/, 'Selected methods expose their method role');
assert.doesNotMatch(atlasHtml, /91 Novel Indices/i, 'Atlas no longer presents the catalog as 91 novel indices');
assert.match(atlasApp, /sidebarMode: 'capabilities'/, 'Capability-first navigation is the default');
assert.match(atlasApp, /role === 'research-model' \|\| role === 'retired'/, 'Future and retired work has a dedicated research view');
assert.match(articleCapture, /capability_label/, 'Article capture sidecars include the capability family');
assert.match(articleCapture, /method_role/, 'Article capture sidecars include the method role');

console.log('Atlas capability-family hierarchy and family-first UI checks passed.');
