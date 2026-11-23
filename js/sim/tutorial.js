// First-run tutorial (spec §4.1): a scripted state inside the run. Pure; functions mutate the run clone they get,
// except the exported actions (tutorialNext, tutorialSkipFix) that clone like the rest of the run API.
import { say } from './inbox.js';
import { quantityAtPrice } from './market.js';
import { launchableTemplates } from './actions.js';

export const TOUR = ['cash', 'valuation', 'clock', 'tabs', 'chat', 'info'];
const WAITING = new Set(['tour', 'launch', 'diagnose', 'fix']);
const active = (run) => !!run.tutorial && run.tutorial.step !== 'done';
const product = (run) => run.state.products.find((p) => p.uid === run.tutorial.uid);
const near = (price, opt) => Math.abs(price - opt) <= 0.05 * opt;

export function initTutorial(run) {
  run.tutorial = { step: 'tour', tour: 0, uid: null, devFrom: null, devLoss: 0, diagnose: null };
  say(run, 'tutorial', { id: `tut.tour.${TOUR[0]}`, tour: true, target: TOUR[0] });
}

export function tutorialNext(input) {
  if (!input.tutorial || input.tutorial.step !== 'tour') return input;
  const run = structuredClone(input), t = run.tutorial;
  t.tour += 1;
  if (t.tour < TOUR.length) say(run, 'tutorial', { id: `tut.tour.${TOUR[t.tour]}`, tour: true, target: TOUR[t.tour] });
  else { t.step = 'launch'; say(run, 'tutorial', { id: 'tut.launch', nav: { tab: 'productos', target: 'launch' } }); }
  return run;
}

export function tutorialSkipFix(input) {
  if (!input.tutorial || input.tutorial.step !== 'fix') return input;
  const run = structuredClone(input); run.tutorial.step = 'verify'; return run;
}

// In the launch step, time only waits if a launch is actually possible (otherwise the run would freeze forever).
const canLaunch = (run) => !run.state.repositioning && launchableTemplates(run.state, run.world).some((t) => run.state.cash >= t.launchCost);
export const tutorialPaused = (run) => active(run) && WAITING.has(run.tutorial.step) && (run.tutorial.step !== 'launch' || canLaunch(run));

export function tutorialBlocksAction(run, action) {
  if (active(run) && action.type === 'launch' && run.state.products.length >= 1) return 'act.tutorialOneProduct';
  if (active(run) && ['tour', 'launch'].includes(run.tutorial.step) && ['expand', 'reposition', 'versions'].includes(action.type)) return 'act.tutorialFirstLaunch';
  return null;
}

// After a successful action. Returns true when the normal launch question must be suppressed.
export function tutorialAfterAct(run, action) {
  if (!active(run)) return false;
  const t = run.tutorial;
  if (action.type === 'launch' && (t.step === 'tour' || t.step === 'launch')) {
    const p = run.state.products.at(-1);
    t.step = 'develop'; t.uid = p.uid; t.devFrom = run.state.month;
    say(run, 'tutorial', { id: 'tut.develop', months: p.devMonths, nav: { target: 'clock-play' } });
    return true;
  }
  if (action.type === 'setPrice' && t.step === 'fix' && action.uid === t.uid && near(product(run).price, t.diagnose.optimal)) t.step = 'verify';
  return false;
}

// After a month. Returns a question to ask ({ key, ctx, once }) or null.
export function tutorialAfterStep(run) {
  if (!active(run) || run.state.ended) return null;
  const t = run.tutorial, s = run.state, p = product(run), last = s.history.at(-1);
  if (!p || !p.active) { t.step = 'done'; return null; }
  if (t.step === 'develop') {
    const row = last?.perProduct.find((x) => x.uid === t.uid);
    if (!row || row.inDevelopment) return null;
    if (row.Q <= 0) { t.step = 'done'; say(run, 'tutorial', { id: 'tut.noSales', price: p.price, a: row.a, nav: { tab: 'productos', target: `price:${t.uid}` } }); return null; }
    const optimal = Math.round((row.a + row.c) / 2);
    const optContribution = (optimal - row.c) * quantityAtPrice(p, s, run.world, optimal);
    const optProfit = Math.round(last.profit - row.contribution + optContribution);
    t.devLoss = Math.max(0, -s.history.filter((h) => h.month > t.devFrom && h.month < s.month).reduce((sum, h) => sum + h.profit, 0));
    t.diagnose = { month: s.month, profit: last.profit, optimal, optProfit };
    t.step = 'diagnose';
    say(run, 'tutorial', { id: 'tut.diagnose', devLoss: t.devLoss, profit: last.profit, optProfit, nav: { tab: 'mercado', target: 'demand-chart' } });
    return { key: 'tutorial', ctx: { uid: t.uid }, once: 'tutorial' };
  }
  if (t.step === 'verify') {
    const before = t.diagnose.profit, after = last.profit;
    t.step = 'done';
    say(run, 'tutorial', after > before ? { id: 'tut.win', before, after } : { id: 'tut.noWin', before, after, optimal: t.diagnose.optimal });
  }
  return null;
}

function afterDiagnose(run) {
  const t = run.tutorial;
  // Already at the optimum: that is the win (comparing next month against a month already at the optimum would say "no rise").
  if (near(product(run).price, t.diagnose.optimal)) { t.step = 'done'; say(run, 'tutorial', { id: 'tut.winAlready', optimal: t.diagnose.optimal, profit: t.diagnose.profit }); return; }
  t.step = 'fix';
  say(run, 'tutorial', { id: 'tut.fix', optimal: t.diagnose.optimal, nav: { tab: 'productos', target: `price:${t.uid}` } });
}
export function tutorialAfterAnswer(run, q) {
  if (!active(run) || run.tutorial.step !== 'diagnose' || q.trigger !== 'tutorial') return;
  afterDiagnose(run);
}
// The diagnose question could not be created (question cap): skip straight to the fix instead of waiting forever.
export function tutorialQuestionUnavailable(run) { if (active(run) && run.tutorial.step === 'diagnose') afterDiagnose(run); }

export function tutorialHighlight(run) {
  if (!active(run)) return null;
  const t = run.tutorial;
  return { tour: TOUR[t.tour], launch: 'launch', develop: 'clock-play', diagnose: 'demand-chart', fix: `price:${t.uid}` }[t.step] ?? null;
}
