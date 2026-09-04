# Bearstats Webapp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the static interactive webapp that visualizes the bear-sighting data produced by the pipeline — animated hero line chart, year-playback choropleth map, point overlay for current-year data, and scrollytelling narrative.

**Architecture:** Vanilla HTML + ES modules + CSS. No build step. D3 v7 / Leaflet v1.9 / Scrollama v3 vendored in `webapp/lib/`. One orchestrator (`main.js`) owns shared state and wires Scrollama triggers; three module files handle the hero chart, the choropleth map, and the point overlay. Data comes from four JSON files already produced by the pipeline.

**Tech Stack:** HTML5, CSS3 (custom properties + flex/grid), ES modules, D3 v7, Leaflet v1.9, Scrollama v3. No npm, no bundler, no framework.

**Spec:** `docs/superpowers/specs/2026-04-18-bearstats-design.md` — re-read Sections 8 (webapp architecture), 9 (scrollytelling), 10 (animation timing) before starting.

**Data available (produced by pipeline, already in `webapp/data/`):**

| File | Shape |
|---|---|
| `national-timeline.json` | `{years_injuries:[10], years_sightings:[5], years_captures:[18], metrics:{sightings[5], injuries[10], deaths[10], captures_total[18]}}` |
| `prefecture-totals.json` | `{metrics:{sightings:{year:{pref:value}}, injuries:{...}, deaths:{...}, captures_total:{...}}}` |
| `points-recent.json` | `[{pref, lat, lon, city, type, date, count, species, source}]` (9,563 records) |
| `japan-prefectures.geo.json` | 47 features with `properties.code`, `name_ja`, `name_en` |

**Testing philosophy:** Pure-function helpers (state pubsub, data transforms, color scales) get real unit tests via Node's built-in `node:test`. Visual components are verified manually in a browser; each task documents what "correct" looks like (screenshot checklist or observable behavior). No Jest, no Playwright — keep dependencies zero.

**Local dev:** `cd webapp && python3 -m http.server 8000` (or any static server), then open `http://localhost:8000/`.

---

## Task 1: Webapp scaffold — HTML, CSS, vendored libs

**Files:**
- Create: `~/Projects/bearstats/webapp/index.html`
- Create: `~/Projects/bearstats/webapp/styles.css`
- Create: `~/Projects/bearstats/webapp/lib/d3.v7.min.js` (vendored)
- Create: `~/Projects/bearstats/webapp/lib/leaflet.js` (vendored)
- Create: `~/Projects/bearstats/webapp/lib/leaflet.css` (vendored)
- Create: `~/Projects/bearstats/webapp/lib/scrollama.min.js` (vendored)

- [ ] **Step 1: Vendor the three libraries**

Download each from the pinned CDN:

```bash
mkdir -p ~/Projects/bearstats/webapp/lib
cd ~/Projects/bearstats/webapp/lib
curl -L -o d3.v7.min.js         https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js
curl -L -o leaflet.js           https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js
curl -L -o leaflet.css          https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css
curl -L -o scrollama.min.js     https://cdn.jsdelivr.net/npm/scrollama@3.2.0/build/scrollama.min.js
```

Verify sizes (rough sanity check):
```bash
ls -la ~/Projects/bearstats/webapp/lib/
# Expect: d3 ~270K, leaflet.js ~150K, leaflet.css ~15K, scrollama ~6K
```

- [ ] **Step 2: Create `index.html` with empty scroll sections**

Create `~/Projects/bearstats/webapp/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bearstats — Japan's 2025 Bear Crisis</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="lib/leaflet.css">
</head>
<body>
  <main>
    <section id="section-hero" class="scroll-section">
      <div class="section-content">
        <h1>2025 is unlike any year before</h1>
        <p class="subtitle">Bear sightings across Japan doubled the previous record. 23 people died — the highest toll since records began.</p>
        <div id="hero-chart" class="viz"></div>
      </div>
    </section>

    <section id="section-map" class="scroll-section">
      <div class="section-content">
        <h2>Where the bears are</h2>
        <p class="subtitle">Each prefecture reddens as sightings accumulate through the year. Watch 2008 to 2025.</p>
        <div id="choropleth" class="viz"></div>
        <div class="year-label" id="year-label">—</div>
      </div>
    </section>

    <section id="section-points" class="scroll-section">
      <div class="section-content">
        <h2>Tohoku, up close</h2>
        <p class="subtitle">Every red dot is a reported sighting, trace, or incident in FY2025.</p>
        <div id="points-map" class="viz"></div>
      </div>
    </section>

    <section id="section-cost" class="scroll-section">
      <div class="section-content">
        <h2>The human cost</h2>
        <div class="counters">
          <div class="counter"><span class="num" data-target="50359">0</span><span class="label">sightings</span></div>
          <div class="counter"><span class="num" data-target="1087">0</span><span class="label">injured</span></div>
          <div class="counter"><span class="num" data-target="23">0</span><span class="label">killed</span></div>
        </div>
      </div>
    </section>

    <section id="section-why" class="scroll-section">
      <div class="section-content">
        <h2>Why now?</h2>
        <p>Japan's bear population roughly tripled since 2012 (est. 15,000 → 54,000), the 2025 acorn crop failed across Tohoku, and the hunter base has aged out — fewer than 20,000 active bear hunters remain nationwide, down from over 70,000 in the 1970s.</p>
        <p>When the mountain food supply collapses in a population-boom year, bears come down looking for apples, persimmons, and garbage. They find towns.</p>
        <p class="sources">Sources: Japan Times, Britannica, Ministry of the Environment. Full data sources: <a href="https://github.com/_TBD_">repo</a>.</p>
      </div>
    </section>
  </main>

  <script type="module" src="main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `styles.css` with baseline layout**

Create `~/Projects/bearstats/webapp/styles.css`:

```css
:root {
  --bg: #0f1419;
  --bg-elev: #1a1f2e;
  --text: #e8e8ea;
  --text-dim: #9aa0b4;
  --accent: #ff3b30;
  --accent-hot: #ff5e3a;
  --pale: #fff4a3;
  --max-width: 960px;
  --easing-snap: cubic-bezier(0.95, 0.05, 0.8, 0.04);
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); }
body {
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  font-size: 16px;
}

