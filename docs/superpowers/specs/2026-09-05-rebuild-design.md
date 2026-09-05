# Bearstats rebuild: design spec

Date: 2026-09-05. Supersedes `2026-09-05-scrolly-redesign-design.md`.
Goal: `docs/GOAL.md`. Evidence: `docs/research/stats-and-claims.md` (verdict and chart per claim), `docs/research/gaps.md` (what not to say).

## 1. The story

The reader arrives in September 2026 asking whether this autumn will repeat last autumn. The page answers in the hero and then earns the answer in four chapters.

1. **The record year.** Fiscal 2025 was the worst year in a 13-year series. Half of it happened in October and November, three quarters of that in Tohoku.
2. **What makes an outbreak.** Autumn spikes follow failed beech crops. A good crop follows a failure. Weather does not explain it.
3. **This year.** Spring 2026 was the busiest spring in 14 years, but spring does not set the autumn. The beech crop is forecast good, and the July forecast has matched the autumn result every time on record. Casualties so far are ordinary, except that six deaths by July is the window high.
4. **The baseline.** Bear estimates rose in every prefecture with two surveys. Gun licences fell 83% since 1975.

Rules for the copy (from the plain-facts pass): one fact per sentence; every number carries its window and unit; comparisons are ratios or differences; headings state the finding; no em dashes; "fiscal 2025" never "last year". Numbers not in `stats-and-claims.md` or `context.json` do not go on the page. The figures `gaps.md` marks as untraceable (hunter 70,000/20,000; population 15,000 to 54,000; the 57,308 sum; the FY2019-22 "failure year" means) do not appear.

## 2. Copy (draft, to be checked against `context.json` when it lands)

**Nav:** 01 Record year · 02 Outbreaks · 03 This year · 04 Baseline

**Hero.** Eyebrow: *Japan · bear sightings and attacks · updated {data date}*.
H1: **Spring 2026 had more bear sightings than any spring in 14 years of records. The beech crop that drives autumn attacks is forecast good.**
Three figures: **12,628** sightings, April to June 2026 (7,555 in 2025) · **3.9** beech index, Tohoku forecast, July 2026 (0.44 in July 2025) · **13** people killed, fiscal 2025.
Dateline: Sources: Ministry of the Environment (sightings to 30 June 2026, injuries and deaths to 31 July 2026); Tohoku Regional Forest Office beech survey (7 July 2026). A sighting is a report made to a prefecture. It is not a count of bears.

**01 What happened in fiscal 2025?** Answer: 50,801 sightings, 2.1 times the previous high. 238 people injured and 13 killed. Half of it in October and November, and three quarters of that in Tohoku.
- `annual` **Thirteen years of sightings.** The Ministry's series begins in fiscal 2013 with 9,133 sightings. Fiscal 2023 set a record of 24,348. Fiscal 2025 more than doubled it: 50,801.
- `harm` **238 injured, 13 killed.** Both are the highest since the injury count began in 2008. The previous highs were 219 injured and 6 killed, both in fiscal 2023.
- `where` **Two prefectures, one autumn.** Akita reported 13,592 sightings in fiscal 2025 and Iwate 9,739, 46% of the national total. In October alone the two reported 8,898 of 15,998.
- `heat` **The same year, month by month.** Each cell is one prefecture in one month. October and November 2025 were 26,336 sightings, 52% of the year. The same two months of fiscal 2024 were 3,518.
- `replay` **Report by report.** Akita and Iwate publish totals only. Toyama, Niigata, Gunma and Saitama publish each report with a location. The map plays their fiscal 2025 month by month: 64 reports in April, 1,795 in October. Yellow marks are people injured.

**02 Why do some autumns explode?** Answer: When the beech crop fails. Every October spike in the record follows a failed crop, and a good crop follows a failure.
- `mast` **Beech crop and October sightings.** Top row: the Tohoku Regional Forest Office beech index, 0 to 5, from 145 survey points in five prefectures. Bottom row: national October sightings. Dark tiles sit under tall bars. {2012 to 2025 values from context.json; at minimum: 2023 index 0.06 and 5,983 sightings; 2024 index 3.24 and 2,235; 2025 index 0.10 and 15,998.}
- `alternate` **A full crop is followed by a failure.** At Akita's five survey sites, every year with a full crop since 2002 was followed by a failure the next year: six of six. 2024 was full. 2025 failed.
- `weather` **Weather does not explain it.** Summer temperature and rainfall at Akita in the year before a crop show no relationship with the crop over 16 years. The 2023 and 2025 failures coincided with the two hottest summers, but the July survey had already graded both years 大凶作 before the heat.

