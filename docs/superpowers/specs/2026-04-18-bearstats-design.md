# Bearstats — Design Spec

**Date:** 2026-04-18
**Author:** fergus + Claude
**Status:** draft, pending user review

## 1. Summary

Bearstats is a data-journalism web app that tells the story of Japan's 2025 bear crisis — a year in which Asian black bear sightings hit ~47,000 (double the previous record) and 13 people died. The app combines an animated national-trend line chart, a year-by-year animated choropleth of Japan, and point-level 2025 sighting data from the six prefectures that publish machine-readable feeds.

Built as a static single-page site (vanilla JS + D3 + Leaflet + Scrollama). Data is aggregated one-shot from ~10 public sources via a Python pipeline; the webapp consumes four JSON files.

## 2. Goals

- Show that 2025 is unprecedented by the numbers, not just by anecdote.
- Let the viewer see *where* sightings are concentrated (Tohoku-heavy).
- Be shareable — a single URL anyone can open.
- Be honest about data gaps (point-level data only exists for ~6 prefectures; older years are prefecture-totals only).

## 3. Non-goals (out of scope for v1)

- Live / real-time updates
- User accounts or saved views
- Non-bear wildlife, even where sources include it (Kumadas has boar/deer)
- Predictive risk models
- Japanese-language UI (English labels, but Japanese city names preserved)

## 4. Project structure

Code lives at `~/Projects/bearstats/` (not in the Obsidian vault).

```
~/Projects/bearstats/
├── README.md
├── .gitignore                      # raw/, .venv, webapp/lib untouched, etc.
├── docs/superpowers/specs/         # this file + future specs
├── research/                       # Markdown research notes
│   ├── data-sources.md             # catalog of every source + URLs + licenses
│   ├── historical-context.md       # why 2025 is unprecedented
│   └── methodology.md              # how we aggregated + caveats
├── data-pipeline/
│   ├── fetch_env_go_jp.py
│   ├── extract_env_go_jp.py
│   ├── fetch_arcgis.py
│   ├── fetch_kumadas.py
│   ├── fetch_yamaguchi.py
│   ├── fetch_hokkaido.py
│   ├── build_json.py
│   ├── requirements.txt
│   └── raw/                        # gitignored; fetched PDFs + raw JSON dumps
└── webapp/
    ├── index.html
    ├── styles.css
    ├── main.js                     # scroll orchestrator + global state
    ├── chart-line.js               # hero animated line chart
    ├── map-choropleth.js           # Leaflet map + year playback
    ├── map-points.js               # point dot overlay (2025)
    ├── data/
    │   ├── national-timeline.json
    │   ├── prefecture-totals.json
    │   ├── points-recent.json
    │   └── japan-prefectures.geo.json
    └── lib/                        # vendored d3, leaflet, scrollama
```

## 5. Data sources

### Historical / national (all 47 prefectures, prefecture-level totals)

**Ministry of the Environment (環境省)** — https://www.env.go.jp/nature/choju/effort/effort12/effort12.html
Three PDF formats, each with different shape:

- **Injury PDFs** (one per fiscal year, 10 total for FY2016 H28 → FY2025 R07): 39 prefectures × 12 months × 3 metrics (incidents, victims, deaths). Deaths ARE broken out per prefecture per month. Prefecture names are abbreviated (`青森`, not `青森県`; Hokkaido keeps full form).
- **Sightings PDF** (`syutubotu.pdf`, one file): prefecture × 12 months × 5 fiscal years (R03 / 2021 → R07 / 2025) in a single file.
- **Captures PDF** (`capture-qe.pdf`, one file): prefecture × 18 fiscal years (H20 / 2008 → R07 / 2025), yearly granularity, 3 sub-columns per year (total / culled / non-culled). Also contains a species-breakdown sub-table (ツキノワグマ vs ヒグマ).

Prefectures in env.go.jp tables: 39, not 47. Missing: Kyushu (Fukuoka, Saga, Nagasaki, Kumamoto, Oita, Miyazaki, Kagoshima) + Okinawa, because Asian black bears don't occur there. The pipeline fills missing prefectures with 0 when merging to 47-prefecture schemas for the webapp.

Authoritative; consistent methodology; preliminary figures that get revised.

### Point-level / current year (6 prefectures)

| Prefecture | Source | Records | Type |
|---|---|---:|---|
| Saitama | ArcGIS FeatureServer | ~281 | survey123_3123e5ed... |
| Gunma | ArcGIS FeatureServer | ~1,293 | survey123_a77f33a9... |
| Niigata | ArcGIS FeatureServer | ~3,553 | survey123_08d14b98... |
| Toyama | ArcGIS FeatureServer | ~4,352 | survey123_3f07f1f9... |
| Akita | Kumadas open data (CC-BY 4.0) | multi-year | kumadas.net |
| Yamaguchi | CC-BY 4.0 open dataset | 2024 data | pref.yamaguchi.lg.jp |

### Hokkaido (brown bear, separate species)

**higumap.info** — field-verified brown bear sightings. Separate dataset, separate overlay, never summed with Asian black bear.

