import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from '../js/sim/world.js';
import { initialState } from '../js/sim/state.js';
import { applyAction } from '../js/sim/actions.js';
import { tick } from '../js/sim/tick.js';
import { quantityAt } from '../js/economy.js';

// A world with no wildcards and a late rival, so finances are predictable.
const calm = (line = 'premium') => ({ ...makeWorld(7, line), wildcards: [], rival: { arrivalMonth: 99, rule: 'match', costFactor: 1 }, regulator: { ...makeWorld(7, line).regulator, shareThreshold: 2 } });
const run = (s, w, n) => { for (let i = 0; i < n; i++) s = tick(s, w).state; return s; };
const withProduct = (w, ad = 0) => { let s = initialState(w); s = applyAction(s, w, { type: 'launch', templateId: w.templates[0].id }).state;
  return ad ? applyAction(s, w, { type: 'setAd', uid: s.products[0].uid, ad }).state : s; };

test('a product sells only after its development months', () => { const w = calm(); let s = withProduct(w);
  const dev = w.templates[0].devMonths; s = run(s, w, dev);
  assert.equal(s.history.at(-1).perProduct[0].Q, 0); s = run(s, w, 1); assert.ok(s.history.at(-1).perProduct[0].Q > 0); });
test('monthly profit = (P−c)Q − F − product overhead − ads', () => { const w = calm(); let s = run(withProduct(w, 5000), w, 4);
  const row = s.history.at(-1), p = s.products[0], pp = row.perProduct[0];
  assert.equal(pp.Q, quantityAt({ a: pp.a, b: p.b }, p.price));
  assert.equal(row.contribution, (p.price - pp.c) * pp.Q);
  assert.equal(row.profit, row.contribution - (w.plant.F + p.fixedMonthly) - 5000);
  assert.equal(row.cash, s.cash); });
test('JSON round-trip after 12 ticks', () => { const w = calm(); const s = run(withProduct(w), w, 12);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s); });
test('tick is pure', () => { const w = calm(); const s = withProduct(w); const c = structuredClone(s); tick(s, w); assert.deepEqual(s, c); });
test('versions earn more contribution than the single-price optimum', () => {
  const w = calm(); let s = { ...run(withProduct(w), w, 12), cash: 1e7 }; const p = s.products[0];
  const one = tick(s, w).state.history.at(-1).contribution;
  const a = s.history.at(-1).perProduct[0].a, c = s.history.at(-1).perProduct[0].c;
  const v = applyAction(s, w, { type: 'versions', uid: p.uid, high: Math.round((2 * a + c) / 3), low: Math.round((a + 2 * c) / 3) });
  assert.ok(v.ok, v.reason); assert.ok(tick(v.state, w).state.history.at(-1).contribution > one); });
test('advertising stock decays without spending', () => { const w = calm(); let s = run({ ...withProduct(w, 20000), cash: 1e7 }, w, 3);
  const stock = s.products[0].adStock; s = applyAction(s, w, { type: 'setAd', uid: s.products[0].uid, ad: 0 }).state;
  s = run(s, w, 1); assert.ok(s.products[0].adStock < stock); });
test('bankruptcy ends the run; later ticks are no-ops', () => { const w = calm(); let s = { ...withProduct(w), cash: 10 };
  const r = tick(s, w); assert.equal(r.state.ended.reason, 'bankrupt'); assert.ok(r.events.some(e => e.type === 'bankrupt'));
  assert.deepEqual(tick(r.state, w).state, r.state); });
test('the run ends after month 36', () => { const w = calm(); const s = run({ ...withProduct(w), cash: 1e9 }, w, 36);
  assert.equal(s.month, 36); assert.equal(s.ended.reason, 'end36'); });
test('36 ticks with 6 products under 50 ms', () => { const w = calm(); let s = { ...initialState(w), cash: 1e9 };
  for (let i = 0; i < 6; i++) s = applyAction(s, w, { type: 'launch', templateId: w.templates[i % 3].id }).state;
  const t0 = performance.now(); run(s, w, 36); assert.ok(performance.now() - t0 < 50); });
