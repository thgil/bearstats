"""Merge the research CSVs into webapp/data/context.json.

build_json.py covers the ministry's live tables (five fiscal years of sightings,
injuries, captures). This file adds the longer and wider context the page needs
to say whether the problem is getting worse: thirteen years of monthly
sightings, mast-survey indices from the forest office and four prefectures,
hunting-licence counts since 1975, population estimates, and summer weather.

Every value comes from a CSV under data-pipeline/research/ (each of which
carries a source_url and publish_date per row) or from raw/env/. Nothing is
typed in here except the source catalogue at the bottom.
"""
from __future__ import annotations

import calendar
import json
import sys
from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd

from build_json import FISCAL_MONTHS, is_complete_fiscal_year
from extract_env_go_jp import PDF_TO_LONG_NAME, PREFECTURE_KEYS, PREFECTURE_ORDER_JA
from utils import RAW_DIR, REPO_ROOT, WEBAPP_DATA_DIR, ensure_dir, utc_now_iso

RESEARCH = REPO_ROOT / "data-pipeline" / "research"
ENV_RAW = RAW_DIR / "env"
RECENT_DIR = RESEARCH / "recent"

# Romaji keys are the ones prefecture-totals.json already uses, so the webapp
# can join on them. The research CSVs name prefectures three ways (青森, 青森県,
# Aomori); all three map onto the same key.
_KEY_BY_LONG = dict(zip(PREFECTURE_ORDER_JA, PREFECTURE_KEYS))
PREF_KEY: dict[str, str] = {}
for _short, _long in PDF_TO_LONG_NAME.items():
    PREF_KEY[_short] = PREF_KEY[_long] = _KEY_BY_LONG[_long]
for _k in PREFECTURE_KEYS:
    PREF_KEY[_k.capitalize()] = _k

# The MoE mast table treats 皆無 as 大凶作 and 不作 as 凶作; Miyagi's chart prints
# the pre-2017 label as 皆無(=大凶作). One normalised set of four for charting.
CATEGORY_NORMALISED = {
    "皆無": "大凶作", "皆無(=大凶作)": "大凶作", "大凶作": "大凶作",
    "凶作": "凶作", "不作": "凶作",
    "並作": "並作",
    "豊作": "豊作",
}


def _num(v: Any) -> int | float | None:
    """NaN-safe scalar: pandas gives float NaN for blank cells, JSON wants null."""
    if v is None or (isinstance(v, float) and v != v):
        return None
    if isinstance(v, str):
        v = v.strip().replace(",", "")
        if v in ("", "－", "-", "―"):
            return None
        v = float(v)
    if float(v).is_integer():
        return int(v)
    return float(v)


def _str(v: Any) -> str | None:
    if v is None or (isinstance(v, float) and v != v):
        return None
    s = str(v).strip()
    return s or None


def _month_row(values: list[Any], year: int) -> list[int | None]:
    """Twelve fiscal months, null where the source printed nothing.

    A running year's unreported months are stored as 0 in some CSVs; those are
    trimmed to null so a chart stops where the data stops instead of diving.
    """
    row = [_num(v) for v in values]
    if not is_complete_fiscal_year(year):
        last = len(row)
        while last > 0 and not row[last - 1]:
            last -= 1
        row = row[:last] + [None] * (len(row) - last)
    return row


def build_monthly_national(df: pd.DataFrame) -> dict:
    """National sightings by fiscal month, FY2013 onward (four syutubotu editions)."""
    cols = [f"m{m:02d}" for m in FISCAL_MONTHS]
    out: dict[str, list] = {}
    for _, r in df.sort_values("fy").iterrows():
        fy = int(r["fy"])
        out[str(fy)] = _month_row([r[c] for c in cols], fy)
    return {"years": [int(y) for y in sorted(df["fy"])], "months": FISCAL_MONTHS, "sightings": out}


def build_prefecture_month(df: pd.DataFrame) -> dict:
    """Per-prefecture monthly sightings. Blank cells stay null: the ministry leaves
    a cell empty both for zero and for not-yet-reported, and the file cannot tell
    them apart, so consumers should sum the annual 合計 column for totals."""
    cols = [f"{m}月" for m in FISCAL_MONTHS]
    df = df[df["prefecture"] != "計"]
    prefs = [PREF_KEY[p] for p in df["prefecture"].unique()]
    years = sorted(int(y) for y in df["fiscal_year"].unique())
    sightings: dict[str, dict[str, list]] = {}
    totals: dict[str, dict[str, int | None]] = {}
    # The 2016 edition lists 37 prefectures (no 北海道, no 千葉), later ones 39,
    # so start every year with a null row per prefecture and fill what exists.
    for fy in years:
        sightings[str(fy)] = {p: [None] * 12 for p in prefs}
        totals[str(fy)] = {p: None for p in prefs}
    for _, r in df.iterrows():
        fy, key = str(int(r["fiscal_year"])), PREF_KEY[r["prefecture"]]
        sightings[fy][key] = _month_row([r[c] for c in cols], int(fy))
        totals[fy][key] = _num(r["合計"])
    return {"years": years, "months": FISCAL_MONTHS, "prefectures": sorted(prefs),
            "sightings": sightings, "totals": totals}


