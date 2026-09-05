import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { harmRows, harmPeak, harmBarFraction, harmLabelOpacity } from "../chart-harm.js";

const real = JSON.parse(readFileSync(new URL("../data/national-timeline.json", import.meta.url)));

const timeline = {
  years_injuries: [2022, 2023, 2024, 2025, 2026],
  partial_years: [2026],
  metrics: {
    injuries: [75, 219, 85, 238, 53],
    deaths: [2, 6, 3, 13, 6],
  },
};

test("harmRows drops the running year and pairs injured with killed", () => {
  const rows = harmRows(timeline);
  assert.deepEqual(rows.map(r => r.year), [2022, 2023, 2024, 2025]);
  const y2025 = rows.find(r => r.year === 2025);
  assert.equal(y2025.injured, 238);
  assert.equal(y2025.killed, 13);
});

test("harmRows copes with an empty timeline", () => {
  assert.deepEqual(harmRows({}), []);
});

test("harmPeak finds FY2025 as the record for both series", () => {
  const rows = harmRows(timeline);
  const injuredPeak = harmPeak(rows, "injured");
  const killedPeak = harmPeak(rows, "killed");
  assert.equal(injuredPeak.top.year, 2025);
  assert.equal(injuredPeak.runnerUp.year, 2023);
  assert.equal(injuredPeak.runnerUp.injured, 219);
  assert.equal(killedPeak.top.year, 2025);
  assert.equal(killedPeak.runnerUp.year, 2023);
  assert.equal(killedPeak.runnerUp.killed, 6);
});

test("harmPeak returns null for no rows", () => {
  assert.equal(harmPeak([], "injured"), null);
});

test("harmBarFraction rises left to right and reaches 1 by t=1", () => {
  const n = 4;
  for (let i = 0; i < n; i++) assert.equal(harmBarFraction(1, i, n), 1);
  assert.ok(harmBarFraction(0.05, 0, n) > 0);
  assert.equal(harmBarFraction(0.05, 3, n), 0);
});

test("harmLabelOpacity: hidden until growEnd, visible by t=1", () => {
  assert.equal(harmLabelOpacity(0), 0);
  assert.equal(harmLabelOpacity(1), 1);
});

// --- against the real data file -------------------------------------------

test("harmRows against national-timeline.json: FY2025 is 238 injured, 13 killed", () => {
  const rows = harmRows(real);
  assert.ok(!rows.some(r => r.year === 2026), "FY2026 is still running and must not appear");
  const y2025 = rows.find(r => r.year === 2025);
  assert.equal(y2025.injured, 238);
  assert.equal(y2025.killed, 13);
});

test("harmPeak against the real data: FY2025 record, FY2023 runner-up (219 / 6)", () => {
  const rows = harmRows(real);
  const injuredPeak = harmPeak(rows, "injured");
  const killedPeak = harmPeak(rows, "killed");
  assert.equal(injuredPeak.top.year, 2025);
  assert.equal(injuredPeak.top.injured, 238);
  assert.equal(injuredPeak.runnerUp.year, 2023);
  assert.equal(injuredPeak.runnerUp.injured, 219);
  assert.equal(killedPeak.top.year, 2025);
  assert.equal(killedPeak.top.killed, 13);
  assert.equal(killedPeak.runnerUp.year, 2023);
  assert.equal(killedPeak.runnerUp.killed, 6);
});
