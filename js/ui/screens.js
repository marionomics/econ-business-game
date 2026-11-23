// Full screens and dialogs.
import { esc } from './dom.js';
import { button, card, dialog, richText, richInline, langSwitch } from './components.js';
import { fmt, number, gradingIntro, endingText, CFO_NAME, cfoLong } from '../content/copy.js';
import { glossaryAll } from '../content/glossary.js';
import { linkCore } from '../content/core.js';
import { ENDINGS, classifyEnding } from '../sim/endings.js';

export function welcomeScreen(id = {}, error = '') {
  const f = (name, key, auto = '') => `<label class="field">${esc(fmt(key))}<input name="${name}" value="${esc(id[name])}" ${auto} required></label>`;
  return `<main class="screen">${langSwitch()}<h1>${esc(fmt('ui.title'))}</h1><p class="lede">${esc(fmt('ui.subtitle'))}</p>
    <form data-welcome>${f('playerName', 'ui.welcome.name', 'autocomplete="name"')}${f('playerId', 'ui.welcome.id')}${f('classCode', 'ui.welcome.code')}${f('firmName', 'ui.welcome.firm', 'maxlength="40"')}
    ${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}${button({ label: fmt('ui.welcome.start'), size: 'lg', attrs: 'type="submit"' })}</form>
    ${card({ title: esc(fmt('ui.grading')), body: `<div class="grading">${esc(gradingIntro())}</div>` })}</main>`;
}

export function lineScreen(firm, { tutorialDone = false, replay = false } = {}) {
  const opt = (line) => `<section class="card line-card"><h3>${esc(fmt(`ui.line.${line}`))}</h3>${richText(fmt(`ui.line.${line}.body`))}
    ${button({ label: fmt('ui.line.choose'), attrs: `data-line="${line}"` })}</section>`;
  return `<main class="screen">${langSwitch()}<h1>${esc(firm)}</h1>
    <p class="lede">${esc(fmt('ui.line.lede', { cfo: CFO_NAME, cfoLong: cfoLong() }))}</p>
    <div class="lines">${opt('premium')}${opt('generico')}</div>
    ${tutorialDone ? `<label class="field" style="flex-direction:row; align-items:center; gap:8px; margin-top:16px"><input type="checkbox" data-replay ${replay ? 'checked' : ''} style="height:auto"> ${esc(fmt('ui.tutorial.replay'))}</label>` : ''}</main>`;
}

export function endingDialog(run, gallery, sendStatus) {
  const id = classifyEnding(run.state), e = endingText(id), sc = run.score;
  const rows = [[fmt('ui.end.val'), sc.valuationPts], [richInline(fmt('ui.end.crises')) + ` (${sc.crises.survived}/${sc.crises.occurred})`, sc.crisesPts],
    [fmt('ui.end.questions') + ` (${sc.questions.correct}/${sc.questions.asked})`, sc.questionsPts], [fmt('ui.end.total'), sc.total]];
  const body = `${richText(e.text)}<h3>${esc(fmt('ui.end.score'))}</h3><table class="score"><tbody>
    ${rows.map(([k, v], i) => `<tr${i === 3 ? ' class="total"' : ''}><td>${i === 1 ? k : esc(k)}</td><td>${esc(number(Math.round(v * 10) / 10))}</td></tr>`).join('')}</tbody></table>
    <p class="muted">${esc(fmt('ui.end.best'))}</p><p class="muted" role="status">${sendStatus ? esc(fmt(`ui.${sendStatus}`)) : ''}</p>
    <p class="muted">${esc(fmt('ui.gallery.intro', { n: gallery.length, total: ENDINGS.length }))}</p>`;
  return dialog({ title: e.title, body, actions: `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px">
    ${button({ label: fmt('ui.end.new'), size: 'lg', attrs: 'data-newrun' })}${button({ label: fmt('ui.end.board'), variant: 'outline', size: 'lg', attrs: 'data-close-dialog' })}</div>` });
}

export function galleryDialog(gallery) {
  const items = ENDINGS.map((e) => (gallery.includes(e.id) ? `<li>${esc(endingText(e.id).title)}</li>` : `<li class="locked">${esc(fmt('ui.locked'))}</li>`)).join('');
  return dialog({ title: fmt('ui.gallery'), body: `<p>${esc(fmt('ui.gallery.intro', { n: gallery.length, total: ENDINGS.length }))}</p><ul class="gallery">${items}</ul>` });
}

export function manualDialog() {
  const body = glossaryAll().map((g) => `<h3>${esc(g.title)}</h3><p>${esc(g.body)}</p>${g.formula ? `<p class="formula">${esc(g.formula)}</p>` : ''}${g.core ? `<p class="core">${linkCore(esc(g.core))} ↗</p>` : ''}`).join('');
  return dialog({ title: fmt('ui.manual'), body: `<div class="glossary">${body}</div>` });
}
