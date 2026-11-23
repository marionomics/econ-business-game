// One Sheet row per finished run, and a send queue that survives being offline.
import { enqueue, peekQueue, removeFromQueue } from './storage.js';
import { endingType } from './endings.js';
import { STAGE_OF } from './engine.js';

export const RESULT_COLUMNS = ['runId', 'timestamp', 'classCode', 'playerId', 'playerName', 'runNumber', 'seed', 'outcome',
  'endingId', 'stageReached', 'quarterReached', 'checkpointItems', 'checkpointCorrect', 'checkpointPts', 'outcomePts',
  'firmValue', 'benchmarkValue', 'valuePts', 'total', 'openText', 'galleryCount', 'decisionLog'];

export const normalizeId = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .trim().toLowerCase().replace(/\s+/g, ' ');

// A cell starting with = + - @ (or tab/CR) would be read by Sheets as a formula.
export const sanitizeCell = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? "'" + v : v);

export function buildResultRow(run, gallery = []) {
  const st = run.state;
  const lastDecision = Object.keys(run.choices).pop();
  const row = {
    runId: run.runId, timestamp: new Date().toISOString(), classCode: run.meta.classCode,
    playerId: normalizeId(run.meta.playerId), playerName: run.meta.playerName, runNumber: run.meta.runNumber,
    seed: run.seed, outcome: endingType(run.ending), endingId: run.ending,
    stageReached: st.bankrupt ? STAGE_OF(st.bankruptAt) : 4, quarterReached: st.quarters.length,
    checkpointItems: run.checkpoints.map((c) => c.itemId).join(','),
    checkpointCorrect: run.checkpoints.map((c) => (c.correct ? 1 : 0)).join(','),
    checkpointPts: run.score.checkpointPts, outcomePts: run.score.outcomePts,
    firmValue: Math.round(run.finalValue ?? 0), benchmarkValue: Math.round(run.benchmark ?? 0),
    valuePts: Math.round(run.score.valuePts * 10) / 10, total: run.score.total,
    openText: run.openText ?? '', galleryCount: gallery.length,
    decisionLog: JSON.stringify({ choices: run.choices, quarters: st.quarters, checkpoints: run.checkpoints, lastDecision }),
  };
  return Object.fromEntries(RESULT_COLUMNS.map((k) => [k, sanitizeCell(row[k])]));
}

async function post(url, row, fetchImpl) {
  await fetchImpl(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(row) });
}

// The row is queued BEFORE posting and removed only after the post resolves, so closing the tab
// or a hanging network never loses it. The Apps Script drops duplicate runIds.
export async function sendResult(url, row, { fetchImpl = globalThis.fetch, store } = {}) {
  if (!peekQueue(store).some((r) => r.runId === row.runId)) enqueue(row, store);
  if (!url) return 'queued';
  try { await post(url, row, fetchImpl); removeFromQueue(row.runId, store); return 'sent'; } catch { return 'queued'; }
}

export async function flushQueue(url, { fetchImpl = globalThis.fetch, store } = {}) {
  if (!url) return 0;
  let sent = 0;
  for (const row of peekQueue(store)) {
    try { await post(url, row, fetchImpl); removeFromQueue(row.runId, store); sent++; } catch { /* stays queued */ }
  }
  return sent;
}
