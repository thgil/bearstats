import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { forecastPanel } from "../chart-forecast.js";

const context = JSON.parse(
  readFileSync(new URL("../data/context.json", import.meta.url))
);
const ctx = { context };

test("forecastPanel: means match the research doc (Table 5)", () => {
  const { means } = forecastPanel(ctx);
  assert.equal(means[2023].toFixed(2), "0.54");
  assert.equal(means[2025].toFixed(2), "0.44");
  assert.equal(means[2026].toFixed(2), "3.90");
});

test("forecastPanel: five prefecture rows with 2026 forecast categories", () => {
  const { byPref } = forecastPanel(ctx);
  assert.equal(byPref.length, 5);
  byPref.forEach(p => {
    assert.ok(Number.isFinite(p.f2023));
    assert.ok(Number.isFinite(p.f2025));
    assert.ok(Number.isFinite(p.f2026));
    assert.ok(p.category2026);
  });
});

test("forecastPanel: track record matches the research doc (Table 3, 70 prefecture-years)", () => {
  const { record } = forecastPanel(ctx);
  assert.equal(record.total, 70);
  assert.equal(record.exact, 48);
  assert.equal(record.withinOne, 68);
  assert.equal(record.poorNeverGood, "0 of 39");
  assert.equal(record.goodNeverWorst, "0 of 31");
  assert.equal(record.goodToPoor, "8 of 31");
});

test("forecastPanel: surveys include Niigata, Toyama, Akita sites and Fukushima", () => {
  const { surveys } = forecastPanel(ctx);
  const names = surveys.map(s => s.name).join(" | ");
  assert.match(names, /Niigata/);
  assert.match(names, /Toyama/);
  assert.match(names, /Akita/);
  assert.match(names, /Fukushima/);
});
