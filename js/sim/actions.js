// Player actions, validated. Pure: returns { state, ok, reason? } (reason is a copy key).
import { productCost } from './market.js';

const toNumber = (v) => {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return NaN;
  return Number(v);
};
const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(v)));

export function launchableTemplates(state, world) {
  return state.line === world.line ? world.templates : world.allTemplates[state.line];
}

export function applyAction(input, world, action) {
  const fail = (reason) => ({ state: input, ok: false, reason });
  if (input.ended) return fail('act.ended');
  const s = structuredClone(input);
  const findProduct = () => s.products.find((p) => p.uid === action.uid && p.active);
  const pay = (cost) => { if (s.cash < cost) return false; s.cash -= cost; (s.investments ||= []).push({ month: s.month, amount: cost, type: action.type }); return true; };

  switch (action.type) {
    case 'setPrice': {
      const p = findProduct(); if (!p) return fail('act.noProduct');
      const v = toNumber(action.price); if (!Number.isFinite(v)) return fail('act.badNumber');
      p.price = clampInt(v, 1, p.a0 * 2); return { state: s, ok: true };
    }
    case 'setAd': {
      const p = findProduct(); if (!p) return fail('act.noProduct');
      const v = toNumber(action.ad); if (!Number.isFinite(v)) return fail('act.badNumber');
      p.ad = clampInt(v, 0, 10 * p.launchCost); return { state: s, ok: true };
    }
    case 'launch': {
      if (s.repositioning) return fail('act.repositioning');
      const t = launchableTemplates(s, world).find((x) => x.id === action.templateId); if (!t) return fail('act.noTemplate');
      if (!pay(t.launchCost)) return fail('act.noCash');
      const p = { ...t, templateId: t.id, uid: 'p' + s.nextUid++, ad: 0, adStock: 0, loyalty: 0,
        readyAt: s.month + t.devMonths, launchedAt: s.month, active: true, versions: null };
      delete p.id;
      p.price = Math.round((t.a0 + productCost(p, s, world)) / 2);
      s.products.push(p);
      return { state: s, ok: true };
    }
    case 'discontinue': {
      const p = findProduct(); if (!p) return fail('act.noProduct');
      p.active = false; return { state: s, ok: true };
    }
    case 'expand': {
      if (s.expansions >= world.plant.maxExpansions) return fail('act.maxExpansions');
      if (!pay(world.plant.expandCost)) return fail('act.noCash');
      s.expansions += 1; s.F += world.plant.expandDF; s.lastExpansion = s.month; return { state: s, ok: true };
    }
    case 'versions': {
      const p = findProduct(); if (!p) return fail('act.noProduct');
      if (s.month < world.versionsUnlockMonth) return fail('act.locked');
      const hi = toNumber(action.high), lo = toNumber(action.low);
      if (!Number.isFinite(hi) || !Number.isFinite(lo)) return fail('act.badNumber');
      const high = clampInt(hi, 1, p.a0 * 2), low = clampInt(lo, 1, p.a0 * 2);
      if (high <= low) return fail('act.badVersions');
      if (!p.versions && !pay(world.versionsCost)) return fail('act.noCash');
      p.versions = { high, low }; return { state: s, ok: true };
    }
    case 'reposition': {
      if (s.repositioning) return fail('act.repositioning');
      if (!pay(world.reposition.cost)) return fail('act.noCash');
      s.repositioning = { until: s.month + world.reposition.months, to: s.line === 'premium' ? 'generico' : 'premium' };
      return { state: s, ok: true };
    }
    default: return fail('act.unknown');
  }
}
