// All per-run numbers, derived from one seed. "unit" = m·Q0 is the scale of quarterly money.
import { createRng } from './rng.js';
import { RIVAL_NAMES } from './content.js';


const k = (x) => Math.max(1000, Math.round(x / 1000) * 1000);

export const TUNING = {
  F: 0.3, cash0: 0.75, ipoCash: 1.2,
  shockFixed: 0.1, shockMarginal: 8,
  roasterCost: 0.65, roasterDF: 0.05, roasterDc: 8,
  brandCost: 0.45, brandDa: 16, brandDLoyal: 0.16,
  loyaltyCost: 0.35, loyaltyDLoyal: 0.2,
  blockCost: 0.35, blockDLoyal: 0.1,
  marketN: 2.5, loyalBase: [0.17, 0.21, 0.27, 0.31], priceDrivenShare: 1 / 3,
};

export function generateParams(seed) {
  const r = createRng(seed);
  const t = TUNING;
  const c = 2 * r.int(10, 20);
  const m = 8 * r.int(5, 8);
  const Q0 = 4 * r.int(200, 400);
  const unit = m * Q0;
  const shockType = r.pick(['fijo', 'marginal']);
  return {
    seed,
    demand: { a: c + m, b: m / (2 * Q0) },
    c,
    F: k(t.F * unit),
    cash0: k(t.cash0 * unit),
    shock: { type: shockType, amount: shockType === 'fijo' ? k(t.shockFixed * unit) : t.shockMarginal },
    roaster: { cost: k(t.roasterCost * unit), dF: k(t.roasterDF * unit), dc: t.roasterDc },
    brand: { cost: k(t.brandCost * unit), da: t.brandDa, dLoyal: t.brandDLoyal },
    loyalty: { cost: k(t.loyaltyCost * unit), dLoyal: t.loyaltyDLoyal },
    block: { cost: k(t.blockCost * unit), dLoyal: t.blockDLoyal },
    rival: { name: r.pick(RIVAL_NAMES), rule: r.pick(['tit_for_tat', 'grim', 'best_response']) },
    segments: { N: t.marketN * Q0, loyalBase: r.pick(t.loyalBase), priceDrivenShare: t.priceDrivenShare },
    ipoCash: k(t.ipoCash * unit),
  };
}
