import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, act, step, upgradeRun } from '../js/sim/run.js';

// A run saved by the previous version (before tutorial/coach/diagnose existed).
function oldSave() {
  const run = act(createRun({ seed: 4, line: 'premium', meta: { runId: 'old' } }), { type: 'launch', templateId: 'premium_mantequilla' });
  const old = JSON.parse(JSON.stringify(run));
  for (const k of ['tutorial', 'coachSeen', 'coachQueue', 'lastCoachMonth', 'coachActive', 'lastBelowCost']) delete old[k];
  delete old.state.investments;
  return old;
}
test('an old saved run crashes the new code without an upgrade (the bug)', () => {
  assert.throws(() => step({ ...oldSave(), pending: null }));
});
test('upgradeRun fills the missing fields so an old save keeps playing', () => {
  let run = upgradeRun({ ...oldSave(), pending: null });
  for (let i = 0; i < 6; i++) run = step(run);
  assert.ok(run.state.month >= 1); assert.equal(run.tutorial, null); assert.ok(Array.isArray(run.coachSeen));
});
test('upgradeRun leaves a current run unchanged and rejects garbage', () => {
  const run = createRun({ seed: 1, line: 'generico', meta: { runId: 'x' } });
  assert.deepEqual(upgradeRun(run), run);
  assert.equal(upgradeRun(null), null); assert.equal(upgradeRun({ foo: 1 }), null);
});
