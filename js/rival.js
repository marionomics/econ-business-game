// Stage 3: CORE 7.10 pricing game with loyal, relative-price-sensitive and price-driven customers.

export function myQuantity({ N, loyalShare, priceDrivenShare }, me, rival) {
  const loyalEach = Math.round((loyalShare * N) / 2);
  const priceDriven = Math.round(priceDrivenShare * N);
  const relative = Math.max(0, N - 2 * loyalEach - priceDriven);
  const relEach = relative / 2;
  let q = loyalEach;
  if (me === rival) q += relEach;
  else if (me === 'L') q += relative;
  if (me === 'L') q += rival === 'L' ? priceDriven / 2 : priceDriven;
  return Math.round(q);
}

const CELLS = ['HH', 'HL', 'LH', 'LL']; // me + rival

export function payoffMatrix(seg, prices, c, F, cRival = c, FRival = F) {
  const m = {};
  for (const cell of CELLS) {
    const [me, riv] = cell;
    const qMe = myQuantity(seg, me, riv);
    const qRiv = myQuantity(seg, riv, me);
    m[cell] = [(prices[me] - c) * qMe - F, (prices[riv] - cRival) * qRiv - FRival];
  }
  return m;
}

const other = (x) => (x === 'H' ? 'L' : 'H');

export function nashEquilibria(m) {
  return CELLS.filter((cell) => {
    const [me, riv] = cell;
    return m[cell][0] >= m[other(me) + riv][0] && m[cell][1] >= m[me + other(riv)][1];
  });
}

export function gameType(m) {
  const ne = nashEquilibria(m);
  const has = (x) => ne.includes(x);
  if (has('HH') && has('LL')) return 'coordinacion';
  const lDomMe = m.LH[0] > m.HH[0] && m.LL[0] > m.HL[0], lDomRiv = m.HL[1] > m.HH[1] && m.LL[1] > m.LH[1];
  const hDomMe = m.HH[0] > m.LH[0] && m.HL[0] > m.LL[0], hDomRiv = m.HH[1] > m.HL[1] && m.LH[1] > m.LL[1];
  if (lDomMe && lDomRiv && m.HH[0] > m.LL[0] && m.HH[1] > m.LL[1]) return 'dilema';
  if (hDomMe && hDomRiv) return 'dominante_H';
  return 'otro';
}

// Rival's best response to my price (ties → H).
export const rivalBestResponse = (m, me) => (m[me + 'H'][1] >= m[me + 'L'][1] ? 'H' : 'L');
// My best response to the rival's price (ties → H).
export const myBestResponse = (m, riv) => (m['H' + riv][0] >= m['L' + riv][0] ? 'H' : 'L');

export function rivalMove(rule, history, m) {
  if (history.length === 0) return 'H';
  const lastMe = history[history.length - 1].me;
  if (rule === 'tit_for_tat') return lastMe;
  if (rule === 'grim') return history.some((h) => h.me === 'L') ? 'L' : 'H';
  return rivalBestResponse(m, lastMe);
}
