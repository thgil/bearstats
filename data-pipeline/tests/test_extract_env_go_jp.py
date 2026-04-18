from pathlib import Path

import pandas as pd
import pytest

from extract_env_go_jp import (
    era_code_to_calendar_year,
    extract_captures_pdf,
    extract_injury_pdf,
    extract_sightings_pdf,
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
