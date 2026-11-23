import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateParams } from '../js/params.js';
import { optimalPrice } from '../js/economy.js';
import { SCRIPT, initialState, decisionOptions, resolveDecision, isIpoEligible, simulate,
  decisionApplies, stage3Prices } from '../js/engine.js';
import { ENDINGS, classifyEnding } from '../js/endings.js';

const p = generateParams(123);
const opt = (st, id, params = p) => decisionOptions(st, id, params);
const seedOf = (pred) => { for (let s = 1; s < 5000; s++) if (pred(generateParams(s))) return s; throw new Error('no seed'); };

// Build choices with a strategy function (state, id, options) → optionId.
function play(params, strategy) {
  const choices = {}; let st = initialState(params);
  for (const e of SCRIPT) {
    if (e.kind !== 'decision' || st.bankrupt || !decisionApplies(st, e.id, params)) continue;
    const o = decisionOptions(st, e.id, params);
    choices[e.id] = strategy(st, e.id, o);
    st = resolveDecision(st, e.id, choices[e.id], params);
  }
  return simulate(params, choices);
}
const optimalId = (st, o) => o.find(x => x.price === optimalPrice({ a: st.demand.a, c: st.c })).id;
const belowCostId = (st, o) => o.find(x => x.price < st.c).id;

test('price options: 4 integers, include optimum and exactly one below cost', () => {
  const st = initialState(p); const o = opt(st, 's1_precio_1').map(x => x.price);
  assert.equal(o.length, 4); assert.ok(o.every(Number.isInteger));
  assert.ok(o.includes(optimalPrice({ a: p.demand.a, c: p.c })));
  assert.equal(o.filter(x => x < p.c).length, 1);
});
test('options deterministic', () => assert.deepEqual(opt(initialState(p), 's1_precio_1'), opt(initialState(p), 's1_precio_1')));
test('resolveDecision is pure', () => { const s = initialState(p); const copy = structuredClone(s);
  resolveDecision(s, 's1_precio_1', opt(s, 's1_precio_1')[0].id, p); assert.deepEqual(s, copy); });
test('quarter profit uses displayed values', () => { const s0 = initialState(p);
  const o = opt(s0, 's1_precio_1')[0]; const s1 = resolveDecision(s0, 's1_precio_1', o.id, p);
  const q = s1.quarters[0]; assert.equal(q.profit, (q.P - p.c) * q.Q - p.F);
  assert.equal(s1.cash, p.cash0 + q.profit); });
test('fixed shock leaves Stage 2 optimal price unchanged', () => {
  const pf = generateParams(seedOf(x => x.shock.type === 'fijo'));
  const st = resolveDecision(initialState(pf), 's2_inversion', 'ninguna', pf);
  assert.equal(optimalPrice({ a: st.demand.a, c: st.c }), optimalPrice({ a: pf.demand.a, c: pf.c }));
  assert.equal(st.F, pf.F + pf.shock.amount); });
test('marginal shock raises Stage 2 optimal price by half the cost increase', () => {
  const pm = generateParams(seedOf(x => x.shock.type === 'marginal'));
  const st = resolveDecision(initialState(pm), 's2_inversion', 'ninguna', pm);
  assert.equal(optimalPrice({ a: st.demand.a, c: st.c }) - optimalPrice({ a: pm.demand.a, c: pm.c }), pm.shock.amount / 2); });
test('investments change costs and demand as specified', () => {
  const s0 = initialState(p);
  const t = resolveDecision(s0, 's2_inversion', 'tostadora', p);
  const shockC = p.shock.type === 'marginal' ? p.shock.amount : 0, shockF = p.shock.type === 'fijo' ? p.shock.amount : 0;
  assert.equal(t.c, p.c - p.roaster.dc + shockC); assert.equal(t.F, p.F + p.roaster.dF + shockF);
  assert.equal(t.cash, p.cash0 - p.roaster.cost);
  const b = resolveDecision(s0, 's2_inversion', 'marca', p);
  assert.equal(b.demand.a, p.demand.a + p.brand.da); assert.ok(Math.abs(b.loyalShare - (p.segments.loyalBase + p.brand.dLoyal)) < 1e-9); });
