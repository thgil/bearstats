import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { alternatePairs, akitaSiteSeries } from "../chart-alternate.js";

const context = JSON.parse(
  readFileSync(new URL("../data/context.json", import.meta.url))
);
const ctx = { context };

test("alternatePairs: a good autumn was followed by a poor one in 22 of 23 prefecture-years", () => {
  const { goodToPoor, goodTotal } = alternatePairs(ctx);
  assert.equal(goodToPoor, 22);
  assert.equal(goodTotal, 23);
});

test("alternatePairs: a poor autumn was followed by another poor one in 21 of 42", () => {
  const { poorToPoor, poorTotal } = alternatePairs(ctx);
  assert.equal(poorToPoor, 21);
  assert.equal(poorTotal, 42);
});

test("alternatePairs: five rows, FY2012-2025 (14 years), FY2026 excluded (forecast only)", () => {
  const { rows, years } = alternatePairs(ctx);
  assert.equal(rows.length, 5);
  assert.equal(years.length, 14);
  assert.ok(!years.includes(2026));
  rows.forEach(r => assert.equal(r.years.length, 14));
});

test("akitaSiteSeries: excludes the forecast row and covers 2002-2025", () => {
  const rows = akitaSiteSeries(ctx);
  assert.ok(rows.every(r => r.year <= 2025));
  assert.equal(rows[0].year, 2002);
  assert.equal(rows.at(-1).year, 2025);
});
