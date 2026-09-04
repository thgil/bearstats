import { loadAllData } from "./data-loader.js";
import { mountRows } from "./chart-rows.js";
import { animateAllCounters } from "./counters.js";
import { createDirector } from "./director.js";

// map-story.js, chart-monthly.js, chart-pace.js and chart-deaths.js are owned
// by other agents building in parallel and may not exist yet (or may not yet
// export the scrolly-view methods this page calls). Import them dynamically
// so a missing/broken module degrades to an empty panel instead of taking the
// whole page down — a static `import` of a 404 module would abort the entire
// script.
async function safeImport(path) {
  try {
    return await import(path);
  } catch (err) {
    console.warn(`[bearstats] could not load ${path}:`, err);
    return null;
  }
}

/** Mount one graphic, swallowing any error so the shell keeps rendering. */
function safeMount(label, fn) {
  try {
    return fn();
  } catch (err) {
    console.warn(`[bearstats] ${label} mount failed:`, err);
    return null;
  }
}

async function boot() {
  try {
    const data = await loadAllData();

    const [mapMod, monthlyMod, paceMod, deathsMod] = await Promise.all([
      safeImport("./map-story.js"),
      safeImport("./chart-monthly.js"),
      safeImport("./chart-pace.js"),
      safeImport("./chart-deaths.js"),
    ]);

    const graphics = {};

    graphics.map = safeMount("map", () => {
      if (!mapMod?.mountStoryMap) return null;
      return mapMod.mountStoryMap(document.getElementById("map"), {
        timeline: data.timeline,
        totals: data.prefectureTotals,
        geo: data.prefectureGeo,
        points: data.pointsRecent,
        fiscalYear: 2025,
        yearLabelEl: document.getElementById("map-year"),
        replayMonthEl: document.getElementById("replay-month"),
        replayCountEl: document.getElementById("replay-count"),
        legendEl: document.getElementById("map-legend"),
      });
    });

    graphics.monthly1 = safeMount("monthly-1", () => {
      if (!monthlyMod?.mountMonthlyChart) return null;
      const chart = monthlyMod.mountMonthlyChart(document.getElementById("monthly-1"), data.timeline);
      chart?.setView?.("closed");
      return chart;
    });

    graphics.monthly2 = safeMount("monthly-2", () => {
      if (!monthlyMod?.mountMonthlyChart) return null;
      const chart = monthlyMod.mountMonthlyChart(document.getElementById("monthly-2"), data.timeline);
      chart?.setView?.("running");
      return chart;
    });

    graphics.deaths = safeMount("deaths", () => {
      if (!deathsMod?.mountDeathsChart) return null;
      return deathsMod.mountDeathsChart(document.getElementById("deaths"), data.timeline);
    });

    graphics.pace = safeMount("pace", () => {
      if (!paceMod?.mountPaceChart) return null;
      const chart = paceMod.mountPaceChart(document.getElementById("pace"), data.timeline);
      chart?.setView?.("running");
      return chart;
    });

    safeMount("rows-injuries", () => mountRows(document.getElementById("rows-injuries"), data.timeline, "injuries"));
    safeMount("rows-deaths", () => mountRows(document.getElementById("rows-deaths"), data.timeline, "deaths"));

    // Chapter 3's inline chart: its own instance, in "caution" view, outside
    // the director's remit (chapter 3 has no sticky graphic panel).
    const paceCaution = safeMount("pace-caution", () => {
      if (!paceMod?.mountPaceChart) return null;
      const chart = paceMod.mountPaceChart(document.getElementById("pace-caution"), data.timeline);
      chart?.setView?.("caution");
      return chart;
    });

    const panels = {
      1: document.getElementById("graphic-1"),
      2: document.getElementById("graphic-2"),
    };
    const director = createDirector(graphics, panels);

    window.__bearstats__ = { data, graphics, director };

    // Hero counters: the hero is the first thing on screen, so animate on load.
    const heroEl = document.getElementById("hero");
    if (heroEl) animateAllCounters(heroEl);

    // ---- Scrollytelling ----------------------------------------------------
    const allSteps = Array.from(document.querySelectorAll(".step"));
    let currentStepEl = null;

    function activateStep(el) {
      allSteps.forEach(s => s.classList.remove("is-active"));
      el.classList.add("is-active");
      currentStepEl = el;
      director.enter(el.dataset.step);
    }

    const scroller = typeof scrollama === "function" ? scrollama() : null;
    if (scroller) {
      scroller
        .setup({ step: ".step", // On phones the panel takes the top of the screen, so the trigger line
      // sits lower, where the reading band is.
      offset: window.innerWidth < 800 ? 0.8 : 0.6 })
        .onStepEnter(({ element }) => activateStep(element))
        .onStepExit(({ element, direction }) => {
          if (direction !== "up") return;
          const idx = allSteps.indexOf(element);
          const prev = allSteps[idx - 1];
          if (prev) activateStep(prev);
        });

      window.addEventListener("resize", () => scroller.resize());
    }

    // ---- Chapter nav highlight ----------------------------------------------
    const navLinks = Array.from(document.querySelectorAll(".chapter-nav a[data-chapter]"));
    const chapterEls = [1, 2, 3]
      .map(n => document.getElementById(`ch-${n}`))
      .filter(Boolean);

    if ("IntersectionObserver" in window && chapterEls.length) {
      const chapterObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const chapterNum = chapterEls.indexOf(entry.target) + 1;
          navLinks.forEach(a => a.classList.toggle("is-current", Number(a.dataset.chapter) === chapterNum));
        });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      chapterEls.forEach(el => chapterObserver.observe(el));
    }

    // ---- Chapter 3 inline chart: plays once, when its section is reached ---
    if (paceCaution?.play) {
      const ch3 = document.getElementById("ch-3");
      if (ch3 && "IntersectionObserver" in window) {
        let played = false;
        const ch3Observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !played) {
              played = true;
              paceCaution.play();
              ch3Observer.disconnect();
            }
          });
        }, { threshold: 0.3 });
        ch3Observer.observe(ch3);
      } else {
        paceCaution.play();
      }
    }

    // ---- Keyboard: replay the current step ----------------------------------
    document.addEventListener("keydown", e => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "r" && currentStepEl) {
        director.enter(currentStepEl.dataset.step);
      }
    });

  } catch (err) {
    console.error("[bearstats] boot failed:", err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="background:#b00;color:#fff;padding:1rem;text-align:center">Failed to load data. Refresh.</div>`
    );
  }
}

boot();
