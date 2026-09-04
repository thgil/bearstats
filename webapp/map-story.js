// One Leaflet map for the whole "what happened" chapter: a choropleth that
// plays year by year and zooms into Tohoku, then the same instance flies to
// the four point-data prefectures and replays their year month by month.
//
// Splitting this into two maps (as the previous choropleth/points modules
// did) forced every scroll transition to cut between two views that never
// agreed on projection or extent. One map means the Tohoku-to-sample-
// prefectures move can be flown rather than implied, and the choropleth stays
// visible (dimmed) under the points so the geography still reads.
//
// Assumes Leaflet and D3 are loaded globally via <script> tags.

// --- pure helpers, migrated from map-choropleth.js / map-points.js ---------

export function maxForMetricAcrossYears(totals, metric) {
  const byYear = totals.metrics[metric] || {};
  let max = 0;
  for (const year of Object.keys(byYear)) {
    for (const v of Object.values(byYear[year])) {
      if (v > max) max = v;
    }
  }
  return max;
}

export function valueForPrefYear(totals, metric, year, prefKey) {
  const byYear = totals.metrics[metric];
  if (!byYear) return 0;
  const slot = byYear[String(year)];
  if (!slot) return 0;
  return slot[prefKey] || 0;
}

/**
 * Complete fiscal years for a metric, in order.
 *
 * A year still in progress is published as a year-to-date figure; dropping it
 * keeps the playback a like-for-like comparison and stops the animation
 * finishing on a near-empty map that reads as a sudden collapse.
 */
export function yearsForMetric(timeline, metric) {
  const years = metric === "sightings" ? timeline.years_sightings :
                metric === "captures_total" ? timeline.years_captures :
                timeline.years_injuries;
  const partial = new Set(timeline.partial_years || []);
  const complete = (years || []).filter(y => !partial.has(y));
  return complete.length ? complete : (years || []);
}

// Japanese fiscal year = April M through March M+1.
export function inFiscalYear(dateStr, fy) {
  if (!dateStr) return false;
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return false;
  return (m >= 4 && y === fy) || (m <= 3 && y === fy + 1);
}

export function filterPoints(points, filters = {}) {
  return points.filter(p => {
    if (filters.species && filters.species !== "all" && p.species !== filters.species) return false;
    if (filters.pref && p.pref !== filters.pref) return false;
    if (filters.fiscalYear != null && !inFiscalYear(p.date, filters.fiscalYear)) return false;
    if (filters.year && !(p.date || "").startsWith(String(filters.year))) return false;
    if (filters.type && p.type !== filters.type) return false;
    return true;
  });
}

const FISCAL_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
const MONTH_NAMES = {
  1: "January", 2: "February", 3: "March", 4: "April", 5: "May", 6: "June",
  7: "July", 8: "August", 9: "September", 10: "October", 11: "November", 12: "December",
};

/**
 * Group one fiscal year's points into twelve monthly buckets, in fiscal order.
 * Undated records are dropped here rather than silently disappearing into a
 * filter — `dropped` reports how many, so the caller can be honest about it.
 */
export function monthlyBuckets(points, fiscalYear) {
  const inYear = points.filter(p => inFiscalYear(p.date, fiscalYear));
  const dropped = points.filter(p => !p.date).length;
  return {
    dropped,
    buckets: FISCAL_MONTHS.map(month => {
      const calYear = month >= 4 ? fiscalYear : fiscalYear + 1;
      return {
        month,
        calYear,
        label: `${MONTH_NAMES[month]} ${calYear}`,
        points: inYear.filter(p => Number(p.date.slice(5, 7)) === month),
      };
    }),
  };
}

// --- new pure helpers --------------------------------------------------------

export const TOHOKU = ["aomori", "iwate", "miyagi", "akita", "yamagata", "fukushima"];
export const SAMPLE_PREFS = ["toyama", "niigata", "gunma", "saitama"];

/**
 * Share (0–1) of a year's national sightings total held by a set of
 * prefectures. Used both for the Akita+Iwate headline (~0.459 in FY2025)
 * and to confirm Tohoku as a whole clears 60%.
 */
export function prefShare(totals, year, prefs) {
  const slot = (totals.metrics.sightings || {})[String(year)] || {};
  const national = Object.values(slot).reduce((a, b) => a + b, 0);
  if (!national) return 0;
  const sum = prefs.reduce((a, p) => a + (slot[p] || 0), 0);
  return sum / national;
}

/** Clamp t to [0,1] and map it onto a step index 0..n-1. Shared by the year
 * and month progress mappers below — both are "pick the step this far
 * through the sequence", just over a different n. */
function progressIndex(t, n) {
  if (n <= 1) return 0;
  const clamped = Math.min(1, Math.max(0, t));
  return Math.min(n - 1, Math.floor(clamped * n));
}

