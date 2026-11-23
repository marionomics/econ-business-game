import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmt, money, T, describeMessage, describeQuestion, describeFeedback, endingText, templateName, CFO_NAME, gradingIntro } from '../js/content/copy.js';
import { ENDINGS, classifyEnding } from '../js/sim/endings.js';
import { TEMPLATES } from '../js/sim/world.js';
import { playRun, BOTS, BANKRUPT_BOTS } from './support/bots.js';
import { randomRun } from './support/randombot.js';

const missing = (s) => typeof s === 'string' && s.includes('⟦');
const strings = (x, out = []) => { if (typeof x === 'string') out.push(x); else if (x && typeof x === 'object') Object.values(x).forEach((v) => strings(v, out)); return out; };

test('fmt substitutes numbers and money, flags missing vars and keys', () => {
  T['test.k'] = 'Hola {name}: {$cash} y {Q} cajas'; assert.equal(fmt('test.k', { name: 'Ana', cash: 12400, Q: 1500 }), 'Hola Ana: $12,400 y 1,500 cajas');
  assert.ok(missing(fmt('test.k', {}))); assert.ok(missing(fmt('nope'))); assert.equal(money(-3500), '−$3,500'); });
test('every message, question and feedback of many runs renders completely', () => {
  const all = [...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((s) => [randomRun(s, 'premium'), randomRun(s, 'generico')]),
    ...['premium', 'generico'].flatMap((l) => [3, 9].flatMap((s) => [playRun(s, l, BOTS.optimal), playRun(s, l, BOTS.competent)])),
    ...Object.values(BANKRUPT_BOTS).map((b) => playRun(5, 'premium', b))];
  const types = new Set();
  for (const run of all) {
    for (const m of run.inbox) { types.add(m.type); const d = describeMessage(m, run); assert.ok(d.text.length > 0, m.type);
      for (const s of strings(d)) assert.ok(!missing(s), `${m.type}: ${s}`); }
    for (const q of run.questions) { for (const s of strings(describeQuestion(q, run))) assert.ok(!missing(s), `${q.id}: ${s}`);
      if (q.answered) for (const s of strings(describeFeedback(q, run))) assert.ok(!missing(s), `fb ${q.id}: ${s}`); }
  }
  for (const t of ['welcome', 'wildcard', 'rivalArrives', 'question', 'feedback', 'crisisResolved']) assert.ok(types.has(t), t);
});
test('every ending, template and the grading intro have copy', () => {
  for (const e of ENDINGS) { assert.ok(endingText(e.id)?.title, e.id); assert.ok(endingText(e.id)?.text, e.id); }
  for (const t of [...TEMPLATES.premium, ...TEMPLATES.generico]) assert.ok(templateName(t.id) !== t.id, t.id);
  assert.ok(CFO_NAME && !/glados/i.test(CFO_NAME)); assert.ok(gradingIntro().includes('50'));
});
test('no copy mentions GLaDOS or Aperture', () => { for (const v of Object.values(T)) assert.doesNotMatch(v, /glados|aperture|portal/i); });

import { createRun as cr2, act as act2, step as step2, answer as ans2, ackEvents as ack2 } from '../js/sim/run.js';
import { tutorialNext } from '../js/sim/tutorial.js';
const settle2 = (run) => { while (run.pending !== null) { const b = run.questions[run.pending].built; run = ans2(run, b.kind === 'mc' ? b.answer : String(b.answer)); } return run; };
test('tutorial, coach and warning messages render completely, with labelled navigation', () => {
  const runs = [];
  for (const line of ['premium', 'generico']) {
    let run = cr2({ seed: 21, line, meta: { runId: 't', firmName: 'Galletas X' }, tutorial: true });
    while (run.tutorial.step === 'tour') run = tutorialNext(run);
    run = act2(run, { type: 'launch', templateId: run.world.templates[0].id });
    run = act2(run, { type: 'launch', templateId: run.world.templates[1].id }); // rejected during tutorial
    for (let i = 0; i < 30 && !run.state.ended; i++) {
      run = settle2(run);
      if (run.tutorial.step === 'fix') run = act2(run, { type: 'setPrice', uid: run.tutorial.uid, price: run.tutorial.diagnose.optimal });
      if (run.state.month === 8) { run = act2(run, { type: 'launch', templateId: run.world.templates[1].id }); run = act2(run, { type: 'setAd', uid: run.state.products[0].uid, ad: 3000 }); }
      run = step2(ack2(settle2(run)));
    }
    runs.push(run);
    let poor = cr2({ seed: 5, line, meta: { runId: 'p' } }); for (const t of poor.world.templates) poor = settle2(act2(poor, { type: 'launch', templateId: t.id }));
    poor = act2({ ...poor, state: { ...poor.state, cash: 10 } }, { type: 'expand' });
    poor = act2(poor, { type: 'setPrice', uid: poor.state.products[0].uid, price: 2 });
    for (let i = 0; i < 8 && !poor.state.ended; i++) poor = step2(ack2(settle2(poor)));
    runs.push(poor);
  }
  const types = new Set();
  for (const run of runs) for (const m of run.inbox) { types.add(m.type === 'tutorial' ? m.data.id : m.type === 'coach' ? 'coach.' + m.data.id : m.type);
    const d = describeMessage(m, run);
    for (const s of strings(d)) assert.ok(!missing(s), `${m.type} ${m.data.id ?? ''}: ${s}`);
    for (const n of d.nav ?? []) assert.ok(n.label && (n.tab || n.target), `${m.type} nav`); }
  for (const id of ['tut.tour.cash', 'tut.tour.clock', 'tut.launch', 'tut.develop', 'tut.diagnose', 'tut.fix', 'tut.win', 'coach.valuation', 'rejected'])
    assert.ok(types.has(id), id);
});
test('every tutorial step message and coach id has Spanish copy', () => {
  for (const id of ['cash', 'valuation', 'clock', 'tabs', 'chat', 'info']) assert.ok(T[`tut.tour.${id}`], id);
  for (const k of ['tut.launch', 'tut.develop', 'tut.diagnose', 'tut.fix', 'tut.fixAlready', 'tut.win', 'tut.noWin', 'act.tutorialOneProduct',
    'ui.tutorial.next', 'ui.tutorial.skipFix', 'ui.tutorial.replay', 'ui.coach.ok']) assert.ok(T[k], k);
  for (const id of ['saturation', 'advertising', 'valuation', 'rival', 'editions', 'costShock', 'demandShock', 'regulator', 'expand']) assert.ok(T[`coach.${id}`], id);
  for (const c of ['belowCost', 'adsOverMargin', 'losingProduct', 'investing', 'fixedCosts']) assert.ok(T[`warn.runway.${c}`], c);
  assert.match(T['tut.develop'], /Continuar/);
});
