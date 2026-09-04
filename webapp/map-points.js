// Point map: FY2025 replayed month by month.
//
// This used to carry a species toggle and a fiscal-year toggle, and both lied.
// Every brown-bear record is Hokkaido and every Honshu record is black, so the
// species control was a prefecture control in disguise — inside the Honshu
// frame it changed nothing. And the year control compared data coverage rather
// than bears: Hokkaido's feed only begins in May 2026, so FY2025 has none of it
// and FY2026 has it appearing from nowhere.
//
// What point data can show that the choropleth cannot is timing. So the section
// replays one complete year instead, and the October surge does the arguing.
//
// The basemap is drawn from the prefecture GeoJSON this site already ships —
// no raster tiles, no third-party requests.
//
// Assumes Leaflet is loaded globally.

// Japanese fiscal year = April M through March M+1.
function inFiscalYear(dateStr, fy) {
  if (!dateStr) return false;
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return false;
  return (m >= 4 && y === fy) || (m <= 3 && y === fy + 1);
}

export { inFiscalYear };

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

const SPECIES_COLORS = { black: "#ff3b30", brown: "#ffa944" };
const TYPE_RADIUS = { sighting: 3, trace: 2, injury: 5, capture: 3 };

const BASE_STYLE = {
  fillColor: "#1e2433",
  fillOpacity: 1,
  color: "#38425c",
  weight: 0.5,
};

export function mountPointsMap(container, points, geo, options = {}) {
  const fiscalYear = options.fiscalYear ?? 2025;
  const { buckets } = monthlyBuckets(points, fiscalYear);

  const map = L.map(container, {
    // Zoom sits top-right; the replay readout occupies the top-left corner.
    zoomControl: false,
    attributionControl: true,
    preferCanvas: true,
    minZoom: 4,
    maxZoom: 12,
  });

  L.control.zoom({ position: "topright" }).addTo(map);
  map.attributionControl.setPrefix("");
  map.attributionControl.addAttribution(
    'Boundaries: <a href="https://github.com/dataofjapan/land">dataofjapan/land</a> · ' +
    'Reports: prefectural open data'
  );

  if (geo) {
    L.geoJSON(geo, { style: () => BASE_STYLE, interactive: false }).addTo(map);
  }

  // Frame the whole year once, so the view never jumps mid-replay.
  const all = buckets.flatMap(b => b.points);
  if (all.length) {
    map.fitBounds(L.latLngBounds(all.map(p => [p.lat, p.lon])), { padding: [24, 24] });
  } else {
    map.setView([37.5, 138.5], 6);
  }

  const monthEl = document.getElementById("replay-month");
  const countEl = document.getElementById("replay-count");
  let layers = [];
  let timer = null;

  function clear() {
    layers.forEach(l => l.remove());
    layers = [];
  }

  function drawMonth(i, { fade = true } = {}) {
    const b = buckets[i];
    // Earlier months stay on the map but recede, so the year accumulates.
    if (fade) layers.forEach(l => l.setStyle && l.setStyle({ fillOpacity: 0.22 }));

    const layer = L.layerGroup(b.points.map(p =>
      L.circleMarker([p.lat, p.lon], {
        radius: TYPE_RADIUS[p.type] || 3,
        color: SPECIES_COLORS[p.species] || "#fff",
        weight: 0,
        fillOpacity: p.type === "injury" ? 0.95 : 0.7,
      }).bindPopup(
        `<strong>${p.city || p.pref}</strong><br>` +
        `${p.type}${p.count ? ` · ${p.count} bears` : ""}<br>${p.date || "date unknown"}`
      )
    )).addTo(map);
    layers.push(layer);

    if (monthEl) monthEl.textContent = b.label;
    if (countEl) {
      countEl.textContent = b.points.length
        ? `${b.points.length.toLocaleString()} reports`
        : "no reports";
    }
  }

  function play(perMonthMs = 620) {
    if (timer) clearInterval(timer);
    clear();
    let i = 0;
    drawMonth(i++, { fade: false });
    timer = setInterval(() => {
      if (i >= buckets.length) { clearInterval(timer); timer = null; return; }
      drawMonth(i++);
    }, perMonthMs);
  }

  /** Show the finished year in one go — used when motion is unwelcome. */
  function showAll() {
    if (timer) { clearInterval(timer); timer = null; }
    clear();
    buckets.forEach((_, i) => drawMonth(i, { fade: false }));
    if (monthEl) monthEl.textContent = `FY${fiscalYear}`;
    if (countEl) countEl.textContent = `${all.length.toLocaleString()} reports`;
  }

  showAll();

  return { play, showAll, map, buckets };
}
