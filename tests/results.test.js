import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fakeStore } from './helpers.js';
import { RESULT_COLUMNS, buildResultRow, sendResult, flushQueue, normalizeId, sanitizeCell } from '../js/results.js';
import { dequeueAll, enqueue } from '../js/storage.js';
import { playRun, BOTS } from './support/bots.js';

const run = (() => { const r = playRun(3, 'premium', BOTS.competent); r.meta = { playerId: ' A01 ', playerName: '=José', classCode: 'MICRO', runNumber: 2 }; return r; })();

test('Code.gs HEADERS equals RESULT_COLUMNS and writes to Intentos v2', () => { const src = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  const m = src.match(/const HEADERS = (\[[\s\S]*?\]);/); assert.deepEqual(JSON.parse(m[1].replace(/'/g, '"')), RESULT_COLUMNS);
  assert.match(src, /'Intentos v2'/); assert.match(src, /'Mejor intento v2'/); assert.match(src, /asText_\(/); });
test('row has every column, sanitized and normalized', () => { const row = buildResultRow(run, ['ipo_premium', 'comprada']);
  assert.deepEqual(Object.keys(row), RESULT_COLUMNS); assert.equal(row.playerId, 'a01'); assert.equal(row.playerName, "'=José");
  assert.equal(row.total, run.score.total); assert.equal(row.galleryCount, 2); assert.equal(row.line, 'premium');
  assert.ok(row.log.length < 50000); JSON.parse(row.log); });
test('normalizeId and sanitizeCell', () => { assert.equal(normalizeId('  José  Pérez '), 'jose perez'); assert.equal(sanitizeCell('+1'), "'+1"); });
test('empty URL → queued', async () => { const s = fakeStore(); assert.equal(await sendResult('', { runId: 'x' }, { store: s }), 'queued'); assert.equal(dequeueAll(s).length, 1); });
test('queue-first: a hanging send keeps the row; flush resends and removes on success', async () => {
  const s = fakeStore(); sendResult('https://x', { runId: 'h' }, { fetchImpl: () => new Promise(() => {}), store: s });
  await new Promise((r) => setTimeout(r, 5)); const ok = []; 
  assert.equal(await flushQueue('https://x', { fetchImpl: (u, o) => { ok.push(JSON.parse(o.body).runId); return Promise.resolve({}); }, store: s }), 1);
  assert.deepEqual(ok, ['h']); assert.deepEqual(dequeueAll(s), []); });
test('send uses text/plain no-cors POST', async () => { let seen;
  await sendResult('https://x', { runId: 'z' }, { fetchImpl: (u, o) => { seen = o; return Promise.resolve({}); }, store: fakeStore() });
  assert.equal(seen.method, 'POST'); assert.equal(seen.mode, 'no-cors'); assert.match(seen.headers['Content-Type'], /text\/plain/); });
