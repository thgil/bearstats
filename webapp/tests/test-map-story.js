import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  maxForMetricAcrossYears,
  valueForPrefYear,
  yearsForMetric,
  inFiscalYear,
  filterPoints,
  monthlyBuckets,
  pointStyle,
  prefShare,
  yearIndexForProgress,
  monthIndexForProgress,
  TOHOKU,
  SAMPLE_PREFS,
} from "../map-story.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const totals = JSON.parse(fs.readFileSync(path.join(dataDir, "prefecture-totals.json"), "utf8"));

// --- migrated choropleth helpers --------------------------------------------

const fakeTotals = {
  metrics: {
    sightings: {
      "2024": { akita: 1000, iwate: 500 },
      "2025": { akita: 13000, iwate: 9000 },
    },
  },
};

test("maxForMetricAcrossYears finds the highest value across all years", () => {
  assert.equal(maxForMetricAcrossYears(fakeTotals, "sightings"), 13000);
});

test("valueForPrefYear returns 0 for missing data", () => {
  assert.equal(valueForPrefYear(fakeTotals, "sightings", 2025, "akita"), 13000);
  assert.equal(valueForPrefYear(fakeTotals, "sightings", 2025, "tokyo"), 0);
  assert.equal(valueForPrefYear(fakeTotals, "sightings", 2020, "akita"), 0);
});

const timelineWithPartial = {
  years_sightings: [2022, 2023, 2024, 2025, 2026],
  years_injuries: [2024, 2025, 2026],
  years_captures: [2024, 2025, 2026],
  partial_years: [2026],
};

test("yearsForMetric drops the in-progress year so playback ends on a full year", () => {
  assert.deepEqual(yearsForMetric(timelineWithPartial, "sightings"), [2022, 2023, 2024, 2025]);
  assert.deepEqual(yearsForMetric(timelineWithPartial, "injuries"), [2024, 2025]);
  assert.deepEqual(yearsForMetric(timelineWithPartial, "captures_total"), [2024, 2025]);
});

test("yearsForMetric keeps every year when none is partial", () => {
  const t = { years_sightings: [2023, 2024], partial_years: [] };
  assert.deepEqual(yearsForMetric(t, "sightings"), [2023, 2024]);
});

test("yearsForMetric falls back rather than returning nothing", () => {
  const t = { years_sightings: [2026], partial_years: [2026] };
  assert.deepEqual(yearsForMetric(t, "sightings"), [2026]);
});

// --- migrated point helpers --------------------------------------------------

const points = [
  { pref: "niigata", species: "black", type: "sighting", date: "2025-10-01" },
  { pref: "niigata", species: "black", type: "injury", date: "2025-10-05" },
  { pref: "gunma", species: "black", type: "sighting", date: "2024-09-20" },
  { pref: "toyama", species: "black", type: "sighting", date: "2025-04-02" },
  { pref: "hokkaido", species: "brown", type: "sighting", date: "2026-06-15" },
  { pref: "hokkaido", species: "brown", type: "sighting", date: null },
];

test("inFiscalYear boundaries", () => {
  assert.equal(inFiscalYear("2025-04-01", 2025), true);
  assert.equal(inFiscalYear("2025-03-31", 2025), false);
  assert.equal(inFiscalYear("2026-03-31", 2025), true);
  assert.equal(inFiscalYear("2026-04-01", 2025), false);
  assert.equal(inFiscalYear(null, 2025), false);
});

test("filterPoints still filters by species, prefecture and fiscal year", () => {
  assert.equal(filterPoints(points, {}).length, 6);
  assert.equal(filterPoints(points, { species: "brown" }).length, 2);
  assert.equal(filterPoints(points, { pref: "niigata" }).length, 2);
  assert.equal(filterPoints(points, { fiscalYear: 2025 }).length, 3);
});

test("monthlyBuckets returns twelve months in fiscal order", () => {
  const { buckets } = monthlyBuckets(points, 2025);
  assert.equal(buckets.length, 12);
  assert.deepEqual(buckets.map(b => b.month), [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]);
  assert.equal(buckets[0].label, "April 2025");
});

