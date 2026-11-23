// Checkpoint bank. Each concept has several items whose answers depend on the run (spec §5.4).
import { createRng, deriveSeed } from './rng.js';
import { quantityAt, optimalPrice, arcElasticity, markupPrice, averageCost } from './economy.js';
import { nashEquilibria, gameType, myBestResponse } from './rival.js';
import { stage3Matrix, stage3Prices, stage3Segments, priceGrid } from './engine.js';
import { myQuantity } from './rival.js';

export const CONCEPTS = {
  s1: ['utilidad', 'elasticidad', 'optimo'],
  s2: ['choque', 'markup', 'escala', 'excedente'],
  s3: ['equilibrio', 'poder'],
};

const r2 = (x) => Math.round(x * 100) / 100;
const lastQ = (st) => st.quarters[st.quarters.length - 1];
const lastP = (st) => lastQ(st)?.P ?? optimalPrice({ a: st.demand.a, c: st.c });
const step = (st) => (st.demand.a - st.c) / 8;

const num = (id, answer, vars) => ({ kind: 'numeric', answer, vars });
function mc(id, optIds, answer, rng, vars = {}, optVars = {}) {
  return {
    kind: 'mc', answer, vars,
    options: rng.shuffle(optIds).map((o) => ({ id: o, labelKey: `cp.${id}.opt.${o}`, vars: optVars[o] ?? {} })),
  };
}
const always = () => true;
const DIR = ['sube', 'baja', 'igual'];

// Survey pair: price at grid j and one step above, with quantities from current demand.
function surveyPair(st, j) {
  const grid = priceGrid(st);
  const P = grid(j), P2 = grid(j + 1);
  return { P, Q: quantityAt(st.demand, P), P2, Q2: quantityAt(st.demand, P2) };
}

