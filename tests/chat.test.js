import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typedPrefix, plainText, createTypingQueue } from '../js/ui/chat.js';

test('typedPrefix grows with time and caps at the full text', () => {
  assert.equal(typedPrefix('hola mundo', 0, 40), ''); assert.equal(typedPrefix('hola mundo', 100, 40), 'hola');
  assert.equal(typedPrefix('hola mundo', 10000, 40), 'hola mundo'); });
test('plainText strips glossary markup to its label', () =>
  assert.equal(plainText('la [[elasticidad|demanda elástica]] y el [[markup]]'), 'la demanda elástica y el markup'));
test('queue types messages one at a time, in order', () => {
  const q = createTypingQueue({ cps: 10 }); ['uno', 'dos', 'tres', 'cuatro', 'cinco'].forEach((t, i) => q.push({ id: i, text: t }));
  let s = q.update(0); assert.equal(s.current.msg.id, 0); assert.equal(s.done.length, 0);
  s = q.update(300); assert.equal(s.current.shown, 'uno'); s = q.update(301); assert.deepEqual(s.done.map(m => m.id), [0]); assert.equal(s.current.msg.id, 1);
  s = q.update(100000); s = q.update(200000); s = q.update(300000); s = q.update(400000); s = q.update(500000);
  assert.deepEqual(s.done.map(m => m.id), [0, 1, 2, 3, 4]); assert.equal(s.current, null); });
test('skip finishes the current message and starts the next', () => {
  const q = createTypingQueue({ cps: 10 }); q.push({ id: 'a', text: 'un mensaje largo' }); q.push({ id: 'b', text: 'otro' });
  q.update(0); q.skip(50); const s = q.update(50); assert.deepEqual(s.done.map(m => m.id), ['a']); assert.equal(s.current.msg.id, 'b'); });
test('reduced motion shows everything immediately', () => {
  const q = createTypingQueue({ cps: 10, reducedMotion: true }); q.push({ id: 1, text: 'hola' }); q.push({ id: 2, text: 'adiós' });
  const s = q.update(0); assert.deepEqual(s.done.map(m => m.id), [1, 2]); assert.equal(s.current, null); });
test('typing state reports busy only while something is being typed', () => {
  const q = createTypingQueue({ cps: 10 }); assert.equal(q.update(0).busy, false); q.push({ id: 1, text: 'ab' });
  assert.equal(q.update(0).busy, true); assert.equal(q.update(1000).busy, false); });
