// One Sheet row per finished run, and a send queue that survives being offline.
import { enqueue, peekQueue, removeFromQueue } from './storage.js';
import { classifyEnding } from './sim/endings.js';
import { ipoTargetOf } from './sim/valuation.js';

export const RESULT_COLUMNS = ['runId', 'timestamp', 'classCode', 'playerId', 'playerName', 'runNumber', 'seed', 'line', 'endingId',
  'monthReached', 'bestSustained', 'ipoTarget', 'valuationPts', 'crisesOccurred', 'crisesSurvived', 'crisesPts', 'questionsAsked',
  'questionsCorrect', 'questionsPts', 'total', 'galleryCount', 'log'];

export const normalizeId = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .trim().toLowerCase().replace(/\s+/g, ' ');

// A cell starting with = + - @ (or tab/CR) would be read by Sheets as a formula.
export const sanitizeCell = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? "'" + v : v);

const r1 = (x) => Math.round(x * 10) / 10;
export function buildResultRow(run, gallery = []) {
  const sc = run.score, st = run.state, m = run.meta ?? {};
  const row = {
    runId: run.runId, timestamp: new Date().toISOString(), classCode: m.classCode, playerId: normalizeId(m.playerId),
    playerName: m.playerName, runNumber: m.runNumber, seed: run.seed, line: run.line, endingId: classifyEnding(st),
    monthReached: st.month, bestSustained: Math.round(st.bestSustained), ipoTarget: ipoTargetOf(st, run.world),
    valuationPts: r1(sc.valuationPts), crisesOccurred: sc.crises.occurred, crisesSurvived: sc.crises.survived, crisesPts: r1(sc.crisesPts),
    questionsAsked: sc.questions.asked, questionsCorrect: sc.questions.correct, questionsPts: r1(sc.questionsPts), total: sc.total,
    galleryCount: gallery.length, log: JSON.stringify(run.log).slice(0, 49000),
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
