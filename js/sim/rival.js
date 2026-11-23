// The rival: arrives once, then prices each of your products by its rule. Pure helpers + a tick step.
import { quantityAt } from '../economy.js';
import { productDemand, rivalShare, costAdd } from './market.js';
import { openCrisis } from './wildcards.js';

export const rivalCost = (p, s, w) => Math.round((p.cProd + costAdd(s)) * w.rival.costFactor);
const myPrice = (p) => (p.versions ? p.versions.low : p.price);

export function rivalProfitAt(p, s, w, R) {
  const d = productDemand(p, s, w);
  const q = quantityAt(d, R) * (1 - rivalShare(myPrice(p), R, p.loyalty));
  return (R - rivalCost(p, s, w)) * q;
}

export function rivalPrice(p, s, w) {
  const cR = rivalCost(p, s, w), P = myPrice(p);
  if (w.rival.rule === 'match') return Math.max(cR + 1, P);
  if (w.rival.rule === 'undercut') return Math.max(cR + 1, Math.round(0.92 * P));
  let best = cR + 1, bestPi = -Infinity;
  for (let R = cR + 1; R <= Math.max(cR + 1, P + 10); R++) { const pi = rivalProfitAt(p, s, w, R); if (pi > bestPi) { bestPi = pi; best = R; } }
  return best;
}

export function rivalStep(s, w, events) {
  if (!s.rival.active && s.month === w.rival.arrivalMonth) {
    const act = s.products.filter((p) => p.active);
    s.rival.active = true; s.rival.since = s.month;
    s.rival.avgPriceAtArrival = act.length ? act.reduce((t, p) => t + myPrice(p), 0) / act.length : null;
    events.push({ type: 'rivalArrives', rule: w.rival.rule });
    openCrisis(s, 'rival');
  }
  if (!s.rival.active) return;
  s.rival.prices = {};
  for (const p of s.products.filter((x) => x.active)) s.rival.prices[p.uid] = rivalPrice(p, s, w);
}
