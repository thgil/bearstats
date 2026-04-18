// Leaflet point overlay for current-year sightings.
// Assumes Leaflet is loaded globally.

export function filterPoints(points, filters = {}) {
  return points.filter(p => {
    if (filters.species && filters.species !== "all" && p.species !== filters.species) return false;
    if (filters.pref && p.pref !== filters.pref) return false;
    if (filters.year && !(p.date || "").startsWith(String(filters.year))) return false;
    if (filters.type && p.type !== filters.type) return false;
    return true;
  });
}

const SPECIES_COLORS = {
  black: "#ff3b30",
  brown: "#ffa944",
};

const TYPE_RADIUS = {
  sighting: 3,
  trace:    2,
  injury:   5,
  capture:  3,
};

export function mountPointsMap(container, points, initialFilters = { year: 2025, species: "black" }) {
  const map = L.map(container, {
    zoomControl: true,
    attributionControl: false,
  }).setView([39.5, 140.5], 6);

  let layer = null;

  function redraw(filters) {
    if (layer) layer.remove();
    const filtered = filterPoints(points, filters);
    layer = L.layerGroup(filtered.map(p =>
      L.circleMarker([p.lat, p.lon], {
        radius: TYPE_RADIUS[p.type] || 3,
        color: SPECIES_COLORS[p.species] || "#fff",
        weight: 0,
        fillOpacity: 0.7,
      }).bindPopup(
        `<strong>${p.city || p.pref}</strong><br>` +
        `${p.type}${p.count ? ` · ${p.count} bears` : ""}<br>` +
        `${p.date || "date unknown"}`
      )
    )).addTo(map);
  }

  redraw(initialFilters);

  return {
    setFilters: redraw,
  };
}
