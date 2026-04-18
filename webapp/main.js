import { createState } from "./state.js";
import { loadAllData } from "./data-loader.js";
import { mountLineChart } from "./chart-line.js";

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
    setTimeout(() => heroChart.play(), 400);
  } catch (err) {
    console.error("[bearstats] boot failed:", err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="background:#b00;color:#fff;padding:1rem;text-align:center">Failed to load data. Refresh.</div>`
    );
  }
}

boot();
