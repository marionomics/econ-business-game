import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY, glossaryTerm } from '../js/content/glossary.js';
import { T } from '../js/content/copy.js';

const REQUIRED = ['costo_marginal', 'costo_medio', 'costo_fijo', 'economias_escala', 'demanda', 'disposicion_pagar', 'elasticidad',
  'ingreso_marginal', 'markup', 'isobeneficio', 'excedente_consumidor', 'excedente_productor', 'perdida_irrecuperable',
  'discriminacion_precios', 'diferenciacion', 'poder_mercado', 'equilibrio_nash', 'competencia', 'ipo', 'valuacion', 'multiplo',
  'utilidad_anualizada', 'estado_resultados', 'margen_contribucion', 'flujo_caja', 'balance', 'quiebra', 'arancel', 'marca_blanca',
  'reposicionamiento', 'publicidad', 'lealtad', 'saturacion', 'crisis'];
test('every required term exists with a body', () => { for (const id of REQUIRED) { const g = glossaryTerm(id); assert.ok(g?.title && g.body.length > 40, id); } });
test('unknown term → null', () => assert.equal(glossaryTerm('nope'), null));
test('every [[term]] used in the copy exists', () => {
  for (const v of Object.values(T)) for (const [, id] of v.matchAll(/\[\[(\w+)(?:\|[^\]]*)?\]\]/g)) assert.ok(GLOSSARY[id], id); });
