// Renders one frame of one X video scene into the fixed 1920x1080 .stage in
// render.html. This is the only consumer of `?scene=&frame=&fps=&dur=` —
// tools/render-video.mjs drives it headlessly, screenshotting after each
// frame is ready.
//
// The five scenes reuse the same graphics modules the live scrolly page
// uses (map-story.js, chart-annual.js, chart-heat.js, chart-mast.js,
// chart-forecast.js) through their deterministic setProgress()-family
// calls, so a video frame is provably the same drawing code as the site,
// just with the camera and progress pinned by frame number instead of
// scroll position.
//
// tools/render-video.mjs reuses one page per scene rather than navigating
// per frame, so window.__renderFrame(frame) has to be able to re-draw in
// place. Everything below is written around that: `setup()` builds the DOM
// and mounts the graphic once, and returns a `renderFrame(frame)` closure
// that the exposed __renderFrame calls on every subsequent frame.
import { loadAllData } from "./data-loader.js";
import { mountStoryMap } from "./map-story.js";
import { mountAnnual } from "./chart-annual.js";
import { mountHeat } from "./chart-heat.js";
import { mountMast } from "./chart-mast.js";
import { mountForecast } from "./chart-forecast.js";

const params = new URLSearchParams(location.search);
const scene = params.get("scene") || "replay";
const fps = Number(params.get("fps")) || 30;

const DEFAULT_DURATION = { record: 8, heat: 10, mast: 10, forecast: 8, replay: 15 };
const dur = Number(params.get("dur")) || DEFAULT_DURATION[scene] || 10;

const COPY = {
  record: {
    title: "Bear sightings in Japan, fiscal 2013 to 2025",
    dek: "50,801 in fiscal 2025, 2.1 times the previous high of 24,348 in fiscal 2023. April to June 2026: 12,628.",
    dateline: "Ministry of the Environment · bearstats.pages.dev",
  },
  heat: {
    title: "Where and when: fiscal 2025 by prefecture and month",
    dek: "October and November 2025 were 26,336 sightings, 52% of the year. Akita alone reported 5,810 in October.",
    dateline: "Ministry of the Environment · bearstats.pages.dev",
  },
  mast: {
    title: "Beech crop and October sightings, 2012 to 2025",
    dek: "Tohoku Regional Forest Office beech index, 0 to 5, over national October sightings. The six largest Octobers all followed a poor crop.",
    dateline: "Tohoku Regional Forest Office; Ministry of the Environment · bearstats.pages.dev",
  },
  forecast: {
    title: "The 2026 beech crop is forecast good",
    dek: "Tohoku July mean index 3.9, against 0.44 in 2025 and 0.54 in 2023. A July forecast of 並作 or better has never ended in 大凶作 in 31 cases.",
    dateline: "Tohoku Regional Forest Office, 7 July 2026 · bearstats.pages.dev",
  },
  replay: {
    title: "Bear reports in four prefectures, month by month",
    dek: "Toyama, Niigata, Gunma and Saitama, April 2025 to March 2026. April 2025: 64 reports. October 2025: 1,795. Yellow marks are people injured.",
    dateline: "Prefectural open data · bearstats.pages.dev",
  },
};

/** t = 0 at frame 0, t = 1 with two seconds of frames still to go, so every
 * scene holds its final state for the last 2s instead of animating right up
 * to the last frame and cutting away mid-motion. */
function progressForFrame(frame) {
  const denom = fps * Math.max(0.001, dur - 2);
  return Math.min(1, frame / denom);
}

/** context.json is built by a separate pipeline; render always needs it, so
 * unlike main.js's tolerant loadContext(), a missing file is a hard error —
 * there is nothing worth rendering without it. */
async function loadContext() {
  const resp = await fetch("data/context.json");
  if (!resp.ok) throw new Error(`data/context.json: HTTP ${resp.status}`);
  return resp.json();
}

/** Wrap every digit run (with thousands separators and decimals) in a
 * `.mono` span so numerals render in JetBrains Mono against the Public Sans
 * prose around them, per the Field Notebook type system (spec §3). */
function withMono(text) {
  return text.replace(/[0-9][0-9,.]*%?/g, m => `<span class="mono">${m}</span>`);
}

function renderTitleBlock() {
  const copy = COPY[scene];
  if (!copy) throw new Error(`unknown scene: ${scene}`);
  document.getElementById("title").innerHTML = withMono(copy.title);
  document.getElementById("dek").innerHTML = withMono(copy.dek);
  document.getElementById("dateline").innerHTML = withMono(copy.dateline);
}

function graphicRoot() {
  return document.getElementById("graphic-inner");
}

// --- scene setup: each returns an (async) renderFrame(frame) closure -------

function setupReplay(data) {
  const root = graphicRoot();
  root.innerHTML = `
    <div class="map-frame"><div id="scene-map" class="map-canvas"></div></div>
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

/** Shared setup for the four chart scenes: mount at half size in a
 * `.chart-canvas`, scale 2x, then drive with setProgress(t). */
function setupChartScene(mountFn, data) {
  const root = graphicRoot();
  root.innerHTML = `<div id="scene-chart" class="chart-canvas"></div>`;
  const chartData = { timeline: data.timeline, totals: data.prefectureTotals, context: data.context };
  const chart = mountFn(document.getElementById("scene-chart"), chartData);
  document.getElementById("scene-chart").classList.add("is-scaled");
  return {
    map: null,
    renderFrame(frame) {
      chart.setProgress(progressForFrame(frame));
    },
  };
}

const setupRecord = data => setupChartScene(mountAnnual, data);
const setupHeat = data => setupChartScene(mountHeat, data);
const setupMast = data => setupChartScene(mountMast, data);
const setupForecast = data => setupChartScene(mountForecast, data);

const SETUP = { record: setupRecord, heat: setupHeat, mast: setupMast, forecast: setupForecast, replay: setupReplay };

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
  const [data, context] = await Promise.all([loadAllData(), loadContext()]);
  data.context = context;
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
