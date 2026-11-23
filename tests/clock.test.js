import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../js/ui/clock.js';

// Fake timers: a manual time source.
function fakeTimers() {
  let now = 0, id = 0; const timers = new Map();
  return {
    setTimer: (fn, ms) => { timers.set(++id, { fn, at: now + ms }); return id; },
    clearTimer: (i) => timers.delete(i),
    advance(ms) { const end = now + ms; for (;;) { const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break; now = due[1].at; timers.delete(due[0]); due[1].fn(); } now = end; },
  };
}
const make = (hidden = { v: false }) => { const t = fakeTimers(); let ticks = 0;
  const clock = createClock({ onTick: () => ticks++, intervalFor: (sp) => (sp === 2 ? 1000 : 2000), setTimer: t.setTimer, clearTimer: t.clearTimer, isHidden: () => hidden.v });
  return { t, clock, ticks: () => ticks, hidden }; };

test('play ticks at the speed interval; pause stops', () => { const { t, clock, ticks } = make();
  clock.play(1); t.advance(6000); assert.equal(ticks(), 3); clock.pause('user'); t.advance(6000); assert.equal(ticks(), 3);
  assert.equal(clock.paused, true); assert.equal(clock.reason, 'user'); });
test('2x speed ticks twice as fast', () => { const { t, clock, ticks } = make(); clock.play(2); t.advance(5000); assert.equal(ticks(), 5); });
test('hidden tab pauses with reason hidden; becoming visible stays paused', () => { const { t, clock, ticks, hidden } = make();
  clock.play(1); t.advance(2000); hidden.v = true; clock.handleVisibility(); t.advance(10000);
  assert.equal(ticks(), 1); assert.equal(clock.reason, 'hidden'); hidden.v = false; clock.handleVisibility(); t.advance(10000);
  assert.equal(ticks(), 1); assert.equal(clock.paused, true); });
test('changing speed mid-interval never ticks twice within one interval', () => { const { t, clock, ticks } = make();
  clock.play(1); t.advance(1500); clock.play(2); t.advance(500); assert.equal(ticks(), 0); t.advance(500); assert.equal(ticks(), 1); });
test('resume continues at the current speed', () => { const { t, clock, ticks } = make();
  clock.play(2); clock.pause('event'); clock.resume(); t.advance(1000); assert.equal(ticks(), 1); assert.equal(clock.speed, 2); });
test('pausing inside onTick (auto-pause) stops further ticks', () => { const t = fakeTimers(); let n = 0;
  const clock = createClock({ onTick: () => { n++; if (n === 2) clock.pause('event'); }, intervalFor: () => 1000, setTimer: t.setTimer, clearTimer: t.clearTimer, isHidden: () => false });
  clock.play(1); t.advance(10000); assert.equal(n, 2); });
