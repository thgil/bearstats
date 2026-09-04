"""Merge all raw data into the three webapp JSON files."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import pandas as pd

from utils import RAW_DIR, WEBAPP_DATA_DIR, ensure_dir, utc_now_iso

from datetime import date


def is_complete_fiscal_year(year: int, today: date | None = None) -> bool:
    """A Japanese fiscal year runs April 1 of `year` to March 31 of `year + 1`.

    The ministry publishes the running year as a year-to-date figure alongside
    closed years, so anything not yet past its March 31 end is provisional and
    must not be charted as if it were a full year.
    """
    today = today or date.today()
    return today > date(year + 1, 3, 31)

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

    all_years = set(years_injuries) | set(years_sightings) | set(years_captures)
    partial_years = sorted(y for y in all_years if not is_complete_fiscal_year(y))

    return {
        "years_injuries": years_injuries,
        "years_sightings": years_sightings,
        "years_captures": years_captures,
        # Fiscal years still in progress: published as year-to-date, not comparable
        # to the closed years beside them. Consumers should mark these provisional.
        "partial_years": partial_years,
        "metrics": {
            "sightings": [sight_by_year[y] for y in years_sightings],
            "injuries":  [inj_victims_by_year[y] for y in years_injuries],
            "deaths":    [inj_deaths_by_year[y] for y in years_injuries],
            "captures_total": [cap_total_by_year[y] for y in years_captures],
        },
        "_source_fetched_at": utc_now_iso(),
    }


# Fiscal months in reading order: a Japanese fiscal year runs April to March.
FISCAL_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
MONTH_NAMES = {
    1: "January", 2: "February", 3: "March", 4: "April", 5: "May", 6: "June",
    7: "July", 8: "August", 9: "September", 10: "October", 11: "November",
    12: "December",
}


def fiscal_window(through_month: int) -> list[int]:
    """Fiscal months from April through `through_month` inclusive."""
    return FISCAL_MONTHS[: FISCAL_MONTHS.index(through_month) + 1]


def build_ytd(
    sightings: pd.DataFrame,
    injuries_monthly: pd.DataFrame,
    injuries: pd.DataFrame,
    partial_year: int | None,
) -> dict:
    """Same-months comparisons for the fiscal year still in progress.

    A running year's total is only a few months deep, so charting it beside
    closed years makes a rising year look like a collapse. Here each metric is
    summed over the same window of months in every year, which is the only
    like-for-like reading available while a year is open.

    The window is per-metric because the ministry publishes each table to a
    different cut-off date.
    """
    out: dict[str, Any] = {}
    if partial_year is None:
        return out

    def series(label_months: list[int], per_year: dict[int, int]) -> dict:
        years = sorted(per_year)
        return {
            "through_month": label_months[-1],
            "label": f"{MONTH_NAMES[label_months[0]]}–{MONTH_NAMES[label_months[-1]]}",
            "months": label_months,
            "years": years,
            "values": [int(per_year[y]) for y in years],
        }

    # --- sightings: true monthly data for every year in the table ---
    if not sightings.empty and partial_year in set(sightings["year"]):
        cur = sightings[sightings["year"] == partial_year]
        reported = cur.groupby("month")["value"].sum()
        # Months the running year has actually reported. In season these run to
        # thousands, so an all-zero month means "not published yet", not "none".
        months = [m for m in FISCAL_MONTHS if reported.get(m, 0) > 0]
        if months:
            window = fiscal_window(months[-1])
            sums = (
                sightings[sightings["month"].isin(window)]
                .groupby("year")["value"].sum()
            )
            out["sightings"] = series(window, sums.to_dict())

    # --- injuries / deaths: monthly archive for closed years, plus the
    # running year's published year-to-date figure, which covers the same window ---
    through = None
    if not injuries.empty and "through_month" in injuries.columns:
        flagged = injuries[injuries["year"] == partial_year]["through_month"].dropna()
        if len(flagged):
            through = int(flagged.iloc[0])

    if through is not None and not injuries_monthly.empty:
        window = fiscal_window(through)
        past = injuries_monthly[injuries_monthly["month"].isin(window)]
        cur_totals = injuries[injuries["year"] == partial_year]
        for metric, col in (("injuries", "victims"), ("deaths", "deaths")):
            per_year = past.groupby("year")[col].sum().to_dict()
            per_year[partial_year] = cur_totals[col].sum()
            out[metric] = series(window, per_year)

    return out


def build_monthly(sightings: pd.DataFrame) -> dict:
    """Per-month national sightings for each fiscal year, in fiscal order.

    Feeds the pace chart: each year accumulating from April, so a year still
    running can be read against where the closed years stood on the same date.
    Only sightings carry month detail for the current year — the injury and
    capture tables publish the running year as a single to-date total.
    """
    if sightings.empty:
        return {}
    by_year_month = sightings.groupby(["year", "month"])["value"].sum()
    out: dict[str, list[int]] = {}
    for year in sorted(sightings["year"].unique()):
        row = []
        for month in FISCAL_MONTHS:
            row.append(int(by_year_month.get((year, month), 0)))
        # Trim the tail of a year that has not reported every month yet, so the
        # line stops where the data stops instead of diving to zero.
        while row and row[-1] == 0:
            row.pop()
        out[str(int(year))] = row
    return {"months": FISCAL_MONTHS, "sightings": out}


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
    injuries_monthly = _load_csv(ENV_RAW / "injuries_monthly.csv")
    sightings = _load_csv(ENV_RAW / "sightings.csv")
    captures = _load_csv(ENV_RAW / "captures.csv")

    national = build_national_timeline(sightings, injuries, captures)
    partial = national["partial_years"][-1] if national["partial_years"] else None
    national["ytd"] = build_ytd(sightings, injuries_monthly, injuries, partial)
    national["monthly"] = build_monthly(sightings)
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
