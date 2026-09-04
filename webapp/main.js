import { createState } from "./state.js";
import { loadAllData } from "./data-loader.js";
import { mountPaceChart } from "./chart-pace.js";
import { mountRows } from "./chart-rows.js";
import { mountDeathsChart } from "./chart-deaths.js";
import { mountChoropleth } from "./map-choropleth.js";
import { mountPointsMap } from "./map-points.js";
import { animateAllCounters } from "./counters.js";

const state = createState({
  metric: "sightings",
  year: 2025,
  species: "all",
});
export { state };

async function boot() {
  try {
    const data = await loadAllData();
    window.__bearstats__ = { state, data };

    const heroChart = mountPaceChart(
      document.getElementById("hero-chart"),
      data.timeline
    );

    // The two tiles are the chart's read-off date, stated as numbers.
    const ytdSightings = (data.timeline.ytd || {}).sightings;
    if (ytdSightings) {
      const n = ytdSightings.values.length;
      document.getElementById("tile-bench").textContent =
        ytdSightings.values[n - 2].toLocaleString();
      document.getElementById("tile-current").textContent =
        ytdSightings.values[n - 1].toLocaleString();
    }

    mountRows(document.getElementById("cmp-deaths"), data.timeline, "deaths");
    mountRows(document.getElementById("cmp-injuries"), data.timeline, "injuries");

    const deathsChart = mountDeathsChart(
      document.getElementById("deaths-chart"),
      data.timeline
    );

    const choropleth = mountChoropleth(
      document.getElementById("choropleth"),
      data.timeline,
      data.prefectureTotals,
      data.prefectureGeo,
      "sightings"
    );

    const pointsMap = mountPointsMap(
      document.getElementById("points-map"),
      data.pointsRecent,
      data.prefectureGeo,
      { fiscalYear: 2025 }
    );
    window.__bearstats__.pointsMap = pointsMap;
    window.__bearstats__.heroChart = heroChart;
    window.__bearstats__.choropleth = choropleth;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scroller = scrollama();
    scroller
      .setup({
        step: ".scroll-section",
        offset: 0.5,
        once: true,
      })
      .onStepEnter(({ element }) => {
        if (element.id === "section-hero")   heroChart.play();
        if (element.id === "section-map")    choropleth.playAll();
        if (element.id === "section-points" && !reduceMotion) pointsMap.play();
        if (element.id === "section-cost") {
          animateAllCounters(element);
          deathsChart.play();
        }
      });

    window.addEventListener("resize", () => scroller.resize());

    // Scroll progress bar
    const progressEl = document.getElementById("scroll-progress");
    if (progressEl) {
      const updateProgress = () => {
        const scrolled = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const pct = maxScroll > 0 ? Math.min(100, (scrolled / maxScroll) * 100) : 0;
        progressEl.style.width = pct + "%";
      };
      window.addEventListener("scroll", updateProgress, { passive: true });
      updateProgress();
    }

    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        heroChart.play();
      }
      if (e.key === "r" && !reduceMotion) pointsMap.play();
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
