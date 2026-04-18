import { createState } from "./state.js";
import { loadAllData } from "./data-loader.js";

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
    console.log("[bearstats] loaded data:", {
      timeline_years_sightings: data.timeline.years_sightings,
      prefecture_totals_metrics: Object.keys(data.prefectureTotals.metrics),
      points_count: data.pointsRecent.length,
      geo_features: data.prefectureGeo.features.length,
    });
  } catch (err) {
    console.error("[bearstats] data load failed:", err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="background:#b00;color:#fff;padding:1rem;text-align:center">Failed to load data. Refresh to retry.</div>`
    );
  }
}

boot();
