import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORE_SLUGS, coreUrl, coreRefs } from '../js/content/core.js';
import { GLOSSARY } from '../js/content/glossary.js';
import { richText } from '../js/ui/components.js';
import { setLocale } from '../js/content/locale.js';

const B = 'https://books.core-econ.org/the-economy/microeconomics/';
test('coreUrl builds the Spanish and English section URLs', () => {
  assert.equal(coreUrl('7.5', 'es'), B + 'es/07-firm-and-customers-05-demand-elasticity-revenue.html');
  assert.equal(coreUrl('7.5', 'en'), B + '07-firm-and-customers-05-demand-elasticity-revenue.html');
  assert.equal(coreUrl('7.12', 'en'), B + '07-firm-and-customers-12-influencing-market-power.html');
  assert.equal(coreUrl('7.99', 'es'), null); assert.equal(Object.keys(CORE_SLUGS).length, 13);
});
test('every glossary CORE reference maps to a URL', () => {
  for (const [id, g] of Object.entries(GLOSSARY)) if (g.core) for (const r of coreRefs(g.core)) assert.ok(r.url, `${id}: ${g.core}`);
  assert.ok(Object.values(GLOSSARY).some((g) => g.core));
});
test('coreRefs finds sections in text', () => assert.deepEqual(coreRefs('ver CORE 7.12 y CORE 7.2').map((r) => r.section), ['7.12', '7.2']));
test('richText links CORE citations in the current language', () => {
  setLocale('es'); const html = richText('Esto lo persigue la política de competencia (CORE 7.12).');
  assert.match(html, /<a [^>]*href="https:\/\/books\.core-econ\.org\/the-economy\/microeconomics\/es\/07-firm-and-customers-12-influencing-market-power\.html"[^>]*target="_blank"[^>]*rel="noopener"/);
  setLocale('en'); assert.doesNotMatch(richText('CORE 7.12'), /\/es\//); setLocale('es');
});
