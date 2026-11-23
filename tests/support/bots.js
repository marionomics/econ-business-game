// Simulated players for balance and calibration tests. They use only the public run API.
import { createRng, deriveSeed } from '../../js/rng.js';
import { quantityAt } from '../../js/economy.js';
import { createRun, act, step, answer, ackEvents } from '../../js/sim/run.js';
import { launchableTemplates } from '../../js/sim/actions.js';
import { productDemand, productCost, quantityAtPrice } from '../../js/sim/market.js';

export function playRun(seed, line, bot) {
  const rng = createRng(deriveSeed(seed, 'bot:' + bot.name));
  let run = createRun({ seed, line, meta: { runId: `${bot.name}-${seed}` } });
  for (let i = 0; i < 400 && !run.state.ended; i++) {
    while (run.pending !== null) run = answer(run, bot.answer(run, run.questions[run.pending].built, rng));
    run = ackEvents(run);
    for (const a of bot.decide(run, rng)) { run = act(run, a); while (run.pending !== null) run = answer(run, bot.answer(run, run.questions[run.pending].built, rng)); }
    run = step(run);
  }
  while (run.pending !== null) run = answer(run, bot.answer(run, run.questions[run.pending].built, rng));
  return run;
}

const right = (b) => (b.kind === 'mc' ? b.answer : String(b.answer));
const wrong = (b) => (b.kind === 'mc' ? b.options.find((o) => o.id !== b.answer).id : String(b.answer * 3 + 7));
const ready = (s) => s.products.filter((p) => p.active && s.month >= p.readyAt);

// Profit-maximizing integer price given current demand, cost and rival price.
export function bestPrice(p, s, w, capMarkup = Infinity) {
  const c = productCost(p, s, w), a = productDemand(p, s, w).a;
  let best = Math.ceil(c + 1), bestPi = -Infinity;
  for (let P = Math.ceil(c + 1); P < a; P++) {
    if ((P - c) / P > capMarkup) break;
    const pi = (P - c) * quantityAtPrice(p, s, w, P);
    if (pi > bestPi) { bestPi = pi; best = P; }
  }
  return { P: best, pi: bestPi };
}
function newProductValue(t, s, w) {
  const probe = { ...t, uid: '_new', adStock: 0, loyalty: 0, active: true, segment: t.segment };
  const st = { ...s, products: [...s.products, probe] };
  const a = productDemand(probe, st, w).a, c = productCost(probe, st, w), b = t.b;
  return (a - c) ** 2 / (4 * b) - t.fixedMonthly;
}

export function makeSmartBot({ name, noise = 0, every = 1, payback = 8, reserveMonths = 2, adPremium = 6000, adGeneric = 2500,
  versions = true, expand = true, accuracy = 1, avoidRegulator = true }) {
  return {
    name,
    answer: (run, b, rng) => (rng.next() < accuracy ? right(b) : wrong(b)),
    decide(run, rng) {
      const s = run.state, w = run.world, acts = [];
      const fixedNow = s.F + s.products.filter((p) => p.active).reduce((t, p) => t + p.fixedMonthly + p.ad, 0);
      const reserve = reserveMonths * fixedNow;
      // Launch the best template while it pays back fast enough.
      if (!s.repositioning && s.products.filter((p) => p.active).length < 4) {
        const ts = launchableTemplates(s, w).map((t) => ({ t, v: newProductValue(t, s, w) })).sort((x, y) => y.v - x.v);
        const pick = ts.find(({ t, v }) => v > 0 && t.launchCost / v < payback && s.cash - t.launchCost > reserve);
        if (pick && (s.products.length === 0 || s.month >= 2)) acts.push({ type: 'launch', templateId: pick.t.id });
      }
      if (s.month % every !== 0 && s.products.length) return acts;
      const selling = ready(s).length;
      const risky = avoidRegulator === 'reactive' ? !!s.regulator.investigation || s.regulator.watch >= w.regulator.watchMonths - 1
        : s.regulator.investigation || selling >= w.regulator.portfolioThreshold || s.rival.active;
      const cap = avoidRegulator && risky ? w.regulator.markupThreshold - 0.02 : Infinity;
      for (const p of ready(s)) {
        // Drop products that lost money for the last 3 months.
        const lastRows = s.history.slice(-3).map((h) => h.perProduct.find((x) => x.uid === p.uid)).filter(Boolean);
        if (lastRows.length === 3 && lastRows.every((x) => x.contribution - p.fixedMonthly - p.ad < 0) && s.month - p.launchedAt > 4) {
          acts.push({ type: 'discontinue', uid: p.uid }); continue; }
        const { P } = bestPrice(p, s, w, cap);
        const target = Math.max(1, Math.round(P * (1 + noise * (2 * rng.next() - 1))));
        if (target !== p.price) acts.push({ type: 'setPrice', uid: p.uid, price: target });
        const ad = p.segment === 'premium' ? adPremium : adGeneric;
        if (p.ad !== ad) acts.push({ type: 'setAd', uid: p.uid, ad });
        if (versions && s.month >= w.versionsUnlockMonth && (p.versions || s.cash > w.versionsCost + reserve)) {
          const a = productDemand(p, s, w).a, c = productCost(p, s, w);
          let high = Math.round((2 * a + c) / 3), low = Math.round((a + 2 * c) / 3);
          if (cap !== Infinity) { const maxP = Math.floor(c / (1 - cap)); high = Math.min(high, maxP); low = Math.min(low, high - 1); }
          if (!p.versions || p.versions.high !== high || p.versions.low !== low) acts.push({ type: 'versions', uid: p.uid, high, low });
        }
      }
      if (expand && s.expansions < w.plant.maxExpansions && s.month < 24) {
        const q = s.history.at(-1)?.perProduct.reduce((t, x) => t + x.Q, 0) ?? 0;
        const gain = w.plant.expandDc * q - w.plant.expandDF;
        if (gain > 0 && w.plant.expandCost / gain < payback && s.cash - w.plant.expandCost > reserve) acts.push({ type: 'expand' });
      }
      return acts;
    },
  };
}

