// Top bar + dashboard tabs. Pure rendering from (run, ui, clock) to HTML strings.
import { esc, icon } from './dom.js';
import { button, tabs, card, stepper, infoButton, richInline, langSwitch } from './components.js';
import { lineChart, demandChart, isoprofitChart, costChart } from './charts.js';
import { fmt, money, number, pct, slope, t, templateName, templateBlurb } from '../content/copy.js';
import { productDemand, productCost, surplus } from '../sim/market.js';
import { valuation, sustained, ipoTargetOf } from '../sim/valuation.js';
import { launchableTemplates } from '../sim/actions.js';

const TABS = ['finanzas', 'mercado', 'costos', 'productos', 'valuacion'];
const L = (key, vars) => richInline(fmt(key, vars));
const nameOf = (p) => templateName(p.templateId);
const active = (s) => s.products.filter((p) => p.active);

export function focusProduct(run, ui) {
  const ps = active(run.state);
  return ps.find((p) => p.uid === ui.focus) ?? ps.find((p) => run.state.month > p.readyAt) ?? ps[0] ?? null;
}

// ---------- Top bar ----------
export function renderTopbar(run, ui, clock) {
  const s = run.state, w = run.world, last = s.history.at(-1);
  const val = last?.valuation ?? valuation(s, w).value;
  const sus = sustained(s.history);
  const progress = Math.max(0, Math.min(1, sus / ipoTargetOf(s, w)));
  const playing = !clock.paused;
  const reason = clock.paused ? (s.ended ? '' : fmt(`ui.paused.${clock.reason && t()[`ui.paused.${clock.reason}`] ? clock.reason : 'user'}`)) : '';
  return `<header class="topbar"><div class="topbar-in">
    <div class="brand"><span>${esc(run.meta.firmName ?? fmt('ui.title'))}</span><small>${esc(fmt('ui.month', { m: s.month }))} · ${esc(fmt(`ui.line.${s.line}`))}</small></div>
    <div class="clockctl" data-tour="clock">
      ${s.ended ? button({ label: fmt('ui.end.show'), variant: 'outline', size: 'sm', attrs: 'data-show-ending' }) + button({ label: fmt('ui.end.new'), size: 'sm', attrs: 'data-newrun' })
        : button({ label: playing ? fmt('ui.pause') : fmt('ui.play'), variant: playing ? 'outline' : 'default', size: 'sm', ico: playing ? 'pause' : 'play', attrs: `data-clock="${playing ? 'pause' : 'play'}" data-tour="clock-play"` })}
      ${button({ label: fmt('ui.speed1'), variant: 'ghost', size: 'sm', attrs: `data-speed="1" aria-pressed="${clock.speed === 1}"` })}
      ${button({ label: fmt('ui.speed2'), variant: 'ghost', size: 'sm', attrs: `data-speed="2" aria-pressed="${clock.speed === 2}"` })}
    </div>
    <div class="kpis">
      <div class="kpi" data-tour="cash"><small>${esc(fmt('ui.cash'))} <span data-tour="info">${infoButton('flujo_caja')}</span></small><b class="${s.cash < 0 ? 'neg' : ''}">${esc(money(s.cash))}</b></div>
      <div class="kpi" data-tour="valuation"><small>${esc(fmt('ui.valuation'))} ${infoButton('valuacion')}</small><b>${esc(money(val))}</b></div>
      <div class="toollinks">${langSwitch()}${s.ended ? '' : button({ label: fmt('ui.restart'), variant: 'ghost', size: 'sm', attrs: 'data-restart' })}${button({ label: fmt('ui.manual'), variant: 'ghost', size: 'sm', ico: 'book', attrs: 'data-dialog="manual"' })}
        ${button({ label: fmt('ui.gallery'), variant: 'ghost', size: 'sm', ico: 'star', attrs: 'data-dialog="gallery"' })}</div>
    </div>
    <div class="progress" role="progressbar" aria-valuenow="${Math.round(progress * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(fmt('ui.aria.progress'))}"><i style="width:${(progress * 100).toFixed(1)}%"></i></div>
    <div class="progress-label"><span>${esc(fmt('ui.month', { m: s.month }))}</span><span>${L('ui.target', { target: ipoTargetOf(s, w) })} ${infoButton('ipo')}</span></div>
    ${reason ? `<div class="pausebar" role="status">${esc(reason)}</div>` : ''}
  </div></header>`;
}

