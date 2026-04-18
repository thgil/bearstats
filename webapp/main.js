import { createState } from "./state.js";
import { loadAllData } from "./data-loader.js";
import { mountLineChart } from "./chart-line.js";
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

    const heroChart = mountLineChart(
      document.getElementById("hero-chart"),
      data.timeline,
      "sightings"
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
      { year: 2025, species: "black" }
    );
    window.__bearstats__.pointsMap = pointsMap;
    window.__bearstats__.heroChart = heroChart;
    window.__bearstats__.choropleth = choropleth;

    const scroller = scrollama();
    scroller
      .setup({
        step: ".scroll-section",
        offset: 0.5,
        once: true,
      })
      .onStepEnter(({ element }) => {
        if (element.id === "section-hero")  heroChart.play();
        if (element.id === "section-map")   choropleth.playAll();
        if (element.id === "section-cost")  animateAllCounters(element);
      });

    window.addEventListener("resize", () => scroller.resize());
  } catch (err) {
    console.error("[bearstats] boot failed:", err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="background:#b00;color:#fff;padding:1rem;text-align:center">Failed to load data. Refresh.</div>`
    );
  }
}

boot();
