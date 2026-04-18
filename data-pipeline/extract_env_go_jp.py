"""Parse env.go.jp bear PDFs into tidy CSVs.

Three parsers:
- extract_injury_pdf: one fiscal-year injury PDF → long-form by prefecture × month
- extract_sightings_pdf: multi-year sightings PDF (R03-R07) → long-form
- extract_captures_pdf: multi-year captures PDF (H20-R07) → long-form yearly
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd
import pdfplumber

from utils import RAW_DIR, ensure_dir

ENV_RAW = RAW_DIR / "env"

# 47 prefectures in official Ministry of Environment table order (Hokkaido → Okinawa).
PREFECTURE_ORDER_JA = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
    "岐阜県", "静岡県", "愛知県", "三重県",
    "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
    "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県",
    "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
]

# Lowercase romaji keys used in JSON outputs (kept in same order as above).
PREFECTURE_KEYS = [
    "hokkaido","aomori","iwate","miyagi","akita","yamagata","fukushima",
    "ibaraki","tochigi","gunma","saitama","chiba","tokyo","kanagawa",
    "niigata","toyama","ishikawa","fukui","yamanashi","nagano",
    "gifu","shizuoka","aichi","mie",
    "shiga","kyoto","osaka","hyogo","nara","wakayama",
    "tottori","shimane","okayama","hiroshima","yamaguchi",
    "tokushima","kagawa","ehime","kochi",
    "fukuoka","saga","nagasaki","kumamoto","oita","miyazaki","kagoshima","okinawa",
]

assert len(PREFECTURE_ORDER_JA) == 47 == len(PREFECTURE_KEYS)

# 39 prefectures that actually appear in env.go.jp bear tables (in table order).
# Note abbreviated names: all 県/都/府 suffixes stripped EXCEPT 北海道 (full form).
PREFECTURE_NAMES_IN_PDF = [
    "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
    "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
    "新潟", "富山", "石川", "福井", "山梨", "長野",
    "岐阜", "静岡", "愛知", "三重",
    "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山",
    "鳥取", "島根", "岡山", "広島", "山口",
    "徳島", "香川", "愛媛", "高知",
]
assert len(PREFECTURE_NAMES_IN_PDF) == 39

# Map from PDF short name → canonical long name (in PREFECTURE_ORDER_JA).
# Kyushu + Okinawa are absent from PDFs; they simply have no mapping.
# NOTE: We use a regex suffix-strip rather than rstrip() because rstrip() strips
# individual characters greedily (e.g. "京都府".rstrip("県都府") → "京", not "京都").
def _strip_suffix(name: str) -> str:
    """Strip 県/都/府/道 suffix from a prefecture canonical name."""
    return re.sub(r"[県都府道]$", "", name)


PDF_TO_LONG_NAME: dict[str, str] = {}
for _short in PREFECTURE_NAMES_IN_PDF:
    _match = next(
        (p for p in PREFECTURE_ORDER_JA if p == _short or _strip_suffix(p) == _short),
        None,
    )
    if _match is None:
        raise AssertionError(f"no canonical match for PDF short name {_short!r}")
    PDF_TO_LONG_NAME[_short] = _match

assert len(PDF_TO_LONG_NAME) == 39
assert PDF_TO_LONG_NAME["青森"] == "青森県"
assert PDF_TO_LONG_NAME["北海道"] == "北海道"

# Fiscal month order: Apr=1st, ..., Mar=12th (in reading order of PDFs)
_FISCAL_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]

# Sightings PDF covers R03-R07 fiscal years.
_SIGHTINGS_YEAR_ORDER = [2021, 2022, 2023, 2024, 2025]  # R03-R07

# Captures PDF covers H20-R07 fiscal years.
_CAPTURES_YEAR_ORDER = list(range(2008, 2026))  # H20..R07
assert len(_CAPTURES_YEAR_ORDER) == 18


def era_code_to_calendar_year(code: str) -> int:
    """'r07' → 2025, 'h28' → 2016. Japanese fiscal year start."""
    m = re.fullmatch(r"([hr])(\d{2})", code.lower())
    if not m:
        raise ValueError(f"unrecognized era code: {code!r}")
    era, n = m.group(1), int(m.group(2))
    if era == "h":
        # Heisei 1 = 1989
        return 1988 + n
    # Reiwa 1 = 2019
    return 2018 + n


def _era_code_from_filename(pdf_path: Path) -> str | None:
    """'r07injury-qe.pdf' → 'r07'. Returns None for non-era-prefixed files."""
    m = re.match(r"([hr]\d{2})", pdf_path.stem)
    return m.group(1) if m else None


def _clean_cell(raw: str) -> int:
    """Parse a PDF cell into a non-negative int. Handles blanks, '-', commas."""
    if raw is None:
        return 0
    s = raw.strip().replace(",", "").replace("，", "")
    if s in ("", "-", "－", "―", "ー", "0"):
        return 0
    # Some cells include footnote markers; strip non-digit trailing chars.
    s = re.sub(r"[^\d]+$", "", s)
    if not s:
        return 0
    return int(s)


def extract_injury_pdf(pdf_path: Path, fiscal_year: int) -> pd.DataFrame:
    """Parse one env.go.jp injury PDF into long-form per-prefecture-per-month.

    PDF table shape: 44 rows × 40 cols.
      rows 0-3: headers
      rows 4-42: 39 prefecture data rows
      row 43: 計 (national total)
    Each month has 3 sub-columns: incidents (件数), victims (被害者数), deaths (死亡者数).
    Column layout: col 1+3*m for incidents, col 2+3*m for victims, col 3+3*m for deaths.
    Returns 39 × 12 = 468 rows per fiscal year.
    """
    with pdfplumber.open(pdf_path) as pdf:
        tables = []
        for page in pdf.pages:
            tables.extend(page.extract_tables() or [])

    if not tables:
        raise ValueError(f"no tables found in {pdf_path.name}")

    # Injury PDFs have one table of shape 44 × 40:
    table = tables[0]
    if len(table) < 5 or len(table[0]) < 37:
        raise ValueError(
            f"{pdf_path.name}: table shape {len(table)}×{len(table[0])} "
            f"unexpected; expected ≥ 5 rows × ≥ 37 cols"
        )

    rows: list[dict] = []
    seen_prefectures: set[str] = set()

    for row in table:
        if not row:
            continue
        first = (row[0] or "").strip()
        if first not in PREFECTURE_NAMES_IN_PDF:
            continue
        seen_prefectures.add(first)

        # For each month, read 3 cells: incidents / victims / deaths
        for m_idx, month in enumerate(_FISCAL_MONTH_ORDER):
            base = 1 + 3 * m_idx  # col 1 for Apr incidents, col 4 for May, ...
            if base + 2 >= len(row):
                raise ValueError(
                    f"{pdf_path.name}: prefecture {first} has "
                    f"{len(row)} cols, cannot read month {month} at col {base}"
                )
            incidents = _clean_cell(row[base])
            victims = _clean_cell(row[base + 1])
            deaths = _clean_cell(row[base + 2])

            cal_year = fiscal_year if month >= 4 else fiscal_year + 1
            long_name = PDF_TO_LONG_NAME[first]
            key = PREFECTURE_KEYS[PREFECTURE_ORDER_JA.index(long_name)]
            rows.append({
                "prefecture_ja": long_name,
                "prefecture_key": key,
                "year": fiscal_year,
                "calendar_year": cal_year,
                "month": month,
                "incidents": incidents,
                "victims": victims,
                "deaths": deaths,
            })

    missing = set(PREFECTURE_NAMES_IN_PDF) - seen_prefectures
    if missing:
        raise ValueError(
            f"{pdf_path.name}: missing prefectures: {sorted(missing)}"
        )

    return pd.DataFrame(rows)


def extract_sightings_pdf(pdf_path: Path) -> pd.DataFrame:
    """Parse the multi-year sightings PDF (syutubotu.pdf).

    PDF table shape: 42 rows × 66 cols.
      Row 0: month headers ('4月', ..., '3月') each spanning 5 year sub-cells.
      Row 1: year sub-headers ('R03', 'R04', 'R05', 'R06', 'R07') × 12 months + yearly totals.
      Rows 2-40: 39 prefecture rows.
      Row 41: 計 total row.
    Column layout for (month M=1..12 in fiscal order, year Y=0..4 for R03..R07):
      col = 1 + 5*(M-1) + Y
    Cols 61-65: per-year yearly totals (ignored here).
    Returns 39 × 12 × 5 = 2,340 rows.

    Note: cal_year here is the fiscal year label (start of fiscal year).
    fiscal_year = cal_year always (cal_year is R03=2021 etc. = the fiscal year label).
    calendar_year = cal_year for months 4-12, cal_year+1 for months 1-3 (Jan-Mar follow
    next calendar year in a fiscal year that starts in April).
    """
    with pdfplumber.open(pdf_path) as pdf:
        tables = []
        for page in pdf.pages:
            tables.extend(page.extract_tables() or [])
    if not tables:
        raise ValueError(f"no tables found in {pdf_path.name}")
    table = tables[0]

    # Shape check: ≥ 41 rows and ≥ 61 cols (1 + 12×5)
    if len(table) < 41 or len(table[0]) < 61:
        raise ValueError(
            f"{pdf_path.name}: expected ≥41 rows × ≥61 cols, got "
            f"{len(table)} × {len(table[0])}"
        )

    rows: list[dict] = []
    seen: set[str] = set()

    for row in table:
        if not row:
            continue
        first = (row[0] or "").strip()
        if first not in PREFECTURE_NAMES_IN_PDF:
            continue
        seen.add(first)

        long_name = PDF_TO_LONG_NAME[first]
        key = PREFECTURE_KEYS[PREFECTURE_ORDER_JA.index(long_name)]

        for m_idx, month in enumerate(_FISCAL_MONTH_ORDER):
            for y_idx, fiscal_year in enumerate(_SIGHTINGS_YEAR_ORDER):
                col = 1 + 5 * m_idx + y_idx
                if col >= len(row):
                    raise ValueError(f"{pdf_path.name}: col {col} out of bounds for {first}")
                value = _clean_cell(row[col])
                # cal_year is fiscal year label; Jan-Mar fall in the next calendar year.
                cal_year = fiscal_year if month >= 4 else fiscal_year + 1
                rows.append({
                    "prefecture_ja": long_name,
                    "prefecture_key": key,
                    "year": fiscal_year,
                    "calendar_year": cal_year,
                    "month": month,
                    "value": value,
                })

    missing = set(PREFECTURE_NAMES_IN_PDF) - seen
    if missing:
        raise ValueError(f"{pdf_path.name}: missing: {sorted(missing)}")

    return pd.DataFrame(rows)


def extract_captures_pdf(pdf_path: Path) -> pd.DataFrame:
    """Parse the multi-year captures PDF (capture-qe.pdf).

    PDF table shape: 39 rows × 55 cols (primary table).
      Row 0: year headers ('Ｈ２０年度', ..., 'Ｒ０７年度') each spanning 3 sub-cells.
      Row 1: sub-headers ('計', '捕殺', '非捕殺').
      Rows 2+: prefecture data rows.
    Column layout for year Y (0=H20/2008 .. 17=R07/2025):
      col = 1 + 3*Y (total), col = 2 + 3*Y (culled), col = 3 + 3*Y (non_killed).

    NOTE: The captures PDF contains 36 prefectures, not 39. Hong Kong (香川), 愛媛, 高知
    are absent — those Shikoku prefectures have no recorded bear captures across all years.
    We emit rows only for the prefectures actually present.
    Returns (prefectures_found) × 18 rows.
    """
    with pdfplumber.open(pdf_path) as pdf:
        tables = []
        for page in pdf.pages:
            tables.extend(page.extract_tables() or [])
    if not tables:
        raise ValueError(f"no tables found in {pdf_path.name}")
    table = tables[0]  # Primary table; ignore species breakdown table.

    if len(table) < 38 or len(table[0]) < 55:
        raise ValueError(
            f"{pdf_path.name}: expected ≥38 rows × ≥55 cols, got "
            f"{len(table)} × {len(table[0])}"
        )

    rows: list[dict] = []
    seen: set[str] = set()

    for row in table:
        if not row:
            continue
        first = (row[0] or "").strip()
        if first not in PREFECTURE_NAMES_IN_PDF:
            continue
        seen.add(first)
        long_name = PDF_TO_LONG_NAME[first]
        key = PREFECTURE_KEYS[PREFECTURE_ORDER_JA.index(long_name)]

        for y_idx, cal_year in enumerate(_CAPTURES_YEAR_ORDER):
            base = 1 + 3 * y_idx
            if base + 2 >= len(row):
                raise ValueError(f"{pdf_path.name}: col {base + 2} out of bounds")
            rows.append({
                "prefecture_ja": long_name,
                "prefecture_key": key,
                "year": cal_year,  # fiscal year = calendar start year
                "total": _clean_cell(row[base]),
                "culled": _clean_cell(row[base + 1]),
                "non_killed": _clean_cell(row[base + 2]),
            })

    # Log which prefectures were absent (informational, not an error)
    absent = set(PREFECTURE_NAMES_IN_PDF) - seen
    if absent:
        print(
            f"[captures] {pdf_path.name}: {len(absent)} prefectures absent from table "
            f"(all-zero, no bears): {sorted(absent)}"
        )

    return pd.DataFrame(rows)


def main() -> int:
    ensure_dir(ENV_RAW)
    # --- Injury PDFs (one per fiscal year) ---
    injury_frames: list[pd.DataFrame] = []
    for pdf_path in sorted(ENV_RAW.glob("*injury-qe.pdf")):
        code = _era_code_from_filename(pdf_path)
        if code is None:
            continue  # current-year file; we'll pick it up below
        fy = era_code_to_calendar_year(code)
        print(f"[injuries] {pdf_path.name} → FY{fy}")
        injury_frames.append(extract_injury_pdf(pdf_path, fiscal_year=fy))

    current_injury = ENV_RAW / "injury-qe.pdf"
    if current_injury.exists():
        print(f"[injuries] {current_injury.name} → FY2025 (current snapshot, supersedes r07)")
        cur_df = extract_injury_pdf(current_injury, fiscal_year=2025)
        injury_frames = [f for f in injury_frames if f["year"].iloc[0] != 2025] + [cur_df]

    if injury_frames:
        all_injuries = pd.concat(injury_frames, ignore_index=True)
        out = ENV_RAW / "injuries.csv"
        all_injuries.to_csv(out, index=False)
        print(f"[wrote]    {out.name} ({len(all_injuries):,} rows)")

    # --- Sightings (single multi-year PDF) ---
    sightings_pdf = ENV_RAW / "syutubotu.pdf"
    if sightings_pdf.exists():
        print(f"[sightings] {sightings_pdf.name} → 5 years (R03-R07)")
        df = extract_sightings_pdf(sightings_pdf)
        out = ENV_RAW / "sightings.csv"
        df.to_csv(out, index=False)
        print(f"[wrote]    {out.name} ({len(df):,} rows)")

    # --- Captures (single multi-year PDF, yearly) ---
    captures_pdf = ENV_RAW / "capture-qe.pdf"
    if captures_pdf.exists():
        print(f"[captures] {captures_pdf.name} → 18 years (H20-R07)")
        df = extract_captures_pdf(captures_pdf)
        out = ENV_RAW / "captures.csv"
        df.to_csv(out, index=False)
        print(f"[wrote]    {out.name} ({len(df):,} rows)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
