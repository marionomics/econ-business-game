// A random but plausible player, for coverage tests (not for calibration).
import { createRng } from '../../js/rng.js';
import { createRun, act, step, answer, ackEvents } from '../../js/sim/run.js';
import { launchableTemplates } from '../../js/sim/actions.js';

export function randomRun(seed, line, { onPause } = {}) {
  const r = createRng(seed * 31 + 7);
  let run = createRun({ seed, line, meta: { runId: 'test-' + seed } });
  run = act(run, { type: 'launch', templateId: launchableTemplates(run.state, run.world)[0].id });
  for (let i = 0; i < 200 && !run.state.ended; i++) {
    if (run.pending !== null) { const q = run.questions[run.pending]; onPause?.(run, q);
      run = answer(run, q.built.kind === 'mc' ? r.pick(q.built.options).id : String(r.next() < 0.6 ? q.built.answer : r.int(1, 999))); continue; }
    run = ackEvents(run);
    const x = r.next(), ps = run.state.products.filter(p => p.active);
    if (x < 0.15 && ps.length) run = act(run, { type: 'setPrice', uid: r.pick(ps).uid, price: Math.round(r.pick(ps).price * (0.85 + 0.3 * r.next())) });
    else if (x < 0.25 && ps.length) run = act(run, { type: 'setAd', uid: r.pick(ps).uid, ad: r.int(0, 20) * 1000 });
    else if (x < 0.29) run = act(run, { type: 'launch', templateId: r.pick(launchableTemplates(run.state, run.world)).id });
    else if (x < 0.31) run = act(run, { type: 'expand' });
    else if (x < 0.33 && ps.length) { const p = r.pick(ps); run = act(run, { type: 'versions', uid: p.uid, high: p.price + 15, low: p.price - 5 }); }
    run = step(run);
  }
  return run;
}
