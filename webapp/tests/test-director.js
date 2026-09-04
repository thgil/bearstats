import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STEPS, createDirector, stepChapter } from "../director.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

function stepIdsInHtml() {
  const ids = new Set();
  for (const m of html.matchAll(/data-step="([^"]+)"/g)) ids.add(m[1]);
  return ids;
}

function graphicNamesInHtml() {
  const names = new Set();
  for (const m of html.matchAll(/data-g="([^"]+)"/g)) names.add(m[1]);
  return names;
}

test("every data-step in index.html has a STEPS entry, and vice versa", () => {
  const htmlSteps = stepIdsInHtml();
  const tableSteps = new Set(Object.keys(STEPS));
  assert.deepEqual([...htmlSteps].sort(), [...tableSteps].sort());
});

test("every STEPS[x].graphic names a .g[data-g] present in index.html", () => {
  const graphicNames = graphicNamesInHtml();
  for (const [stepId, step] of Object.entries(STEPS)) {
    assert.ok(
      graphicNames.has(step.graphic),
      `STEPS.${stepId}.graphic = "${step.graphic}" has no matching data-g in index.html`
    );
  }
});

test("every step has a chapter (1 or 2)", () => {
  for (const stepId of Object.keys(STEPS)) {
    const chapter = stepChapter(stepId);
    assert.ok(chapter === 1 || chapter === 2, `stepChapter(${stepId}) should be 1 or 2, got ${chapter}`);
  }
});

test("enter() with an empty graphics object does not throw, for every step", () => {
  const fakePanel = { querySelectorAll: () => [], querySelector: () => null };
  const panels = { 1: fakePanel, 2: fakePanel };
  const director = createDirector({}, panels);
  for (const stepId of Object.keys(STEPS)) {
    assert.doesNotThrow(() => director.enter(stepId), `enter("${stepId}") threw with empty graphics`);
  }
});

test("showGraphic toggles is-active on matching .g[data-g] layers only", () => {
  const layers = [
    { dataset: { g: "map" }, classList: { toggled: {}, toggle(cls, on) { this.toggled[cls] = on; } } },
    { dataset: { g: "monthly" }, classList: { toggled: {}, toggle(cls, on) { this.toggled[cls] = on; } } },
  ];
  const fakePanel = { querySelectorAll: () => layers, querySelector: () => null };
  const panels = { 1: fakePanel, 2: fakePanel };
  const director = createDirector({}, panels);
  director.showGraphic(1, "monthly");
  assert.equal(layers[0].classList.toggled["is-active"], false);
  assert.equal(layers[1].classList.toggled["is-active"], true);
});
