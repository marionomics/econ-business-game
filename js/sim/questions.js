// CFO questions (spec §4.10): triggered by events, built from this run's numbers. Pure.
import { quantityAt } from '../economy.js';
import { productDemand, productCost } from './market.js';

const r2 = (x) => Math.round(x * 100) / 100;
const DIR4 = ['sube', 'sube_mitad', 'igual', 'baja'];
const num = (answer, vars, extra = {}) => ({ kind: 'numeric', answer, vars, ...extra });
const mc = (options, answer, vars, rng) => ({ kind: 'mc', answer, vars, options: rng.shuffle(options).map((id) => ({ id })) });

// The product the question is about: the trigger's product, else the active, selling product with most sales.
function focus(run, uid) {
  const s = run.state, act = s.products.filter((p) => p.active);
  if (uid) return act.find((p) => p.uid === uid) ?? null;
  const last = s.history.at(-1);
  const selling = act.filter((p) => s.month > p.readyAt);
  if (!selling.length) return act[0] ?? null;
  const q = (p) => last?.perProduct.find((x) => x.uid === p.uid)?.Q ?? 0;
  return selling.reduce((best, p) => (q(p) > q(best) ? p : best));
}
const dem = (run, p) => productDemand(p, run.state, run.world);
const px = (p) => (p.versions ? p.versions.low : p.price); // with editions, the basic edition is the price on the demand curve
const cost = (run, p) => productCost(p, run.state, run.world);
const hasProduct = (run, ctx) => !!focus(run, ctx.uid);

export const QUESTIONS = [
  { id: 'precio_optimo', trigger: 'launch', applies: hasProduct,
    build: (run, rng, ctx) => { const p = focus(run, ctx.uid); const a = dem(run, p).a, c = cost(run, p);
      return num((a + c) / 2, { uid: p.uid, a, c }); } },
  { id: 'precio_optimo', trigger: 'tutorial', applies: hasProduct, // same question, asked by the tutorial's diagnose step
    build: (run, rng, ctx) => { const p = focus(run, ctx.uid); const a = dem(run, p).a, c = cost(run, p);
      return num((a + c) / 2, { uid: p.uid, a, c }); } },
  { id: 'utilidad_mes', trigger: 'launch', applies: hasProduct,
    build: (run, rng, ctx) => { const p = focus(run, ctx.uid); const d = dem(run, p), c = cost(run, p), P = px(p), Q = quantityAt(d, P);
      return num((P - c) * Q, { uid: p.uid, P, Q, c }); } },
  { id: 'arancel_precio', trigger: 'wildcard:arancel', applies: hasProduct,
    build: (run, rng, ctx) => { const p = focus(run, ctx.uid); const a = dem(run, p).a, c = cost(run, p), t = run.world.tariff;
      return num((a + c) / 2, { uid: p.uid, a, cOld: c - t, tariff: t }); } },
  { id: 'arancel_mc', trigger: 'wildcard:arancel', applies: () => true,
    build: (run, rng) => mc(DIR4, 'sube_mitad', { tariff: run.world.tariff }, rng) },
  { id: 'renta_precio', trigger: 'wildcard:renta', applies: () => true,
    build: (run, rng) => mc(DIR4, 'igual', { rent: run.world.rent }, rng) },
  { id: 'renta_utilidad', trigger: 'wildcard:renta', applies: (run) => run.state.history.length > 0,
    build: (run) => { const last = run.state.history.at(-1).profit; return num(last, { lastProfit: last + run.world.rent, rent: run.world.rent }); } }, // the shown profit already includes the rent
  ...['salud', 'recesion', 'marca_blanca'].flatMap((id) => [
    { id: 'demanda_precio', trigger: `wildcard:${id}`, applies: hasProduct,
      build: (run, rng, ctx) => { const p = focus(run, ctx.uid); const a = dem(run, p).a, c = cost(run, p); return num((a + c) / 2, { uid: p.uid, a, c, shock: id }); } },
    { id: 'demanda_ingreso', trigger: `wildcard:${id}`, applies: (run, ctx) => { const p = focus(run, ctx.uid); return !!p && dem(run, p).a > px(p); },
      build: (run, rng, ctx) => { const p = focus(run, ctx.uid); const a = dem(run, p).a, P = px(p); const eps = P / (a - P);
        return mc(['elastica', 'inelastica'], eps > 1 ? 'elastica' : 'inelastica', { uid: p.uid, a, P, shock: id }, rng); } },
  ]),
  { id: 'rival_lealtad', trigger: 'rivalArrives', applies: () => true,
    build: (run, rng) => mc(['protege', 'nada', 'costos', 'precio_bajo'], 'protege', {}, rng) },
  { id: 'rival_elasticidad', trigger: 'rivalArrives', applies: () => true,
    build: (run, rng) => mc(['sube', 'baja', 'igual'], 'baja', {}, rng) },
  { id: 'pie_calculo', trigger: 'investigation', applies: (run, ctx) => { const p = focus(run, ctx.uid); return !!p && px(p) > cost(run, p); },
    build: (run, rng, ctx) => { const p = focus(run, ctx.uid); const d = dem(run, p), c = cost(run, p), P = px(p);
      const Q = quantityAt(d, P), Qc = quantityAt(d, c); return num(0.5 * (Qc - Q) * (P - c), { uid: p.uid, P, Q, c, Qc }); } },
  { id: 'pie_concepto', trigger: 'investigation', applies: () => true,
    build: (run, rng) => mc(['precio_sobre_cmg', 'costo_fijo', 'impuestos', 'publicidad'], 'precio_sobre_cmg', {}, rng) },
  { id: 'costo_medio', trigger: 'expand', applies: () => true,
    build: (run) => { const s = run.state; const sold = s.history.at(-1)?.perProduct.reduce((t, x) => t + x.Q, 0) || 1000;
      const Q = Math.max(100, Math.round(sold / 100) * 100); const p = focus(run, null); const c = p ? cost(run, p) : 0;
      return num(r2(c + s.F / Q), { Q, c, F: s.F }); } },
  { id: 'escala', trigger: 'expand', applies: () => true,
    build: (run, rng) => mc(['fijo_repartido', 'cmg_sube', 'precio_sube', 'nada'], 'fijo_repartido', {}, rng) },
  { id: 'discriminacion', trigger: 'versions', applies: () => true,
    build: (run, rng) => mc(['captura_excedente', 'baja_costos', 'quita_rival', 'nada'], 'captura_excedente', {}, rng) },
  { id: 'elasticidad', trigger: 'pulse', applies: (run) => { const p = focus(run, null); return !!p && dem(run, p).a > px(p); },
    build: (run) => { const p = focus(run, null); const a = dem(run, p).a, P = px(p); return num(r2(P / (a - P)), { uid: p.uid, a, P }, { absolute: true }); } },
  { id: 'markup', trigger: 'pulse', applies: (run) => !!focus(run, null),
    build: (run) => { const p = focus(run, null); const c = cost(run, p), P = px(p); return num(r2((P - c) / P), { uid: p.uid, P, c }, { percentOk: true }); } },
];

// Pick one applicable question for a trigger (or null).
export function buildFor(trigger, run, rng, ctx = {}) {
  const items = QUESTIONS.filter((q) => q.trigger === trigger && q.applies(run, ctx));
  if (!items.length) return null;
  const q = rng.pick(items);
  const b = q.build(run, rng, ctx);
  return { id: q.id, trigger, built: { ...b, id: q.id, promptKey: `q.${q.id}.prompt`, explanationKey: `q.${q.id}.explain` } };
}
