// First-time mini-tutorials (spec §4.2): each fires once per student (coachSeen persists across runs),
// at most one per month, and never while the first-run tutorial is active. Pure; mutates the run clone it gets.
import { say } from './inbox.js';
import { sustained } from './valuation.js';

export const COACH_IDS = ['saturation', 'advertising', 'valuation', 'rival', 'editions', 'costShock', 'demandShock', 'regulator', 'expand'];
const COST = new Set(['arancel', 'renta']), DEMAND = new Set(['salud', 'recesion', 'marca_blanca']);

export function initCoach(run, coachSeen = []) {
  run.coachSeen = [...coachSeen]; run.coachQueue = []; run.lastCoachMonth = -1; run.coachActive = null;
}

function enqueue(run, id, nav) {
  if (run.coachSeen.includes(id) || run.coachQueue.some((x) => x.id === id)) return;
  run.coachQueue.push({ id, nav });
}

// A tip may wait several months in the queue: check it still makes sense when it is shown.
function refresh(run, item) {
  const s = run.state, act = s.products.filter((p) => p.active);
  if (item.id === 'expand') return s.expansions < run.world.plant.maxExpansions ? item : null;
  if (item.id === 'editions' || item.id === 'advertising') {
    const [kind, uid] = item.nav.target.split(':');
    if (act.some((p) => p.uid === uid)) return item;
    return act.length ? { ...item, nav: { ...item.nav, target: `${kind}:${act[0].uid}` } } : null;
  }
  return item;
}

function emit(run) {
  if ((run.tutorial && run.tutorial.step !== 'done') || run.lastCoachMonth === run.state.month || run.state.ended) return;
  let item = null;
  while (!item && run.coachQueue.length) item = refresh(run, run.coachQueue.shift());
  if (!item) return;
  say(run, 'coach', { id: item.id, nav: item.nav });
  run.coachSeen.push(item.id); run.lastCoachMonth = run.state.month;
  run.coachActive = item.nav.target ?? `tab:${item.nav.tab}`;
}

export function coachAfterAct(run, action) {
  const s = run.state;
  if (action.type === 'launch' && s.products.filter((p) => p.active).length >= 2) enqueue(run, 'saturation', { tab: 'mercado' });
  if (action.type === 'setAd') { const p = s.products.find((x) => x.uid === action.uid); if (p && p.ad > 0) enqueue(run, 'advertising', { tab: 'productos', target: `ad:${p.uid}` }); }
  emit(run);
}

export function coachAfterStep(run, events) {
  const s = run.state, w = run.world, act = s.products.filter((p) => p.active);
  for (const e of events) {
    if (e.type === 'rivalArrives') enqueue(run, 'rival', { tab: 'mercado' });
    if (e.type === 'wildcard' && COST.has(e.id)) enqueue(run, 'costShock', { tab: 'costos' });
    if (e.type === 'wildcard' && DEMAND.has(e.id)) enqueue(run, 'demandShock', { tab: 'mercado' });
    if (e.type === 'investigation') enqueue(run, 'regulator', { tab: 'mercado', target: 'demand-chart' });
  }
  if (sustained(s.history) > 0) enqueue(run, 'valuation', { tab: 'valuacion' });
  if (s.month >= w.versionsUnlockMonth && act.length) enqueue(run, 'editions', { tab: 'productos', target: `versions:${act[0].uid}` });
  const q = s.history.at(-1)?.perProduct.reduce((t, x) => t + x.Q, 0) ?? 0;
  if (s.expansions < w.plant.maxExpansions && w.plant.expandDc * q * 12 > w.plant.expandDF * 12 + w.plant.expandCost)
    enqueue(run, 'expand', { tab: 'productos', target: 'expand' });
  emit(run);
}

export const coachHighlight = (run) => (run.unseen > 0 ? run.coachActive ?? null : null);