export const BANK = [
  // ---- Stage 1 -------------------------------------------------------------
  { id: 'utilidad_total', concept: 'utilidad', applies: (st) => st.quarters.length > 0,
    build: (st) => { const q = lastQ(st); return num('utilidad_total', (q.P - q.c) * q.Q - q.F, { P: q.P, Q: q.Q, c: q.c, F: q.F }); } },
  { id: 'utilidad_unidad', concept: 'utilidad', applies: (st) => st.quarters.length > 0,
    build: (st) => { const q = lastQ(st); return num('utilidad_unidad', q.P - q.c, { P: q.P, c: q.c }); } },
  { id: 'costo_medio', concept: 'utilidad', applies: (st) => st.quarters.length > 0 && lastQ(st).Q > 0,
    build: (st) => { const q = lastQ(st); return num('costo_medio', r2(averageCost({ c: q.c, F: q.F }, q.Q)), { Q: q.Q, c: q.c, F: q.F }); } },

  { id: 'elast_arco', concept: 'elasticidad', applies: always,
    build: (st, p, rng) => { const s = surveyPair(st, rng.pick([-2, -1, 0])); return num('elast_arco', r2(arcElasticity(s.P, s.Q, s.P2, s.Q2)), s); } },
  { id: 'elast_clasif', concept: 'elasticidad', applies: always,
    build: (st, p, rng) => { const s = surveyPair(st, rng.pick([-3, -2, 0, 2])); const e = arcElasticity(s.P, s.Q, s.P2, s.Q2);
      const ans = Math.abs(e - 1) < 0.02 ? 'unitaria' : e > 1 ? 'elastica' : 'inelastica';
      return mc('elast_clasif', ['elastica', 'inelastica', 'unitaria'], ans, rng, { ...s, eps: r2(e) }); } },
  { id: 'ingreso_direccion', concept: 'elasticidad', applies: always,
    build: (st, p, rng) => { const s = surveyPair(st, rng.pick([-3, -2, 0, 1])); // cut from P2 down to P
      const R1 = s.P2 * s.Q2, R2 = s.P * s.Q; const ans = R2 > R1 ? 'sube' : R2 < R1 ? 'baja' : 'igual';
      return mc('ingreso_direccion', DIR, ans, rng, { ...s, R1, R2 }); } },

  { id: 'optimo_tangencia', concept: 'optimo', applies: always,
    build: (st, p, rng) => mc('optimo_tangencia', ['max_utilidad', 'vender_mas', 'precio_alto', 'cubrir_fijo'], 'max_utilidad', rng) },
  { id: 'isoprofit_comparar', concept: 'optimo', applies: always,
    build: (st, p, rng) => { const g = step(st); const Q = 2 * Math.max(2, Math.round(quantityAt(st.demand, st.c + 2 * g) / 4) * 2);
      const P = st.c + 2 * g;
      const optVars = {
        mitad: { P: st.c + 4 * g, Q: Q / 2 }, tres_cuartos: { P: st.c + 4 * g, Q: Math.round(0.75 * Q) },
        margen_tres: { P: st.c + 3 * g, Q: Q / 2 }, margen_uno: { P: st.c + g, Q: Math.round(1.5 * Q) } };
      return mc('isoprofit_comparar', Object.keys(optVars), 'mitad', rng, { P, Q, c: st.c, F: st.F }, optVars); } },
  { id: 'precio_bajo_costo', concept: 'optimo', applies: always,
    build: (st, p, rng) => mc('precio_bajo_costo', ['cada_unidad_pierde', 'volumen_compensa', 'cubre_fijo', 'gana_mercado'], 'cada_unidad_pierde', rng, { c: st.c }) },

  // ---- Stage 2 -------------------------------------------------------------
  { id: 'choque_fijo', concept: 'choque', applies: (st, p) => p.shock.type === 'fijo',
    build: (st, p, rng) => mc('choque_fijo', ['sube', 'igual', 'baja', 'sube_mitad'], 'igual', rng, { amount: p.shock.amount }) },
  { id: 'choque_marginal', concept: 'choque', applies: (st, p) => p.shock.type === 'marginal',
    build: (st, p, rng) => mc('choque_marginal', ['sube', 'igual', 'baja', 'sube_mitad'], 'sube_mitad', rng, { amount: p.shock.amount }) },
  { id: 'choque_utilidad', concept: 'choque', applies: always,
    build: (st) => { const P = lastP(st); const Q = quantityAt(st.demand, P);
      return num('choque_utilidad', (P - st.c) * Q - st.F, { P, Q, c: st.c, F: st.F }); } },

  { id: 'markup_precio', concept: 'markup', applies: always,
    build: (st) => { const P = optimalPrice({ a: st.demand.a, c: st.c }); const eps = r2(P / (P - st.c));
      return num('markup_precio', r2(markupPrice(st.c, eps)), { eps, c: st.c }); } },
  { id: 'markup_eps', concept: 'markup', applies: always,
    build: (st) => { const P = optimalPrice({ a: st.demand.a, c: st.c }); return num('markup_eps', r2(P / (P - st.c)), { P, c: st.c }); } },
  { id: 'markup_marca', concept: 'markup', applies: (st) => st.investment === 'marca' || st.investment === 'ambas',
    build: (st, p, rng) => mc('markup_marca', DIR, 'sube', rng) },
  { id: 'markup_sustituto', concept: 'markup', applies: (st) => !(st.investment === 'marca' || st.investment === 'ambas'),
    build: (st, p, rng) => mc('markup_sustituto', DIR, 'baja', rng) },

  { id: 'escala_cm', concept: 'escala', applies: always,
    build: (st, p, rng) => { const Q = 4 * Math.round(quantityAt(st.demand, optimalPrice({ a: st.demand.a, c: st.c })) * rng.pick([0.5, 1, 1.5]) / 4);
      return num('escala_cm', r2(averageCost({ c: st.c, F: st.F }, Q)), { Q, c: st.c, F: st.F }); } },
  { id: 'escala_cmg', concept: 'escala', applies: always,
    build: (st, p) => { const roaster = st.investment === 'tostadora' || st.investment === 'ambas';
      return num('escala_cmg', st.c, { c0: p.c, dc: roaster ? p.roaster.dc : 0, shockC: p.shock.type === 'marginal' ? p.shock.amount : 0,
        dF: roaster ? p.roaster.dF : 0 }); } },
  { id: 'escala_retornos', concept: 'escala', applies: always,
    build: (st, p, rng) => mc('escala_retornos', ['fijo_repartido', 'cmg_baja', 'precio_sube', 'trabajadores_rinden'], 'fijo_repartido', rng) },

  { id: 'excedente_consumidor', concept: 'excedente', applies: (st) => lastP(st) < st.demand.a,
    build: (st) => { const P = lastP(st); const Q = quantityAt(st.demand, P);
      return num('excedente_consumidor', 0.5 * Q * (st.demand.a - P), { P, Q, a: st.demand.a }); } },
  { id: 'perdida_irrecuperable', concept: 'excedente', applies: (st) => lastP(st) > st.c,
    build: (st) => { const P = lastP(st); const Q = quantityAt(st.demand, P); const Qc = quantityAt(st.demand, st.c);
      return num('perdida_irrecuperable', 0.5 * (Qc - Q) * (P - st.c), { P, Q, c: st.c, Qc }); } },
  { id: 'excedente_pareto', concept: 'excedente', applies: always,
    build: (st, p, rng) => mc('excedente_pareto', ['precio_unico', 'no_hay_comprador', 'costo_fijo', 'ilegal'], 'precio_unico', rng, { c: st.c }) },

  // ---- Stage 3 -------------------------------------------------------------
  { id: 'nash', concept: 'equilibrio', applies: always,
    build: (st, p, rng) => { const m = stage3Matrix(st, p);
      const ans = { HH: 'HH', LL: 'LL', 'HH,LL': 'HH_LL' }[nashEquilibria(m).sort().join(',')] ?? 'ninguno';
      return mc('nash', ['HH', 'LL', 'HH_LL', 'ninguno'], ans, rng, { matrix: m, ...stage3Prices(st) }); } },
  { id: 'tipo_juego', concept: 'equilibrio', applies: always,
    build: (st, p, rng) => { const m = stage3Matrix(st, p);
      return mc('tipo_juego', ['coordinacion', 'dilema', 'dominante_H', 'otro'], gameType(m), rng, { matrix: m, ...stage3Prices(st) }); } },
  { id: 'mejor_respuesta', concept: 'equilibrio', applies: (st) => st.rounds.length > 0,
    build: (st, p, rng) => { const m = stage3Matrix(st, p); const riv = st.rounds[st.rounds.length - 1].rival;
      return mc('mejor_respuesta', ['H', 'L'], myBestResponse(m, riv), rng, { matrix: m, rival: riv, ...stage3Prices(st) }); } },

  { id: 'lealtad_poder', concept: 'poder', applies: always,
    build: (st, p, rng) => mc('lealtad_poder', ['menos_elastica', 'mas_clientes_mas_barato', 'costo_baja', 'nada'], 'menos_elastica', rng) },
  { id: 'bloquear', concept: 'poder', applies: (st) => st.move === 'bloquear',
    build: (st, p, rng) => mc('bloquear', ['quita_sustitutos', 'eficiencia', 'legal_siempre', 'baja_costos'], 'quita_sustitutos', rng) },
  { id: 'pago_celda', concept: 'poder', applies: (st) => st.move !== 'bloquear',
    build: (st, p, rng) => { const me = rng.pick(['H', 'L']), riv = rng.pick(['H', 'L']); const prices = stage3Prices(st);
      const Q = myQuantity(stage3Segments(st, p), me, riv);
      return num('pago_celda', (prices[me] - st.c) * Q - st.F, { me, rival: riv, P: prices[me], Prival: prices[riv], Q, c: st.c, F: st.F }); } },
];

