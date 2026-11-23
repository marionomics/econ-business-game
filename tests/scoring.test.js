import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firmValue, scoreRun } from '../js/scoring.js';

const st = (cash, profits) => ({ cash, quarters: profits.map(profit => ({ profit })) });
const cps = (n, correct) => Array.from({ length: n }, (_, i) => ({ correct: i < correct }));

test('firmValue = cash + 8 × mean(last two profits)', () =>
  assert.equal(firmValue(st(1000, [1, 100, 300])), 1000 + 8 * 200));
test('outcome points by ending type', () => {
  const s = st(100, [1, 1]);
  for (const e of ['ipo_premium', 'ipo_volumen', 'ipo_duopolio']) assert.equal(scoreRun({ ending: e, state: s, checkpoints: [] }, 1000).outcomePts, 40);
  for (const e of ['comprada', 'boutique', 'regulador']) assert.equal(scoreRun({ ending: e, state: s, checkpoints: [] }, 1000).outcomePts, 20);
  for (const e of ['quiebra_guerra', 'quiebra_bajo_costo', 'quiebra_sobreinversion']) assert.equal(scoreRun({ ending: e, state: s, checkpoints: [] }, 1000).outcomePts, 0);
});
test('8 correct checkpoints = 40; 3 answered before bankruptcy = 15', () => {
  assert.equal(scoreRun({ ending: 'boutique', state: st(0, [0, 0]), checkpoints: cps(8, 8) }, 1).checkpointPts, 40);
  assert.equal(scoreRun({ ending: 'quiebra_guerra', state: st(-1, [0, 0]), checkpoints: cps(3, 3) }, 1).checkpointPts, 15);
});
test('value pts proportional and capped', () => {
  assert.equal(scoreRun({ ending: 'ipo_premium', state: st(500, [0, 0]), checkpoints: [] }, 1000).valuePts, 10);
  assert.equal(scoreRun({ ending: 'ipo_premium', state: st(5000, [0, 0]), checkpoints: [] }, 1000).valuePts, 20);
});
test('negative value → 0 value pts', () =>
  assert.equal(scoreRun({ ending: 'boutique', state: st(-10, [-100, -100]), checkpoints: [] }, 1000).valuePts, 0));
test('benchmark ≤ 0 → full value pts unless bankrupt', () => {
  assert.equal(scoreRun({ ending: 'boutique', state: st(0, [0, 0]), checkpoints: [] }, 0).valuePts, 20);
  assert.equal(scoreRun({ ending: 'quiebra_guerra', state: st(0, [0, 0]), checkpoints: [] }, 0).valuePts, 0);
});
test('bankrupt run gets 0 value pts', () =>
  assert.equal(scoreRun({ ending: 'quiebra_sobreinversion', state: st(5000, [10, 10]), checkpoints: [] }, 100).valuePts, 0));
test('total rounded to 1 decimal and sums components', () => {
  const r = scoreRun({ ending: 'ipo_premium', state: st(333, [0, 0]), checkpoints: cps(8, 5) }, 1000);
  assert.equal(r.total, Math.round((40 + 25 + 20 * 0.333) * 10) / 10);
});
