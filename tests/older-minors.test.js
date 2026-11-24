import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from '../js/sim/world.js';
import { initialState } from '../js/sim/state.js';
import { applyAction } from '../js/sim/actions.js';
import { tick } from '../js/sim/tick.js';
import { valuation, ipoTargetOf } from '../js/sim/valuation.js';
import { WILDCARDS } from '../js/sim/wildcards.js';
import { productDemand } from '../js/sim/market.js';
import { createRun, act, step, answer, ackEvents } from '../js/sim/run.js';
import { describeMessage, endingText } from '../js/content/copy.js';
import { classifyEnding } from '../js/sim/endings.js';

test('after repositioning, the IPO target and base multiple are those of the new line', () => {
  const w = makeWorld(3, 'premium'), g = makeWorld(3, 'generico');
  let s = { ...initialState(w), cash: 1e8 };
  assert.equal(ipoTargetOf(s, w), w.ipoTarget);
  s = applyAction(s, w, { type: 'reposition' }).state; for (let i = 0; i < w.reposition.months; i++) s = tick(s, w).state;
  assert.equal(s.line, 'generico'); assert.equal(ipoTargetOf(s, w), g.ipoTarget);
  assert.equal(valuation(s, w).parts.base, g.baseMultiple);
});
test('a health study hits the segments the firm actually sells, also after repositioning', () => {
  const w = makeWorld(3, 'premium');
  let s = applyAction({ ...initialState(w), cash: 1e8 }, w, { type: 'launch', templateId: w.templates[0].id }).state;
  s = { ...s, line: 'generico' }; // repositioned, but the premium cookie is still on the shelf
  const before = productDemand(s.products[0], s, w).a;
  WILDCARDS.salud.apply(s, w, {});
  assert.ok(productDemand(s.products[0], s, w).a < before);
});
test('the bankruptcy chat message does not repeat the ending text shown in the dialog', () => {
  let run = createRun({ seed: 5, line: 'premium', meta: { runId: 'b' } });
  run = act(run, { type: 'launch', templateId: run.world.templates[0].id });
  run = act(run, { type: 'setPrice', uid: run.state.products[0].uid, price: 1 });
  for (let i = 0; i < 20 && !run.state.ended; i++) { while (run.pending !== null) { const b = run.questions[run.pending].built; run = answer(run, b.kind === 'mc' ? b.answer : '1'); } run = step(ackEvents(run)); }
  const m = run.inbox.find((x) => x.type === 'bankrupt'); assert.ok(m);
  assert.ok(!describeMessage(m, run).text.includes(endingText(classifyEnding(run.state)).text));
});
