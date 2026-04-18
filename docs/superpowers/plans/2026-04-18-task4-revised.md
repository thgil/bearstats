# Task 4 (REVISED) — env.go.jp PDF extractor

Original Task 4 in `2026-04-18-bearstats-data-pipeline.md` assumed all three env.go.jp PDFs share the same 47-prefecture × 12-month shape. That was wrong. Reality (discovered 2026-04-18):

- **Injury PDFs:** 39 prefectures (Kyushu + Okinawa absent — no bears there). Prefecture names abbreviated (`青森`, not `青森県`; Hokkaido keeps full form). Each month has 3 sub-columns: incidents (件数), victims (被害者数), deaths (死亡者数). Plus 3 total columns at the end. Shape: 44 rows × 40 cols.
- **Sightings PDF (`syutubotu.pdf`):** 5 fiscal years (R03-R07 = 2021-2025) in one file. Shape: 42 rows × 66 cols. Structure: prefecture + (12 months × 5 years) + year totals.
- **Captures PDF (`capture-qe.pdf`):** 18 fiscal years (H20-R07 = 2008-2025) in one file. Yearly granularity (NOT monthly). Each year has 3 sub-columns: total (計), culled (捕殺), non-killed (非捕殺). Shape: 39 rows × 55 cols. Plus a secondary species-breakdown table.

This task replaces the single `extract_injury_pdf` with three parsers.

## State of partial work

Previous implementer created:
- `data-pipeline/extract_env_go_jp.py` — has working `era_code_to_calendar_year`, `_era_code_from_filename`, `PREFECTURE_ORDER_JA`, `PREFECTURE_KEYS` (keep all of these). `extract_injury_pdf` exists but is wrong (assumes 47 prefs × 12 month values); replace it.
- `data-pipeline/tests/test_extract_env_go_jp.py` — first 5 tests pass (era + prefecture list). The 3 `extract_injury_pdf` tests are wrong for the new structure; replace them.
- `data-pipeline/tests/fixtures/r07injury-sample.pdf` — keep. We'll also use the real `syutubotu.pdf` and `capture-qe.pdf` from `raw/env/` as test fixtures (copy them into `tests/fixtures/`).

**Nothing is committed yet.** Work is in the working tree.

## New constants to add

```python
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
PDF_TO_LONG_NAME = {
    short: long
    for short in PREFECTURE_NAMES_IN_PDF
    for long in [
        next(p for p in PREFECTURE_ORDER_JA if p == short or p.rstrip("県都府") == short)
    ]
}
assert len(PDF_TO_LONG_NAME) == 39
assert PDF_TO_LONG_NAME["青森"] == "青森県"
assert PDF_TO_LONG_NAME["北海道"] == "北海道"

# Fiscal month order: Apr=1st, ..., Mar=12th (in reading order of PDFs)
_FISCAL_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
```

## Parser 1: `extract_injury_pdf(pdf_path, fiscal_year) -> DataFrame`

Parses one fiscal year's injury PDF. Returns long-form DataFrame:

```
columns: prefecture_ja (long), prefecture_key, year (fiscal), calendar_year, month, incidents, victims, deaths
```

39 prefs × 12 months = 468 rows per fiscal year.

Implementation:

```python
def extract_injury_pdf(pdf_path: Path, fiscal_year: int) -> pd.DataFrame:
    """Parse one env.go.jp injury PDF into long-form per-prefecture-per-month."""
    with pdfplumber.open(pdf_path) as pdf:
        tables = []
        for page in pdf.pages:
            tables.extend(page.extract_tables() or [])

    if not tables:
        raise ValueError(f"no tables found in {pdf_path.name}")

    # Injury PDFs have one table of shape 44 × 40:
    #   rows 0-3: headers (区分, month names, sub-labels)
    #   rows 4-42: 39 prefecture data rows
    #   row 43: 計 (national total)
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
```

Tests:

```python
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
    """Sanity: R07 is the unprecedented year; national deaths should be ~13."""
    df = extract_injury_pdf(FIXTURES / "r07injury-sample.pdf", fiscal_year=2025)
    # Sum per month ignores the "計" total row we filtered out.
    total_deaths = df["deaths"].sum()
    assert total_deaths >= 10, f"expected ≥10 deaths in FY2025, got {total_deaths}"
```

## Parser 2: `extract_sightings_pdf(pdf_path) -> DataFrame`

Parses the multi-year sightings PDF. Returns long-form:

```
columns: prefecture_ja, prefecture_key, year (fiscal), calendar_year, month, value
```

39 prefs × 12 months × 5 years = 2,340 rows.

