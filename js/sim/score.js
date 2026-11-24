// Grade of one run (spec §5 + anti-exploit rules). Pure.
import { ipoTargetOf } from './valuation.js';

export function scoreRun(run) {
  const { state, world } = run;
  const valuationPts = 50 * Math.min(1, state.bestSustained / ipoTargetOf(state, world));
  const occurred = state.crises.length, survived = state.crises.filter((c) => c.survived === true).length;
  const asked = (run.questions ?? []).filter((q) => q.answered).length;
  const correct = (run.questions ?? []).filter((q) => q.correct).length;
  // Floors (3 crises, 6 questions) stop early-bankruptcy exploits; an IPO run is graded on what it faced.
  const ipo = state.ended?.reason === 'ipo';
  const crisesPts = occurred === 0 ? (ipo ? 30 : 0) : 30 * survived / (ipo ? occurred : Math.max(occurred, 3));
  const questionsPts = asked === 0 ? (ipo ? 20 : 0) : 20 * correct / (ipo ? asked : Math.max(asked, 6));
  const total = Math.round((valuationPts + crisesPts + questionsPts) * 10) / 10;
  return { valuationPts, crisesPts, questionsPts, total, bestSustained: state.bestSustained,
    crises: { occurred, survived }, questions: { asked, correct } };
}
