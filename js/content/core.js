// Links to the CORE textbook (The Economy 2.0, Microeconomics, Unit 7), in the reader's language.
import { getLocale } from './locale.js';

const BASE = 'https://books.core-econ.org/the-economy/microeconomics/';
export const CORE_SLUGS = {
  '7.1': '01-winning-brands', '7.2': '02-breakfast-cereal', '7.3': '03-large-scale-production', '7.4': '04-beautiful-cars',
  '7.5': '05-demand-elasticity-revenue', '7.6': '06-maximize-profit', '7.7': '07-divided-surplus',
  '7.8': '08-price-setting-competition-market', '7.9': '09-firms-differentiate-products', '7.10': '10-strategic-price-setting',
  '7.11': '11-decreasing-long-run-costs', '7.12': '12-influencing-market-power', '7.13': '13-summary',
};
export function coreUrl(section, locale = getLocale()) {
  const slug = CORE_SLUGS[section]; if (!slug) return null;
  return `${BASE}${locale === 'es' ? 'es/' : ''}07-firm-and-customers-${slug}.html`;
}
export const coreRefs = (text) => [...String(text ?? '').matchAll(/CORE (7\.\d+)/g)].map((m) => ({ section: m[1], url: coreUrl(m[1]) }));
// Turns "CORE 7.x" inside already-escaped HTML into links.
export const linkCore = (html) => html.replace(/CORE (7\.\d+)/g, (all, sec) => { const u = coreUrl(sec);
  return u ? `<a href="${u}" target="_blank" rel="noopener">${all}</a>` : all; });
