"""build_context.py is run against the real research CSVs (they are tracked in
git, so these are integration tests, not fixtures). The numbers asserted here
are the ones the page quotes; each traces to a printed cell in a source PDF
named in the CSV's source_url column."""
import json
import math

import pytest

from build_context import build_context, build_forecast_2026, _month_row

TOP_KEYS = {"_built_at", "monthly_national", "prefecture_month", "casualties_monthly",
            "mast", "licences", "population", "weather", "sources"}
MAST_KEYS = {"tohoku_office", "akita_sites", "miyagi", "toyama", "moe_table",
             "forecast_2026", "index_definition"}
FORECAST_KEYS = {"tohoku_office_mean", "tohoku_office_same_date_2025", "niigata",
                 "toyama", "akita_sites", "sources"}


@pytest.fixture(scope="module")
def ctx():
    return build_context()


def test_shape_keys_present(ctx):
    assert TOP_KEYS <= set(ctx)
    assert MAST_KEYS <= set(ctx["mast"])
    assert FORECAST_KEYS <= set(ctx["mast"]["forecast_2026"])
    for block in ("monthly_national", "prefecture_month"):
        assert ctx[block]["months"] == [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
        assert ctx[block]["years"] == list(range(2013, 2027))
    assert ctx["casualties_monthly"]["years"] == list(range(2014, 2027))
    assert {"injured", "killed"} <= set(ctx["casualties_monthly"])
    assert {"akita", "morioka"} <= set(ctx["weather"])
    for row in ctx["licences"]:
        assert {"year", "total", "gun1", "gun2", "net", "trap", "age60plus"} <= set(row)
    for row in ctx["population"]:
        assert {"pref", "early", "early_year", "latest", "latest_year", "unit_note"} <= set(row)


def test_fy2025_october_national_sightings(ctx):
    # syutubotu.pdf edition 2026-08-06, 計 row, R07 10月
    months = ctx["monthly_national"]["months"]
    assert ctx["monthly_national"]["sightings"]["2025"][months.index(10)] == 15998


def test_running_year_unreported_months_are_null(ctx):
    row = ctx["monthly_national"]["sightings"]["2026"]
    assert row[:3] == [1787, 4581, 6260]
    assert row[3:] == [None] * 9


def test_akita_plus_iwate_fy2025_total(ctx):
    totals = ctx["prefecture_month"]["totals"]["2025"]
    assert totals["akita"] + totals["iwate"] == 23331
    assert "akita" in ctx["prefecture_month"]["prefectures"]
    assert set(ctx["prefecture_month"]["sightings"]["2025"]) == set(ctx["prefecture_month"]["prefectures"])


def test_prefecture_keys_match_prefecture_totals_json(ctx):
    # The webapp joins on these keys, so they must be the ones build_json.py emits.
    from utils import WEBAPP_DATA_DIR
    path = WEBAPP_DATA_DIR / "prefecture-totals.json"
    if not path.exists():
        pytest.skip("prefecture-totals.json not built")
    known = set(json.loads(path.read_text(encoding="utf-8"))["metrics"]["sightings"]["2025"])
    assert set(ctx["prefecture_month"]["prefectures"]) <= known
    assert {r["pref"] for r in ctx["mast"]["tohoku_office"]} <= known


def test_casualties_fy2025_totals(ctx):
    cm = ctx["casualties_monthly"]
    assert sum(cm["injured"]["2025"]) == 238
    assert sum(cm["killed"]["2025"]) == 13
    # FY2026 reported through July only: four values, then null
    assert cm["killed"]["2026"][:4] == [1, 3, 2, 0]
    assert cm["killed"]["2026"][4:] == [None] * 8


def test_tohoku_office_akita_2025_is_daikyosaku(ctx):
    rows = [r for r in ctx["mast"]["tohoku_office"] if r["fy"] == 2025 and r["pref"] == "akita"]
    assert len(rows) == 1
    r = rows[0]
    assert r["category"] == "大凶作" and r["index"] == 0 and r["points"] == 48
    assert r["forecast_index"] == 0.4 and r["forecast_category"] == "大凶作"
    assert r["actual_date"] == "2025-11-06" and r["forecast_date"] == "2025-07-11"


def test_tohoku_office_covers_2012_to_2026(ctx):
    rows = ctx["mast"]["tohoku_office"]
    assert {r["fy"] for r in rows} == set(range(2012, 2027))
    assert len(rows) == 15 * 5
    assert all(r["index"] is None for r in rows if r["fy"] == 2026)
    assert all(r["index"] is not None for r in rows if r["fy"] < 2026)


def test_forecast_2026_means(ctx):
    fc = ctx["mast"]["forecast_2026"]
    assert fc["tohoku_office_mean"] == pytest.approx(3.9, abs=0.01)
    assert fc["tohoku_office_same_date_2025"] == pytest.approx(0.44, abs=0.01)
    assert fc["niigata"].startswith("豊作")
    assert "ブナ 豊作" in fc["toyama"]
    assert fc["akita_sites"].startswith("○ at 4 of 5")
    assert len(fc["sources"]) == 4 and all({"name", "url", "date"} <= set(s) for s in fc["sources"])


def test_forecast_2026_handles_missing_inputs():
    import pandas as pd
    fc = build_forecast_2026([], pd.DataFrame(columns=["region", "forecast"]), [], [])
    assert fc["tohoku_office_mean"] is None and fc["niigata"] is None and fc["sources"] == []


def test_licences_1975_total(ctx):
    by_year = {r["year"]: r for r in ctx["licences"]}
    assert by_year[1975]["total"] == 517800
    assert by_year[1975]["gun1"] == 493700
    assert by_year[2021]["total"] == 213400
    assert by_year[1975]["age60plus"] == 45700
    assert len(by_year) == 23


def test_population_iwate(ctx):
    iwate = next(r for r in ctx["population"] if r["pref"] == "iwate")
    assert (iwate["early"], iwate["early_year"], iwate["latest"], iwate["latest_year"]) == (1100, 2006, 3700, 2020)


def test_index_definition_is_the_office_wording(ctx):
    d = ctx["mast"]["index_definition"]
    assert "3.5以上 豊作" in d and "1.0未満 大凶作" in d and "皆無" in d


def test_no_nan_anywhere(ctx):
    json.dumps(ctx, allow_nan=False)


def test_every_row_carries_a_source(ctx):
    for block in ("licences", "population"):
        for row in ctx[block]:
            assert row["source_url"] and row["publish_date"]
    for key in ("tohoku_office", "akita_sites", "toyama", "moe_table"):
        for row in ctx["mast"][key]:
            url = row.get("source_url") or row.get("forecast_url")
            assert url, (key, row)


def test_month_row_trims_running_year_only():
    assert _month_row([1, 2, 0, 0], 2026) == [1, 2, None, None]
    assert _month_row([1, 2, 0, 0], 2015) == [1, 2, 0, 0]
    assert _month_row([1, float("nan"), 3], 2015) == [1, None, 3]
    assert not any(isinstance(v, float) and math.isnan(v) for v in _month_row([float("nan")], 2015))
