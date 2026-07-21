import assert from 'node:assert/strict';
import {
  EVIDENCE_STAGE_DEFS,
  buildSpillEvidenceTimeline,
  getSpillAnchorDate,
} from '../src/evidence-timeline.js';

const earliest = '2020-01-01';
const latest = '2026-07-21';

assert.deepEqual(
  EVIDENCE_STAGE_DEFS.map(stage => stage.id),
  ['reference', 'before', 'event', 'after', 'late', 'latest'],
  'timeline should keep the evidence sequence stable',
);

const eventSpill = {
  date: '2022-01-05',
  eventDate: '2022-01-02/2022-01-14',
};
assert.deepEqual(
  getSpillAnchorDate(eventSpill, latest),
  { date: '2022-01-02', source: 'documented event date' },
  'event ranges should anchor on the documented start date',
);

const eventTimeline = buildSpillEvidenceTimeline(eventSpill, earliest, latest);
const eventById = Object.fromEntries(eventTimeline.stages.map(stage => [stage.id, stage]));
assert.equal(eventById.reference.date, '2021-07-06');
assert.equal(eventById.before.date, '2021-12-03');
assert.equal(eventById.event.date, '2022-01-02');
assert.equal(eventById.after.date, '2022-02-01');
assert.equal(eventById.late.date, '2022-07-01');
assert.equal(eventById.latest.date, latest);

const chronicSpill = {
  date: '2026-01-01',
  eventDate: 'continuous since ~2003',
};
assert.deepEqual(
  getSpillAnchorDate(chronicSpill, latest),
  { date: '2026-01-01', source: 'representative bookmark date' },
  'non-ISO chronic descriptions should use the representative imagery date',
);

const earlyTimeline = buildSpillEvidenceTimeline(
  { date: '2020-01-15', eventDate: '2020-01-15' },
  earliest,
  latest,
);
assert.equal(earlyTimeline.stages[0].date, earliest, 'unavailable reference dates should clamp to viewer coverage');
assert.equal(earlyTimeline.stages[0].clamped, true);

const futureTimeline = buildSpillEvidenceTimeline(
  { date: '2026-07-15', eventDate: '2026-07-15' },
  earliest,
  latest,
);
assert.equal(futureTimeline.stages.find(stage => stage.id === 'late').date, latest, 'future post-event targets should clamp to latest coverage');

console.log('Spill evidence timeline date contract OK');
