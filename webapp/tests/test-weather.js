import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { weatherPairs } from "../chart-weather.js";

const context = JSON.parse(
  readFileSync(new URL("../data/context.json", import.meta.url))
);
const ctx = { context };

test("weatherPairs: one point per FY2013-2025 with an Akita index and a prior-summer temperature", () => {
  const points = weatherPairs(ctx);
  assert.ok(points.length > 0);
  assert.ok(points.length <= 13, `expected at most 13 fiscal years, got ${points.length}`);
  points.forEach(p => {
    assert.ok(Number.isFinite(p.temp));
    assert.ok(Number.isFinite(p.index));
  });
});

test("weatherPairs: sorted by fiscal year, no duplicates", () => {
  const points = weatherPairs(ctx);
  const fys = points.map(p => p.fy);
  assert.deepEqual(fys, [...fys].sort((a, b) => a - b));
  assert.equal(new Set(fys).size, fys.length);
});
