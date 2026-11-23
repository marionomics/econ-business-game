import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, act, step, answer, ackEvents, pauseReasons } from '../js/sim/run.js';
import { QUESTIONS } from '../js/sim/questions.js';
import { productDemand, productCost } from '../js/sim/market.js';
import { randomRun } from './support/randombot.js';

test('every question built in random runs has a finite answer and mc answers are among options', () => {
  const seen = new Set();
  for (let s = 1; s <= 30; s++) for (const line of ['premium', 'generico'])
    randomRun(s, line, { onPause: (run, q) => { seen.add(q.id); const b = q.built;
      if (b.kind === 'mc') assert.ok(b.options.some(o => o.id === b.answer), q.id); else assert.ok(Number.isFinite(b.answer), q.id); } });
  assert.ok(seen.size >= 12, `distinct questions seen: ${[...seen].join(',')}`);
  for (const q of QUESTIONS) assert.ok(q.trigger && q.build, q.id);
});
test('tariff question answer equals the engine optimal-price change', () => {
  for (let s = 1; s <= 40; s++) {
    let hit = null;
    randomRun(s, 'premium', { onPause: (run, q) => { if (q.id === 'arancel_precio') hit = { run, q }; } });
    if (!hit) continue;
    const { run, q } = hit; const p = run.state.products.find(x => x.uid === q.built.vars.uid);
    assert.equal(q.built.answer, (productDemand(p, run.state, run.world).a + productCost(p, run.state, run.world)) / 2); return;
  }
  assert.fail('no tariff question in 40 seeds');
});
test('runs that last 36 months ask at least 6 questions and at most 9', () => {
  let checked = 0;
  for (let s = 1; s <= 30; s++) { const run = randomRun(s, s % 2 ? 'premium' : 'generico'); if (run.state.month < 36) continue; checked++;
    const asked = run.questions.filter(q => q.answered).length; assert.ok(asked >= 6 && asked <= 9, `seed ${s}: ${asked}`); }
  assert.ok(checked > 0);
});
test('a run with a pending question survives JSON and continues identically; step is a no-op while pending', () => {
  let run = createRun({ seed: 4, line: 'premium', meta: { runId: 'x' } });
  run = act(run, { type: 'launch', templateId: run.world.templates[0].id });
  assert.notEqual(run.pending, null); assert.ok(pauseReasons(run).includes('question'));
  assert.deepEqual(step(run), run);
  const copy = JSON.parse(JSON.stringify(run)); assert.deepEqual(copy, run);
  const q = run.questions[run.pending].built; const inp = q.kind === 'mc' ? q.answer : String(q.answer);
  assert.deepEqual(answer(copy, inp), answer(run, inp));
});
test('answer grades, records and adds CFO feedback', () => {
  let run = act(createRun({ seed: 4, line: 'premium', meta: { runId: 'x' } }), { type: 'launch', templateId: 'premium_mantequilla' });
  const q = run.questions[run.pending].built; const r = answer(run, q.kind === 'mc' ? q.answer : String(q.answer));
  assert.equal(r.questions[0].correct, true); assert.equal(r.pending, null); assert.equal(r.inbox.at(-1).type, 'feedback');
  const bad = answer(run, 'abc'); if (q.kind === 'numeric') { assert.equal(bad.pending, run.pending); assert.equal(bad.inputError, true); } });
test('important events pause until acknowledged; rejected actions become CFO messages', () => {
  let run = createRun({ seed: 2, line: 'generico', meta: { runId: 'x' } });
  run = act({ ...run, state: { ...run.state, cash: 5 } }, { type: 'expand' });
  assert.equal(run.inbox.at(-1).type, 'rejected'); assert.equal(run.inbox.at(-1).data.reason, 'act.noCash');
  run = createRun({ seed: 2, line: 'generico', meta: { runId: 'x' } });
  run = act(run, { type: 'launch', templateId: run.world.templates[0].id }); run = answer(run, String(run.questions[0].built.answer));
  let paused = false; for (let i = 0; i < 40 && !run.state.ended; i++) { run = step(run);
    if (pauseReasons(run).includes('event')) { paused = true; break; } if (run.pending !== null) run = answer(run, '1'); }
  assert.ok(paused); assert.deepEqual(pauseReasons(ackEvents(run)).filter(x => x === 'event'), []);
});
test('ended runs carry a score; the log stays under 45,000 characters', () => {
  const run = randomRun(9, 'premium'); assert.ok(run.state.ended); assert.ok(run.score && Number.isFinite(run.score.total));
  assert.ok(JSON.stringify(run.log).length < 45000); assert.ok(pauseReasons(run).includes('ended'));
});
test('no question is triggered by the month the run ends', () => {
  for (let s = 1; s <= 40; s++) { const run = randomRun(s, 'generico'); const endMonth = run.state.ended.month;
    assert.ok(run.questions.every(q => q.month < endMonth || q.trigger === 'launch' || q.trigger === 'expand' || q.trigger === 'versions'), `seed ${s}`); }
});
test('a new run opens with the CFO greeting (not a pause)', () => {
  const run = createRun({ seed: 1, line: 'premium', meta: { runId: 'x' } });
  assert.equal(run.inbox[0].type, 'welcome'); assert.equal(run.unseen, 0); });
