import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, getLocale, setLocale, detectLocale } from '../js/content/locale.js';
import { fmt, t, endingText, templateName, gradingIntro } from '../js/content/copy.js';
import { glossaryTerm } from '../js/content/glossary.js';

test('detectLocale', () => { assert.equal(detectLocale('en-US'), 'en'); assert.equal(detectLocale('es-MX'), 'es'); assert.equal(detectLocale(undefined), 'es'); assert.equal(detectLocale('fr'), 'es'); });
test('setLocale ignores unknown values', () => { setLocale('es'); setLocale('fr'); assert.equal(getLocale(), 'es'); assert.deepEqual(LOCALES, ['es', 'en']); });
test('accessors return Spanish content in es', () => {
  setLocale('es'); assert.ok(endingText('ipo_premium').title.length > 0); assert.equal(templateName('premium_mantequilla'), 'Mantequilla Reserva');
  assert.ok(gradingIntro().includes('50')); assert.ok(t()['ui.title']); assert.ok(glossaryTerm('elasticidad').body.length > 40); });
test('a key missing in en falls back to Spanish, never ⟦', () => {
  setLocale('en'); const s = fmt('ui.title'); assert.ok(s.length > 0 && !s.includes('⟦')); assert.ok(glossaryTerm('elasticidad')); setLocale('es'); });