h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 700; margin: 0 0 1rem; line-height: 1.1; }
h2 { font-size: clamp(1.5rem, 3.5vw, 2.25rem); font-weight: 600; margin: 0 0 0.75rem; }
.subtitle { color: var(--text-dim); margin: 0 0 2rem; max-width: 50ch; }

.scroll-section {
  min-height: 100vh;
  padding: 4rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.section-content {
  max-width: var(--max-width);
  width: 100%;
}

.viz {
  width: 100%;
  height: min(60vh, 560px);
  background: var(--bg-elev);
  border-radius: 8px;
  overflow: hidden;
  margin-top: 1rem;
}

.year-label {
  font-size: 3rem;
  font-weight: 700;
  color: var(--accent);
  text-align: right;
  margin-top: 0.5rem;
  font-variant-numeric: tabular-nums;
}

.counters {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 2rem;
}
@media (max-width: 600px) {
  .counters { grid-template-columns: 1fr; }
}
.counter {
  text-align: center;
  padding: 1.5rem;
  background: var(--bg-elev);
  border-radius: 8px;
}
.counter .num {
  display: block;
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.counter .label {
  display: block;
  color: var(--text-dim);
  margin-top: 0.5rem;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
}

.sources {
  color: var(--text-dim);
  font-size: 0.85rem;
  margin-top: 3rem;
}
.sources a { color: var(--accent-hot); }

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 4: Create empty `main.js` placeholder**

Create `~/Projects/bearstats/webapp/main.js`:

```javascript
// Webapp entry point. Modules added in subsequent tasks.
console.log("Bearstats webapp booting…");
```

- [ ] **Step 5: Manual smoke test — page loads**

```bash
cd ~/Projects/bearstats/webapp
python3 -m http.server 8000 &
sleep 1
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8000/
# Expect: 200
# Open in a browser — should see five dark sections, headings visible, no JS errors in console.
kill %1
```

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/bearstats
git add webapp/index.html webapp/styles.css webapp/main.js webapp/lib/
git commit -m "feat(webapp): scaffold HTML structure + vendored D3/Leaflet/Scrollama"
```

---

## Task 2: Data loading + shared state + pub/sub

**Files:**
- Create: `~/Projects/bearstats/webapp/state.js`
- Create: `~/Projects/bearstats/webapp/data-loader.js`
- Create: `~/Projects/bearstats/webapp/tests/test-state.js`
- Create: `~/Projects/bearstats/webapp/tests/run-tests.sh`
- Modify: `~/Projects/bearstats/webapp/main.js`

The state module is a tiny pubsub (~30 lines). The data-loader fetches the four JSON files in parallel and resolves when all are loaded. These get real unit tests since they're pure logic.

- [ ] **Step 1: Write failing tests for state module**

Create `~/Projects/bearstats/webapp/tests/test-state.js`:

```javascript
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
```

- [ ] **Step 2: Create test runner script**

Create `~/Projects/bearstats/webapp/tests/run-tests.sh`:

```bash
#!/usr/bin/env bash
# Run webapp unit tests via Node's built-in test runner.
set -eu
cd "$(dirname "$0")/.."
node --test tests/
```

Make it executable: `chmod +x ~/Projects/bearstats/webapp/tests/run-tests.sh`

- [ ] **Step 3: Run tests, confirm they fail**

```bash
~/Projects/bearstats/webapp/tests/run-tests.sh
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../state.js`.

- [ ] **Step 4: Implement `state.js`**

Create `~/Projects/bearstats/webapp/state.js`:

```javascript
// Minimal reactive state. Subscribers receive the full state + a list of keys that changed.
export function createState(initial = {}) {
  const state = { ...initial };
  const subs = new Set();

  function get(key) {
    return state[key];
  }

  function set(patch) {
    const changed = [];
    for (const [k, v] of Object.entries(patch)) {
      if (state[k] !== v) {
        state[k] = v;
        changed.push(k);
      }
    }
    if (changed.length === 0) return;
    for (const fn of subs) fn(state, changed);
  }

  function subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  }

  return { get, set, subscribe };
}
```

- [ ] **Step 5: Run tests, confirm they pass**

```bash
~/Projects/bearstats/webapp/tests/run-tests.sh
```

Expected: 4 pass, 0 fail.

- [ ] **Step 6: Implement `data-loader.js`**

Create `~/Projects/bearstats/webapp/data-loader.js`:

```javascript
// Loads the four JSON files the webapp needs. Returns a promise.
const FILES = {
  timeline: "data/national-timeline.json",
  prefectureTotals: "data/prefecture-totals.json",
  pointsRecent: "data/points-recent.json",
  prefectureGeo: "data/japan-prefectures.geo.json",
};

export async function loadAllData() {
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([key, url]) => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`${url}: HTTP ${resp.status}`);
      return [key, await resp.json()];
    })
  );
  return Object.fromEntries(entries);
}
```

- [ ] **Step 7: Wire data loader + state into `main.js`**

Overwrite `~/Projects/bearstats/webapp/main.js`:

```javascript
import { createState } from "./state.js";
import { loadAllData } from "./data-loader.js";

