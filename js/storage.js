// localStorage wrappers. Every call survives a missing or throwing store.
const K = { identity: 'ipo.identity', runNo: 'ipo.runNumber', run: 'ipo.currentRun', gallery: 'ipo.gallery', queue: 'ipo.queue' };
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