The sightings PDF structure (from direct inspection):
- Row 0: month headers ('4月', '5月', ..., '3月') spanning 5 sub-cells each
- Row 1: year sub-headers ('R03', 'R04', 'R05', 'R06', 'R07') × 12 months + more
- Rows 2-40: 39 prefecture rows
- Row 41: 計 total row
- Column layout: col 0 = prefecture; cols 1-60 = 12 months × 5 years of values; cols 61-65 = per-year yearly totals; possibly col 66 = grand total (verify by reading row 41)
- Cell for prefecture P, month M (1=Apr..12=Mar), year Y (0=R03..4=R07): `col = 1 + 5*(M-1) + Y`

Years: R03=2021, R04=2022, R05=2023, R06=2024, R07=2025.

```python
_SIGHTINGS_YEAR_ORDER = [2021, 2022, 2023, 2024, 2025]  # R03-R07

def extract_sightings_pdf(pdf_path: Path) -> pd.DataFrame:
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
            for y_idx, cal_year in enumerate(_SIGHTINGS_YEAR_ORDER):
                col = 1 + 5 * m_idx + y_idx
                if col >= len(row):
                    raise ValueError(f"{pdf_path.name}: col {col} out of bounds for {first}")
                value = _clean_cell(row[col])
                fiscal_year = cal_year if month >= 4 else cal_year - 1
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
```

**IMPORTANT:** Before implementing, run a quick inspection in the test fixture to verify the column layout:

```python
import pdfplumber
with pdfplumber.open("tests/fixtures/syutubotu-sample.pdf") as pdf:
    tables = pdf.pages[0].extract_tables()
table = tables[0]
# Print a known prefecture row (e.g. 岩手, Iwate — should have large sightings numbers)
for i, row in enumerate(table):
    if (row[0] or "").strip() == "岩手":
        print(f"row {i}, {len(row)} cols:", row)
        break
```

If the column arithmetic `1 + 5 * m_idx + y_idx` doesn't match the actual cell values for 岩手 in R07 (should be a big number — tens of thousands for sightings), **STOP and report the actual row layout** instead of guessing.

Tests:

```python
def test_extract_sightings_pdf_returns_39_x_12_x_5():
    df = extract_sightings_pdf(FIXTURES / "syutubotu-sample.pdf")
    assert len(df) == 39 * 12 * 5

def test_extract_sightings_pdf_years_cover_r03_to_r07():
    df = extract_sightings_pdf(FIXTURES / "syutubotu-sample.pdf")
    assert sorted(df["year"].unique()) == [2020, 2021, 2022, 2023, 2024, 2025] or \
           sorted(df["year"].unique()) == [2021, 2022, 2023, 2024, 2025]
    # (Depending on how Jan-Mar is labeled — fiscal year is 2020 for Jan-Mar of R03=2021)

def test_extract_sightings_pdf_2025_iwate_is_high():
    """Iwate's FY2025 sightings should be in the thousands per month."""
    df = extract_sightings_pdf(FIXTURES / "syutubotu-sample.pdf")
    iwate_2025 = df[(df["prefecture_ja"] == "岩手県") & (df["year"] == 2025)]
    assert iwate_2025["value"].sum() > 1000
```

## Parser 3: `extract_captures_pdf(pdf_path) -> DataFrame`

Parses the multi-year captures PDF. Returns long-form:

```
columns: prefecture_ja, prefecture_key, year (fiscal), total, culled, non_killed
```

39 prefs × 18 years = 702 rows (no month dimension — yearly only).

Captures PDF structure:
- Primary table: 39 rows × 55 cols + species breakdown (ignore the species breakdown — Task 4 doesn't need it)
- Row 0: year headers ('Ｈ２０年度', 'Ｈ２１年度', ..., 'R07年度') — each spans 3 sub-cells
- Row 1: sub-headers ('計', '捕殺', '非捕殺')
- Rows 2+: prefecture data
- Year index Y (0=H20/2008..17=R07/2025): `col = 1 + 3*Y, 2 + 3*Y, 3 + 3*Y` for total/culled/non_killed

Year mapping helper:

```python
_CAPTURES_YEAR_ORDER = list(range(2008, 2026))  # H20..R07
assert len(_CAPTURES_YEAR_ORDER) == 18
```

```python
def extract_captures_pdf(pdf_path: Path) -> pd.DataFrame:
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
                raise ValueError(f"{pdf_path.name}: col {base+2} out of bounds")
            rows.append({
                "prefecture_ja": long_name,
                "prefecture_key": key,
                "year": cal_year,  # fiscal year = calendar start year
                "total": _clean_cell(row[base]),
                "culled": _clean_cell(row[base + 1]),
                "non_killed": _clean_cell(row[base + 2]),
            })

    missing = set(PREFECTURE_NAMES_IN_PDF) - seen
    if missing:
        raise ValueError(f"{pdf_path.name}: missing: {sorted(missing)}")
    return pd.DataFrame(rows)
```

Same caution: if the col arithmetic doesn't produce sensible values (e.g., Hokkaido's 2008 total is 355 per the sample we inspected), stop and report.

