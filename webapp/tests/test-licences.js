import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { licenceSeries } from "../chart-licences.js";

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

test("licenceSeries: 2021 gun licences are gun1 + gun2 = 86,300", () => {
  const rows = licenceSeries(ctx);
  const y2021 = rows.find(r => r.year === 2021);
  assert.ok(y2021);
  assert.equal(y2021.gun, 86300);
});

test("licenceSeries: sorted ascending by year", () => {
  const rows = licenceSeries(ctx);
  const years = rows.map(r => r.year);
  assert.deepEqual(years, [...years].sort((a, b) => a - b));
});