// ---------- Tabs ----------
export function renderDashboard(run, ui) {
  const tabItems = TABS.map((id) => ({ id, label: fmt(`ui.tab.${id}`) }));
  const body = { finanzas, mercado, costos, productos, valuacion }[ui.tab] ?? finanzas;
  return tabs({ items: tabItems, active: ui.tab }) + `<div class="tabpanel" role="tabpanel">${body(run, ui)}</div>`;
}

function productPicker(run, ui) {
  const ps = active(run.state); if (ps.length < 2) return '';
  const f = focusProduct(run, ui);
  return `<div class="tabs">${ps.map((p) => `<button class="tab${p.uid === f?.uid ? ' active' : ''}" data-focus="${esc(p.uid)}">${esc(nameOf(p))}</button>`).join('')}</div>`;
}
const empty = (msg) => card({ body: `<p class="muted">${esc(msg)}</p>` });

function finanzas(run) {
  const s = run.state, h = s.history, last = h.at(-1), prev = h.at(-2);
  if (!last) return empty(fmt('ui.empty.firstMonth'));
  const rowsDef = [['ui.fin.revenue', 'revenue'], ['ui.fin.cogs', 'cogs', -1], ['ui.fin.contribution', 'contribution'], ['ui.fin.fixed', 'fixed', -1],
    ['ui.fin.ads', 'ads', -1], ['ui.fin.other', 'other', -1]];
  const cell = (r, k, sign) => (r ? `<td class="${sign < 0 ? 'muted' : ''}">${esc(money((sign ?? 1) * r[k]))}</td>` : '<td></td>');
  const table = `<table><thead><tr><th></th><th>${prev ? esc(fmt('ui.fin.monthCol', { m: prev.month })) : ''}</th><th>${esc(fmt('ui.fin.monthCol', { m: last.month }))}</th></tr></thead><tbody>
    ${rowsDef.map(([key, k, sign]) => `<tr><td>${L(key)}</td>${cell(prev, k, sign)}${cell(last, k, sign)}</tr>`).join('')}
    <tr class="total"><td>${esc(fmt('ui.fin.profit'))}</td>${prev ? `<td class="${prev.profit < 0 ? 'neg' : 'pos'}">${esc(money(prev.profit))}</td>` : '<td></td>'}<td class="${last.profit < 0 ? 'neg' : 'pos'}">${esc(money(last.profit))}</td></tr></tbody></table>`;
  const chart = lineChart({ series: [{ label: fmt('ui.cash'), points: [run.world.startCash, ...h.map((r) => r.cash)] }], label: fmt('ui.chart.cash') });
  return `<div class="grid2">${card({ title: L('ui.fin.statement', { m: last.month }), body: table })}${card({ title: L('ui.fin.cashflow'), body: `<div class="chart">${chart}</div>` })}</div>`
    + card({ body: `<p class="muted">${L('ui.fin.balance', { cash: s.cash, n: s.expansions, p: active(s).length })}</p>` });
}

function productNow(run, p) {
  const s = run.state, w = run.world, d = productDemand(p, s, w), c = productCost(p, s, w);
  const row = s.history.at(-1)?.perProduct.find((x) => x.uid === p.uid);
  return { d, c, row, sp: surplus(d, p.versions ? p.versions.low : p.price, c) };
}

