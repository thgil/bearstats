# Bearstats — Scrollytelling Redesign (design spec)

Date: 2026-09-05. Supersedes sections 8–10 of `2026-04-18-bearstats-design.md`.

## 1. Problem

The current page stacks six unrelated sections. Readers cannot answer the three
questions they arrive with — *what happened, is it over, will it get worse* —
and the two maps contradict each other: the choropleth says the crisis is in
Tohoku (Akita + Iwate = 46% of FY2025 sightings), then the point map jumps to
Toyama/Niigata/Gunma/Saitama with no explanation that those are simply the only
prefectures that publish point data. Injuries are invisible on the point map
because colour encodes species (all red) and only radius differs.

## 2. Goals

1. One narrative spine: three numbered questions, each answered in one line
   under its heading, each driven by one pinned graphic that text steps control.
2. The map is a single continuous Leaflet instance that plays years, zooms to
   Tohoku, then flies to the four point-data prefectures for the month replay —
   the move is narrated, not implied.
3. Injuries are unmistakable on the point map.
4. Every graphic exposes a deterministic `setProgress(t)` so frames can be
   rendered headlessly for X videos.
5. Four 1920×1080 H.264 MP4s in `media/`, rendered frame-by-frame.

Non-goals: light theme, i18n, new data sources, changing the pipeline.

## 3. Data facts the copy relies on (from `webapp/data/*.json`, fetched 2026-08-29)

| Fact | Value |
|---|---|
| FY2025 sightings / injuries / deaths | 50,801 / 238 / 13 |
| Previous death record | 6 (FY2023) |
| Akita + Iwate FY2025 | 13,592 + 9,739 = 23,331 (45.9%) |
| Oct 2025 sightings | 15,998 (Nov 10,338) |
| FY2022–24 monthly peak month | June each year |
| FY2026 Apr / May / Jun vs FY2025 | 1,787 / 4,581 / 6,260 vs 800 / 2,528 / 4,227 |
| YTD Apr–Jun FY2026 vs FY2025 | 12,628 vs 7,555 (+67%) |
| YTD Apr–Jul injuries / deaths FY2026 vs FY2025 | 53 vs 55 / 6 vs 4 |
| FY2024 at end June vs FY2025 | 7,601 vs 7,555; FY2024 finished 20,513 (40% of FY2025) |
| Point data prefectures with FY2025 records | toyama, niigata, gunma, saitama (hokkaido feed starts May 2026 → 0 FY2025 points) |
| Sample: Apr 2025 / Oct 2025 reports | 64 / 1,795 |

Copy must be derived from data where a helper exists (peak captions, readouts);
hard-coded numbers in HTML are acceptable for the hero and step text but must
match the table above.

## 4. Page structure

```
<header class="chapter-nav">  01 What happened · 02 Is it over · 03 Will it get worse
<section id="hero">           full-viewport; headline, answer line, 3 numbers, dateline, scroll cue
<section class="chapter" id="ch-1">
  <div class="chapter-head">  eyebrow "01", h2 question, .answer line
  <div class="scrolly">
    <div class="steps">       .step[data-step=…] × 5
    <div class="graphic">     sticky; contains .g[data-g=map|monthly|deaths] layers
<section class="chapter" id="ch-2"> … steps × 3, graphic layers monthly|pace|rows
<section class="chapter" id="ch-3"> prose-led; one inline pace chart in "caution" view; no sticky
<footer id="methods">
```

### Steps and what they do

| Chapter | `data-step` | Graphic shown | Action on enter |
|---|---|---|---|
| 1 | `years` | map | `map.showChoropleth(2022)` then `map.playYears()` |
| 1 | `centre` | map | `map.showChoropleth(2025)`, `map.focusTohoku()` |
| 1 | `october` | monthly | `monthly.setView("closed")`, `monthly.play()` |
| 1 | `upclose` | map | `map.focusSample()`, `map.showPoints()`, `map.replayMonths()` |
| 1 | `cost` | deaths | `deaths.play()` |
| 2 | `months` | monthly | `monthly.setView("running")`, `monthly.play()` |
| 2 | `pace` | pace | `pace.setView("running")`, `pace.play()` |
| 2 | `casualties` | rows | nothing (static) |
| 3 | — | inline pace chart, `setView("caution")`, play on section enter |

