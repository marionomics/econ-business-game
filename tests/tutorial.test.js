import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, act, step, answer, ackEvents, pauseReasons } from '../js/sim/run.js';
import { tutorialNext, tutorialSkipFix, tutorialHighlight, TOUR } from '../js/sim/tutorial.js';
import { makeWorld } from '../js/sim/world.js';
import { launchableTemplates } from '../js/sim/actions.js';

const start = (seed, line) => createRun({ seed, line, meta: { runId: 't' }, tutorial: true });
const rightAnswer = (run) => { const b = run.questions[run.pending].built; return b.kind === 'mc' ? b.answer : String(b.answer); };

// Follows every instruction. Returns the run and the sequence of steps seen.
export function followTutorial(seed, line, { maxMonths = 12 } = {}) {
  let run = start(seed, line); const steps = [run.tutorial.step];
  const note = () => { if (run.tutorial && steps.at(-1) !== run.tutorial.step) steps.push(run.tutorial.step); };
  while (run.tutorial.step === 'tour') { run = tutorialNext(run); note(); }
  run = act(run, { type: 'launch', templateId: launchableTemplates(run.state, run.world)[0].id }); note();
  for (let i = 0; i < 60 && run.tutorial.step !== 'done' && !run.state.ended && run.state.month < maxMonths; i++) {
    while (run.pending !== null) { run = answer(run, rightAnswer(run)); note(); }
    if (run.tutorial.step === 'fix') { run = act(run, { type: 'setPrice', uid: run.tutorial.uid, price: run.tutorial.diagnose.optimal }); note(); continue; }
    run = step(ackEvents(run)); note();
  }
  return { run, steps };
}

