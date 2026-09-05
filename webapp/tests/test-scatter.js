import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scatterPoints, autumnSpringRatioRange, whatIfRange, pointRevealOpacity, declutterLabels } from "../chart-scatter.js";

const ctx = JSON.parse(readFileSync(new URL("../data/context.json", import.meta.url)));

test("scatterPoints returns 13 closed years, FY2013 to FY2025", () => {
  const points = scatterPoints(ctx);
  assert.equal(points.length, 13);
  assert.deepEqual(points.map(p => p.fy), Array.from({ length: 13 }, (_, i) => 2013 + i));
});

test("scatterPoints: FY2025 autumn (Oct+Nov) is 26,336, FY2024 spring (Apr-Jun) is 7,601", () => {
  const points = scatterPoints(ctx);
  const y2025 = points.find(p => p.fy === 2025);
  const y2024 = points.find(p => p.fy === 2024);
  assert.equal(y2025.autumn, 26336);
  assert.equal(y2024.spring, 7601);
});

test("scatterPoints excludes FY2026 (still running)", () => {
  const points = scatterPoints(ctx);
  assert.ok(!points.some(p => p.fy === 2026));
});

test("autumnSpringRatioRange spans 0.23x to 3.49x across the 13 years", () => {
  const points = scatterPoints(ctx);
  const range = autumnSpringRatioRange(points);
  assert.ok(Math.abs(range.min - 0.233) < 0.01);
  assert.ok(Math.abs(range.max - 3.486) < 0.01);
});

test("whatIfRange applying each year's shape to 12,628 gives roughly 28,293 to 84,913", () => {
  const range = whatIfRange(ctx, 12628);
  assert.ok(Math.abs(range.min - 28293) < 5, `min was ${range.min}`);
  assert.ok(Math.abs(range.max - 84913) < 5, `max was ${range.max}`);
});

test("whatIfRange copes with no context", () => {
  assert.equal(whatIfRange(null, 12628), null);
});

test("pointRevealOpacity: points appear in year order, all visible by t=1", () => {
  const n = 13;
  assert.equal(pointRevealOpacity(0, 0, n), 0);
  assert.ok(pointRevealOpacity(0.05, 0, n) > 0);
  assert.equal(pointRevealOpacity(0.05, 12, n), 0);
  assert.equal(pointRevealOpacity(1, 12, n), 1);
});

test("scatterPoints copes with no context", () => {
  assert.deepEqual(scatterPoints(null), []);
  assert.deepEqual(scatterPoints({}), []);
});

test("declutterLabels leaves well-spaced labels alone", () => {
  const placed = declutterLabels([{ fy: 2013, x: 0, y: 0 }, { fy: 2014, x: 200, y: 200 }]);
  assert.deepEqual(placed.map(p => p.y), [0, 200]);
});

test("declutterLabels pushes an overlapping label down by at least one box height", () => {
  const placed = declutterLabels([{ fy: 2015, x: 50, y: 100 }, { fy: 2022, x: 52, y: 101 }], 34, 12);
  assert.equal(placed[0].y, 100);
  assert.ok(placed[1].y >= 112, `expected the second label pushed down, got ${placed[1].y}`);
});

test("declutterLabels turns upward, and clears the collision, when maxY blocks the usual downward nudge", () => {
  // Same tight cluster as above, but bounded so the label can't be pushed
  // down at all — it must find clearance above instead.
  const placed = declutterLabels(
    [{ fy: 2015, x: 50, y: 100 }, { fy: 2022, x: 52, y: 101 }],
    34, 12,
    { minY: 0, maxY: 101 }
  );
  assert.equal(placed[0].y, 100);
  assert.ok(placed[1].y <= 101, "the second label must respect maxY");
  assert.ok(Math.abs(placed[0].y - placed[1].y) >= 12, "the two labels must no longer collide");
});

test("declutterLabels never places a label past minY or maxY, even if a collision can't fully clear", () => {
  const placed = declutterLabels(
    [{ fy: 2015, x: 50, y: 50 }, { fy: 2022, x: 52, y: 50 }, { fy: 2023, x: 54, y: 50 }],
    34, 12,
    { minY: 40, maxY: 60 }
  );
  for (const p of placed) {
    assert.ok(p.y >= 40 && p.y <= 60, `label for fy ${p.fy} left its bounds at y=${p.y}`);
  }
});

test("declutterLabels keeps a label off an unlabelled obstacle point, but not off its own", () => {
  // An obstacle sharing the label's own fy sits right where the label
  // starts (100) — if that one were not ignored, this would already
  // "collide" and needlessly nudge. A second, unrelated obstacle
  // (different fy) one box away is what should actually move it.
  const placed = declutterLabels(
    [{ fy: 2015, x: 50, y: 100 }],
    34, 12,
    { obstacles: [{ fy: 2015, x: 50, y: 100, w: 12, h: 12 }, { fy: 2099, x: 52, y: 101, w: 12, h: 12 }] }
  );
  assert.ok(Math.abs(placed[0].y - 101) >= 12, `expected clearance from the unrelated obstacle, got y=${placed[0].y}`);
});