def build_casualties_monthly(df: pd.DataFrame) -> dict:
    """Victims and deaths by fiscal month. The running year only has rows for the
    months the ministry has closed, so later months are null, not zero."""
    years = sorted(int(y) for y in df["fiscal_year"].unique())
    out: dict[str, dict[str, list]] = {"injured": {}, "killed": {}, "incidents": {}}
    for fy in years:
        sub = df[df["fiscal_year"] == fy].set_index("month")
        for metric in out:
            out[metric][str(fy)] = [_num(sub[metric].get(m)) if m in sub.index else None
                                    for m in FISCAL_MONTHS]
    return {"years": years, "months": FISCAL_MONTHS, **out}


def build_tohoku_office(forecast: pd.DataFrame, actual: pd.DataFrame) -> list[dict]:
    """One row per prefecture-year: the July forecast and the autumn result side by
    side. The current year has a forecast only until the office reports in November."""
    act = {(int(r.fiscal_year), r.prefecture): r for r in actual.itertuples()}
    rows = []
    for r in forecast.sort_values(["fiscal_year", "prefecture"]).itertuples():
        fy = int(r.fiscal_year)
        a = act.get((fy, r.prefecture))
        rows.append({
            "fy": fy,
            "pref": PREF_KEY[r.prefecture],
            "index": _num(a.mast_index) if a is not None else None,
            "category": _str(a.actual_category) if a is not None else None,
            "category_normalised": CATEGORY_NORMALISED.get(a.actual_category) if a is not None else None,
            "points": _num(a.points_total) if a is not None else None,
            "actual_date": _str(a.publish_date) if a is not None else None,
            "actual_url": _str(a.source_url) if a is not None else None,
            "forecast_index": _num(r.mast_index),
            "forecast_category": _str(r.forecast_category),
            "forecast_category_normalised": CATEGORY_NORMALISED.get(r.forecast_category),
            "forecast_points": _num(r.points_total),
            "forecast_date": _str(r.publish_date),
            "forecast_url": _str(r.source_url),
        })
    return rows


AKITA_KUMADAS_URL = "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003"
IWATE_LANDING_URL = "https://www.pref.iwate.jp/kurashikankyou/shizen/yasei/1049881/1056087.html"
MIYAGI_LANDING_URL = "https://www.pref.miyagi.jp/soshiki/sizenhogo/r8kumamokugeki.html"

IWATE_FY2026_NOTE = (
    "Iwate changed to counting through the Bears app in April 2026; the "
    "prefecture says FY2026 differs in nature from earlier years."
)

# The four prefectures whose ArcGIS point feeds (webapp/data/points-recent.json)
# also run ahead of the ministry's table, bundled as one line since no single
# one of them is large enough on its own to be worth a dedicated series.
SAMPLE4_PREFS = ["toyama", "niigata", "gunma", "saitama"]


def _moe_fy_months(moe_df: pd.DataFrame, pref_ja: str, fy: int) -> list[int | float | None]:
    """Twelve fiscal-month values for one prefecture-year from the ministry's
    prefecture-by-month CSV, or twelve nulls if that prefecture-year isn't in it."""
    if moe_df.empty:
        return [None] * 12
    cols = [f"{m}月" for m in FISCAL_MONTHS]
    sub = moe_df[(moe_df["prefecture"] == pref_ja) & (moe_df["fiscal_year"] == fy)]
    if sub.empty:
        return [None] * 12
    r = sub.iloc[0]
    return [_num(r[c]) for c in cols]


def _fy2026_array(by_month: dict[int, Any], as_of: date | None) -> tuple[list[int | None], bool, str | None]:
    """Twelve fiscal-month values for the running year, truncated at the month
    `as_of` falls in (later months stay null even if the source prints a 0
    placeholder for them, e.g. Miyagi's table already has a zeroed-out row for
    every month through March). `partial_month` is true unless `as_of` lands on
    the last calendar day of its month, i.e. the final included month may not
    yet be fully reported."""
    if as_of is None:
        return [None] * 12, True, None
    cutoff = FISCAL_MONTHS.index(as_of.month)
    arr = [_num(by_month.get(m)) for m in FISCAL_MONTHS[: cutoff + 1]] + [None] * (11 - cutoff)
    partial = calendar.monthrange(as_of.year, as_of.month)[1] != as_of.day
    return arr, partial, as_of.isoformat()