test("months after December belong to the next calendar year", () => {
  const { buckets } = monthlyBuckets(points, 2025);
  const jan = buckets.find(b => b.month === 1);
  assert.equal(jan.calYear, 2026);
  assert.equal(jan.label, "January 2026");
});

test("points land in the right month and only for the chosen year", () => {
  const { buckets } = monthlyBuckets(points, 2025);
  assert.equal(buckets.find(b => b.month === 4).points.length, 1);
  assert.equal(buckets.find(b => b.month === 10).points.length, 2);
  const total = buckets.reduce((n, b) => n + b.points.length, 0);
  assert.equal(total, 3, "FY2024 and FY2026 points excluded");
});

test("undated records are reported rather than silently dropped", () => {
  const { dropped } = monthlyBuckets(points, 2025);
  assert.equal(dropped, 1);
});

// --- new helpers --------------------------------------------------------------

test("prefShare: Akita+Iwate were 45.9% of FY2025 national sightings", () => {
  const share = prefShare(totals, 2025, ["akita", "iwate"]);
  assert.ok(Math.abs(share - 0.459) < 0.001, `expected ~0.459, got ${share}`);
});

test("prefShare: Tohoku was more than 60% of FY2025 sightings", () => {
  const share = prefShare(totals, 2025, TOHOKU);
  assert.ok(share > 0.6, `expected > 0.6, got ${share}`);
});

test("prefShare returns 0 when the year has no data", () => {
  assert.equal(prefShare(totals, 1999, ["akita"]), 0);
});

test("TOHOKU and SAMPLE_PREFS are the prefecture lists the spec names", () => {
  assert.deepEqual(TOHOKU, ["aomori", "iwate", "miyagi", "akita", "yamagata", "fukushima"]);
  assert.deepEqual(SAMPLE_PREFS, ["toyama", "niigata", "gunma", "saitama"]);
});

test("yearIndexForProgress maps t=0..1 onto 0..n-1 and is monotonic", () => {
  assert.equal(yearIndexForProgress(0, 4), 0);
  assert.equal(yearIndexForProgress(1, 4), 3);
  const idxs = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(t => yearIndexForProgress(t, 4));
  for (let i = 1; i < idxs.length; i++) assert.ok(idxs[i] >= idxs[i - 1], "must be monotonic");
});

test("yearIndexForProgress clamps out-of-range t", () => {
  assert.equal(yearIndexForProgress(-1, 4), 0);
  assert.equal(yearIndexForProgress(2, 4), 3);
});

test("monthIndexForProgress maps t=0..1 onto 0..11 and is monotonic", () => {
  assert.equal(monthIndexForProgress(0, 12), 0);
  assert.equal(monthIndexForProgress(1, 12), 11);
  const idxs = [];
  for (let t = 0; t <= 1.0001; t += 0.05) idxs.push(monthIndexForProgress(t, 12));
  for (let i = 1; i < idxs.length; i++) assert.ok(idxs[i] >= idxs[i - 1], "must be monotonic");
});

test("pointStyle: injury differs from sighting in fillColor, radius and pane", () => {
  const injury = pointStyle({ type: "injury" });
  const sighting = pointStyle({ type: "sighting" });
  assert.notEqual(injury.fillColor, sighting.fillColor);
  assert.ok(injury.radius > sighting.radius);
  assert.equal(injury.pane, "injuries");
  assert.notEqual(sighting.pane, "injuries");
});

test("pointStyle: trace is smaller and fainter than sighting", () => {
  const trace = pointStyle({ type: "trace" });
  const sighting = pointStyle({ type: "sighting" });
  assert.ok(trace.radius < sighting.radius);
  assert.ok(trace.fillOpacity < sighting.fillOpacity);
});

test("pointStyle: capture matches sighting's size and opacity", () => {
  const capture = pointStyle({ type: "capture" });
  const sighting = pointStyle({ type: "sighting" });
  assert.equal(capture.radius, sighting.radius);
  assert.equal(capture.fillOpacity, sighting.fillOpacity);
});

test("pointStyle: injury never fades (full opacity, distinct stroke)", () => {
  const injury = pointStyle({ type: "injury" });
  assert.equal(injury.fillOpacity, 1);
  assert.equal(injury.weight, 1.5);
});
