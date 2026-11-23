import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreRun } from '../js/sim/score.js';

const run = (o = {}) => ({ world: { ipoTarget: 1000 }, state: { bestSustained: 500, crises: [], ended: { reason: 'end36' }, ...o.state },
  questions: o.questions ?? [] });
const q = (n, c) => Array.from({ length: n }, (_, i) => ({ answered: true, correct: i < c }));
const cr = (arr) => arr.map((survived, i) => ({ id: 'x' + i, start: 1, survived }));

test('valuation points proportional, capped at 50', () => {
  assert.equal(scoreRun(run()).valuationPts, 25); assert.equal(scoreRun(run({ state: { bestSustained: 5000 } })).valuationPts, 50); });
test('one correct question then bankruptcy is worth 20/6, not 20', () =>
  assert.equal(scoreRun(run({ questions: q(1, 1), state: { ended: { reason: 'bankrupt' } } })).questionsPts, 20 / 6));
test('questions use asked when more than 6', () => assert.equal(scoreRun(run({ questions: q(8, 6) })).questionsPts, 15));
test('no crises faced = 0 crisis points', () => assert.equal(scoreRun(run()).crisesPts, 0));
test('crises: survived / max(occurred, 3); open ones count against', () => {
  assert.equal(scoreRun(run({ state: { crises: cr([true, true, false, true]) } })).crisesPts, 22.5);
  assert.equal(scoreRun(run({ state: { crises: cr([true, null]) } })).crisesPts, 10); });
test('total rounded to one decimal', () => { const r = scoreRun(run({ questions: q(6, 5), state: { crises: cr([true, false, true]) } }));
  assert.equal(r.total, Math.round((25 + 20 + 20 * 5 / 6) * 10) / 10); });
test('IPO runs are graded on the crises and questions they actually faced (no floors)', () => {
  const r = scoreRun(run({ questions: q(4, 4), state: { ended: { reason: 'ipo' }, bestSustained: 1000, crises: cr([true, true]) } }));
  assert.equal(r.questionsPts, 20); assert.equal(r.crisesPts, 30); assert.equal(r.total, 100); });
