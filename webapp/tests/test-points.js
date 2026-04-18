import { test } from "node:test";
import assert from "node:assert/strict";
import { filterPoints, inFiscalYear } from "../map-points.js";

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

test("inFiscalYear boundaries", () => {
  assert.equal(inFiscalYear("2025-04-01", 2025), true);   // first day of FY2025
  assert.equal(inFiscalYear("2025-03-31", 2025), false);  // last day of FY2024
  assert.equal(inFiscalYear("2026-03-31", 2025), true);   // last day of FY2025
  assert.equal(inFiscalYear("2026-04-01", 2025), false);  // first day of FY2026
  assert.equal(inFiscalYear(null, 2025), false);
});

test("filterPoints by fiscalYear=2025 captures Apr 2025 - Mar 2026", () => {
  assert.equal(filterPoints(points, { fiscalYear: 2025 }).length, 3);  // Oct 2025 ×2 + Mar 2026
  assert.equal(filterPoints(points, { fiscalYear: 2024 }).length, 1);  // Sep 2024
});
