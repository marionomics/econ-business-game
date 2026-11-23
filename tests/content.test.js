import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/rng.js';
import { createRun, currentStep, advance } from '../js/game.js';
import { fmt, money, describeStep, ENDING_TEXT, MANUAL, GRADING_INTRO, RIVAL_NAMES, T } from '../js/content.js';
import { ENDINGS } from '../js/endings.js';
import { BANK } from '../js/checkpoints.js';

const missing = (s) => typeof s === 'string' && s.includes('⟦');
function collectStrings(x, out = []) {
  if (typeof x === 'string') out.push(x);
  else if (Array.isArray(x)) x.forEach(v => collectStrings(v, out));
  else if (x && typeof x === 'object') Object.values(x).forEach(v => collectStrings(v, out));
  return out;
}

test('fmt substitutes vars and flags missing ones', () => {
  T['test.k'] = 'Hola {name}, tienes {$cash} y vendiste {Q} bolsas';
  assert.equal(fmt('test.k', { name: 'Ana', cash: 12400, Q: 1500 }), 'Hola Ana, tienes $12,400 y vendiste 1,500 bolsas');
  assert.ok(missing(fmt('test.k', {}))); assert.ok(missing(fmt('nope.key')));
});
test('money formats negatives', () => assert.equal(money(-3500), '−$3,500'));
test('every step of 50 random playthroughs renders without missing keys or vars', () => {
  const seen = new Set();
  for (let s = 1; s <= 50; s++) {
    const r = createRng(s); let run = createRun({ seed: s * 97, playerId: 'x', playerName: 'X', firmName: 'Café X', classCode: 'C', runNumber: 1 });
    for (let n = 0; n < 200; n++) {
      const st = currentStep(run); const d = describeStep(st, run);
      for (const str of collectStrings(d)) assert.ok(!missing(str), `${st.kind} ${st.id ?? st.built?.itemId ?? ''}: ${str}`);
      if (st.built) seen.add(st.built.itemId);
      if (st.kind === 'ending') break;
      const inp = st.kind === 'decision' ? r.pick(st.options).id : st.kind === 'checkpoint' ? (st.built.kind === 'mc' ? r.pick(st.built.options).id : String(st.built.answer))
        : st.kind === 'openText' ? 'texto' : null;
      run = advance(run, inp);
    }
  }
  assert.ok(seen.size >= 18, `items seen ${seen.size}`);
});
test('every bank item has prompt and explanation copy', () => {
  for (const i of BANK) { assert.ok(T[`cp.${i.id}.prompt`], i.id); assert.ok(T[`cp.${i.id}.explain`], i.id); }
});
test('every ending has title and narration', () => {
  for (const e of ENDINGS) { assert.ok(ENDING_TEXT[e.id]?.title, e.id); assert.ok(ENDING_TEXT[e.id]?.text, e.id); }
});
test('manual, grading intro and rival names exist', () => {
  assert.ok(MANUAL.length >= 6); assert.ok(GRADING_INTRO.includes('40')); assert.ok(RIVAL_NAMES.length >= 3);
});
