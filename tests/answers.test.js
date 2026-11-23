import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumber, parseNumberCandidates, gradeAnswer } from '../js/answers.js';

test('parseNumber', () => {
  for (const [s, n] of [['$1,250', 1250], ['1,250.5', 1250.5], ['1.250,5', 1250.5], [' 4,5 ', 4.5],
    ['−3', -3], ['-3', -3], ['12', 12], ['0.25', 0.25], ['$ 12,400', 12400], ['1,234,567', 1234567]]) assert.equal(parseNumber(s), n, s);
  for (const s of ['', 'abc', '1,2,3x', '--3', null, undefined]) assert.equal(parseNumber(s), null, String(s));
});
test('ambiguous single-separator numbers give both readings', () => {
  assert.deepEqual(parseNumberCandidates('1.250').sort((a, b) => a - b), [1.25, 1250]);
  assert.deepEqual(parseNumberCandidates('1,250').sort((a, b) => a - b), [1.25, 1250]);
  assert.deepEqual(parseNumberCandidates('12.5'), [12.5]);
  assert.deepEqual(parseNumberCandidates('abc'), []);
});
test('numeric tolerance', () => { const b = { kind: 'numeric', answer: 1000 };
  assert.ok(gradeAnswer(b, 1019)); assert.ok(!gradeAnswer(b, 1021)); assert.ok(!gradeAnswer(b, null));
  assert.ok(gradeAnswer({ kind: 'numeric', answer: 0 }, 0.005)); });
test('array input: any candidate', () => {
  assert.ok(gradeAnswer({ kind: 'numeric', answer: 1250 }, parseNumberCandidates('1.250')));
  assert.ok(gradeAnswer({ kind: 'numeric', answer: 1.25 }, parseNumberCandidates('1,250'))); });
test('absolute accepts signed convention', () => {
  assert.ok(gradeAnswer({ kind: 'numeric', answer: 1.5, absolute: true }, -1.5));
  assert.ok(!gradeAnswer({ kind: 'numeric', answer: 1500 }, -1500)); });
test('mc grading', () => assert.ok(gradeAnswer({ kind: 'mc', answer: 'x' }, 'x') && !gradeAnswer({ kind: 'mc', answer: 'x' }, 'y')));
