import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { populationPairs } from "../chart-population.js";

const context = JSON.parse(
  readFileSync(new URL("../data/context.json", import.meta.url))
);
const ctx = { context };

test("populationPairs: includes Iwate 1,100 (2006) to 3,700 (2020)", () => {
  const rows = populationPairs(ctx);
  const iwate = rows.find(r => r.pref === "iwate");
  assert.ok(iwate, "iwate row missing");
  assert.equal(iwate.from, 1100);
  assert.equal(iwate.fromYear, 2006);
  assert.equal(iwate.to, 3700);
  assert.equal(iwate.toYear, 2020);
});

test("populationPairs: skips regional/management-unit rows", () => {
  const rows = populationPairs(ctx);
  const labels = rows.map(r => r.label).join(" | ");
  assert.doesNotMatch(labels, /Kitakinki|Chugoku|Kii_Peninsula|Kii Peninsula|Shikoku/);
});

test("populationPairs: sorted by latest estimate, descending", () => {
  const rows = populationPairs(ctx);
  const values = rows.map(r => r.to);
  assert.deepEqual(values, [...values].sort((a, b) => b - a));
});

test("populationPairs: every row has both ends and their survey years", () => {
  const rows = populationPairs(ctx);
  rows.forEach(r => {
    assert.ok(Number.isFinite(r.from));
    assert.ok(Number.isFinite(r.to));
    assert.ok(Number.isFinite(r.fromYear));
    assert.ok(Number.isFinite(r.toYear));
  });
});
