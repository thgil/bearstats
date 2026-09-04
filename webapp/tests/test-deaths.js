import { test } from "node:test";
import assert from "node:assert/strict";
import { deathsByYear, peak, peakCaption } from "../chart-deaths.js";

const timeline = {
  years_injuries: [2022, 2023, 2024, 2025, 2026],
  partial_years: [2026],
  metrics: { deaths: [2, 6, 3, 13, 6] },
};

test("deathsByYear drops the year still in progress", () => {
  const rows = deathsByYear(timeline);
  assert.deepEqual(rows.map(r => r.year), [2022, 2023, 2024, 2025]);
  assert.equal(rows.at(-1).value, 13);
});

test("peak finds the record year and its runner-up", () => {
  const { top, runnerUp } = peak(deathsByYear(timeline));
  assert.equal(top.year, 2025);
  assert.equal(top.value, 13);
  assert.equal(runnerUp.value, 6);
});

test("peakCaption only claims 'double' when it is actually double", () => {
  assert.equal(peakCaption({ year: 2025, value: 13 }, { year: 2023, value: 6 }),
    "more than double any year before");
  assert.equal(peakCaption({ year: 2025, value: 7 }, { year: 2023, value: 6 }),
    "above the previous worst (6, FY2023)");
  assert.equal(peakCaption({ year: 2025, value: 6 }, { year: 2023, value: 6 }),
    "level with FY2023");
});

test("deathsByYear copes with an empty timeline", () => {
  assert.deepEqual(deathsByYear({}), []);
  assert.equal(peak([]), null);
});
