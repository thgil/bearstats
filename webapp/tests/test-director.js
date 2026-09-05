import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STEPS, createDirector, stepChapter, REPLAY_GUARD_MS } from "../director.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

// Spec §4 step table, in page order.
const SPEC_STEPS = {
  annual: { chapter: 1, graphic: "annual" },
  harm: { chapter: 1, graphic: "harm" },
  where: { chapter: 1, graphic: "map" },
  heat: { chapter: 1, graphic: "heat" },
  replay: { chapter: 1, graphic: "map" },
  mast: { chapter: 2, graphic: "mast" },
  alternate: { chapter: 2, graphic: "alternate" },
  weather: { chapter: 2, graphic: "weather" },
  spring: { chapter: 3, graphic: "monthly" },
  scatter: { chapter: 3, graphic: "scatter" },
  forecast: { chapter: 3, graphic: "forecast" },
  casualties: { chapter: 3, graphic: "casualties" },
};

function stepIdsInHtml() {
  return [...html.matchAll(/data-step="([^"]+)"/g)].map(m => m[1]);
}

function graphicNamesInHtml() {
  const names = new Set();
  for (const m of html.matchAll(/data-g="([^"]+)"/g)) names.add(m[1]);
  return names;
}

test("STEPS is the spec §4 table, in order", () => {
  assert.deepEqual(Object.keys(STEPS), Object.keys(SPEC_STEPS));
  for (const [id, want] of Object.entries(SPEC_STEPS)) {
    assert.equal(STEPS[id].graphic, want.graphic, `STEPS.${id}.graphic`);
    assert.equal(stepChapter(id), want.chapter, `stepChapter(${id})`);
  }
});

test("every data-step in index.html has a STEPS entry, in the same order, and vice versa", () => {
  assert.deepEqual(stepIdsInHtml(), Object.keys(STEPS));
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

test("each chapter's panel holds exactly the layers its steps use", () => {
  for (const chapter of [1, 2, 3]) {
    const panelHtml = html.match(new RegExp(`<div class="graphic" id="graphic-${chapter}">([\\s\\S]*?)\\n\\s*</div>\\n\\s*</div>\\n\\s*</div>\\n\\s*</section>`));
    assert.ok(panelHtml, `#graphic-${chapter} found in index.html`);
    const layers = [...panelHtml[1].matchAll(/data-g="([^"]+)"/g)].map(m => m[1]);
    const used = [...new Set(Object.entries(STEPS).filter(([id]) => stepChapter(id) === chapter).map(([, s]) => s.graphic))];
    assert.deepEqual(layers.sort(), used.sort(), `#graphic-${chapter} layers`);
  }
});

test("every step has a chapter (1, 2 or 3)", () => {
  for (const stepId of Object.keys(STEPS)) {
    const chapter = stepChapter(stepId);
    assert.ok([1, 2, 3].includes(chapter), `stepChapter(${stepId}) should be 1, 2 or 3, got ${chapter}`);
  }
  assert.equal(stepChapter("nope"), undefined);
});

test("chapter 4 is inline: its chart containers exist and are not steps", () => {
  assert.ok(html.includes('id="licences"'), "#licences container");
  assert.ok(html.includes('id="population"'), "#population container");
  assert.ok(!("licences" in STEPS) && !("population" in STEPS));
  assert.ok(!/id="graphic-4"/.test(html), "chapter 4 has no pinned panel");
});

test("enter() with an empty graphics object does not throw, for every step", () => {
  const fakePanel = { querySelectorAll: () => [], querySelector: () => null };
  const panels = { 1: fakePanel, 2: fakePanel, 3: fakePanel };
  const director = createDirector({}, panels);
  for (const stepId of Object.keys(STEPS)) {
    assert.doesNotThrow(() => director.enter(stepId), `enter("${stepId}") threw with empty graphics`);
    assert.doesNotThrow(() => director.enter(stepId, "settle"), `settle("${stepId}") threw with empty graphics`);
  }
});

function fakeLayer(name) {
  return { dataset: { g: name }, classList: { toggled: {}, toggle(cls, on) { this.toggled[cls] = on; } } };
}

test("showGraphic toggles is-active on matching .g[data-g] layers only", () => {
  const layers = [fakeLayer("annual"), fakeLayer("map")];
  const fakePanel = { querySelectorAll: () => layers, querySelector: () => null };
  const director = createDirector({}, { 1: fakePanel, 2: fakePanel, 3: fakePanel });
  director.showGraphic(1, "map");
  assert.equal(layers[0].classList.toggled["is-active"], false);
  assert.equal(layers[1].classList.toggled["is-active"], true);
});

test("the map layer carries is-points on the replay step only", () => {
  const mapLayer = fakeLayer("map");
  const panel1 = { querySelectorAll: () => [mapLayer], querySelector: () => mapLayer };
  const empty = { querySelectorAll: () => [], querySelector: () => null };
  const director = createDirector({}, { 1: panel1, 2: empty, 3: empty });
  director.enter("where");
  assert.equal(mapLayer.classList.toggled["is-points"], false);
  director.enter("replay");
  assert.equal(mapLayer.classList.toggled["is-points"], true);
  director.enter("heat");
  assert.equal(mapLayer.classList.toggled["is-points"], false);
});

test("a step plays once per visit and settles on a quick re-entry", () => {
  const calls = [];
  const chart = { play: () => calls.push("play"), setProgress: t => calls.push(`settle${t}`), stop() {} };
  const empty = { querySelectorAll: () => [], querySelector: () => null };
  const director = createDirector({ annual: chart }, { 1: empty, 2: empty, 3: empty });
  director.enter("annual");
  director.enter("annual");
  director.enter("annual", "settle");
  assert.deepEqual(calls, ["play", "settle1", "settle1"]);
  assert.ok(REPLAY_GUARD_MS > 0);
});

test("spring sets the monthly chart's spring13 view before playing", () => {
  const calls = [];
  const chart = { setView: v => calls.push(`view:${v}`), play: () => calls.push("play"), setProgress: t => calls.push(`settle${t}`), stop() {} };
  const empty = { querySelectorAll: () => [], querySelector: () => null };
  const director = createDirector({ monthly: chart }, { 1: empty, 2: empty, 3: empty });
  director.enter("spring");
  director.enter("spring", "settle");
  assert.deepEqual(calls, ["view:spring13", "play", "view:spring13", "settle1"]);
});
