// String components styled like the shadcn preset. Events are delegated in main.js via data-* attributes.
import { esc, icon } from './dom.js';
import { glossaryTerm } from '../content/glossary.js';

export const button = ({ label, variant = 'default', size = 'md', attrs = '', ico = '' }) =>
  `<button class="btn btn-${variant} btn-${size}" ${attrs}>${ico ? icon(ico) : ''}<span>${esc(label)}</span></button>`;

export const infoButton = (term, label = '') =>
  `<button class="info" data-term="${esc(term)}" aria-label="${esc('Qué es: ' + (glossaryTerm(term)?.title ?? label ?? term))}">${icon('info')}</button>`;

// Escapes text, turns [[term]] / [[term|label]] into the label plus an ⓘ, and \n\n into paragraphs.
export function richText(text) {
  return String(text ?? '').split(/\n\n+/).map((par) => {
    let out = '', last = 0;
    for (const m of par.matchAll(/\[\[(\w+)(?:\|([^\]]*))?\]\]/g)) {
      const g = glossaryTerm(m[1]); const label = m[2] ?? (g ? g.title.replace(/\s*\(.*\)$/, '').toLowerCase() : m[1]);
      out += esc(par.slice(last, m.index)) + `<span class="term">${esc(label)}${infoButton(m[1], label)}</span>`;
      last = m.index + m[0].length;
    }
    return `<p>${out + esc(par.slice(last))}</p>`;
  }).join('');
}
// Like richText but inline (no paragraphs), for labels.
export const richInline = (text) => richText(text).replace(/^<p>|<\/p>$/g, '');

export const tabs = ({ items, active }) =>
  `<div class="tabs" role="tablist">${items.map((t) => `<button role="tab" class="tab${t.id === active ? ' active' : ''}" aria-selected="${t.id === active}" data-tab="${esc(t.id)}">${esc(t.label)}</button>`).join('')}</div>`;

export const card = ({ title = '', body = '', cls = '' }) => `<section class="card ${cls}">${title ? `<h3 class="card-title">${title}</h3>` : ''}${body}</section>`;

export const stepper = ({ id, value, min = 0, max = 1e9, step = 1, label, prefix = '$' }) =>
  `<label class="stepper"><span class="stepper-label">${label}</span><span class="stepper-row">
    <button class="btn btn-outline btn-icon" data-stepdown="${esc(id)}" data-step="${step}" aria-label="Bajar">−</button>
    <span class="stepper-input">${esc(prefix)}<input inputmode="numeric" data-input="${esc(id)}" value="${esc(value)}" data-min="${min}" data-max="${max}"></span>
    <button class="btn btn-outline btn-icon" data-stepup="${esc(id)}" data-step="${step}" aria-label="Subir">+</button></span></label>`;

export function popover(term) {
  const g = glossaryTerm(term); if (!g) return '';
  return `<div class="popover" role="dialog" aria-label="${esc(g.title)}"><div class="popover-head"><strong>${esc(g.title)}</strong>
    <button class="btn btn-ghost btn-icon" data-close-popover aria-label="Cerrar">${icon('close')}</button></div>
    <p>${esc(g.body)}</p>${g.formula ? `<p class="formula">${esc(g.formula)}</p>` : ''}${g.core ? `<p class="core">${esc(g.core)}</p>` : ''}</div>`;
}

export const dialog = ({ title, body, actions = '' }) =>
  `<div class="overlay"><div class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="dialog-head"><h2>${esc(title)}</h2>
    <button class="btn btn-ghost btn-icon" data-close-dialog aria-label="Cerrar">${icon('close')}</button></div><div class="dialog-body">${body}</div>${actions}</div></div>`;
