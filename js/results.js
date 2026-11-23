// One Sheet row per finished run, and a send queue that survives being offline.
import { enqueue, dequeueAll } from './storage.js';
import { endingType } from './endings.js';
import { STAGE_OF } from './engine.js';

export const RESULT_COLUMNS = ['runId', 'timestamp', 'classCode', 'playerId', 'playerName', 'runNumber', 'seed', 'outcome',
  'endingId', 'stageReached', 'quarterReached', 'checkpointItems', 'checkpointCorrect', 'checkpointPts', 'outcomePts',
  'firmValue', 'benchmarkValue', 'valuePts', 'total', 'openText', 'galleryCount', 'decisionLog'];

export const normalizeId = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .trim().toLowerCase().replace(/\s+/g, ' ');

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
  return Object.fromEntries(RESULT_COLUMNS.map((k) => [k, row[k]]));
}

async function post(url, row, fetchImpl) {
  await fetchImpl(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(row) });
}

export async function sendResult(url, row, { fetchImpl = globalThis.fetch, store } = {}) {
  if (!url) { enqueue(row, store); return 'queued'; }
  try { await post(url, row, fetchImpl); return 'sent'; } catch { enqueue(row, store); return 'queued'; }
}

export async function flushQueue(url, { fetchImpl = globalThis.fetch, store } = {}) {
  if (!url) return 0;
  const rows = dequeueAll(store); let sent = 0;
  for (const row of rows) {
    try { await post(url, row, fetchImpl); sent++; } catch { enqueue(row, store); }
  }
  return sent;
}
