import { loadAllData } from "./data-loader.js";
import { createDirector } from "./director.js";

// Every chart module is built by another agent in parallel and may not exist
// yet (or may not yet export what this page calls). Import them dynamically
// so a missing/broken module degrades to an empty panel instead of taking the
// whole page down — a static `import` of a 404 module aborts the script.
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

/** context.json is built by a separate pipeline and may not be there yet. */
async function loadContext() {
  try {
    const resp = await fetch("data/context.json");
    if (!resp.ok) {
      console.warn(`[bearstats] data/context.json: HTTP ${resp.status}; charts that need it will be empty`);
      return null;
    }
    return await resp.json();
  } catch (err) {
    console.warn("[bearstats] data/context.json failed to load:", err);
    return null;
  }
}

// Spec §6: mountX(container, { timeline, totals, context }) → { play, setProgress, stop, setView? }.
// `key` is the graphics-object slot the director reads; `id` the container.
const PANEL_CHARTS = [
  { key: "annual",     module: "./chart-annual.js",     fn: "mountAnnual",     id: "annual" },
  { key: "harm",       module: "./chart-harm.js",       fn: "mountHarm",       id: "harm" },
  { key: "heat",       module: "./chart-heat.js",       fn: "mountHeat",       id: "heat" },
  { key: "mast",       module: "./chart-mast.js",       fn: "mountMast",       id: "mast" },
  { key: "alternate",  module: "./chart-alternate.js",  fn: "mountAlternate",  id: "alternate" },
  { key: "weather",    module: "./chart-weather.js",    fn: "mountWeather",    id: "weather" },
  { key: "scatter",    module: "./chart-scatter.js",    fn: "mountScatter",    id: "scatter" },
  { key: "forecast",   module: "./chart-forecast.js",   fn: "mountForecast",   id: "forecast" },
  { key: "casualties", module: "./chart-casualties.js", fn: "mountCasualties", id: "casualties" },
];
// Chapter 4 is inline: no panel, no director; these play once when scrolled to.
const INLINE_CHARTS = [
  { key: "licences",   module: "./chart-licences.js",   fn: "mountLicences",   id: "licences" },
  { key: "population", module: "./chart-population.js", fn: "mountPopulation", id: "population" },
];

function mountFromSpec(spec, mod, chartData) {
  return safeMount(spec.id, () => {
    const mount = mod && mod[spec.fn];
    if (typeof mount !== "function") return null;
    const el = document.getElementById(spec.id);
    if (!el) return null;
    return mount(el, chartData);
  });
}

/** The later of the two build stamps, as a Date, or null. */
export function latestStamp(...stamps) {
  const dates = stamps
    .filter(Boolean)
    .map(s => new Date(s))
    .filter(d => !Number.isNaN(d.getTime()));
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map(d => d.getTime())));
}

