"""context["recent"] holds prefecture-published sighting counts that run ahead
of the ministry's own table (Akita's クマダス feed, one-page PDFs from Iwate
and Miyagi, and the four smaller ArcGIS-point prefectures bundled together),
plus the wider FY2026 compilation in research/recent/prefectures_fy2026.csv and
the coverage-weighted national preliminary computed from it.

These are integration tests against the tracked CSVs under research/recent/
(built by fetch_recent.py) and webapp/data/points-recent.json, same spirit as
test_build_context.py: every number here traces to a cell in a downloaded
source, named in build_recent()'s docstring or fetch_recent.py's module
docstring.
"""
import calendar
import csv
import math
from pathlib import Path

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
    assert set(recent) == {"built_at", "series", "prefectures", "national_preliminary"}
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
    assert out["prefectures"] == []
    assert out["national_preliminary"] == {}


# --- prefectures_fy2026.csv and the national preliminary -------------------

FISCAL_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
PREF_CSV = Path(__file__).resolve().parents[1] / "research" / "recent" / "prefectures_fy2026.csv"


@pytest.fixture(scope="module")
def pref_rows():
    with PREF_CSV.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def test_csv_columns_and_shape(pref_rows):
    assert list(pref_rows[0]) == ["pref", "pref_ja", "fiscal_year", "month", "count", "as_of",
                                  "source_url", "source_title", "format", "comparable", "method_note"]
    by_pref = {}
    for r in pref_rows:
        by_pref.setdefault(r["pref"], []).append(int(r["month"]))
    assert all(months == FISCAL_MONTHS for months in by_pref.values())
    assert {"akita", "iwate", "miyagi"} <= set(by_pref)
    # Toyama, Niigata and Gunma appear here via their own tables, not the sample4
    # point feed; Saitama has no prefectural table and lives only in the point feed.
    assert "saitama" not in by_pref


def test_csv_akita_july_904(pref_rows):
    """akita_monthly.csv bear_reports, FY2026 month 7 (クマダス open data, as of 2026-08-31)."""
    r = next(r for r in pref_rows if r["pref"] == "akita" and r["month"] == "7")
    assert r["count"] == "904"
    assert r["fiscal_year"] == "2026"
    assert r["comparable"] == "true"


def test_csv_every_value_has_source(pref_rows):
    for r in pref_rows:
        assert r["source_url"].startswith("https://")
        assert r["as_of"]
        assert r["comparable"] in ("true", "false")
        if r["count"] != "":
            int(r["count"])


def test_prefectures_in_context_match_csv(recent, pref_rows):
    by_key = {p["pref"]: p for p in recent["prefectures"]}
    assert set(by_key) == {r["pref"] for r in pref_rows}
    for p in by_key.values():
        assert {"pref", "label", "as_of", "comparable", "source_url", "fy2026", "fy2025"} <= set(p)
        assert len(p["fy2026"]) == 12 and len(p["fy2025"]) == 12
    assert by_key["akita"]["fy2026"][FISCAL_MONTHS.index(7)] == 904
    assert by_key["akita"]["fy2025"][FISCAL_MONTHS.index(7)] == 1055  # MoE FY2025 row
    assert by_key["iwate"]["comparable"] is False
    assert by_key["gifu"]["comparable"] is False
    assert by_key["gifu"]["fy2026"] == [None] * 12


def test_national_preliminary_months(recent):
    """Only months the ministry hasn't published yet (its FY2026 table runs to
    June), and only months some comparable source has closed (September's
    sources are all dated 2026-09-05 or earlier)."""
    assert set(recent["national_preliminary"]) == {"7", "8"}


def test_national_preliminary_july_coverage(recent):
    july = recent["national_preliminary"]["7"]
    share = july["coverage_share_fy2025"]
    assert share > 0.3, f"July coverage share of the FY2025 national total is {share}"
    assert share == pytest.approx(2684 / 5161, abs=1e-4), f"July coverage share is {share}"
    assert set(july["prefectures"]) == {"akita", "miyagi", "yamagata", "niigata", "gunma", "nagano",
                                        "fukui", "shimane", "hiroshima", "yamaguchi", "ishikawa", "yamanashi"}
    assert "fukushima" not in july["prefectures"]  # as_of 2026-07-28, July incomplete
    assert "iwate" not in july["prefectures"]      # method change, not comparable
    assert july["sum_2026"] == 2319 and july["sum_2025"] == 2684
    assert july["ratio"] == pytest.approx(2319 / 2684, abs=1e-4)


def test_national_preliminary_august_ratio_below_one(recent):
    """As of the 2026-09-05 sources, August runs well below August 2025 in every
    one of the seven comparable prefectures with a closed month, so the ratio
    is below 1 (0.4046: 596 against 1,473)."""
    aug = recent["national_preliminary"]["8"]
    print(f"August FY2026/FY2025 ratio = {aug['ratio']} ({aug['sum_2026']} / {aug['sum_2025']}), "
          f"coverage {aug['coverage_share_fy2025']}")
    assert aug["ratio"] < 1, f"August ratio is {aug['ratio']}"
    assert aug["ratio"] == pytest.approx(596 / 1473, abs=1e-4)
    assert set(aug["prefectures"]) == {"akita", "miyagi", "niigata", "nagano", "yamaguchi", "ishikawa", "yamanashi"}
    assert "yamagata" not in aug["prefectures"]  # as_of 2026-08-30, one day short of month end


def test_national_preliminary_only_complete_comparable_months(recent):
    by_key = {p["pref"]: p for p in recent["prefectures"]}
    for m_s, entry in recent["national_preliminary"].items():
        i = FISCAL_MONTHS.index(int(m_s))
        for k in entry["prefectures"]:
            p = by_key[k]
            assert p["comparable"] is True
            assert p["fy2026"][i] is not None
            y, mo, d = (int(x) for x in p["as_of"].split("-"))
            assert (y, mo) > (2026, int(m_s)) or (y == 2026 and mo == int(m_s) and d == calendar.monthrange(y, mo)[1])
        assert entry["sum_2026"] == sum(by_key[k]["fy2026"][i] for k in entry["prefectures"])
        assert entry["sum_2025"] == sum(by_key[k]["fy2025"][i] for k in entry["prefectures"])
