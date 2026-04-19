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
      { fiscalYear: 2025, species: "black" }
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

    document.querySelectorAll('#section-hero .toggle[data-metric]').forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll('#section-hero .toggle').forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        heroChart.setMetric(btn.dataset.metric);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        heroChart.play();
      }
      if (e.key === "1") heroChart.setMetric("sightings");
      if (e.key === "2") heroChart.setMetric("injuries");
      if (e.key === "3") heroChart.setMetric("deaths");
    });

    document.querySelectorAll('#section-points .toggle[data-species]').forEach(btn => {
      btn.addEventListener("click", () => {
        const container = btn.closest(".scroll-section");
        container.querySelectorAll('.toggle[data-species]').forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        pointsMap.setFilters({ fiscalYear: 2025, species: btn.dataset.species });
      });
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
