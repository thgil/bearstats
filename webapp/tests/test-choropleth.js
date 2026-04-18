import { test } from "node:test";
import assert from "node:assert/strict";
import { maxForMetricAcrossYears, valueForPrefYear } from "../map-choropleth.js";

const fakeTotals = {
  metrics: {
    sightings: {
      "2024": { akita: 1000, iwate: 500 },
      "2025": { akita: 13000, iwate: 9000 },
    },
  },
};

test("maxForMetricAcrossYears finds the highest value across all years", () => {
  assert.equal(maxForMetricAcrossYears(fakeTotals, "sightings"), 13000);
});

test("valueForPrefYear returns 0 for missing data", () => {
  assert.equal(valueForPrefYear(fakeTotals, "sightings", 2025, "akita"), 13000);
  assert.equal(valueForPrefYear(fakeTotals, "sightings", 2025, "tokyo"), 0);
  assert.equal(valueForPrefYear(fakeTotals, "sightings", 2020, "akita"), 0);
});
