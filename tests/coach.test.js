import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, act, step, answer, ackEvents } from '../js/sim/run.js';
import { COACH_IDS, coachHighlight } from '../js/sim/coach.js';

const go = (o = {}) => createRun({ seed: 11, line: 'premium', meta: { runId: 'c' }, ...o });
const settle = (run) => { while (run.pending !== null) { const b = run.questions[run.pending].built; run = answer(run, b.kind === 'mc' ? b.answer : String(b.answer)); } return run; };
const coachIds = (run) => run.inbox.filter((m) => m.type === 'coach').map((m) => m.data.id);
const months = (run, n) => { for (let i = 0; i < n && !run.state.ended; i++) run = settle(step(ackEvents(settle(run)))); return run; };
const rich = (run) => ({ ...run, state: { ...run.state, cash: 1e8 }, world: { ...run.world, ipoTarget: Infinity } });

test('coach ids cover the spec list', () => assert.deepEqual([...COACH_IDS].sort(),
  ['advertising', 'costShock', 'demandShock', 'editions', 'expand', 'regulator', 'rival', 'saturation', 'valuation'].sort()));
test('second launch → saturation; first advertising → advertising (each once)', () => {
  let run = rich(go()); for (const t of run.world.templates.slice(0, 2)) run = settle(act(run, { type: 'launch', templateId: t.id }));
  run = act(run, { type: 'setAd', uid: run.state.products[0].uid, ad: 5000 }); run = settle(run);
  run = months(run, 2); run = act(run, { type: 'setAd', uid: run.state.products[1].uid, ad: 6000 }); run = months(run, 2);
  const ids = coachIds(run); assert.equal(ids.filter((x) => x === 'saturation').length, 1); assert.equal(ids.filter((x) => x === 'advertising').length, 1);
});
test('seen ids never fire again (persisted across runs)', () => {
  let run = rich(go({ coachSeen: ['saturation'] })); for (const t of run.world.templates.slice(0, 2)) run = settle(act(run, { type: 'launch', templateId: t.id }));
  run = months(run, 2); assert.ok(!coachIds(run).includes('saturation'));
});
test('the rival, the editions month and the first valuation coach in their months', () => {
  let run = rich(go()); run = settle(act(run, { type: 'launch', templateId: run.world.templates[0].id })); run = months(run, 20);
  const ids = coachIds(run); for (const id of ['valuation', 'rival', 'editions']) assert.ok(ids.includes(id), id);
  assert.ok(run.coachSeen.includes('rival'));
});
test('at most one coach message per month; simultaneous triggers come out in later months in order', () => {
  let run = rich(go()); for (const t of run.world.templates.slice(0, 2)) run = settle(act(run, { type: 'launch', templateId: t.id }));
  run = act(run, { type: 'setAd', uid: run.state.products[0].uid, ad: 5000 }); // saturation + advertising in month 0
  const m0 = run.inbox.filter((m) => m.type === 'coach'); assert.equal(m0.length, 1); assert.equal(m0[0].data.id, 'saturation');
  run = months(run, 1); const m = run.inbox.filter((x) => x.type === 'coach'); assert.equal(m[1].data.id, 'advertising'); assert.equal(m[1].month, 1);
  const byMonth = {}; for (const x of months(run, 20).inbox.filter((y) => y.type === 'coach')) byMonth[x.month] = (byMonth[x.month] ?? 0) + 1;
  assert.ok(Object.values(byMonth).every((n) => n === 1));
});
test('nothing fires while the tutorial is active; the queue survives JSON', () => {
  let run = createRun({ seed: 11, line: 'premium', meta: { runId: 'c' }, tutorial: true });
  run = { ...run, tutorial: { ...run.tutorial, step: 'develop', uid: 'x' } }; run = rich(run);
  for (const t of run.world.templates.slice(0, 1)) run = settle(act(run, { type: 'launch', templateId: t.id }));
  run.coachQueue.push({ id: 'saturation', nav: { tab: 'mercado' } });
  assert.deepEqual(JSON.parse(JSON.stringify(run)).coachQueue, run.coachQueue); assert.ok(!coachIds(run).length);
});
test('coach messages pause as events and carry nav; highlight points at the target', () => {
  let run = rich(go()); for (const t of run.world.templates.slice(0, 2)) run = settle(act(run, { type: 'launch', templateId: t.id }));
  const msg = run.inbox.find((m) => m.type === 'coach'); assert.ok(msg.data.nav?.tab); assert.ok(run.unseen > 0);
  assert.equal(coachHighlight(run), msg.data.nav.target ?? `tab:${msg.data.nav.tab}`); assert.equal(coachHighlight(ackEvents(run)), null);
});
