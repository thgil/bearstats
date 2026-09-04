import pandas as pd
from build_json import (
    build_national_timeline,
    build_prefecture_totals,
    build_points_recent,
)


def _mk_env_frame(rows: list[tuple]) -> pd.DataFrame:
    """rows = list of (year, prefecture_key, month, value_or_victims, deaths?)."""
    return pd.DataFrame([
        {"prefecture_ja": "dummy", "prefecture_key": r[1],
         "year": r[0], "calendar_year": r[0], "month": r[2],
         "value": r[3], "victims": r[3],
         "deaths": r[4] if len(r) >= 5 else 0,
         "incidents": r[3], "total": r[3]}
        for r in rows
    ])


def test_build_national_timeline_groups_by_year():
    sightings = _mk_env_frame([(2024, "akita", 4, 500), (2025, "akita", 4, 5000),
                                (2024, "iwate", 5, 300), (2025, "iwate", 5, 2000)])
    injuries  = _mk_env_frame([(2024, "akita", 4, 10, 1), (2025, "akita", 4, 100, 5)])
    captures  = _mk_env_frame([(2024, "akita", 0, 50), (2025, "akita", 0, 200)])

    nt = build_national_timeline(sightings, injuries, captures)
    assert nt["years_sightings"] == [2024, 2025]
    assert nt["metrics"]["sightings"] == [800, 7000]
    assert nt["metrics"]["injuries"] == [10, 100]
    assert nt["metrics"]["deaths"] == [1, 5]
    assert nt["metrics"]["captures_total"] == [50, 200]
    assert "_source_fetched_at" in nt


def test_build_prefecture_totals_nests_by_year_then_pref():
    sightings = _mk_env_frame([
        (2025, "akita", 4, 5000),
        (2025, "iwate", 4, 2000),
        (2024, "akita", 4, 500),
    ])
    injuries = pd.DataFrame(columns=sightings.columns)  # empty
    captures = pd.DataFrame(columns=sightings.columns)  # empty

    pt = build_prefecture_totals(sightings, injuries, captures)
    assert pt["metrics"]["sightings"]["2025"]["akita"] == 5000
    assert pt["metrics"]["sightings"]["2025"]["iwate"] == 2000
    assert pt["metrics"]["sightings"]["2024"]["akita"] == 500


def test_build_points_recent_flattens_and_sorts_by_date_desc():
    a = [{"pref": "niigata", "lat": 37.0, "lon": 138.0, "date": "2025-04-08",
          "species": "black", "source": "niigata-arcgis"}]
    b = [{"pref": "hokkaido", "lat": 43.0, "lon": 141.0, "date": "2026-01-10",
          "species": "brown", "source": "hokkaido-higumap"}]
    out = build_points_recent([a, b])
    assert len(out) == 2
    assert out[0]["date"] == "2026-01-10"   # sorted newest first


def test_build_points_recent_drops_missing_coords():
    bad = [{"pref": "x", "lat": None, "lon": None, "date": "2025-01-01"}]
    ok = [{"pref": "y", "lat": 1.0, "lon": 2.0, "date": "2025-01-01"}]
    out = build_points_recent([bad, ok])
    assert len(out) == 1


# ---------------------------------------------------------------------------
# Year-to-date (same-months) comparison
# ---------------------------------------------------------------------------

from datetime import date

import pandas as pd

from build_json import build_ytd, fiscal_window, is_complete_fiscal_year


def test_fiscal_window_runs_april_first():
    assert fiscal_window(4) == [4]
    assert fiscal_window(6) == [4, 5, 6]
    assert fiscal_window(3) == [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]


def test_is_complete_fiscal_year_ends_march_31():
    # FY2025 runs Apr 2025 - Mar 2026.
    assert not is_complete_fiscal_year(2025, date(2026, 3, 31))
    assert is_complete_fiscal_year(2025, date(2026, 4, 1))
    assert not is_complete_fiscal_year(2026, date(2026, 8, 27))


def _sightings_frame():
    rows = []
    # FY2025 reports all 12 months; FY2026 only April-June so far.
    for month in [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]:
        rows.append({"year": 2025, "month": month, "value": 100})
    for month in [4, 5, 6]:
        rows.append({"year": 2026, "month": month, "value": 300})
    for month in [7, 8, 9, 10, 11, 12, 1, 2, 3]:
        rows.append({"year": 2026, "month": month, "value": 0})
    return pd.DataFrame(rows)


def test_build_ytd_cuts_every_year_to_the_reported_window():
    ytd = build_ytd(_sightings_frame(), pd.DataFrame(), pd.DataFrame(), 2026)
    s = ytd["sightings"]
    assert s["months"] == [4, 5, 6]
    assert s["label"] == "April–June"
    # FY2025 is cut to its first three months too, not left at its full total.
    assert dict(zip(s["years"], s["values"])) == {2025: 300, 2026: 900}


def test_build_ytd_is_empty_when_no_year_is_running():
    assert build_ytd(_sightings_frame(), pd.DataFrame(), pd.DataFrame(), None) == {}


def test_build_ytd_injuries_join_monthly_archive_to_running_total():
    monthly = pd.DataFrame([
        {"year": 2025, "month": m, "victims": 10, "deaths": 1}
        for m in [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    ])
    yearly = pd.DataFrame([
        {"year": 2025, "through_month": None, "victims": 120, "deaths": 12},
        {"year": 2026, "through_month": 7.0, "victims": 53, "deaths": 6},
    ])
    ytd = build_ytd(pd.DataFrame(), monthly, yearly, 2026)
    assert ytd["injuries"]["months"] == [4, 5, 6, 7]
    # FY2025 counts only Apr-Jul (4 x 10), not its full 120.
    assert dict(zip(ytd["injuries"]["years"], ytd["injuries"]["values"])) == {2025: 40, 2026: 53}
    assert dict(zip(ytd["deaths"]["years"], ytd["deaths"]["values"])) == {2025: 4, 2026: 6}
