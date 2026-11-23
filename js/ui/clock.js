// Pausable month clock. One timer at a time: no catch-up bursts, pauses when the tab is hidden.
export function createClock({ onTick, intervalFor, setTimer = setTimeout, clearTimer = clearTimeout, isHidden = () => false }) {
  let timer = null;
  const clock = {
    speed: 1, paused: true, reason: 'user',
    play(speed = clock.speed) { clock.speed = speed; clock.paused = false; clock.reason = null; schedule(); },
    pause(reason = 'user') { clock.paused = true; clock.reason = reason; if (timer !== null) { clearTimer(timer); timer = null; } },
    resume() { clock.play(clock.speed); },
    handleVisibility() { if (isHidden() && !clock.paused) clock.pause('hidden'); },
  };
  function schedule() {
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => { timer = null; if (clock.paused) return; onTick(); if (!clock.paused) schedule(); }, intervalFor(clock.speed));
  }
  return clock;
}
