// Renders one frame of one X video scene into the fixed 1920x1080 .stage in
// render.html. This is the only consumer of `?scene=&frame=&fps=&dur=` —
// tools/render-video.mjs drives it headlessly, screenshotting after each
// frame is ready.
//
// The four scenes reuse the same graphics modules the live scrolly page
// uses (map-story.js, chart-monthly.js, chart-deaths.js) through their
// deterministic setProgress()-family calls, so a video frame is provably
// the same drawing code as the site, just with the camera and progress
// pinned by frame number instead of scroll position.
//
// tools/render-video.mjs reuses one page per scene rather than navigating
// per frame, so window.__renderFrame(frame) has to be able to re-draw in
// place. Everything below is written around that: `setup()` builds the DOM
// and mounts the graphic once, and returns a `renderFrame(frame)` closure
// that the exposed __renderFrame calls on every subsequent frame.
import { loadAllData } from "./data-loader.js";
import { mountStoryMap } from "./map-story.js";
import { mountMonthlyChart } from "./chart-monthly.js";
import { mountDeathsChart } from "./chart-deaths.js";

const params = new URLSearchParams(location.search);
const scene = params.get("scene") || "replay";
const fps = Number(params.get("fps")) || 30;

const DEFAULT_DURATION = { replay: 15, years: 8, overtake: 10, deaths: 8 };
const dur = Number(params.get("dur")) || DEFAULT_DURATION[scene] || 10;

const COPY = {
  replay: {
    title: "Bear reports in four prefectures, month by month",
    dek: "Toyama, Niigata, Gunma and Saitama, April 2025 to March 2026. April 2025: 64 reports. October 2025: 1,795. Yellow marks are people injured.",
    dateline: "Prefectural open data · bearstats.pages.dev",
  },
  years: {
    title: "Bear sightings by prefecture, fiscal 2022 to 2025",
    dek: "National sightings rose from 11,136 in fiscal 2022 to 50,801 in fiscal 2025. Akita and Iwate reported 46% of the fiscal 2025 total.",
    dateline: "Ministry of the Environment · bearstats.pages.dev",
  },
  overtake: {
    title: "Sightings in 2026 are 67% above the record year",
    dek: "Sightings per month, fiscal 2026 against fiscal 2025. April: 1,787 against 800. May: 4,581 against 2,528. June: 6,260 against 4,227.",
    dateline: "Ministry of the Environment, to 30 June 2026 · bearstats.pages.dev",
  },
  deaths: {
    title: "Bears killed 13 people in the year to March 2026",
    dek: "People killed by bears, by fiscal year. The count began in 2008. The previous high was 6, in fiscal 2023.",
    dateline: "Ministry of the Environment · bearstats.pages.dev",
  },
};

/** t = 0 at frame 0, t = 1 with two seconds of frames still to go, so every
 * scene holds its final state for the last 2s instead of animating right up
 * to the last frame and cutting away mid-motion. */
function progressForFrame(frame) {
  const denom = fps * Math.max(0.001, dur - 2);
  return Math.min(1, frame / denom);
}

function renderTitleBlock() {
  const copy = COPY[scene];
  if (!copy) throw new Error(`unknown scene: ${scene}`);
  document.getElementById("title").textContent = copy.title;
  document.getElementById("dek").textContent = copy.dek;
  document.getElementById("dateline").textContent = copy.dateline;
}

function graphicRoot() {
  return document.getElementById("graphic-inner");
}

// --- scene setup: each returns an (async) renderFrame(frame) closure -------

function setupReplay(data) {
  const root = graphicRoot();
  root.innerHTML = `
    <div id="scene-map" class="map-canvas"></div>
    <div class="replay-readout">
      <span class="replay-month" id="replay-month">—</span>
      <span class="replay-count" id="replay-count"></span>
    </div>
    <div class="map-key">
      <span class="key-item"><span class="dot dot-sighting"></span> Sighting or trace</span>
      <span class="key-item"><span class="dot dot-injury"></span> Person injured</span>
    </div>
  `;
  const story = mountStoryMap(document.getElementById("scene-map"), {
    timeline: data.timeline,
    totals: data.prefectureTotals,
    geo: data.prefectureGeo,
    points: data.pointsRecent,
    fiscalYear: 2025,
    replayMonthEl: document.getElementById("replay-month"),
    replayCountEl: document.getElementById("replay-count"),
    animate: false,
  });

  let focused = false;
  return {
    map: story.map,
    async renderFrame(frame) {
      // The camera holds on the sample prefectures for the whole scene —
      // only fit bounds once, on the first frame, rather than refighting
      // flyToBounds (and its moveend wait) on every call.
      if (!focused) {
        await story.focusSample();
        focused = true;
      }
      story.setMonthProgress(progressForFrame(frame));
    },
  };
}

function setupYears(data) {
  const root = graphicRoot();
  root.innerHTML = `
    <div id="scene-map" class="map-canvas"></div>
    <div class="year-label" id="year-label">—</div>
    <div class="legend" id="map-legend"></div>
  `;
  const story = mountStoryMap(document.getElementById("scene-map"), {
    timeline: data.timeline,
    totals: data.prefectureTotals,
    geo: data.prefectureGeo,
    points: data.pointsRecent,
    fiscalYear: 2025,
    yearLabelEl: document.getElementById("year-label"),
    legendEl: document.getElementById("map-legend"),
    animate: false,
  });

  let focused = false;
  return {
    map: story.map,
    async renderFrame(frame) {
      if (!focused) {
        await story.focusJapan();
        focused = true;
      }
      story.setYearProgress(progressForFrame(frame));
    },
  };
}

function setupOvertake(data) {
  const root = graphicRoot();
  root.innerHTML = `<div id="scene-chart" class="chart-canvas"></div>`;
  const chart = mountMonthlyChart(document.getElementById("scene-chart"), data.timeline);
  document.getElementById("scene-chart").classList.add("is-scaled");
  chart.setView("running");
  return {
    map: null,
    renderFrame(frame) {
      chart.setProgress(progressForFrame(frame));
    },
  };
}

function setupDeaths(data) {
  const root = graphicRoot();
  root.innerHTML = `<div id="scene-chart" class="chart-canvas"></div>`;
  const chart = mountDeathsChart(document.getElementById("scene-chart"), data.timeline);
  document.getElementById("scene-chart").classList.add("is-scaled");
  return {
    map: null,
    renderFrame(frame) {
      chart.setProgress(progressForFrame(frame));
    },
  };
}

const SETUP = { replay: setupReplay, years: setupYears, overtake: setupOvertake, deaths: setupDeaths };

/** Fonts affect text metrics, and Leaflet needs a layout pass (plus
 * invalidateSize, since the map was created before webfonts/layout settled)
 * before a screenshot can be trusted to match what setProgress just drew. */
async function settle(map) {
  await document.fonts.ready;
  await new Promise(requestAnimationFrame);
  if (map) map.invalidateSize();
}

async function main() {
  renderTitleBlock();
  const data = await loadAllData();
  const setupFn = SETUP[scene];
  if (!setupFn) throw new Error(`unknown scene: ${scene}`);
  const { map, renderFrame } = setupFn(data);

  window.__renderFrame = async (frame) => {
    window.__frameReady = false;
    try {
      await renderFrame(frame);
      await settle(map);
      window.__frameReady = true;
    } catch (err) {
      window.__frameError = String((err && err.stack) || err);
    }
  };

  await window.__renderFrame(Number(params.get("frame")) || 0);
}

main().catch(err => {
  window.__frameError = String((err && err.stack) || err);
});
