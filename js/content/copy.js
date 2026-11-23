// Locale-aware access to the game's text. The text itself lives in copy.es.js / copy.en.js.
import { classifyEnding } from '../sim/endings.js';
import { getLocale } from './locale.js';
import * as es from './copy.es.js';

const PACKS = { es };
export const registerLocalePack = (locale, pack) => { PACKS[locale] = pack; };
const pack = () => PACKS[getLocale()] ?? es;
const pick = (name, key) => pack()[name]?.[key] ?? es[name][key];

export const T = es.T; // the Spanish dictionary (source of truth for keys)
export const t = () => pack().T;
export const cfoLong = () => pack().CFO_LONG ?? es.CFO_LONG;
export const templateName = (id) => pick('TEMPLATE_NAMES', id)?.name ?? id;
export const templateBlurb = (id) => pick('TEMPLATE_NAMES', id)?.blurb ?? '';
export const endingText = (id) => pick('ENDING_TEXT', id);
export const gradingIntro = () => pack().GRADING_INTRO ?? es.GRADING_INTRO;
const quips = () => pack().QUIPS ?? es.QUIPS;
const segmentName = (line) => pick('SEGMENT', line);
const lineName = (line) => pick('LINE', line);

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export const number = (n) => (n < 0 ? '−' : '') + nf.format(Math.abs(n));
export const money = (n) => (n < 0 ? '−$' : '$') + nf.format(Math.round(Math.abs(n)));
export const pct = (x) => `${Math.round(x * 100)}%`;
export const slope = (b) => String(Number(Number(b).toPrecision(3))); // demand slopes are small: keep significant digits

export const CFO_NAME = 'M.A.R.G.E.N.';

const productName = (run, uid) => { const p = run.state.products.find((x) => x.uid === uid); return p ? templateName(p.templateId) : fmt('ui.yourProduct'); };





// ---------------------------------------------------------------------------
export function fmt(key, vars = {}) {
  const tpl = pack().T[key] ?? es.T[key];
  if (tpl === undefined) return `⟦${key}⟧`;
  return tpl.replace(/\{(\$?)(\w+)\}/g, (_, isMoney, name) => {
    const v = vars[name];
    if (v === undefined || v === null || (typeof v === 'number' && !Number.isFinite(v))) return `⟦${name}⟧`;
    if (typeof v === 'number') return isMoney ? money(v) : number(v);
    return String(v);
  });
}

const CHART = { arancel: 'cost', renta: 'cost', salud: 'demand', recesion: 'demand', marca_blanca: 'demand', viral: 'demand', influencer: 'demand' };

export function describeMessage(m, run) {
  const d = m.data ?? {}, w = run.world;
  switch (m.type) {
    case 'wildcard': {
      const vars = { tariff: w.tariff, rent: w.rent, segment: segmentName(run.state.line), product: productName(run, d.params?.uid) };
      return { tone: 'event', text: fmt(`ev.wildcard.${d.id}`, vars), chart: { kind: CHART[d.id] ?? 'demand' } };
    }
    case 'rivalArrives': return { tone: 'event', text: fmt('ev.rivalArrives'), chart: { kind: 'demand' } };
    case 'investigation': return { tone: 'warning', text: fmt('ev.investigation', { markupPct: pct(d.markup ?? 0) }), chart: { kind: 'demand' } };
    case 'investigationClosed': return { tone: 'event', text: fmt('ev.investigationClosed') };
    case 'fine': return { tone: 'warning', text: fmt('ev.fine', { amount: d.amount, strikes: d.strikes }) };
    case 'breakup': return { tone: 'ending', text: fmt('ev.breakup') };
    case 'crisisResolved': return { tone: d.survived ? 'event' : 'warning', text: fmt(d.survived ? 'ev.crisisResolved.ok' : 'ev.crisisResolved.bad', { crisis: fmt(`crisis.${d.id}`) }) };
    case 'ipo': return { tone: 'ending', text: fmt('ev.ipo'), chart: { kind: 'valuation' } };
    case 'bankrupt': return { tone: 'ending', text: fmt('ev.bankrupt') + ' ' + endingText(classifyEnding(run.state)).text, chart: { kind: 'cash' } };
    case 'end36': return { tone: 'ending', text: fmt('ev.end36') };
    case 'repositioned': return { tone: 'event', text: fmt('ev.repositioned', { line: lineName(d.line) }) };
    case 'runway': return { tone: 'warning', text: fmt('ev.runway', { months: d.months }), chart: { kind: 'cash' } };
    case 'belowCost': return { tone: 'warning', text: fmt('ev.belowCost'), chart: { kind: 'cost' } };
    case 'quip': return { tone: 'quip', text: quips()[d.n % quips().length] };
    case 'rejected': return { tone: 'warning', text: fmt(d.reason, { m: w.versionsUnlockMonth }) };
    case 'welcome': return { tone: 'event', text: fmt('ev.welcome', { cfo: CFO_NAME, cash: w.startCash, target: w.ipoTarget }) };
    case 'question': return { tone: 'question', text: fmt('ev.question'), question: d.index };
    case 'feedback': { const q = run.questions[d.index]; return { tone: 'feedback', text: describeFeedback(q, run).title, feedback: d.index }; }
    default: return { tone: 'event', text: m.type };
  }
}

function questionVars(q, run) {
  const v = { ...q.built.vars, answer: q.built.answer };
  if (v.uid) v.product = productName(run, v.uid);
  return v;
}

export function describeQuestion(q, run) {
  const b = q.built, vars = questionVars(q, run);
  return { id: q.id, input: b.kind, prompt: fmt(b.promptKey, vars),
    options: b.kind === 'mc' ? b.options.map((o) => ({ id: o.id, label: fmt(`q.${q.id}.opt.${o.id}`, vars) })) : null };
}

export function describeFeedback(q, run) {
  const b = q.built, vars = questionVars(q, run);
  const label = (id) => fmt(`q.${q.id}.opt.${id}`, vars);
  const yours = b.kind === 'mc' ? label(q.input) : number(q.input ?? 0);
  const right = b.kind === 'mc' ? label(b.answer) : number(b.answer);
  return { correct: q.correct, title: fmt(q.correct ? 'fb.correct' : 'fb.incorrect'), detail: fmt('fb.detail', { yours, right }), explanation: fmt(b.explanationKey, vars) };
}