test('a student who follows the tutorial goes tour → launch → develop → diagnose → fix → verify → done', () => {
  const { steps } = followTutorial(1, 'premium');
  assert.deepEqual(steps, ['tour', 'launch', 'develop', 'diagnose', 'fix', 'verify', 'done']);
});
test('first win: for 40 seeds × both lines, following the tutorial ends with tut.win and higher profit', () => {
  for (let s = 1; s <= 40; s++) for (const line of ['premium', 'generico']) {
    const { run } = followTutorial(s * 977, line);
    assert.equal(run.tutorial.step, 'done', `seed ${s} ${line}`);
    const last = run.inbox.filter((m) => m.type === 'tutorial').at(-1);
    assert.equal(last.data.id, 'tut.win', `seed ${s} ${line}: ${last.data.id}`);
    assert.ok(last.data.after > last.data.before);
  }
});
test('the tour has one message per target, including the clock', () => {
  let run = start(2, 'generico'); assert.ok(TOUR.includes('clock'));
  for (let i = 0; i < TOUR.length; i++) { assert.equal(tutorialHighlight(run), TOUR[i]); run = tutorialNext(run); }
  assert.equal(run.tutorial.step, 'launch'); assert.equal(tutorialHighlight(run), 'launch');
  assert.equal(run.inbox.filter((m) => m.type === 'tutorial' && m.data.tour).length, TOUR.length);
});
test('time is frozen exactly in the waiting steps', () => {
  let run = start(3, 'premium'); assert.ok(pauseReasons(run).includes('tutorial')); assert.deepEqual(step(run), run);
  while (run.tutorial.step === 'tour') run = tutorialNext(run);
  assert.ok(pauseReasons(run).includes('tutorial'));
  run = act(run, { type: 'launch', templateId: run.world.templates[0].id });
  assert.equal(run.tutorial.step, 'develop'); assert.ok(!pauseReasons(run).includes('tutorial')); assert.equal(tutorialHighlight(run), 'clock-play');
  assert.equal(run.pending, null, 'the normal launch question is suppressed for the tutorial product');
});
test('a second launch during the tutorial is rejected with an explanation', () => {
  let run = start(4, 'premium'); while (run.tutorial.step === 'tour') run = tutorialNext(run);
  run = act({ ...run, state: { ...run.state, cash: 1e7 } }, { type: 'launch', templateId: run.world.templates[0].id });
  run = act(run, { type: 'launch', templateId: run.world.templates[1].id });
  assert.equal(run.state.products.length, 1); assert.equal(run.inbox.at(-1).type, 'rejected'); assert.equal(run.inbox.at(-1).data.reason, 'act.tutorialOneProduct');
});
test('diagnose asks precio_optimo for the tutorial product; a wrong answer still moves to fix', () => {
  let run = start(5, 'generico'); while (run.tutorial.step === 'tour') run = tutorialNext(run);
  run = act(run, { type: 'launch', templateId: run.world.templates[0].id });
  while (run.tutorial.step === 'develop') run = step(ackEvents(run));
  assert.equal(run.tutorial.step, 'diagnose'); assert.equal(run.questions[run.pending].id, 'precio_optimo');
  assert.equal(run.questions[run.pending].built.vars.uid, run.tutorial.uid); assert.equal(tutorialHighlight(run), 'demand-chart');
  const msg = run.inbox.filter((m) => m.type === 'tutorial').at(-1); assert.equal(msg.data.id, 'tut.diagnose');
  for (const k of ['devLoss', 'profit', 'optProfit']) assert.ok(Number.isFinite(msg.data[k]), k);
  run = answer(run, '1'); assert.equal(run.questions.at(-1).correct, false); assert.equal(run.tutorial.step, 'fix');
  assert.equal(tutorialHighlight(run), `price:${run.tutorial.uid}`); assert.ok(pauseReasons(run).includes('tutorial'));
});
test('skipping the fix lets time run; ignoring the tutorial can still end in bankruptcy', () => {
  let run = start(6, 'premium'); while (run.tutorial.step === 'tour') run = tutorialNext(run);
  run = act(run, { type: 'launch', templateId: run.world.templates[0].id });
  run = act(run, { type: 'setPrice', uid: run.tutorial.uid, price: 1 });
  for (let i = 0; i < 40 && !run.state.ended; i++) {
    while (run.pending !== null) run = answer(run, '1');
    if (run.tutorial.step === 'fix') run = tutorialSkipFix(run);
    run = step(ackEvents(run));
  }
  assert.equal(run.state.ended.reason, 'bankrupt');
});
test('reload at every step continues identically', () => {
  let a = start(7, 'premium'); let n = 0;
  const adv = (r) => { if (r.tutorial.step === 'tour') return tutorialNext(r); if (r.tutorial.step === 'launch') return act(r, { type: 'launch', templateId: r.world.templates[0].id });
    if (r.pending !== null) return answer(r, rightAnswer(r)); if (r.tutorial.step === 'fix') return act(r, { type: 'setPrice', uid: r.tutorial.uid, price: r.tutorial.diagnose.optimal });
    return step(ackEvents(r)); };
  while (a.tutorial.step !== 'done' && n++ < 80) { const b = JSON.parse(JSON.stringify(a)); assert.deepEqual(b, a); assert.deepEqual(adv(b), adv(a)); a = adv(a); }
  assert.equal(a.tutorial.step, 'done');
});
test('tutorial worlds schedule no wildcard before month 6, keeping 3 months of spacing', () => {
  for (let s = 1; s < 200; s++) for (const line of ['premium', 'generico']) { const w = makeWorld(s, line, { tutorial: true });
    assert.ok(w.wildcards.every((x) => x.month >= 6)); for (let i = 1; i < w.wildcards.length; i++) assert.ok(w.wildcards[i].month - w.wildcards[i - 1].month >= 3); }
});
test('without tutorial nothing changes', () => {
  const run = createRun({ seed: 1, line: 'premium', meta: { runId: 'x' } }); assert.equal(run.tutorial, null);
  assert.deepEqual(makeWorld(9, 'premium'), makeWorld(9, 'premium', { tutorial: false }));
});