export function assignConcepts(seed) {
  const r = createRng(deriveSeed(seed, 'concepts'));
  return { s1: r.shuffle(CONCEPTS.s1), s2: r.shuffle(CONCEPTS.s2).slice(0, 3), s3: r.shuffle(CONCEPTS.s3) };
}

export function buildCheckpoint(concept, state, params, seed, index) {
  const items = BANK.filter((i) => i.concept === concept && i.applies(state, params));
  const rng = createRng(deriveSeed(seed, 'cp' + index));
  const item = rng.pick(items);
  const b = item.build(state, params, rng);
  return { itemId: item.id, concept, promptKey: `cp.${item.id}.prompt`, explanationKey: `cp.${item.id}.explain`, ...b };
}

// Elasticity is reported as a positive number in CORE; accept the signed convention too.
const ABS_ITEMS = new Set(['elast_arco', 'markup_eps']);

export function gradeCheckpoint(built, input) {
  if (built.kind === 'mc') return input === built.answer;
  if (Array.isArray(input)) return input.some((x) => gradeCheckpoint(built, x));
  if (typeof input !== 'number' || !Number.isFinite(input)) return false;
  const x = ABS_ITEMS.has(built.itemId) ? Math.abs(input) : input;
  return Math.abs(x - built.answer) <= Math.max(0.02 * Math.abs(built.answer), 0.01);
}

// "1.250" or "1,250" can mean 1250 or 1.25 depending on the reader's convention: return both readings.
export function parseNumberCandidates(text) {
  const main = parseNumber(text);
  if (main === null) return [];
  const t = String(text).trim().replace(/[$\s]/g, '').replace(/−/g, '-');
  if (/^-?\d{1,3}[.,]\d{3}$/.test(t)) {
    const digits = Number(t.replace(/[.,]/, '')), dec = Number(t.replace(',', '.'));
    return [...new Set([digits, dec])];
  }
  return [main];
}

export function parseNumber(text) {
  if (typeof text !== 'string') return null;
  let s = text.trim().replace(/−/g, '-').replace(/[$\s]/g, '');
  if (!/^-?[\d.,]+$/.test(s) || !/\d/.test(s)) return null;
  const neg = s.startsWith('-'); if (neg) s = s.slice(1);
  const hasDot = s.includes('.'), hasComma = s.includes(',');
  if (hasDot && hasComma) {
    const dec = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    const thou = dec === '.' ? ',' : '.';
    if (s.split(dec).length !== 2) return null;
    s = s.split(thou).join('').replace(dec, '.');
  } else if (hasComma) {
    if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
    else if (/^\d*,\d+$/.test(s)) s = s.replace(',', '.');
    else return null;
  } else if (hasDot) {
    if (/^\d{1,3}(\.\d{3}){2,}$/.test(s)) s = s.replace(/\./g, '');
    else if (!/^\d*\.\d+$/.test(s)) return null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}