export const BOTS = {
  optimal: makeSmartBot({ name: 'optimal', payback: 12, adPremium: 30000, adGeneric: 10000, avoidRegulator: 'reactive' }),
  competent: makeSmartBot({ name: 'competent', noise: 0.1, every: 3, payback: 10, reserveMonths: 1, adPremium: 12000, adGeneric: 4000, accuracy: 0.75, versions: false, avoidRegulator: false }),
  naive: {
    name: 'naive', answer: (run, b, rng) => (rng.next() < 0.5 ? right(b) : wrong(b)),
    decide: (run) => (run.state.products.length ? [] : [{ type: 'launch', templateId: launchableTemplates(run.state, run.world)[0].id }]),
  },
};

// Scripted players that go broke in one specific way (for reachability of each post-mortem).
const launchFirst = (run) => (run.state.products.length ? [] : [{ type: 'launch', templateId: launchableTemplates(run.state, run.world)[0].id }]);
const priceAll = (run, f) => ready(run.state).map((p) => ({ type: 'setPrice', uid: p.uid, price: f(p) }));
const optimalPrice = (run) => (p) => bestPrice(p, run.state, run.world).P;
const cOf = (run, p) => productCost(p, run.state, run.world);
const scripted = (name, decide) => ({ name, answer: (run, b) => right(b), decide });
// Runs a thin-margin firm (lowest price that still breaks even) and freezes prices once the shock hits.
function thinPrice(p, s, w) {
  const c = productCost(p, s, w), share = (s.F + p.fixedMonthly) / Math.max(1, ready(s).length);
  const opt = bestPrice(p, s, w).P;
  for (let P = Math.ceil(c + 1); P <= opt; P++) if ((P - c) * quantityAtPrice(p, s, w, P) >= share * 1.05) return P;
  return opt;
}
const shockIgnorer = (name, kind) => scripted(name, (run) => { const s = run.state;
  const acts = s.products.length ? [] : launchableTemplates(s, run.world).slice(0, 2).map((t) => ({ type: 'launch', templateId: t.id }));
  if (s.shocks.some((x) => x.kind === kind)) return acts;
  return [...acts, ...priceAll(run, (p) => thinPrice(p, s, run.world))]; });
export const BANKRUPT_BOTS = {
  quiebra_bajo_costo: scripted('belowCost', (run) => [...launchFirst(run), ...priceAll(run, (p) => Math.max(1, Math.floor(cOf(run, p)) - 4))]),
  quiebra_publicidad: scripted('adBurn', (run) => [...launchFirst(run), ...priceAll(run, optimalPrice(run)),
    ...run.state.products.filter((p) => p.active).map((p) => ({ type: 'setAd', uid: p.uid, ad: 400000 }))]),
  quiebra_expansion: scripted('overExpand', (run) => [...launchableTemplates(run.state, run.world).map((t) => ({ type: 'launch', templateId: t.id })),
    { type: 'expand' }, ...priceAll(run, optimalPrice(run))]),
  quiebra_guerra: scripted('priceWar', (run) => { const s = run.state;
    const acts = s.products.length ? [] : launchableTemplates(s, run.world).slice(0, 2).map((t) => ({ type: 'launch', templateId: t.id }));
    if (!s.rival.active) return [...acts, ...priceAll(run, optimalPrice(run))];
    return priceAll(run, (p) => Math.max(Math.ceil(cOf(run, p)) + 1, (s.rival.prices[p.uid] ?? p.price) - 3)); }),
  quiebra_choque_costos: shockIgnorer('ignoreTariff', 'cost'),
  quiebra_demanda: shockIgnorer('ignoreDemand', 'demand'),
};

// Holds monopoly prices on a big, heavily advertised portfolio and ignores the regulator.
export const MONOPOLIST = scripted('monopolist', (run) => { const s = run.state, w = run.world;
  const acts = launchableTemplates(s, w).filter((t) => !s.products.some((p) => p.templateId === t.id) && s.cash > t.launchCost + 60000)
    .slice(0, 1).map((t) => ({ type: 'launch', templateId: t.id }));
  return [...acts, ...priceAll(run, (p) => { const c = productCost(p, s, w), a = productDemand(p, s, w).a; return Math.round((a + c) / 2); }),
    ...s.products.filter((p) => p.active).map((p) => ({ type: 'setAd', uid: p.uid, ad: p.segment === 'premium' ? 30000 : 10000 }))]; });
