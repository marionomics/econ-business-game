// Hand-drawn SVG charts. Colors come from CSS variables of the preset. All functions return SVG strings.
import { esc } from './dom.js';
import { fmt } from '../content/copy.js';

const W = 560, H = 300, PAD = { l: 52, r: 14, t: 14, b: 30 };
const fin = (x) => (Number.isFinite(x) ? x : 0);
const scaler = (x0, x1, y0, y1) => {
  const sx = (x) => PAD.l + ((fin(x) - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r);
  const sy = (y) => H - PAD.b - ((fin(y) - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b);
  return { sx, sy };
};
const poly = (pts, s, cls, style = '') => (pts && pts.length > 2
  ? `<polygon class="${cls}" style="${style}" points="${pts.map(([x, y]) => `${s.sx(x).toFixed(1)},${s.sy(y).toFixed(1)}`).join(' ')}"/>` : '');
const line = (x1, y1, x2, y2, s, style) => `<line x1="${s.sx(x1).toFixed(1)}" y1="${s.sy(y1).toFixed(1)}" x2="${s.sx(x2).toFixed(1)}" y2="${s.sy(y2).toFixed(1)}" style="${style}"/>`;
const text = (x, y, t, anchor = 'start', style = '') => `<text x="${fin(x).toFixed(1)}" y="${fin(y).toFixed(1)}" text-anchor="${anchor}" style="font: 11px var(--font-mono); fill: var(--muted-foreground);${style}">${esc(t)}</text>`;
const short = (n) => { const a = Math.abs(n); const s = a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M' : a >= 1e3 ? Math.round(a / 1e3) + 'k' : String(Math.round(a)); return (n < 0 ? '−' : '') + s; };
const frame = (label, body) => `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const axes = (s, x0, x1, y0, y1, xl, yl) => `${line(x0, y0, x1, y0, s, 'stroke: var(--border)')}${line(x0, y0, x0, y1, s, 'stroke: var(--border)')}`
  + text(PAD.l - 6, s.sy(y1) + 4, short(y1), 'end') + text(PAD.l - 6, s.sy(y0) + 4, short(y0), 'end')
  + text(s.sx(x1), H - 8, xl, 'end') + text(PAD.l - 6, PAD.t - 2 + 10, yl, 'end', 'opacity:0');

// ---- Line chart (cash, valuation) ----
export function lineChart({ series, target = null, label, xLabel = fmt('ui.axis.month') }) {
  const all = series.flatMap((s) => s.points).concat(target ?? []).concat(0);
  let y0 = Math.min(...all), y1 = Math.max(...all); if (y0 === y1) { y1 = y0 + 1; }
  const n = Math.max(2, ...series.map((s) => s.points.length));
  const s = scaler(0, n - 1, y0, y1);
  let body = axes(s, 0, n - 1, y0, y1, xLabel, '');
  if (y0 < 0) body += line(0, 0, n - 1, 0, s, 'stroke: var(--destructive); stroke-dasharray: 3 3');
  if (target !== null) body += line(0, target, n - 1, target, s, 'stroke: var(--primary); stroke-dasharray: 6 4') + text(s.sx(n - 1), s.sy(target) - 4, fmt('ui.axis.target', { v: short(target) }), 'end', 'fill: var(--primary)');
  series.forEach((ser, i) => { if (!ser.points.length) return;
    const d = ser.points.map((v, k) => `${k ? 'L' : 'M'}${s.sx(k).toFixed(1)},${s.sy(v).toFixed(1)}`).join('');
    body += `<path d="${d}" style="fill:none; stroke: var(--chart-${i === 0 ? 4 : 2}); stroke-width: 2"/>`; });
  return frame(label, body);
}

// ---- Demand with surplus areas (CORE 7.7) ----
export function demandGeometry({ a, b, c, P, versions = null }) {
  const qAt = (p) => Math.max(0, (a - p) / b);
  const Qc = qAt(c);
  if (versions) {
    const Qh = qAt(versions.high), Q = qAt(versions.low), lo = versions.low, hi = versions.high;
    return { Q, Qc, Qh,
      cs: [[0, a], [0, hi], [Qh, hi]], cs2: [[Qh, hi], [Qh, lo], [Q, lo]],
      ps: [[0, hi], [Qh, hi], [Qh, lo], [Q, lo], [Q, c], [0, c]],
      dwl: lo > c ? [[Q, lo], [Q, c], [Qc, c]] : [] };
  }
  const Q = qAt(P);
  if (P <= c) return { Q, Qc, cs: [[0, a], [0, P], [Q, P]], ps: [[0, c], [Q, c], [Q, P], [0, P]], dwl: [], loss: true };
  return { Q, Qc, cs: [[0, a], [0, P], [Q, P]], ps: [[0, P], [Q, P], [Q, c], [0, c]], dwl: [[Q, P], [Q, c], [Qc, c]] };
}

export function demandChart({ a, b, c, P, versions = null, label }) {
  const g = demandGeometry({ a, b, c, P, versions });
  const qMax = Math.max(a / b, g.Qc, g.Q) * 1.05 || 1, pMax = Math.max(a, P, c) * 1.05 || 1;
  const s = scaler(0, qMax, 0, pMax);
  let body = axes(s, 0, qMax, 0, pMax, fmt('ui.axis.boxes'), fmt('ui.axis.price'));
  body += poly(g.cs, s, 'cs', 'fill: color-mix(in oklch, var(--primary) 22%, transparent)') + poly(g.cs2, s, 'cs', 'fill: color-mix(in oklch, var(--primary) 22%, transparent)');
  body += poly(g.ps, s, 'ps', g.loss ? 'fill: color-mix(in oklch, var(--destructive) 25%, transparent)' : 'fill: color-mix(in oklch, var(--pos) 25%, transparent)');
  body += poly(g.dwl, s, 'dwl', 'fill: color-mix(in oklch, var(--muted-foreground) 35%, transparent)');
  body += line(0, a, a / b, 0, s, 'stroke: var(--foreground); stroke-width: 2');
  body += line(0, c, qMax, c, s, 'stroke: var(--destructive); stroke-width: 1.5; stroke-dasharray: 5 4') + text(s.sx(qMax) - 2, s.sy(c) - 4, 'CMg ' + short(c), 'end', 'fill: var(--destructive)');
  const pts = versions ? [[g.Qh, versions.high], [g.Q, versions.low]] : [[g.Q, P]];
  for (const [q, p] of pts) body += `<circle cx="${s.sx(q).toFixed(1)}" cy="${s.sy(p).toFixed(1)}" r="5" style="fill: var(--primary)"/>` + text(s.sx(q) + 8, s.sy(p) - 6, '$' + short(p));
  return frame(label, body);
}

// ---- Isoprofit curves: P = c + (π + F)/Q ----
export function isoprofitChart({ a, b, c, F, P, label }) {
  const Q = Math.max(0, (a - P) / b), pi = (P - c) * Q - F;
  const qMax = (a / b) * 1.05 || 1, pMax = Math.max(a, P) * 1.1 || 1;
  const s = scaler(0, qMax, 0, pMax);
  let body = axes(s, 0, qMax, 0, pMax, fmt('ui.axis.boxes'), fmt('ui.axis.price')) + line(0, a, a / b, 0, s, 'stroke: var(--foreground); stroke-width: 2');
  const levels = [pi, pi + Math.abs(pi) * 0.5 + F * 0.3, pi - Math.abs(pi) * 0.5 - F * 0.3];
  levels.forEach((lv, i) => {
    const pts = []; for (let k = 1; k <= 60; k++) { const q = (qMax * k) / 60; const p = c + (lv + F) / q; if (p > 0 && p < pMax) pts.push([q, p]); }
    if (pts.length > 1) body += `<path d="${pts.map(([q, p], k) => `${k ? 'L' : 'M'}${s.sx(q).toFixed(1)},${s.sy(p).toFixed(1)}`).join('')}" style="fill:none; stroke: var(--${i === 0 ? 'primary' : 'chart-2'}); stroke-width: ${i === 0 ? 2 : 1}; stroke-dasharray: ${i === 0 ? 'none' : '4 4'}"/>`;
  });
  body += line(0, c, qMax, c, s, 'stroke: var(--destructive); stroke-dasharray: 5 4');
  if (Q > 0) body += `<circle cx="${s.sx(Q).toFixed(1)}" cy="${s.sy(P).toFixed(1)}" r="5" style="fill: var(--primary)"/>`;
  return frame(label, body);
}

// ---- Average and marginal cost ----
export function costChart({ F, c, qMax, Q = null, label }) {
  const qm = Math.max(qMax, 1), pts = [];
  for (let k = 1; k <= 60; k++) { const q = (qm * k) / 60; pts.push([q, c + F / q]); }
  const yMax = Math.min(Math.max(...pts.map((p) => p[1])), c * 6 + 1) || 1;
  const s = scaler(0, qm, 0, yMax);
  let body = axes(s, 0, qm, 0, yMax, fmt('ui.axis.boxes'), fmt('ui.axis.cost'));
  body += `<path d="${pts.filter((p) => p[1] <= yMax).map(([q, y], k) => `${k ? 'L' : 'M'}${s.sx(q).toFixed(1)},${s.sy(y).toFixed(1)}`).join('')}" style="fill:none; stroke: var(--primary); stroke-width: 2"/>`;
  body += line(0, c, qm, c, s, 'stroke: var(--destructive); stroke-width: 1.5; stroke-dasharray: 5 4') + text(s.sx(qm) - 2, s.sy(c) - 4, 'CMg', 'end', 'fill: var(--destructive)');
  if (Q) body += `<circle cx="${s.sx(Q).toFixed(1)}" cy="${s.sy(Math.min(yMax, c + F / Q)).toFixed(1)}" r="5" style="fill: var(--primary)"/>`;
  return frame(label, body);
}
