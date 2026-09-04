// Leaflet choropleth with year-by-year playback.
// Assumes Leaflet and D3 are loaded globally via <script> tags.

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

/**
 * Mount the choropleth. Returns { playAll, setYear, setMetric }.
 */
export function mountChoropleth(container, timeline, totals, geo, initialMetric = "sightings") {
  const map = L.map(container, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    touchZoom: false,
  }).setView([37.5, 138.0], 5);

  let currentMetric = initialMetric;
  let currentYear = yearsForMetric(timeline, initialMetric).at(-1);
  let geoLayer = null;
  const yearLabelEl = document.getElementById("year-label");
  const legendEl = document.getElementById("choropleth-legend");

  const METRIC_LABELS = {
    sightings: "sightings",
    injuries: "people injured",
    deaths: "people killed",
    captures_total: "captures",
  };

  function renderLegend() {
    if (!legendEl) return;
    const maxV = maxForMetricAcrossYears(totals, currentMetric);
    const label = METRIC_LABELS[currentMetric] || currentMetric;
    legendEl.innerHTML = `
      <div class="legend-bar" aria-hidden="true"></div>
      <div class="legend-scale">
        <span>0 ${label}</span>
        <span>${maxV.toLocaleString()} / year</span>
      </div>
    `;
  }

  const EMPTY_FILL = "#2a2f40";

  function colorForValue(value, maxV) {
    if (value <= 0 || maxV <= 0) return EMPTY_FILL;
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

  function redraw() {
    const maxV = maxForMetricAcrossYears(totals, currentMetric);
    if (geoLayer) geoLayer.remove();
    geoLayer = L.geoJSON(geo, {
      style: (feat) => {
        const v = valueForPrefYear(totals, currentMetric, currentYear, feat.properties.code);
        return {
          fillColor: colorForValue(v, maxV),
          fillOpacity: opacityForValue(v, maxV),
          color: "#0f1419",
          weight: 0.6,
        };
      },
    }).addTo(map);
    if (yearLabelEl) yearLabelEl.textContent = String(currentYear);
  }

  function setYear(y) {
    currentYear = y;
    redraw();
  }

  function setMetric(m) {
    currentMetric = m;
    const years = yearsForMetric(timeline, m);
    currentYear = years.at(-1);
    redraw();
    renderLegend();
  }

  function playAll(durationMs = 8000) {
    const years = yearsForMetric(timeline, currentMetric);
    const perYear = durationMs / years.length;
    let i = 0;
    const timer = setInterval(() => {
      if (i >= years.length) { clearInterval(timer); return; }
      setYear(years[i]);
      i++;
    }, perYear);
  }

  redraw();
  renderLegend();

  return { playAll, setYear, setMetric };
}
