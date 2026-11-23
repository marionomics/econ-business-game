// localStorage wrappers. Every call survives a missing or throwing store.
const K = { identity: 'ipo2.identity', runNo: 'ipo2.runNumber', run: 'ipo2.currentRun', gallery: 'ipo2.gallery', queue: 'ipo2.queue' };
const def = () => globalThis.localStorage;

function read(key, fallback, store) {
  try { const raw = (store ?? def())?.getItem(key); return raw == null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
}
function write(key, value, store) {
  try { (store ?? def())?.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
function remove(key, store) { try { (store ?? def())?.removeItem(key); } catch { /* ignore */ } }

export const getIdentity = (store) => read(K.identity, null, store);
export const setIdentity = (id, store) => write(K.identity, id, store);
export function nextRunNumber(store) { const n = (read(K.runNo, 0, store) || 0) + 1; write(K.runNo, n, store); return n; }
export const saveCurrentRun = (run, store) => write(K.run, run, store);
export const loadCurrentRun = (store) => read(K.run, null, store);
export const clearCurrentRun = (store) => remove(K.run, store);
export const getGallery = (store) => { const g = read(K.gallery, [], store); return Array.isArray(g) ? g : []; };
export function addToGallery(id, store) { const g = getGallery(store); if (!g.includes(id)) g.push(id); write(K.gallery, g, store); return g; }
export function enqueue(row, store) { const q = read(K.queue, [], store); q.push(row); write(K.queue, q, store); }
export const peekQueue = (store) => { const q = read(K.queue, [], store); return Array.isArray(q) ? q : []; };
export function removeFromQueue(runId, store) { write(K.queue, peekQueue(store).filter((r) => r.runId !== runId), store); }
export function dequeueAll(store) { const q = read(K.queue, [], store); write(K.queue, [], store); return Array.isArray(q) ? q : []; }

// v2.1: tutorial, mini-tutorials and language, per student (this browser).
const K2 = { tut: 'ipo2.tutorialDone', replay: 'ipo2.replayTutorial', coach: 'ipo2.coachSeen', locale: 'ipo2.locale' };
export const getTutorialDone = (store) => read(K2.tut, false, store) === true;
export const setTutorialDone = (v, store) => write(K2.tut, !!v, store);
export const getReplayTutorial = (store) => read(K2.replay, false, store) === true;
export const setReplayTutorial = (v, store) => write(K2.replay, !!v, store);
export const getCoachSeen = (store) => { const v = read(K2.coach, [], store); return Array.isArray(v) ? v : []; };
export function addCoachSeen(id, store) { const v = getCoachSeen(store); if (!v.includes(id)) v.push(id); write(K2.coach, v, store); }
export const getLocaleStore = (store) => read(K2.locale, null, store);
export const setLocaleStore = (l, store) => write(K2.locale, l, store);