const state = createState({
  metric: "sightings",  // "sightings" | "injuries" | "deaths"
  year: 2025,
  species: "all",       // "all" | "black" | "brown"
});

export { state };

async function boot() {
  try {
    const data = await loadAllData();
    console.log("[bearstats] loaded data:", {
      timeline_years_sightings: data.timeline.years_sightings,
      prefecture_totals_metrics: Object.keys(data.prefectureTotals.metrics),
      points_count: data.pointsRecent.length,
      geo_features: data.prefectureGeo.features.length,
    });
    window.__bearstats__ = { state, data };  // expose for debugging + future modules
  } catch (err) {
    console.error("[bearstats] data load failed:", err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="background:#b00;color:#fff;padding:1rem;text-align:center">Failed to load data. Refresh to retry.</div>`
    );
  }
}

boot();
```

- [ ] **Step 8: Manual smoke test — data loads**

```bash
cd ~/Projects/bearstats/webapp
python3 -m http.server 8000
```

Open http://localhost:8000/ in a browser. Open DevTools → Console. Expect log lines:

```
[bearstats] loaded data: {timeline_years_sightings: Array(5), prefecture_totals_metrics: Array(4), points_count: 9563, geo_features: 47}
```

No red errors. `window.__bearstats__` should be inspectable in the console.

Stop the server.

- [ ] **Step 9: Commit**

```bash
cd ~/Projects/bearstats
git add webapp/state.js webapp/data-loader.js webapp/main.js webapp/tests/
git commit -m "feat(webapp): shared state pubsub + data loader + unit tests"
```

---

## Task 3: Hero line chart (Section 0)

**Files:**
- Create: `~/Projects/bearstats/webapp/chart-line.js`
- Create: `~/Projects/bearstats/webapp/tests/test-chart-line.js`
- Modify: `~/Projects/bearstats/webapp/main.js`

The hero chart draws the selected metric as an animated line: gentle climb through the early years, then snaps near-vertical at 2025.

- [ ] **Step 1: Write failing tests for the scale helper**

Create `~/Projects/bearstats/webapp/tests/test-chart-line.js`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { timelineFor } from "../chart-line.js";

const fakeTimeline = {
  years_sightings: [2021, 2022, 2023, 2024, 2025],
  years_injuries:  [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  years_captures:  [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017,
                    2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  metrics: {
    sightings: [12743, 11135, 24348, 20513, 50359],
    injuries:  [105, 108, 53, 157, 158, 88, 75, 219, 85, 1087],
    deaths:    [4, 2, 0, 1, 2, 5, 2, 6, 3, 23],
    captures_total: Array.from({ length: 18 }, () => 5000),
  },
};

test("timelineFor returns years + values for the selected metric", () => {
  const s = timelineFor(fakeTimeline, "sightings");
  assert.deepEqual(s.years, [2021, 2022, 2023, 2024, 2025]);
  assert.deepEqual(s.values, [12743, 11135, 24348, 20513, 50359]);
});

test("timelineFor works for deaths with the longer year axis", () => {
  const d = timelineFor(fakeTimeline, "deaths");
  assert.equal(d.years.length, 10);
  assert.equal(d.values[9], 23);
});

test("timelineFor throws on unknown metric", () => {
  assert.throws(() => timelineFor(fakeTimeline, "pumpkins"));
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
~/Projects/bearstats/webapp/tests/run-tests.sh
```

Expected: FAIL — `chart-line.js` doesn't exist yet.

- [ ] **Step 3: Implement `chart-line.js`**

Create `~/Projects/bearstats/webapp/chart-line.js`:

```javascript
// Animated line chart for the hero section.
// Assumes D3 v7 is loaded globally via <script src="lib/d3.v7.min.js">.

/**
 * Pick the right year axis and value array from the national-timeline shape.
 */
export function timelineFor(timeline, metric) {
  const mapYears = {
    sightings: timeline.years_sightings,
    injuries:  timeline.years_injuries,
    deaths:    timeline.years_injuries,         // deaths share the injury year axis
    captures_total: timeline.years_captures,
  };
  const years = mapYears[metric];
  if (!years) throw new Error(`unknown metric: ${metric}`);
  const values = timeline.metrics[metric];
  if (!values) throw new Error(`metric data missing: ${metric}`);
  return { years, values };
}

const MARGIN = { top: 24, right: 32, bottom: 40, left: 56 };

/**
 * Mount a line chart into `container` (a DOM element). Returns an object
 * with play() and setMetric(metric) methods.
 */
export function mountLineChart(container, timeline, initialMetric = "sightings") {
  const { width: W, height: H } = container.getBoundingClientRect();
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");

  const gAxes = svg.append("g").attr("class", "axes");
  const gLine = svg.append("g").attr("class", "line");
  const gDot  = svg.append("g").attr("class", "final-dot");
  const gLabel= svg.append("g").attr("class", "final-label");

  let currentMetric = initialMetric;

  function render(metric, animate = true) {
    currentMetric = metric;
    const { years, values } = timelineFor(timeline, metric);
    const plotW = W - MARGIN.left - MARGIN.right;
    const plotH = H - MARGIN.top - MARGIN.bottom;

    const x = d3.scaleLinear().domain(d3.extent(years)).range([MARGIN.left, MARGIN.left + plotW]);
    const y = d3.scaleLinear().domain([0, d3.max(values) * 1.05]).range([MARGIN.top + plotH, MARGIN.top]);

    // Axes
    gAxes.selectAll("*").remove();
    gAxes.append("g")
      .attr("transform", `translate(0,${MARGIN.top + plotH})`)
      .call(d3.axisBottom(x).ticks(Math.min(years.length, 10)).tickFormat(d => String(d)))
      .attr("color", "#9aa0b4");
    gAxes.append("g")
      .attr("transform", `translate(${MARGIN.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")))
      .attr("color", "#9aa0b4");

    // Line
    const line = d3.line()
      .x((_, i) => x(years[i]))
      .y(v => y(v))
      .curve(d3.curveCatmullRom);

    gLine.selectAll("*").remove();
    const path = gLine.append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", "#ff3b30")
      .attr("stroke-width", 3)
      .attr("d", line);

    if (animate) {
      // Draw the line, then pulse the final dot.
      const totalLen = path.node().getTotalLength();
      path
        .attr("stroke-dasharray", `${totalLen} ${totalLen}`)
        .attr("stroke-dashoffset", totalLen)
        .transition()
        .duration(2500)
        .ease(t => Math.pow(t, 3))  // slow start, sharp finish — "snap" feel
        .attr("stroke-dashoffset", 0);
    }

    // Final-year dot + label
    const lastX = x(years.at(-1));
    const lastY = y(values.at(-1));
    gDot.selectAll("circle").remove();
    const dot = gDot.append("circle")
      .attr("cx", lastX)
      .attr("cy", lastY)
      .attr("r", 0)
      .attr("fill", "#ff3b30");

    if (animate) {
      dot.transition().delay(2500).duration(400).attr("r", 8)
        .on("end", function pulse() {
          d3.select(this).transition().duration(900).attr("r", 12)
            .transition().duration(900).attr("r", 8).on("end", pulse);
        });
    } else {
      dot.attr("r", 8);
    }

    gLabel.selectAll("*").remove();
    gLabel.append("text")
      .attr("x", lastX - 8)
      .attr("y", lastY - 14)
      .attr("text-anchor", "end")
      .attr("fill", "#ff3b30")
      .attr("font-size", 14)
      .attr("font-weight", 700)
      .text(`${years.at(-1)} · ${values.at(-1).toLocaleString()}`);
  }

  // Initial render without animation so something is visible before play() is called.
  render(initialMetric, false);

  return {
    play: () => render(currentMetric, true),
    setMetric: (metric) => render(metric, true),
  };
}
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
~/Projects/bearstats/webapp/tests/run-tests.sh
```

Expected: all 7 tests pass (4 from state + 3 from chart-line).

- [ ] **Step 5: Add D3 script tag + wire into `main.js`**

Edit `~/Projects/bearstats/webapp/index.html` — add before the `<script type="module">` line:

```html
  <script src="lib/d3.v7.min.js"></script>
```

Edit `~/Projects/bearstats/webapp/main.js` — replace the body of `boot()`:

```javascript
import { createState } from "./state.js";
import { loadAllData } from "./data-loader.js";
import { mountLineChart } from "./chart-line.js";

const state = createState({
  metric: "sightings",
  year: 2025,
  species: "all",
});
export { state };

async function boot() {
  try {
    const data = await loadAllData();
    window.__bearstats__ = { state, data };

    const heroChart = mountLineChart(
      document.getElementById("hero-chart"),
      data.timeline,
      "sightings"
    );
    // Trigger animation on first paint for now; Scrollama wires it to scroll later.
    setTimeout(() => heroChart.play(), 400);
  } catch (err) {
    console.error("[bearstats] boot failed:", err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="background:#b00;color:#fff;padding:1rem;text-align:center">Failed to load data. Refresh.</div>`
    );
  }
}

boot();
```

- [ ] **Step 6: Manual visual test**

Start server, open page. Expect:
1. Hero section title and subtitle visible.
2. About 400ms after load, a red line animates from 2021 left to 2025 right, curving upward, with a sharp snap into the final year.
3. A pulsing red dot at the end, labeled "2025 · 50,359".

Try changing initialMetric to "deaths" and reloading — expect a 10-year line starting low and ending at 23.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/bearstats
git add webapp/chart-line.js webapp/tests/test-chart-line.js webapp/main.js webapp/index.html
git commit -m "feat(webapp): animated hero line chart with snap-at-end"
```

---

## Task 4: Choropleth map (Section 1)

**Files:**
- Create: `~/Projects/bearstats/webapp/map-choropleth.js`
- Create: `~/Projects/bearstats/webapp/tests/test-choropleth.js`
- Modify: `~/Projects/bearstats/webapp/index.html` (add Leaflet script tag)
- Modify: `~/Projects/bearstats/webapp/main.js`

- [ ] **Step 1: Write failing tests for the color scale helper**

Create `~/Projects/bearstats/webapp/tests/test-choropleth.js`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { maxForMetricAcrossYears, valueForPrefYear } from "../map-choropleth.js";

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
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
~/Projects/bearstats/webapp/tests/run-tests.sh
```

Expected: FAIL — `map-choropleth.js` doesn't exist.

- [ ] **Step 3: Implement `map-choropleth.js`**

Create `~/Projects/bearstats/webapp/map-choropleth.js`:

```javascript
// Leaflet choropleth with year-by-year playback.
// Assumes Leaflet and D3 are loaded globally via <script> tags.

export function maxForMetricAcrossYears(totals, metric) {
  const byYear = totals.metrics[metric] || {};
  let max = 0;
  for (const year of Object.keys(byYear)) {
    for (const v of Object.values(byYear[year])) {
      if (v > max) max = v;
    }
  }
  return max;
}

export function valueForPrefYear(totals, metric, year, prefKey) {
  const byYear = totals.metrics[metric];
  if (!byYear) return 0;
  const slot = byYear[String(year)];
  if (!slot) return 0;
  return slot[prefKey] || 0;
}

function years_for_metric(timeline, metric) {
  return metric === "sightings" ? timeline.years_sightings :
         metric === "captures_total" ? timeline.years_captures :
         timeline.years_injuries;
}

/**
 * Mount the choropleth. container: DOM element. timeline + totals + geo come from data-loader.
 * Returns { playAll, setYear, setMetric }.
 */
export function mountChoropleth(container, timeline, totals, geo, initialMetric = "sightings") {
  const map = L.map(container, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    touchZoom: false,
  }).setView([37.5, 138.0], 5);

  let currentMetric = initialMetric;
  let currentYear = years_for_metric(timeline, initialMetric).at(-1);
  let geoLayer = null;
  let yearLabelEl = document.getElementById("year-label");

  function colorForValue(value, maxV) {
    if (value <= 0) return "#2a2f40";
    const t = Math.min(1, value / maxV);
    // Yellow → red ramp via D3 interpolator.
    return d3.interpolateYlOrRd(0.2 + t * 0.75);
  }

  function redraw() {
    const maxV = maxForMetricAcrossYears(totals, currentMetric);
    if (geoLayer) geoLayer.remove();
    geoLayer = L.geoJSON(geo, {
      style: (feat) => {
        const v = valueForPrefYear(totals, currentMetric, currentYear, feat.properties.code);
        return {
          fillColor: colorForValue(v, maxV),
          fillOpacity: 0.85,
          color: "#0f1419",
          weight: 0.6,
        };
      },
    }).addTo(map);
    if (yearLabelEl) yearLabelEl.textContent = String(currentYear);
  }

  function setYear(y) {
    currentYear = y;
    redraw();
  }

  function setMetric(m) {
    currentMetric = m;
    const years = years_for_metric(timeline, m);
    currentYear = years.at(-1);
    redraw();
  }

  function playAll(durationMs = 8000) {
    const years = years_for_metric(timeline, currentMetric);
    const perYear = durationMs / years.length;
    let i = 0;
    const timer = setInterval(() => {
      if (i >= years.length) { clearInterval(timer); return; }
      setYear(years[i]);
      i++;
    }, perYear);
  }

  // Initial paint
  redraw();

  return { playAll, setYear, setMetric };
}
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
~/Projects/bearstats/webapp/tests/run-tests.sh
```

Expected: all 9 tests pass.

- [ ] **Step 5: Add Leaflet script tag and wire into `main.js`**

Edit `~/Projects/bearstats/webapp/index.html` — add after the D3 tag:

```html
  <script src="lib/leaflet.js"></script>
```

Edit `~/Projects/bearstats/webapp/main.js` — add import and mount after the hero chart:

```javascript
import { mountChoropleth } from "./map-choropleth.js";
```

Inside `boot()` after `heroChart` block:

```javascript
    const choropleth = mountChoropleth(
      document.getElementById("choropleth"),
      data.timeline,
      data.prefectureTotals,
      data.prefectureGeo,
      "sightings"
    );
    setTimeout(() => choropleth.playAll(), 2000);
```

- [ ] **Step 6: Manual visual test**

Start server, reload. Expect:
1. Second section shows a map of Japan with prefectures filled in yellow-to-red based on FY2025 sightings.
2. ~2 seconds after load, the map plays through 2021 → 2025 (or whichever years apply), prefectures changing color. Year label updates.
3. Tohoku prefectures (Akita, Iwate) are the darkest red by FY2025.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/bearstats
git add webapp/map-choropleth.js webapp/tests/test-choropleth.js webapp/main.js webapp/index.html
git commit -m "feat(webapp): choropleth map with year-playback animation"
```

---

## Task 5: Point overlay (Section 2)

**Files:**
- Create: `~/Projects/bearstats/webapp/map-points.js`
- Create: `~/Projects/bearstats/webapp/tests/test-points.js`
- Modify: `~/Projects/bearstats/webapp/main.js`

- [ ] **Step 1: Write failing tests for the filter helper**

Create `~/Projects/bearstats/webapp/tests/test-points.js`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterPoints } from "../map-points.js";

const points = [
  { pref: "niigata", species: "black", type: "sighting",  date: "2025-10-01" },
  { pref: "niigata", species: "black", type: "capture",   date: "2025-10-05" },
  { pref: "gunma",   species: "black", type: "sighting",  date: "2024-09-20" },
  { pref: "hokkaido", species: "brown", type: "sighting", date: "2026-03-15" },
];

test("filterPoints no filters returns all", () => {
  assert.equal(filterPoints(points, {}).length, 4);
});

test("filterPoints by species=black", () => {
  assert.equal(filterPoints(points, { species: "black" }).length, 3);
});

test("filterPoints by species=all returns all", () => {
  assert.equal(filterPoints(points, { species: "all" }).length, 4);
});

test("filterPoints by prefecture", () => {
  const r = filterPoints(points, { pref: "niigata" });
  assert.equal(r.length, 2);
});

test("filterPoints by year (calendar-year prefix)", () => {
  assert.equal(filterPoints(points, { year: 2025 }).length, 2);
  assert.equal(filterPoints(points, { year: 2024 }).length, 1);
  assert.equal(filterPoints(points, { year: 2026 }).length, 1);
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
~/Projects/bearstats/webapp/tests/run-tests.sh
```

Expected: FAIL — `map-points.js` missing.

- [ ] **Step 3: Implement `map-points.js`**

Create `~/Projects/bearstats/webapp/map-points.js`:

```javascript
// Leaflet point overlay for current-year sightings.
// Assumes Leaflet is loaded globally.

export function filterPoints(points, filters = {}) {
  return points.filter(p => {
    if (filters.species && filters.species !== "all" && p.species !== filters.species) return false;
    if (filters.pref && p.pref !== filters.pref) return false;
    if (filters.year && !(p.date || "").startsWith(String(filters.year))) return false;
    if (filters.type && p.type !== filters.type) return false;
    return true;
  });
}

const SPECIES_COLORS = {
  black: "#ff3b30",
  brown: "#ffa944",
};

const TYPE_RADIUS = {
  sighting: 3,
  trace:    2,
  injury:   5,
  capture:  3,
};

export function mountPointsMap(container, points, initialFilters = { year: 2025, species: "black" }) {
  const map = L.map(container, {
    zoomControl: true,
    attributionControl: false,
  }).setView([39.5, 140.5], 6);  // Tohoku-centered

  // Minimal dark tile base — OSM via a dark filter layer, or just transparent background.
  // Keep it simple: no tile layer, rely on the choropleth visual separately.

  let layer = null;

  function redraw(filters) {
    if (layer) layer.remove();
    const filtered = filterPoints(points, filters);
    layer = L.layerGroup(filtered.map(p =>
      L.circleMarker([p.lat, p.lon], {
        radius: TYPE_RADIUS[p.type] || 3,
        color: SPECIES_COLORS[p.species] || "#fff",
        weight: 0,
        fillOpacity: 0.7,
      }).bindPopup(
        `<strong>${p.city || p.pref}</strong><br>` +
        `${p.type}${p.count ? ` · ${p.count} bears` : ""}<br>` +
        `${p.date || "date unknown"}`
      )
    )).addTo(map);
  }

  redraw(initialFilters);

  return {
    setFilters: redraw,
  };
}
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
~/Projects/bearstats/webapp/tests/run-tests.sh
```

Expected: all 14 tests pass.

- [ ] **Step 5: Wire into `main.js`**

Edit `~/Projects/bearstats/webapp/main.js` — add import:

```javascript
import { mountPointsMap } from "./map-points.js";
```

Inside `boot()` after choropleth block:

```javascript
    const pointsMap = mountPointsMap(
      document.getElementById("points-map"),
      data.pointsRecent,
      { year: 2025, species: "black" }
    );
```

- [ ] **Step 6: Manual visual test**

Reload page. Scroll to Section 2. Expect:
1. A zoomable map centered on Tohoku.
2. ~9k red dots clustered across Akita, Iwate, Niigata, Toyama, Gunma, Saitama.
3. Click a dot — popup shows city, type, date, count (where available).
4. Hokkaido has ~80 orange dots (brown bear color).

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/bearstats
git add webapp/map-points.js webapp/tests/test-points.js webapp/main.js
git commit -m "feat(webapp): point overlay for current-year sightings"
```

---

## Task 6: Scrollama wiring + counter animation (Sections 3 + triggers for 0/1)

**Files:**
- Create: `~/Projects/bearstats/webapp/counters.js`
- Modify: `~/Projects/bearstats/webapp/index.html` (add Scrollama script tag)
- Modify: `~/Projects/bearstats/webapp/main.js`

- [ ] **Step 1: Implement counter animator**

Create `~/Projects/bearstats/webapp/counters.js`:

```javascript
// Tween counter numbers from 0 to data-target over a duration.

export function animateCounter(el, target, durationMs = 1600) {
  const start = performance.now();
  const initial = 0;
  function frame(now) {
    const t = Math.min(1, (now - start) / durationMs);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(initial + eased * target).toLocaleString();
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function animateAllCounters(rootEl) {
  rootEl.querySelectorAll("[data-target]").forEach(el => {
    const target = Number(el.dataset.target);
    if (Number.isFinite(target)) animateCounter(el, target);
  });
}
```

- [ ] **Step 2: Add Scrollama script to index.html**

Add before `<script type="module">`:

```html
  <script src="lib/scrollama.min.js"></script>
```

- [ ] **Step 3: Wire Scrollama + counter triggers into `main.js`**

Add to imports:

```javascript
import { animateAllCounters } from "./counters.js";
```

Inside `boot()`, after all visualizations are mounted, add:

```javascript
    const scroller = scrollama();
    scroller
      .setup({
        step: ".scroll-section",
        offset: 0.5,
        once: true,
      })
      .onStepEnter(({ element }) => {
        if (element.id === "section-hero")  heroChart.play();
        if (element.id === "section-map")   choropleth.playAll();
        if (element.id === "section-cost")  animateAllCounters(element);
      });

    // Refresh on resize for responsive recalc
    window.addEventListener("resize", () => scroller.resize());
```

Also remove the `setTimeout(...heroChart.play...)` and `setTimeout(...choropleth.playAll...)` calls — Scrollama handles them now.

- [ ] **Step 4: Manual visual test — full scrollytelling flow**

Reload page. Scroll slowly from top to bottom:
1. Hero: line chart animates into view on first scroll into Section 0.
2. Map: choropleth year-playback fires when Section 1 comes into view.
3. Points: static map of Tohoku.
4. Cost: three counters tween from 0 when Section 3 enters.
5. Why: static copy.

Scroll back up — animations should NOT re-fire (`once: true`).

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/bearstats
git add webapp/counters.js webapp/index.html webapp/main.js
git commit -m "feat(webapp): scrollama triggers + counter animation on scroll"
```

---

## Task 7: Metric toggle + species toggle UI

**Files:**
- Modify: `~/Projects/bearstats/webapp/index.html`
- Modify: `~/Projects/bearstats/webapp/styles.css`
- Modify: `~/Projects/bearstats/webapp/main.js`

- [ ] **Step 1: Add toggle UI to hero + map sections**

Edit `index.html`:

Inside Section 0 (`#section-hero`), after the `<p class="subtitle">` line, add:

```html
        <div class="toggle-bar" role="group" aria-label="Metric">
          <button class="toggle active" data-metric="sightings">Sightings</button>
          <button class="toggle"        data-metric="injuries">Injured</button>
          <button class="toggle"        data-metric="deaths">Killed</button>
        </div>
```

Inside Section 1 (`#section-map`), after the subtitle, add:

```html
        <div class="toggle-bar" role="group" aria-label="Species">
          <button class="toggle active" data-species="all">All bears</button>
          <button class="toggle"        data-species="black">Asian black</button>
          <button class="toggle"        data-species="brown">Brown (Hokkaido)</button>
        </div>
```

(Note: species toggle is reserved for future expansion; for now it just affects the points map.)

- [ ] **Step 2: Add toggle styles**

Append to `styles.css`:

```css
.toggle-bar {
  display: inline-flex;
  gap: 0.25rem;
  background: var(--bg-elev);
  padding: 0.25rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}
.toggle {
  background: transparent;
  border: 0;
  color: var(--text-dim);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-family: inherit;
}
.toggle:hover { color: var(--text); }
.toggle.active {
  background: var(--accent);
  color: #fff;
}
```

- [ ] **Step 3: Wire toggles into `main.js`**

Inside `boot()`, after the scroller.setup() block, add:

```javascript
    // Metric toggle on hero
    document.querySelectorAll('#section-hero .toggle[data-metric]').forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll('#section-hero .toggle').forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        heroChart.setMetric(btn.dataset.metric);
      });
    });

    // Species toggle on points map
    document.querySelectorAll('#section-points .toggle[data-species], #section-map .toggle[data-species]').forEach(btn => {
      btn.addEventListener("click", () => {
        const container = btn.closest(".scroll-section");
        container.querySelectorAll('.toggle[data-species]').forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        pointsMap.setFilters({ year: 2025, species: btn.dataset.species });
      });
    });
```

- [ ] **Step 4: Manual visual test**

Reload. Click hero toggles: chart should re-animate showing injuries / deaths with the right year axis. Click species toggles on the points section: Hokkaido orange dots should appear/disappear.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/bearstats
git add webapp/index.html webapp/styles.css webapp/main.js
git commit -m "feat(webapp): metric + species toggles"
```

---

## Task 8: Polish — keyboard controls, a11y, reduced motion verification

**Files:**
- Modify: `~/Projects/bearstats/webapp/main.js`
- Modify: `~/Projects/bearstats/webapp/styles.css`

- [ ] **Step 1: Add keyboard shortcuts**

Append to `boot()`:

```javascript
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;  // don't interfere with inputs
      // Space: replay hero
      if (e.code === "Space") {
        e.preventDefault();
        heroChart.play();
      }
      // 1/2/3: switch metric
      if (e.key === "1") heroChart.setMetric("sightings");
      if (e.key === "2") heroChart.setMetric("injuries");
      if (e.key === "3") heroChart.setMetric("deaths");
    });
```

- [ ] **Step 2: Add focus styles to CSS**

Append to `styles.css`:

```css
.toggle:focus-visible {
  outline: 2px solid var(--accent-hot);
  outline-offset: 2px;
}
a:focus-visible {
  outline: 2px solid var(--accent-hot);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Manual a11y checklist**

- Tab through page: toggles should be reachable and show focus ring.
- Enable OS "Reduce motion" setting. Reload. Line chart + choropleth should snap to final state without animating. Counters should show final number immediately.
- At 320px mobile width: all sections readable, counters stack vertically, map fills full width.
- Keyboard: Space replays hero. 1/2/3 switch metrics.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/bearstats
git add webapp/main.js webapp/styles.css
git commit -m "feat(webapp): keyboard controls + focus styles"
```

---

## Task 9: Deploy to GitHub Pages

**Files:**
- Create: `~/Projects/bearstats/.github/workflows/pages.yml`

- [ ] **Step 1: Create GitHub Pages workflow**

```bash
mkdir -p ~/Projects/bearstats/.github/workflows
```

Create `~/Projects/bearstats/.github/workflows/pages.yml`:

```yaml
name: Deploy Bearstats webapp to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./webapp

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Push repo to GitHub**

(User does this manually if the repo isn't on GitHub yet — this plan assumes it will be.)

```bash
cd ~/Projects/bearstats
# If no remote yet:
gh repo create fergurburgerman/bearstats --public --source=. --remote=origin --push
# If remote exists:
git push -u origin main
```

- [ ] **Step 3: Enable Pages in repo settings**

Via GitHub UI: Settings → Pages → Source: "GitHub Actions".

Re-run workflow if it didn't trigger on push:
```bash
gh workflow run pages.yml
```

- [ ] **Step 4: Verify deployed URL**

After the workflow completes (~2 min), visit the URL shown in the Pages settings (typically `https://<username>.github.io/bearstats/`). Spot-check:
- All five sections render.
- JSON data loads (network tab shows 200s for the four data files).
- Animations play on scroll.

- [ ] **Step 5: Commit workflow file**

```bash
cd ~/Projects/bearstats
git add .github/workflows/pages.yml
git commit -m "ci: deploy webapp to GitHub Pages on push to main"
git push
```

---

## Self-review checklist

**Spec coverage:**
- ✅ Section 8 architecture → Tasks 1-2 (scaffold + state); modules in 3, 4, 5
- ✅ Section 9 scrollytelling → Tasks 3 (hero), 4 (map), 5 (points), 6 (counters + Scrollama), with why-section as static HTML in Task 1
- ✅ Section 10 animation timing → Tasks 3, 4, 6 implement durations + easing as specified
- ✅ Section 12 accessibility → Task 8
- ✅ Section 13 deployment → Task 9

**Placeholder scan:**
- ⚠️ One external placeholder in `index.html`: `<a href="https://github.com/_TBD_">repo</a>`. Real URL known only at deploy time; implementer replaces with actual repo URL after Task 9.

**Type consistency:**
- ✅ `state.set(patch)` signature consistent across tasks
- ✅ `filterPoints(points, filters)` used same way in Task 5 and Task 7
- ✅ `mountLineChart` returns `{play, setMetric}` — used consistently
- ✅ `mountChoropleth` returns `{playAll, setYear, setMetric}` — used consistently
- ✅ `mountPointsMap` returns `{setFilters}` — used consistently

**Commit cadence:**
- ✅ One commit per task; 9 commits total

**Unit test coverage:**
- ✅ state pubsub (Task 2)
- ✅ chart-line metric selection (Task 3)
- ✅ choropleth value lookup + max (Task 4)
- ✅ point filtering (Task 5)
- Visual components are manually verified per task's Step 6
