// Per-run world: every number the simulation needs, derived from (seed, line). Pure.
import { createRng, deriveSeed } from '../rng.js';
import { scheduleWildcards } from './wildcards.js';

// Monthly units. Demand per product: P = a − b·Q (boxes per month). a0 + cProd must be even.
export const TEMPLATES = {
  premium: [
    { id: 'premium_mantequilla', segment: 'premium', a0: 160, b: 0.05, cProd: 40, fixedMonthly: 8000, launchCost: 120000, devMonths: 2, adEff: 0.045, loyaltyEff: 0.05 },
    { id: 'premium_chocolate', segment: 'premium', a0: 200, b: 0.08, cProd: 60, fixedMonthly: 9000, launchCost: 150000, devMonths: 2, adEff: 0.045, loyaltyEff: 0.05 },
    { id: 'premium_avena', segment: 'premium', a0: 140, b: 0.045, cProd: 36, fixedMonthly: 7000, launchCost: 100000, devMonths: 2, adEff: 0.04, loyaltyEff: 0.05 },
  ],
  generico: [
    { id: 'generico_clasica', segment: 'generico', a0: 50, b: 0.0015, cProd: 26, fixedMonthly: 8000, launchCost: 70000, devMonths: 1, adEff: 0.015, loyaltyEff: 0.015 },
    { id: 'generico_chispas', segment: 'generico', a0: 56, b: 0.0016, cProd: 30, fixedMonthly: 8000, launchCost: 80000, devMonths: 1, adEff: 0.015, loyaltyEff: 0.015 },
    { id: 'generico_surtido', segment: 'generico', a0: 46, b: 0.0014, cProd: 22, fixedMonthly: 7000, launchCost: 60000, devMonths: 1, adEff: 0.015, loyaltyEff: 0.015 },
  ],
};

// All numeric knobs in one place (tuned by the balance tests).
export const TUNING = {
  premium: { startCash: 260000, F: 45000, expandCost: 250000, expandDF: 15000, expandDc: 6, maxExpansions: 2,
    baseMultiple: 10, ipoTarget: 12000000, tariff: 8, rent: 15000 },
  generico: { startCash: 220000, F: 45000, expandCost: 220000, expandDF: 15000, expandDc: 2, maxExpansions: 2,
    baseMultiple: 7, ipoTarget: 12000000, tariff: 4, rent: 15000 },
  saturation: 0.75, adDecay: 0.6, loyaltyDecay: 0.02, rivalCostFactor: 1,
  versionsCost: 60000, versionsUnlockMonth: 12, repositionCost: 200000, repositionMonths: 3,
  regulator: { shareThreshold: 0.6, markupThreshold: 0.55, watchMonths: 4, deadlineMonths: 4, fine: 150000 },
  aJitter: [-4, -2, 0, 2, 4], bJitter: [0.9, 1, 1.1],
};

export function makeWorld(seed, line) {
  if (!TEMPLATES[line]) throw new Error(`unknown line ${line}`);
  const t = TUNING, L = t[line];
  const r = createRng(deriveSeed(seed, 'world'));
  const templates = TEMPLATES[line].map((tp) => ({ ...tp, a0: tp.a0 + r.pick(t.aJitter), b: Math.round(tp.b * r.pick(t.bJitter) * 1e6) / 1e6 }));
  return {
    seed, line,
    startCash: L.startCash,
    plant: { F: L.F, expandCost: L.expandCost, expandDF: L.expandDF, expandDc: L.expandDc, maxExpansions: L.maxExpansions },
    templates, allTemplates: { premium: TEMPLATES.premium, generico: TEMPLATES.generico },
    saturation: t.saturation, adDecay: t.adDecay, loyaltyDecay: t.loyaltyDecay,
    rival: { arrivalMonth: r.int(12, 18), rule: r.pick(['undercut', 'match', 'best_response']), costFactor: t.rivalCostFactor },
    wildcards: scheduleWildcards(createRng(deriveSeed(seed, 'wildcards')), line),
    ipoTarget: L.ipoTarget, baseMultiple: L.baseMultiple, tariff: L.tariff, rent: L.rent,
    versionsCost: t.versionsCost, versionsUnlockMonth: t.versionsUnlockMonth,
    reposition: { cost: t.repositionCost, months: t.repositionMonths },
    regulator: { ...t.regulator },
  };
}
