import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fakeStore } from './helpers.js';
import { RESULT_COLUMNS, buildResultRow, sendResult, flushQueue, normalizeId } from '../js/results.js';
import { dequeueAll, enqueue } from '../js/storage.js';
import { createRun, currentStep, advance } from '../js/game.js';

function finishedRun() { let run = createRun({ seed: 21, playerId: ' A01 ', playerName: 'José Pérez', firmName: 'Café', classCode: 'MICRO', runNumber: 3 });
  while (currentStep(run).kind !== 'ending') { const st = currentStep(run);
    run = advance(run, st.kind === 'decision' ? st.options[0].id : st.kind === 'checkpoint' ? (st.built.kind === 'mc' ? st.built.options[0].id : '1') : st.kind === 'openText' ? 'hola' : null); }
  return run; }
const run = finishedRun();

test('Code.gs HEADERS equals RESULT_COLUMNS', () => { const src = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  const m = src.match(/const HEADERS = (\[[\s\S]*?\]);/); assert.ok(m, 'HEADERS not found');
  assert.deepEqual(JSON.parse(m[1].replace(/'/g, '"').replace(/,\s*\]/, ']')), RESULT_COLUMNS); });
test('row has every column and nothing else', () => { const row = buildResultRow(run, ['boutique']);
  assert.deepEqual(Object.keys(row), RESULT_COLUMNS);
  assert.equal(row.runId, run.runId); assert.equal(row.playerId, 'a01'); assert.equal(row.total, run.score.total);
  assert.equal(row.galleryCount, 1); assert.equal(typeof row.decisionLog, 'string'); JSON.parse(row.decisionLog);
  assert.equal(row.checkpointItems.split(',').length, run.checkpoints.length); });
test('normalizeId', () => { assert.equal(normalizeId('  José  Pérez '), 'jose perez'); assert.equal(normalizeId('A01'), 'a01'); });
test('empty URL → queued', async () => { const s = fakeStore();
  assert.equal(await sendResult('', { runId: 'x' }, { store: s }), 'queued'); assert.equal(dequeueAll(s).length, 1); });
test('fetch rejects → queued; flushQueue resends and empties queue', async () => { const s = fakeStore();
  const failing = () => Promise.reject(new Error('offline'));
  assert.equal(await sendResult('https://x', { runId: 'r1' }, { fetchImpl: failing, store: s }), 'queued');
  const sent = []; const ok = (url, opts) => { sent.push(JSON.parse(opts.body)); return Promise.resolve({}); };
  assert.equal(await flushQueue('https://x', { fetchImpl: ok, store: s }), 1);
  assert.deepEqual(sent.map(r => r.runId), ['r1']); assert.deepEqual(dequeueAll(s), []); });
test('flushQueue re-queues failures', async () => { const s = fakeStore(); enqueue({ runId: 'a' }, s);
  assert.equal(await flushQueue('https://x', { fetchImpl: () => Promise.reject(new Error('x')), store: s }), 0);
  assert.deepEqual(dequeueAll(s).map(r => r.runId), ['a']); });
test('send uses text/plain no-cors POST', async () => { let seen;
  await sendResult('https://x', { runId: 'z' }, { fetchImpl: (u, o) => { seen = o; return Promise.resolve({}); }, store: fakeStore() });
  assert.equal(seen.method, 'POST'); assert.equal(seen.mode, 'no-cors'); assert.match(seen.headers['Content-Type'], /text\/plain/); });
test('text cells that look like formulas are neutralized', async () => {
  const { sanitizeCell } = await import('../js/results.js');
  for (const s of ['=HYPERLINK("x")', '+1', '-cmd', '@SUM(A1)', '\tx']) assert.equal(sanitizeCell(s), "'" + s);
  assert.equal(sanitizeCell('Ana'), 'Ana'); assert.equal(sanitizeCell(-3000), -3000);
  let r = createRun({ seed: 3, playerId: 'x', playerName: '=1+1', firmName: 'F', classCode: 'C', runNumber: 1 });
  while (currentStep(r).kind !== 'ending') { const st = currentStep(r); r = advance(r, st.kind === 'decision' ? st.options[0].id : st.kind === 'checkpoint' ? (st.built.kind === 'mc' ? st.built.options[0].id : '1') : '@evil'); }
  const row = buildResultRow(r, []); assert.equal(row.playerName, "'=1+1");
  if (r.openText) assert.equal(row.openText, "'@evil");
  assert.match(readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), /function sanitize_/);
});
