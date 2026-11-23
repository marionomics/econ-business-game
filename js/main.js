// Wiring: identity → strategy → live run (clock + dashboard + CFO chat) → ending → results.
import { createRun, act, step, answer, ackEvents, pauseReasons, upgradeRun } from './sim/run.js';
import { tutorialNext, tutorialSkipFix, tutorialHighlight, tutorialPaused } from './sim/tutorial.js';
import { coachHighlight } from './sim/coach.js';
import { describeMessage, describeQuestion, describeFeedback, fmt, CFO_NAME } from './content/copy.js';
import { renderTopbar, renderDashboard, messageChart } from './ui/dashboard.js';
import { welcomeScreen, lineScreen, endingDialog, galleryDialog, manualDialog } from './ui/screens.js';
import { dialog } from './ui/components.js';
import { popover, richText, button } from './ui/components.js';
import { esc, icon } from './ui/dom.js';
import { createClock } from './ui/clock.js';
import { createChat } from './ui/chat.js';
import { acceptClick } from './clickguard.js';
import { newSeed } from './rng.js';
import * as store from './storage.js';
import { buildResultRow, sendResult, flushQueue } from './results.js';
import { APPS_SCRIPT_URL, CLASS_CODES } from './config.js';
import { classifyEnding } from './sim/endings.js';
import { setLocale, getLocale, detectLocale } from './content/locale.js';

const app = document.getElementById('app');
let run = null, view = 'welcome', chat = null, pushedSeq = 0, endingShown = false, sendStatus = null, renderedAt = 0;
const ui = { tab: 'productos', focus: null, chatOpen: false };
const clock = createClock({ onTick, intervalFor: (sp) => (sp === 2 ? 2000 : 4000), isHidden: () => document.hidden });

// ---------- Views ----------
function showWelcome(error = '') { view = 'welcome'; app.innerHTML = welcomeScreen(store.getIdentity() ?? {}, error); }
function showLine() { view = 'line'; app.innerHTML = lineScreen(store.getIdentity()?.firmName ?? '', { tutorialDone: store.getTutorialDone(), replay: store.getReplayTutorial() }); }
function showGame() {
  view = 'game';
  app.innerHTML = `<div id="top"></div><div class="layout"><div id="dash"></div>
    <aside class="chat${ui.chatOpen ? ' open' : ''}" id="chatbox" aria-label="${esc(fmt('ui.chat'))}"><div class="chat-head"><span class="cfo-eye" id="eye"></span>
      <div><strong>${esc(CFO_NAME)}</strong><small>${esc(fmt('ui.skip'))}</small></div>
      <button class="btn btn-ghost btn-sm chat-toggle" data-chat-toggle>${icon('chat')}<span>${esc(fmt(ui.chatOpen ? 'ui.chat.close' : 'ui.chat.open'))}</span></button></div>
    <div class="chat-log" id="chatlog" aria-live="polite"></div></aside></div><div id="overlay"></div>`;
  const log = document.getElementById('chatlog');
  chat = createChat({ log, renderDone: renderMessage, onTyping: (busy) => document.getElementById('eye')?.classList.toggle('typing', busy) });
  // Messages from before a reload appear instantly; new ones are typed.
  log.innerHTML = run.inbox.map((m) => renderMessage(toChat(m))).join(''); log.scrollTop = log.scrollHeight;
  pushedSeq = run.seq;
  renderTop(); renderDash();
  const waiting = pauseReasons(run); if (waiting.includes('tutorial') || waiting.includes('question')) openChat();
  if (run.state.ended) showEnding();
}
// Re-rendering between pointerdown and pointerup replaces the element under the cursor and the browser drops the click,
// so renders requested while a pointer is down wait until it is released.
let pointerDown = false; const deferred = new Set();
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
document.addEventListener('pointerup', () => { pointerDown = false;
  setTimeout(() => { if (deferred.has('top')) renderTop(); if (deferred.has('dash')) renderDash(true, false); deferred.clear(); }, 0); }, true);
const renderTop = () => { if (pointerDown) { deferred.add('top'); return; } const el = document.getElementById('top'); if (!el) return;
  el.innerHTML = renderTopbar(run, ui, clock);
  if (!applyingHighlight) { applyingHighlight = true; try { applyHighlight(); } finally { applyingHighlight = false; } } };
