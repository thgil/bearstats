import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  monthlySeries,
  peakMonthIndex,
  calendarYearForFyMonth,
  peakCallout,
  dashOffsetForProgress,
  opacityForProgress,
  declutterY,
} from "../chart-monthly.js";

const timeline = {
  partial_years: [2026],
  monthly: {
    months: [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
    sightings: {
      "2022": [437, 1526, 2413, 1939, 1809, 1050, 1026, 562, 183, 42, 51, 98],
      "2023": [593, 1974, 3124, 2845, 2169, 2686, 5983, 3700, 805, 190, 127, 152],
      "2024": [689, 2453, 4459, 3260, 2917, 2054, 2235, 1283, 636, 264, 120, 143],
      "2025": [800, 2528, 4227, 5161, 4069, 4766, 15998, 10338, 1851, 484, 250, 329],
      "2026": [1787, 4581, 6260],
    },
  },
};

const real = JSON.parse(
  readFileSync(new URL("../data/national-timeline.json", import.meta.url))
);

// --- monthlySeries ---------------------------------------------------------

test("monthlySeries returns five years ascending", () => {
  const s = monthlySeries(timeline);
  assert.deepEqual(s.map(x => x.year), [2022, 2023, 2024, 2025, 2026]);
});

test("2026 is partial with three months reported", () => {
  const s = monthlySeries(timeline);
  const y2026 = s.find(x => x.year === 2026);
  assert.equal(y2026.partial, true);
  assert.equal(y2026.values.length, 3);
  assert.deepEqual(y2026.values, [1787, 4581, 6260]);
});

test("closed years are not flagged partial and keep all twelve months", () => {
  const s = monthlySeries(timeline);
  for (const year of [2022, 2023, 2024, 2025]) {
    const series = s.find(x => x.year === year);
    assert.equal(series.partial, false, `FY${year} should be closed`);
    assert.equal(series.values.length, 12, `FY${year} should have 12 months`);
  }
});

test("monthlySeries values are raw, not cumulative", () => {
  const s = monthlySeries(timeline);
  const y2025 = s.find(x => x.year === 2025);
  assert.equal(y2025.values[0], 800); // April, not a running total
  assert.equal(y2025.values[6], 15998); // October's own count
});

test("monthlySeries copes with no monthly block", () => {
  assert.deepEqual(monthlySeries({}), []);
});

test("monthlySeries against the real data file has five years, FY2026 partial with three months", () => {
  const s = monthlySeries(real);
  assert.deepEqual(s.map(x => x.year), [2022, 2023, 2024, 2025, 2026]);
  assert.equal(s.find(x => x.year === 2026).values.length, 3);
});

// --- peakMonthIndex / calendarYearForFyMonth / peakCallout -----------------

test("peakMonthIndex finds the highest month", () => {
  assert.equal(peakMonthIndex([1, 5, 3]), 1);
  assert.equal(peakMonthIndex([9, 1, 1]), 0);
});

test("FY2022 and FY2024 peak in June (index 2); FY2023 actually peaks in October", () => {
  // The design spec's data-facts table (§3) says "FY2022-24 monthly peak
  // month: June each year" — but FY2023's real series peaks in October
  // (5,983), not June. Derive from data rather than assume the spec's claim.
  const s = monthlySeries(timeline);
  assert.equal(peakMonthIndex(s.find(x => x.year === 2022).values), 2);
  assert.equal(peakMonthIndex(s.find(x => x.year === 2024).values), 2);
  assert.equal(peakMonthIndex(s.find(x => x.year === 2023).values), 6);
});

test("calendarYearForFyMonth: Apr-Dec stay in the FY's own year, Jan-Mar roll to the next", () => {
  assert.equal(calendarYearForFyMonth(2025, 0), 2025); // April
  assert.equal(calendarYearForFyMonth(2025, 8), 2025); // December
  assert.equal(calendarYearForFyMonth(2025, 9), 2026); // January
  assert.equal(calendarYearForFyMonth(2025, 11), 2026); // March
});

test("peakCallout reads '15,998 · Oct 2025' straight off FY2025's data", () => {
  const s = monthlySeries(timeline);
  const y2025 = s.find(x => x.year === 2025);
  assert.equal(peakCallout(y2025), "15,998 · Oct 2025");
});

test("peakCallout against the real data file matches the spec's headline figure", () => {
  const s = monthlySeries(real);
  const y2025 = s.find(x => x.year === 2025);
  assert.equal(peakCallout(y2025), "15,998 · Oct 2025");
});

// --- progress helpers --------------------------------------------------

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

test("dashOffsetForProgress handles a degenerate zero-width window", () => {
  assert.equal(dashOffsetForProgress(0.5, 50, 0.5, 0.5), 0);
  assert.equal(dashOffsetForProgress(0.4, 50, 0.5, 0.5), 50);
});

test("opacityForProgress: zero before start, one at/after end, linear between", () => {
  assert.equal(opacityForProgress(0.7, 0.8, 1), 0);
  assert.equal(opacityForProgress(0.9, 0.8, 1), 0.5);
  assert.equal(opacityForProgress(1, 0.8, 1), 1);
  assert.equal(opacityForProgress(1.5, 0.8, 1), 1);
});

test("setProgress-style calls are idempotent at t=0 and t=1", () => {
  assert.equal(dashOffsetForProgress(0, 100, 0, 0.8), dashOffsetForProgress(0, 100, 0, 0.8));
  assert.equal(opacityForProgress(1, 0.8, 1), opacityForProgress(1, 0.8, 1));
});

// --- declutterY --------------------------------------------------------

test("declutterY leaves well-spaced points alone", () => {
  const placed = declutterY([{ key: "a", y: 0 }, { key: "b", y: 100 }], 15);
  assert.deepEqual(placed.map(p => p.y), [0, 100]);
});

test("declutterY pushes overlapping points apart by at least minGap, preserving order", () => {
  const placed = declutterY(
    [{ key: "a", y: 10 }, { key: "b", y: 12 }, { key: "c", y: 14 }],
    15
  );
  assert.deepEqual(placed.map(p => p.key), ["a", "b", "c"]);
  assert.equal(placed[0].y, 10);
  assert.equal(placed[1].y, 25);
  assert.equal(placed[2].y, 40);
});

test("declutterY sorts by y before decluttering, independent of input order", () => {
  const placed = declutterY(
    [{ key: "low", y: 100 }, { key: "high", y: 0 }],
    15
  );
  assert.deepEqual(placed.map(p => p.key), ["high", "low"]);
});
