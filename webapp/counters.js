// Tween counter numbers from 0 to data-target over a duration.

export function animateCounter(el, target, durationMs = 1600) {
  const start = performance.now();
  const initial = 0;
  function frame(now) {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(initial + eased * target).toLocaleString();
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/**
 * Animate only the counters that opt in with `data-count-up`.
 *
 * A casualty count spinning up from zero turns people into a scoreboard. Those
 * numbers are rendered in the markup and left alone; the rest keep the tween.
 */
export function animateAllCounters(rootEl) {
  rootEl.querySelectorAll("[data-target][data-count-up]").forEach(el => {
    const target = Number(el.dataset.target);
    if (Number.isFinite(target)) animateCounter(el, target);
  });
}