On step exit going upward, the director re-runs the previous step's enter so
scrolling back restores state. `map.stop()` / chart `stop()` cancel timers
before any new action.

### Copy (draft; final wording may be tightened in integration)

**Hero.** Eyebrow: *Japan · bears · FY2025–26*. H1: *Japan just had its worst
bear year on record. This spring is running 67% ahead of it.* Numbers:
50,801 sightings · 238 people injured · 13 killed. Dateline: *Fiscal year
April 2025 – March 2026. Sightings to 30 June 2026, casualties to 31 July 2026.
Ministry of the Environment. Counts are reports, not bears.*

**01 What happened?** Answer: *Twice as many sightings as any year before,
and thirteen deaths.*

- `years`: **Four years, one map.** *Sightings reported in each prefecture,
  played from FY2022 to FY2025. The country lights up from the north.*
- `centre`: **It has a centre.** *Akita and Iwate alone reported 23,331 of the
  50,801 sightings — nearly half. The map shows raw counts, so big rural
  prefectures run dark partly on size, but the gap here is not size.*
- `october`: **It happened in autumn.** *For three years the curve peaked in
  June and fell. In 2025 it kept climbing: 15,998 reports in October alone.
  The beech and oak crop had failed across Tohoku, and bears that would have
  fed in the hills came down for apples, persimmons and rubbish — and found
  towns. By November the government sent soldiers to Akita.*
- `upclose`: **Up close.** *Tohoku's prefectures do not publish individual
  reports. Four prefectures on the Sea of Japan coast and north of Tokyo do:
  Toyama, Niigata, Gunma and Saitama. Here is their year, one month at a time.
  April: 64 reports. October: 1,795. Yellow marks are people hurt.*
- `cost`: **The cost.** *Thirteen people killed by bears in a single year. The
  previous worst since records began in 2008 was six.*

**02 Is it over?** Answer: *No. Every month of the new year is running well
above the record year.*

- `months`: **Same months, new year.** *April 1,787 against 800. May 4,581
  against 2,528. June 6,260 against 4,227.*
- `pace`: **Sixty-seven percent ahead.** *By the end of June FY2026 had
  logged 12,628 sightings, against 7,555 at the same point of the record year.*
- `casualties`: **More bears seen. Not, so far, more people hurt.** *Injuries
  in April–July: 53 this year, 55 last. Deaths: 6 against 4 — a gap too small
  to read.*

**03 Will it get worse?** Answer: *That depends on the acorns, and nobody
knows yet.* Prose: the spring-doesn't-predict-autumn caution (FY2024 was ahead
of FY2025 in June and finished at 40% of it — chart in "caution" view); why the
baseline moved (population ~15,000 → ~54,000 between 2012 and 2025; active bear
hunters >70,000 in the 1970s → <20,000); what decides autumn 2026 is the mast
crop, visible from September. Close: *Check back in November.*

