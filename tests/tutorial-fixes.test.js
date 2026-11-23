import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, act, step, answer, ackEvents, pauseReasons } from '../js/sim/run.js';
import { tutorialNext } from '../js/sim/tutorial.js';

const tut = (seed, line = 'premium') => { let r = createRun({ seed, line, meta: { runId: 't' }, tutorial: true }); return r; };
const toLaunch = (r) => { while (r.tutorial.step === 'tour') r = tutorialNext(r); return r; };
const right = (r) => { const b = r.questions[r.pending].built; return b.kind === 'mc' ? b.answer : String(b.answer); };

test('C2: expanding or repositioning before the first launch is blocked during the tutorial', () => {
  for (const line of ['premium', 'generico']) for (const type of ['expand', 'reposition']) {
    let r = act(tut(21, line), { type }); assert.equal(r.inbox.at(-1).data.reason, 'act.tutorialFirstLaunch', `${line} ${type} (tour)`);
    r = act(toLaunch(tut(21, line)), { type }); assert.equal(r.inbox.at(-1).data.reason, 'act.tutorialFirstLaunch', `${line} ${type} (launch)`);
    assert.equal(r.state.cash, r.world.startCash);
  }
});
test('C2 safety net: if no launch is possible in the launch step, time is not frozen', () => {
  const r = toLaunch(tut(21)); const broke = { ...r, state: { ...r.state, cash: 5 } };
  assert.ok(!pauseReasons(broke).includes('tutorial'));
});
test('I1: a student already at the optimum when asked gets a win, not "profit did not rise"', () => {
  let r = act(toLaunch(tut(7)), { type: 'launch', templateId: 'premium_mantequilla' });
  while (r.tutorial.step === 'develop') r = step(ackEvents(r));
  r = act(r, { type: 'setPrice', uid: r.tutorial.uid, price: r.tutorial.diagnose.optimal });
  r = answer(r, right(r));
  const ids = r.inbox.filter((m) => m.type === 'tutorial').map((m) => m.data.id);
  assert.ok(ids.includes('tut.winAlready')); assert.ok(!ids.includes('tut.noWin')); assert.equal(r.tutorial.step, 'done');
});
test('I3: if the diagnose question cannot be asked, the tutorial goes straight to fix (never frozen)', () => {
  let r = act(toLaunch(tut(7)), { type: 'launch', templateId: 'premium_mantequilla' });
  r = { ...r, questions: Array.from({ length: 9 }, (_, i) => ({ id: 'x' + i, answered: true, correct: false, built: {} })) }; // question cap reached
  while (r.tutorial.step === 'develop') r = step(ackEvents(r));
  assert.equal(r.tutorial.step, 'fix'); assert.equal(r.pending, null); assert.ok(r.inbox.some((m) => m.data.id === 'tut.fix'));
});
test('M1: a product nobody buys (price ≥ choke price) does not keep the tutorial in develop forever', () => {
  let r = act(toLaunch(tut(11)), { type: 'launch', templateId: 'premium_mantequilla' });
  r = act(r, { type: 'setPrice', uid: r.tutorial.uid, price: r.state.products[0].a0 * 2 });
  for (let i = 0; i < 5 && !r.state.ended; i++) r = step(ackEvents(r));
  assert.notEqual(r.tutorial.step, 'develop'); assert.ok(r.inbox.some((m) => m.data.id === 'tut.noSales'));
});
