import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from '../js/sim/world.js';
import { initialState } from '../js/sim/state.js';
import { applyAction } from '../js/sim/actions.js';
import { tick } from '../js/sim/tick.js';
import { rivalPrice, rivalProfitAt } from '../js/sim/rival.js';
import { productCost } from '../js/sim/market.js';

const w0 = (rule, arrivalMonth = 4) => ({ ...makeWorld(3, 'premium'), wildcards: [], rival: { arrivalMonth, rule, costFactor: 1 } });
const firm = (w) => applyAction({ ...initialState(w), cash: 1e8 }, w, { type: 'launch', templateId: w.templates[0].id }).state;
const to = (s, w, m) => { const evs = []; while (s.month < m && !s.ended) { const r = tick(s, w); s = r.state; evs.push(...r.events); } return { s, evs }; };

test('before arrival share is 1; after arrival share < 1 and an event + crisis appear', () => {
  const w = w0('match'); const { s: s3 } = to(firm(w), w, 3); assert.equal(s3.history.at(-1).perProduct[0].share, 1);
  const { s, evs } = to(s3, w, 5); assert.ok(evs.some(e => e.type === 'rivalArrives')); assert.ok(s.rival.active);
  assert.ok(s.history.at(-1).perProduct[0].share < 1); assert.ok(s.crises.some(c => c.id === 'rival')); });
test('undercut never prices below rival cost + 1', () => {
  const w = w0('undercut'); const { s } = to(firm(w), w, 4); const p = { ...s.products[0], price: 1 };
  const cR = Math.round(productCost({ ...p }, { ...s, expansions: 0 }, w) * w.rival.costFactor);
  assert.equal(rivalPrice(p, { ...s, products: [p] }, w), cR + 1); });
test('match copies the price', () => { const w = w0('match'); const { s } = to(firm(w), w, 4);
  assert.equal(rivalPrice(s.products[0], s, w), s.products[0].price); });
test('best_response beats match for the rival', () => { const w = w0('best_response'); const { s } = to(firm(w), w, 4); const p = s.products[0];
  const br = rivalPrice(p, s, w); assert.ok(rivalProfitAt(p, s, w, br) >= rivalProfitAt(p, s, w, p.price)); });
test('higher loyalty keeps a higher share against undercut', () => {
  const w = w0('undercut'); const { s } = to(firm(w), w, 4);
  const lo = tick({ ...s, products: s.products.map(p => ({ ...p, loyalty: 0 })) }, w).state.history.at(-1).perProduct[0].share;
  const hi = tick({ ...s, products: s.products.map(p => ({ ...p, loyalty: 0.5 })) }, w).state.history.at(-1).perProduct[0].share;
  assert.ok(hi > lo); });
test('arrival records your average price for the post-mortem', () => { const w = w0('match'); const { s } = to(firm(w), w, 4);
  assert.equal(s.rival.since, 4); assert.equal(s.rival.avgPriceAtArrival, s.products[0].price); });