def _prefecture_recent_series(key: str, label: str, source: str, url: str, comparable: bool,
                              note: str | None, moe_pref_ja: str, moe_df: pd.DataFrame,
                              monthly_df: pd.DataFrame, count_col: str) -> dict:
    fy2025 = _moe_fy_months(moe_df, moe_pref_ja, 2025)
    fy26 = monthly_df[monthly_df["fiscal_year"] == 2026] if not monthly_df.empty else monthly_df
    as_of = date.fromisoformat(str(fy26["as_of"].iloc[0])) if len(fy26) else None
    by_month = dict(zip(fy26["month"], fy26[count_col])) if len(fy26) else {}
    fy2026, partial_month, as_of_str = _fy2026_array(by_month, as_of)
    return {
        "key": key, "label": label, "source": source, "url": url,
        "as_of": as_of_str, "comparable": comparable, "note": note,
        "partial_month": partial_month,
        "fy2025": fy2025, "fy2026": fy2026,
    }


def build_sample4_series(points: list[dict]) -> dict:
    """The four smaller ArcGIS prefectures (webapp/data/points-recent.json),
    bundled into one line: monthly point counts, fiscal years 2025 and 2026."""
    counts: dict[tuple[int, int], int] = {}
    max_date: date | None = None
    for p in points:
        if p.get("pref") not in SAMPLE4_PREFS or not p.get("date"):
            continue
        d = date.fromisoformat(p["date"])
        fy = d.year if d.month >= 4 else d.year - 1
        counts[(fy, d.month)] = counts.get((fy, d.month), 0) + 1
        if max_date is None or d > max_date:
            max_date = d

    def months_for(fy: int) -> dict[int, int | None]:
        if not any(k[0] == fy for k in counts):
            return {m: None for m in FISCAL_MONTHS}
        return {m: counts.get((fy, m), 0) for m in FISCAL_MONTHS}

    fy2025 = [_num(v) for v in months_for(2025).values()]
    fy2026, partial_month, as_of_str = _fy2026_array(months_for(2026), max_date)
    return {
        "key": "sample4", "label": "Toyama, Niigata, Gunma and Saitama",
        "source": "Prefectural ArcGIS open data (point reports)", "url": "",
        "as_of": as_of_str, "comparable": True,
        "partial_month": partial_month,
        "fy2025": fy2025, "fy2026": fy2026,
    }


def _month_is_complete(as_of: date | None, month: int) -> bool:
    """A FY2026 month counts as fully reported when the source's as_of date is
    on or after the month's last calendar day."""
    if as_of is None:
        return False
    year = 2026 if month >= 4 else 2027
    return as_of >= date(year, month, calendar.monthrange(year, month)[1])


def _moe_fy2026_published_months(moe_df: pd.DataFrame) -> set[int]:
    """Months the ministry's FY2026 table already has a value for in at least one
    prefecture row (the 計 row prints 0 for unpublished months, so it is no use)."""
    if moe_df.empty:
        return set()
    sub = moe_df[(moe_df["fiscal_year"] == 2026) & (moe_df["prefecture"] != "計")]
    return {m for m in FISCAL_MONTHS if sub[f"{m}月"].notna().any()}


