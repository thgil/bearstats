"""context["recent"] holds prefecture-published sighting counts that run ahead
of the ministry's own table (Akita's クマダス feed, one-page PDFs from Iwate
and Miyagi, and the four smaller ArcGIS-point prefectures bundled together).

These are integration tests against the tracked CSVs under research/recent/
(built by fetch_recent.py) and webapp/data/points-recent.json, same spirit as
test_build_context.py: every number here traces to a cell in a downloaded
source, named in build_recent()'s docstring or fetch_recent.py's module
docstring.
"""
import math

import pytest

from build_context import build_context

RECENT_KEYS = {"key", "label", "source", "url", "as_of", "comparable", "note",
                "partial_month", "fy2025", "fy2026"}


@pytest.fixture(scope="module")
def recent():
    return build_context()["recent"]


@pytest.fixture(scope="module")
def by_key(recent):
    return {s["key"]: s for s in recent["series"]}


def test_shape(recent):
    assert set(recent) == {"built_at", "series"}
    assert [s["key"] for s in recent["series"]] == ["akita", "miyagi", "iwate", "sample4"]
    for s in recent["series"]:
        assert {"key", "label", "source", "url", "as_of", "comparable",
                "partial_month", "fy2025", "fy2026"} <= set(s)
        assert len(s["fy2025"]) == 12
        assert len(s["fy2026"]) == 12


def test_akita_fy2025_matches_moe_total(by_key):
    assert sum(by_key["akita"]["fy2025"]) == 13592


def test_akita_fy2026_apr_jun_within_1pct_of_moe(by_key):
    total = sum(by_key["akita"]["fy2026"][:3])
    assert total == pytest.approx(2107, rel=0.01)


def test_akita_fy2026_july_and_august_from_kumadas(by_key):
    fy2026 = by_key["akita"]["fy2026"]
    months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    assert fy2026[months.index(7)] == 904
    assert fy2026[months.index(8)] == 251


def test_miyagi_fy2026_july_and_august(by_key):
    fy2026 = by_key["miyagi"]["fy2026"]
    months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    assert fy2026[months.index(7)] == 222
    assert fy2026[months.index(8)] == 132


def test_iwate_is_not_comparable(by_key):
    assert by_key["iwate"]["comparable"] is False
    assert "Bears" in by_key["iwate"]["note"]


def test_akita_and_miyagi_are_comparable(by_key):
    assert by_key["akita"]["comparable"] is True
    assert by_key["miyagi"]["comparable"] is True


def test_sample4_fy2026_july(by_key):
    months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    assert by_key["sample4"]["fy2026"][months.index(7)] == 363


def test_sample4_label_and_url(by_key):
    s4 = by_key["sample4"]
    assert s4["label"] == "Toyama, Niigata, Gunma and Saitama"
    assert s4["url"] == ""


def test_last_reported_month_matches_as_of(by_key):
    """The last non-null fy2026 entry sits at the fiscal-month position of
    as_of's calendar month (it may itself be null, e.g. Iwate's as_of falls in
    August but August hasn't been reported yet)."""
    months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
    for s in by_key.values():
        if s["as_of"] is None:
            continue
        as_of_month = int(s["as_of"].split("-")[1])
        cutoff = months.index(as_of_month)
        assert all(v is None for v in s["fy2026"][cutoff + 1:])


def test_no_nan_in_recent(recent):
    import json
    json.dumps(recent, allow_nan=False)
    for s in recent["series"]:
        for v in s["fy2025"] + s["fy2026"]:
            assert v is None or not (isinstance(v, float) and math.isnan(v))


def test_missing_prefectural_csv_does_not_crash(monkeypatch):
    """fetch_recent.py can fail to reach a prefecture; build_context.py must
    still produce a (mostly-null) series rather than raising, so a bad network
    day for one source never breaks the whole webapp build."""
    import pandas as pd
    from build_context import build_recent

    moe = pd.DataFrame(columns=["prefecture", "fiscal_year"] + [f"{m}月" for m in
                        [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]])
    empty = pd.DataFrame()
    out = build_recent(moe, empty, empty, empty, [])
    assert [s["key"] for s in out["series"]] == ["akita", "miyagi", "iwate", "sample4"]
    for s in out["series"]:
        assert s["fy2025"] == [None] * 12
        assert s["fy2026"] == [None] * 12
        assert s["as_of"] is None
