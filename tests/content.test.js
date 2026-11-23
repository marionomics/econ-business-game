import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmt, money, T, describeMessage, describeQuestion, describeFeedback, ENDING_TEXT, TEMPLATE_NAMES, CFO_NAME, GRADING_INTRO } from '../js/content/copy.js';
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
  for (const t of ['wildcard', 'rivalArrives', 'question', 'feedback', 'crisisResolved']) assert.ok(types.has(t), t);
});
test('every ending, template and the grading intro have copy', () => {
  for (const e of ENDINGS) { assert.ok(ENDING_TEXT[e.id]?.title, e.id); assert.ok(ENDING_TEXT[e.id]?.text, e.id); }
  for (const t of [...TEMPLATES.premium, ...TEMPLATES.generico]) assert.ok(TEMPLATE_NAMES[t.id]?.name, t.id);
  assert.ok(CFO_NAME && !/glados/i.test(CFO_NAME)); assert.ok(GRADING_INTRO.includes('50'));
});
test('no copy mentions GLaDOS or Aperture', () => { for (const v of Object.values(T)) assert.doesNotMatch(v, /glados|aperture|portal/i); });
