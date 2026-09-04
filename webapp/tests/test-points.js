import { test } from "node:test";
import assert from "node:assert/strict";
import { filterPoints, inFiscalYear, monthlyBuckets } from "../map-points.js";

const points = [
  { pref: "niigata", species: "black", type: "sighting",  date: "2025-10-01" },
  { pref: "niigata", species: "black", type: "injury",    date: "2025-10-05" },
  { pref: "gunma",   species: "black", type: "sighting",  date: "2024-09-20" },
  { pref: "toyama",  species: "black", type: "sighting",  date: "2025-04-02" },
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
