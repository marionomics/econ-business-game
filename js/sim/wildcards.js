// Wildcards (comodines): scheduled shocks. Crises are graded (survived or not 6 months later). Pure.
export const CRISIS_MONTHS = 6;

const effect = (s, e) => { s.effects.push(e); };
export const WILDCARDS = {
  arancel: { crisis: true, apply: (s, w) => { effect(s, { kind: 'cost', add: w.tariff }); s.shocks.push({ id: 'arancel', month: s.month, kind: 'cost' }); } },
  renta: { crisis: true, apply: (s, w) => { effect(s, { kind: 'fixed', add: w.rent }); s.shocks.push({ id: 'renta', month: s.month, kind: 'cost' }); } },
  salud: { crisis: true, apply: (s) => { effect(s, { kind: 'demand', segment: s.line, mult: 0.75, until: s.month + 6 }); s.shocks.push({ id: 'salud', month: s.month, kind: 'demand', until: s.month + 6 }); } },
  recesion: { crisis: true, apply: (s) => { effect(s, { kind: 'demand', segment: 'all', mult: 0.85, until: s.month + 6 }); s.shocks.push({ id: 'recesion', month: s.month, kind: 'demand', until: s.month + 6 }); } },
  marca_blanca: { crisis: true, line: 'generico', apply: (s) => { effect(s, { kind: 'demand', segment: 'generico', mult: 0.8 }); s.shocks.push({ id: 'marca_blanca', month: s.month, kind: 'demand' }); } },
  viral: { crisis: false, apply: (s, w, params) => {
    const act = s.products.filter((p) => p.active);
    if (!act.length) { effect(s, { kind: 'demand', segment: s.line, mult: 1.3, until: s.month + 3 }); return; }
    const p = act[Math.floor(params.pick * act.length)]; params.uid = p.uid;
    effect(s, { kind: 'demand', uid: p.uid, mult: 1.3, until: s.month + 3 }); } },
  influencer: { crisis: false, line: 'premium', apply: (s) => effect(s, { kind: 'demand', segment: 'premium', mult: 1.2, until: s.month + 4 }) },
};

export function scheduleWildcards(rng, line) {
  const crises = rng.shuffle(Object.keys(WILDCARDS).filter((id) => WILDCARDS[id].crisis && (!WILDCARDS[id].line || WILDCARDS[id].line === line))).slice(0, 3);
  const extra = rng.pick(Object.keys(WILDCARDS).filter((id) => !WILDCARDS[id].crisis && (!WILDCARDS[id].line || WILDCARDS[id].line === line)));
  const ids = rng.shuffle([...crises, extra]);
  // Four months in 3..33, at least 3 apart: pick gaps.
  const months = []; let m = 3 + rng.int(0, 3);
  for (let i = 0; i < ids.length; i++) { months.push(m); m += 3 + rng.int(0, 5); }
  if (months.at(-1) > 33) { const shift = months.at(-1) - 33; for (let i = 0; i < months.length; i++) months[i] = Math.max(3 + 3 * i, months[i] - shift); }
  return ids.map((id, i) => ({ id, month: months[i], params: { pick: rng.next() } }));
}

export function applyDueWildcards(s, world, events) {
  for (const wc of world.wildcards.filter((x) => x.month === s.month)) {
    const def = WILDCARDS[wc.id]; const params = { ...wc.params };
    def.apply(s, world, params);
    events.push({ type: 'wildcard', id: wc.id, params });
    if (def.crisis) openCrisis(s, wc.id, events);
  }
}

export function openCrisis(s, id) { s.crises.push({ id, start: s.month, survived: null, resolvedAt: null }); }

// Resolve due crises (and all open ones if the run ended). Runs after profit and the end checks.
export function resolveCrises(s, events) {
  const last = s.history[s.history.length - 1];
  const ok = !(s.ended && s.ended.reason === 'bankrupt') && last && last.profit > 0;
  for (const c of s.crises) {
    if (c.survived !== null) continue;
    if (s.ended || s.month >= c.start + CRISIS_MONTHS) {
      c.survived = !!ok; c.resolvedAt = s.month;
      events.push({ type: 'crisisResolved', id: c.id, survived: c.survived });
    }
  }
}
