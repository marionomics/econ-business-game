// CFO chat: a typing queue (pure, tested) plus a thin DOM adapter.
export const plainText = (t) => String(t ?? '').replace(/\[\[(\w+)(?:\|([^\]]*))?\]\]/g, (_, id, label) => label ?? id.replace(/_/g, ' '));
export const typedPrefix = (text, elapsedMs, cps) => text.slice(0, Math.max(0, Math.min(text.length, Math.floor((elapsedMs * cps) / 1000))));

export function createTypingQueue({ cps = 40, reducedMotion = false } = {}) {
  const queue = [], done = []; let current = null; let finished = false;
  return {
    push(msg) {
      if (msg.urgent) { if (current) { done.push(current.msg); current = null; finished = false; } while (queue.length) done.push(queue.shift()); }
      queue.push(msg);
    },
    skip() { if (current) finished = true; },
    update(now) {
      if (reducedMotion) { if (current) done.push(current.msg); current = null; while (queue.length) done.push(queue.shift()); return { done, current: null, busy: false }; }
      if (current) {
        const full = plainText(current.msg.text);
        if (finished || now - current.startedAt > (full.length * 1000) / cps) { done.push(current.msg); current = null; finished = false; }
      }
      if (!current && queue.length) current = { msg: queue.shift(), startedAt: now };
      if (!current) return { done, current: null, busy: false };
      return { done, current: { msg: current.msg, shown: typedPrefix(plainText(current.msg.text), now - current.startedAt, cps) }, busy: true };
    },
  };
}

// DOM adapter. renderDone(msg) → HTML for a finished message (rich text, charts, question forms).
export function createChat({ log, renderDone, onTyping = () => {}, cps = 45,
  reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false }) {
  const q = createTypingQueue({ cps, reducedMotion });
  let rendered = 0, raf = null, typingEl = null;
  const frame = () => {
    raf = null;
    const s = q.update(performance.now());
    while (rendered < s.done.length) {
      typingEl?.remove(); typingEl = null;
      log.insertAdjacentHTML('beforeend', renderDone(s.done[rendered++])); log.scrollTop = log.scrollHeight;
    }
    if (s.current) {
      if (!typingEl) { typingEl = document.createElement('div'); typingEl.className = `msg ${s.current.msg.tone ?? ''}`; log.appendChild(typingEl); }
      if (!typingEl.firstChild) typingEl.innerHTML = '<span class="typed"></span><span class="caret" aria-hidden="true"></span>';
      typingEl.firstChild.textContent = s.current.shown; log.scrollTop = log.scrollHeight;
    }
    onTyping(s.busy);
    if (s.busy) raf = requestAnimationFrame(frame);
  };
  log.addEventListener('click', () => { q.skip(); if (!raf) raf = requestAnimationFrame(frame); });
  return {
    push(msg) { q.push(msg); if (!raf) raf = requestAnimationFrame(frame); },
    // Re-render the finished messages (e.g. after answering a question the form becomes the feedback).
    rerender() { const s = q.update(performance.now()); log.innerHTML = ''; typingEl = null; rendered = 0;
      for (const m of s.done) { log.insertAdjacentHTML('beforeend', renderDone(m)); rendered++; } log.scrollTop = log.scrollHeight;
      if (!raf) raf = requestAnimationFrame(frame); },
  };
}
