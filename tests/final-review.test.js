// Tests for the v2 final-review findings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from '../js/sim/world.js';
import { initialState } from '../js/sim/state.js';
import { applyAction } from '../js/sim/actions.js';
import { tick } from '../js/sim/tick.js';
import { QUESTIONS, buildFor } from '../js/sim/questions.js';
import { marketPower } from '../js/sim/regulator.js';
import { createRng } from '../js/rng.js';
import { gradeAnswer } from '../js/answers.js';
import { slope } from '../js/content/copy.js';
import { acceptClick } from '../js/clickguard.js';
import { createTypingQueue } from '../js/ui/chat.js';
import { createRun, step, act, answer, ackEvents } from '../js/sim/run.js';

const calm = () => ({ ...makeWorld(3, 'premium'), wildcards: [], rival: { arrivalMonth: 99, rule: 'match', costFactor: 1 }, ipoTarget: Infinity });
const firm = (w) => applyAction({ ...initialState(w), cash: 1e8 }, w, { type: 'launch', templateId: w.templates[0].id }).state;
const to = (s, w, m) => { while (s.month < m && !s.ended) s = tick(s, w).state; return s; };

test('C1: rent question key = profit before rent minus rent (the profit shown already includes it)', () => {
  const w = { ...calm(), wildcards: [{ id: 'renta', month: 5, params: {} }] }; const s = to(firm(w), w, 5);
  const run = { seed: 1, state: s, world: w };
  const item = QUESTIONS.find((q) => q.id === 'renta_utilidad'); const b = item.build(run, createRng(1), {});
  assert.equal(b.answer, b.vars.lastProfit - b.vars.rent); assert.equal(b.answer, s.history.at(-1).profit);
});
test('I1: a new product does not launch at its optimal price', () => {
  const w = calm(); const s = firm(w); const t = w.templates[0];
  assert.notEqual(s.products[0].price, Math.round((t.a0 + t.cProd) / 2));
  assert.ok(s.products[0].price > t.cProd);
});
test('I2: with editions, the reported price is the effective one and the regulator sees it', () => {
  const w = calm(); let s = { ...to(firm(w), w, 12) }; const p = s.products[0];
  s = applyAction(s, w, { type: 'versions', uid: p.uid, high: 150, low: 110 }).state;
  s = applyAction(s, w, { type: 'setPrice', uid: p.uid, price: p.cProd + 1 }).state; // the dead single price
  const row = tick(s, w).state.history.at(-1); const pp = row.perProduct[0];
  assert.equal(pp.P, Math.round(pp.revenue / pp.Q)); assert.ok(pp.P >= 110);
  assert.ok(marketPower(row).markup > 0.5);
});
test('I3: demand slope keeps its significant digits', () => { assert.equal(slope(0.0015), '0.0015'); assert.equal(slope(0.045), '0.045'); assert.equal(slope(0.08), '0.08'); });
test('I4: clock buttons ignore the render cooldown; double clicks are still rejected', () => {
  assert.equal(acceptClick({ detail: 1 }, 100, 0, { cooldown: false }), true);
  assert.equal(acceptClick({ detail: 2 }, 100, 0, { cooldown: false }), false);
  assert.equal(acceptClick({ detail: 1 }, 100, 0), false);
});
test('I5: an urgent message (question) flushes the typing backlog', () => {
  const q = createTypingQueue({ cps: 10 }); for (let i = 0; i < 5; i++) q.push({ id: i, text: 'mensaje largo de advertencia' });
  q.update(0); q.push({ id: 'q', text: 'pregunta', urgent: true }); const s = q.update(1);
  assert.deepEqual(s.done.map((m) => m.id), [0, 1, 2, 3, 4]); assert.equal(s.current.msg.id, 'q');
});
test('I5: the below-cost warning is rate-limited', () => {
  let run = createRun({ seed: 2, line: 'generico', meta: { runId: 'x' } });
  run = act(run, { type: 'launch', templateId: run.world.templates[0].id }); while (run.pending !== null) run = answer(run, '1');
  run = { ...run, state: { ...run.state, cash: 1e8 }, world: { ...run.world, ipoTarget: Infinity } };
  run = act(run, { type: 'setPrice', uid: run.state.products[0].uid, price: 5 });
  for (let i = 0; i < 9; i++) { run = step(ackEvents(run)); while (run.pending !== null) run = answer(run, '1'); }
  const n = run.inbox.filter((m) => m.type === 'belowCost').length; assert.ok(run.state.month >= 9); assert.ok(n >= 1 && n <= 3, String(n));
});
test('I9: advertising above the cash in hand is rejected', () => {
  const w = calm(); const s = { ...firm(w), cash: 50000 }; const r = applyAction(s, w, { type: 'setAd', uid: s.products[0].uid, ad: 500000 });
  assert.equal(r.ok, false); assert.equal(r.reason, 'act.adTooHigh');
});
test('M1: amounts typed with thousands separators are accepted', () => {
  const w = calm(); const s = firm(w); const uid = s.products[0].uid;
  assert.equal(applyAction(s, w, { type: 'setAd', uid, ad: '50,000' }).state.products[0].ad, 50000);
  assert.equal(applyAction(s, w, { type: 'setPrice', uid, price: '$120' }).state.products[0].price, 120);
});
test('M6: a markup answered as a percentage counts', () => {
  const b = { kind: 'numeric', answer: 0.6, percentOk: true };
  assert.ok(gradeAnswer(b, 60)); assert.ok(gradeAnswer(b, 0.6)); assert.ok(!gradeAnswer({ kind: 'numeric', answer: 0.6 }, 60));
  const mk = QUESTIONS.find((q) => q.id === 'markup'); const w = calm(); const s = to(firm(w), w, 6);
  assert.equal(mk.build({ seed: 1, state: s, world: w }, createRng(1), {}).percentOk, true);
});
