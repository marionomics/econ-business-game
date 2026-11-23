// Grade of one run (spec §5 + anti-exploit rules). Pure.
export function scoreRun(run) {
  const { state, world } = run;
  const valuationPts = 50 * Math.min(1, state.bestSustained / world.ipoTarget);
  const occurred = state.crises.length, survived = state.crises.filter((c) => c.survived === true).length;
  const crisesPts = 30 * survived / Math.max(occurred, 3) * (occurred > 0 ? 1 : 0);
  const asked = (run.questions ?? []).filter((q) => q.answered).length;
  const correct = (run.questions ?? []).filter((q) => q.correct).length;
  const questionsPts = 20 * correct / Math.max(asked, 6);
  const total = Math.round((valuationPts + crisesPts + questionsPts) * 10) / 10;
  return { valuationPts, crisesPts, questionsPts, total, bestSustained: state.bestSustained,
    crises: { occurred, survived }, questions: { asked, correct } };
}
