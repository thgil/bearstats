import { test } from "node:test";
import assert from "node:assert/strict";
import { filterPoints } from "../map-points.js";

const points = [
  { pref: "niigata", species: "black", type: "sighting",  date: "2025-10-01" },
  { pref: "niigata", species: "black", type: "capture",   date: "2025-10-05" },
  { pref: "gunma",   species: "black", type: "sighting",  date: "2024-09-20" },
  { pref: "hokkaido", species: "brown", type: "sighting", date: "2026-03-15" },
];

test("filterPoints no filters returns all", () => {
  assert.equal(filterPoints(points, {}).length, 4);
});

test("filterPoints by species=black", () => {
  assert.equal(filterPoints(points, { species: "black" }).length, 3);
});

test("filterPoints by species=all returns all", () => {
  assert.equal(filterPoints(points, { species: "all" }).length, 4);
});

test("filterPoints by prefecture", () => {
  const r = filterPoints(points, { pref: "niigata" });
  assert.equal(r.length, 2);
});

test("filterPoints by year (calendar-year prefix)", () => {
  assert.equal(filterPoints(points, { year: 2025 }).length, 2);
  assert.equal(filterPoints(points, { year: 2024 }).length, 1);
  assert.equal(filterPoints(points, { year: 2026 }).length, 1);
});
