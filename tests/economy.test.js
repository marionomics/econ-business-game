import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quantityAt, profit, optimalPrice, arcElasticity, pointElasticity, markupPrice,
  averageCost, consumerSurplus, deadweightLoss } from '../js/economy.js';

test('arc elasticity matches CORE K→L example', () =>
  assert.ok(Math.abs(arcElasticity(32800, 18, 32400, 19) - 4.56) < 0.01));
test('Beautiful Cars optimum', () => {
  assert.equal(optimalPrice({ a: 40000, c: 14400 }), 27200);
  assert.equal(quantityAt({ a: 40000, b: 400 }, 27200), 32);
  assert.equal(profit({ P: 27200, Q: 32, c: 14400, F: 80000 }), 329600);
});
test('markup rule recovers optimal price', () =>
  assert.ok(Math.abs(markupPrice(14400, pointElasticity({ a: 40000 }, 27200)) - 27200) < 1e-6));
test('DWL Beautiful Cars', () => assert.equal(deadweightLoss({ a: 40000, b: 400, c: 14400 }, 27200), 204800));
test('consumer surplus', () => assert.equal(consumerSurplus({ a: 40000, b: 400 }, 27200), 0.5 * 32 * 12800));
test('quantity never negative', () => assert.equal(quantityAt({ a: 10, b: 1 }, 50), 0));
test('average cost', () => assert.equal(averageCost({ c: 14400, F: 80000 }, 10), 22400));
