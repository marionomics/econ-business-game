// Grading (spec §6) and the exhaustive-search benchmark.
import { SCRIPT, initialState, decisionOptions, resolveDecision, decisionApplies } from './engine.js';
import { classifyEnding, endingType } from './endings.js';

export const OUTCOME_POINTS = { ipo: 40, honorable: 20, quiebra: 0 };
export const CHECKPOINT_PTS_EACH = 5;
export const CHECKPOINTS_PER_RUN = 8;
export const VALUE_PTS = 20;
export const PROFIT_MULTIPLE = 8;

export function firmValue(state) {
  const last = state.quarters.slice(-2).map((q) => q.profit);
  const mean = last.length ? last.reduce((s, x) => s + x, 0) / last.length : 0;
  return state.cash + PROFIT_MULTIPLE * mean;
}

const DECISIONS = SCRIPT.filter((e) => e.kind === 'decision').map((e) => e.id);

export function explore(params, visit) {
  const walk = (state, i) => {
    while (i < DECISIONS.length && !decisionApplies(state, DECISIONS[i], params)) {
      if (state.bankrupt) break;
      i++;
    }
    if (state.bankrupt || i >= DECISIONS.length) { visit(state, classifyEnding(state, params)); return; }
    const id = DECISIONS[i];
    for (const o of decisionOptions(state, id, params)) walk(resolveDecision(state, id, o.id, params), i + 1);
  };
  walk(initialState(params), 0);
}

export function benchmarkValue(params) {
  let best = -Infinity;
  explore(params, (st) => { if (!st.bankrupt) best = Math.max(best, firmValue(st)); });
  return best;
}

export function reachableEndings(params) {
  const set = new Set();
  explore(params, (_, ending) => set.add(ending));
  return set;
}

export function scoreRun({ ending, state, checkpoints }, benchmark) {
  const type = endingType(ending);
  const outcomePts = OUTCOME_POINTS[type];
  const checkpointPts = checkpoints.filter((c) => c.correct).length * CHECKPOINT_PTS_EACH;
  let valuePts = 0;
  if (type !== 'quiebra') {
    const v = firmValue(state);
    if (benchmark <= 0) valuePts = VALUE_PTS;
    else valuePts = v <= 0 ? 0 : VALUE_PTS * Math.min(1, v / benchmark);
  }
  const total = Math.round((outcomePts + checkpointPts + valuePts) * 10) / 10;
  return { outcomePts, checkpointPts, valuePts, total };
}
