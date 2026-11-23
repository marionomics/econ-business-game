import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from '../js/sim/world.js';
import { initialState } from '../js/sim/state.js';
import { applyAction, launchableTemplates } from '../js/sim/actions.js';

const w = makeWorld(7, 'premium');
const launched = () => { const s0 = initialState(w); return applyAction(s0, w, { type: 'launch', templateId: w.templates[0].id }).state; };

test('initial state', () => { const s = initialState(w); assert.equal(s.cash, w.startCash); assert.equal(s.month, 0); assert.deepEqual(s.products, []);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s); });
test('launch charges the cost, copies the template and starts at a neutral price (80% of a0, above cost)', () => {
  const s0 = initialState(w); const t = w.templates[0]; const r = applyAction(s0, w, { type: 'launch', templateId: t.id });
  assert.ok(r.ok); const p = r.state.products[0];
  assert.equal(r.state.cash, w.startCash - t.launchCost); assert.equal(p.a0, t.a0); assert.equal(p.price, Math.max(t.cProd + 1, Math.round(0.8 * t.a0)));
  assert.equal(p.readyAt, t.devMonths); assert.equal(p.ad, 0); assert.ok(p.active); });
test('applyAction is pure', () => { const s = launched(); const copy = structuredClone(s);
  applyAction(s, w, { type: 'setPrice', uid: s.products[0].uid, price: 90 }); assert.deepEqual(s, copy); });
test('price inputs at the extremes are clamped or rejected, never NaN', () => {
  const s = launched(); const uid = s.products[0].uid; const max = s.products[0].a0 * 2;
  const cases = [['', false], ['abc', false], [null, false], [0, 1], [-5, 1], [12.7, 13], ['85', 85], [1e9, max]];
  for (const [input, expect] of cases) { const r = applyAction(s, w, { type: 'setPrice', uid, price: input });
    if (expect === false) { assert.equal(r.ok, false, String(input)); assert.equal(r.reason, 'act.badNumber'); assert.equal(r.state.products[0].price, s.products[0].price); }
    else { assert.ok(r.ok); assert.equal(r.state.products[0].price, expect, String(input)); } }
});
test('advertising is clamped to a non-negative integer', () => { const s = launched(); const uid = s.products[0].uid;
  assert.equal(applyAction(s, w, { type: 'setAd', uid, ad: -100 }).state.products[0].ad, 0);
  assert.equal(applyAction(s, w, { type: 'setAd', uid, ad: 2500.4 }).state.products[0].ad, 2500); });
test('cannot afford a launch → rejected, cash unchanged', () => {
  const s = { ...initialState(w), cash: 1000 }; const r = applyAction(s, w, { type: 'launch', templateId: w.templates[0].id });
  assert.equal(r.ok, false); assert.equal(r.reason, 'act.noCash'); assert.equal(r.state.cash, 1000); assert.equal(r.state.products.length, 0); });
test('expansion limited and charged', () => { let s = { ...initialState(w), cash: 1e7 };
  for (let i = 0; i < w.plant.maxExpansions; i++) { const r = applyAction(s, w, { type: 'expand' }); assert.ok(r.ok); s = r.state; }
  assert.equal(s.F, w.plant.F + w.plant.maxExpansions * w.plant.expandDF);
  const r = applyAction(s, w, { type: 'expand' }); assert.equal(r.ok, false); assert.equal(r.reason, 'act.maxExpansions'); });
test('versions locked before the unlock month and need high > low', () => {
  const s = { ...launched(), cash: 1e6 }; const uid = s.products[0].uid;
  assert.equal(applyAction(s, w, { type: 'versions', uid, high: 120, low: 80 }).reason, 'act.locked');
  const later = { ...s, month: w.versionsUnlockMonth };
  assert.equal(applyAction(later, w, { type: 'versions', uid, high: 80, low: 120 }).reason, 'act.badVersions');
  const ok = applyAction(later, w, { type: 'versions', uid, high: 120, low: 80 }); assert.ok(ok.ok);
  assert.deepEqual(ok.state.products[0].versions, { high: 120, low: 80 }); assert.equal(ok.state.cash, later.cash - w.versionsCost); });
test('discontinue deactivates; unknown product rejected', () => { const s = launched(); const uid = s.products[0].uid;
  assert.equal(applyAction(s, w, { type: 'discontinue', uid }).state.products[0].active, false);
  assert.equal(applyAction(s, w, { type: 'setPrice', uid: 'nope', price: 10 }).reason, 'act.noProduct'); });
test('reposition charges, blocks launches while running', () => { const s = { ...initialState(w), cash: 1e6 };
  const r = applyAction(s, w, { type: 'reposition' }); assert.ok(r.ok);
  assert.deepEqual(r.state.repositioning, { until: w.reposition.months, to: 'generico' });
  assert.equal(applyAction(r.state, w, { type: 'launch', templateId: w.templates[0].id }).reason, 'act.repositioning');
  assert.equal(applyAction(r.state, w, { type: 'reposition' }).reason, 'act.repositioning'); });
test('launchable templates follow the current line', () => {
  assert.deepEqual(launchableTemplates(initialState(w), w).map(t => t.segment), ['premium', 'premium', 'premium']);
  assert.ok(launchableTemplates({ ...initialState(w), line: 'generico' }, w).every(t => t.segment === 'generico')); });
test('actions after the run ended are rejected', () => assert.equal(applyAction({ ...initialState(w), ended: { reason: 'bankrupt' } }, w, { type: 'expand' }).reason, 'act.ended'));
