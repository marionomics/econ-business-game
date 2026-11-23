// Competition authority (CORE 7.12): watches share and markup; investigation, fine, breakup. Pure step.
import { openCrisis } from './wildcards.js';

export function marketPower(row) {
  const sold = row.perProduct.filter((x) => !x.inDevelopment && x.Q > 0);
  if (!sold.length) return { share: 0, markup: 0 };
  const share = sold.reduce((t, x) => t + x.share, 0) / sold.length;
  const markup = sold.reduce((t, x) => t + (x.P - x.c) / x.P, 0) / sold.length;
  return { share, markup };
}

// Runs after sales, before profit is booked (fines go to s.monthOther).
export function regulatorStep(s, w, events, row) {
  const { share, markup } = marketPower(row);
  const abusive = share > w.regulator.shareThreshold && markup > w.regulator.markupThreshold;
  const r = s.regulator;
  if (r.investigation) {
    if (!abusive) { r.investigation = null; r.watch = 0; events.push({ type: 'investigationClosed' }); return; }
    if (s.month >= r.investigation.deadline) {
      s.monthOther += w.regulator.fine; r.strikes += 1; r.investigation = null; r.watch = 0;
      events.push({ type: 'fine', amount: w.regulator.fine, strikes: r.strikes });
      if (r.strikes >= 2) { s.ended = { reason: 'regulator', month: s.month }; events.push({ type: 'breakup' }); }
    }
    return;
  }
  r.watch = abusive ? r.watch + 1 : 0;
  if (r.watch >= w.regulator.watchMonths) {
    r.investigation = { start: s.month, deadline: s.month + w.regulator.deadlineMonths };
    events.push({ type: 'investigation', share, markup });
    openCrisis(s, 'regulador');
  }
}
