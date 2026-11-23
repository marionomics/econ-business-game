// DOM rendering. All text comes from content.js (describeStep / T); this file only lays it out.
import { fmt, money, number, pct, MANUAL, GRADING_INTRO, ENDING_TEXT } from './content.js';
import { ENDINGS } from './endings.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paras = (text) => String(text ?? '').split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join('');

function sparkline(points) {
  if (points.length < 2) return '';
  const w = 200, h = 26, lo = Math.min(0, ...points), hi = Math.max(...points, 1);
  const x = (i) => (i / (points.length - 1)) * w, y = (v) => h - 2 - ((v - lo) / (hi - lo)) * (h - 4);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><line class="zero" x1="0" x2="${w}" y1="${y(0)}" y2="${y(0)}"/><path class="line" d="${d}"/></svg>`;
}

function ledger(view) {
  const d = view.dashboard; const low = d.cash >= 0 && d.cash < view.lowCash;
  const profit = d.lastProfit === null ? '' : `<span>${esc(fmt('ui.lastProfit'))}: <b class="${d.lastProfit < 0 ? 'neg' : 'pos'}">${esc(money(d.lastProfit))}</b></span>`;
  const share = d.marketShare === null ? '' : `<span>${esc(fmt('ui.share'))}: ${esc(pct(d.marketShare))}</span>`;
  return `<header class="ledger"><div class="ledger-in">
    <div class="firm"><i class="stamp" aria-hidden="true"></i><span>${esc(view.firmName)}</span></div>
    <div class="stage">${esc(fmt(`ui.stage.${d.stage}`))} · ${esc(fmt('ui.quarter'))} ${d.quarter}</div>
    <div class="cash ${d.cash < 0 ? 'neg' : low ? 'low' : ''}"><small>${esc(fmt('ui.cash'))}</small><b>${esc(money(d.cash))}</b></div>
    <div class="spark">${sparkline(view.cashHistory)}<span class="stats">${profit}${share}<span>${esc(fmt('ui.loyal'))}: ${esc(pct(d.loyalShare))}</span></span></div>
    <div class="tools"><button class="tool" data-act="manual">${esc(fmt('ui.manual'))}</button><button class="tool" data-act="gallery">${esc(fmt('ui.gallery'))}</button></div>
  </div></header>`;
}

function table(t) {
  return `<table><thead><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function matrix(m) {
  return `<table class="matrix"><caption>${esc(m.caption)}</caption>
    <thead><tr><th>${esc(fmt('ui.matrix.you'))} \\ rival</th><th>${esc(m.colHigh)}</th><th>${esc(m.colLow)}</th></tr></thead>
    <tbody><tr><th>${esc(m.colHigh)}</th><td>${esc(m.cells.HH)}</td><td>${esc(m.cells.HL)}</td></tr>
    <tr><th>${esc(m.colLow)}</th><td>${esc(m.cells.LH)}</td><td>${esc(m.cells.LL)}</td></tr></tbody></table>`;
}
const options = (opts) => `<div class="options">${opts.map((o) => `<button class="opt" data-opt="${esc(o.id)}">${esc(o.label)}</button>`).join('')}</div>`;
const cfo = (body) => `<div class="speech"><p class="who">Tu CFO</p>${paras(body)}</div>`;

function stepBody(d, view) {
  const err = view.inputError ? `<p class="err" role="alert">${esc(fmt('ui.inputError'))}</p>` : '';
  switch (d.kind) {
    case 'narration': return `<h2>${esc(d.title)}</h2>${cfo(d.body)}<button class="primary" data-next>${esc(d.button)}</button>`;
    case 'decision': return `${cfo(d.body)}${d.table ? table(d.table) : ''}${d.matrix ? matrix(d.matrix) : ''}${options(d.options)}`;
    case 'quarterResult': return `<h2>${esc(d.title)}</h2>${d.numbers ? `<div class="numbers">${esc(d.numbers)}</div>` : ''}${cfo(d.body)}<button class="primary" data-next>${esc(d.button)}</button>`;
    case 'checkpoint': return `${cfo(d.body)}${d.matrix ? matrix(d.matrix) : ''}${d.input === 'mc' ? options(d.options)
      : `<form data-num><label class="field">Tu respuesta<input name="v" inputmode="decimal" autocomplete="off" required></label>${err}<button class="primary">${esc(d.button)}</button></form>`}`;
    case 'feedback': return `<p class="verdict ${d.correct ? 'ok' : 'bad'}">${esc(d.title)}</p><p class="note">${esc(d.detail)}</p>${cfo(d.body)}<button class="primary" data-next>${esc(d.button)}</button>`;
    case 'openText': return `<h2>${esc(d.title)}</h2>${cfo(d.body)}<form data-text><textarea name="v" placeholder="${esc(d.placeholder)}" maxlength="4000" required></textarea><button class="primary">${esc(d.button)}</button></form>`;
    case 'ending': return `<section class="ending"><h2>${esc(d.title)}</h2>${paras(d.body)}
      <h2>${esc(d.scoreTitle)}</h2><table class="score"><tbody>${d.rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
      <p class="note">${esc(d.valueLine)}</p><p class="note">${esc(d.note)}</p>
      <p class="note" role="status">${esc(view.sendStatus ? fmt(`ui.${view.sendStatus}`) : '')}</p>
      <button class="primary" data-new>${esc(d.button)}</button></section>`;
    default: return '';
  }
}

function welcome(view) {
  const id = view.identity ?? {};
  return `<div class="wrap"><h1>${esc(fmt('ui.title'))}</h1><p class="lede">${esc(fmt('ui.subtitle'))}</p>
    <form data-welcome>
      <label class="field">${esc(fmt('ui.welcome.name'))}<input name="playerName" value="${esc(id.playerName)}" autocomplete="name" required></label>
      <label class="field">${esc(fmt('ui.welcome.id'))}<input name="playerId" value="${esc(id.playerId)}" required></label>
      <label class="field">${esc(fmt('ui.welcome.code'))}<input name="classCode" value="${esc(id.classCode)}" required></label>
      <label class="field">${esc(fmt('ui.welcome.firm'))}<input name="firmName" value="${esc(id.firmName)}" maxlength="40" required></label>
      ${view.error ? `<p class="err" role="alert">${esc(view.error)}</p>` : ''}
      <button class="primary">${esc(fmt('ui.welcome.start'))}</button>
    </form><h2>Calificación</h2><div class="grading">${esc(GRADING_INTRO)}</div></div>`;
}

function panel(view) {
  if (view.panel === 'manual') return `<div class="panel" role="dialog" aria-label="${esc(fmt('ui.manual'))}"><div class="wrap manual">
    <div class="panel-head"><h2>${esc(fmt('ui.manual'))}</h2><button class="tool" data-act="close">${esc(fmt('ui.close'))}</button></div>
    ${MANUAL.map((m) => `<h3>${esc(m.title)}</h3><p>${esc(m.body)}</p>`).join('')}</div></div>`;
  if (view.panel === 'gallery') { const g = view.gallery ?? [];
    return `<div class="panel" role="dialog" aria-label="${esc(fmt('ui.gallery'))}"><div class="wrap">
    <div class="panel-head"><h2>${esc(fmt('ui.gallery'))}</h2><button class="tool" data-act="close">${esc(fmt('ui.close'))}</button></div>
    <p>${esc(fmt('ui.galleryIntro', { n: g.length, total: ENDINGS.length }))}</p>
    <ul class="gallery">${ENDINGS.map((e) => g.includes(e.id) ? `<li>${esc(ENDING_TEXT[e.id].title)}</li>` : `<li class="locked">${esc(fmt('ui.locked'))}</li>`).join('')}</ul></div></div>`; }
  return '';
}

export function render(root, view, h) {
  if (view.kind === 'welcome') root.innerHTML = welcome(view);
  else root.innerHTML = `${ledger(view)}<main class="wrap enter">${view.notice ? `<p class="note">${esc(view.notice)}</p>` : ''}${stepBody(view.described, view)}</main>${panel(view)}`;
  const q = (s) => root.querySelector(s);
  root.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => { b.disabled = true; h.onInput(b.dataset.opt); }));
  q('[data-next]')?.addEventListener('click', () => h.onInput(null));
  q('[data-new]')?.addEventListener('click', (e) => { e.target.disabled = true; h.onNewRun(); });
  q('form[data-num]')?.addEventListener('submit', (e) => { e.preventDefault(); h.onInput(e.target.v.value); });
  q('form[data-text]')?.addEventListener('submit', (e) => { e.preventDefault(); e.target.querySelector('button').disabled = true; h.onInput(e.target.v.value); });
  q('form[data-welcome]')?.addEventListener('submit', (e) => { e.preventDefault(); h.onStart(Object.fromEntries(new FormData(e.target))); });
  root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => h.onPanel(b.dataset.act === 'close' ? null : b.dataset.act)));
  const focusable = q('.panel .tool') ?? q('main input, main textarea') ?? q('main .opt, main .primary');
  if (view.kind !== 'welcome' && !view.keepScroll) window.scrollTo(0, 0);
  focusable?.focus({ preventScroll: true });
}
