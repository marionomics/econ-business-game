import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeStore, throwingStore } from './helpers.js';
import { randomRun } from './support/randombot.js';
import { getIdentity, setIdentity, nextRunNumber, saveCurrentRun, loadCurrentRun, clearCurrentRun,
  getGallery, addToGallery, enqueue, dequeueAll } from '../js/storage.js';

test('identity round-trip', () => { const s = fakeStore();
  assert.equal(getIdentity(s), null); setIdentity({ playerId: 'a1', playerName: 'Ana', classCode: 'X' }, s);
  assert.deepEqual(getIdentity(s), { playerId: 'a1', playerName: 'Ana', classCode: 'X' }); });
test('run numbers increase', () => { const s = fakeStore(); assert.equal(nextRunNumber(s), 1); assert.equal(nextRunNumber(s), 2); });
test('saveCurrentRun/loadCurrentRun round-trips a nested run object', () => { const s = fakeStore();
  const run = { runId: 'r', state: { month: 7, products: [{ uid: 'p1', price: 42 }], history: [{ profit: -3.5 }] }, pending: null };
  saveCurrentRun(run, s); assert.deepEqual(loadCurrentRun(s), run);
  clearCurrentRun(s); assert.equal(loadCurrentRun(s), null); });
test('gallery keeps unique endings', () => { const s = fakeStore();
  addToGallery('boutique', s); addToGallery('boutique', s); addToGallery('ipo_premium', s);
  assert.deepEqual(getGallery(s), ['boutique', 'ipo_premium']); });
test('queue enqueue and dequeueAll empties it', () => { const s = fakeStore();
  enqueue({ runId: 'a' }, s); enqueue({ runId: 'b' }, s);
  assert.deepEqual(dequeueAll(s).map(r => r.runId), ['a', 'b']); assert.deepEqual(dequeueAll(s), []); });
test('storage functions survive a store that throws', () => {
  assert.equal(getIdentity(throwingStore), null); setIdentity({ playerId: 'x' }, throwingStore);
  assert.equal(nextRunNumber(throwingStore), 1); assert.equal(loadCurrentRun(throwingStore), null);
  saveCurrentRun({}, throwingStore); assert.deepEqual(getGallery(throwingStore), []); addToGallery('x', throwingStore);
  enqueue({}, throwingStore); assert.deepEqual(dequeueAll(throwingStore), []); });
test('corrupt JSON is ignored', () => { const s = fakeStore(); s.setItem('ipo2.currentRun', '{bad'); assert.equal(loadCurrentRun(s), null); });
test('a v2 run round-trips through storage', () => { const s = fakeStore(); const run = randomRun(4, 'premium');
  saveCurrentRun(run, s); assert.deepEqual(loadCurrentRun(s), run); });
