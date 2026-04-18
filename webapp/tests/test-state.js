import { test } from "node:test";
import assert from "node:assert/strict";
import { createState } from "../state.js";

test("createState exposes get/set/subscribe", () => {
  const s = createState({ metric: "sightings", year: 2025 });
  assert.equal(s.get("metric"), "sightings");
  assert.equal(s.get("year"), 2025);
});

test("set triggers subscribers with new state and changed keys", () => {
  const s = createState({ metric: "sightings", year: 2025 });
  const calls = [];
  s.subscribe((state, changed) => calls.push({ state: { ...state }, changed: [...changed] }));

  s.set({ year: 2024 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].state.year, 2024);
  assert.equal(calls[0].state.metric, "sightings");
  assert.deepEqual(calls[0].changed, ["year"]);

  s.set({ metric: "deaths" });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].changed, ["metric"]);
});

test("set with unchanged values does not fire subscribers", () => {
  const s = createState({ metric: "sightings" });
  let count = 0;
  s.subscribe(() => count++);
  s.set({ metric: "sightings" });
  assert.equal(count, 0);
});

test("unsubscribe removes the listener", () => {
  const s = createState({ year: 2025 });
  let count = 0;
  const unsub = s.subscribe(() => count++);
  s.set({ year: 2024 });
  assert.equal(count, 1);
  unsub();
  s.set({ year: 2023 });
  assert.equal(count, 1);
});
