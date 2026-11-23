// Run layer: the state plus CFO inbox, questions, pauses, log and score. Pure.
import { createRng, deriveSeed } from '../rng.js';
import { makeWorld } from './world.js';
import { initialState } from './state.js';
import { applyAction } from './actions.js';
import { tick } from './tick.js';
import { buildFor } from './questions.js';
import { scoreRun } from './score.js';
import { parseNumber, parseNumberCandidates, gradeAnswer } from '../answers.js';

export const MAX_QUESTIONS = 9;
export const MIN_QUESTIONS = 6;
const PULSE_MONTHS = [6, 12, 18, 24, 30, 33];
const IMPORTANT = new Set(['wildcard', 'rivalArrives', 'investigation', 'investigationClosed', 'fine', 'breakup', 'crisisResolved',
  'ipo', 'bankrupt', 'end36', 'repositioned', 'runway']);
const LOG_CAP = 45000;

export function createRun({ seed, line, meta = {} }) {
  const world = makeWorld(seed, line);
  const run = { runId: meta.runId ?? String(seed), seed, line, meta, world, state: initialState(world),
    inbox: [], seq: 0, unseen: 0, questions: [], queue: [], pending: null, fired: {}, inputError: false,
    lastQuip: -99, lastRunway: -99, log: { months: [], events: [], actions: [] }, score: null };
  say(run, 'welcome', { line });
  return run;
}

const say = (run, type, data = {}) => {
  run.inbox.push({ seq: run.seq++, month: run.state.month, type, data });
  if (IMPORTANT.has(type)) run.unseen += 1;
};
const shownCount = (run) => run.questions.length;

function trigger(run, key, ctx = {}, once = key) {
  if (run.state.ended || run.fired[once] || shownCount(run) + run.queue.length >= MAX_QUESTIONS) return;
  const q = buildFor(key, run, createRng(deriveSeed(run.seed, `q:${once}:${run.state.month}`)), ctx);
  if (!q) return;
  run.fired[once] = true;
  run.queue.push({ ...q, month: run.state.month });
  nextQuestion(run);
}
function nextQuestion(run) {
  if (run.pending !== null || !run.queue.length) return;
  const q = run.queue.shift();
  run.questions.push({ ...q, answered: false, correct: false, input: null });
  run.pending = run.questions.length - 1;
  say(run, 'question', { index: run.pending });
}

function finishIfEnded(run) {
  if (run.state.ended) { run.queue = []; run.score = scoreRun(run); }
}

export function act(input, action) {
  const run = structuredClone(input);
  if (run.state.ended) return run;
  const r = applyAction(run.state, run.world, action);
  if (!r.ok) { say(run, 'rejected', { reason: r.reason, action: action.type }); return run; }
  run.state = r.state;
  run.log.actions.push({ m: run.state.month, t: action.type, ...(action.templateId ? { id: action.templateId } : {}) });
  if (action.type === 'launch') { const p = run.state.products.at(-1); trigger(run, 'launch', { uid: p.uid }, `launch:${action.templateId}`); }
  if (action.type === 'expand') trigger(run, 'expand', {}, 'expand');
  if (action.type === 'versions') trigger(run, 'versions', { uid: action.uid }, 'versions');
  return run;
}

export function step(input) {
  if (input.pending !== null || input.state.ended) return input;
  const run = structuredClone(input);
  const { state, events } = tick(run.state, run.world);
  run.state = state;
  const s = state, last = s.history.at(-1);
  run.log.months.push({ m: s.month, p: s.products.filter((p) => p.active).map((p) => [p.uid, p.price, p.ad]) });
  for (const e of events) {
    say(run, e.type, e);
    run.log.events.push({ m: s.month, t: e.type, ...(e.id ? { id: e.id } : {}) });
    if (e.type === 'wildcard') trigger(run, `wildcard:${e.id}`, {}, `wildcard:${e.id}`);
    if (e.type === 'rivalArrives') trigger(run, 'rivalArrives');
    if (e.type === 'investigation') trigger(run, 'investigation', {}, `investigation:${s.month}`);
  }
  if (!s.ended) {
    if (PULSE_MONTHS.includes(s.month) && shownCount(run) + run.queue.length < MIN_QUESTIONS) trigger(run, 'pulse', {}, `pulse:${s.month}`);
    // Warnings and idle remarks.
    const burn = last && last.profit < 0 ? -last.profit : 0;
    if (burn > 0 && s.cash < 3 * burn && s.month - run.lastRunway >= 3) { run.lastRunway = s.month; say(run, 'runway', { months: Math.max(0, Math.floor(s.cash / burn)) }); }
    if (last?.perProduct.some((x) => !x.inDevelopment && x.Q > 0 && x.P < x.c)) { if (s.month - (run.lastBelowCost ?? -99) >= 3) { run.lastBelowCost = s.month; say(run, 'belowCost', {}); } }
    else if (s.month - run.lastQuip >= 4 && createRng(deriveSeed(run.seed, `quip:${s.month}`)).next() < 0.5) { run.lastQuip = s.month; say(run, 'quip', { n: createRng(deriveSeed(run.seed, `qn:${s.month}`)).int(0, 99) }); }
  }
  compactLog(run);
  finishIfEnded(run);
  return run;
}

export function answer(input, raw) {
  if (input.pending === null) return input;
  const run = structuredClone(input);
  run.inputError = false;
  const q = run.questions[run.pending]; const b = q.built;
  let value = raw, candidates = raw;
  if (b.kind === 'numeric') {
    candidates = typeof raw === 'number' ? [raw] : parseNumberCandidates(raw);
    value = typeof raw === 'number' ? raw : parseNumber(raw);
    if (!candidates.length || value === null) { run.inputError = true; return run; }
  } else if (!b.options.some((o) => o.id === raw)) { run.inputError = true; return run; }
  q.answered = true; q.input = value; q.correct = gradeAnswer(b, candidates);
  run.log.actions.push({ m: run.state.month, t: 'answer', id: q.id, ok: q.correct });
  run.pending = null;
  say(run, 'feedback', { index: run.questions.length - 1 });
  nextQuestion(run);
  finishIfEnded(run);
  return run;
}

export function ackEvents(input) { if (!input.unseen) return input; return { ...input, unseen: 0 }; }

export function pauseReasons(run) {
  const r = [];
  if (run.pending !== null) r.push('question');
  if (run.unseen > 0) r.push('event');
  if (run.state.ended) r.push('ended');
  return r;
}

function compactLog(run) {
  while (JSON.stringify(run.log).length > LOG_CAP && run.log.months.length > 1) run.log.months.shift();
}
