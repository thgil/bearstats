// Wires scroll steps to graphic actions.
//
// Each chapter has its own sticky `.graphic` panel with one or more `.g`
// layers stacked inside it (map / monthly / deaths / pace / rows). A step
// names which layer should be visible and what the underlying graphic
// instance should do when the reader reaches it. Graphics can land late (the
// map and chart modules are built by other agents in parallel), so every call
// into a graphic instance is optional-chained: a missing instance is a no-op,
// never a thrown error.

const CHAPTER_1_STEPS = new Set(["years", "centre", "october", "upclose", "cost"]);
const CHAPTER_2_STEPS = new Set(["months", "pace", "casualties"]);

/** Which chapter (1 or 2) a step belongs to. */
export function stepChapter(stepId) {
  if (CHAPTER_1_STEPS.has(stepId)) return 1;
  if (CHAPTER_2_STEPS.has(stepId)) return 2;
  return undefined;
}

// g = { map, monthly1, deaths, monthly2, pace } — two monthly-chart instances
// because chapters 1 and 2 each have their own panel and their own copy of
// the chart.
export const STEPS = {
  years: {
    graphic: "map",
    enter(g) {
      g.map?.stop?.();
      g.map?.hidePoints?.();
      g.map?.focusJapan?.();
      g.map?.showChoropleth?.(2022);
      return g.map?.playYears?.();
    },
  },
  centre: {
    graphic: "map",
    enter(g) {
      g.map?.stop?.();
      g.map?.hidePoints?.();
      g.map?.showChoropleth?.(2025);
      return g.map?.focusTohoku?.();
    },
  },
  october: {
    graphic: "monthly",
    enter(g) {
      g.monthly1?.stop?.();
      g.monthly1?.setView?.("closed");
      return g.monthly1?.play?.();
    },
  },
  upclose: {
    graphic: "map",
    enter(g) {
      g.map?.stop?.();
      const focused = g.map?.focusSample?.();
      const runReplay = () => {
        g.map?.showPoints?.();
        return g.map?.replayMonths?.();
      };
      if (focused && typeof focused.then === "function") {
        return focused.then(runReplay);
      }
      return runReplay();
    },
  },
  cost: {
    graphic: "deaths",
    enter(g) {
      g.deaths?.stop?.();
      return g.deaths?.play?.();
    },
  },
  months: {
    graphic: "monthly",
    enter(g) {
      g.monthly2?.stop?.();
      g.monthly2?.setView?.("running");
      return g.monthly2?.play?.();
    },
  },
  pace: {
    graphic: "pace",
    enter(g) {
      g.pace?.stop?.();
      g.pace?.setView?.("running");
      return g.pace?.play?.();
    },
  },
  casualties: {
    // Static: the two comparison-row boxes are already mounted; nothing to do.
    graphic: "rows",
    enter() {},
  },
};

/**
 * `graphics` is the `g` object passed to every STEPS[x].enter().
 * `panels` maps chapter number (1, 2) → the chapter's `.graphic` element,
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

  function enter(stepId) {
    const step = STEPS[stepId];
    if (!step) return;

    const chapter = stepChapter(stepId);
    if (chapter) showGraphic(chapter, step.graphic);

    // The point-map key ("sighting" / "person injured") only makes sense once
    // points are on screen, so the map layer only carries .is-points on the
    // one step that shows them.
    const mapLayer = panels[1] && panels[1].querySelector('.g[data-g="map"]');
    if (mapLayer) mapLayer.classList.toggle("is-points", stepId === "upclose");

    try {
      return step.enter(graphics);
    } catch (err) {
      console.warn(`[director] enter("${stepId}") failed:`, err);
      return undefined;
    }
  }

  return { enter, showGraphic };
}
