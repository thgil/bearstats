import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mastStrip, categoryForIndex, spearman } from "../chart-mast.js";

const context = JSON.parse(
  readFileSync(new URL("../data/context.json", import.meta.url))
);
const ctx = { context };

test("mastStrip: five-prefecture mean index, 2 dp, matches the research doc", () => {
  const { years } = mastStrip(ctx);
  const byFy = new Map(years.map(r => [r.fy, r]));
  assert.equal(byFy.get(2023).meanIndex.toFixed(2), "0.06");
  assert.equal(byFy.get(2024).meanIndex.toFixed(2), "3.24");
  assert.equal(byFy.get(2025).meanIndex.toFixed(2), "0.10");
});

test("mastStrip: FY2012 has an index but no sightings (predates the MoE monthly table)", () => {
  const { years } = mastStrip(ctx);
  const fy2012 = years.find(r => r.fy === 2012);
  assert.ok(fy2012);
  assert.equal(fy2012.octSightings, null);
});

test("mastStrip: national October sightings, FY2025 record", () => {
  const { years } = mastStrip(ctx);
  const fy2025 = years.find(r => r.fy === 2025);
  assert.equal(fy2025.octSightings, 15998);
});

test("mastStrip: rho close to -0.74 over 13 years (research doc, Table 2)", () => {
  const { rho, n } = mastStrip(ctx);
  assert.equal(n, 13);
  assert.ok(Math.abs(rho - -0.74) < 0.01, `rho was ${rho}`);
});

test("categoryForIndex follows the office's own thresholds", () => {
  assert.equal(categoryForIndex(0.1), "大凶作");
  assert.equal(categoryForIndex(1.5), "凶作");
  assert.equal(categoryForIndex(2.5), "並作");
  assert.equal(categoryForIndex(4.0), "豊作");
});

test("spearman: perfect negative rank correlation", () => {
  assert.equal(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
});

test("spearman: needs matching, sufficient length", () => {
  assert.equal(spearman([1], [1]), null);
  assert.equal(spearman([1, 2], [1]), null);
});
