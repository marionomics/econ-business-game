// One month of the simulation. Pure: tick(state, world) → { state, events }.
import { quantityAt } from '../economy.js';
import { productDemand, productCost, rivalShare, surplus, elasticityAt, fixedAdd } from './market.js';
import { applyDueWildcards, resolveCrises } from './wildcards.js';
import { rivalStep } from './rival.js';

export const MAX_MONTHS = 36;


function sell(p, s, world) {
  const d = productDemand(p, s, world), c = productCost(p, s, world);
  const R = s.rival.active ? s.rival.prices[p.uid] ?? null : null;
  const qAt = (P) => Math.round(quantityAt(d, P) * rivalShare(P, R, p.loyalty));
  let Q, contribution, revenue, P = p.price;
  if (p.versions) {
    const qHigh = qAt(p.versions.high), qAll = qAt(p.versions.low);
    const qLow = Math.max(0, qAll - qHigh);
    Q = qHigh + qLow; P = p.versions.low;
    revenue = p.versions.high * qHigh + p.versions.low * qLow;
  } else { Q = qAt(P); revenue = P * Q; }
  contribution = revenue - c * Q;
  const sp = surplus(d, P, c);
  const potential = quantityAt(d, P);
  return { uid: p.uid, P: p.price, versions: p.versions, Q, a: d.a, b: d.b, c, revenue, contribution,
    cs: sp.cs, ps: contribution, dwl: sp.dwl, share: potential > 0 ? Q / potential : 1, elasticity: elasticityAt(d, P), rivalPrice: R };
}

export function tick(input, world) {
  if (input.ended) return { state: input, events: [] };
  const s = structuredClone(input);
  const events = [];
  s.month += 1;
  s.monthOther = 0;

  if (s.repositioning && s.month >= s.repositioning.until) {
    s.line = s.repositioning.to; s.repositioning = null;
    for (const p of s.products) p.loyalty *= 0.5;
    events.push({ type: 'repositioned', line: s.line });
  }
  applyDueWildcards(s, world, events);
  rivalStep(s, world, events);

  const perProduct = [];
  for (const p of s.products) {
    if (!p.active) continue;
    if (s.month <= p.readyAt) { perProduct.push({ uid: p.uid, P: p.price, Q: 0, a: p.a0, b: p.b, c: productCost(p, s, world),
      revenue: 0, contribution: 0, cs: 0, ps: 0, dwl: 0, share: 0, elasticity: 0, rivalPrice: null, inDevelopment: true }); continue; }
    perProduct.push(sell(p, s, world));
  }
  const active = s.products.filter((p) => p.active);
  const revenue = perProduct.reduce((t, x) => t + x.revenue, 0);
  const contribution = perProduct.reduce((t, x) => t + x.contribution, 0);
  const fixed = s.F + fixedAdd(s) + active.reduce((t, p) => t + p.fixedMonthly, 0);
  const ads = active.reduce((t, p) => t + p.ad, 0);

  for (const p of active) {
    p.adStock = Math.round(p.adStock * world.adDecay + p.ad);
    p.loyalty = Math.min(0.8, Math.max(0, p.loyalty * (1 - world.loyaltyDecay) + p.loyaltyEff * Math.sqrt(p.ad / 10000)));
  }

  const row = { month: s.month, revenue, cogs: revenue - contribution, contribution, fixed, ads, other: 0, profit: 0, cash: 0, perProduct };
  s.history.push(row);
  row.other = s.monthOther;
  row.profit = contribution - fixed - ads - row.other;
  s.cash += row.profit;
  row.cash = s.cash;
  delete s.monthOther;

  if (s.cash < 0) { s.ended = { reason: 'bankrupt', month: s.month }; events.push({ type: 'bankrupt' }); }
  if (!s.ended && s.month >= MAX_MONTHS) { s.ended = { reason: 'end36', month: s.month }; events.push({ type: 'end36' }); }
  resolveCrises(s, events);
  return { state: s, events };
}
