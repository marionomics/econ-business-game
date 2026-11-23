// Wires storage + game + ui + results.
import { createRun, currentStep, advance, dashboard } from './game.js';
import { describeStep, fmt } from './content.js';
import { newSeed } from './rng.js';
import { render } from './ui.js';
import * as store from './storage.js';
import { buildResultRow, sendResult, flushQueue } from './results.js';
import { APPS_SCRIPT_URL, CLASS_CODES } from './config.js';

const root = document.getElementById('app');
let run = null, panel = null, sendStatus = null, notice = null;

function show() {
  if (!run) { render(root, { kind: 'welcome', identity: store.getIdentity() }, handlers); return; }
  const step = currentStep(run);
  render(root, {
    kind: 'step', described: describeStep(step, run), dashboard: dashboard(run), firmName: run.meta.firmName,
    cashHistory: [run.params.cash0, ...run.state.quarters.map((q) => q.cash)], lowCash: run.params.F,
    inputError: run.inputError, sendStatus, notice, panel, gallery: store.getGallery(),
  }, handlers);
}

function startRun(identity) {
  sendStatus = null; notice = null;
  run = createRun({ seed: newSeed(), ...identity, runNumber: store.nextRunNumber() });
  store.saveCurrentRun(run);
  show();
}

async function onEnding() {
  store.addToGallery(run.ending);
  store.clearCurrentRun();
  sendStatus = 'sending'; show();
  sendStatus = await sendResult(APPS_SCRIPT_URL, buildResultRow(run, store.getGallery()));
  show();
}

const handlers = {
  onStart(form) {
    const id = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v).trim()]));
    if (!id.playerName || !id.playerId || !id.classCode || !id.firmName) return render(root, { kind: 'welcome', identity: id, error: fmt('ui.welcome.missing') }, handlers);
    if (CLASS_CODES.length && !CLASS_CODES.map((c) => c.toLowerCase()).includes(id.classCode.toLowerCase()))
      return render(root, { kind: 'welcome', identity: id, error: fmt('ui.welcome.badCode') }, handlers);
    store.setIdentity(id);
    startRun(id);
  },
  onInput(value) {
    const wasEnding = !!run.ending;
    run = advance(run, value);
    notice = null;
    if (!wasEnding && run.ending) { onEnding(); return; }  // send once, even if a last result screen is still pending
    store.saveCurrentRun(run);
    show();
  },
  onNewRun() { startRun(store.getIdentity()); },
  onPanel(p) { panel = p; show(); },
};

flushQueue(APPS_SCRIPT_URL).catch(() => {});
run = store.loadCurrentRun();
if (run) notice = fmt('ui.resume');
show();