Tests:

```python
def test_extract_captures_pdf_returns_39_x_18():
    df = extract_captures_pdf(FIXTURES / "capture-sample.pdf")
    assert len(df) == 39 * 18

def test_extract_captures_pdf_hokkaido_2008_total_is_355():
    """Known value from inspection: Hokkaido H20 (2008) total captures = 355."""
    df = extract_captures_pdf(FIXTURES / "capture-sample.pdf")
    hok_2008 = df[(df["prefecture_ja"] == "北海道") & (df["year"] == 2008)]
    assert len(hok_2008) == 1
    assert hok_2008["total"].iloc[0] == 355

def test_extract_captures_pdf_totals_add_up():
    """For every row, total = culled + non_killed (within rounding)."""
    df = extract_captures_pdf(FIXTURES / "capture-sample.pdf")
    # Allow small discrepancies — some years may have reporting mismatches
    mismatches = (df["total"] - (df["culled"] + df["non_killed"])).abs()
    assert mismatches.max() <= 2  # Most rows should match exactly; tolerate minor PDF parsing slop
```

## main() orchestrator (replaces old main)

```python
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
```

## Steps for implementer

1. **Copy the two additional fixture PDFs:**
   ```bash
   cp ~/Projects/bearstats/data-pipeline/raw/env/syutubotu.pdf \
      ~/Projects/bearstats/data-pipeline/tests/fixtures/syutubotu-sample.pdf
   cp ~/Projects/bearstats/data-pipeline/raw/env/capture-qe.pdf \
      ~/Projects/bearstats/data-pipeline/tests/fixtures/capture-sample.pdf
   ```

2. **Replace `extract_env_go_jp.py`** with the corrected implementation (keep `era_code_to_calendar_year`, `PREFECTURE_ORDER_JA`, `PREFECTURE_KEYS`; add new constants; add three parsers; replace `main()`).

3. **Replace `tests/test_extract_env_go_jp.py`** with:
   - The 5 existing passing tests (era codes + prefecture list)
   - New tests for each of the three parsers (listed above)

4. **Verify each parser against the actual PDFs before committing.** Before full test runs, do a quick data-sanity print:
   ```python
   # After implementing extract_sightings_pdf
   from extract_env_go_jp import extract_sightings_pdf
   df = extract_sightings_pdf(Path("tests/fixtures/syutubotu-sample.pdf"))
   print(df[df["prefecture_ja"] == "岩手県"].groupby("calendar_year")["value"].sum())
   # Expected: numbers in the thousands, rising toward 2025.
   ```
   If the numbers look wrong, the column layout is off — stop and report.

5. **Run all tests:**
   ```bash
   cd ~/Projects/bearstats/data-pipeline && .venv/bin/pytest tests/test_extract_env_go_jp.py -v
   ```
   Expected: all tests pass (5 existing + roughly 10 new = ~15 tests).

6. **Run the extractor end-to-end:**
   ```bash
   .venv/bin/python extract_env_go_jp.py
   ```
   Expected:
   - `[injuries] ... → FY2016` through `FY2025` (10 frames)
   - `[sightings] syutubotu.pdf → 5 years`
   - `[captures] capture-qe.pdf → 18 years`
   - Three CSVs written: `injuries.csv` (4,680 rows), `sightings.csv` (2,340 rows), `captures.csv` (702 rows).

7. **Spot-check the output:**
   ```bash
   .venv/bin/python -c "
   import pandas as pd
   inj = pd.read_csv('raw/env/injuries.csv')
   print('Injuries by year (national):')
   print(inj.groupby('year')[['incidents','victims','deaths']].sum())
   sig = pd.read_csv('raw/env/sightings.csv')
   print('\nSightings by year (national):')
   print(sig.groupby('year')['value'].sum())
   "
   ```
   Expected: FY2025 numbers should dwarf prior years (sightings ~47k, deaths ~13).

8. **Commit:**
   ```bash
   cd ~/Projects/bearstats
   git add data-pipeline/extract_env_go_jp.py \
           data-pipeline/tests/test_extract_env_go_jp.py \
           data-pipeline/tests/fixtures/r07injury-sample.pdf \
           data-pipeline/tests/fixtures/syutubotu-sample.pdf \
           data-pipeline/tests/fixtures/capture-sample.pdf \
           docs/superpowers/plans/2026-04-18-task4-revised.md \
           docs/superpowers/specs/2026-04-18-bearstats-design.md
   git commit -m "feat(pipeline): extract env.go.jp PDFs (injury/sightings/captures) with real shape"
   ```

## Report format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED
- Tests: X/Y passing (list any that failed with errors)
- CSVs produced and row counts
- Spot-check output (FY2025 sightings/injuries/deaths totals)
- Any PDF-parsing surprises encountered
- Self-review findings
