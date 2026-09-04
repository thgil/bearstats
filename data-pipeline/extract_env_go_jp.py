"""Parse env.go.jp bear PDFs into tidy CSVs.

Four parsers:
- extract_injury_pdf: one archived fiscal-year injury PDF → by prefecture × month
- extract_injury_year_table: the current injury summary PDF → by prefecture × year
- extract_sightings_pdf: multi-year sightings PDF → long-form by prefecture × month
- extract_captures_pdf: multi-year captures PDF → long-form yearly

The ministry reshapes and extends these tables between publications, so the
fiscal years each file covers are read from its column headers at parse time
rather than hardcoded here.
"""
from __future__ import annotations

import re
import sys
import unicodedata
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

# Era-year labels in the PDF headers: 'Ｈ２０年度', 'Ｒ０７年度', 'Ｒ04',
# 'Ｒ０８年度\n(R08年7月末)'. Digits are inconsistently full-width vs half-width
# (the ministry's own files mix them, e.g. 'Ｈ２1年度'), so normalize before matching.
_ERA_HEADER_RE = re.compile(r"([HR])\s*(\d{1,2})")


def parse_ytd_month(label: str | None) -> int | None:
    """Read the cut-off month from a running year's header.

    'Ｒ０８年度\\n(R08年7月末)' → 7, meaning the column covers April through July
    only. Returns None for a header with no cut-off note, i.e. a closed year.
    """
    if not label:
        return None
    s = unicodedata.normalize("NFKC", label)
    m = re.search(r"(\d{1,2})月末", s)
    return int(m.group(1)) if m else None


def parse_fiscal_year_header(label: str | None) -> int | None:
    """Read a fiscal year out of a PDF column header.

    'Ｈ２０年度' → 2008, 'Ｒ０７年度' → 2025, 'Ｒ04' → 2022,
    'Ｒ０８年度\\n(R08年7月末)' → 2026. Returns None if no era code is present.

    Year coverage is read from the headers rather than hardcoded so that the
    ministry appending a new fiscal year each spring does not break the parse.
    """
    if not label:
        return None
    s = unicodedata.normalize("NFKC", label).strip().upper()
    m = _ERA_HEADER_RE.search(s)
    if not m:
        return None
    era, n = m.group(1), int(m.group(2))
    # Heisei 1 = 1989, Reiwa 1 = 2019.
    return (1988 + n) if era == "H" else (2018 + n)


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


