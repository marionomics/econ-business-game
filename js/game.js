// Run state machine: the UI only calls createRun, currentStep, advance, dashboard.
import { generateParams } from './params.js';
import { quantityAt } from './economy.js';
import { SCRIPT, STAGE_OF, initialState, decisionOptions, resolveDecision, decisionApplies,
  stage3Matrix, stage3Prices, stage3Segments } from './engine.js';
import { classifyEnding } from './endings.js';
import { assignConcepts, buildCheckpoint, gradeCheckpoint, parseNumber } from './checkpoints.js';
import { scoreRun, benchmarkValue, firmValue } from './scoring.js';

const SLOT_OFFSET = { s1: 0, s2: 3, s3: 6 };

export function createRun({ seed, playerId, playerName, firmName, classCode, runNumber }) {
  const params = generateParams(seed);
  const now = Date.now();
  const run = {
    runId: `${seed}-${now}`, seed, params, state: initialState(params), cursor: 0,
    meta: { playerId, playerName, firmName, classCode, runNumber },
    concepts: assignConcepts(seed), cpIndex: 0, checkpoints: [], choices: {},
    pending: null, openText: null, ending: null, score: null, benchmark: null,
    inputError: false, startedAt: now,
  };
  return normalize(run);
}

function finish(run) {
  run.ending = classifyEnding(run.state, run.params);
  run.benchmark = benchmarkValue(run.params);
  run.score = scoreRun({ ending: run.ending, state: run.state, checkpoints: run.checkpoints }, run.benchmark);
  run.finalValue = firmValue(run.state);
  return run;
}

function normalize(run) {
  if (run.ending) return run;
  while (run.cursor < SCRIPT.length && !run.state.bankrupt) {
    const e = SCRIPT[run.cursor];
    if (e.kind === 'decision' && !decisionApplies(run.state, e.id, run.params)) { run.cursor++; continue; }
    break;
  }
  if (run.state.bankrupt || run.cursor >= SCRIPT.length) finish(run);
  return run;
}

function checkpointAt(run, entry) {
  const concept = run.concepts[entry.slot][run.cpIndex - SLOT_OFFSET[entry.slot]];
  return buildCheckpoint(concept, run.state, run.params, run.seed, run.cpIndex);
}

function decisionVars(run, id, options) {
  const st = run.state, p = run.params;
  const base = { cash: st.cash, c: st.c, F: st.F };
  if (options[0]?.kind === 'precio') return { ...base, survey: options.map((o) => ({ P: o.price, Q: quantityAt(st.demand, o.price) })) };
  if (id === 's2_inversion') return { ...base, roaster: p.roaster, brand: p.brand };
  if (id === 's3_movida') return { ...base, loyalty: p.loyalty, block: p.block, loyalShare: st.loyalShare, rival: p.rival.name };
  if (id.startsWith('s3_ronda')) return { ...base, ...stage3Prices(st), matrix: stage3Matrix(st, p), rounds: st.rounds,
    round: st.rounds.length + 1, rival: p.rival.name };
  if (id === 's4_oferta') return { ...base, value: Math.round(firmValue(st)), ipoCash: p.ipoCash, rival: p.rival.name };
  return base;
}

function narrationVars(run, id) {
  const st = run.state, p = run.params;
  if (id === 'intro') return { firm: run.meta.firmName, cash: st.cash, c: st.c, F: st.F };
  if (id === 's2_intro') return { cash: st.cash };
  if (id === 's2_choque') return { type: p.shock.type, amount: p.shock.amount, c: st.c, F: st.F };
  if (id === 's3_rival') return { rival: p.rival.name, ...stage3Prices(st), N: stage3Segments(st, p).N };
  return {};
}

export function currentStep(run) {
  if (run.pending) return run.pending;
  if (run.ending) return { kind: 'ending', ending: run.ending, score: run.score };
  const e = SCRIPT[run.cursor];
  if (e.kind === 'narration') return { kind: 'narration', id: e.id, vars: narrationVars(run, e.id) };
  if (e.kind === 'decision') {
    const options = decisionOptions(run.state, e.id, run.params);
    return { kind: 'decision', id: e.id, options, vars: decisionVars(run, e.id, options) };
  }
  if (e.kind === 'checkpoint') return { kind: 'checkpoint', built: checkpointAt(run, e), index: run.cpIndex };
  return { kind: 'openText' };
}

export function advance(input_run, input) {
  const run = structuredClone(input_run);
  run.inputError = false;
  if (run.pending) { run.pending = null; return normalize(run); }
  if (run.ending) return run;
  const e = SCRIPT[run.cursor];
  if (e.kind === 'narration') { run.cursor++; return normalize(run); }
  if (e.kind === 'decision') {
    const options = decisionOptions(run.state, e.id, run.params);
    if (!options.some((o) => o.id === input)) { run.inputError = true; return run; }
    const before = run.state.quarters.length;
    run.state = resolveDecision(run.state, e.id, input, run.params);
    run.choices[e.id] = input;
    run.cursor++;
    if (run.state.quarters.length > before)
      run.pending = { kind: 'quarterResult', decisionId: e.id, quarter: run.state.quarters[run.state.quarters.length - 1],
        bankrupt: run.state.bankrupt };
    else if (run.state.bankrupt) run.pending = { kind: 'quarterResult', decisionId: e.id, quarter: null, bankrupt: true };
    return normalize(run);
  }
  if (e.kind === 'checkpoint') {
    const built = checkpointAt(run, e);
    let value = input;
    if (built.kind === 'numeric') {
      value = typeof input === 'number' ? input : parseNumber(input);
      if (value === null || !Number.isFinite(value)) { run.inputError = true; return run; }
    } else if (!built.options.some((o) => o.id === input)) { run.inputError = true; return run; }
    const correct = gradeCheckpoint(built, value);
    run.checkpoints.push({ itemId: built.itemId, concept: built.concept, input: value, answer: built.answer, correct });
    run.pending = { kind: 'feedback', correct, built, input: value };
    run.cpIndex++; run.cursor++;
    return normalize(run);
  }
  run.openText = String(input ?? '').slice(0, 4000);
  run.cursor++;
  return normalize(run);
}

export function dashboard(run) {
  const st = run.state;
  const last = st.quarters[st.quarters.length - 1];
  const entry = SCRIPT[Math.min(run.cursor, SCRIPT.length - 1)];
  const stage = run.ending ? 4 : entry.kind === 'checkpoint' ? Number(entry.slot[1]) : entry.kind === 'openText' ? 4 : STAGE_OF(entry.id);
  const marketShare = last?.rival ? last.Q / stage3Segments(st, run.params).N : null;
  return { cash: st.cash, lastProfit: last?.profit ?? null, marketShare, loyalShare: st.loyalShare, stage, quarter: st.quarters.length };
}
