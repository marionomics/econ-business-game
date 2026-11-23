import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateParams } from '../js/params.js';
import { createRng } from '../js/rng.js';
import { SCRIPT, initialState, decisionOptions, resolveDecision, decisionApplies, stage3Matrix } from '../js/engine.js';
import { nashEquilibria, gameType } from '../js/rival.js';
import { CONCEPTS, BANK, assignConcepts, buildCheckpoint, gradeCheckpoint, parseNumber } from '../js/checkpoints.js';

const seedOf = (pred) => { for (let s = 1; s < 5000; s++) if (pred(generateParams(s))) return s; throw new Error('none'); };

// Random playthrough; at each checkpoint position calls visit(state, params, slot, index).
function walk(seed, pathSeed, visit) {
  const p = generateParams(seed); const r = createRng(pathSeed); let st = initialState(p); let idx = 0;
  for (const e of SCRIPT) {
    if (st.bankrupt) break;
    if (e.kind === 'checkpoint') { visit(st, p, e.slot, idx++); continue; }
    if (e.kind !== 'decision' || !decisionApplies(st, e.id, p)) continue;
    st = resolveDecision(st, e.id, r.pick(decisionOptions(st, e.id, p)).id, p);
  }
  return st;
}

test('bank has ≥ 20 items, every concept covered', () => {
  assert.ok(BANK.length >= 20);
  for (const c of Object.values(CONCEPTS).flat()) assert.ok(BANK.some(i => i.concept === c), c);
});
test('assignConcepts: 3/3/2, distinct, deterministic', () => {
  for (let s = 1; s < 50; s++) { const a = assignConcepts(s);
    assert.equal(a.s1.length, 3); assert.equal(a.s2.length, 3); assert.equal(a.s3.length, 2);
    for (const k of ['s1', 's2', 's3']) { assert.equal(new Set(a[k]).size, a[k].length); assert.ok(a[k].every(c => CONCEPTS[k].includes(c))); }
    assert.deepEqual(assignConcepts(s), a); }
});
test('every concept builds in every reachable checkpoint state', () => {
  for (let s = 1; s <= 20; s++) for (let path = 0; path < 5; path++)
    walk(s, s * 100 + path, (st, p, slot, idx) => { for (const c of CONCEPTS[slot]) {
      const b = buildCheckpoint(c, st, p, p.seed, idx);
      assert.ok(['mc', 'numeric'].includes(b.kind));
      if (b.kind === 'mc') { assert.ok(b.options.length >= 2); assert.ok(b.options.some(o => o.id === b.answer), `${b.itemId} answer in options`);
        assert.equal(new Set(b.options.map(o => o.id)).size, b.options.length); }
      else assert.ok(Number.isFinite(b.answer), `${b.itemId} finite`); } });
});
test('choque item answer follows shock type', () => {
  for (const [type, ans] of [['fijo', 'igual'], ['marginal', 'sube_mitad']]) {
    const p = generateParams(seedOf(x => x.shock.type === type));
    const st = resolveDecision(initialState(p), 's2_inversion', 'ninguna', p);
    const items = BANK.filter(i => i.concept === 'choque' && i.applies(st, p) && i.id.startsWith('choque_') && i.id !== 'choque_utilidad');
    assert.equal(items.length, 1); assert.equal(items[0].build(st, p, createRng(1)).answer, ans); }
});
test('nash and tipo_juego answers match rival.js', () => {
  const p = generateParams(77); let st = resolveDecision(initialState(p), 's2_inversion', 'marca', p);
  st = resolveDecision(st, 's3_movida', 'nada', p); const m = stage3Matrix(st, p);
  const nash = BANK.find(i => i.id === 'nash').build(st, p, createRng(2));
  const expected = { 'HH': 'HH', 'LL': 'LL', 'HH,LL': 'HH_LL' }[nashEquilibria(m).sort().join(',')] ?? 'ninguno';
  assert.equal(nash.answer, expected);
  assert.equal(BANK.find(i => i.id === 'tipo_juego').build(st, p, createRng(2)).answer, gameType(m) === 'otro' ? 'otro' : gameType(m));
});
test('numeric grading tolerance', () => { const b = { kind: 'numeric', answer: 1000 };
  assert.ok(gradeCheckpoint(b, 1019)); assert.ok(!gradeCheckpoint(b, 1021)); assert.ok(!gradeCheckpoint(b, null));
  assert.ok(gradeCheckpoint({ kind: 'numeric', answer: 0 }, 0.005)); });
test('mc grading', () => assert.ok(gradeCheckpoint({ kind: 'mc', answer: 'x' }, 'x') && !gradeCheckpoint({ kind: 'mc', answer: 'x' }, 'y')));
test('parseNumber', () => {
  for (const [s, n] of [['$1,250', 1250], ['1,250.5', 1250.5], ['1.250,5', 1250.5], [' 4,5 ', 4.5],
    ['−3', -3], ['-3', -3], ['12', 12], ['0.25', 0.25], ['$ 12,400', 12400], ['1,234,567', 1234567]]) assert.equal(parseNumber(s), n, s);
  for (const s of ['', 'abc', '1,2,3x', '--3', null, undefined]) assert.equal(parseNumber(s), null, String(s));
});
test('a memorized mc answer is not always right', () => {
  const answers = { choque: new Set(), markup: new Set(), equilibrio: new Set() };
  for (let s = 1; s <= 60; s++) walk(s, s, (st, p, slot, idx) => { for (const c of Object.keys(answers)) if (CONCEPTS[slot].includes(c)) {
    for (const item of BANK.filter(i => i.concept === c && i.applies(st, p))) { const b = item.build(st, p, createRng(s));
      if (b.kind === 'mc') answers[c].add(item.id + ':' + b.answer); } } });
  for (const [c, set] of Object.entries(answers)) {
    const byItem = {}; for (const x of set) { const [id, a] = x.split(':'); (byItem[id] ??= new Set()).add(a); }
    const conceptAnswers = new Set([...set].map(x => x.split(':')[1]));
    assert.ok(conceptAnswers.size >= 2, `${c}: ${[...set]}`); }
});
test('builds are deterministic', () => {
  const p = generateParams(5); const st = resolveDecision(initialState(p), 's1_precio_1', decisionOptions(initialState(p), 's1_precio_1', p)[0].id, p);
  assert.deepEqual(buildCheckpoint('utilidad', st, p, 5, 0), buildCheckpoint('utilidad', st, p, 5, 0));
});
