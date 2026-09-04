import { test } from "node:test";
import assert from "node:assert/strict";
import { cumulative, paceSeries, compareIndex } from "../chart-pace.js";
import { ytdRows } from "../chart-rows.js";

const timeline = {
  partial_years: [2026],
  monthly: {
    months: [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
    sightings: {
      "2025": [800, 2528, 4227, 5161, 4069, 4766, 15998, 10338, 1851, 484, 250, 329],
      "2026": [1787, 4581, 6260],
    },
  },
  ytd: {
    deaths: {
      label: "April–July", months: [4, 5, 6, 7],
      years: [2023, 2024, 2025, 2026], values: [1, 2, 4, 6],
    },
  },
};

test("cumulative accumulates in order", () => {
  assert.deepEqual(cumulative([1, 2, 3]), [1, 3, 6]);
  assert.deepEqual(cumulative([]), []);
});

test("paceSeries returns years ascending with cumulative tracks", () => {
  const s = paceSeries(timeline);
  assert.deepEqual(s.map(x => x.year), [2025, 2026]);
  assert.equal(s[0].values.at(-1), 50801);
  assert.equal(s[1].values.at(-1), 12628);
});

test("paceSeries flags the running year", () => {
  const s = paceSeries(timeline);
  assert.equal(s[0].partial, false);
  assert.equal(s[1].partial, true);
});

test("the running year's line stops where its data stops", () => {
  const s = paceSeries(timeline);
  assert.equal(s[1].values.length, 3, "FY2026 has only three months");
});

test("compareIndex is the running year's last reported month", () => {
  assert.equal(compareIndex(paceSeries(timeline)), 2); // June
});

test("at that month the running year is above the record year", () => {
  const s = paceSeries(timeline);
  const i = compareIndex(s);
  assert.equal(s[0].values[i], 7555);
  assert.equal(s[1].values[i], 12628);
  assert.ok(s[1].values[i] > s[0].values[i]);
});

test("paceSeries copes with no monthly block", () => {
  assert.deepEqual(paceSeries({}), []);
});

test("ytdRows scales bars against the largest year", () => {
  const d = ytdRows(timeline, "deaths");
  assert.equal(d.label, "April–July");
  assert.equal(d.rows.length, 4);
  assert.equal(d.rows.at(-1).pct, 100);
  assert.equal(d.rows.at(-1).current, true);
  assert.equal(d.rows[0].current, false);
});

test("ytdRows returns null for a metric with no series", () => {
  assert.equal(ytdRows(timeline, "injuries"), null);
});

// --- honest readouts on small counts -------------------------------------

import { fullYearTotals, matchedFullYear } from "../chart-rows.js";

const fullTimeline = {
  years_injuries: [2022, 2023, 2024, 2025, 2026],
  partial_years: [2026],
  metrics: { deaths: [2, 6, 3, 13, 6] },
};

test("fullYearTotals excludes the year still running", () => {
  assert.deepEqual(fullYearTotals(fullTimeline, "deaths").map(d => d.year),
    [2022, 2023, 2024, 2025]);
});

test("matchedFullYear finds a whole closed year the running total has reached", () => {
  const closed = fullYearTotals(fullTimeline, "deaths");
  const m = matchedFullYear(6, closed);
  assert.equal(m.year, 2023);
  assert.equal(m.value, 6);
  assert.equal(m.exact, true);
});

test("matchedFullYear reports inexact matches as such", () => {
  // 7 clears the median (5), and the best year it has reached whole is 6 — not equal.
  const closed = [
    { year: 2020, value: 2 }, { year: 2021, value: 4 },
    { year: 2022, value: 6 }, { year: 2023, value: 8 },
  ];
  const m = matchedFullYear(7, closed);
  assert.equal(m.value, 6);
  assert.equal(m.exact, false);
});

test("matchedFullYear suppresses a match below the median", () => {
  // Matching the weakest years in a series is arithmetic, not news: saying
  // "already equals FY2018" when FY2018 was the quietest year on record reads
  // as cherry-picking, so no claim is offered at all.
  const closed = fullYearTotals(fullTimeline, "deaths"); // 2, 6, 3, 13 -> median 4.5
  assert.equal(matchedFullYear(5, closed), null, "best reached is 3, below the median");
  assert.equal(matchedFullYear(6, closed).value, 6, "6 clears the median and is claimed");
});

test("matchedFullYear returns null when no closed year has been reached", () => {
  assert.equal(matchedFullYear(1, fullYearTotals(fullTimeline, "deaths")), null);
  assert.equal(matchedFullYear(6, []), null);
});

test("matchedFullYear names the most recent year when several tie", () => {
  const closed = [{ year: 2015, value: 4 }, { year: 2019, value: 4 }];
  assert.equal(matchedFullYear(4, closed).year, 2019);
});
