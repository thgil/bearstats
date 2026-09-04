import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cumulative,
  paceSeries,
  compareIndex,
  finishedLabel,
  dashOffsetForProgress,
  opacityForProgress,
} from "../chart-pace.js";
import { ytdRows } from "../chart-rows.js";

const real = JSON.parse(
  readFileSync(new URL("../data/national-timeline.json", import.meta.url))
);

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

// --- finishedLabel / caution view --------------------------------------

test("finishedLabel reads the year and its final total straight off the series", () => {
  assert.equal(
    finishedLabel({ year: 2024, values: [100, 20513] }),
    "FY2024 finished at 20,513"
  );
});

test("finishedLabel against the real timeline matches the spec's caution-view figures", () => {
  const s = paceSeries(real);
  const y24 = s.find(x => x.year === 2024);
  const y25 = s.find(x => x.year === 2025);
  assert.equal(finishedLabel(y24), "FY2024 finished at 20,513");
  assert.equal(finishedLabel(y25), "FY2025 finished at 50,801");
});

test("FY2024 led FY2025 at the June read-off, then finished far behind it", () => {
  // The point of the "caution" view: a spring lead promises nothing about
  // autumn. Both numbers come from the real data, matching the spec's facts.
  const s = paceSeries(real);
  const i = compareIndex(s); // June, driven by however far FY2026 has reported
  const y24 = s.find(x => x.year === 2024);
  const y25 = s.find(x => x.year === 2025);
  assert.equal(y24.values[i], 7601);
  assert.equal(y25.values[i], 7555);
  assert.ok(y24.values[i] > y25.values[i], "FY2024 was ahead in June");
  assert.ok(y24.values.at(-1) < y25.values.at(-1) * 0.5, "but finished well behind");
});

// --- progress helpers ----------------------------------------------------

test("dashOffsetForProgress: full length before start, zero at/after end", () => {
  assert.equal(dashOffsetForProgress(0, 100, 0, 0.8), 100);
  assert.equal(dashOffsetForProgress(0.8, 100, 0, 0.8), 0);
  assert.equal(dashOffsetForProgress(1, 100, 0, 0.8), 0);
});

test("dashOffsetForProgress is monotonically non-increasing across t", () => {
  const ts = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  let prev = Infinity;
  for (const t of ts) {
    const v = dashOffsetForProgress(t, 200, 0.1, 0.9);
    assert.ok(v <= prev, `offset should not increase at t=${t}`);
    prev = v;
  }
});

test("opacityForProgress: zero before start, one at/after end", () => {
  assert.equal(opacityForProgress(0.7, 0.8, 1), 0);
  assert.equal(opacityForProgress(0.9, 0.8, 1), 0.5);
  assert.equal(opacityForProgress(1, 0.8, 1), 1);
});

test("setProgress-style calls are idempotent at t=0 and t=1", () => {
  assert.equal(dashOffsetForProgress(0, 100, 0, 0.8), dashOffsetForProgress(0, 100, 0, 0.8));
  assert.equal(opacityForProgress(1, 0.8, 1), opacityForProgress(1, 0.8, 1));
});