function renderDash(force = false, cooldown = true) {
  const el = document.getElementById('dash'); if (!el) return;
  if (pointerDown) { deferred.add('dash'); return; }
  if (!force && el.contains(document.activeElement) && document.activeElement.matches('input')) return; // don't steal focus while typing
  el.innerHTML = renderDashboard(run, ui); if (cooldown) renderedAt = performance.now();
  if (!applyingHighlight) { applyingHighlight = true; try { applyHighlight(); } finally { applyingHighlight = false; } }
}
let applyingHighlight = false;

// ---------- Chat ----------
function toChat(m) {
  const d = describeMessage(m, run);
  return { seq: m.seq, month: m.month, type: m.type, tone: d.tone, text: d.text, question: d.question, feedback: d.feedback, nav: d.nav,
    urgent: m.type === 'question' || d.tone === 'ending',
    chartSvg: d.chart ? messageChart(d.chart.kind, run) : '' };
}
function renderMessage(msg) {
  const meta = `<span class="meta">${esc(fmt('ui.chat.meta', { m: msg.month, cfo: CFO_NAME }))}</span>`;
  let inner;
  if (msg.type === 'question') {
    const q = run.questions[msg.question], dq = describeQuestion(q, run), open = !q.answered && run.pending === msg.question;
    inner = richText(dq.prompt);
    if (open) inner += dq.input === 'mc'
      ? `<div class="options">${dq.options.map((o) => button({ label: o.label, variant: 'outline', attrs: `data-answer="${esc(o.id)}"` })).join('')}</div>`
      : `<form data-qform><input inputmode="decimal" autocomplete="off" aria-label="${esc(fmt('ui.yourAnswer'))}" required>${button({ label: fmt('ui.answer'), attrs: 'type="submit"' })}</form>${run.inputError ? `<p class="err" role="alert">${esc(fmt('ui.inputError'))}</p>` : ''}`;
  } else if (msg.type === 'feedback') {
    const q = run.questions[msg.feedback], f = describeFeedback(q, run);
    inner = `<p class="${f.correct ? 'verdict-ok' : 'verdict-bad'}">${esc(f.title)}</p><p class="muted">${esc(f.detail)}</p>${richText(f.explanation)}`;
  } else inner = richText(msg.text);
  const last = run.inbox.filter((x) => x.type === msg.type).at(-1)?.seq === msg.seq;
  const btns = [];
  if (msg.type === 'tutorial' && last && run.tutorial?.step === 'tour') btns.push(button({ label: fmt('ui.tutorial.next'), size: 'sm', attrs: 'data-tut-next' }));
  if (msg.type === 'tutorial' && last && run.tutorial?.step === 'fix') btns.push(button({ label: fmt('ui.tutorial.skipFix'), variant: 'ghost', size: 'sm', attrs: 'data-tut-skip' }));
  for (const n of msg.nav ?? []) btns.push(button({ label: n.label, variant: 'outline', size: 'sm', attrs: `data-nav-tab="${esc(n.tab ?? '')}" data-nav-target="${esc(n.target ?? '')}"` }));
  if (msg.type === 'coach' && last && run.unseen > 0) btns.push(button({ label: fmt('ui.coach.ok'), size: 'sm', attrs: 'data-clock="play"' }));
  if (btns.length) inner += `<div class="navs">${btns.join('')}</div>`;
  return `<div class="msg ${msg.tone ?? ''}" id="msg-${msg.seq}">${meta}${inner}${msg.chartSvg ? `<div class="chart">${msg.chartSvg}</div>` : ''}</div>`;
}
function pushNew() { for (const m of run.inbox.filter((x) => x.seq >= pushedSeq)) chat.push(toChat(m)); pushedSeq = run.seq; }
function refreshQuestionMessages() {
  for (const m of run.inbox.filter((x) => x.type === 'question' || x.type === 'tutorial' || x.type === 'coach')) { const el = document.getElementById(`msg-${m.seq}`); if (el) el.outerHTML = renderMessage(toChat(m)); }
}

function openChat() {
  if (ui.chatOpen) return; ui.chatOpen = true;
  document.getElementById('chatbox')?.classList.add('open');
  const span = document.querySelector('[data-chat-toggle] span'); if (span) span.textContent = fmt('ui.chat.close');
}

