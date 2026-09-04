import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  deathsByYear,
  peak,
  peakCaption,
  barHeightFraction,
  noteOpacityForProgress,
} from "../chart-deaths.js";

const real = JSON.parse(
  readFileSync(new URL("../data/national-timeline.json", import.meta.url))
);

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

test("deathsByYear against the real data file drops FY2026 and keeps FY2025 as the record", () => {
  const rows = deathsByYear(real);
  assert.ok(!rows.some(r => r.year === 2026), "the running year should not appear as a closed bar");
  const { top } = peak(rows);
  assert.equal(top.year, 2025);
  assert.equal(top.value, 13);
});

// --- progress helpers ------------------------------------------------------

test("barHeightFraction: every bar starts at 0 and reaches 1 by t=1", () => {
  const n = 4;
  for (let i = 0; i < n; i++) {
    assert.equal(barHeightFraction(0, i, n), 0);
    assert.equal(barHeightFraction(1, i, n), 1);
  }
});

test("barHeightFraction grows bars one at a time, in order", () => {
  const n = 4;
  // Halfway through bar 0's window, only bar 0 has started.
  assert.ok(barHeightFraction(0.05, 0, n) > 0);
  assert.equal(barHeightFraction(0.05, 1, n), 0);
  assert.equal(barHeightFraction(0.05, 2, n), 0);
  assert.equal(barHeightFraction(0.05, 3, n), 0);
  // Bar i is fully grown once t reaches (i+1)/n scaled into [0, 0.9].
  assert.equal(barHeightFraction((1 / n) * 0.9, 0, n), 1);
  assert.equal(barHeightFraction((2 / n) * 0.9, 1, n), 1);
  assert.equal(barHeightFraction(0.9, n - 1, n), 1);
});

test("barHeightFraction handles n=0 without dividing by zero", () => {
  assert.equal(barHeightFraction(0.5, 0, 0), 0);
});

test("noteOpacityForProgress: hidden until bars finish growing, fully visible by t=1", () => {
  assert.equal(noteOpacityForProgress(0), 0);
  assert.equal(noteOpacityForProgress(0.9), 0);
  assert.ok(Math.abs(noteOpacityForProgress(0.95) - 0.5) < 1e-9);
  assert.equal(noteOpacityForProgress(1), 1);
});

test("setProgress-style calls are idempotent at t=0 and t=1", () => {
  assert.equal(barHeightFraction(0, 0, 4), barHeightFraction(0, 0, 4));
  assert.equal(noteOpacityForProgress(1), noteOpacityForProgress(1));
});
