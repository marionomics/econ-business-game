// The run's decision script and the deterministic simulation of each decision.
import { createRng, deriveSeed } from './rng.js';
import { quantityAt, profit, optimalPrice } from './economy.js';
import { payoffMatrix, myQuantity, rivalMove } from './rival.js';
import { classifyEnding } from './endings.js';

const D = (id) => ({ kind: 'decision', id });
const CP = (slot) => ({ kind: 'checkpoint', slot });
const N = (id) => ({ kind: 'narration', id });

export const SCRIPT = [
  N('intro'),
  D('s1_precio_1'), CP('s1'), D('s1_precio_2'), CP('s1'), CP('s1'),
  N('s2_intro'), D('s2_inversion'), N('s2_choque'), CP('s2'),
  D('s2_precio_1'), CP('s2'), D('s2_precio_2'), CP('s2'),
  N('s3_rival'), D('s3_movida'), CP('s3'),
  D('s3_ronda_1'), CP('s3'), D('s3_ronda_2'), D('s3_ronda_3'),
  D('s4_oferta'),
  { kind: 'openText' },
];

export const STAGE_OF = (id) => Number(String(id).match(/^s(\d)/)?.[1] ?? 0);

export function initialState(params) {
  return {
    cash: params.cash0, demand: { ...params.demand }, c: params.c, F: params.F,
    cRival: params.c, FRival: params.F, loyalShare: params.segments.loyalBase,
    quarters: [], investment: null, move: null, rounds: [], offer: null,
    bankrupt: false, bankruptAt: null,
  };
}

const isPriceDecision = (id) => /^s[12]_precio_/.test(id);

export function isIpoEligible(state, params) {
  const q = state.quarters;
  return !state.bankrupt && state.cash >= params.ipoCash && q.length >= 2 &&
    q[q.length - 1].profit > 0 && q[q.length - 2].profit > 0;
}

export function decisionApplies(state, id, params) {
  if (state.bankrupt) return false;
  if (id === 's4_oferta') return state.move !== 'bloquear' && !isIpoEligible(state, params);
  return true;
}

export function stage3Prices(state) {
  const H = optimalPrice({ a: state.demand.a, c: state.cRival });
  const L = state.cRival + Math.round(0.4 * (H - state.cRival));
  return { H, L };
}

export function stage3Segments(state, params) {
  const scale = (state.demand.a - params.c) / (params.demand.a - params.c);
  return { N: Math.round(params.segments.N * scale), loyalShare: state.loyalShare,
    priceDrivenShare: params.segments.priceDrivenShare };
}

export function stage3Matrix(state, params) {
  return payoffMatrix(stage3Segments(state, params), stage3Prices(state), state.c, state.F, state.cRival, state.FRival);
}

export function priceGrid(state) {
  const g = (state.demand.a - state.c) / 8;
  const star = optimalPrice({ a: state.demand.a, c: state.c });
  return (j) => star + j * g;
}

export function decisionOptions(state, id, params) {
  if (isPriceDecision(id)) {
    const rng = createRng(deriveSeed(params.seed, id));
    const grid = priceGrid(state);
    const others = rng.shuffle([-2, -1, 1, 2, 3]).slice(0, 2);
    return rng.shuffle([0, -5, ...others]).map((j) => ({ id: 'p' + grid(j), kind: 'precio', price: grid(j) }));
  }
  const ids = {
    s2_inversion: ['ninguna', 'tostadora', 'marca', 'ambas'],
    s3_movida: ['nada', 'lealtad', 'bloquear'],
    s4_oferta: ['aceptar', 'seguir'],
  }[id] ?? (id.startsWith('s3_ronda') ? ['H', 'L'] : null);
  if (!ids) throw new Error(`unknown decision ${id}`);
  return ids.map((x) => ({ id: x, kind: 'opcion' }));
}

const markBankrupt = (st, id) => (st.cash < 0 ? { ...st, bankrupt: true, bankruptAt: id } : st);

export function resolveDecision(state, id, optionId, params) {
  const st = structuredClone(state);
  if (isPriceDecision(id)) {
    const P = Number(optionId.slice(1));
    const Q = quantityAt(st.demand, P);
    const pr = profit({ P, Q, c: st.c, F: st.F });
    st.cash += pr;
    st.quarters.push({ id, P, Q, c: st.c, F: st.F, profit: pr, cash: st.cash });
    return markBankrupt(st, id);
  }
  if (id === 's2_inversion') {
    st.investment = optionId;
    if (optionId === 'tostadora' || optionId === 'ambas') {
      st.cash -= params.roaster.cost; st.F += params.roaster.dF; st.c -= params.roaster.dc;
    }
    if (optionId === 'marca' || optionId === 'ambas') {
      st.cash -= params.brand.cost; st.demand.a += params.brand.da; st.loyalShare += params.brand.dLoyal;
    }
    if (params.shock.type === 'fijo') { st.F += params.shock.amount; st.FRival += params.shock.amount; }
    else { st.c += params.shock.amount; st.cRival += params.shock.amount; }
    return markBankrupt(st, id);
  }
  if (id === 's3_movida') {
    st.move = optionId;
    if (optionId === 'lealtad') { st.cash -= params.loyalty.cost; st.loyalShare += params.loyalty.dLoyal; }
    if (optionId === 'bloquear') { st.cash -= params.block.cost; st.loyalShare += params.block.dLoyal; }
    return markBankrupt(st, id);
  }
  if (id.startsWith('s3_ronda')) {
    const m = stage3Matrix(st, params);
    const rival = rivalMove(params.rival.rule, st.rounds, m);
    const me = optionId;
    const prices = stage3Prices(st);
    const Q = myQuantity(stage3Segments(st, params), me, rival);
    const pr = m[me + rival][0];
    st.cash += pr;
    st.rounds.push({ me, rival });
    st.quarters.push({ id, P: prices[me], Q, c: st.c, F: st.F, profit: pr, cash: st.cash, me, rival });
    return markBankrupt(st, id);
  }
  if (id === 's4_oferta') { st.offer = optionId; return st; }
  throw new Error(`unknown decision ${id}`);
}

export function simulate(params, choices) {
  let state = initialState(params);
  for (const e of SCRIPT) {
    if (e.kind !== 'decision' || !decisionApplies(state, e.id, params)) continue;
    if (!(e.id in choices)) throw new Error(`missing choice ${e.id}`);
    state = resolveDecision(state, e.id, choices[e.id], params);
  }
  return { state, ending: classifyEnding(state, params) };
}
