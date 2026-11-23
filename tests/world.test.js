import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, TEMPLATES } from '../js/sim/world.js';

const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 11);
test('deterministic per seed and line', () => assert.deepEqual(makeWorld(5, 'premium'), makeWorld(5, 'premium')));
test('JSON round-trip', () => { const w = makeWorld(9, 'generico'); assert.deepEqual(JSON.parse(JSON.stringify(w)), w); });
test('line changes templates and base multiple', () => {
  const p = makeWorld(3, 'premium'), g = makeWorld(3, 'generico');
  assert.ok(p.templates.every(t => t.segment === 'premium')); assert.ok(g.templates.every(t => t.segment === 'generico'));
  assert.ok(p.baseMultiple > g.baseMultiple); assert.equal(TEMPLATES.premium.length, 3); assert.equal(TEMPLATES.generico.length, 3);
});
test('every template optimum is an integer above cost; premium less elastic at the optimum', () => {
  for (const s of seeds) for (const line of ['premium', 'generico']) for (const t of makeWorld(s, line).templates) {
    const P = (t.a0 + t.cProd) / 2; assert.ok(Number.isInteger(P), `${t.id} ${P}`); assert.ok(P > t.cProd); }
  const eps = (t) => (t.a0 + t.cProd) / (t.a0 - t.cProd);
  const maxPrem = Math.max(...makeWorld(1, 'premium').templates.map(eps)), minGen = Math.min(...makeWorld(1, 'generico').templates.map(eps));
  assert.ok(maxPrem < minGen);
});
test('rival arrives between month 12 and 18 with a known rule', () => {
  for (const s of seeds) { const w = makeWorld(s, 'premium'); assert.ok(w.rival.arrivalMonth >= 12 && w.rival.arrivalMonth <= 18);
    assert.ok(['undercut', 'match', 'best_response'].includes(w.rival.rule)); }
});
test('wildcard schedule is sorted; target above start cash', () => {
  for (const s of seeds) { const w = makeWorld(s, 'generico'); assert.ok(Array.isArray(w.wildcards));
    assert.deepEqual(w.wildcards.map(x => x.month), [...w.wildcards.map(x => x.month)].sort((a, b) => a - b));
    assert.ok(w.ipoTarget > w.startCash); }
});
test('unknown line throws', () => assert.throws(() => makeWorld(1, 'lujo')));
