from pathlib import Path

import pandas as pd
import pytest

from extract_env_go_jp import (
    era_code_to_calendar_year,
    extract_captures_pdf,
    extract_injury_pdf,
    extract_injury_year_table,
    extract_sightings_pdf,
    parse_fiscal_year_header,
    PREFECTURE_ORDER_JA,
    PREFECTURE_KEYS,
)

FIXTURES = Path(__file__).parent / "fixtures"


# ---------------------------------------------------------------------------
# Era-code tests (existing, passing)
# ---------------------------------------------------------------------------

def test_era_code_r07_is_2025():
    assert era_code_to_calendar_year("r07") == 2025


def test_era_code_h28_is_2016():
    assert era_code_to_calendar_year("h28") == 2016


def test_era_code_r01_is_2019():
    assert era_code_to_calendar_year("r01") == 2019


def test_era_code_invalid_raises():
    with pytest.raises(ValueError):
        era_code_to_calendar_year("x99")


def test_prefecture_order_has_47_entries():
    assert len(PREFECTURE_ORDER_JA) == 47
    assert PREFECTURE_ORDER_JA[0] == "北海道"
    assert PREFECTURE_ORDER_JA[-1] == "沖縄県"


# ---------------------------------------------------------------------------
# Injury PDF tests
# ---------------------------------------------------------------------------

def test_extract_injury_pdf_returns_39_prefectures_x_12_months():
    df = extract_injury_pdf(FIXTURES / "r07injury-sample.pdf", fiscal_year=2025)
    assert len(df) == 39 * 12
    assert df["year"].unique().tolist() == [2025]


def test_extract_injury_pdf_has_three_metrics():
    df = extract_injury_pdf(FIXTURES / "r07injury-sample.pdf", fiscal_year=2025)
    assert {"incidents", "victims", "deaths"}.issubset(df.columns)
    for col in ["incidents", "victims", "deaths"]:
        assert (df[col] >= 0).all()
        assert df[col].dtype.kind in "iu"


def test_extract_injury_pdf_maps_short_to_long_names():
    df = extract_injury_pdf(FIXTURES / "r07injury-sample.pdf", fiscal_year=2025)
    assert "青森県" in df["prefecture_ja"].values
    assert "北海道" in df["prefecture_ja"].values
    assert df.loc[df["prefecture_ja"] == "秋田県", "prefecture_key"].iloc[0] == "akita"


def test_extract_injury_pdf_2025_has_record_deaths():
    """Sanity: R07 is the unprecedented year; national deaths should be ≥10."""
    df = extract_injury_pdf(FIXTURES / "r07injury-sample.pdf", fiscal_year=2025)
    total_deaths = df["deaths"].sum()
    assert total_deaths >= 10, f"expected ≥10 deaths in FY2025, got {total_deaths}"


# ---------------------------------------------------------------------------
# Sightings PDF tests
# ---------------------------------------------------------------------------

def test_extract_sightings_pdf_returns_39_x_12_x_5():
    df = extract_sightings_pdf(FIXTURES / "syutubotu-sample.pdf")
    assert len(df) == 39 * 12 * 5


def test_extract_sightings_pdf_years_cover_r03_to_r07():
    df = extract_sightings_pdf(FIXTURES / "syutubotu-sample.pdf")
    # fiscal_year = cal_year always; Jan-Mar of each fiscal year have calendar_year+1
    # so fiscal years in the data should be exactly R03-R07 = 2021-2025
    assert sorted(df["year"].unique()) == [2021, 2022, 2023, 2024, 2025]


def test_extract_sightings_pdf_2025_iwate_is_high():
    """Iwate's FY2025 (R07) total sightings should be ~9,670."""
    df = extract_sightings_pdf(FIXTURES / "syutubotu-sample.pdf")
    iwate_2025 = df[(df["prefecture_ja"] == "岩手県") & (df["year"] == 2025)]
    total = iwate_2025["value"].sum()
    assert total > 1000, f"Iwate FY2025 sightings = {total}, expected > 1000"


# ---------------------------------------------------------------------------
# Captures PDF tests
# ---------------------------------------------------------------------------