// ---------- Highlights ----------
const TAB_OF = (target) => (target.startsWith('tab:') ? target.slice(4)
  : /^(price|ad|versions):|^launch$|^expand$/.test(target) ? 'productos' : target === 'demand-chart' ? 'mercado' : null);
let lastHighlight = '';
function applyHighlight(extra = null) {
  document.querySelectorAll('.spotlight').forEach((el) => el.classList.remove('spotlight'));
  if (!run || view !== 'game') return;
  const targets = [tutorialHighlight(run), coachHighlight(run), extra].filter(Boolean);
  const key = targets.join('|'), changed = key !== lastHighlight; lastHighlight = key;
  for (const target of targets) {
    const tab = TAB_OF(target);
    // Switch tabs only when the highlight changes, so the student can still browse other tabs.
    if (tab && ui.tab !== tab && (changed || target === extra)) { ui.tab = tab; renderDash(true, false); }
    const el = document.querySelector(`[data-tour="${CSS.escape(target)}"]`);
    if (el) { el.classList.add('spotlight'); if (target === extra) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
}
function navigate(tab, target) {
  if (tab) { ui.tab = tab; renderDash(true, false); }
  if (window.matchMedia('(max-width: 959px)').matches) { ui.chatOpen = false; document.getElementById('chatbox')?.classList.remove('open'); }
  applyHighlight(target || (tab ? `tab:${tab}` : null));
}

// ---------- Game flow ----------
function save() { if (run && !run.state.ended) store.saveCurrentRun(run); }
function afterChange() {
  pushNew();
  const reasons = pauseReasons(run);
  if (reasons.includes('ended')) clock.pause('ended');
  else if (reasons.includes('question')) clock.pause('question');
  else if (reasons.includes('tutorial')) clock.pause('tutorial');
  if (clock.paused && clock.reason === 'tutorial' && !reasons.includes('tutorial')) clock.reason = 'user';
  if (reasons.includes('tutorial')) openChat();
  for (const id of run.coachSeen ?? []) store.addCoachSeen(id);
  if (run.tutorial?.step === 'done') store.setTutorialDone(true);
  if (reasons.includes('question') || (reasons.includes('event') && clock.paused)) openChat(); // on phones the chat is a drawer
  save(); renderTop(); renderDash(); refreshQuestionMessages(); applyHighlight();
  if (run.state.ended) showEnding();
}
function onTick() {
  run = step(run);
  if (run.unseen > 0 && !clock.paused) clock.pause('event');
  afterChange();
}
function play() {
  if (run.pending !== null || run.state.ended || pauseReasons(run).includes('tutorial')) return;
  run = ackEvents(run); save(); clock.resume(); renderTop();
}
function doAct(action) { run = act(run, action); afterChange(); }
function doAnswer(value) {
  const before = run.questions.length;
  run = answer(run, value);
  refreshQuestionMessages();
  if (run.pending === null && clock.paused && clock.reason === 'question') clock.reason = 'user'; // answered: now just paused
  if (run.questions.length > before || run.pending === null) afterChange(); else renderTop();
}
function showEnding() {
  if (endingShown) return; endingShown = true; clock.pause('ended');
  store.addToGallery(classifyEndingSafe());
  store.clearCurrentRun();
  const draw = () => { const o = document.getElementById('overlay'); if (o && view === 'game') o.innerHTML = endingDialog(run, store.getGallery(), sendStatus); };
  sendStatus = 'sending'; draw();
  sendResult(APPS_SCRIPT_URL, buildResultRow(run, store.getGallery())).then((r) => { sendStatus = r; draw(); });
}
const classifyEndingSafe = () => classifyEnding(run.state);

// Abandon the current run (not sent) and go back to the strategy screen.
function restart() {
  clock.pause('user'); store.clearCurrentRun(); run = null; endingShown = false; sendStatus = null; lastHighlight = '';
  showLine();
}

function newRun(line) {
  const id = store.getIdentity();
  const tutorial = !store.getTutorialDone() || store.getReplayTutorial(); store.setReplayTutorial(false);
  run = createRun({ seed: newSeed(), line, tutorial, coachSeen: store.getCoachSeen(), meta: { ...id, locale: getLocale(), runId: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, runNumber: store.nextRunNumber() } });
  endingShown = false; sendStatus = null; ui.tab = 'productos'; ui.focus = null;
  clock.pause(tutorial ? 'tutorial' : 'user'); store.saveCurrentRun(run); showGame(); applyHighlight();
}

// ---------- Events ----------
function saveDraft(input) {
  const [kind, uid] = input.dataset.input.split(':'); ui.drafts ??= {}; ui.drafts[uid] ??= {};
  ui.drafts[uid][kind === 'vhigh' ? 'high' : 'low'] = input.value;
}
function commitInput(input) {
  const [kind, uid] = input.dataset.input.split(':');
  if (kind === 'price') doAct({ type: 'setPrice', uid, price: input.value });
  else if (kind === 'ad') doAct({ type: 'setAd', uid, ad: input.value });
}
function openPopover(btn) {
  const o = document.getElementById('overlay') ?? app; closePopover();
  o.insertAdjacentHTML('beforeend', popover(btn.dataset.term));
  const pop = o.querySelector('.popover'), r = btn.getBoundingClientRect();
  const left = Math.min(window.innerWidth - pop.offsetWidth - 16, Math.max(16, r.left - 20));
  const top = r.bottom + 8 + pop.offsetHeight > window.innerHeight ? Math.max(16, r.top - pop.offsetHeight - 8) : r.bottom + 8;
  pop.style.left = `${left}px`; pop.style.top = `${top}px`; pop.querySelector('[data-close-popover]').focus();
}
const closePopover = () => document.querySelectorAll('.popover').forEach((p) => p.remove());

document.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-term]'); if (!t) { if (!e.target.closest('.popover')) closePopover(); return; }
  if (t.dataset.term) { e.preventDefault(); openPopover(t); return; }
  if (t.matches('[data-close-popover]')) return closePopover();
  if (t.matches('[data-close-dialog]')) { document.getElementById('overlay').innerHTML = ''; return; }
  if (t.dataset.dialog) { document.getElementById('overlay').innerHTML = t.dataset.dialog === 'manual' ? manualDialog() : galleryDialog(store.getGallery()); return; }
  if (t.matches('[data-restart]')) { clock.pause('user'); renderTop();
    document.getElementById('overlay').innerHTML = dialog({ title: fmt('ui.restart.title'), body: `<p>${esc(fmt('ui.restart.body'))}</p>`,
      actions: `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px">${button({ label: fmt('ui.restart.confirm'), variant: 'destructive', attrs: 'data-restart-confirm' })}${button({ label: fmt('ui.restart.cancel'), variant: 'outline', attrs: 'data-close-dialog' })}</div>` });
    return; }
  if (t.matches('[data-restart-confirm]')) { restart(); return; }
  if (t.matches('[data-newrun]')) { showLine(); return; }
  if (t.matches('[data-show-ending]')) { document.getElementById('overlay').innerHTML = endingDialog(run, store.getGallery(), sendStatus); return; }
  if (t.dataset.lang) { switchLocale(t.dataset.lang); return; }
  if (t.dataset.line) { newRun(t.dataset.line); return; }
  if (t.matches('[data-tut-next]')) { run = tutorialNext(run); afterChange(); return; }
  if (t.matches('[data-tut-skip]')) { run = tutorialSkipFix(run); afterChange(); return; }
  if (t.dataset.navTab !== undefined) { navigate(t.dataset.navTab, t.dataset.navTarget); return; }
  if (t.matches('[data-chat-toggle]')) { ui.chatOpen = !ui.chatOpen; document.getElementById('chatbox').classList.toggle('open', ui.chatOpen);
    t.querySelector('span').textContent = fmt(ui.chatOpen ? 'ui.chat.close' : 'ui.chat.open'); return; }
  if (!run || view !== 'game') return;
  const guarded = t.dataset.act || t.dataset.answer || t.dataset.clock;
  if (guarded && !acceptClick(e, performance.now(), renderedAt, { cooldown: !t.dataset.clock })) return;
  if (t.dataset.clock === 'play') return play();
  if (t.dataset.clock === 'pause') { clock.pause('user'); renderTop(); return; }
  if (t.dataset.speed) { const sp = Number(t.dataset.speed); if (clock.paused) clock.speed = sp; else clock.play(sp); renderTop(); return; }
  if (t.dataset.tab) { ui.tab = t.dataset.tab; renderDash(true); return; }
  if (t.dataset.focus) { ui.focus = t.dataset.focus; renderDash(true); return; }
  if (t.dataset.answer) return doAnswer(t.dataset.answer);
  if (t.dataset.stepup || t.dataset.stepdown) {
    const id = t.dataset.stepup || t.dataset.stepdown, input = document.querySelector(`[data-input="${CSS.escape(id)}"]`);
    const v = (Number(input.value) || 0) + (t.dataset.stepup ? 1 : -1) * Number(t.dataset.step || 1);
    input.value = Math.max(Number(input.dataset.min), Math.min(Number(input.dataset.max), v));
    if (id.startsWith('v')) saveDraft(input); else commitInput(input); return;
  }
  const a = t.dataset.act;
  if (a === 'launch') doAct({ type: 'launch', templateId: t.dataset.template });
  if (a === 'discontinue') doAct({ type: 'discontinue', uid: t.dataset.uid });
  if (a === 'expand') doAct({ type: 'expand' });
  if (a === 'reposition') doAct({ type: 'reposition' });
  if (a === 'versions') { const v = (k) => document.querySelector(`[data-input="${k}:${CSS.escape(t.dataset.uid)}"]`)?.value;
    doAct({ type: 'versions', uid: t.dataset.uid, high: v('vhigh'), low: v('vlow') }); if (ui.drafts) delete ui.drafts[t.dataset.uid]; }
});
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-replay]')) { store.setReplayTutorial(e.target.checked); return; }
  if (e.target.matches('[data-input^="price:"], [data-input^="ad:"]')) { commitInput(e.target); setTimeout(() => renderDash(true, false), 0); }
  else if (e.target.matches('[data-input^="vhigh:"], [data-input^="vlow:"]')) saveDraft(e.target);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closePopover(); if (document.querySelector('.dialog') && !document.querySelector('[data-newrun]')) document.getElementById('overlay').innerHTML = ''; }
  if (e.key === 'Enter' && e.target.matches('[data-input^="price:"], [data-input^="ad:"]')) { e.preventDefault(); commitInput(e.target); renderDash(true); }
});
document.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.matches('[data-welcome]')) {
    const id = Object.fromEntries([...new FormData(e.target)].map(([k, v]) => [k, String(v).trim()]));
    if (!id.playerName || !id.playerId || !id.classCode || !id.firmName) return showWelcome(fmt('ui.welcome.missing'));
    if (CLASS_CODES.length && !CLASS_CODES.map((c) => c.toLowerCase()).includes(id.classCode.toLowerCase())) return showWelcome(fmt('ui.welcome.badCode'));
    store.setIdentity(id); showLine(); return;
  }
  if (e.target.matches('[data-qform]')) doAnswer(e.target.querySelector('input').value);
});
document.addEventListener('visibilitychange', () => { clock.handleVisibility(); if (view === 'game') renderTop(); });

function applyLocale(l) { setLocale(l); document.documentElement.lang = getLocale(); document.title = fmt('ui.title'); }
function switchLocale(l) {
  applyLocale(l); store.setLocaleStore(getLocale());
  if (view === 'welcome') showWelcome(); else if (view === 'line') showLine();
  else if (view === 'game') { showGame(); if (endingShown) document.getElementById('overlay').innerHTML = endingDialog(run, store.getGallery(), sendStatus); applyHighlight(); } // never re-send
}

// ---------- Start ----------
applyLocale(store.getLocaleStore() ?? detectLocale(navigator.language));
flushQueue(APPS_SCRIPT_URL).catch(() => {});
run = upgradeRun(store.loadCurrentRun()); // saves from earlier versions are upgraded; unreadable ones are dropped
if (!run) store.clearCurrentRun();
if (run && !run.state.ended) { try { clock.pause(tutorialPaused(run) ? 'tutorial' : 'resume'); showGame(); } catch { store.clearCurrentRun(); run = null; showLine(); } }
else if (store.getIdentity()) { run = null; showLine(); }
else showWelcome();