def build_prefectures_fy2026(moe_df: pd.DataFrame, pref_df: pd.DataFrame) -> tuple[list[dict], dict]:
    """The wider prefectural compilation (research/recent/prefectures_fy2026.csv,
    one row per prefecture per fiscal month, FY2026 only) and a coverage-weighted
    national preliminary built from it.

    `prefectures`: one record per prefecture in the CSV, with its twelve FY2026
    values (null where the source printed nothing or the month is past as_of) and
    the ministry's FY2025 row for the same prefecture.

    `national_preliminary`: keyed by fiscal month (as a string), for every month
    the ministry's own FY2026 table has not yet published. Each entry sums, over
    the comparable prefectures whose as_of is on or after that month's end, the
    FY2026 count and the ministry's FY2025 count for the same month; `ratio` is
    FY2026/FY2025 and `coverage_share_fy2025` is those prefectures' share of the
    ministry's FY2025 national total for that month (sum of the prefecture rows,
    計 excluded). Not-comparable prefectures (Iwate's method change, Gifu's
    sightings-only cumulative) and incomplete months (e.g. Fukushima's July,
    published through 15 July) are left out.
    """
    if pref_df.empty:
        return [], {}
    prefectures: list[dict] = []
    per_pref: dict[str, dict] = {}
    for key, g in pref_df.groupby("pref", sort=False):
        first = g.iloc[0]
        by_month = {int(r.month): _num(r.count) for r in g.itertuples()}
        as_of_s = _str(first["as_of"])
        as_of = date.fromisoformat(as_of_s) if as_of_s else None
        pref_ja = str(first["pref_ja"])
        rec = {
            "pref": key,
            "label": key.capitalize(),
            "pref_ja": pref_ja,
            "as_of": as_of_s,
            "comparable": bool(first["comparable"]),
            "source_url": _str(first["source_url"]),
            "source_title": _str(first["source_title"]),
            "format": _str(first["format"]),
            "method_note": _str(first["method_note"]),
            "fy2026": [by_month.get(m) for m in FISCAL_MONTHS],
            "fy2025": _moe_fy_months(moe_df, pref_ja, 2025),
        }
        prefectures.append(rec)
        per_pref[key] = {**rec, "as_of_date": as_of}

    national_fy2025 = {m: None for m in FISCAL_MONTHS}
    if not moe_df.empty:
        sub = moe_df[(moe_df["fiscal_year"] == 2025) & (moe_df["prefecture"] != "計")]
        national_fy2025 = {m: _num(sub[f"{m}月"].sum()) for m in FISCAL_MONTHS}

    published = _moe_fy2026_published_months(moe_df)
    preliminary: dict[str, dict] = {}
    for m in FISCAL_MONTHS:
        if m in published:
            continue
        i = FISCAL_MONTHS.index(m)
        used = [p for p in per_pref.values()
                if p["comparable"] and p["fy2026"][i] is not None and p["fy2025"][i] is not None
                and _month_is_complete(p["as_of_date"], m)]
        if not used:
            continue
        sum_2026 = sum(p["fy2026"][i] for p in used)
        sum_2025 = sum(p["fy2025"][i] for p in used)
        nat = national_fy2025[m]
        preliminary[str(m)] = {
            "prefectures": [p["pref"] for p in used],
            "coverage_share_fy2025": round(sum_2025 / nat, 4) if nat else None,
            "national_fy2025": nat,
            "sum_2026": sum_2026,
            "sum_2025": sum_2025,
            "ratio": round(sum_2026 / sum_2025, 4) if sum_2025 else None,
        }
    return prefectures, preliminary


def build_recent(moe_df: pd.DataFrame, akita_df: pd.DataFrame, iwate_df: pd.DataFrame,
                 miyagi_df: pd.DataFrame, points: list[dict],
                 prefectures_df: pd.DataFrame | None = None) -> dict:
    """Prefecture-published counts that run ahead of the ministry's own table:
    Akita's クマダス point feed, and one-page monthly PDFs from Iwate and Miyagi,
    plus a bundle of the four smaller ArcGIS-point prefectures, and (under
    `prefectures` / `national_preliminary`) the wider one-row-per-month
    compilation in research/recent/prefectures_fy2026.csv. FY2025 always
    comes from the ministry's own CSV (the point of the FY2025 numbers here is
    to show the prefectural source agrees with it); FY2026 always comes from
    the prefectural source, since the ministry hasn't published it yet.

    If a prefectural download failed, fetch_recent.py leaves the tracked CSV
    under research/recent/ untouched from its last successful run (or, on a
    fresh checkout with no raw cache, extraction never ran and the CSV is
    whatever is committed to git) — `_csv()` already warns on a missing file
    and returns an empty frame, so a series simply comes back all-null rather
    than failing the whole build.
    """
    akita = _prefecture_recent_series(
        "akita", "Akita", "Akita Prefecture クマダス open data (CC BY 4.0)", AKITA_KUMADAS_URL,
        True, "Same count as the ministry's table: FY2025 total 13,592 in both.",
        "秋田", moe_df, akita_df, "bear_reports")
    miyagi = _prefecture_recent_series(
        "miyagi", "Miyagi", "Miyagi Prefecture 令和8年度クマ目撃等情報", MIYAGI_LANDING_URL,
        True, "Same series as the ministry's table for FY2025 (3,559 total); this "
              "prefecture tally is usually published before the ministry's own monthly update.",
        "宮城", moe_df, miyagi_df, "count")
    iwate = _prefecture_recent_series(
        "iwate", "Iwate", "Iwate Prefecture ツキノワグマ出没状況", IWATE_LANDING_URL,
        False, IWATE_FY2026_NOTE, "岩手", moe_df, iwate_df, "count")
    sample4 = build_sample4_series(points)
    prefectures, preliminary = build_prefectures_fy2026(
        moe_df, prefectures_df if prefectures_df is not None else pd.DataFrame())
    return {"built_at": utc_now_iso(), "series": [akita, miyagi, iwate, sample4],
            "prefectures": prefectures, "national_preliminary": preliminary}


