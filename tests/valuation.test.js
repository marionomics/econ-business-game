import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from '../js/sim/world.js';
import { initialState } from '../js/sim/state.js';
import { applyAction } from '../js/sim/actions.js';
import { tick } from '../js/sim/tick.js';
import { valuation, sustained } from '../js/sim/valuation.js';
import { classifyEnding, ENDINGS } from '../js/sim/endings.js';

const w = { ...makeWorld(3, 'premium'), wildcards: [], rival: { arrivalMonth: 99, rule: 'match', costFactor: 1 } };
const row = (profit, o = {}) => ({ profit, revenue: 100000, contribution: 40000, perProduct: [], valuation: 0, ...o });
const st = (rows, o = {}) => ({ ...initialState(w), history: rows, month: rows.length, ...o });

test('value = annualized last-3-months profit × multiple + cash', () => {
  const s = st([row(10), row(10), row(10), row(20), row(20), row(20)], { cash: 5000 });
  const v = valuation(s, w); assert.equal(v.annualProfit, 4 * 60);
  assert.equal(v.value, Math.max(0, v.annualProfit * v.multiple) + 5000); assert.ok(v.parts.growth > 0); });
test('an open investigation lowers the multiple; negative profit gives no negative value', () => {
  const a = valuation(st([row(10), row(10), row(10)]), w), b = valuation(st([row(10), row(10), row(10)], { regulator: { investigation: { start: 1 } } }), w);
  assert.equal(a.multiple - b.multiple, 2); assert.equal(valuation(st([row(-50), row(-50), row(-50)], { cash: 7 }), w).value, 7); });
test('sustained valuation is the min of the last 3 months', () => {
  assert.equal(sustained([{ valuation: 5 }, { valuation: 9 }, { valuation: 7 }]), 5); assert.equal(sustained([{ valuation: 5 }]), 0); });
test('a one-month spike does not raise bestSustained', () => {
  let s = applyAction({ ...initialState(w), cash: 1e6 }, w, { type: 'launch', templateId: w.templates[0].id }).state;
  for (let i = 0; i < 8; i++) s = tick(s, w).state;
  const before = s.bestSustained; s = { ...s, cash: s.cash + 1e9 }; // one-off spike in cash this month
  s = tick(s, w).state; assert.ok(s.history.at(-1).valuation > 1e9); assert.equal(s.bestSustained <= Math.max(before, s.history.at(-3).valuation), true); });
test('IPO ends the run when sustained valuation reaches the target', () => {
  const ww = { ...w, ipoTarget: 1 }; let s = applyAction({ ...initialState(ww), cash: 1e6 }, ww, { type: 'launch', templateId: ww.templates[0].id }).state;
  let evs = []; for (let i = 0; i < 6 && !s.ended; i++) { const r = tick(s, ww); s = r.state; evs.push(...r.events); }
  assert.equal(s.ended.reason, 'ipo'); assert.ok(evs.some(e => e.type === 'ipo')); });

const pp = (o) => ({ uid: 'p1', P: 100, c: 40, Q: 10, contribution: 600, ...o });
test('ending ids and types', () => assert.deepEqual(ENDINGS.map(e => e.id).sort(), ['comprada', 'fin_sin_ipo', 'ipo_premium', 'ipo_volumen',
  'quiebra_bajo_costo', 'quiebra_choque_costos', 'quiebra_demanda', 'quiebra_expansion', 'quiebra_guerra', 'quiebra_publicidad', 'regulador'].sort()));
