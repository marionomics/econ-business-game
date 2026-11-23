import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, deriveSeed, newSeed } from '../js/rng.js';

test('same seed, same sequence', () => {
  const a = createRng(42), b = createRng(42);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
});
test('next is in [0,1)', () => {
  const r = createRng(9);
  for (let i = 0; i < 1000; i++) { const x = r.next(); assert.ok(x >= 0 && x < 1); }
});
test('int is inclusive and in range', () => {
  const r = createRng(1); const seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(r.int(3, 5));
  assert.deepEqual([...seen].sort(), [3, 4, 5]);
});
test('deriveSeed is stable and label-sensitive', () => {
  assert.equal(deriveSeed(7, 'x'), deriveSeed(7, 'x'));
  assert.notEqual(deriveSeed(7, 'x'), deriveSeed(7, 'y'));
});
test('shuffle does not mutate input and keeps elements', () => {
  const arr = [1, 2, 3, 4]; const s = createRng(3).shuffle(arr);
  assert.deepEqual(arr, [1, 2, 3, 4]); assert.deepEqual([...s].sort(), [1, 2, 3, 4]);
});
test('pick returns an element', () => assert.ok(['a', 'b'].includes(createRng(5).pick(['a', 'b']))));
test('newSeed is a uint32', () => { const s = newSeed(); assert.ok(Number.isInteger(s) && s >= 0 && s < 2 ** 32); });
