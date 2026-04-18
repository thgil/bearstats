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

# or individually
python fetch_env_go_jp.py
python extract_env_go_jp.py
python fetch_arcgis.py
python fetch_kumadas.py
python fetch_yamaguchi.py
python fetch_hokkaido.py
python build_json.py
```

Outputs four JSON files into `webapp/data/`.

## Tests

```bash
cd data-pipeline
pytest
```
