import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { alternatePairs, akitaSiteSeries, wrapToLines } from "../chart-alternate.js";

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

test("wrapToLines: fits on one line when there's room, never truncates", () => {
  const lines = wrapToLines("Good autumn, then poor: 22 of 23", 400, 11.5);
  assert.equal(lines.length, 1);
  assert.equal(lines[0], "Good autumn, then poor: 22 of 23");
});

test("wrapToLines: wraps onto a second line instead of adding an ellipsis", () => {
  const text = "Good autumn, then poor: 22 of 23";
  const lines = wrapToLines(text, 60, 11.5);
  assert.ok(lines.length <= 2);
  assert.ok(lines.every(l => !l.includes("…")));
  assert.equal(lines.join(" "), text);
});

test("wrapToLines: never drops words even when it can't fit two lines", () => {
  const text = "Good autumn, then poor: 22 of 23";
  const lines = wrapToLines(text, 1, 11.5);
  assert.equal(lines.join(" "), text);
});
