import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnose } from '../js/sim/diagnose.js';
import { createRun, act, step, answer, ackEvents } from '../js/sim/run.js';

const pp = (o) => ({ uid: 'p1', P: 100, c: 40, Q: 1000, contribution: 60000, inDevelopment: false, ...o });
const runWith = (rows, products) => ({ world: { plant: {} }, state: { month: 5, products, history: [{ month: 5, profit: -1, perProduct: rows }] } });
const prod = (o) => ({ uid: 'p1', active: true, fixedMonthly: 8000, ad: 0, ...o });

test('culprits in order: belowCost, adsOverMargin, losingProduct, investing, fixedCosts', () => {
  let d = diagnose(runWith([pp({ P: 30 })], [prod()])); assert.equal(d.culprit, 'belowCost'); assert.equal(d.uid, 'p1');
  assert.deepEqual(d.nav[0], { tab: 'productos', target: 'price:p1' });
  d = diagnose(runWith([pp({ contribution: 5000 })], [prod({ ad: 9000 })])); assert.equal(d.culprit, 'adsOverMargin'); assert.equal(d.nav[0].target, 'ad:p1');
  d = diagnose(runWith([pp({ contribution: 9000 })], [prod({ ad: 2000 })])); assert.equal(d.culprit, 'losingProduct');
  d = diagnose(runWith([pp({ inDevelopment: true, Q: 0, contribution: 0 })], [prod()])); assert.equal(d.culprit, 'investing');
  d = diagnose(runWith([pp()], [prod()])); assert.equal(d.culprit, 'fixedCosts'); assert.equal(d.nav[0].tab, 'finanzas');
});
const settle = (run) => { while (run.pending !== null) { const b = run.questions[run.pending].built; run = answer(run, b.kind === 'mc' ? b.answer : '1'); } return run; };
test('runway warnings carry the diagnosis and navigation', () => {
  let run = createRun({ seed: 3, line: 'premium', meta: { runId: 'd' } });
  for (const t of run.world.templates.slice(0, 2)) run = settle(act(run, { type: 'launch', templateId: t.id }));
  for (let i = 0; i < 6 && !run.inbox.some((m) => m.type === 'runway'); i++) run = settle(step(ackEvents(run)));
  const w = run.inbox.find((m) => m.type === 'runway'); assert.ok(w, 'a runway warning'); assert.ok(w.data.culprit); assert.ok(w.data.nav?.length);
});
test('a rejected launch says how much is needed and how much we have', () => {
  let run = createRun({ seed: 3, line: 'premium', meta: { runId: 'd' } });
  run = act({ ...run, state: { ...run.state, cash: 40000 } }, { type: 'launch', templateId: run.world.templates[0].id });
  const m = run.inbox.at(-1); assert.equal(m.data.reason, 'act.noCash'); assert.equal(m.data.needed, run.world.templates[0].launchCost); assert.equal(m.data.have, 40000);
});
test('a failed crisis and an investigation carry where to look', () => {
  let run = createRun({ seed: 3, line: 'premium', meta: { runId: 'd' } });
  run = { ...run, state: { ...run.state, crises: [{ id: 'arancel', start: 0, survived: null, resolvedAt: null }], products: [] } };
  for (let i = 0; i < 6; i++) run = settle(step(ackEvents(run)));
  const c = run.inbox.find((m) => m.type === 'crisisResolved'); assert.ok(c); assert.equal(c.data.survived, false); assert.equal(c.data.nav[0].tab, 'costos');
});