AKITA_SITES = ["hachimori", "moriyoshizan", "tazawako", "higashinaruse", "chokai"]
AKITA_SYMBOL = {"○": "○", "〇": "○", "△": "△", "x": "×", "×": "×", "-": "－", "－": "－"}


def build_akita_sites(results: pd.DataFrame, forecast: pd.DataFrame) -> list[dict]:
    """Akita's five beech sites, 2002 to 2025, plus the prefecture's forecast for
    2026. The prefecture prints a symbol per site and no prefecture-wide grade,
    so `score` is our count of ○ sites and `category` stays null."""
    def row(year: int, symbols: list[str], src: pd.Series, is_forecast: bool) -> dict:
        surveyed = [s for s in symbols if s != "－"]
        return {
            "year": year,
            "score": sum(s == "○" for s in surveyed),
            "n_surveyed": len(surveyed),
            "sites": symbols,
            "category": None,
            "forecast": is_forecast,
            "source_url": src["source_url"],
            "publish_date": src["publish_date"],
        }

    rows = [row(int(r["year"]), [AKITA_SYMBOL[str(r[s]).strip()] for s in AKITA_SITES], r, False)
            for _, r in results.sort_values("year").iterrows()]
    fc = forecast.set_index("site")
    # forecast cells read "○ (豊作)"; keep the symbol, the word is the same grade
    symbols = [AKITA_SYMBOL[str(fc.loc[s, "forecast_2026"]).strip()[0]] for s in AKITA_SITES]
    rows.append(row(2026, symbols, fc.iloc[0], True))
    return rows


def build_miyagi(df: pd.DataFrame) -> list[dict]:
    return [{
        "year": int(r["year"]),
        "category": CATEGORY_NORMALISED.get(str(r["buna_tohoku_forest_office"]).strip()),
        "printed": _str(r["buna_tohoku_forest_office"]),
        "buna_miyagi": _str(r["buna_miyagi_survey"]),
        "mizunara_miyagi": _str(r["mizunara_miyagi_survey"]),
    } for _, r in df.sort_values("year").iterrows()]


def build_toyama(df: pd.DataFrame) -> list[dict]:
    """Prefecture-wide grade per species. Toyama uses four grades with 不作 between
    並作 and 凶作; `*_normalised` folds 不作 into 凶作 the way the MoE table does."""
    pref = df[df["region"] == "prefecture"]
    rows = []
    for year, g in pref.groupby("year"):
        by_sp = {r.species: r for r in g.itertuples()}
        rec: dict[str, Any] = {"year": int(year)}
        for sp in ("buna", "mizunara", "konara"):
            r = by_sp.get(sp)
            rec[sp] = _str(r.category) if r is not None else None
            rec[f"{sp}_normalised"] = CATEGORY_NORMALISED.get(r.category) if r is not None else None
        first = g.iloc[0]
        rec["source_url"] = first["source_url"]
        rec["publish_date"] = first["publish_date"]
        rec["note"] = _str(first["note"]) if "retrospective" in str(first["note"]) else None
        rows.append(rec)
    return rows


def build_moe_table(df: pd.DataFrame) -> list[dict]:
    """MoE's national fruiting table, one row per prefecture-year. `category` is
    the four-bucket normalisation the extractor applied using MoE's own footnote
    rule; `*_text` is the cell as printed."""
    fr = df[(df["survey_type"] == "fruiting")]
    rows = []
    for (fy, pref_en), g in fr.groupby(["fiscal_year", "prefecture_en"], sort=True):
        by_sp = {r.species_en: r for r in g.itertuples()}
        rec: dict[str, Any] = {"fy": int(fy), "pref": PREF_KEY[pref_en]}
        for sp in ("buna", "mizunara", "konara"):
            r = by_sp.get(sp)
            rec[sp] = _str(r.category) if r is not None else None
            rec[f"{sp}_text"] = _str(r.text_clean) if r is not None and r.status == "value" else None
        first = g.iloc[0]
        rec["source_url"] = first["source_url"]
        rec["publish_date"] = first["publish_date"]
        rows.append(rec)
    return rows


