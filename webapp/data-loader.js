// Loads the four JSON files the webapp needs. Returns a promise.
const FILES = {
  timeline: "data/national-timeline.json",
  prefectureTotals: "data/prefecture-totals.json",
  pointsRecent: "data/points-recent.json",
  prefectureGeo: "data/japan-prefectures.geo.json",
};

export async function loadAllData() {
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([key, url]) => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`${url}: HTTP ${resp.status}`);
      return [key, await resp.json()];
    })
  );
  return Object.fromEntries(entries);
}
