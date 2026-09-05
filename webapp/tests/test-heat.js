import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { heatCells, nationalMonthTotal, columnOpacityForProgress, TOHOKU_PREFS } from "../chart-heat.js";

const ctx = JSON.parse(readFileSync(new URL("../data/context.json", import.meta.url)));

test("heatCells returns FY2025 rows sorted with Tohoku pulled to the top", () => {
  const heat = heatCells(ctx, 2025);
  assert.ok(heat.rows.length > 0);
  assert.ok(heat.rows.length <= 20);
  // Every Tohoku row present in the top 20 should sort before every non-Tohoku row.
  const tohokuIdx = heat.rows.map((r, i) => (r.tohoku ? i : -1)).filter(i => i >= 0);
  const nonTohokuIdx = heat.rows.map((r, i) => (!r.tohoku ? i : -1)).filter(i => i >= 0);
  if (tohokuIdx.length && nonTohokuIdx.length) {
    assert.ok(Math.max(...tohokuIdx) < Math.min(...nonTohokuIdx));
  }
  assert.ok(TOHOKU_PREFS.includes(heat.rows[0].pref));
});

test("heatCells: Akita's October 2025 cell is 5,810", () => {
  const heat = heatCells(ctx, 2025);
  const akita = heat.rows.find(r => r.pref === "akita");
  assert.ok(akita, "akita should be a shown row");
  const octIndex = heat.months.indexOf(10);
  assert.equal(akita.values[octIndex], 5810);
});

test("heatCells: a shared prefOrder pins FY2024's rows to FY2025's order", () => {
  const heatA = heatCells(ctx, 2025);
  const heatB = heatCells(ctx, 2024, heatA.order);
  assert.deepEqual(heatB.rows.map(r => r.pref), heatA.rows.map(r => r.pref));
});

test("heatCells copes with a missing context", () => {
  assert.deepEqual(heatCells(null, 2025), { fy: 2025, months: [], rows: [], more: 0, order: [] });
});

test("nationalMonthTotal: October 2025 national sightings are 15,998", () => {
  const months = ctx.monthly_national.months;
  const octIndex = months.indexOf(10);
  assert.equal(nationalMonthTotal(ctx, 2025, octIndex), 15998);
});

test("nationalMonthTotal returns null for a month not yet reported", () => {
  const months = ctx.monthly_national.months;
  const octIndex = months.indexOf(10);
  assert.equal(nationalMonthTotal(ctx, 2026, octIndex), null);
});

test("columnOpacityForProgress: column 0 is visible before the last column, all visible by t=1", () => {
  assert.equal(columnOpacityForProgress(0, 0, 12), 0);
  assert.ok(columnOpacityForProgress(0.1, 0, 12) > 0);
  assert.equal(columnOpacityForProgress(1, 11, 12), 1);
});

test("columnOpacityForProgress handles nCols=0", () => {
  assert.equal(columnOpacityForProgress(0.5, 0, 0), 1);
});
