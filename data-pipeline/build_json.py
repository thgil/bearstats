"""Merge all raw data into the three webapp JSON files."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import pandas as pd

from utils import RAW_DIR, WEBAPP_DATA_DIR, ensure_dir, utc_now_iso

ENV_RAW = RAW_DIR / "env"
ARCGIS_RAW = RAW_DIR / "arcgis"
HOK_RAW = RAW_DIR / "hokkaido"


def build_national_timeline(
    sightings: pd.DataFrame, injuries: pd.DataFrame, captures: pd.DataFrame
) -> dict:
    """Yearly national totals.

    - sightings['value'] summed by year
    - injuries['victims'] summed by year
    - injuries['deaths'] summed by year
    - captures['total'] summed by year
    """
    def yearly_sum(df: pd.DataFrame, col: str) -> dict[int, int]:
        if df.empty or col not in df.columns:
            return {}
        return {int(y): int(v) for y, v in df.groupby("year")[col].sum().items()}

    sight_by_year = yearly_sum(sightings, "value")
    inj_victims_by_year = yearly_sum(injuries, "victims")
    inj_deaths_by_year = yearly_sum(injuries, "deaths")
    cap_total_by_year = yearly_sum(captures, "total")

    years_injuries = sorted(inj_victims_by_year.keys())
    years_sightings = sorted(sight_by_year.keys())
    years_captures = sorted(cap_total_by_year.keys())

    return {
        "years_injuries": years_injuries,
        "years_sightings": years_sightings,
        "years_captures": years_captures,
        "metrics": {
            "sightings": [sight_by_year[y] for y in years_sightings],
            "injuries":  [inj_victims_by_year[y] for y in years_injuries],
            "deaths":    [inj_deaths_by_year[y] for y in years_injuries],
            "captures_total": [cap_total_by_year[y] for y in years_captures],
        },
        "_source_fetched_at": utc_now_iso(),
    }


def build_prefecture_totals(
    sightings: pd.DataFrame, injuries: pd.DataFrame, captures: pd.DataFrame
) -> dict:
    """Per-year per-prefecture totals, three metrics."""
    def pivot(df: pd.DataFrame, value_col: str) -> dict[str, dict[str, int]]:
        if df.empty or value_col not in df.columns:
            return {}
        out: dict[str, dict[str, int]] = {}
        grouped = df.groupby(["year", "prefecture_key"])[value_col].sum().to_dict()
        for (year, pref), val in grouped.items():
            out.setdefault(str(int(year)), {})[pref] = int(val)
        return out

    return {
        "metrics": {
            "sightings": pivot(sightings, "value"),
            "injuries":  pivot(injuries, "victims"),
            "deaths":    pivot(injuries, "deaths"),
            "captures_total": pivot(captures, "total"),
        },
        "_source_fetched_at": utc_now_iso(),
    }


def build_points_recent(record_lists: list[list[dict]]) -> list[dict]:
    """Flatten record lists; drop coords-less records; sort by date desc for determinism."""
    merged: list[dict] = []
    for group in record_lists:
        merged.extend(group)
    merged = [r for r in merged if r.get("lat") is not None and r.get("lon") is not None]
    merged.sort(key=lambda r: r.get("date") or "", reverse=True)
    return merged


def _load_arcgis() -> list[dict]:
    """Parse ArcGIS GeoJSON files through fetch_arcgis.parse_feature."""
    from fetch_arcgis import SOURCES, parse_feature

    records: list[dict] = []
    for src in SOURCES:
        p = ARCGIS_RAW / f"{src['key']}.geojson"
        if not p.exists():
            print(f"  [warn] missing {p.name}", file=sys.stderr)
            continue
        fc = json.loads(p.read_text(encoding="utf-8"))
        for feat in fc.get("features", []):
            records.append(parse_feature(feat, pref_key=src["key"]))
    return records


def _load_json_list(path: Path) -> list[dict]:
    if not path.exists():
        print(f"  [warn] missing {path}", file=sys.stderr)
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _load_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        print(f"  [warn] missing {path}; returning empty DataFrame", file=sys.stderr)
        return pd.DataFrame()
    return pd.read_csv(path)


def main() -> int:
    ensure_dir(WEBAPP_DATA_DIR)

    injuries = _load_csv(ENV_RAW / "injuries.csv")
    sightings = _load_csv(ENV_RAW / "sightings.csv")
    captures = _load_csv(ENV_RAW / "captures.csv")

    national = build_national_timeline(sightings, injuries, captures)
    out_nat = WEBAPP_DATA_DIR / "national-timeline.json"
    out_nat.write_text(json.dumps(national, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[wrote] {out_nat.relative_to(WEBAPP_DATA_DIR.parent.parent)}")

    pref_totals = build_prefecture_totals(sightings, injuries, captures)
    out_pref = WEBAPP_DATA_DIR / "prefecture-totals.json"
    out_pref.write_text(json.dumps(pref_totals, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[wrote] {out_pref.relative_to(WEBAPP_DATA_DIR.parent.parent)}")

    arcgis_records = _load_arcgis()
    hokkaido_records = _load_json_list(HOK_RAW / "higuma.json")
    # Kumadas + Yamaguchi deferred — we note empty contributions.
    points = build_points_recent([arcgis_records, hokkaido_records])
    out_pts = WEBAPP_DATA_DIR / "points-recent.json"
    out_pts.write_text(json.dumps(points, ensure_ascii=False), encoding="utf-8")
    print(f"[wrote] {out_pts.relative_to(WEBAPP_DATA_DIR.parent.parent)} "
          f"({len(points):,} records)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