test('classifyEnding rules', () => {
  const bk = (o, rows) => st(rows ?? [row(-1, { perProduct: [pp()] })], { ended: { reason: 'bankrupt' }, ...o });
  assert.equal(classifyEnding(st([row(1)], { ended: { reason: 'ipo' }, line: 'premium' }), w), 'ipo_premium');
  assert.equal(classifyEnding(st([row(1)], { ended: { reason: 'ipo' }, line: 'generico' }), w), 'ipo_volumen');
  assert.equal(classifyEnding(st([row(1)], { ended: { reason: 'regulator' } }), w), 'regulador');
  assert.equal(classifyEnding(bk({}, [row(-1, { perProduct: [pp({ P: 30 })] })]), w), 'quiebra_bajo_costo');
  const rows = [row(1, { perProduct: [pp({ P: 100 })] }), row(-1, { perProduct: [pp({ P: 100 })] })];
  assert.equal(classifyEnding(bk({ shocks: [{ id: 'arancel', month: 1, kind: 'cost' }] }, rows), w), 'quiebra_choque_costos');
  assert.equal(classifyEnding(bk({ shocks: [{ id: 'salud', month: 1, kind: 'demand', until: 7 }] }, rows), w), 'quiebra_demanda');
  assert.equal(classifyEnding(bk({ rival: { active: true, since: 1, avgPriceAtArrival: 120, prices: {} }, products: [{ uid: 'p1', active: true, price: 100, versions: null }] }), w), 'quiebra_guerra');
  assert.equal(classifyEnding(bk({ investments: [{ month: 1, amount: 1e7 }] }), w), 'quiebra_expansion');
  assert.equal(classifyEnding(bk({}, [row(-1, { ads: 50000, perProduct: [pp()] })]), w), 'quiebra_publicidad');
  assert.equal(classifyEnding(bk({}), w), 'quiebra_expansion'); // fallback: costs bigger than sales
  assert.equal(classifyEnding(st([row(5)], { ended: { reason: 'end36' } }), w), 'comprada');
  assert.equal(classifyEnding(st([row(-5)], { ended: { reason: 'end36' } }), w), 'fin_sin_ipo');
});
test('launch and expansion are recorded as investments', () => {
  const s = applyAction({ ...initialState(w), cash: 1e7 }, w, { type: 'launch', templateId: w.templates[0].id }).state;
  assert.deepEqual(s.investments, [{ month: 0, amount: w.templates[0].launchCost, type: 'launch' }]); });
test('a rent rise (fixed cost) is never blamed for not raising prices', () => {
  const rows = [row(1, { perProduct: [pp({ P: 100 })] }), row(-1, { perProduct: [pp({ P: 100 })] })];
  const s = st(rows, { ended: { reason: 'bankrupt' }, shocks: [{ id: 'renta', month: 1, kind: 'fixed' }] });
  assert.notEqual(classifyEnding(s, w), 'quiebra_choque_costos'); });
test('the rent wildcard records a fixed-cost shock', async () => {
  const { WILDCARDS } = await import('../js/sim/wildcards.js'); const s = { month: 3, effects: [], shocks: [] };
  WILDCARDS.renta.apply(s, { rent: 10 }); assert.equal(s.shocks[0].kind, 'fixed'); });
test('heavy advertising is blamed before a demand shock; a price war before a cost shock', () => {
  const bk = (o, rows) => st(rows, { ended: { reason: 'bankrupt' }, ...o });
  assert.equal(classifyEnding(bk({ shocks: [{ id: 'recesion', month: 1, kind: 'demand', until: 9 }] }, [row(-1, { ads: 50000, perProduct: [pp()] })]), w), 'quiebra_publicidad');
  const war = { rival: { active: true, since: 1, avgPriceAtArrival: 120, prices: {} }, products: [{ uid: 'p1', active: true, price: 100, versions: null }],
    shocks: [{ id: 'arancel', month: 1, kind: 'cost' }] };
  assert.equal(classifyEnding(bk(war, [row(1, { perProduct: [pp({ P: 100 })] }), row(-1, { perProduct: [pp({ P: 100 })] })]), w), 'quiebra_guerra');
});
test('a cost shock up to 12 months back is still blamed if prices never rose since', () => {
  const rows = Array.from({ length: 12 }, (_, i) => row(i < 11 ? 1 : -1, { month: i + 1, perProduct: [pp({ P: 100 })] }));
  const s = st(rows, { month: 12, ended: { reason: 'bankrupt' }, shocks: [{ id: 'arancel', month: 2, kind: 'cost' }] });
  assert.equal(classifyEnding(s, w), 'quiebra_choque_costos'); });
