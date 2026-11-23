// CFO inbox: every message the run emits. Important ones pause the game until acknowledged.
export const IMPORTANT = new Set(['wildcard', 'rivalArrives', 'investigation', 'investigationClosed', 'fine', 'breakup', 'crisisResolved',
  'ipo', 'bankrupt', 'end36', 'repositioned', 'runway', 'coach']);
export function say(run, type, data = {}) {
  run.inbox.push({ seq: run.seq++, month: run.state.month, type, data });
  if (IMPORTANT.has(type)) run.unseen += 1;
}
