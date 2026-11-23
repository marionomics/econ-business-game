// Tests added for the final review findings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { T } from '../js/content.js';
import { gameType } from '../js/rival.js';
import { generateParams } from '../js/params.js';
import { SCRIPT, initialState, decisionOptions, resolveDecision, decisionApplies, stage3Matrix } from '../js/engine.js';
import { gradeCheckpoint, parseNumberCandidates } from '../js/checkpoints.js';
import { sendResult, flushQueue } from '../js/results.js';
import { dequeueAll, enqueue } from '../js/storage.js';
import { acceptClick } from '../js/clickguard.js';
import { fakeStore } from './helpers.js';

test('below-optimum quarter comment does not claim inelastic demand', () =>
  assert.doesNotMatch(T['qr.precio.bajo'], /inel[aá]stica/));

test('dilema requires L dominant for both; asymmetric case is otro', () => {
  const m = { HH: [23852, 16996], HL: [4916, 16129], LH: [36041, 2268], LL: [15540, 4260] };
  assert.equal(gameType(m), 'otro');
});
test('dominante_H requires H dominant for both', () => {
  const m = { HH: [100, 100], HL: [60, 120], LH: [90, 10], LL: [50, 50] }; // rival prefers L when I play H
  assert.notEqual(gameType(m), 'dominante_H');
});

test('no reachable Stage 3 matrix has payoff ties within a player\'s best-response comparison', () => {
  const ids = SCRIPT.filter(e => e.kind === 'decision').map(e => e.id);
  for (let s = 1; s <= 25; s++) { const p = generateParams(s * 7 + 1);
    const walk = (st, i) => { if (st.bankrupt || i >= ids.length) return; const id = ids[i];
      if (!decisionApplies(st, id, p)) return walk(st, i + 1);
      if (id.startsWith('s3_ronda') || id === 's4_oferta') { const m = stage3Matrix(st, p);
        assert.notEqual(m.HH[0], m.LH[0], `seed ${p.seed}`); assert.notEqual(m.HL[0], m.LL[0], `seed ${p.seed}`);
        assert.notEqual(m.HH[1], m.HL[1], `seed ${p.seed}`); assert.notEqual(m.LH[1], m.LL[1], `seed ${p.seed}`);
        if (id !== 's3_ronda_1') return; }
      for (const o of decisionOptions(st, id, p)) walk(resolveDecision(st, id, o.id, p), i + 1); };
    walk(initialState(p), 0); }
});

test('elasticity answers accept the signed convention', () => {
  for (const itemId of ['elast_arco', 'markup_eps']) assert.ok(gradeCheckpoint({ kind: 'numeric', itemId, answer: 1.5 }, -1.5));
  assert.ok(!gradeCheckpoint({ kind: 'numeric', itemId: 'utilidad_total', answer: 1500 }, -1500));
});
test('ambiguous single-separator numbers are graded under either reading', () => {
  assert.deepEqual(parseNumberCandidates('1.250').sort((a, b) => a - b), [1.25, 1250]);
  assert.deepEqual(parseNumberCandidates('1,250').sort((a, b) => a - b), [1.25, 1250]);
  assert.deepEqual(parseNumberCandidates('12.5'), [12.5]);
  assert.ok(gradeCheckpoint({ kind: 'numeric', answer: 1250 }, parseNumberCandidates('1.250')));
  assert.ok(gradeCheckpoint({ kind: 'numeric', answer: 1.25 }, parseNumberCandidates('1,250')));
  assert.deepEqual(parseNumberCandidates('abc'), []);
});

test('sendResult queues the row before posting (a hanging fetch loses nothing)', async () => {
  const s = fakeStore(); sendResult('https://x', { runId: 'h' }, { fetchImpl: () => new Promise(() => {}), store: s });
  await new Promise(r => setTimeout(r, 10)); assert.deepEqual(dequeueAll(s).map(r => r.runId), ['h']);
});
test('sendResult removes the row from the queue once the post resolves', async () => {
  const s = fakeStore(); assert.equal(await sendResult('https://x', { runId: 'ok' }, { fetchImpl: () => Promise.resolve({}), store: s }), 'sent');
  assert.deepEqual(dequeueAll(s), []);
});
test('flushQueue does not empty the queue before sending', async () => {
  const s = fakeStore(); enqueue({ runId: 'a' }, s); enqueue({ runId: 'b' }, s);
  flushQueue('https://x', { fetchImpl: () => new Promise(() => {}), store: s });
  await new Promise(r => setTimeout(r, 10)); assert.deepEqual(dequeueAll(s).map(r => r.runId), ['a', 'b']);
});

test('double-clicks and clicks right after a render are ignored', () => {
  assert.equal(acceptClick({ detail: 2 }, 1000, 0), false);
  assert.equal(acceptClick({ detail: 1 }, 100, 0), false);
  assert.equal(acceptClick({ detail: 1 }, 1000, 0), true);
  assert.equal(acceptClick({ detail: 0 }, 1000, 0), true); // keyboard activation
});

test('Code.gs writes student IDs as text', () =>
  assert.match(readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), /playerId[^\n]*'\\''|asText_\(/));