Full URLs + license terms in `research/data-sources.md`.

## 6. Data pipeline

**Stack:** Python 3.11+, `httpx`, `pdfplumber`, `pandas`. Manual re-run (no cron).

**Flow:** heterogeneous sources → per-source fetchers → raw files in `raw/` → `build_json.py` merges → 4 JSON files in `webapp/data/`.

**Scripts:**

| Script | Reads | Writes |
|---|---|---|
| `fetch_env_go_jp.py` | 10 yearly injury PDFs + current sightings/captures PDFs | `raw/env/*.pdf` |
| `extract_env_go_jp.py` | `raw/env/*.pdf` (three different shapes — see Section 5) | `raw/env/injuries.csv` (39 pref × 120 months × 3 metrics), `sightings.csv` (39 pref × 60 months, 5 years), `captures.csv` (39 pref × 18 years × 3 cols) |
| `fetch_arcgis.py` | 4 FeatureServer endpoints, paginated | `raw/arcgis/{pref}.geojson` |
| `fetch_kumadas.py` | Akita Kumadas open-data endpoint | `raw/kumadas/akita.csv` |
| `fetch_yamaguchi.py` | Yamaguchi dataset | `raw/yamaguchi/2024.csv` |
| `fetch_hokkaido.py` | higumap.info | `raw/hokkaido/higuma.geojson` |
| `build_json.py` | all of `raw/` | `webapp/data/*.json` |

**Robustness:**

- Checksums on fetched files; re-runs skip unchanged.
- Every output JSON carries `_source_fetched_at` (ISO 8601).
- Fetch failures log warnings, pipeline continues with stale `raw/`.
- `build_json.py` fails hard if required inputs are missing.
- PDF extractors have shape assertions (e.g., "expect 47 rows × 12 columns") so upstream format changes fail loudly.

## 7. Output JSON schemas

### `national-timeline.json`
```jsonc
{
  "years": [2016, 2017, ..., 2025],
  "metrics": {
    "sightings": [15234, 14890, ..., 47038],
    "injuries":  [103,   105,   ..., 238],
    "deaths":    [2,     2,     ..., 13]
  },
  "_source_fetched_at": "2026-04-18T00:00:00Z"
}
```

### `prefecture-totals.json`
```jsonc
{
  "metrics": {
    "sightings": {
      "2016": { "akita": 1820, "iwate": 944, ... },
      "2017": {...},
      ...
    },
    "injuries": { "2016": {...}, ... },
    "deaths":   { "2016": {...}, ... }
  },
  "_source_fetched_at": "..."
}
```
Prefecture keys use lowercase romaji (e.g., `akita`, `iwate`). Webapp picks the active metric from shared state.

### `points-recent.json`

Point-level sightings from the six sources that publish machine-readable feeds. Most records are FY2025; Yamaguchi's open dataset is FY2024, Kumadas spans multiple years. Each record has a date — the webapp filters by year from shared state.

```jsonc
[
  { "pref": "niigata", "city": "長岡市", "lat": 37.2522, "lon": 138.6796,
    "date": "2025-04-08", "type": "sighting", "count": 3, "species": "black",
    "source": "niigata-arcgis" },
  ...
]
```

### `japan-prefectures.geo.json`
Standard GeoJSON `FeatureCollection`. Each feature `properties` includes `code` (lowercase romaji), `name_ja`, `name_en`.

## 8. Webapp architecture

**Stack:** vanilla HTML/CSS/ES modules. No build step. Libraries vendored in `webapp/lib/` (D3 v7, Leaflet v1.9, Scrollama v3).

**Modules (all ES modules):**

- `main.js` — boots, loads JSON, holds shared state, wires Scrollama triggers to module methods.
- `chart-line.js` — exports `init(el, data)`, `play()`, `setMetric(m)`.
- `map-choropleth.js` — exports `init(el, geo, totals)`, `setYear(y)`, `reset()`.
- `map-points.js` — exports `init(map, points)`, `show()`, `filterBy(filters)`.

**Shared state (in `main.js`):**
```js
const state = {
  metric: "sightings",    // "sightings" | "injuries" | "deaths"
  year: 2025,
  species: "all",         // "all" | "black" | "brown"
  prefectureFocus: null,
};
```
~20-line publish/subscribe to notify modules when state changes. No Redux, no reactive framework.

## 9. Scrollytelling sections

| # | Name | Behavior |
|---|---|---|
| 0 | Hero | Line chart draws 2016→2023 gently (1.5s), snaps vertical 2024→2025 (0.4s, ease-in-expo), final dot pulses + counter tweens to 47,038 |
| 1 | Map play | Japan choropleth auto-plays 2016→2025 over 8s (~0.8s/year), prefectures interpolate pale-yellow → crimson (D3 `interpolateYlOrRd`). Year counter in corner. |
| 2 | Zoom + points | Map pans/zooms to Tohoku (1.2s). 2025 dots fade in staggered 50ms, cap 200 visible at once — rest appear on further zoom. |
| 3 | Human cost | Line chart re-renders with injuries + deaths overlaid. Three counters tween 0 → 47,038 / 238 / 13 over 1s. |
| 4 | Why? | Static. Short text on mast failure, hunter decline, range expansion. Small chart of bear population estimate (15k 2012 → 54k 2025). |