def test_extract_captures_pdf_returns_36_x_18():
    """Captures PDF has 36 prefectures (香川/愛媛/高知 absent — no bear captures recorded)."""
    df = extract_captures_pdf(FIXTURES / "capture-sample.pdf")
    assert len(df) == 36 * 18


def test_extract_captures_pdf_hokkaido_2008_total_is_355():
    """Known value from inspection: Hokkaido H20 (2008) total captures = 355."""
    df = extract_captures_pdf(FIXTURES / "capture-sample.pdf")
    hok_2008 = df[(df["prefecture_ja"] == "北海道") & (df["year"] == 2008)]
    assert len(hok_2008) == 1
    assert hok_2008["total"].iloc[0] == 355


def test_extract_captures_pdf_totals_add_up():
    """For every row, total = culled + non_killed (within small rounding tolerance)."""
    df = extract_captures_pdf(FIXTURES / "capture-sample.pdf")
    mismatches = (df["total"] - (df["culled"] + df["non_killed"])).abs()
    assert mismatches.max() <= 2, f"max mismatch = {mismatches.max()}"


# ---------------------------------------------------------------------------
# Fiscal-year header parsing
# ---------------------------------------------------------------------------

def test_parse_fiscal_year_header_full_width():
    assert parse_fiscal_year_header("Ｈ２０年度") == 2008
    assert parse_fiscal_year_header("Ｒ０７年度") == 2025


def test_parse_fiscal_year_header_half_width_and_mixed():
    # The ministry's own files mix widths, e.g. 'Ｈ２1年度'.
    assert parse_fiscal_year_header("Ｈ２1年度") == 2009
    assert parse_fiscal_year_header("Ｒ04") == 2022
    assert parse_fiscal_year_header("R05") == 2023


def test_parse_fiscal_year_header_partial_year_suffix():
    """The trailing column carries a year-to-date note; the year still parses."""
    assert parse_fiscal_year_header("Ｒ０８年度\n(R08年7月末)") == 2026


def test_parse_fiscal_year_header_returns_none_for_non_year():
    assert parse_fiscal_year_header("都道府県") is None
    assert parse_fiscal_year_header("") is None
    assert parse_fiscal_year_header(None) is None


# ---------------------------------------------------------------------------
# Injury by-fiscal-year summary table (the current injury-qe.pdf shape)
# ---------------------------------------------------------------------------

def test_injury_year_table_covers_2008_to_present():
    df = extract_injury_year_table(FIXTURES / "injury-year-table-sample.pdf")
    years = sorted(df["year"].unique())
    assert years[0] == 2008
    assert years == list(range(years[0], years[-1] + 1)), "fiscal years must be contiguous"


def test_injury_year_table_has_all_39_prefectures_each_year():
    df = extract_injury_year_table(FIXTURES / "injury-year-table-sample.pdf")
    counts = df.groupby("year")["prefecture_key"].nunique()
    assert (counts == 39).all(), f"per-year prefecture counts: {counts.to_dict()}"


def test_injury_year_table_fy2025_matches_published_totals():
    """FY2025 (R07) national totals as published: 216 incidents, 238 victims, 13 deaths.

    Regression guard: an earlier parser read this file's fiscal-year columns as
    if they were months and summed them, reporting 1,087 injured / 23 killed.
    """
    df = extract_injury_year_table(FIXTURES / "injury-year-table-sample.pdf")
    fy25 = df[df["year"] == 2025]
    assert fy25["incidents"].sum() == 216
    assert fy25["victims"].sum() == 238
    assert fy25["deaths"].sum() == 13


def test_injury_year_table_fy2025_is_the_record_year():
    df = extract_injury_year_table(FIXTURES / "injury-year-table-sample.pdf")
    by_year = df.groupby("year")["deaths"].sum()
    assert by_year.idxmax() == 2025
    # Comfortably clear of the prior peak rather than a tie.
    assert by_year[2025] > by_year.drop(2025).max()


def test_injury_year_table_victims_never_below_deaths():
    df = extract_injury_year_table(FIXTURES / "injury-year-table-sample.pdf")
    assert (df["victims"] >= df["deaths"]).all()
