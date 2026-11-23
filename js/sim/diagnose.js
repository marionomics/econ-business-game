// What is draining the cash, and where to go to fix it (spec §4.3). Pure.
export function diagnose(run) {
  const s = run.state, last = s.history.at(-1), rows = last?.perProduct ?? [];
  const prod = (uid) => s.products.find((p) => p.uid === uid);
  const selling = rows.filter((x) => !x.inDevelopment && x.Q > 0);
  const below = selling.find((x) => x.P < x.c);
  if (below) return { culprit: 'belowCost', uid: below.uid, nav: [{ tab: 'productos', target: `price:${below.uid}` }, { tab: 'costos' }] };
  const ads = selling.find((x) => (prod(x.uid)?.ad ?? 0) > x.contribution);
  if (ads) return { culprit: 'adsOverMargin', uid: ads.uid, nav: [{ tab: 'productos', target: `ad:${ads.uid}` }] };
  const losing = selling.find((x) => { const p = prod(x.uid); return p && x.contribution - p.fixedMonthly - p.ad < 0; });
  if (losing) return { culprit: 'losingProduct', uid: losing.uid, nav: [{ tab: 'productos', target: `price:${losing.uid}` }, { tab: 'mercado' }] };
  const dev = rows.find((x) => x.inDevelopment);
  if (dev) return { culprit: 'investing', uid: dev.uid, nav: [{ tab: 'productos' }, { tab: 'finanzas' }] };
  return { culprit: 'fixedCosts', nav: [{ tab: 'finanzas' }, { tab: 'productos' }] };
}

const CRISIS_TAB = { arancel: 'costos', renta: 'costos', salud: 'mercado', recesion: 'mercado', marca_blanca: 'mercado', rival: 'mercado', regulador: 'mercado' };
export const crisisNav = (id) => [{ tab: CRISIS_TAB[id] ?? 'finanzas' }];

const COST = { expand: (w) => w.plant.expandCost, versions: (w) => w.versionsCost, reposition: (w) => w.reposition.cost };
export function rejectionVars(run, action, reason) {
  if (reason !== 'act.noCash') return {};
  const w = run.world;
  const needed = action.type === 'launch' ? [...w.templates, ...Object.values(w.allTemplates).flat()].find((t) => t.id === action.templateId)?.launchCost
    : COST[action.type]?.(w);
  if (!needed) return {};
  const profit = run.state.history.at(-1)?.profit ?? 0, have = run.state.cash;
  return { needed, have, monthsOfProfit: profit > 0 ? Math.ceil((needed - have) / profit) : null };
}
