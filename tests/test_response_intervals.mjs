import assert from 'node:assert/strict';
import { thresholdResponseIntervals } from '../src/response-intervals.js';

const dates = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const scores = [0.2, 0.01, 0.3, null, 0.1, NaN, 0.4];
assert.deepEqual(thresholdResponseIntervals(dates, scores), [
    { start: 'a', end: 'a', max: 0.2 },
    { start: 'c', end: 'c', max: 0.3 },
    { start: 'g', end: 'g', max: 0.4 },
]);
assert.equal(scores[1], 0.01, 'a low observation must not be interpolated away');
assert.deepEqual(thresholdResponseIntervals(['a', 'b', 'c'], [0.2, 0.4, 0.05]), [
    { start: 'a', end: 'b', max: 0.4 },
]);
assert.deepEqual(thresholdResponseIntervals(['a'], [0.1]), []);
console.log('Raw observed response interval checks passed.');