export function yearIndexForProgress(t, n) {
  return progressIndex(t, n);
}

export function monthIndexForProgress(t, n) {
  return progressIndex(t, n);
}

const ACCENT = "#ff3b30";
const INJURY = "#ffd166";
const TYPE_RADIUS = { sighting: 3, trace: 2, capture: 3 };
const TYPE_FILL_OPACITY = { sighting: 0.55, trace: 0.35, capture: 0.55 };

/**
 * Leaflet circleMarker options for one point record. Injuries get their own
 * pane (drawn on top, never faded) and a colour that owes nothing to
 * species — the old species-coloured map made every injury look like an
 * ordinary red sighting.
 */
export function pointStyle(p) {
  if (p.type === "injury") {
    return {
      radius: 6,
      fillColor: INJURY,
      color: "#0f1419",
      weight: 1.5,
      fillOpacity: 1,
      pane: "injuries",
    };
  }
  return {
    radius: TYPE_RADIUS[p.type] ?? 3,
    fillColor: ACCENT,
    color: ACCENT,
    weight: 0,
    fillOpacity: TYPE_FILL_OPACITY[p.type] ?? 0.55,
  };
}

// --- map ----------------------------------------------------------------------

const SEA = "#12161f";
const LAND_BASE = "#1e2433";
const BORDER = "#38425c";
const TOHOKU_OUTLINE = "#e8e8ea";
const MONTH_FADE_OPACITY = 0.18;
const JAPAN_CENTER = [37.5, 138.0];
const JAPAN_ZOOM = 5;

const METRIC_LABELS = { sightings: "sightings" };

function colorForValue(value, maxV) {
  if (value <= 0 || maxV <= 0) return LAND_BASE;
  const t = Math.min(1, value / maxV);
  return d3.interpolateYlOrRd(0.2 + t * 0.75);
}

/**
 * Fade the low end toward the empty-prefecture fill.
 *
 * The colour ramp starts at an already-saturated yellow, so on its own a
 * prefecture with a handful of sightings looks much like one with a few
 * thousand. Carrying opacity alongside hue lets the quiet parts of the
 * country recede and the hotspots carry the map.
 */
