import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { annualSeries, recordCallout, barGrowFraction, calloutOpacityForProgress } from "../chart-annual.js";

const ctx = JSON.parse(readFileSync(new URL("../data/context.json", import.meta.url)));

const fakeCtx = {
  monthly_national: {
    years: [2013, 2023, 2025, 2026],
    sightings: {
      "2013": [314, 1063, 1837, 1798, 1799, 914, 615, 539, 177, 31, 13, 33],
      "2023": [593, 1974, 3124, 2845, 2169, 2686, 5983, 3700, 805, 190, 127, 152],
      "2025": [800, 2528, 4227, 5161, 4069, 4766, 15998, 10338, 1851, 484, 250, 329],
      "2026": [1787, 4581, 6260, null, null, null, null, null, null, null, null, null],
    },
  },
};

test("annualSeries sums each fiscal year and flags the partial one", () => {
  const rows = annualSeries(fakeCtx);
  assert.deepEqual(rows.map(r => r.fy), [2013, 2023, 2025, 2026]);
  assert.equal(rows.find(r => r.fy === 2013).total, 9133);
  assert.equal(rows.find(r => r.fy === 2023).total, 24348);
  assert.equal(rows.find(r => r.fy === 2025).total, 50801);
  const y2026 = rows.find(r => r.fy === 2026);
  assert.equal(y2026.total, 12628);
  assert.equal(y2026.partial, true);
  assert.equal(rows.find(r => r.fy === 2013).partial, false);
});

test("annualSeries copes with no monthly_national block", () => {
  assert.deepEqual(annualSeries({}), []);
  assert.deepEqual(annualSeries(null), []);
});

test("recordCallout finds FY2025 as the record and reports the ratio over FY2023", () => {
  const rows = annualSeries(fakeCtx);
  const callout = recordCallout(rows);
  assert.equal(callout.top.fy, 2025);
  assert.equal(callout.runnerUp.fy, 2023);
  assert.ok(Math.abs(callout.ratio - 50801 / 24348) < 1e-9);
  assert.equal(callout.text, "50,801, 2.1x the previous high");
});

test("recordCallout excludes the partial year from the record race", () => {
  const rows = annualSeries(fakeCtx);
  const callout = recordCallout(rows);
  assert.notEqual(callout.top.fy, 2026);
  assert.notEqual(callout.runnerUp.fy, 2026);
});

test("barGrowFraction: bars start at 0, reach 1 by growEnd, in left-to-right order", () => {
  const n = 4;
  for (let i = 0; i < n; i++) {
    assert.equal(barGrowFraction(0, i, n), 0);
    assert.equal(barGrowFraction(1, i, n), 1);
  }
  assert.ok(barGrowFraction(0.05, 0, n) > 0);
  assert.equal(barGrowFraction(0.05, 3, n), 0);
});

test("barGrowFraction handles n=0", () => {
  assert.equal(barGrowFraction(0.5, 0, 0), 0);
});

test("calloutOpacityForProgress: hidden until growEnd, visible by t=1", () => {
  assert.equal(calloutOpacityForProgress(0), 0);
  assert.equal(calloutOpacityForProgress(0.85), 0);
  assert.equal(calloutOpacityForProgress(1), 1);
});

// --- against the real data file -------------------------------------------

test("annualSeries against context.json: FY2025 50801, FY2013 9133, FY2026 partial 12628", () => {
  const rows = annualSeries(ctx);
  assert.equal(rows.find(r => r.fy === 2025).total, 50801);
  assert.equal(rows.find(r => r.fy === 2013).total, 9133);
  const y2026 = rows.find(r => r.fy === 2026);
  assert.equal(y2026.total, 12628);
  assert.equal(y2026.partial, true);
});

test("recordCallout against context.json matches claim 1's headline text", () => {
  const rows = annualSeries(ctx);
  const callout = recordCallout(rows);
  assert.equal(callout.top.fy, 2025);
  assert.equal(callout.runnerUp.fy, 2023);
  assert.equal(callout.runnerUp.total, 24348);
  assert.equal(callout.text, "50,801, 2.1x the previous high");
});
