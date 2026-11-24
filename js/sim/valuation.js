// After repositioning, the target and base multiple follow the firm's current line.
export const ipoTargetOf = (s, w) => (s.line === w.line ? w.ipoTarget : w.lines?.[s.line]?.ipoTarget ?? w.ipoTarget);
export const baseMultipleOf = (s, w) => (s.line === w.line ? w.baseMultiple : w.lines?.[s.line]?.baseMultiple ?? w.baseMultiple);

// Valuation shown every month: annualized profit × multiple + cash (spec §4.7). Pure.
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const sum = (rows, k) => rows.reduce((t, r) => t + r[k], 0);

export function valuation(state, world) {
  const h = state.history, last = h.slice(-3), prev = h.slice(-6, -3);
  const annualProfit = last.length ? Math.round(sum(last, 'profit') * (12 / last.length)) : 0;
  const lastP = sum(last, 'profit'), prevP = sum(prev, 'profit');
  const growth = prev.length === 3 && prevP > 0 ? clamp((lastP - prevP) / prevP, -0.3, 0.5) : 0;
  const rev = sum(last, 'revenue'), margin = rev > 0 ? sum(last, 'contribution') / rev : 0;
  const marginFactor = clamp(0.5 + margin * 1.25, 0.6, 1.4);
  const regulator = state.regulator?.investigation ? 2 : 0;
  const base = baseMultipleOf(state, world);
  const multiple = Math.max(0, Math.round((base * (1 + growth) * marginFactor - regulator) * 100) / 100);
  const cash = Math.max(0, state.cash);
  return { annualProfit, multiple, cash, parts: { base, growth, margin, marginFactor, regulator },
    value: Math.round(Math.max(0, annualProfit * multiple) + cash) };
}

export const sustained = (history) => (history.length < 3 ? 0 : Math.min(...history.slice(-3).map((r) => r.valuation)));

// Tick step: store this month's valuation, update the best sustained value, check the IPO.
export function valuationStep(s, w, events) {
  const row = s.history[s.history.length - 1];
  row.valuation = valuation(s, w).value;
  const sv = sustained(s.history);
  s.bestSustained = Math.max(s.bestSustained, sv);
  if (!s.ended && sv >= ipoTargetOf(s, w)) { s.ended = { reason: 'ipo', month: s.month }; events.push({ type: 'ipo', value: sv }); }
}
