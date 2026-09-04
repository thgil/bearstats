# Bearstats

Data-journalism web app about Japan's 2025 bear crisis.

See `docs/superpowers/specs/2026-04-18-bearstats-design.md` for the design.

## Project layout

- `data-pipeline/` — Python scripts that fetch and normalize sources → `webapp/data/*.json`
- `webapp/` — static single-page site that consumes those JSON files (built in a later phase)
- `research/` — written notes and source catalog

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
```

Outputs four JSON files into `webapp/data/`.

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