**Methods footer.** What a sighting is; what is missing (42 prefectures publish
no point data; Hokkaido's feed begins May 2026 and is excluded from the replay);
sources (MoE, Japan Times, Britannica, CNN); repo link
`https://github.com/thgil/bearstats`; boundaries credit dataofjapan/land.

## 5. Visual system

- Palette (CSS custom properties): `--bg #0f1419`, `--bg-elev #1a1f2e`,
  `--text #e8e8ea`, `--text-dim #9aa0b4`, `--accent #ff3b30`,
  `--injury #ffd166`, `--field #333b52`, `--bench #7d87a8`.
- Inter (Google Fonts, already loaded). Eyebrow: 0.7rem uppercase 0.08em
  tracking, `--text-dim`. Chapter h2: clamp(1.9rem, 4vw, 3rem) weight 800.
  `.answer`: 1.15rem weight 600 `--text`. Step h3: 1.1rem weight 700. Step
  body: 1rem `--text-dim`, max 34ch.
- Scrolly layout, desktop ≥ 800px: `.scrolly { display:grid;
  grid-template-columns: minmax(0,38fr) minmax(0,62fr); gap: 2rem }`.
  `.graphic { position: sticky; top: 0; height: 100vh; }` with the `.g` layers
  absolutely filling it (inset 1.25rem). `.step { min-height: 80vh; padding
  25vh 0 }`, text in a card (`--bg-elev`, 1px border rgba(255,255,255,.06),
  radius 12, padding 1.25rem 1.5rem). Active step card: full opacity; others
  0.35.
- Mobile < 800px: single column; `.graphic { position: sticky; top: 0;
  height: 52vh; z-index: 2 }` above the steps, step cards with a translucent
  background so they read over nothing.
- `.g` layers are stacked with `opacity` + `visibility` transitions (250ms),
  never `display:none`, so charts can measure themselves at mount.
- Chapter nav: fixed top bar, 44px, three links, current chapter highlighted
  (IntersectionObserver on `.chapter`). Replaces the progress bar.
- Map: sea `#12161f`, land `#1e2433`, borders `#38425c`. Choropleth ramp as
  today (YlOrRd 0.2–0.95 with sqrt opacity). Tohoku focus: non-Tohoku fill
  opacity ×0.25; Akita and Iwate get a 1.5px `--text` outline and a label
  (`L.tooltip` permanent, class `pref-label`).
- Points: sighting r3 `--accent` fillOpacity .55; trace r2 `--accent` .35;
  capture r3 `--accent` .55; **injury r6 fill `--injury`, stroke `#0f1419`
  weight 1.5, fillOpacity 1, in its own Leaflet pane (`injuries`, z-index 650)
  so it always draws on top and never fades.** Earlier months' sighting layers
  fade to .18 as the replay advances; injuries do not fade.
- Replay readout (top-left over the map): month label, then
  `N reports · M hurt` with `M hurt` in `--injury` (omit when 0).
- Key under the map: red dot "Sighting or trace", yellow ringed dot "Person
  injured".
- Reduced motion: `play*()` resolve immediately to the final state.

## 6. Module interfaces (the contract between agents)

All modules are ES modules, assume `d3`, `L`, `scrollama` globals, no build.

```js
// map-story.js  (replaces map-choropleth.js + map-points.js; keep and re-export
// the pure helpers: maxForMetricAcrossYears, valueForPrefYear, yearsForMetric,
// inFiscalYear, filterPoints, monthlyBuckets, plus new pointStyle(p), tohokuShare(totals, year))
export function mountStoryMap(container, { timeline, totals, geo, points, fiscalYear = 2025,
                                           yearLabelEl, replayMonthEl, replayCountEl, legendEl })
// returns:
{
  showChoropleth(year),          // instant; mode = "choropleth"
  playYears(totalMs = 4000),     // Promise; steps through yearsForMetric(sightings)
  setYearProgress(t),            // deterministic, t∈[0,1] → year index
  focusJapan(), focusTohoku(), focusSample(),   // flyToBounds; each returns Promise resolving on moveend
  showPoints(),                  // mode = "points"; all FY points drawn, choropleth dimmed to base fill
  replayMonths(perMonthMs = 620),// Promise; month-by-month accumulation with readout
  setMonthProgress(t),           // deterministic
  hidePoints(),
  stop(),                        // cancel timers/animations
  map, buckets,
}
```
Constants exported: `TOHOKU = ["aomori","iwate","miyagi","akita","yamagata","fukushima"]`,
`SAMPLE_PREFS = ["toyama","niigata","gunma","saitama"]`. `focusSample` fits the
bounds of the FY points in `SAMPLE_PREFS` (not Hokkaido). `pointStyle(p)`
returns Leaflet circleMarker options per §5 and is unit-tested.

```js
// chart-monthly.js (new): FY lines overlaid Apr→Mar, raw monthly sightings.
export function monthlySeries(timeline) → [{year, partial, values}]
export function mountMonthlyChart(container, timeline)
  → { setView("closed"|"running"), play(), setProgress(t), stop() }
// "closed": FY2022–24 in --field, FY2025 in --accent, October 2025 point labelled "15,998".
// "running": FY2025 in --bench, FY2026 in --accent drawn month by month, other years --field;
//            each FY2026 point labelled with its value; FY2025 same-month value in --bench beneath.
// play(): lines draw left→right (stroke-dash); setProgress drives the same dash offset.

// chart-pace.js (existing; extend): add setView("running"|"caution"), setProgress(t), stop().
// "caution": FY2024 and FY2025 highlighted (--bench / --accent), FY2026 hidden,
//            end labels "FY2024 finished at 20,513", "FY2025 finished at 50,801",
//            June read-off line with both June values.
// chart-deaths.js (existing; extend): add setProgress(t), stop().
// chart-rows.js: unchanged.
```

```js
// director.js
export const STEPS = { years: {graphic:"map", enter: g => …}, … }  // table per §4
export function createDirector(graphics, panelEl) → { enter(stepId), showGraphic(name) }
// graphics = { map, monthly, pace, deaths }.  showGraphic toggles .is-active on .g[data-g].
// STEPS is a plain object so tests can assert every data-step in index.html has an entry.
```

`main.js`: load data → mount the graphics into chapter 1's panel and chapter 2's
panel (separate instances of monthly/pace are fine; the map exists once) →
`scrollama().setup({ step: ".step", offset: 0.6 })` → `onStepEnter` calls
`director.enter(el.dataset.step)`; `onStepExit` with `direction === "up"` calls
`director.enter(previousStepId)` → chapter nav observer → hero counters →
chapter 3 pace chart plays on enter. Keyboard: `r` replays current step.

## 7. Render pipeline (X videos)

- `webapp/render.html` + `webapp/render.js`: reads `?scene=&frame=&fps=30&dur=`,
  loads data, mounts one graphic into a 1920×1080 `.stage` with a title block
  (eyebrow / title / dateline baked in, same type system), calls
  `setProgress(frame / (fps*dur))`, then sets `window.__frameReady = true`.
  Scenes:
  - `replay` (15 s): map at `focusSample` bounds, `setMonthProgress`, readout.
  - `years` (8 s): choropleth `setYearProgress`, big year label, legend.
  - `overtake` (10 s): monthly chart "running" view `setProgress`.
  - `deaths` (8 s): deaths chart `setProgress`.
  Each scene holds its final frame for the last 2 s (t clamps at 1).
- `tools/render-video.mjs` (Node ≥ 20, `playwright-core` with
  `channel: "chrome"` so no browser download): starts a static server on
  `webapp/`, opens each frame URL, waits for `__frameReady`, screenshots to
  `media/frames/<scene>/%05d.png`, then runs
  `ffmpeg -framerate 30 -i … -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart media/<scene>.mp4`.
  `tools/package.json` holds the dependency; `tools/node_modules` and
  `media/frames` are git-ignored; the MP4s are committed.
- Leaflet animations are disabled in render mode (`zoomAnimation:false`,
  `fadeAnimation:false`), and `setMonthProgress`/`setYearProgress` must not use
  timers.

## 8. Testing

- `node --test` in `webapp/tests`: existing helper tests migrate to
  `map-story.js`; add `pointStyle` (injury vs sighting differ in fill, radius,
  pane), `tohokuShare` (FY2025 → 0.459 ±0.001), `monthlySeries`, director step
  table covers every `data-step` in `index.html` (test reads the HTML with a
  regex), `setProgress(0)` and `setProgress(1)` are idempotent for each chart
  (jsdom-free: assert the pure progress→index mappers).
- Manual: screenshot every step at 1280×800 and 390×844; confirm the map moves
  Tohoku → sample prefectures with the text; injuries visible; reduced-motion
  shows final states.
- Videos: play each MP4; no dropped/duplicated frames (frame count = fps×dur).

## 9. Deployment

Unchanged: GitHub Pages workflow on push to `main`. Cloudflare Pages project
`bearstats` is deployed manually with `npx wrangler pages deploy webapp
--project-name bearstats` after verification.
