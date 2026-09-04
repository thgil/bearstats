# Scrollytelling redesign — implementation plan

Spec: `docs/superpowers/specs/2026-09-05-scrolly-redesign-design.md` (the contract; read §5–§7 before touching code).

Execution: three parallel workstreams (A, B, C) that own disjoint files, then integration, then the render pipeline (D). Each workstream: TDD for pure helpers with `node --test`, manual browser check of the visual result, commit on completion.

Local dev: `cd webapp && python3 -m http.server 8000`. Tests: `webapp/tests/run-tests.sh`.

## A — `map-story.js` (owns: `webapp/map-story.js`, `webapp/tests/test-map-story.js`; deletes `map-choropleth.js`, `map-points.js`, `tests/test-choropleth.js`, `tests/test-points.js` after migrating their tests)

- [ ] Migrate pure helpers + tests into `map-story.js` / `test-map-story.js`.
- [ ] Add `pointStyle(p)` (spec §5 values; injury → `pane: "injuries"`) with tests: injury differs from sighting in fill, radius and pane; trace smaller than sighting.
- [ ] Add `tohokuShare(totals, year)` → share of national sightings from `TOHOKU`; test FY2025 ≈ 0.459… wait — Akita+Iwate is the headline (0.459); implement `prefShare(totals, year, prefs)` and test `prefShare(totals, 2025, ["akita","iwate"])` ≈ 0.459 ±0.001 and `TOHOKU` share > 0.6.
- [ ] Add `yearIndexForProgress(t, n)` and `monthIndexForProgress(t, n)` pure mappers; test t=0 → 0, t=1 → n-1, monotonic.
- [ ] `mountStoryMap` per spec §6: single Leaflet map, choropleth layer + points layers, `injuries` pane at z 650, choropleth dims (fillOpacity ×0.25, keep ramp) when `showPoints()`; `focusTohoku` outlines + labels Akita/Iwate; `focusSample` fits FY points of `SAMPLE_PREFS`; every `play*`/`focus*` returns a Promise; `stop()` cancels; reduced-motion → instant.
- [ ] Deterministic `setYearProgress(t)` / `setMonthProgress(t)` (no timers; used by render).
- [ ] Verify in browser with a throwaway harness page (delete it after) — do NOT edit `index.html`/`main.js`; C owns those.

## B — charts (owns: `webapp/chart-monthly.js`, `chart-pace.js`, `chart-deaths.js`, `tests/test-monthly.js`, `tests/test-pace.js`, `tests/test-deaths.js`)

- [ ] `chart-monthly.js`: `monthlySeries(timeline)` (tests: 5 series, 2026 partial with 3 values), `mountMonthlyChart` with views `closed`/`running` per spec §6, `play()`, `setProgress(t)`, `stop()`. Direct labels, no legend. Labels must not overlap at 1920×1080 or at 600×420.
- [ ] `chart-pace.js`: add `setView("running"|"caution")`, `setProgress(t)`, `stop()`; keep `play()`. Caution view per spec.
- [ ] `chart-deaths.js`: add `setProgress(t)` (bars grow in sequence as t advances; note fades in at t≥0.9), `stop()`.
- [ ] Pure progress helpers exported and tested (`dashOffsetForProgress`, `barsForProgress`, etc.).
- [ ] Charts must be re-mountable: `mount*` clears the container first.

## C — page shell (owns: `webapp/index.html`, `webapp/styles.css`, `webapp/main.js`, `webapp/director.js`, `webapp/counters.js`, `tests/test-director.js`)

- [ ] `index.html` rewritten to spec §4 with the draft copy, chapter nav, hero, three chapters, methods footer. Graphic panels contain `.g[data-g]` layers with the container ids the graphics need (`#map`, `#map-year`, `#replay-month`, `#replay-count`, `#map-legend`, `#monthly-1`, `#deaths`, `#monthly-2`, `#pace`, `#rows-injuries`, `#rows-deaths`, `#pace-caution`).
- [ ] `styles.css` rewritten to spec §5 (delete dead rules). Mobile layout. Reduced motion.
- [ ] `director.js`: `STEPS` table + `createDirector` per spec §6. Test: every `data-step="…"` in `index.html` has a STEPS entry and vice versa; every `STEPS[x].graphic` names a `.g[data-g]` present in the HTML.
- [ ] `main.js`: wire per spec §6. Until A/B land, import the agreed module names anyway; guard each `mount*` call in try/catch so the shell renders with missing graphics.
- [ ] Verify shell in browser: nav highlights, steps activate, panel stays sticky, mobile layout at 390px.

## Integration (lead)

- [ ] Run all tests; open the site; walk every step at 1280×800 and 390×844; fix seams; tighten copy.
- [ ] Commit.

## D — render pipeline (owns: `webapp/render.html`, `webapp/render.js`, `tools/`, `media/`, `.gitignore` additions)

- [ ] Per spec §7. Scenes: replay 15 s, years 8 s, overtake 10 s, deaths 8 s, 30 fps, last 2 s hold.
- [ ] `tools/render-video.mjs` with `playwright-core` (`channel: "chrome"`); frame count check; ffmpeg encode.
- [ ] Produce the four MP4s; report sizes and durations (`ffprobe`).
