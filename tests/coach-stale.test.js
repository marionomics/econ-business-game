import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, act, step, ackEvents, answer } from '../js/sim/run.js';
const settle = (r) => { while (r.pending !== null) { const b = r.questions[r.pending].built; r = answer(r, b.kind === 'mc' ? b.answer : String(b.answer)); } return r; };

const rich = (r) => ({ ...r, state: { ...r.state, cash: 1e8 }, world: { ...r.world, ipoTarget: Infinity } });
test('a queued editions tip retargets to a product that still exists', () => {
  let r = rich(createRun({ seed: 11, line: 'premium', meta: { runId: 's' } }));
  r = act(r, { type: 'launch', templateId: r.world.templates[0].id }); r = act(r, { type: 'launch', templateId: r.world.templates[1].id });
  const [p1, p2] = r.state.products.map((p) => p.uid);
  r = { ...r, coachQueue: [{ id: 'editions', nav: { tab: 'productos', target: `versions:${p1}` } }], lastCoachMonth: -1 };
  r = act(r, { type: 'discontinue', uid: p1 });
  const m = r.inbox.filter((x) => x.type === 'coach').at(-1);
  assert.equal(m.data.id, 'editions'); assert.equal(m.data.nav.target, `versions:${p2}`);
});
test('a queued expand tip is dropped once the plant cannot expand any more', () => {
  let r = rich(createRun({ seed: 11, line: 'premium', meta: { runId: 's' } }));
  r = settle(act(r, { type: 'launch', templateId: r.world.templates[0].id }));
  r = { ...r, coachQueue: [{ id: 'expand', nav: { tab: 'productos', target: 'expand' } }], lastCoachMonth: 0, state: { ...r.state, expansions: r.world.plant.maxExpansions } };
  r = step(ackEvents(r));
  assert.ok(!r.inbox.some((x) => x.type === 'coach' && x.data.id === 'expand')); assert.ok(!r.coachQueue.some((x) => x.id === 'expand'));
});
