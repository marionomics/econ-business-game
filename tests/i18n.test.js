import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as es from '../js/content/copy.es.js';
import * as en from '../js/content/copy.en.js';
import { GLOSSARY as GES } from '../js/content/glossary.es.js';
import { GLOSSARY as GEN } from '../js/content/glossary.en.js';
import { setLocale } from '../js/content/locale.js';
import { fmt, describeMessage, describeQuestion, describeFeedback, endingText } from '../js/content/copy.js';
import { glossaryTerm } from '../js/content/glossary.js';
import { randomRun } from './support/randombot.js';

const vars = (s) => [...String(s).matchAll(/\{\$?(\w+)\}/g)].map((m) => m[0]).sort();
const terms = (s) => [...String(s).matchAll(/\[\[(\w+)/g)].map((m) => m[1]).sort();

test('copy: same keys, placeholders and glossary links in es and en', () => {
  assert.deepEqual(Object.keys(en.T).sort(), Object.keys(es.T).sort());
  for (const k of Object.keys(es.T)) { assert.deepEqual(vars(en.T[k]), vars(es.T[k]), `vars ${k}`); assert.deepEqual(terms(en.T[k]), terms(es.T[k]), `terms ${k}`); }
});
test('copy: endings, templates, quips, segments, lines, grading intro', () => {
  assert.deepEqual(Object.keys(en.ENDING_TEXT).sort(), Object.keys(es.ENDING_TEXT).sort());
  assert.deepEqual(Object.keys(en.TEMPLATE_NAMES).sort(), Object.keys(es.TEMPLATE_NAMES).sort());
  assert.equal(en.QUIPS.length, es.QUIPS.length); assert.deepEqual(Object.keys(en.SEGMENT), Object.keys(es.SEGMENT)); assert.deepEqual(Object.keys(en.LINE), Object.keys(es.LINE));
  for (const n of ['50', '30', '20']) assert.ok(en.GRADING_INTRO.includes(n)); assert.ok(en.CFO_LONG.startsWith('Machine'));
});
test('glossary: same ids, same CORE sections, formulas present', () => {
  assert.deepEqual(Object.keys(GEN).sort(), Object.keys(GES).sort());
  for (const id of Object.keys(GES)) { assert.equal(GEN[id].core, GES[id].core, id); assert.equal(!!GEN[id].formula, !!GES[id].formula, id); assert.ok(GEN[id].body.length > 40, id); }
});
test('in English, every message, question, feedback and ending renders without missing text', () => {
  setLocale('en');
  try {
    for (const s of [1, 2, 3, 4]) for (const line of ['premium', 'generico']) { const run = randomRun(s, line);
      for (const m of run.inbox) assert.ok(!describeMessage(m, run).text.includes('⟦'), m.type);
      for (const q of run.questions) { assert.ok(!JSON.stringify(describeQuestion(q, run)).includes('⟦'), q.id); if (q.answered) assert.ok(!JSON.stringify(describeFeedback(q, run)).includes('⟦')); } }
    assert.match(fmt('ui.month', { m: 3 }), /Month 3/); assert.ok(!/Mes /.test(fmt('ui.month', { m: 3 })));
    assert.match(endingText('ipo_premium').title, /IPO/); assert.ok(!/ó|ñ|¿/.test(glossaryTerm('elasticidad').body));
  } finally { setLocale('es'); }
});
import { readFileSync } from 'node:fs';
test('no user-facing Spanish is hardcoded in the UI code (it must live in the copy files)', () => {
  for (const f of ['js/ui/dashboard.js', 'js/ui/screens.js', 'js/ui/components.js', 'js/ui/charts.js', 'js/ui/chat.js', 'js/main.js']) {
    const code = readFileSync(new URL('../' + f, import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.doesNotMatch(code, /[áéíóúñ¿¡]/, `${f} has accented text`);
    assert.doesNotMatch(code, /['"`>](Mes |Bajar|Subir|Cerrar|cajas['"`]|precio['"`]|costo['"`]|mes'|meta |Demanda|Caja|Sin productos|Tus productos|Planta y|Ver final|Ver el tablero)/, `${f} has Spanish literals`);
  }
});
