// How a run ended, with the cause of each bankruptcy (spec §4.8). Pure.
export const ENDINGS = [
  { id: 'ipo_premium', type: 'ipo' }, { id: 'ipo_volumen', type: 'ipo' },
  { id: 'comprada', type: 'fin' }, { id: 'fin_sin_ipo', type: 'fin' },
  { id: 'regulador', type: 'honorable' },
  { id: 'quiebra_bajo_costo', type: 'quiebra' }, { id: 'quiebra_choque_costos', type: 'quiebra' }, { id: 'quiebra_demanda', type: 'quiebra' },
  { id: 'quiebra_guerra', type: 'quiebra' }, { id: 'quiebra_expansion', type: 'quiebra' }, { id: 'quiebra_publicidad', type: 'quiebra' },
];
export const endingType = (id) => ENDINGS.find((e) => e.id === id)?.type;

const priceAt = (history, month, uid) => history.find((r) => r.month === month)?.perProduct.find((x) => x.uid === uid)?.P;

export function classifyEnding(s) {
  const reason = s.ended?.reason;
  const last = s.history[s.history.length - 1];
  if (reason === 'ipo') return s.line === 'premium' ? 'ipo_premium' : 'ipo_volumen';
  if (reason === 'regulator') return 'regulador';
  if (reason === 'end36') return last && last.profit > 0 ? 'comprada' : 'fin_sin_ipo';
  // Bankruptcy: name the most direct culprit first.
  const sold = (last?.perProduct ?? []).filter((x) => !x.inDevelopment);
  if (sold.some((x) => x.P < x.c)) return 'quiebra_bajo_costo';
  const lastRows = s.history.slice(-3);
  const sum = (k) => lastRows.reduce((t, r) => t + (r[k] ?? 0), 0);
  if (sum('ads') > 0 && sum('ads') >= Math.max(0, sum('contribution'))) return 'quiebra_publicidad';
  const spent = (s.investments ?? []).filter((x) => x.month >= s.month - 6).reduce((t, x) => t + x.amount, 0);
  const meanContribution = lastRows.length ? lastRows.reduce((t, r) => t + Math.max(0, r.contribution), 0) / lastRows.length : 0;
  if (spent > 0 && spent > 6 * meanContribution) return 'quiebra_expansion';
  if (s.rival?.active && s.rival.avgPriceAtArrival) {
    const act = (s.products ?? []).filter((p) => p.active);
    const avg = act.length ? act.reduce((t, p) => t + (p.versions ? p.versions.low : p.price), 0) / act.length : Infinity;
    if (avg <= 0.9 * s.rival.avgPriceAtArrival) return 'quiebra_guerra';
  }
  const recent = (s.shocks ?? []).filter((x) => x.month >= s.month - 12);
  const costShock = recent.filter((x) => x.kind === 'cost').at(-1);
  if (costShock && sold.length && sold.every((x) => { const p0 = priceAt(s.history, costShock.month, x.uid); return p0 === undefined || x.P <= p0; }))
    return 'quiebra_choque_costos';
  if (recent.some((x) => x.kind === 'demand' && (x.until === undefined || x.until > s.month - 6))) return 'quiebra_demanda';
  return 'quiebra_expansion'; // fixed costs and spending bigger than what you sold
}