test('stage 3 prices are integers with c < L < H', () => {
  for (let s = 1; s < 200; s++) { const q = generateParams(s); const st = resolveDecision(initialState(q), 's2_inversion', 'ninguna', q);
    const { H, L } = stage3Prices(st, q); assert.ok(Number.isInteger(H) && Number.isInteger(L)); assert.ok(st.c < L && L < H); } });
test('bloquear → regulador even if IPO-eligible', () => {
  for (let s = 1; s < 60; s++) { const q = generateParams(s);
    const r = play(q, (st, id, o) => id === 's3_movida' ? 'bloquear' : id.startsWith('s3_ronda') ? 'H' : id === 's2_inversion' ? 'ninguna' : o[0].price ? optimalId(st, o) : o[0].id);
    if (!r.state.bankrupt) assert.equal(r.ending, 'regulador'); } });
test('below-cost prices every quarter → quiebra_bajo_costo', () => {
  for (let s = 1; s < 60; s++) { const q = generateParams(s);
    const r = play(q, (st, id, o) => o[0].price !== undefined ? belowCostId(st, o) : o[0].id);
    assert.equal(r.ending, 'quiebra_bajo_costo', `seed ${s}`); } });
test('s4_oferta only applies when not IPO-eligible and not bloquear', () => {
  const st = { ...initialState(p), cash: p.ipoCash + 1, quarters: [{ profit: 1 }, { profit: 1 }] };
  assert.ok(isIpoEligible(st, p)); assert.ok(!decisionApplies(st, 's4_oferta', p));
  assert.ok(decisionApplies({ ...st, cash: 0 }, 's4_oferta', p));
  assert.ok(!decisionApplies({ ...st, cash: 0, move: 'bloquear' }, 's4_oferta', p)); });
test('classifyEnding rules', () => {
  const base = { ...initialState(p), quarters: [{ P: 50, c: 20, profit: 5 }, { P: 50, c: 20, profit: 5 }] };
  const rich = { ...base, cash: p.ipoCash };
  assert.equal(classifyEnding({ ...base, bankrupt: true, quarters: [{ P: 10, c: 20, profit: -1 }] }, p), 'quiebra_bajo_costo');
  assert.equal(classifyEnding({ ...base, bankrupt: true, rounds: [{ me: 'L', rival: 'L' }, { me: 'L', rival: 'L' }] }, p), 'quiebra_guerra');
  assert.equal(classifyEnding({ ...base, bankrupt: true }, p), 'quiebra_sobreinversion');
  assert.equal(classifyEnding({ ...rich, rounds: [{ me: 'H', rival: 'H' }, { me: 'H', rival: 'H' }, { me: 'L', rival: 'H' }] }, p), 'ipo_duopolio');
  assert.equal(classifyEnding({ ...rich, investment: 'marca' }, p), 'ipo_premium');
  assert.equal(classifyEnding({ ...rich, investment: 'tostadora' }, p), 'ipo_volumen');
  assert.equal(classifyEnding({ ...rich, investment: 'ambas', rounds: [{ me: 'H', rival: 'L' }, { me: 'H', rival: 'L' }, { me: 'L', rival: 'L' }] }, p), 'ipo_premium');
  assert.equal(classifyEnding({ ...rich, investment: 'ninguna', rounds: [{ me: 'L', rival: 'L' }] }, p), 'ipo_volumen');
  assert.equal(classifyEnding({ ...base, cash: 0, offer: 'aceptar' }, p), 'comprada');
  assert.equal(classifyEnding({ ...base, cash: 0, offer: 'seguir' }, p), 'boutique');
});
test('ENDINGS has the 9 ids with correct types', () => {
  assert.deepEqual(ENDINGS.map(e => e.id).sort(), ['boutique', 'comprada', 'ipo_duopolio', 'ipo_premium',
    'ipo_volumen', 'quiebra_bajo_costo', 'quiebra_guerra', 'quiebra_sobreinversion', 'regulador']);
  const type = Object.fromEntries(ENDINGS.map(e => [e.id, e.type]));
  assert.equal(type.ipo_duopolio, 'ipo'); assert.equal(type.regulador, 'honorable'); assert.equal(type.quiebra_guerra, 'quiebra'); });
test('SCRIPT has 8 checkpoint slots split 3/3/2', () => {
  const slots = SCRIPT.filter(e => e.kind === 'checkpoint').map(e => e.slot);
  assert.deepEqual(slots, ['s1', 's1', 's1', 's2', 's2', 's2', 's3', 's3']); });
