import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { licenceSeries, formatK } from "../chart-licences.js";

const context = JSON.parse(
  readFileSync(new URL("../data/context.json", import.meta.url))
);
const ctx = { context };

test("licenceSeries: 1975 total is 517,800", () => {
  const rows = licenceSeries(ctx);
  const y1975 = rows.find(r => r.year === 1975);
  assert.ok(y1975);
  assert.equal(y1975.total, 517800);
});

test("licenceSeries: 2021 gun licences are first-class only = 84,400", () => {
  const rows = licenceSeries(ctx);
  const y2021 = rows.find(r => r.year === 2021);
  assert.ok(y2021);
  assert.equal(y2021.gun, 84400);
});

test("licenceSeries: sorted ascending by year", () => {
  const rows = licenceSeries(ctx);
  const years = rows.map(r => r.year);
  assert.deepEqual(years, [...years].sort((a, b) => a - b));
});

test("formatK: thousands-shorthand, so the y-axis margin can be sized to it", () => {
  assert.equal(formatK(0), "0");
  assert.equal(formatK(100000), "100k");
  assert.equal(formatK(500000), "500k");
});