function mercado(run, ui) {
  const p = focusProduct(run, ui); if (!p) return empty(fmt('ui.empty.noProducts'));
  const { d, c, row, sp } = productNow(run, p), s = run.state;
  const chart = demandChart({ a: d.a, b: d.b, c, P: p.price, versions: p.versions, label: fmt('ui.chart.demandOf', { product: nameOf(p) }) });
  const legend = `<div class="legend"><span><i style="background: color-mix(in oklch, var(--primary) 22%, transparent)"></i>${L('ui.mkt.cs')}</span>
    <span><i style="background: color-mix(in oklch, var(--pos) 25%, transparent)"></i>${L('ui.mkt.ps')}</span>
    <span><i style="background: color-mix(in oklch, var(--muted-foreground) 35%, transparent)"></i>${L('ui.mkt.dwl')}</span></div>`;
  const rival = s.rival.active ? money(s.rival.prices[p.uid] ?? 0) : fmt('ui.mkt.norival');
  const eps = d.a > p.price ? p.price / (d.a - p.price) : null;
  const stats = [[L('ui.mkt.share') + ' ' + infoButton('lealtad'), row && !row.inDevelopment ? pct(row.share) : '—'], [esc(fmt('ui.mkt.rival')) + ' ' + infoButton('competencia'), esc(rival)],
    [L('ui.mkt.elasticity'), eps === null ? '—' : number(Math.round(eps * 100) / 100)], [esc(fmt('ui.mkt.demandEq')), `P = ${number(d.a)} − ${slope(d.b)}·Q`],
    [L('ui.mkt.cs'), money(sp.cs)], [L('ui.mkt.ps'), money(sp.ps)], [L('ui.mkt.dwl'), money(sp.dwl)]];
  return productPicker(run, ui) + `<div class="grid2">${card({ title: L('ui.mkt.title', { product: nameOf(p) }), body: `<div class="chart" data-tour="demand-chart">${chart}</div>${legend}` })}
    ${card({ body: stats.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${typeof v === 'string' && v.startsWith('<') ? v : esc(v)}</b></div>`).join('') })}</div>`;
}

function costos(run, ui) {
  const p = focusProduct(run, ui); if (!p) return empty(fmt('ui.empty.noProducts'));
  const { d, c, row } = productNow(run, p), s = run.state;
  const F = s.F / Math.max(1, active(s).length) + p.fixedMonthly;
  const iso = isoprofitChart({ a: d.a, b: d.b, c, F, P: p.versions ? p.versions.low : p.price, label: fmt('ui.chart.iso') });
  const cost = costChart({ F, c, qMax: (d.a / d.b) || 1, Q: row?.Q || null, label: fmt('ui.chart.cost') });
  const stats = [[L('ui.cost.mc'), money(c)], [esc(fmt('ui.cost.F')) + ' ' + infoButton('costo_fijo'), money(F)],
    [L('ui.cost.ac'), row?.Q ? money(c + F / row.Q) : '—']];
  return productPicker(run, ui) + `<div class="grid2">${card({ title: L('ui.cost.iso'), body: `<div class="chart">${iso}</div>` })}
    ${card({ title: L('ui.cost.title', { product: nameOf(p) }), body: `<div class="chart">${cost}</div>` + stats.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${esc(v)}</b></div>`).join('') })}</div>`
    + card({ body: `<p class="muted">${esc(fmt('ui.cost.note'))}</p>` });
}

function productos(run, ui) {
  const s = run.state, w = run.world;
  const list = active(s).map((p) => {
    const dev = s.month <= p.readyAt;
    const { d, c } = productNow(run, p);
    const versions = s.month >= w.versionsUnlockMonth
      ? `<div class="controls">${stepper({ id: `vhigh:${p.uid}`, value: ui.drafts?.[p.uid]?.high ?? p.versions?.high ?? Math.round((2 * d.a + c) / 3), min: 1, max: p.a0 * 2, label: esc(fmt('ui.prod.high')) })}
         ${stepper({ id: `vlow:${p.uid}`, value: ui.drafts?.[p.uid]?.low ?? p.versions?.low ?? Math.round((d.a + 2 * c) / 3), min: 1, max: p.a0 * 2, label: esc(fmt('ui.prod.low')) })}</div>
         ${button({ label: p.versions ? fmt('ui.prod.versionsUpdate') : fmt('ui.prod.versions').replace(/\[\[(\w+)\|([^\]]*)\]\]/g, '$2') + ` (${money(w.versionsCost)})`, variant: 'outline', size: 'sm', attrs: `data-act="versions" data-uid="${esc(p.uid)}"` })} ${infoButton('discriminacion_precios')}`
      : `<p class="muted">${esc(fmt('ui.prod.versionsLocked', { m: w.versionsUnlockMonth }))} ${infoButton('discriminacion_precios')}</p>`;
    return `<div class="product"><div class="product-head"><h4>${esc(nameOf(p))}</h4>
      <span class="muted">${dev ? esc(fmt('ui.prod.dev', { m: p.readyAt + 1 })) : `CMg ${esc(money(c))} · ${L('ui.prod.loyal', { pct: pct(p.loyalty) })}`}</span></div>
      <div class="controls">${p.versions ? `<p class="muted">${esc(fmt('ui.prod.versionsNote'))}</p>` : stepper({ id: `price:${p.uid}`, value: p.price, min: 1, max: p.a0 * 2, label: esc(fmt('ui.prod.price')) })}
      ${stepper({ id: `ad:${p.uid}`, value: p.ad, min: 0, max: 10 * p.launchCost, step: 1000, label: L('ui.prod.ad') })}</div>
      <div style="margin-top:10px" data-tour="versions:${esc(p.uid)}">${versions}</div>
      <div style="margin-top:10px">${button({ label: fmt('ui.prod.discontinue'), variant: 'destructive', size: 'sm', attrs: `data-act="discontinue" data-uid="${esc(p.uid)}"` })}</div></div>`;
  }).join('') || `<p class="muted">${esc(fmt('ui.prod.none'))}</p>`;
  const launch = launchableTemplates(s, w).map((t) => `<button class="btn btn-outline" data-act="launch" data-template="${esc(t.id)}"${s.repositioning ? ' disabled' : ''}>
    <span>${esc(templateName(t.id))}</span><small>${esc(templateBlurb(t.id))}</small><small>${esc(fmt('ui.prod.cost', { cost: t.launchCost, n: t.devMonths }))}</small></button>`).join('');
  const plant = `${button({ label: fmt('ui.prod.expand', { cost: w.plant.expandCost, dF: w.plant.expandDF, dc: w.plant.expandDc }), variant: 'outline', size: 'sm', attrs: `data-act="expand" data-tour="expand"${s.expansions >= w.plant.maxExpansions ? ' disabled' : ''}` })} ${infoButton('economias_escala')}
    <div style="margin-top:8px">${button({ label: fmt('ui.prod.reposition', { cost: w.reposition.cost, n: w.reposition.months }).replace(/\[\[(\w+)\|([^\]]*)\]\]/g, '$2'), variant: 'ghost', size: 'sm', attrs: `data-act="reposition"${s.repositioning ? ' disabled' : ''}` })} ${infoButton('reposicionamiento')}</div>`;
  return card({ title: esc(fmt('ui.prod.yours')), body: list }) + card({ title: `${esc(fmt('ui.prod.launch'))} ${infoButton('saturacion')}`, body: `<div class="launch" data-tour="launch">${launch}</div>` })
    + card({ title: esc(fmt('ui.prod.plant')), body: plant });
}

function valuacion(run) {
  const s = run.state, w = run.world, v = valuation(s, w);
  const series = [{ label: fmt('ui.valuation'), points: s.history.map((r) => r.valuation ?? 0) }];
  const parts = fmt('ui.val.parts', { base: v.parts.base, growth: pct(v.parts.growth), margin: pct(v.parts.margin), reg: v.parts.regulator });
  return card({ title: L('ui.val.title'), body: `<p class="num">${esc(fmt('ui.val.line', { annual: v.annualProfit, mult: v.multiple, cash: v.cash, value: v.value }))}</p>
      <p class="muted">${esc(parts)}</p><p>${L('ui.val.sustained', { v: sustained(s.history), target: ipoTargetOf(s, w) })}</p>` })
    + card({ body: `<div class="chart">${lineChart({ series, target: ipoTargetOf(s, w), label: fmt('ui.chart.valuation') })}</div>` });
}

// Chart for a CFO message, from the current run.
export function messageChart(kind, run) {
  const s = run.state, p = focusProduct(run, {});
  if (kind === 'cash') return lineChart({ series: [{ label: fmt('ui.cash'), points: [run.world.startCash, ...s.history.map((r) => r.cash)] }], label: fmt('ui.chart.cash') });
  if (kind === 'valuation') return lineChart({ series: [{ label: fmt('ui.valuation'), points: s.history.map((r) => r.valuation ?? 0) }], target: ipoTargetOf(s, run.world), label: fmt('ui.chart.valuation') });
  if (!p) return '';
  const { d, c } = productNow(run, p);
  if (kind === 'cost') return isoprofitChart({ a: d.a, b: d.b, c, F: s.F / Math.max(1, active(s).length) + p.fixedMonthly, P: p.price, label: fmt('ui.chart.iso') });
  return demandChart({ a: d.a, b: d.b, c, P: p.price, versions: p.versions, label: fmt('ui.chart.demandOf', { product: nameOf(p) }) });
}
export { icon };
