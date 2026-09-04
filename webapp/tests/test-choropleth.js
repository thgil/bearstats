import { test } from "node:test";
import assert from "node:assert/strict";
import { maxForMetricAcrossYears, valueForPrefYear, yearsForMetric } from "../map-choropleth.js";

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

// --- partial (in-progress) fiscal years -----------------------------------

const timelineWithPartial = {
  years_sightings: [2022, 2023, 2024, 2025, 2026],
  years_injuries:  [2024, 2025, 2026],
  years_captures:  [2024, 2025, 2026],
  partial_years:   [2026],
};

test("yearsForMetric drops the in-progress year so playback ends on a full year", () => {
  assert.deepEqual(yearsForMetric(timelineWithPartial, "sightings"), [2022, 2023, 2024, 2025]);
  assert.deepEqual(yearsForMetric(timelineWithPartial, "injuries"), [2024, 2025]);
  assert.deepEqual(yearsForMetric(timelineWithPartial, "captures_total"), [2024, 2025]);
});

test("yearsForMetric keeps every year when none is partial", () => {
  const t = { years_sightings: [2023, 2024], partial_years: [] };
  assert.deepEqual(yearsForMetric(t, "sightings"), [2023, 2024]);
});

test("yearsForMetric falls back rather than returning nothing", () => {
  const t = { years_sightings: [2026], partial_years: [2026] };
  assert.deepEqual(yearsForMetric(t, "sightings"), [2026]);
});