def build_forecast_2026(tohoku: list[dict], niigata: pd.DataFrame, toyama: list[dict],
                        akita: list[dict]) -> dict:
    """The 'risk for the autumn ahead' panel: every 2026 forecast on file, each
    with the release it came from."""
    fc26 = [r for r in tohoku if r["fy"] == 2026 and r["forecast_index"] is not None]
    fc25 = [r for r in tohoku if r["fy"] == 2025 and r["forecast_index"] is not None]
    mean = lambda rows: round(sum(r["forecast_index"] for r in rows) / len(rows), 2) if rows else None

    regions = niigata[niigata["region"] != "全体"]
    good = regions[regions["forecast"] == "豊作"]
    overall = niigata[niigata["region"] == "全体"].iloc[0] if len(niigata) else None

    ty = next((r for r in toyama if r["year"] == 2026), None)
    ak = next((r for r in akita if r["year"] == 2026), None)

    sources = []
    if fc26:
        sources.append({"name": "東北森林管理局 令和8年度ブナ開花状況と結実予測", "url": fc26[0]["forecast_url"], "date": fc26[0]["forecast_date"]})
    if overall is not None:
        sources.append({"name": "新潟県 令和8年度堅果類の豊凶状況調査結果（速報）", "url": overall["source_url"], "date": overall["publish_date"]})
    if ty:
        sources.append({"name": "富山県 令和8年度堅果類（ドングリ）の豊凶調査結果", "url": ty["source_url"], "date": ty["publish_date"]})
    if ak:
        sources.append({"name": "秋田県 ブナ豊凶予報2026", "url": ak["source_url"], "date": ak["publish_date"]})

    return {
        "tohoku_office_mean": mean(fc26),
        "tohoku_office_same_date_2025": mean(fc25),
        "tohoku_office_by_pref": {r["pref"]: r["forecast_index"] for r in fc26},
        "niigata": (f"{overall['forecast']} prefecture-wide and in {len(good)} of {len(regions)} regions "
                    f"({int(overall['survey_points'])} points, {overall['survey_period']})") if overall is not None else None,
        "toyama": f"ブナ {ty['buna']}, ミズナラ {ty['mizunara']}, コナラ {ty['konara']}" if ty else None,
        "akita_sites": (f"○ at {ak['score']} of {ak['n_surveyed']} sites"
                        + (f", △ at {ak['sites'].count('△')}" if ak["sites"].count("△") else "")) if ak else None,
        "sources": sources,
    }


def build_licences(df: pd.DataFrame) -> list[dict]:
    return [{
        "year": int(r["year"]),
        "total": _num(r["total"]),
        "gun1": _num(r["gun1"]),
        "gun2": _num(r["gun2"]),
        "net": _num(r["net"]),
        "trap": _num(r["trap"]),
        "net_trap_combined": _num(r["net_trap_combined"]),
        "age60plus": _num(r["age60plus"]),
        "source_url": r["source_url"],
        "publish_date": r["publish_date"],
    } for _, r in df.sort_values("year").iterrows()]


POPULATION_UNIT_NOTE = (
    "Individuals (estimated), MoE draft guideline FY2026 table Ⅱ-２. Each column is a "
    "separate survey with its own method, so the table's own footnote ※2 says estimates "
    "cannot simply be compared across years. Regional rows (Kitakinki, Higashi Chugoku, ...) "
    "cover management units that overlap the prefecture rows; do not sum them."
)


def build_population(df: pd.DataFrame) -> list[dict]:
    rows = []
    for _, r in df.iterrows():
        label = str(r["prefecture"])
        slug = label.split("(")[0].strip().lower()
        rows.append({
            "pref": PREF_KEY.get(label, slug),
            "label": label,
            "early": _num(r["pre2010_estimate"]),
            "early_year": _num(r["pre2010_year"]),
            "mid": _num(r["2010s_estimate"]),
            "mid_year": _num(r["2010s_year"]),
            "latest": _num(r["latest_estimate"]),
            "latest_year": _num(r["latest_year"]),
            "unit_note": POPULATION_UNIT_NOTE,
            "source_url": r["source_url"],
            "publish_date": r["publish_date"],
        })
    return rows


