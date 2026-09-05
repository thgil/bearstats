import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { casualtyRows, casualtyPeak, casualtyBarFraction, casualtyLabelOpacity } from "../chart-casualties.js";

const ctx = JSON.parse(readFileSync(new URL("../data/context.json", import.meta.url)));

test("casualtyRows covers FY2016 to FY2026, Apr-Jul sums", () => {
  const rows = casualtyRows(ctx);
  assert.deepEqual(rows.map(r => r.year), Array.from({ length: 11 }, (_, i) => 2016 + i));
});

test("casualtyRows: FY2026 is 53 injured and 6 killed, FY2025 is 55 and 4", () => {
  const rows = casualtyRows(ctx);
  const y2026 = rows.find(r => r.year === 2026);
  const y2025 = rows.find(r => r.year === 2025);
  assert.equal(y2026.injured, 53);
  assert.equal(y2026.killed, 6);
  assert.equal(y2025.injured, 55);
  assert.equal(y2025.killed, 4);
});

test("casualtyRows: FY2023 had 56 injured, the window's previous high", () => {
  const rows = casualtyRows(ctx);
  const y2023 = rows.find(r => r.year === 2023);
  assert.equal(y2023.injured, 56);
});

test("casualtyRows copes with no context", () => {
  assert.deepEqual(casualtyRows(null), []);
});

test("casualtyPeak: FY2026 (53 injured) sits below FY2023's prior high of 56", () => {
  const rows = casualtyRows(ctx);
  const peak = casualtyPeak(rows, "injured");
  assert.equal(peak.latest.year, 2026);
  assert.equal(peak.latest.injured, 53);
  assert.equal(peak.priorHigh.year, 2023);
  assert.equal(peak.priorHigh.injured, 56);
});

test("casualtyPeak: FY2026 (6 killed) is the window's high", () => {
  const rows = casualtyRows(ctx);
  const peak = casualtyPeak(rows, "killed");
  assert.equal(peak.latest.year, 2026);
  assert.equal(peak.latest.killed, 6);
  assert.ok(peak.priorHigh.killed < 6);
});

test("casualtyPeak returns null for no rows", () => {
  assert.equal(casualtyPeak([], "injured"), null);
});

test("casualtyBarFraction rises left to right and reaches 1 by t=1", () => {
  const n = 11;
  for (let i = 0; i < n; i++) assert.equal(casualtyBarFraction(1, i, n), 1);
  assert.ok(casualtyBarFraction(0.05, 0, n) > 0);
  assert.equal(casualtyBarFraction(0.05, n - 1, n), 0);
});

test("casualtyLabelOpacity: hidden until growEnd, visible by t=1", () => {
  assert.equal(casualtyLabelOpacity(0), 0);
  assert.equal(casualtyLabelOpacity(1), 1);
});