def extract_injury_year_table(pdf_path: Path) -> pd.DataFrame:
    """Parse the current injury-qe.pdf, which is a by-fiscal-year summary table.

    The ministry changed this file's shape: it used to be a month-by-month
    snapshot of the current fiscal year, and is now a cumulative table covering
    every fiscal year since H20 (2008), split across pages (H20-H30 on page 1,
    R01- on page 2). Rows are prefectures; each fiscal year occupies three
    columns — 件数 (incidents) / 被害者数 (victims) / 死亡者数 (deaths).

    The trailing fiscal year is a partial year-to-date figure (its header says
    so, e.g. 'Ｒ０８年度(R08年7月末)'); callers that need only complete years
    should drop the max year.

    Returns one row per prefecture × fiscal year.
    """
    with pdfplumber.open(pdf_path) as pdf:
        pages = [p.extract_tables() or [] for p in pdf.pages]

    rows: list[dict] = []
    seen: set[str] = set()
    years_found: list[int] = []

    for tables in pages:
        if not tables:
            continue
        table = tables[0]
        if len(table) < 5 or len(table[0]) < 4:
            continue
        header = table[0]
        n_groups = (len(header) - 1) // 3
        years = [parse_fiscal_year_header(header[1 + 3 * i]) for i in range(n_groups)]
        # A running year's header names the month it stops at; closed years have none.
        through = [parse_ytd_month(header[1 + 3 * i]) for i in range(n_groups)]
        if not any(y is not None for y in years):
            continue
        years_found.extend(y for y in years if y is not None)

        for row in table:
            if not row:
                continue
            first = (row[0] or "").strip()
            if first not in PREFECTURE_NAMES_IN_PDF:
                continue
            seen.add(first)
            long_name = PDF_TO_LONG_NAME[first]
            key = PREFECTURE_KEYS[PREFECTURE_ORDER_JA.index(long_name)]

            for i, fiscal_year in enumerate(years):
                if fiscal_year is None:
                    continue
                base = 1 + 3 * i
                if base + 2 >= len(row):
                    continue
                rows.append({
                    "prefecture_ja": long_name,
                    "prefecture_key": key,
                    "year": fiscal_year,
                    # Fiscal month the figure runs through; empty for closed years.
                    "through_month": through[i],
                    "incidents": _clean_cell(row[base]),
                    "victims": _clean_cell(row[base + 1]),
                    "deaths": _clean_cell(row[base + 2]),
                })

    if not rows:
        raise ValueError(f"{pdf_path.name}: no fiscal-year injury columns found")

    missing = set(PREFECTURE_NAMES_IN_PDF) - seen
    if missing:
        raise ValueError(f"{pdf_path.name}: missing prefectures: {sorted(missing)}")

    dupes = [y for y in set(years_found) if years_found.count(y) > 1]
    if dupes:
        raise ValueError(f"{pdf_path.name}: fiscal year(s) {sorted(dupes)} appear twice")

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

    # The window of fiscal years this PDF covers slides forward each year
    # (it was R03-R07, it is now R04-R08), so read it from the sub-header row
    # rather than hardcoding. Each month repeats the same year labels, so the
    # block length is the distance to the first repeat of the first label.
    sub = [parse_fiscal_year_header(c) for c in table[1][1:]]
    if not sub or sub[0] is None:
        raise ValueError(f"{pdf_path.name}: could not read year sub-headers")
    year_order = [sub[0]]
    for label in sub[1:]:
        if label == sub[0]:
            break
        if label is not None:
            year_order.append(label)
    n_years = len(year_order)
    # 12 months + a 合計 block, all n_years wide.
    if len(table[0]) < 1 + 13 * n_years:
        raise ValueError(
            f"{pdf_path.name}: {n_years} years needs ≥{1 + 13 * n_years} cols, "
            f"got {len(table[0])}"
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
            for y_idx, fiscal_year in enumerate(year_order):
                col = 1 + n_years * m_idx + y_idx
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

    # Read the covered fiscal years from the header row; the ministry appends a
    # new one each year (H20-R07 became H20-R08), and the trailing one is a
    # partial year-to-date figure.
    header = table[0]
    n_groups = (len(header) - 1) // 3
    year_order = [parse_fiscal_year_header(header[1 + 3 * i]) for i in range(n_groups)]
    if not any(y is not None for y in year_order):
        raise ValueError(f"{pdf_path.name}: could not read year headers")

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

        for y_idx, cal_year in enumerate(year_order):
            if cal_year is None:
                continue
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

    # Keep the month-level archive as its own file. The summary PDF below reports
    # only fiscal-year totals, so this is the sole source able to answer "how did
    # the same months of an earlier year compare" — the only fair way to read a
    # year that is still running.
    if injury_frames:
        monthly = pd.concat(injury_frames, ignore_index=True)
        out = ENV_RAW / "injuries_monthly.csv"
        monthly.to_csv(out, index=False)
        yrs = sorted(monthly["year"].unique())
        print(f"[wrote]    {out.name} ({len(monthly):,} rows, FY{yrs[0]}-FY{yrs[-1]})")

    # The per-year monthly PDFs above are the archive. The current summary PDF is
    # authoritative and now covers every fiscal year since 2008, so where the two
    # overlap the summary wins and the monthly frames only fill gaps.
    current_injury = ENV_RAW / "injury-qe.pdf"
    if current_injury.exists():
        year_df = extract_injury_year_table(current_injury)
        covered = sorted(year_df["year"].unique())
        print(
            f"[injuries] {current_injury.name} → FY{covered[0]}-FY{covered[-1]} "
            f"(by-year summary, supersedes monthly PDFs)"
        )
        superseded = set(covered)
        kept = [f for f in injury_frames if f["year"].iloc[0] not in superseded]
        # Monthly frames carry month/calendar_year columns the summary lacks;
        # concat aligns on the union and leaves them null for summary rows.
        injury_frames = kept + [year_df]

    if injury_frames:
        all_injuries = pd.concat(injury_frames, ignore_index=True)
        out = ENV_RAW / "injuries.csv"
        all_injuries.to_csv(out, index=False)
        by_year = all_injuries.groupby("year")[["victims", "deaths"]].sum()
        print(f"[wrote]    {out.name} ({len(all_injuries):,} rows)")
        print(
            f"[injuries] national totals FY{by_year.index.min()}-FY{by_year.index.max()}: "
            f"latest = {int(by_year['victims'].iloc[-1])} injured, "
            f"{int(by_year['deaths'].iloc[-1])} killed"
        )

    # --- Sightings (single multi-year PDF) ---
    sightings_pdf = ENV_RAW / "syutubotu.pdf"
    if sightings_pdf.exists():
        df = extract_sightings_pdf(sightings_pdf)
        yrs = sorted(df["year"].unique())
        print(f"[sightings] {sightings_pdf.name} → FY{yrs[0]}-FY{yrs[-1]} ({len(yrs)} years)")
        out = ENV_RAW / "sightings.csv"
        df.to_csv(out, index=False)
        print(f"[wrote]    {out.name} ({len(df):,} rows)")

    # --- Captures (single multi-year PDF, yearly) ---
    captures_pdf = ENV_RAW / "capture-qe.pdf"
    if captures_pdf.exists():
        df = extract_captures_pdf(captures_pdf)
        yrs = sorted(df["year"].unique())
        print(f"[captures] {captures_pdf.name} → FY{yrs[0]}-FY{yrs[-1]} ({len(yrs)} years)")
        out = ENV_RAW / "captures.csv"
        df.to_csv(out, index=False)
        print(f"[wrote]    {out.name} ({len(df):,} rows)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