function opacityForValue(value, maxV) {
  if (value <= 0 || maxV <= 0) return 1;
  const t = Math.min(1, value / maxV);
  return 0.3 + Math.sqrt(t) * 0.65;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Step through `items` over `totalMs`, calling `draw(item, i)` for each one.
 * Reduced motion (or the caller asking for it explicitly) draws every step
 * back-to-back with no delay, landing on the same end state without a wait —
 * "jump to final state" and "deterministic setProgress" are the same code
 * path here.
 *
 * `stopToken` is a `{ gen, timer, pending }` box shared with the map
 * instance. Bumping `gen` mid-sequence stops the loop from drawing any more
 * steps, and `stop()` also resolves every promise in `pending` directly —
 * otherwise a stepThrough whose timer got cleared would never reach the
 * `gen` check again and its promise would hang forever.
 */
function stepThrough(items, totalMs, draw, stopToken, { instant = false } = {}) {
  return new Promise(resolve => {
    if (!items.length) { resolve(); return; }
    const myGen = stopToken.gen;
    const finish = () => {
      const idx = stopToken.pending.indexOf(finish);
      if (idx !== -1) stopToken.pending.splice(idx, 1);
      resolve();
    };
    if (instant || prefersReducedMotion()) {
      items.forEach((item, i) => draw(item, i));
      finish();
      return;
    }
    stopToken.pending.push(finish);
    const perStepMs = totalMs / items.length;
    let i = 0;
    function step() {
      if (stopToken.gen !== myGen) { finish(); return; }
      draw(items[i], i);
      i++;
      if (i >= items.length) { finish(); return; }
      stopToken.timer = setTimeout(step, perStepMs);
    }
    step();
  });
}

/**
 * Mount the story map. One Leaflet instance carries both the choropleth
 * (years) and the point replay (months); `mode` tracks which is visually
 * foregrounded so the two don't fight over the same fill opacity.
 */
export function mountStoryMap(container, {
  timeline, totals, geo, points, fiscalYear = 2025,
  yearLabelEl, replayMonthEl, replayCountEl, legendEl,
  animate = true,
} = {}) {
  container.style.background = SEA;

  const map = L.map(container, {
    zoomControl: false,
    attributionControl: true,
    preferCanvas: true,
    minZoom: 4,
    maxZoom: 12,
    zoomAnimation: animate,
    fadeAnimation: animate,
    markerZoomAnimation: animate,
  }).setView(JAPAN_CENTER, JAPAN_ZOOM);

  map.attributionControl.setPrefix("");
  map.attributionControl.addAttribution(
    'Boundaries: <a href="https://github.com/dataofjapan/land">dataofjapan/land</a> · ' +
    'Reports: prefectural open data'
  );

  // Injuries live in their own pane so they always draw above sightings and
  // traces, and never take part in the month-replay fade.
  map.createPane("injuries");
  map.getPane("injuries").style.zIndex = 650;

  const sampleFyPoints = points.filter(p => SAMPLE_PREFS.includes(p.pref) && inFiscalYear(p.date, fiscalYear));
  const { buckets } = monthlyBuckets(points.filter(p => SAMPLE_PREFS.includes(p.pref)), fiscalYear);

  const years = yearsForMetric(timeline, "sightings");

  const state = {
    mode: "choropleth",
    year: years.at(-1),
    tohokuFocus: false,
  };
  const stopToken = { gen: 0, timer: null, pending: [] };

  const featureLayers = new Map(); // prefCode -> Leaflet layer
  let geoLayer = null;
  let tohokuOutlines = []; // { layer, tooltip } for akita/iwate

  let pointLayers = [];

  // --- choropleth ------------------------------------------------------------

  function renderLegend() {
    if (!legendEl) return;
    const maxV = maxForMetricAcrossYears(totals, "sightings");
    legendEl.innerHTML = `
      <div class="legend-bar" aria-hidden="true"></div>
      <div class="legend-scale">
        <span>0 ${METRIC_LABELS.sightings}</span>
        <span>${maxV.toLocaleString()} / year</span>
      </div>
    `;
  }

  function baseStyleFor(prefCode) {
    const maxV = maxForMetricAcrossYears(totals, "sightings");
    const v = valueForPrefYear(totals, "sightings", state.year, prefCode);
    return {
      fillColor: colorForValue(v, maxV),
      baseOpacity: opacityForValue(v, maxV),
      color: BORDER,
      weight: 0.6,
    };
  }

  /** Recompute every feature's on-screen style from current state. This is
   * the single place choropleth-year, Tohoku-focus and points-mode dimming
   * combine, so calling it after any state change is always correct rather
   * than needing each caller to reason about compounding opacity. */
  function applyChoroplethStyles() {
    featureLayers.forEach((layer, prefCode) => {
      const base = baseStyleFor(prefCode);
      let opacity = base.baseOpacity;
      if (state.tohokuFocus && !TOHOKU.includes(prefCode)) opacity *= 0.25;
      if (state.mode === "points") opacity *= 0.25;
      layer.setStyle({ fillColor: base.fillColor, fillOpacity: opacity, color: base.color, weight: base.weight });
    });
  }

  function buildGeoLayer() {
    if (geoLayer) geoLayer.remove();
    featureLayers.clear();
    geoLayer = L.geoJSON(geo, {
      style: () => ({ color: BORDER, weight: 0.6, fillColor: LAND_BASE, fillOpacity: 1 }),
      onEachFeature: (feature, layer) => {
        featureLayers.set(feature.properties.code, layer);
      },
    }).addTo(map);
    applyChoroplethStyles();
  }

  function showChoropleth(year) {
    state.year = year;
    if (!geoLayer) buildGeoLayer();
    else applyChoroplethStyles();
    if (yearLabelEl) yearLabelEl.textContent = String(year);
  }

  function playYears(totalMs = 4000) {
    return stepThrough(years, totalMs, (year) => showChoropleth(year), stopToken);
  }

  function setYearProgress(t) {
    const idx = yearIndexForProgress(t, years.length);
    showChoropleth(years[idx]);
  }

  // --- Tohoku / sample focus ---------------------------------------------------

  function fitOptions() {
    return animate ? {} : { animate: false };
  }

  function boundsFor(prefCodes) {
    const latlngs = [];
    prefCodes.forEach(code => {
      const layer = featureLayers.get(code);
      if (layer) latlngs.push(layer.getBounds());
    });
    if (!latlngs.length) return null;
    return latlngs.reduce((acc, b) => acc ? acc.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast()), null);
  }

  // Leaflet fires "moveend" even when a fitBounds/flyTo/setView call targets
  // the map's current position (verified empirically — it does not skip the
  // event just because nothing visibly moved), so listening unconditionally
  // before starting the move satisfies "resolve on moveend, or immediately
  // if the view doesn't change" without needing to special-case that in code.
  function waitForMoveEnd() {
    return new Promise(resolve => { map.once("moveend", resolve); });
  }

  function clearTohokuOutlines() {
    tohokuOutlines.forEach(({ tooltip }) => map.removeLayer(tooltip));
    tohokuOutlines = [];
  }

  function focusTohoku() {
    if (!geoLayer) buildGeoLayer();
    state.tohokuFocus = true;
    clearTohokuOutlines();
    ["akita", "iwate"].forEach(code => {
      const layer = featureLayers.get(code);
      if (!layer) return;
      layer.setStyle({ color: TOHOKU_OUTLINE, weight: 1.5 });
      const feature = layer.feature;
      const name = (feature && feature.properties && (feature.properties.name_en || feature.properties.nam)) || code;
      const tooltip = L.tooltip({ permanent: true, direction: "center", className: "pref-label" })
        .setLatLng(layer.getBounds().getCenter())
        .setContent(name)
        .addTo(map);
      tohokuOutlines.push({ layer, tooltip });
    });
    applyChoroplethStyles();
    const bounds = boundsFor(TOHOKU);
    if (!bounds) return Promise.resolve();
    const p = waitForMoveEnd();
    map.flyToBounds(bounds, { padding: [24, 24], ...fitOptions() });
    return p;
  }

  function focusJapan() {
    state.tohokuFocus = false;
    tohokuOutlines.forEach(({ layer }) => layer.setStyle({ color: BORDER, weight: 0.6 }));
    clearTohokuOutlines();
    applyChoroplethStyles();
    const p = waitForMoveEnd();
    map.flyTo(JAPAN_CENTER, JAPAN_ZOOM, fitOptions());
    return p;
  }

  function focusSample() {
    if (!sampleFyPoints.length) return Promise.resolve();
    const bounds = L.latLngBounds(sampleFyPoints.map(pt => [pt.lat, pt.lon]));
    const p = waitForMoveEnd();
    map.flyToBounds(bounds, { padding: [24, 24], ...fitOptions() });
    return p;
  }

  // --- points ------------------------------------------------------------------

  function clearPointLayers() {
    pointLayers.forEach(l => l.remove());
    pointLayers = [];
  }

  function drawPoint(p) {
    const style = pointStyle(p);
    const marker = L.circleMarker([p.lat, p.lon], style).bindPopup(
      `<strong>${p.city || p.pref}</strong><br>` +
      `${p.type}${p.count ? ` · ${p.count} bears` : ""}<br>${p.date || "date unknown"}`
    ).addTo(map);
    pointLayers.push(marker);
    return marker;
  }

  function showPoints() {
    if (!geoLayer) buildGeoLayer();
    state.mode = "points";
    applyChoroplethStyles();
    clearPointLayers();
    sampleFyPoints.forEach(drawPoint);
  }

  function hidePoints() {
    state.mode = "choropleth";
    clearPointLayers();
    applyChoroplethStyles();
  }

  function updateReadout(bucket) {
    if (replayMonthEl) replayMonthEl.textContent = bucket.label;
    if (replayCountEl) {
      const hurt = bucket.points.filter(p => p.type === "injury").length;
      let html = `${bucket.points.length.toLocaleString()} reports`;
      if (hurt > 0) html += ` · <span class="hurt">${hurt} hurt</span>`;
      replayCountEl.innerHTML = html;
    }
  }

  /** Draw months 0..idx accumulated: the current month at full style, earlier
   * non-injury points faded, injuries always full — this is the single
   * rendering path shared by the timed replay and the deterministic
   * setMonthProgress, so both can never disagree about what a given month
   * looks like. */
  function renderMonthsUpTo(idx) {
    clearPointLayers();
    for (let i = 0; i <= idx; i++) {
      const isCurrent = i === idx;
      buckets[i].points.forEach(p => {
        const marker = drawPoint(p);
        if (!isCurrent && p.type !== "injury") {
          marker.setStyle({ fillOpacity: MONTH_FADE_OPACITY });
        }
      });
    }
    updateReadout(buckets[idx]);
  }

  function replayMonths(perMonthMs = 620) {
    state.mode = "points";
    applyChoroplethStyles();
    return stepThrough(buckets, perMonthMs * buckets.length, (_bucket, i) => renderMonthsUpTo(i), stopToken);
  }

  function setMonthProgress(t) {
    if (!buckets.length) return;
    state.mode = "points";
    applyChoroplethStyles();
    const idx = monthIndexForProgress(t, buckets.length);
    renderMonthsUpTo(idx);
  }

  function stop() {
    stopToken.gen++;
    if (stopToken.timer) { clearTimeout(stopToken.timer); stopToken.timer = null; }
    stopToken.pending.slice().forEach(finish => finish());
  }

  buildGeoLayer();
  showChoropleth(state.year);
  renderLegend();

  return {
    showChoropleth,
    playYears,
    setYearProgress,
    focusJapan,
    focusTohoku,
    focusSample,
    showPoints,
    replayMonths,
    setMonthProgress,
    hidePoints,
    stop,
    map,
    buckets,
  };
}
