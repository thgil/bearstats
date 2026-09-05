# Bearstats

Data-journalism web app about Japan's 2025 bear crisis.

See `docs/superpowers/specs/2026-04-18-bearstats-design.md` for the design.

## Project layout

- `data-pipeline/` — Python scripts that fetch and normalize sources → `webapp/data/*.json`
- `webapp/` — static scrollytelling site that consumes those JSON files (no build step)
- `webapp/render.html` + `tools/render-video.mjs` — headless frame renderer for the X videos in `media/`
- `research/` — written notes and source catalog

## Webapp

Three chapters, each a question with a one-line answer, each driven by a pinned
graphic that the text steps control (`webapp/director.js` maps `data-step` ids
to graphic actions). Design: `docs/superpowers/specs/2026-09-05-scrolly-redesign-design.md`.

```bash
cd webapp && python3 -m http.server 8000   # then open http://localhost:8000/
webapp/tests/run-tests.sh                   # node --test, pure helpers only
cd tools && npm install && node review-shots.mjs   # screenshots every scroll step at six viewports,
                                                   # fails on overlap, empty charts, low contrast
```

Nothing is deployed without a clean `review-shots` run and a human read of
`media/review/*/` (see `docs/GOAL.md`, definition of done). Research behind
the claims on the page: `docs/GOAL.md`, `docs/research/stats-and-claims.md`,
`docs/research/gaps.md`; extracted primary data under `data-pipeline/research/`.

Deploys to GitHub Pages on push to `main` (`.github/workflows/pages.yml`) and,
by hand, to Cloudflare Pages:

```bash
npx wrangler pages deploy webapp --project-name bearstats
```

## Running the pipeline

```bash
cd data-pipeline
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# one-shot, fetches all sources (slow on first run — downloads ~10 PDFs + ArcGIS dumps)
python fetch_all.py

# or individually, in this order
python fetch_env_go_jp.py
python extract_env_go_jp.py
python fetch_arcgis.py
python fetch_hokkaido.py
python fetch_geojson.py
python build_json.py
python fetch_recent.py
python build_context.py
```

Outputs five JSON files into `webapp/data/`.

### Context data (`build_context.py` → `webapp/data/context.json`)

The ministry's live tables only reach back five fiscal years. The longer and
wider series the page needs to say whether the problem is getting worse live as
CSVs under `data-pipeline/research/` (tracked in git, one `source_url` and
`publish_date` per row): monthly national sightings FY2013 onward from four
editions of `syutubotu.pdf`, prefecture-by-month sightings, monthly victims and
deaths FY2014 onward, the Tohoku Regional Forest Office beech index FY2012 to
FY2026 plus the Akita, Miyagi, Toyama, Niigata and MoE mast tables,
hunting-licence holders 1975 to 2021, the draft guideline's population table,
and JMA summer weather. `build_context.py` merges them into one file; the
extractor next to each CSV (and the README beside it) says which PDF it came
from and how it was read. Those extractors are run by hand when a source
publishes, not by `fetch_all.py`.

### Prefectural recent data (`fetch_recent.py` → `context.recent`)

The ministry's own `syutubotu.pdf` runs a few weeks behind; several
prefectures publish their own tallies sooner. `fetch_recent.py` downloads
Akita's クマダス point-level CSV (CC BY 4.0, updated daily), and one-page
monthly PDFs scraped off Iwate's and Miyagi's own bear pages, into
`data-pipeline/raw/research/recent/`, then extracts them into tracked CSVs
under `data-pipeline/research/recent/` and prints cross-checks against the
ministry's prefecture-by-month CSV (exact match for Akita's closed FY2025,
within 1% for the still-running FY2026). `build_context.py` folds those CSVs,
plus the four smaller ArcGIS-point prefectures already in
`webapp/data/points-recent.json`, into `context.recent`: FY2025 always comes
from the ministry's own table, FY2026 always from the prefectural source
(the ministry hasn't published it yet). Iwate switched to counting sightings
through its "Bears" app in April 2026, so its FY2026 series is marked
`comparable: false`. A failed prefectural download is non-fatal — `fetch_all.py`
keeps going, and `build_context.py` falls back to whatever CSV is already
tracked in git, warning rather than failing the build.

### A note on the ministry's PDFs

env.go.jp reshapes these tables between publications — it has already switched
the injury file from a month-by-month snapshot of the current year to a
cumulative by-fiscal-year table, and it appends a new year each spring. The
parsers therefore read each file's year coverage from its own column headers
rather than hardcoding it. Totals are cross-checked against the 計 row the PDFs
print themselves; see `tests/test_extract_env_go_jp.py`.

The running fiscal year is published as a year-to-date figure. `build_json.py`
flags it in `partial_years` and builds a `ytd` block that cuts every year to the
same months, which is the only fair way to compare a year still in progress.

## Tests

```bash
cd data-pipeline
pytest
```