**Pacing controls:**
- Pause/replay button on each auto-play.
- Scroll velocity doesn't affect animation speed.
- `prefers-reduced-motion` → instant transitions, charts render at final state, no counter tweens.

**Input:**
- Keyboard: Space = pause/resume, ←/→ = step year (in map section).
- Touch/mobile: tap to pause; pinch-zoom works on map section.

## 10. Data handling / edge cases

| Source | Quirk | Handling |
|---|---|---|
| env.go.jp | Fiscal year (Apr–Mar) vs calendar year | Normalize to calendar year in pipeline; document in methodology |
| env.go.jp | Japanese era year codes (R07/H28) | Map to Western year in pipeline |
| env.go.jp | Preliminary figures get revised | Store fetch timestamp; quarterly re-run |
| env.go.jp | Includes both species in injury totals | Stays labeled; webapp filters by species |
| env.go.jp injury PDFs | 39 prefectures (Kyushu + Okinawa absent) | Fill missing prefectures with 0 when projecting to 47-prefecture webapp schema |
| env.go.jp injury PDFs | 3 metrics per month (incidents / victims / deaths) | Extract all three; webapp uses victim counts for the injuries overlay and death counts for the deaths overlay |
| env.go.jp sightings PDF | 5 years in one file (R03–R07) | Parse as multi-year; no need to download separate historical sightings PDFs |
| env.go.jp captures PDF | 18 years in one file (H20–R07), yearly granularity | Parse as multi-year, yearly only (no monthly breakdown available) |
| ArcGIS | Paginated at 1,000 records | Loop on `exceededTransferLimit` |
| ArcGIS | Opaque field names (`field_7`, `field_8`) | Explicit mapping in `build_json.py` |
| ArcGIS | Dashboards can be retired | Log "source unreachable"; webapp shows last-updated badge |
| Kumadas | Multi-species | Filter to bear at extract |
| higumap.info | Field-verified only (under-counts raw) | Labeled "verified"; never summed with ArcGIS raw |
| Hokkaido | Brown bear entirely separate | Separate dataset; species toggle; never summed with black bear |

## 11. Testing

**Data pipeline:**
- `pytest` with fixture PDFs and fixture ArcGIS JSON in `tests/fixtures/`.
- Unit tests: schema assertions per extractor.
- Smoke test: full pipeline against fixtures → output JSON matches expected shape.

**Webapp:**
- No unit tests. Manual visual verification before v1 ship.
- Screenshot folder at `tests/screenshots/` for key viewport sizes (mobile portrait, tablet, desktop).

**CI:** optional GitHub Actions running `pytest` + `build_json.py --dry-run` on push. Not blocking v1.

## 12. Accessibility & responsive

- Mobile first column layout; map full-width; same content order.
- `prefers-reduced-motion` → animations off, charts at final state.
- Keyboard: Space = pause, ←/→ = step year.
- Semantic HTML for the written sections; `<figure>` + `<figcaption>` for charts.
- Alt text on static images; aria-live on animated counters.

## 13. Deployment

- GitHub Pages from `webapp/` directory of the repo.
- Manual deploy: merge to main → Pages auto-publishes.
- Custom domain: not required for v1.

## 14. License & attribution

- **Code:** MIT.
- **Data:** CC-BY 4.0 sources (Kumadas, Yamaguchi) plus public-domain government data (env.go.jp). Footer attribution block with links; full list in `research/data-sources.md`.
- **Dependencies:** D3 BSD, Leaflet BSD, Scrollama MIT — all compatible.

## 15. Known risks

| Risk | Likelihood | Mitigation |
|---|---:|---|
| env.go.jp PDF format changes mid-year | Medium | Shape assertions in extractor; fails loud |
| ArcGIS dashboard retired | Low | Cached `raw/` persists; badge in UI |
| Leaflet/D3 perf on mobile with 10k points | Medium | Cap visible dots at 200; cluster on zoom-out |
| Animation too fast/slow | Medium | Timings tunable via CSS custom properties |
| New data published after freeze | High (ongoing crisis) | Documented re-run procedure in README |

## 16. Success criteria

V1 is done when:

1. All six ArcGIS + Kumadas + Yamaguchi point sources land in `points-recent.json`.
2. env.go.jp PDFs extracted for FY2016–FY2025 injury, capture, sighting data.
3. Hero line chart animates as specified, holds on 2025.
4. Choropleth auto-plays 2016→2025 on scroll-into-view.
5. 2025 dot overlay appears on Tohoku zoom.
6. Human-cost counter section tweens correctly.
7. Why? section has written content drawing on Japan Times / Nippon.com / Britannica sources.
8. Deployed to GitHub Pages at a URL you can share.
9. `research/data-sources.md` lists every source with URL + license.
10. `README.md` documents how to re-run the pipeline.
