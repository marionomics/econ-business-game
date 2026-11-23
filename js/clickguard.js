// Ignore the second click of a double-click and (unless cooldown is off) clicks that land right after a re-render:
// otherwise a fast double-tap answers the next screen too.
export const CLICK_COOLDOWN_MS = 300;
export const acceptClick = (e, now, renderedAt, { cooldown = true } = {}) =>
  (e.detail ?? 0) <= 1 && (!cooldown || now - renderedAt >= CLICK_COOLDOWN_MS);