def build_weather(summer: pd.DataFrame, monthly: pd.DataFrame) -> dict:
    """June-August mean temperature and total rainfall per station-year.

    jma_summer_means.csv stops at the last year it was built for; any later year
    whose three summer months are all present in jma_monthly.csv is aggregated
    here the same way (mean of the three monthly means, sum of the three totals).
    """
    out: dict[str, list[dict]] = {}
    have: set[tuple[str, int]] = set()
    for r in summer.sort_values(["station", "year"]).itertuples():
        out.setdefault(r.station, []).append({
            "year": int(r.year),
            "jja_temp": _num(r.jja_mean_temp_c),
            "jja_precip": _num(r.jja_precip_total_mm),
            "jja_sunshine": _num(r.jja_sunshine_total_h),
            "source_url": r.source_url,
            "publish_date": r.publish_date,
        })
        have.add((r.station, int(r.year)))
    jja = monthly[monthly["month"].isin([6, 7, 8])]
    for (station, year), g in jja.groupby(["station", "year"]):
        if (station, int(year)) in have or len(g) < 3 or g["mean_temp_c"].isna().any():
            continue
        out.setdefault(station, []).append({
            "year": int(year),
            "jja_temp": round(float(g["mean_temp_c"].mean()), 2),
            "jja_precip": _num(g["precip_total_mm"].sum()),
            "jja_sunshine": _num(g["sunshine_h"].sum()) if not g["sunshine_h"].isna().any() else None,
            "source_url": g.iloc[0]["source_url"],
            "publish_date": g.iloc[0]["publish_date"],
        })
    for rows in out.values():
        rows.sort(key=lambda r: r["year"])
    return out


# Quoted from the office's own releases (identical wording in every release
# from H29 on; this copy from raw/research/mast/buna-r8-flowering.pdf, page 2).
INDEX_DEFINITION = (
    "区分 / 開花（結実）状況 / 豊凶指数: "
    "全体 樹冠全体にたくさんの花（実）がついている ５; "
    "部分 樹冠上部に多くの花（実）がついている ３; "
    "一部 ごくわずかに花（実）がついている １; "
    "非開花（非結実） まったく花（実）がついていない ０. "
    "結実予測は、各調査箇所の調査結果を数値化、集計し豊凶指数を算出して、下表のとおり結実の豊凶を推測します。 "
    "豊凶指数 3.5以上 豊作 / 2.0以上3.5未満 並作 / 1.0以上2.0未満 凶作 / 1.0未満 大凶作. "
    "注：豊凶指数1.0未満でも一部に開花・結実が見られる場合もあり、誤解を避けるため、平成29年度から豊凶区分の「皆無」を「大凶作」に変更しました。"
    " (東北森林管理局. The prefecture index is the mean of the per-point scores over the points surveyed that year.)"
)

SOURCES = [
    {"key": "moe_syutubotu", "name": "クマ類の出没情報について［速報値］ (monthly sightings by prefecture; live file plus three Wayback editions)",
     "url": "https://www.env.go.jp/nature/choju/effort/effort12/syutubotu.pdf", "publisher": "環境省"},
    {"key": "moe_injury", "name": "クマ類による人身被害について［速報値］ (monthly victims and deaths by prefecture, one PDF per fiscal year)",
     "url": "https://www.env.go.jp/nature/choju/effort/effort12/injury-qe.pdf", "publisher": "環境省"},
    {"key": "tohoku_office", "name": "ブナの開花状況と結実予測 / ブナの結実状況について (Tohoku Regional Forest Office beech survey, 145 points, FY2012 to FY2026)",
     "url": "https://www.rinya.maff.go.jp/tohoku/sidou/buna.html", "publisher": "林野庁 東北森林管理局"},
    {"key": "akita_sites", "name": "ブナ・ミズナラ豊凶結果 2002-2025 / ブナ豊凶予報 2026 (five sites, sound nuts per m²)",
     "url": "https://www.pref.akita.lg.jp/uploads/public/archive_0000077382_00/ブナ・ミズナラ豊凶結果2025.pdf", "publisher": "秋田県林業研究研修センター"},
    {"key": "miyagi", "name": "ツキノワグマ捕獲頭数と堅果類豊凶調査結果の経年変化 (mast category 1998-2025)",
     "url": "https://www.pref.miyagi.jp/documents/24763/r7graph_2.pdf", "publisher": "宮城県"},
    {"key": "toyama", "name": "堅果類（ドングリ）の豊凶調査結果について (yearly releases 2015-2026)",
     "url": "https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/houkyou.html", "publisher": "富山県 森林研究所"},
    {"key": "niigata", "name": "令和8年度堅果類の豊凶状況調査結果（速報）",
     "url": "https://www.pref.niigata.lg.jp/uploaded/attachment/506777.pdf", "publisher": "新潟県"},
    {"key": "moe_table", "name": "堅果類の着花結実情報について (national prefecture-by-species mast table, seven editions FY2013-FY2023)",
     "url": "https://www.env.go.jp/nature/choju/effort/effort12/ketujitu.pdf", "publisher": "環境省"},
    {"key": "licences", "name": "種別狩猟免許所持者数 / 年代別狩猟免許所持者数 (1975-2021, rounded to 100)",
     "url": "https://www.env.go.jp/nature/choju/docs/docs4/syubetu.pdf", "publisher": "環境省"},
    {"key": "population", "name": "特定鳥獣保護・管理計画作成のためのガイドライン（クマ編）令和8年度版（案）表Ⅱ-２ 都道府県のクマ推定個体数の推移",
     "url": "https://www.env.go.jp/content/000377671.pdf", "publisher": "環境省"},
    {"key": "weather", "name": "過去の気象データ検索 (monthly station data: Akita, Morioka, Aomori, Yamagata, Niigata, Toyama)",
     "url": "https://www.data.jma.go.jp/stats/etrn/view/monthly_s1.php", "publisher": "気象庁"},
]


