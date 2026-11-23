import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from '../js/sim/world.js';
import { initialState } from '../js/sim/state.js';
import { applyAction } from '../js/sim/actions.js';
import { tick } from '../js/sim/tick.js';
import { WILDCARDS, scheduleWildcards } from '../js/sim/wildcards.js';
import { productDemand, productCost } from '../js/sim/market.js';
import { createRng } from '../js/rng.js';

const base = (line = 'premium', wildcards = []) => ({ ...makeWorld(3, line), wildcards, rival: { arrivalMonth: 99, rule: 'match', costFactor: 1 }, ipoTarget: Infinity, regulator: { ...makeWorld(3, line).regulator, shareThreshold: 2 } });
const firm = (w) => { let s = { ...initialState(w), cash: 1e8 }; return applyAction(s, w, { type: 'launch', templateId: w.templates[0].id }).state; };
const to = (s, w, m) => { while (s.month < m && !s.ended) s = tick(s, w).state; return s; };
const opt = (p, s, w) => (productDemand(p, s, w).a + productCost(p, s, w)) / 2;

test('tariff raises marginal cost and the optimal price by half the amount', () => {
  const w = base('premium', [{ id: 'arancel', month: 5, params: {} }]); let s = to(firm(w), w, 4);
  const before = opt(s.products[0], s, w), c0 = productCost(s.products[0], s, w);
  s = to(s, w, 5); assert.equal(productCost(s.products[0], s, w), c0 + w.tariff);
  assert.equal(opt(s.products[0], s, w) - before, w.tariff / 2); });
test('rent rise raises fixed cost and leaves the optimal price unchanged', () => {
  const w = base('premium', [{ id: 'renta', month: 5, params: {} }]); let s = to(firm(w), w, 4);
  const before = opt(s.products[0], s, w); s = to(s, w, 6);
  assert.equal(opt(s.products[0], s, w), before); assert.equal(s.history.at(-1).fixed - s.history.at(-3).fixed, w.rent); });
test('health study lowers demand only for its segment and expires after 6 months', () => {
  const w = base('premium', [{ id: 'salud', month: 5, params: {} }]); let s = to(firm(w), w, 4);
  const a0 = productDemand(s.products[0], s, w).a; s = to(s, w, 5);
  assert.ok(productDemand(s.products[0], s, w).a < a0);
  const generic = { ...s.products[0], segment: 'generico', uid: 'x' }; assert.equal(productDemand(generic, { ...s, products: [generic] }, w).a, Math.round(generic.a0 * (1 + generic.adEff * Math.sqrt(generic.adStock / 1000))));
  s = to(s, w, 11); assert.equal(productDemand(s.products[0], s, w).a, a0); });
test('wildcard events are emitted and crises opened', () => {
  const w = base('premium', [{ id: 'recesion', month: 3, params: {} }]); let s = to(firm(w), w, 2);
  const r = tick(s, w); assert.ok(r.events.some(e => e.type === 'wildcard' && e.id === 'recesion'));
  assert.deepEqual(r.state.crises.map(c => [c.id, c.start, c.survived]), [['recesion', 3, null]]); });
test('crisis resolves 6 months later by the rule', () => {
  const w = base('premium', [{ id: 'renta', month: 3, params: {} }]); const s = to(firm(w), w, 9);
  const c = s.crises[0]; assert.equal(c.resolvedAt, 9); assert.equal(c.survived, s.history.at(-1).profit > 0); });
test('a crisis open at bankruptcy resolves as not survived', () => {
  const w = base('premium', [{ id: 'renta', month: 3, params: {} }]); let s = to(firm(w), w, 4); s = { ...s, cash: 1, products: s.products.map(p => ({ ...p, price: 1 })) };
  s = tick(s, w).state; assert.equal(s.ended.reason, 'bankrupt'); assert.equal(s.crises[0].survived, false); });
test('every seed and line schedules ≥ 3 wildcard crises, sorted, ≥ 3 months apart, in months 3–33', () => {
  for (let seed = 1; seed < 200; seed++) for (const line of ['premium', 'generico']) {
    const sch = scheduleWildcards(createRng(seed), line);
    assert.ok(sch.filter(x => WILDCARDS[x.id].crisis).length >= 3);
    for (let i = 0; i < sch.length; i++) { assert.ok(sch[i].month >= 3 && sch[i].month <= 33); if (i) assert.ok(sch[i].month - sch[i - 1].month >= 3); }
    assert.ok(sch.every(x => !WILDCARDS[x.id].line || WILDCARDS[x.id].line === line)); }
});
test('makeWorld uses the schedule', () => assert.ok(makeWorld(5, 'generico').wildcards.length >= 3));
