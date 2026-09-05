import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summerPanels, latestAsOf, summerBarFraction, summerCalloutOpacity } from "../chart-summer.js";

// context.recent is built by a separate pipeline agent and may not have
// landed in webapp/data/context.json yet. Fall back to a fixture shaped the
// same way (see docs/superpowers/specs/2026-09-05-rebuild-design.md's
// context.recent contract) so this module and its tests can be developed
// ahead of that data landing.
const FIXTURE = {
  recent: {
    built_at: "2026-09-04T00:00:00Z",
    series: [
      {
        key: "akita",
        label: "Akita",
        source: "Akita Prefecture",
        url: null,
        as_of: "2026-08-31",
        comparable: true,
        note: null,
        fy2025: [85, 397, 825, 1055, 766, 926, 5810, 3333, 312, 30, 24, 29],
        fy2026: [395, 844, 874, 904, 251, null, null, null, null, null, null, null],
        partial_month: false,
      },
      {
        key: "miyagi",
        label: "Miyagi",
        source: "Miyagi Prefecture",
        url: null,
        as_of: "2026-09-02",
        comparable: true,
        note: null,
        fy2025: [26, 111, 151, 250, 225, 241, 1239, 969, 214, 71, 33, 29],
        fy2026: [141, 318, 347, 222, 132, null, null, null, null, null, null, null],
        partial_month: false,
      },
      {
        key: "iwate",
        label: "Iwate",
        source: "Iwate Prefecture",
        url: null,
        as_of: "2026-08-21",
        comparable: false,
        note: "Iwate changed to counting through the Bears app in April 2026.",
        fy2025: [224, 534, 825, 1056, 871, 1052, 3088, 1620, 272, 75, 53, 69],
        fy2026: [376, 934, 1666, 1326, null, null, null, null, null, null, null, null],
        partial_month: false,
      },
      {
        key: "sample4",
        label: "Toyama, Niigata, Gunma and Saitama",
        source: "Prefecture point-data feeds",
        url: null,
        as_of: "2026-09-04",
        comparable: true,
        note: null,
        fy2025: [64, 236, 367, 420, 320, 603, 1795, 1382, 271, 48, 20, 15],
        fy2026: [112, 316, 509, 363, 134, null, null, null, null, null, null, null],
        partial_month: false,
      },
    ],
  },
};

function loadContext() {
  const real = JSON.parse(
    readFileSync(new URL("../data/context.json", import.meta.url))
  );
  return real && real.recent ? real : FIXTURE;
}

const ctx = loadContext();

test("summerPanels: five months (Apr-Aug) per panel", () => {
  const panels = summerPanels(ctx);
  assert.ok(panels.length > 0);
  panels.forEach(p => {
    assert.equal(p.pairs.length, 5);
    assert.deepEqual(p.pairs.map(d => d.month), ["Apr", "May", "Jun", "Jul", "Aug"]);
  });
});

test("summerPanels: akita August pair is 251 (2026) vs 766 (2025)", () => {
  const panels = summerPanels(ctx);
  const akita = panels.find(p => p.key === "akita");
  const aug = akita.pairs.find(d => d.month === "Aug");
  assert.equal(aug.y2026, 251);
  assert.equal(aug.y2025, 766);
});

test("summerPanels: akita's latest reported 2026 month is August", () => {
  const panels = summerPanels(ctx);
  const akita = panels.find(p => p.key === "akita");
  assert.equal(akita.latestMonthIndex, 4);
  assert.equal(akita.pairs[akita.latestMonthIndex].month, "Aug");
});

test("summerPanels: sample4 July pair is 363 (2026) vs 420 (2025)", () => {
  const panels = summerPanels(ctx);
  const sample4 = panels.find(p => p.key === "sample4");
  const jul = sample4.pairs.find(d => d.month === "Jul");
  assert.equal(jul.y2026, 363);
  assert.equal(jul.y2025, 420);
});

test("summerPanels: iwate is flagged not comparable, with a note", () => {
  const panels = summerPanels(ctx);
  const iwate = panels.find(p => p.key === "iwate");
  assert.equal(iwate.comparable, false);
  assert.ok(iwate.note && iwate.note.length > 0);
});

test("summerPanels: the other series are comparable", () => {
  const panels = summerPanels(ctx);
  panels.filter(p => p.key !== "iwate").forEach(p => {
    assert.equal(p.comparable, true);
  });
});

test("summerPanels copes with no context", () => {
  assert.deepEqual(summerPanels(null), []);
  assert.deepEqual(summerPanels({}), []);
});

test("latestAsOf: the latest as_of date across every series", () => {
  const panels = summerPanels(ctx);
  const latest = latestAsOf(panels);
  // Every fixture/real as_of date is within FY2026, so the lexicographic
  // max of ISO dates is also the chronological max.
  const maxDate = panels.map(p => p.asOf).filter(Boolean).sort().at(-1);
  assert.equal(latest, maxDate);
});

test("summerBarFraction rises left to right and reaches 1 by t=1", () => {
  const n = 5;
  for (let i = 0; i < n; i++) assert.equal(summerBarFraction(1, i, n), 1);
  assert.ok(summerBarFraction(0.05, 0, n) > 0);
  assert.equal(summerBarFraction(0.05, n - 1, n), 0);
});

test("summerCalloutOpacity: hidden until growEnd, visible by t=1", () => {
  assert.equal(summerCalloutOpacity(0), 0);
  assert.equal(summerCalloutOpacity(1), 1);
});