def _csv(path: Path, **kw) -> pd.DataFrame:
    if not path.exists():
        print(f"  [warn] missing {path.relative_to(REPO_ROOT)}; returning empty DataFrame", file=sys.stderr)
        return pd.DataFrame()
    return pd.read_csv(path, **kw)


def _points_recent() -> list[dict]:
    path = WEBAPP_DATA_DIR / "points-recent.json"
    if not path.exists():
        print(f"  [warn] missing {path.relative_to(REPO_ROOT)}; sample4 recent series will be empty", file=sys.stderr)
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def build_context() -> dict:
    mast_dir, moe_dir, weather_dir = RESEARCH / "mast", RESEARCH / "moe", RESEARCH / "weather"

    recent = build_recent(
        _csv(moe_dir / "sightings-by-prefecture-by-month-by-fy.csv"),
        _csv(RECENT_DIR / "akita_monthly.csv"),
        _csv(RECENT_DIR / "iwate_monthly.csv"),
        _csv(RECENT_DIR / "miyagi_monthly.csv"),
        _points_recent(),
        _csv(RECENT_DIR / "prefectures_fy2026.csv"),
    )

    tohoku = build_tohoku_office(
        _csv(mast_dir / "tohoku_forest_office_flowering_forecast.csv"),
        _csv(mast_dir / "tohoku_forest_office_fruiting_actual.csv"),
    )
    akita = build_akita_sites(_csv(mast_dir / "akita_buna_2002_2025.csv", dtype=str),
                              _csv(mast_dir / "akita_2026_forecast.csv", dtype=str))
    toyama = build_toyama(_csv(mast_dir / "toyama_mast_2015_2026.csv"))
    niigata = _csv(mast_dir / "niigata_buna_forecast_r8.csv")

    return {
        "_built_at": utc_now_iso(),
        "monthly_national": build_monthly_national(_csv(moe_dir / "national-monthly-sightings-fy2013-fy2026.csv")),
        "prefecture_month": build_prefecture_month(_csv(moe_dir / "sightings-by-prefecture-by-month-by-fy.csv")),
        "casualties_monthly": build_casualties_monthly(_csv(moe_dir / "injuries_monthly_fy2014_fy2026.csv")),
        "recent": recent,
        "mast": {
            "tohoku_office": tohoku,
            "akita_sites": akita,
            "akita_site_names": AKITA_SITES,
            "akita_score_definition": "number of the five sites rated ○ (豊作, 200個/㎡以上 sound nuts); the prefecture publishes no prefecture-wide grade",
            "miyagi": build_miyagi(_csv(mast_dir / "miyagi_mast_index_1998_2025.csv")),
            "toyama": toyama,
            "moe_table": build_moe_table(_csv(mast_dir / "env_ketujitu_by_prefecture_species_fy2017_fy2023.csv")),
            "forecast_2026": build_forecast_2026(tohoku, niigata, toyama, akita),
            "index_definition": INDEX_DEFINITION,
        },
        "licences": build_licences(_csv(moe_dir / "hunting-licence-holders-1975-2021.csv")),
        "population": build_population(_csv(moe_dir / "population-by-prefecture.csv")),
        "weather": build_weather(_csv(weather_dir / "jma_summer_means.csv"), _csv(weather_dir / "jma_monthly.csv")),
        "sources": SOURCES,
    }


def main() -> int:
    ensure_dir(WEBAPP_DATA_DIR)
    ctx = build_context()
    out = WEBAPP_DATA_DIR / "context.json"
    # allow_nan=False so a stray NaN fails the build here rather than in the browser.
    out.write_text(json.dumps(ctx, ensure_ascii=False, allow_nan=False, separators=(",", ":")),
                   encoding="utf-8")
    print(f"[wrote] {out.relative_to(REPO_ROOT)} ({out.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
