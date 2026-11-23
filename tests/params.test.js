import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateParams } from '../js/params.js';
import { optimalPrice, quantityAt, profit } from '../js/economy.js';

const seeds = Array.from({ length: 300 }, (_, i) => i * 7919 + 1);

test('deterministic', () => assert.deepEqual(generateParams(5), generateParams(5)));
test('JSON-serializable', () => { const p = generateParams(9);
  assert.deepEqual(JSON.parse(JSON.stringify(p)), p); });
test('nice numbers for every seed', () => { for (const s of seeds) { const p = generateParams(s);
  assert.equal(p.c % 2, 0); assert.equal((p.demand.a - p.c) % 8, 0);
  assert.ok(Number.isInteger(optimalPrice({ a: p.demand.a, c: p.c })));
  assert.equal(quantityAt(p.demand, optimalPrice({ a: p.demand.a, c: p.c })) % 4, 0);
  for (const v of [p.F, p.cash0, p.ipoCash, p.roaster.cost, p.brand.cost]) assert.equal(v % 1000, 0);
  assert.equal(p.roaster.dc % 8, 0); assert.equal(p.brand.da % 8, 0);
  if (p.shock.type === 'marginal') assert.equal(p.shock.amount % 4, 0); } });
test('optimal Stage 1 price is profitable', () => { for (const s of seeds) { const p = generateParams(s);
  const P = optimalPrice({ a: p.demand.a, c: p.c });
  assert.ok(profit({ P, Q: quantityAt(p.demand, P), c: p.c, F: p.F }) > 0); } });
test('both shock types and all rival rules occur', () => {
  const ps = seeds.map(generateParams);
  assert.deepEqual(new Set(ps.map(p => p.shock.type)), new Set(['fijo', 'marginal']));
  assert.equal(new Set(ps.map(p => p.rival.rule)).size, 3); });
