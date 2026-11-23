import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineChart, demandChart, demandGeometry, isoprofitChart, costChart } from '../js/ui/charts.js';

const wellFormed = (svg) => { assert.match(svg, /^<svg [^>]*viewBox="[^"]+"[^>]*role="img"[^>]*aria-label="[^"]+"/); assert.match(svg, /<\/svg>$/);
  assert.doesNotMatch(svg, /NaN|Infinity|undefined/); };

test('demand geometry: CS, PS and DWL polygons in data space', () => {
  const g = demandGeometry({ a: 100, b: 1, c: 20, P: 60 });
  assert.deepEqual(g.cs, [[0, 100], [0, 60], [40, 60]]); assert.deepEqual(g.ps, [[0, 60], [40, 60], [40, 20], [0, 20]]);
  assert.deepEqual(g.dwl, [[40, 60], [40, 20], [80, 20]]); assert.equal(g.Q, 40); assert.equal(g.Qc, 80); });
test('versions geometry captures part of the DWL', () => {
  const g = demandGeometry({ a: 100, b: 1, c: 20, P: 60, versions: { high: 73, low: 47 } });
  assert.equal(g.Q, 53); assert.ok(g.ps.length >= 6); });
test('every chart renders well-formed SVG', () => {
  wellFormed(lineChart({ series: [{ label: 'Caja', points: [1, 5, -3, 8] }], target: 10, label: 'Caja' }));
  wellFormed(demandChart({ a: 100, b: 1, c: 20, P: 60, label: 'Demanda' }));
  wellFormed(demandChart({ a: 100, b: 1, c: 20, P: 60, versions: { high: 73, low: 47 }, label: 'Demanda' }));
  wellFormed(isoprofitChart({ a: 100, b: 1, c: 20, F: 300, P: 60, label: 'Isobeneficio' }));
  wellFormed(costChart({ F: 30000, c: 20, qMax: 4000, Q: 2000, label: 'Costos' })); });
test('extreme inputs still render (price below cost, zero quantity, flat series)', () => {
  wellFormed(demandChart({ a: 100, b: 1, c: 20, P: 10, label: 'x' })); wellFormed(demandChart({ a: 100, b: 1, c: 20, P: 120, label: 'x' }));
  wellFormed(lineChart({ series: [{ label: 'x', points: [5] }], label: 'x' })); wellFormed(lineChart({ series: [{ label: 'x', points: [] }], label: 'x' }));
  wellFormed(isoprofitChart({ a: 100, b: 1, c: 20, F: 300, P: 10, label: 'x' })); wellFormed(costChart({ F: 0, c: 20, qMax: 0, label: 'x' })); });