**03 Will autumn 2026 repeat autumn 2025?** Answer: Probably not. Spring is far ahead, but spring does not set the autumn, and the beech crop is forecast good.
- `spring` **The busiest spring in 14 years.** April to June 2026: 12,628 sightings. The previous high was 7,601 in fiscal 2024. Fiscal 2025 had 7,555 at the same point.
- `scatter` **Spring does not set the autumn.** Across 13 years, October plus November ranged from a quarter of the spring count to three and a half times it. A high spring sets a floor for the year, not the autumn peak. {what-ifs from context: applying each past shape to 12,628 gives 28,293 to 84,913; label as arithmetic, not forecasts}
- `forecast` **The 2026 crop is forecast good.** Tohoku Regional Forest Office, 7 July 2026: {per-prefecture categories}; mean index 3.9, against 0.44 on the same date in 2025. Niigata, 189 points: 豊作 in all four regions. Toyama: 豊作. Akita five-site survey: full crop at four sites. In every prefecture-year on file, the July forecast matched the autumn result. {count from context}
- `casualties` **Injuries are ordinary. Deaths are not.** April to July 2026: 53 people injured, within the range of the last ten years (31 to 56). Six killed, the most for that window since the monthly count began in 2016.

**04 Why are there more bears than there were?** Answer: Estimates rose in every prefecture with two surveys, and gun licences fell 83% since 1975.
- `licences` **Hunting licences, 1975 to 2021.** All licences: 517,800 to 213,400. Gun licences: 493,700 to 84,400. Trap licences rose from 51,600 in 2007 to 119,500. 119,100 of 213,400 holders were 60 or older in 2021. The Ministry does not count hunters by target species.
- `population` **Bear estimates by prefecture.** Each line runs from a prefecture's earliest published estimate to its latest, with the survey year at each end. {examples: Iwate 1,100 (2006) to 3,700 (2020); Akita 1,052 (2010) to 2,900 (2024); Nagano 2,770 (2007) to 7,270 (2020)}. Methods changed between surveys, so part of the rise is measurement. There is no national series.

**Methods.** What a sighting is; reporting effects; the beech index definition (quoted); which prefectures publish point data; every source with URL and date; what the page does not claim (weather, acorns outside Fukushima and Toyama, a national population line).

## 3. Visual system: Field Notebook

Tokens (`:root`):
```
--paper: #f6f1e7;  --paper-2: #efe8d8;  --ink: #2b2620;  --ink-2: #5a5148;  --rule: #d8cdb8;
--sight: #4a6741;  --sight-2: #7f9a6c;   (sightings, captures)
--harm: #b5482a;   --harm-2: #d98b6f;    (injuries, deaths, the stamp)
--mast-0: #2b2620 … --mast-5: #efe6d2   (beech index: failure dark, full crop pale; 6-step ramp)
--map-sea: #12161f; --map-land: #1e2433; --map-border: #38425c; --map-point: #ff5e3a; --map-injury: #ffd166
```
Type (Google Fonts): **Newsreader** 500/600/700 + italic for headlines, chapter answers and chart annotations; **Public Sans** 400/500/600 for body and UI; **JetBrains Mono** 500 for every numeral (tabular). Body 17px/1.55 on desktop, 16px on phones. Contrast: --ink on --paper is 12:1; --ink-2 on --paper is 7.2:1; nothing lighter than --ink-2 carries text.

Layout: no cards. Sections are separated by 1px --rule hairlines running full width. Chapter head: numeral in a 44px rust circle rotated -8deg (the "stamp"), question in Newsreader 700 clamp(2rem, 4.5vw, 3.2rem), answer in Newsreader 500 italic 1.3rem. Steps: text sits on the paper with a 3px --harm rule on the left of the active step and --rule on the others; max 36ch. The pinned graphic panel has no background and no border; its charts draw their own hairline frame. The map is the one dark object on the page: an inset with a 1px --ink border and 2px --paper inner ring, so it reads as a photograph pasted into the notebook.

Charts: axes are --rule hairlines; tick labels Public Sans 12px --ink-2; series labels sit at the line end in Newsreader italic 14px --ink; the one callout per chart is Newsreader italic with a 1px leader and a 4px dot. Sightings in --sight, harm in --harm, past years in --rule to --ink-2, the running year in --harm only when the chart is about harm, otherwise --sight at full weight with the record year in --ink.

Motion: same as today (step-triggered, once per visit, settle on return, reduced-motion instant). Mobile mechanics unchanged: panel pinned at 46vh + nav, steps sized to the band below it.

## 4. Page structure and step table

```
header.chapter-nav (44px, paper, hairline below)
section#hero
section#ch-1  steps: annual, harm, where, heat, replay   graphics: annual | harm | map | heat
section#ch-2  steps: mast, alternate, weather             graphics: mast | alternate | weather
section#ch-3  steps: spring, summer, scatter, forecast, casualties graphics: monthly | summer | scatter | forecast | casualties
section#ch-4  inline (no sticky): licences chart, population dumbbells
footer#methods
```

