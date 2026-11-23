// Demand, cost, rival split and surplus for each product. Pure.
import { quantityAt } from '../economy.js';

const activeNow = (s) => (e) => e.until === undefined || e.until > s.month;

// Multiplier on demand from active wildcard effects (segment, 'all', or one product uid).
export function demandMult(state, product) {
  return (state.effects ?? []).filter(activeNow(state)).filter((e) => e.kind === 'demand')
    .filter((e) => e.segment === 'all' || e.segment === product.segment || e.uid === product.uid)
    .reduce((m, e) => m * e.mult, 1);
}
export const costAdd = (state) => (state.effects ?? []).filter(activeNow(state)).filter((e) => e.kind === 'cost').reduce((s, e) => s + e.add, 0);
export const fixedAdd = (state) => (state.effects ?? []).filter(activeNow(state)).filter((e) => e.kind === 'fixed').reduce((s, e) => s + e.add, 0);

export function productDemand(product, state, world) {
  const same = state.products.filter((p) => p.active && p.segment === product.segment);
  const rank = Math.max(0, same.findIndex((p) => p.uid === product.uid));
  // Advertising lifts demand with diminishing returns, up to +adMax.
  const ad = 1 + product.adMax * (1 - Math.exp(-Math.max(0, product.adStock) / product.adScale));
  const a = Math.round(product.a0 * world.saturation ** rank * demandMult(state, product) * ad);
  return { a, b: product.b };
}

export const productCost = (product, state, world) =>
  product.cProd - (state.expansions ?? 0) * world.plant.expandDc + costAdd(state);

const sigma = (x) => 1 / (1 + Math.exp(-x));
// Your share of a product's demand when the rival charges R. reach = share of customers the rival can reach at all.
export function rivalShare(P, R, loyalty, reach = 1) {
  if (R === null || R === undefined) return 1;
  return 1 - reach * (1 - loyalty) * (1 - sigma((R - P) / (0.1 * R)));
}

export function quantityAtPrice(product, state, world, P) {
  const d = productDemand(product, state, world);
  const R = state.rival?.active ? state.rival.prices?.[product.uid] ?? null : null;
  return Math.round(quantityAt(d, P) * rivalShare(P, R, product.loyalty, world.rival?.reach ?? 1));
}
export const quantity = (product, state, world) => quantityAtPrice(product, state, world, product.price);

export function surplus({ a, b }, P, c) {
  const Q = quantityAt({ a, b }, P), qEff = quantityAt({ a, b }, c);
  return { Q, qEff, cs: 0.5 * Q * Math.max(0, a - P), ps: (P - c) * Q, dwl: 0.5 * Math.abs(qEff - Q) * Math.abs(P - c) };
}

export const elasticityAt = ({ a }, P) => P / (a - P);
