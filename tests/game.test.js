import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/rng.js';
import { createRun, currentStep, advance, dashboard } from '../js/game.js';
import { ENDINGS } from '../js/endings.js';

const meta = (seed) => ({ seed, playerId: 'a1', playerName: 'Ana', firmName: 'Café Tláloc', classCode: 'MICRO', runNumber: 1 });

// Random but valid input for a step.
function inputFor(step, r) {
  if (step.kind === 'decision') return r.pick(step.options).id;
  if (step.kind === 'checkpoint') return step.built.kind === 'mc' ? r.pick(step.built.options).id
    : String(r.next() < 0.5 ? step.built.answer : r.int(-100, 100000));
  if (step.kind === 'openText') return 'Mi markup refleja la lealtad de mis clientes.';
  return null;
}
function playOut(seed, pathSeed, onStep = () => {}) {
  const r = createRng(pathSeed); let run = createRun(meta(seed)); let n = 0;
  while (currentStep(run).kind !== 'ending') { const st = currentStep(run); onStep(run, st); run = advance(run, inputFor(st, r)); if (++n > 200) throw new Error('loop'); }
  return { run, steps: n };
}

test('a full random playthrough always reaches an ending with a score', () => {
  const ids = new Set(ENDINGS.map(e => e.id));
  for (let s = 1; s <= 50; s++) { const { run, steps } = playOut(s * 31, s);
    assert.ok(ids.has(run.ending)); assert.ok(run.score.total >= 0 && run.score.total <= 100);
    assert.ok(run.checkpoints.length <= 8); assert.ok(steps < 100); }
});
test('non-bankrupt runs answer all 8 checkpoints and give open text', () => {
  let checked = 0;
  for (let s = 1; s <= 40; s++) { const { run } = playOut(s * 17, s + 1000);
    if (run.state.bankrupt) continue; checked++;
    assert.equal(run.checkpoints.length, 8); assert.ok(run.openText.length > 0); }
  assert.ok(checked > 0);
});
test('Run survives JSON round-trip at every step and continues identically', () => {
  const r1 = createRng(9), r2 = createRng(9); let a = createRun(meta(4242)), b = structuredClone(a); let n = 0;
  while (currentStep(a).kind !== 'ending' && n++ < 200) {
    b = JSON.parse(JSON.stringify(b)); assert.deepEqual(currentStep(b), currentStep(a));
    a = advance(a, inputFor(currentStep(a), r1)); b = advance(b, inputFor(currentStep(b), r2)); }
  assert.deepEqual(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(a)));
});
test('advance does not mutate its input', () => {
  const run = createRun(meta(1)); const copy = structuredClone(run); advance(run, null); assert.deepEqual(run, copy);
});
function toFirstCheckpoint(seed) { let run = createRun(meta(seed));
  while (currentStep(run).kind !== 'checkpoint') { const st = currentStep(run);
    run = advance(run, st.kind === 'decision' ? st.options.find(o => o.price && o.price > run.state.c)?.id ?? st.options[0].id : null); }
  return run; }
function toNumericCheckpoint() { for (let s = 1; s < 500; s++) { const run = toFirstCheckpoint(s); if (currentStep(run).built.kind === 'numeric') return run; } }
test('bad numeric input sets inputError and does not consume the checkpoint', () => {
  const run = toNumericCheckpoint(); const next = advance(run, 'abc');
  assert.equal(next.inputError, true); assert.equal(next.checkpoints.length, 0); assert.equal(currentStep(next).kind, 'checkpoint');
  const ok = advance(next, '1,000'); assert.ok(!ok.inputError); assert.equal(ok.checkpoints.length, 1);
});
test('wrong checkpoint answer → feedback step with correct=false, then the game continues', () => {
  const run = toNumericCheckpoint(); const step = currentStep(run);
  const wrong = advance(run, String(step.built.answer * 10 + 12345)); const fb = currentStep(wrong);
  assert.equal(fb.kind, 'feedback'); assert.equal(fb.correct, false);
  assert.notEqual(currentStep(advance(wrong, null)).kind, 'feedback');
});
test('price decision shows a quarter result before moving on', () => {
  let run = createRun(meta(3)); while (currentStep(run).kind !== 'decision') run = advance(run, null);
  run = advance(run, currentStep(run).options[0].id); assert.equal(currentStep(run).kind, 'quarterResult');
  assert.equal(currentStep(run).quarter.P, run.state.quarters[0].P);
});
test('invalid decision input is rejected', () => {
  let run = createRun(meta(3)); while (currentStep(run).kind !== 'decision') run = advance(run, null);
  const next = advance(run, 'nope'); assert.equal(next.inputError, true); assert.equal(currentStep(next).kind, 'decision');
});
test('bankrupt run skips openText and records checkpoints answered so far', () => {
  let run = createRun(meta(11)); let sawOpen = false;
  while (currentStep(run).kind !== 'ending') { const st = currentStep(run); if (st.kind === 'openText') sawOpen = true;
    run = advance(run, st.kind === 'decision' ? (st.options.find(o => o.price !== undefined && o.price < run.state.c) ?? st.options[0]).id
      : st.kind === 'checkpoint' ? (st.built.kind === 'mc' ? st.built.answer : String(st.built.answer)) : null); }
  assert.ok(run.state.bankrupt); assert.equal(sawOpen, false); assert.ok(run.checkpoints.length >= 1);
  assert.ok(run.checkpoints.every(c => c.correct)); assert.equal(run.score.checkpointPts, run.checkpoints.length * 5);
});
test('dashboard reports cash and stage', () => { const run = createRun(meta(3)); const d = dashboard(run);
  assert.equal(d.cash, run.params.cash0); assert.equal(d.stage, 0); assert.equal(d.quarter, 0); });