| step | graphic | enter | settle |
|---|---|---|---|
| annual | annual bars 2013-2026 | play (bars rise) | setProgress(1) |
| harm | injuries + deaths rows 2008-2025 | play | setProgress(1) |
| where | map choropleth FY2025, focusTohoku, Akita/Iwate labels | focus | same |
| heat | heatmap FY2025 beside FY2024 | play (cells fade in by month) | setProgress(1) |
| replay | map: focusSample, replayMonths | replay | setMonthProgress(1) |
| mast | tiles-over-bars 2012-2025 | play (left to right) | setProgress(1) |
| alternate | Akita five-site strip 2002-2025 | play | setProgress(1) |
| weather | JJA temp/precip vs index scatter or strip | play | setProgress(1) |
| spring | monthly lines: 13 closed years in --rule, 2025 in --ink, 2026 in --sight | play | setProgress(1) |
| summer | small multiples Apr-Aug 2026 vs 2025: Akita, Miyagi, sample4, Iwate (not comparable) from context.recent | play | setProgress(1) |
| scatter | Apr-Jun vs Oct-Nov, 13 points, vertical line at 12,628 | play | setProgress(1) |
| forecast | panel: five prefecture tiles 2026 vs 2025 vs 2023 + three survey rows + track record | play | setProgress(1) |
| casualties | Apr-Jul injured and killed, 2016-2026, two bar rows | play | setProgress(1) |

## 5. Data contract

Existing: `national-timeline.json`, `prefecture-totals.json`, `points-recent.json`, `japan-prefectures.geo.json`.
New: `webapp/data/context.json` (built by `data-pipeline/build_context.py`; shape fixed in that script's docstring and tests): `monthly_national` (FY2013-2026), `prefecture_month`, `casualties_monthly` (FY2014-2026), `mast.{tohoku_office, akita_sites, miyagi, toyama, moe_table, forecast_2026, index_definition}`, `licences`, `population`, `weather`, `sources`.

Charts read only these files. Every chart module exports the pure transform it uses (`annualSeries(ctx)`, `heatCells(ctx, fy)`, `scatterPoints(ctx)`, `mastStrip(ctx)`, `alternatePairs(ctx)`, `forecastPanel(ctx)`, `casualtyRows(ctx)`, `licenceSeries(ctx)`, `populationPairs(ctx)`) and those are unit-tested against the real JSON.

## 6. Module interfaces

Every chart: `mountX(container, data) → { play(), setProgress(t), stop(), setView?(v) }`; clears the container on mount; measures itself once; type sizes in px inside a viewBox (render scales 2x as today).

- `chart-annual.js`, `chart-harm.js`, `chart-heat.js`, `chart-mast.js`, `chart-alternate.js`, `chart-weather.js`, `chart-monthly.js` (extend to 13 years + views), `chart-scatter.js`, `chart-forecast.js`, `chart-casualties.js` (replaces chart-rows), `chart-licences.js`, `chart-population.js`.
- `map-story.js`: unchanged API; styling constants move to the tokens above; `focusTohoku` labels use Newsreader italic via `.pref-label`.
- `director.js`: STEPS per the table; `createDirector(graphics, panels)` unchanged.
- `main.js`: loads five JSON files; mounts; scrollama as today; `#updated` from `context._built_at` or `timeline._source_fetched_at`, whichever is later.

## 7. Render scenes (X media)

`render.html` scenes, 1920x1080, same pipeline: `record` (annual bars), `heat` (heatmap), `mast` (tiles over bars), `forecast` (2026 panel), `replay` (map). Title cards in the notebook style on paper. Cards = final frames.

## 8. Review before any deploy

`tools/review-shots.mjs`: Playwright, viewports 360x660, 390x844, 430x932, 820x1180, 1280x800, 1920x1080. For each: load, screenshot hero; for each `.step` scroll so its top sits at the trigger line, wait for settle, screenshot; then chapter 4 and methods. Writes `media/review/<w>x<h>/<nn>-<step>.png` and `media/review/report.json` with automated checks: `scrollWidth <= innerWidth`; no `.step.is-active` card bounding box intersects the `.graphic` panel box on phones; every `.g.is-active svg` has at least one visible path/rect; no text element with computed color contrast under 7:1 against --paper (sample: h1, h2, .answer, .step p, .g-caption, .dateline). The lead reads every PNG before deploying. Deploy = `git push` (GitHub Pages) + `npx wrangler pages deploy webapp --project-name bearstats`.

## 9. Tests

`webapp/tests`: existing helpers; one test file per chart's transforms against real JSON; director table vs HTML; `context.json` schema smoke. `data-pipeline/tests`: `test_build_context.py`. All green before commit.
