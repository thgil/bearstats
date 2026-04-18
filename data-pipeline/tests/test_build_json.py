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