async function boot() {
  try {
    const [data, context] = await Promise.all([loadAllData(), loadContext()]);
    const chartData = { timeline: data.timeline, totals: data.prefectureTotals, context };

    const [mapMod, monthlyMod, panelMods, inlineMods] = await Promise.all([
      safeImport("./map-story.js"),
      safeImport("./chart-monthly.js"),
      Promise.all(PANEL_CHARTS.map(c => safeImport(c.module))),
      Promise.all(INLINE_CHARTS.map(c => safeImport(c.module))),
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

    graphics.monthly = safeMount("monthly", () => {
      if (!monthlyMod?.mountMonthlyChart) return null;
      const el = document.getElementById("monthly");
      let chart = monthlyMod.mountMonthlyChart(el, chartData);
      // Transitional: the pre-rebuild chart-monthly.js took the timeline
      // itself and draws nothing when handed the data object. Drop this once
      // the extended module (13 years, "spring13" view) has landed.
      if (!el.querySelector("svg")) chart = monthlyMod.mountMonthlyChart(el, data.timeline);
      chart?.setView?.("spring13");
      return chart;
    });

    PANEL_CHARTS.forEach((spec, i) => {
      graphics[spec.key] = mountFromSpec(spec, panelMods[i], chartData);
    });
    const inline = INLINE_CHARTS.map((spec, i) => mountFromSpec(spec, inlineMods[i], chartData));

    const panels = {
      1: document.getElementById("graphic-1"),
      2: document.getElementById("graphic-2"),
      3: document.getElementById("graphic-3"),
    };
    const director = createDirector(graphics, panels);

    window.__bearstats__ = { data, context, graphics, director };

    // The hero's "updated" stamp comes from the data, so it cannot drift:
    // the later of the context build and the timeline fetch.
    const stamp = latestStamp(context?._built_at, data.timeline?._source_fetched_at);
    const updatedEl = document.getElementById("updated");
    if (stamp && updatedEl) {
      updatedEl.textContent = "updated " + stamp.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    }

    // ---- Scrollytelling ----------------------------------------------------
    const allSteps = Array.from(document.querySelectorAll(".step"));
    let currentStepEl = null;

    function activateStep(el, mode = "play") {
      allSteps.forEach(s => s.classList.remove("is-active"));
      el.classList.add("is-active");
      currentStepEl = el;
      director.enter(el.dataset.step, mode);
    }

    // Where a step becomes the active one. On phones the panel is pinned
    // across the top (46vh plus the nav), so the line sits just under it and
    // the active text is always the one in the reading band below the panel.
    const stepOffset = () => window.innerWidth < 800
      ? Math.min(0.6, (0.46 * window.innerHeight + 52) / window.innerHeight)
      : 0.6;

    // Show each panel's opening graphic before any step triggers, so the
    // pinned panel is never an empty block between the chapter head and the
    // first step, and in its finished state, so a reader who arrives fast or
    // whose browser skips a trigger still sees a complete chart.
    director.showGraphic(1, "annual");
    director.showGraphic(2, "mast");
    director.showGraphic(3, "monthly");
    director.enter("annual", "settle");
    director.enter("mast", "settle");
    director.enter("spring", "settle");

    const scroller = typeof scrollama === "function" ? scrollama() : null;
    if (scroller) {
      scroller
        .setup({ step: ".step", offset: stepOffset() })
        .onStepEnter(({ element, direction }) =>
          activateStep(element, direction === "up" ? "settle" : "play"))
        .onStepExit(({ element, direction }) => {
          if (direction !== "up") return;
          const idx = allSteps.indexOf(element);
          const prev = allSteps[idx - 1];
          if (prev) activateStep(prev, "settle");
        });

      // Only recompute positions. Calling setup() again here re-initialised
      // scrollama on every iOS toolbar show/hide and dropped step triggers.
      window.addEventListener("resize", () => scroller.resize());
    }

    // ---- Chapter nav highlight ----------------------------------------------
    const navLinks = Array.from(document.querySelectorAll(".chapter-nav a[data-chapter]"));
    const chapterEls = [1, 2, 3, 4]
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

    // ---- Chapter 4 inline charts: play once, when the section is reached ----
    const inlineCharts = inline.filter(c => c && typeof c.play === "function");
    if (inlineCharts.length) {
      const ch4 = document.getElementById("ch-4");
      if (ch4 && "IntersectionObserver" in window) {
        let played = false;
        const ch4Observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !played) {
              played = true;
              inlineCharts.forEach(c => safeMount("inline play", () => c.play()));
              ch4Observer.disconnect();
            }
          });
        }, { threshold: 0.2 });
        ch4Observer.observe(ch4);
      } else {
        inlineCharts.forEach(c => safeMount("inline play", () => c.play()));
      }
    }

    // ---- Keyboard: replay the current step ----------------------------------
    document.addEventListener("keydown", e => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "r" && currentStepEl) {
        director.enter(currentStepEl.dataset.step);
      }
    });

  } catch (err) {
    console.error("[bearstats] boot failed:", err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="background:#b5482a;color:#f6f1e7;padding:1rem;text-align:center">Failed to load data. Refresh.</div>`
    );
  }
}

if (typeof document !== "undefined") boot();
