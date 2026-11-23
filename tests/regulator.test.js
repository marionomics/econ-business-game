import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from '../js/sim/world.js';
import { initialState } from '../js/sim/state.js';
import { applyAction } from '../js/sim/actions.js';
import { tick } from '../js/sim/tick.js';

// Thresholds chosen so the template optimum is "abusive" and a modest price is not.
const world = () => ({ ...makeWorld(3, 'premium'), wildcards: [], rival: { arrivalMonth: 99, rule: 'match', costFactor: 1 },
  regulator: { shareThreshold: 0.6, markupThreshold: 0.5, watchMonths: 3, deadlineMonths: 3, fine: 50000 }, ipoTarget: Infinity });
const firm = (w, price) => { let s = applyAction({ ...initialState(w), cash: 1e8 }, w, { type: 'launch', templateId: w.templates[0].id }).state;
  return price ? applyAction(s, w, { type: 'setPrice', uid: s.products[0].uid, price }).state : s; };
const run = (s, w, n) => { const evs = []; for (let i = 0; i < n && !s.ended; i++) { const r = tick(s, w); s = r.state; evs.push(...r.events); } return { s, evs }; };

test('high share and markup for watchMonths opens an investigation and a crisis', () => {
  const w = world(); const { s, evs } = run(firm(w), w, w.templates[0].devMonths + 3);
  assert.ok(evs.some(e => e.type === 'investigation')); assert.ok(s.regulator.investigation); assert.ok(s.crises.some(c => c.id === 'regulador')); });
test('lowering the markup before the deadline closes it', () => {
  const w = world(); let { s } = run(firm(w), w, w.templates[0].devMonths + 3);
  const c = s.history.at(-1).perProduct[0].c;
  s = applyAction(s, w, { type: 'setPrice', uid: s.products[0].uid, price: Math.round(c * 1.5) }).state; // markup 1/3
  const r = run(s, w, 1); assert.ok(r.evs.some(e => e.type === 'investigationClosed')); assert.equal(r.s.regulator.investigation, null); });
test('ignoring it means a fine; a second strike ends the run', () => {
  const w = world(); const { s, evs } = run(firm(w), w, 30);
  assert.ok(evs.some(e => e.type === 'fine')); assert.equal(s.ended.reason, 'regulator');
  const fined = s.history.find(h => h.other > 0); assert.equal(fined.other, 50000); });
test('a low markup never triggers it', () => {
  const w = world(); const s0 = firm(w); const c = s0.products[0].cProd;
  const { evs } = run(applyAction(s0, w, { type: 'setPrice', uid: s0.products[0].uid, price: Math.round(c * 1.5) }).state, w, 20);
  assert.ok(!evs.some(e => e.type === 'investigation')); });
