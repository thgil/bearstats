// Wires scroll steps to graphic actions.
//
// Chapters 1 to 3 each have a sticky `.graphic` panel with `.g[data-g]`
// layers stacked inside it. A step names which layer should be visible and
// what the underlying graphic instance should do when the reader reaches it.
// Chart modules land from other agents in parallel, so every call into an
// instance is optional-chained: a missing instance is a no-op, never a throw.
//
// Chapter 4 is inline (no panel) and is not in this table; main.js plays its
// two charts on an IntersectionObserver.

export const REPLAY_GUARD_MS = 2500;

// Step ids per chapter, in page order (spec §4).
const CHAPTER_STEPS = {
  1: ["annual", "harm", "where", "heat", "replay"],
  2: ["mast", "alternate", "weather"],
  3: ["spring", "scatter", "forecast", "casualties"],
};

/** Which chapter (1, 2 or 3) a step belongs to. */
export function stepChapter(stepId) {
  for (const [chapter, ids] of Object.entries(CHAPTER_STEPS)) {
    if (ids.includes(stepId)) return Number(chapter);
  }
  return undefined;
}

/**
 * The common case: a chart that plays on the way down and shows its finished
 * frame otherwise. `key` is the graphics-object slot, `graphic` the `.g`
 * layer name, `view` an optional setView() argument applied before either.
 */
function playable(key, graphic, view) {
  return {
    graphic,
    enter(g) {
      const chart = g[key];
      chart?.stop?.();
      if (view) chart?.setView?.(view);
      return chart?.play?.();
    },
    settle(g) {
      const chart = g[key];
      chart?.stop?.();
      if (view) chart?.setView?.(view);
      chart?.setProgress?.(1);
    },
  };
}

// g = { annual, harm, map, heat, mast, alternate, weather, monthly, scatter,
//       forecast, casualties }
export const STEPS = {
  // ---- 01 Record year -------------------------------------------------------
  annual: playable("annual", "annual"),
  harm: playable("harm", "harm"),
  where: {
    graphic: "map",
    enter(g) {
      g.map?.stop?.();
      g.map?.hidePoints?.();
      g.map?.showChoropleth?.(2025);
      return g.map?.focusTohoku?.();
    },
    settle(g) { return STEPS.where.enter(g); },
  },
  heat: playable("heat", "heat"),
  replay: {
    graphic: "map",
    enter(g, isCurrent) {
      g.map?.stop?.();
      const focused = g.map?.focusSample?.();
      // replayMonths switches the map into points mode itself; calling
      // showPoints first would flash the whole year before April. And the
      // flight takes a second: if the reader has scrolled on by the time it
      // lands, starting the replay would paint points over whatever step is
      // now showing.
      const runReplay = () => (isCurrent() ? g.map?.replayMonths?.() : undefined);
      if (focused && typeof focused.then === "function") {
        return focused.then(runReplay);
      }
      return runReplay();
    },
    settle(g, isCurrent) {
      g.map?.stop?.();
      const focused = g.map?.focusSample?.();
      const finish = () => { if (isCurrent()) g.map?.setMonthProgress?.(1); };
      if (focused && typeof focused.then === "function") return focused.then(finish);
      finish();
    },
  },

  // ---- 02 Outbreaks ---------------------------------------------------------
  mast: playable("mast", "mast"),
  alternate: playable("alternate", "alternate"),
  weather: playable("weather", "weather"),

  // ---- 03 This year ---------------------------------------------------------
  spring: playable("monthly", "monthly", "spring13"),
  scatter: playable("scatter", "scatter"),
  forecast: playable("forecast", "forecast"),
  casualties: playable("casualties", "casualties"),
};

/**
 * `graphics` is the `g` object passed to every STEPS[x].enter().
 * `panels` maps chapter number (1, 2, 3) → the chapter's `.graphic` element,
 * the container that holds that chapter's `.g[data-g]` layers.
 */
export function createDirector(graphics, panels) {
  function showGraphic(chapter, name) {
    const panel = panels[chapter];
    if (!panel) return;
    const layers = panel.querySelectorAll(".g[data-g]");
    layers.forEach(el => {
      el.classList.toggle("is-active", el.dataset.g === name);
    });
  }

  let current = null;
  const lastPlayed = new Map();

  /**
   * `mode` is "play" (the reader arrived scrolling down) or "settle" (they
   * came back up, or are hovering around a trigger line). An animation plays
   * once per visit; a settle jumps straight to the finished state. Replaying
   * within a couple of seconds of the last play is treated as a settle too,
   * so a thumb wobbling on the trigger line doesn't restart the chart.
   */
  function enter(stepId, mode = "play") {
    const step = STEPS[stepId];
    if (!step) return;
    current = stepId;
    const now = Date.now();
    const recent = (lastPlayed.get(stepId) || 0) > now - REPLAY_GUARD_MS;
    const settle = mode === "settle" || recent;

    const chapter = stepChapter(stepId);
    if (chapter) showGraphic(chapter, step.graphic);

    // The point-map key ("sighting" / "person injured") only makes sense once
    // points are on screen, so the map layer only carries .is-points on the
    // one step that shows them.
    const mapLayer = panels[1] && panels[1].querySelector('.g[data-g="map"]');
    if (mapLayer) mapLayer.classList.toggle("is-points", stepId === "replay");

    try {
      const isCurrent = () => current === stepId;
      if (settle && step.settle) return step.settle(graphics, isCurrent);
      lastPlayed.set(stepId, now);
      return step.enter(graphics, isCurrent);
    } catch (err) {
      console.warn(`[director] enter("${stepId}") failed:`, err);
      return undefined;
    }
  }

  return { enter, showGraphic };
}
