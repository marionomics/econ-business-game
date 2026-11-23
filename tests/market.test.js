import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productDemand, productCost, rivalShare, quantity, surplus, elasticityAt } from '../js/sim/market.js';
import { quantityAt } from '../js/economy.js';

const world = { saturation: 0.75 };
const prod = (o = {}) => ({ uid: 'p1', segment: 'premium', a0: 160, b: 0.05, cProd: 40, adEff: 0.045, loyaltyEff: 0.05,
  price: 100, ad: 0, adStock: 0, loyalty: 0, readyAt: 0, active: true, versions: null, ...o });
const st = (products, o = {}) => ({ month: 5, products, effects: [], expansions: 0, rival: { active: false, prices: {} }, ...o });

test('no rival → full linear quantity', () => { const p = prod(); const s = st([p]);
  assert.equal(quantity(p, s, world), quantityAt({ a: 160, b: 0.05 }, 100)); });
test('equal prices and no loyalty → share 0.5', () => assert.equal(rivalShare(50, 50, 0), 0.5));
test('loyalty raises share at the same prices', () => assert.ok(rivalShare(60, 50, 0.4) > rivalShare(60, 50, 0)));
test('much cheaper rival → share tends to loyalty', () => assert.ok(Math.abs(rivalShare(100, 40, 0.3) - 0.3) < 0.01));
test('no rival price → share 1', () => assert.equal(rivalShare(50, null, 0), 1));
test('second product of a segment has smaller a (saturation)', () => {
  const p1 = prod(), p2 = prod({ uid: 'p2' }); const s = st([p1, p2]);
  assert.ok(productDemand(p2, s, world).a < productDemand(p1, s, world).a); });
test('advertising raises a concavely', () => {
  const base = productDemand(prod(), st([prod()]), world).a;
  const a1 = productDemand(prod({ adStock: 10000 }), st([]), world).a, a2 = productDemand(prod({ adStock: 20000 }), st([]), world).a;
  assert.ok(a1 > base); assert.ok(a2 - base < 2 * (a1 - base)); });
test('demand effects multiply a by segment', () => {
  const s = st([prod()], { effects: [{ kind: 'demand', segment: 'premium', mult: 0.75, until: 99 }] });
  assert.equal(productDemand(prod(), s, world).a, 120);
  const g = st([prod()], { effects: [{ kind: 'demand', segment: 'generico', mult: 0.75, until: 99 }] });
  assert.equal(productDemand(prod(), g, world).a, 160); });
test('cost includes expansions and tariff', () => {
  const s = st([prod()], { expansions: 1, effects: [{ kind: 'cost', add: 8, until: Infinity }] });
  assert.equal(productCost(prod(), s, { plant: { expandDc: 6 } }), 40 - 6 + 8); });
test('surplus matches Beautiful Cars', () => { const r = surplus({ a: 40000, b: 400 }, 27200, 14400);
  assert.equal(r.dwl, 204800); assert.equal(r.cs, 0.5 * 32 * 12800); assert.equal(r.ps, 12800 * 32); });
test('surplus and elasticity never NaN at Q = 0', () => { const r = surplus({ a: 10, b: 1 }, 50, 5);
  for (const v of Object.values(r)) assert.ok(Number.isFinite(v)); assert.ok(Number.isFinite(elasticityAt({ a: 10 }, 10)) || elasticityAt({ a: 10 }, 10) === Infinity); });
test('elasticity P/(a−P)', () => assert.equal(elasticityAt({ a: 100 }, 60), 1.5));
