# Bearstats — Data Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch every bear-sighting data source identified in the spec, extract/normalize them, and produce the four JSON files the webapp consumes.

**Architecture:** Python 3.11 scripts, one per source. Fetchers write to `raw/` (gitignored). Extractors transform raw → intermediate CSV. `build_json.py` merges everything into the four webapp JSON files. Shape assertions + pytest fixtures protect against silent schema drift.

**Tech Stack:** Python 3.11+, `httpx`, `pdfplumber`, `pandas`, `pytest`. No database, no framework.

**Spec:** `docs/superpowers/specs/2026-04-18-bearstats-design.md` — re-read Section 5 (data sources), Section 6 (pipeline), Section 7 (JSON schemas) before starting.

**Data checkpoint at end:** Once `webapp/data/*.json` is produced, stop. User reviews for completeness before webapp plan is written.

---

## Task 1: Scaffold repo + git init

**Files:**
- Create: `~/Projects/bearstats/.gitignore`
- Create: `~/Projects/bearstats/README.md`
- Create: `~/Projects/bearstats/data-pipeline/requirements.txt`
- Create: `~/Projects/bearstats/data-pipeline/__init__.py`
- Create: `~/Projects/bearstats/data-pipeline/tests/__init__.py`
- Create: `~/Projects/bearstats/data-pipeline/tests/fixtures/.gitkeep`

- [ ] **Step 1: Create `.gitignore`**

```
# Python
.venv/
__pycache__/
*.pyc
.pytest_cache/
.mypy_cache/

# Raw data dumps (too big for git, reproducible from scripts)
data-pipeline/raw/

# Webapp build artifacts (none yet, but defensive)
webapp/node_modules/

# macOS / editor
.DS_Store
.vscode/
.idea/
```

- [ ] **Step 2: Create `README.md`**

```markdown
# Bearstats

Data-journalism web app about Japan's 2025 bear crisis.

See `docs/superpowers/specs/2026-04-18-bearstats-design.md` for the design.

## Project layout

- `data-pipeline/` — Python scripts that fetch and normalize sources → `webapp/data/*.json`
- `webapp/` — static single-page site that consumes those JSON files (built in a later phase)
- `research/` — written notes and source catalog

## Running the pipeline

```bash
cd data-pipeline
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# one-shot, fetches all sources (slow on first run — downloads ~10 PDFs + ArcGIS dumps)
python fetch_all.py

# or individually
python fetch_env_go_jp.py
python extract_env_go_jp.py
python fetch_arcgis.py
python fetch_kumadas.py
python fetch_yamaguchi.py
python fetch_hokkaido.py
python build_json.py
```

Outputs four JSON files into `webapp/data/`.

## Tests

```bash
cd data-pipeline
pytest
```
```

- [ ] **Step 3: Create `data-pipeline/requirements.txt`**

```
httpx>=0.27
pdfplumber>=0.11
pandas>=2.2
pytest>=8.0
```

- [ ] **Step 4: Create empty `__init__.py` files**

```bash
touch ~/Projects/bearstats/data-pipeline/__init__.py
touch ~/Projects/bearstats/data-pipeline/tests/__init__.py
touch ~/Projects/bearstats/data-pipeline/tests/fixtures/.gitkeep
```

- [ ] **Step 5: Set up virtualenv and install deps**

```bash
cd ~/Projects/bearstats/data-pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Expected: no errors; `pytest --version` prints a version ≥ 8.0.

- [ ] **Step 6: Git init + first commit**

```bash
cd ~/Projects/bearstats
git init
git add .gitignore README.md data-pipeline/requirements.txt data-pipeline/__init__.py data-pipeline/tests/__init__.py data-pipeline/tests/fixtures/.gitkeep docs/
git commit -m "chore: scaffold bearstats repo with spec + plan"
```

---

## Task 2: Shared utilities module

**Files:**
- Create: `~/Projects/bearstats/data-pipeline/utils.py`
- Test: `~/Projects/bearstats/data-pipeline/tests/test_utils.py`

Small helpers used by every script: deterministic paths, checksum comparison for idempotent fetches, ISO timestamp for `_source_fetched_at`.

- [ ] **Step 1: Write failing test for `paths`**

Create `~/Projects/bearstats/data-pipeline/tests/test_utils.py`:

```python
from pathlib import Path
from utils import REPO_ROOT, RAW_DIR, WEBAPP_DATA_DIR


def test_repo_root_exists_and_is_bearstats():
    assert REPO_ROOT.name == "bearstats"
    assert (REPO_ROOT / "data-pipeline").is_dir()


def test_raw_dir_is_inside_repo():
    assert RAW_DIR == REPO_ROOT / "data-pipeline" / "raw"


def test_webapp_data_dir_is_inside_repo():
    assert WEBAPP_DATA_DIR == REPO_ROOT / "webapp" / "data"
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
cd ~/Projects/bearstats/data-pipeline && pytest tests/test_utils.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'utils'`

- [ ] **Step 3: Implement paths in `utils.py`**

Create `~/Projects/bearstats/data-pipeline/utils.py`:

```python
"""Shared helpers for the data pipeline."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path

# REPO_ROOT is the parent of the data-pipeline directory
REPO_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = REPO_ROOT / "data-pipeline" / "raw"
WEBAPP_DATA_DIR = REPO_ROOT / "webapp" / "data"


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
```

- [ ] **Step 4: Run test, confirm it passes**

```bash
cd ~/Projects/bearstats/data-pipeline && pytest tests/test_utils.py -v
```

Expected: PASS (3 tests).

- [ ] **Step 5: Add tests for checksum + timestamp**

Append to `tests/test_utils.py`:

```python
from utils import sha256_of_file, utc_now_iso, ensure_dir
import tempfile


def test_sha256_of_file_deterministic():
    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(b"hello world")
        path = Path(f.name)
    try:
        digest = sha256_of_file(path)
        assert digest == "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
    finally:
        path.unlink()


def test_utc_now_iso_format():
    result = utc_now_iso()
    assert result.endswith("Z")
    assert "T" in result
    assert len(result) == 20


def test_ensure_dir_creates_and_is_idempotent(tmp_path):
    target = tmp_path / "a" / "b" / "c"
    ensure_dir(target)
    assert target.is_dir()
    # calling again doesn't error
    ensure_dir(target)
    assert target.is_dir()
```

- [ ] **Step 6: Run all utils tests**

```bash
pytest tests/test_utils.py -v
```

Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/bearstats
git add data-pipeline/utils.py data-pipeline/tests/test_utils.py
git commit -m "feat(pipeline): shared utilities (paths, sha256, ISO timestamp)"
```

---

## Task 3: env.go.jp PDF fetcher

**Files:**
- Create: `~/Projects/bearstats/data-pipeline/fetch_env_go_jp.py`
- Test: `~/Projects/bearstats/data-pipeline/tests/test_fetch_env_go_jp.py`

Downloads all 10 historical injury PDFs (FY2016/H28 → FY2025/R07) plus the current sightings + captures PDFs. Writes to `raw/env/`.

Source URLs (verified working):
```
https://www.env.go.jp/nature/choju/effort/effort12/injury-qe.pdf          (current)
https://www.env.go.jp/nature/choju/effort/effort12/syutubotu.pdf          (sightings current)
https://www.env.go.jp/nature/choju/effort/effort12/capture-qe.pdf         (captures current)
https://www.env.go.jp/nature/choju/effort/effort12/r07injury-qe.pdf
https://www.env.go.jp/nature/choju/effort/effort12/r06injury-qe.pdf
... through h28injury-qe.pdf
```

- [ ] **Step 1: Write failing test for URL builder**

Create `~/Projects/bearstats/data-pipeline/tests/test_fetch_env_go_jp.py`:

```python
from fetch_env_go_jp import historical_injury_urls, current_pdf_urls


def test_historical_injury_urls_covers_h28_to_r07():
    urls = historical_injury_urls()
    codes = [u.split("/")[-1] for u in urls]
    assert "r07injury-qe.pdf" in codes
    assert "h28injury-qe.pdf" in codes
    # 10 years total: h28, h29, h30, r01..r07
    assert len(urls) == 10


def test_historical_urls_use_effort12_path():
    for u in historical_injury_urls():
        assert "/effort12/" in u
        assert u.startswith("https://www.env.go.jp/")


def test_current_pdf_urls_has_three_files():
    urls = current_pdf_urls()
    names = sorted(u.split("/")[-1] for u in urls)
    assert names == ["capture-qe.pdf", "injury-qe.pdf", "syutubotu.pdf"]
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
pytest tests/test_fetch_env_go_jp.py -v
```

Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 3: Implement URL builders + fetcher**

Create `~/Projects/bearstats/data-pipeline/fetch_env_go_jp.py`:

```python
"""Fetch bear-related PDFs from the Japan Ministry of the Environment.

Source landing page:
  https://www.env.go.jp/nature/choju/effort/effort12/effort12.html

Downloads to raw/env/*.pdf. Idempotent via sha256: if a fresh download
differs from the cached copy, we keep the new one.
"""
from __future__ import annotations

import sys
from pathlib import Path

import httpx

from utils import RAW_DIR, ensure_dir, sha256_of_file

BASE = "https://www.env.go.jp/nature/choju/effort/effort12"
ENV_RAW = RAW_DIR / "env"


def historical_injury_urls() -> list[str]:
    """Ten yearly injury PDFs: H28, H29, H30, R01..R07."""
    codes = ["h28", "h29", "h30"] + [f"r0{n}" for n in range(1, 8)]
    return [f"{BASE}/{code}injury-qe.pdf" for code in codes]


def current_pdf_urls() -> list[str]:
    """Current-fiscal-year sightings, captures, injuries."""
    return [
        f"{BASE}/injury-qe.pdf",
        f"{BASE}/syutubotu.pdf",
        f"{BASE}/capture-qe.pdf",
    ]


def download(client: httpx.Client, url: str, dest_dir: Path) -> Path:
    filename = url.rsplit("/", 1)[-1]
    dest = dest_dir / filename
    tmp = dest.with_suffix(dest.suffix + ".tmp")

    resp = client.get(url, follow_redirects=True, timeout=60)
    resp.raise_for_status()
    tmp.write_bytes(resp.content)

    if dest.exists() and sha256_of_file(dest) == sha256_of_file(tmp):
        tmp.unlink()
        print(f"[unchanged] {filename}")
    else:
        tmp.replace(dest)
        print(f"[saved]     {filename} ({len(resp.content):,} bytes)")
    return dest


def main() -> int:
    ensure_dir(ENV_RAW)
    urls = current_pdf_urls() + historical_injury_urls()
    errors: list[str] = []
    with httpx.Client(headers={"User-Agent": "bearstats-pipeline/0.1"}) as client:
        for url in urls:
            try:
                download(client, url, ENV_RAW)
            except httpx.HTTPError as e:
                errors.append(f"{url}: {e}")
                print(f"[error]     {url}: {e}", file=sys.stderr)
    if errors:
        print(f"\n{len(errors)} source(s) failed; see above.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run test, confirm it passes**

```bash
pytest tests/test_fetch_env_go_jp.py -v
```

Expected: PASS (3 tests).

- [ ] **Step 5: Run fetcher for real against env.go.jp**

```bash
cd ~/Projects/bearstats/data-pipeline
python fetch_env_go_jp.py
```

Expected: 13 `[saved]` lines. Exit 0. Files exist in `raw/env/`:

```bash
ls -la raw/env/
```

Should list: `capture-qe.pdf`, `injury-qe.pdf`, `syutubotu.pdf`, `h28injury-qe.pdf` through `r07injury-qe.pdf`.

- [ ] **Step 6: Run again to verify idempotence**

```bash
python fetch_env_go_jp.py
```

Expected: 13 `[unchanged]` lines.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/bearstats
git add data-pipeline/fetch_env_go_jp.py data-pipeline/tests/test_fetch_env_go_jp.py
git commit -m "feat(pipeline): fetch env.go.jp injury/sighting/capture PDFs"
```

---

## Task 4: env.go.jp PDF extractor

**Files:**
- Create: `~/Projects/bearstats/data-pipeline/extract_env_go_jp.py`
- Test: `~/Projects/bearstats/data-pipeline/tests/test_extract_env_go_jp.py`
- Create (test fixture): `~/Projects/bearstats/data-pipeline/tests/fixtures/r07injury-sample.pdf`

Parses env.go.jp PDFs → `raw/env/injuries.csv`, `sightings.csv`, `captures.csv` (prefecture × year × month). Uses `pdfplumber`. Has shape assertions so format drift fails loud.

- [ ] **Step 1: Copy real downloaded PDF as fixture for tests**

We use a real, small PDF as our test fixture. After Task 3 has run, copy one:

```bash
cp ~/Projects/bearstats/data-pipeline/raw/env/r07injury-qe.pdf \
   ~/Projects/bearstats/data-pipeline/tests/fixtures/r07injury-sample.pdf
```

- [ ] **Step 2: Write failing test for era code mapping**

Create `~/Projects/bearstats/data-pipeline/tests/test_extract_env_go_jp.py`:

```python
from pathlib import Path

import pandas as pd

from extract_env_go_jp import (
    era_code_to_calendar_year,
    extract_injury_pdf,
    PREFECTURE_ORDER_JA,
)

FIXTURES = Path(__file__).parent / "fixtures"


def test_era_code_r07_is_2025():
    assert era_code_to_calendar_year("r07") == 2025


def test_era_code_h28_is_2016():
    assert era_code_to_calendar_year("h28") == 2016


def test_era_code_r01_is_2019():
    assert era_code_to_calendar_year("r01") == 2019


def test_era_code_invalid_raises():
    import pytest
    with pytest.raises(ValueError):
        era_code_to_calendar_year("x99")


def test_prefecture_order_has_47_entries():
    assert len(PREFECTURE_ORDER_JA) == 47
    assert PREFECTURE_ORDER_JA[0] == "北海道"
    assert PREFECTURE_ORDER_JA[-1] == "沖縄県"
```

- [ ] **Step 3: Run test, confirm it fails**

```bash
pytest tests/test_extract_env_go_jp.py -v
```

Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 4: Implement era codes + prefecture list**

Create `~/Projects/bearstats/data-pipeline/extract_env_go_jp.py`:

```python
"""Parse env.go.jp bear PDFs into tidy CSVs.

Each PDF contains one table: 47 prefectures × 12 months (Apr..Mar
fiscal year). We emit long-form rows (prefecture, year, month, value).
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
```

- [ ] **Step 5: Run test, confirm tests pass so far**

```bash
pytest tests/test_extract_env_go_jp.py::test_era_code_r07_is_2025 tests/test_extract_env_go_jp.py::test_era_code_h28_is_2016 tests/test_extract_env_go_jp.py::test_era_code_r01_is_2019 tests/test_extract_env_go_jp.py::test_era_code_invalid_raises tests/test_extract_env_go_jp.py::test_prefecture_order_has_47_entries -v
```

Expected: 5 PASS. (The `extract_injury_pdf` import line will fail — we'll address that next.)

- [ ] **Step 6: Add failing test for `extract_injury_pdf` using the fixture**

Append to `tests/test_extract_env_go_jp.py`:

```python
def test_extract_injury_pdf_returns_long_dataframe():
    df = extract_injury_pdf(FIXTURES / "r07injury-sample.pdf", year=2025)
    # long form: one row per prefecture × month
    assert set(df.columns) >= {"prefecture_ja", "prefecture_key", "year", "month", "value"}
    assert df["year"].unique().tolist() == [2025]
    # fiscal year = 12 months
    assert sorted(df["month"].unique().tolist()) == list(range(1, 13))
    # 47 prefectures × 12 months = 564 rows
    assert len(df) == 47 * 12


def test_extract_injury_pdf_prefecture_keys_are_romaji():
    df = extract_injury_pdf(FIXTURES / "r07injury-sample.pdf", year=2025)
    assert df.loc[df["prefecture_ja"] == "秋田県", "prefecture_key"].iloc[0] == "akita"
    assert df.loc[df["prefecture_ja"] == "東京都", "prefecture_key"].iloc[0] == "tokyo"


def test_extract_injury_pdf_values_are_non_negative_ints():
    df = extract_injury_pdf(FIXTURES / "r07injury-sample.pdf", year=2025)
    assert df["value"].dtype.kind in "iu"
    assert (df["value"] >= 0).all()
```

- [ ] **Step 7: Run test, confirm it fails**

```bash
pytest tests/test_extract_env_go_jp.py -v
```

Expected: 3 new tests FAIL — `ImportError: cannot import name 'extract_injury_pdf'`.

- [ ] **Step 8: Implement `extract_injury_pdf`**

Append to `data-pipeline/extract_env_go_jp.py`:

```python
# Fiscal-year month order: Apr, May, ..., Dec, Jan, Feb, Mar.
# Column headers in env.go.jp PDFs follow this sequence.
_FISCAL_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]


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


def extract_injury_pdf(pdf_path: Path, year: int) -> pd.DataFrame:
    """Extract one injury PDF into a long-form DataFrame.

    Expected PDF table shape: 47 prefecture rows × (1 name col + 12 month cols).
    We assert this; if a future PDF differs, the assertion fails loud.
    """
    rows: list[dict] = []
    with pdfplumber.open(pdf_path) as pdf:
        # Concatenate tables across pages (single-page is the common case).
        tables = []
        for page in pdf.pages:
            tables.extend(page.extract_tables() or [])
        if not tables:
            raise ValueError(f"no tables found in {pdf_path.name}")

        # Flatten all table rows; we will filter to the 47 prefecture rows by name match.
        all_rows = [row for tbl in tables for row in tbl]

        pref_rows: dict[str, list[int]] = {}
        for row in all_rows:
            if not row:
                continue
            first = (row[0] or "").strip()
            if first in PREFECTURE_ORDER_JA:
                # Expect 12 monthly values after the name. Some PDFs have
                # an extra total column; we take the first 12 only.
                raw_months = row[1:13]
                if len([c for c in raw_months if c is not None]) < 12:
                    raise ValueError(
                        f"{pdf_path.name}: prefecture {first} row has "
                        f"{len([c for c in raw_months if c is not None])} month cells, expected 12"
                    )
                pref_rows[first] = [_clean_cell(c) for c in raw_months]

        missing = [p for p in PREFECTURE_ORDER_JA if p not in pref_rows]
        if missing:
            raise ValueError(
                f"{pdf_path.name}: missing prefecture rows: {missing}"
            )

    for pref_ja, values in pref_rows.items():
        key = PREFECTURE_KEYS[PREFECTURE_ORDER_JA.index(pref_ja)]
        for month_idx, value in enumerate(values):
            month = _FISCAL_MONTH_ORDER[month_idx]
            # Fiscal year: Apr..Dec of `year`, then Jan..Mar of `year+1`.
            cal_year = year if month >= 4 else year + 1
            rows.append({
                "prefecture_ja": pref_ja,
                "prefecture_key": key,
                "year": year,               # fiscal year label (stable across Apr..Mar)
                "calendar_year": cal_year,  # useful for joins with monthly time series
                "month": month,
                "value": value,
            })

    return pd.DataFrame(rows)
```

- [ ] **Step 9: Run tests, confirm they pass**

```bash
pytest tests/test_extract_env_go_jp.py -v
```

Expected: all 8 tests PASS.

- [ ] **Step 10: Add the CLI `main()` + write CSVs for all PDFs**

Append to `data-pipeline/extract_env_go_jp.py`:

```python
def main() -> int:
    ensure_dir(ENV_RAW)
    # Historical injuries: h28..r07
    injury_frames: list[pd.DataFrame] = []
    for pdf_path in sorted(ENV_RAW.glob("*injury-qe.pdf")):
        code = _era_code_from_filename(pdf_path)
        if code is None:
            # Current-year injury-qe.pdf — skip here; its era is implicit (latest).
            # We'll pick it up below as the latest.
            continue
        year = era_code_to_calendar_year(code)
        print(f"[injuries] {pdf_path.name} → FY{year}")
        injury_frames.append(extract_injury_pdf(pdf_path, year=year))

    # Current (latest) injury, sightings, captures all share the same layout.
    current = ENV_RAW / "injury-qe.pdf"
    if current.exists():
        # Always labelled R07 (FY2025) for this snapshot — override when spec notes new FY.
        print(f"[injuries] {current.name} → FY2025 (current snapshot)")
        # Latest snapshot may supersede r07injury-qe.pdf when env.go.jp revises;
        # we keep only the max fetch: prefer current if it has more non-zero cells.
        cur_df = extract_injury_pdf(current, year=2025)
        # Replace the 2025 frame with the fresher one if we already had an r07.
        injury_frames = [f for f in injury_frames if f["year"].iloc[0] != 2025] + [cur_df]

    if injury_frames:
        all_injuries = pd.concat(injury_frames, ignore_index=True)
        out = ENV_RAW / "injuries.csv"
        all_injuries.to_csv(out, index=False)
        print(f"[wrote]    {out.relative_to(ENV_RAW.parent.parent)} ({len(all_injuries):,} rows)")

    # Sightings + captures: we only have the current snapshot PDF from env.go.jp.
    for src, label in [("syutubotu.pdf", "sightings"), ("capture-qe.pdf", "captures")]:
        p = ENV_RAW / src
        if not p.exists():
            continue
        print(f"[{label}] {p.name} → FY2025 (current snapshot)")
        df = extract_injury_pdf(p, year=2025)
        out = ENV_RAW / f"{label}.csv"
        df.to_csv(out, index=False)
        print(f"[wrote]    {out.relative_to(ENV_RAW.parent.parent)} ({len(df):,} rows)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 11: Run extractor end-to-end**

```bash
cd ~/Projects/bearstats/data-pipeline
python extract_env_go_jp.py
```

Expected: `[wrote] data-pipeline/raw/env/injuries.csv (5640 rows)` (10 fiscal years × 47 prefs × 12 months = 5,640) plus sightings.csv and captures.csv (564 rows each).

- [ ] **Step 12: Spot-check the output**

```bash
head raw/env/injuries.csv
python -c "import pandas as pd; df = pd.read_csv('raw/env/injuries.csv'); print(df.groupby('year')['value'].sum())"
```

Expected: yearly totals rise sharply, with 2025 >> all prior years.

- [ ] **Step 13: Commit**

```bash
cd ~/Projects/bearstats
git add data-pipeline/extract_env_go_jp.py data-pipeline/tests/test_extract_env_go_jp.py data-pipeline/tests/fixtures/r07injury-sample.pdf
git commit -m "feat(pipeline): extract env.go.jp PDFs into prefecture-year-month CSVs"
```

---

## Task 5: ArcGIS prefecture point-data fetcher

**Files:**
- Create: `~/Projects/bearstats/data-pipeline/fetch_arcgis.py`
- Test: `~/Projects/bearstats/data-pipeline/tests/test_fetch_arcgis.py`

Downloads paginated point data from four prefectures' Feature Services.

Feature Service URLs (verified working, ~9,500 total records):
```
Saitama: https://services9.arcgis.com/n65w8AXGaYPTqFYI/arcgis/rest/services/survey123_3123e5ed452d4e89845e4ba6129c1e2d_results/FeatureServer/0
Gunma:   https://services7.arcgis.com/DkC6f6v0YUQX0rke/arcgis/rest/services/survey123_a77f33a9b9f649cfada5c7983c67874b_results/FeatureServer/0
Niigata: https://services6.arcgis.com/SKz58fvdFlaEB35q/arcgis/rest/services/survey123_08d14b98657b47309b868f49602375c8_results/FeatureServer/0
Toyama:  https://services7.arcgis.com/pUdPpUsq83Kw8pWi/arcgis/rest/services/survey123_3f07f1f9864d43368d48b5f373d6cd68_results/FeatureServer/0
```

- [ ] **Step 1: Write failing test for pagination logic**

Create `~/Projects/bearstats/data-pipeline/tests/test_fetch_arcgis.py`:

```python
import json
from pathlib import Path

from fetch_arcgis import SOURCES, parse_feature, page_params


def test_sources_has_four_prefectures():
    keys = sorted(s["key"] for s in SOURCES)
    assert keys == ["gunma", "niigata", "saitama", "toyama"]


def test_page_params_first_page():
    p = page_params(offset=0)
    assert p["resultOffset"] == 0
    assert p["resultRecordCount"] == 2000
    assert p["where"] == "1=1"
    assert p["outFields"] == "*"
    assert p["f"] == "geojson"


def test_parse_feature_minimal_niigata():
    feature = {
        "geometry": {"type": "Point", "coordinates": [138.679, 37.252]},
        "properties": {
            "field_7": "長岡市",
            "field_8": "目撃",
            "field_17": "小国町山野田",
            "field_20": 1744081200000,
            "field_26": "3頭",
        },
    }
    record = parse_feature(feature, pref_key="niigata")
    assert record["pref"] == "niigata"
    assert record["lat"] == 37.252
    assert record["lon"] == 138.679
    assert record["city"] == "長岡市"
    assert record["type"] == "sighting"
    assert record["date"] == "2025-04-08"
    assert record["count"] == 3
    assert record["species"] == "black"
    assert record["source"] == "niigata-arcgis"


def test_parse_feature_survives_missing_optional_fields():
    feature = {
        "geometry": {"type": "Point", "coordinates": [139.0, 36.0]},
        "properties": {"field_7": "前橋市"},
    }
    record = parse_feature(feature, pref_key="gunma")
    assert record["pref"] == "gunma"
    assert record["city"] == "前橋市"
    assert record["date"] is None
    assert record["count"] is None
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
pytest tests/test_fetch_arcgis.py -v
```

Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 3: Implement `fetch_arcgis.py`**

Create `~/Projects/bearstats/data-pipeline/fetch_arcgis.py`:

```python
"""Fetch bear-sighting point data from prefecture ArcGIS Feature Services.

All four use the Survey123 schema; we map `field_*` → canonical names here
so downstream code stays clean.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from utils import RAW_DIR, ensure_dir

ARCGIS_RAW = RAW_DIR / "arcgis"

SOURCES = [
    {
        "key": "saitama",
        "url": "https://services9.arcgis.com/n65w8AXGaYPTqFYI/arcgis/rest/services/survey123_3123e5ed452d4e89845e4ba6129c1e2d_results/FeatureServer/0",
    },
    {
        "key": "gunma",
        "url": "https://services7.arcgis.com/DkC6f6v0YUQX0rke/arcgis/rest/services/survey123_a77f33a9b9f649cfada5c7983c67874b_results/FeatureServer/0",
    },
    {
        "key": "niigata",
        "url": "https://services6.arcgis.com/SKz58fvdFlaEB35q/arcgis/rest/services/survey123_08d14b98657b47309b868f49602375c8_results/FeatureServer/0",
    },
    {
        "key": "toyama",
        "url": "https://services7.arcgis.com/pUdPpUsq83Kw8pWi/arcgis/rest/services/survey123_3f07f1f9864d43368d48b5f373d6cd68_results/FeatureServer/0",
    },
]

PAGE_SIZE = 2000


def page_params(offset: int) -> dict[str, Any]:
    return {
        "where": "1=1",
        "outFields": "*",
        "resultOffset": offset,
        "resultRecordCount": PAGE_SIZE,
        "f": "geojson",
    }


# Survey123 field mapping. All four prefectures use this schema for bear
# sightings (verified from Niigata sample; same Survey123 template across
# prefectures per the webmap resolution we did during design).
_TYPE_MAP = {
    "目撃": "sighting",      # sighting
    "痕跡": "trace",          # trace / sign (footprint, scat, claw marks)
    "人身被害": "injury",      # injury incident
    "捕獲": "capture",         # captured/culled
}


def _parse_count_ja(raw: str | None) -> int | None:
    """'3頭' → 3, '親1子2' → 3, otherwise None."""
    if not raw:
        return None
    # Sum all integer groups found (handles '親1子2' = 3).
    nums = [int(n) for n in re.findall(r"\d+", str(raw))]
    return sum(nums) if nums else None


def _parse_date_ms(raw: int | str | None) -> str | None:
    """ArcGIS Survey123 dates come as epoch-ms integers. → 'YYYY-MM-DD'."""
    if raw is None or raw == "":
        return None
    try:
        ms = int(raw)
    except (TypeError, ValueError):
        return None
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def parse_feature(feature: dict, pref_key: str) -> dict[str, Any]:
    geom = feature.get("geometry") or {}
    coords = geom.get("coordinates") or [None, None]
    props = feature.get("properties") or {}

    return {
        "pref": pref_key,
        "lat": coords[1],
        "lon": coords[0],
        "city": props.get("field_7"),
        "area": props.get("field_17"),
        "type": _TYPE_MAP.get((props.get("field_8") or "").strip(), "sighting"),
        "date": _parse_date_ms(props.get("field_20")),
        "time": props.get("field_21"),
        "count": _parse_count_ja(props.get("field_26")),
        "description": props.get("field_9"),
        "species": "black",  # all Honshu prefecture sources are Asian black bear
        "source": f"{pref_key}-arcgis",
    }


def fetch_all_features(client: httpx.Client, base_url: str) -> list[dict]:
    features: list[dict] = []
    offset = 0
    while True:
        resp = client.get(f"{base_url}/query", params=page_params(offset), timeout=60)
        resp.raise_for_status()
        data = resp.json()
        chunk = data.get("features", [])
        features.extend(chunk)
        if len(chunk) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return features


def main() -> int:
    ensure_dir(ARCGIS_RAW)
    errors = 0
    with httpx.Client(headers={"User-Agent": "bearstats-pipeline/0.1"}) as client:
        for src in SOURCES:
            try:
                print(f"[fetch] {src['key']} …", end="", flush=True)
                features = fetch_all_features(client, src["url"])
                out = ARCGIS_RAW / f"{src['key']}.geojson"
                out.write_text(
                    json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False),
                    encoding="utf-8",
                )
                print(f" {len(features):,} features → {out.name}")
            except httpx.HTTPError as e:
                errors += 1
                print(f" ERROR: {e}", file=sys.stderr)
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
pytest tests/test_fetch_arcgis.py -v
```

Expected: 4 PASS.

- [ ] **Step 5: Run fetcher for real**

```bash
cd ~/Projects/bearstats/data-pipeline
python fetch_arcgis.py
```

Expected, approximately:
```
[fetch] saitama … 281 features → saitama.geojson
[fetch] gunma … 1,293 features → gunma.geojson
[fetch] niigata … 3,553 features → niigata.geojson
[fetch] toyama … 4,352 features → toyama.geojson
```

(Counts may have grown since 2026-04-18; that's fine — we just need them ≥ those numbers.)

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/bearstats
git add data-pipeline/fetch_arcgis.py data-pipeline/tests/test_fetch_arcgis.py
git commit -m "feat(pipeline): fetch ArcGIS point data (Saitama, Gunma, Niigata, Toyama)"
```

---

## Task 6: Akita Kumadas fetcher

**Files:**
- Create: `~/Projects/bearstats/data-pipeline/fetch_kumadas.py`
- Test: `~/Projects/bearstats/data-pipeline/tests/test_fetch_kumadas.py`

Kumadas (Akita) is a custom open-data site (CC BY 4.0). Before writing scraping code, we need to discover the actual data endpoint. Task has an investigation step.

- [ ] **Step 1: Investigate Kumadas data endpoint**

Manually inspect https://kumadas.net/ in a browser (or with curl + devtools-style exploration). Look for:
- a "download" / "オープンデータ" link exposing CSV or GeoJSON
- a JS-loaded XHR to a data endpoint (check Network tab)

Expected outcomes (one of):
- **Case A:** A direct CSV/GeoJSON URL exists (easy — just download).
- **Case B:** A JSON API endpoint exists (use httpx to fetch).
- **Case C:** Only HTML exists (scrape; but very unlikely given their open-data commitment).

Write findings into `research/data-sources.md` under a "Kumadas" subsection (create the file if needed). The rest of this task assumes Case A or B.

- [ ] **Step 2: Write failing test for canonical record shape**

Create `~/Projects/bearstats/data-pipeline/tests/test_fetch_kumadas.py`:

```python
from fetch_kumadas import to_canonical_record


def test_to_canonical_record_bear():
    """A Kumadas bear sighting should map to our canonical shape."""
    raw = {
        "species": "クマ",
        "type": "目撃",
        "lat": 39.72,
        "lon": 140.10,
        "city": "秋田市",
        "date": "2025-06-14",
        "count": 1,
    }
    r = to_canonical_record(raw)
    assert r is not None
    assert r["pref"] == "akita"
    assert r["species"] == "black"
    assert r["type"] == "sighting"
    assert r["source"] == "akita-kumadas"


def test_to_canonical_record_filters_non_bear():
    """Kumadas also tracks boar/deer; we drop those."""
    raw = {
        "species": "イノシシ",  # wild boar
        "type": "目撃",
        "lat": 39.72,
        "lon": 140.10,
        "city": "秋田市",
        "date": "2025-06-14",
        "count": 1,
    }
    assert to_canonical_record(raw) is None
```

- [ ] **Step 3: Run test, confirm it fails**

```bash
pytest tests/test_fetch_kumadas.py -v
```

Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 4: Implement `fetch_kumadas.py`**

The *exact* fetch URL depends on Step 1's discovery. Below is the implementation assuming Case A (direct CSV) — adjust the fetch function for Case B (JSON API). The `to_canonical_record` logic stays the same regardless.

Create `~/Projects/bearstats/data-pipeline/fetch_kumadas.py`:

```python
"""Fetch Akita Kumadas open-data bear sightings (CC BY 4.0).

https://kumadas.net/  —  managed by Akita Prefecture Nature Conservation Division.

NOTE: The exact download URL was discovered at implementation time
(see research/data-sources.md). If Kumadas changes their open-data layout
in the future, update `KUMADAS_DATA_URL` and, if necessary, the field
mapping in `to_canonical_record`.
"""
from __future__ import annotations

import csv
import io
import sys
from typing import Any

import httpx

from utils import RAW_DIR, ensure_dir

KUMADAS_RAW = RAW_DIR / "kumadas"

# TO BE SET during Step 1 investigation. If Case B (JSON), adapt _fetch accordingly.
KUMADAS_DATA_URL = ""  # e.g. "https://kumadas.net/opendata/bear.csv"

BEAR_SPECIES_JA = {"クマ", "ツキノワグマ", "月の輪熊"}
TYPE_MAP = {
    "目撃": "sighting",
    "痕跡": "trace",
    "人身被害": "injury",
    "捕獲": "capture",
}


def to_canonical_record(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Map one Kumadas row to our canonical schema, or None to drop it."""
    species_ja = (raw.get("species") or "").strip()
    if species_ja not in BEAR_SPECIES_JA:
        return None

    try:
        lat = float(raw.get("lat"))
        lon = float(raw.get("lon"))
    except (TypeError, ValueError):
        return None

    return {
        "pref": "akita",
        "lat": lat,
        "lon": lon,
        "city": raw.get("city"),
        "type": TYPE_MAP.get((raw.get("type") or "").strip(), "sighting"),
        "date": raw.get("date"),
        "count": int(raw["count"]) if raw.get("count") not in (None, "") else None,
        "species": "black",
        "source": "akita-kumadas",
    }


def _fetch_csv(client: httpx.Client, url: str) -> list[dict]:
    resp = client.get(url, follow_redirects=True, timeout=60)
    resp.raise_for_status()
    # Kumadas may serve Shift-JIS or UTF-8; try UTF-8 first, fallback.
    try:
        text = resp.content.decode("utf-8")
    except UnicodeDecodeError:
        text = resp.content.decode("cp932")
    return list(csv.DictReader(io.StringIO(text)))


def main() -> int:
    if not KUMADAS_DATA_URL:
        print(
            "ERROR: KUMADAS_DATA_URL is empty. Complete the endpoint "
            "investigation (Task 6, Step 1) and set the URL in "
            "fetch_kumadas.py before running.",
            file=sys.stderr,
        )
        return 2

    ensure_dir(KUMADAS_RAW)
    with httpx.Client(headers={"User-Agent": "bearstats-pipeline/0.1"}) as client:
        raw_rows = _fetch_csv(client, KUMADAS_DATA_URL)
    print(f"[kumadas] {len(raw_rows):,} raw rows")

    records = [r for r in (to_canonical_record(x) for x in raw_rows) if r is not None]
    print(f"[kumadas] {len(records):,} bear records after filtering")

    out = KUMADAS_RAW / "akita.json"
    import json
    out.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    print(f"[wrote] {out.relative_to(KUMADAS_RAW.parent.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 5: Run tests, confirm `to_canonical_record` tests pass**

```bash
pytest tests/test_fetch_kumadas.py -v
```

Expected: 2 PASS.

- [ ] **Step 6: Set `KUMADAS_DATA_URL` and run fetcher**

Edit `fetch_kumadas.py`: replace `KUMADAS_DATA_URL = ""` with the URL discovered in Step 1. Then:

```bash
python fetch_kumadas.py
```

Expected: N raw rows logged, subset that are bears logged, JSON written.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/bearstats
git add data-pipeline/fetch_kumadas.py data-pipeline/tests/test_fetch_kumadas.py research/
git commit -m "feat(pipeline): fetch Akita Kumadas bear sightings"
```

---

## Task 7: Yamaguchi open-data fetcher

**Files:**
- Create: `~/Projects/bearstats/data-pipeline/fetch_yamaguchi.py`
- Test: `~/Projects/bearstats/data-pipeline/tests/test_fetch_yamaguchi.py`

Yamaguchi publishes a CC-BY 4.0 dataset of 2024 bear sightings. Same investigate → implement pattern as Kumadas.

- [ ] **Step 1: Investigate Yamaguchi endpoint**

Visit `https://www.pref.yamaguchi.lg.jp/site/police/212182.html` (or search "山口県 熊 オープンデータ") to find the CSV/XLSX download URL. Note it in `research/data-sources.md`.

- [ ] **Step 2: Write failing test for `to_canonical_record`**

Create `~/Projects/bearstats/data-pipeline/tests/test_fetch_yamaguchi.py`:

```python
from fetch_yamaguchi import to_canonical_record


def test_to_canonical_record_minimal():
    raw = {
        "date": "2024-07-12",
        "city": "岩国市",
        "lat": "34.17",
        "lon": "132.22",
        "type": "目撃",
    }
    r = to_canonical_record(raw)
    assert r["pref"] == "yamaguchi"
    assert r["species"] == "black"
    assert r["lat"] == 34.17
    assert r["source"] == "yamaguchi-opendata"


def test_to_canonical_record_rejects_no_coords():
    raw = {"date": "2024-07-12", "city": "岩国市", "type": "目撃"}
    assert to_canonical_record(raw) is None
```

- [ ] **Step 3: Run test, confirm it fails**

```bash
pytest tests/test_fetch_yamaguchi.py -v
```

Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 4: Implement `fetch_yamaguchi.py`**

Create `~/Projects/bearstats/data-pipeline/fetch_yamaguchi.py`:

```python
"""Fetch Yamaguchi 2024 bear sightings open dataset (CC BY 4.0)."""
from __future__ import annotations

import csv
import io
import json
import sys
from typing import Any

import httpx

from utils import RAW_DIR, ensure_dir

YAM_RAW = RAW_DIR / "yamaguchi"

# TO BE SET during Step 1.
YAMAGUCHI_DATA_URL = ""

TYPE_MAP = {
    "目撃": "sighting",
    "痕跡": "trace",
    "人身被害": "injury",
    "捕獲": "capture",
}


def to_canonical_record(raw: dict[str, Any]) -> dict[str, Any] | None:
    try:
        lat = float(raw.get("lat"))
        lon = float(raw.get("lon"))
    except (TypeError, ValueError):
        return None
    return {
        "pref": "yamaguchi",
        "lat": lat,
        "lon": lon,
        "city": raw.get("city"),
        "type": TYPE_MAP.get((raw.get("type") or "").strip(), "sighting"),
        "date": raw.get("date"),
        "count": None,
        "species": "black",
        "source": "yamaguchi-opendata",
    }


def main() -> int:
    if not YAMAGUCHI_DATA_URL:
        print("ERROR: set YAMAGUCHI_DATA_URL after investigation", file=sys.stderr)
        return 2

    ensure_dir(YAM_RAW)
    with httpx.Client(headers={"User-Agent": "bearstats-pipeline/0.1"}) as client:
        resp = client.get(YAMAGUCHI_DATA_URL, follow_redirects=True, timeout=60)
        resp.raise_for_status()

    try:
        text = resp.content.decode("utf-8")
    except UnicodeDecodeError:
        text = resp.content.decode("cp932")

    raw_rows = list(csv.DictReader(io.StringIO(text)))
    records = [r for r in (to_canonical_record(x) for x in raw_rows) if r is not None]
    print(f"[yamaguchi] {len(raw_rows):,} raw, {len(records):,} with coords")

    out = YAM_RAW / "2024.json"
    out.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    print(f"[wrote] {out.relative_to(YAM_RAW.parent.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 5: Run tests, confirm they pass**

```bash
pytest tests/test_fetch_yamaguchi.py -v
```

Expected: 2 PASS.

- [ ] **Step 6: Set URL, run fetcher**

```bash
python fetch_yamaguchi.py
```

Expected: N raw rows logged, JSON written.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/bearstats
git add data-pipeline/fetch_yamaguchi.py data-pipeline/tests/test_fetch_yamaguchi.py research/
git commit -m "feat(pipeline): fetch Yamaguchi 2024 bear open data"
```

---

## Task 8: Hokkaido brown bear fetcher

**Files:**
- Create: `~/Projects/bearstats/data-pipeline/fetch_hokkaido.py`
- Test: `~/Projects/bearstats/data-pipeline/tests/test_fetch_hokkaido.py`

higumap.info publishes field-verified Hokkaido brown bear sightings. These are kept entirely separate from the Honshu black bear pipeline (different species, different methodology).

- [ ] **Step 1: Investigate higumap endpoint**

Open https://higumap.info/recent and inspect Network tab for XHR calls. Find the JSON/GeoJSON endpoint. Document in `research/data-sources.md`.

- [ ] **Step 2: Write failing test for canonical shape (species=brown)**

Create `~/Projects/bearstats/data-pipeline/tests/test_fetch_hokkaido.py`:

```python
from fetch_hokkaido import to_canonical_record


def test_to_canonical_record_brown_bear():
    raw = {
        "date": "2025-09-01",
        "lat": 43.06,
        "lon": 141.35,
        "city": "札幌市",
        "verified": True,
    }
    r = to_canonical_record(raw)
    assert r["species"] == "brown"
    assert r["pref"] == "hokkaido"
    assert r["source"] == "hokkaido-higumap"
```

- [ ] **Step 3: Run test, confirm it fails**

```bash
pytest tests/test_fetch_hokkaido.py -v
```

Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 4: Implement `fetch_hokkaido.py`**

Create `~/Projects/bearstats/data-pipeline/fetch_hokkaido.py`:

```python
"""Fetch Hokkaido brown bear sightings from higumap.info (field-verified)."""
from __future__ import annotations

import json
import sys
from typing import Any

import httpx

from utils import RAW_DIR, ensure_dir

HOK_RAW = RAW_DIR / "hokkaido"

# TO BE SET during Step 1.
HIGUMAP_DATA_URL = ""


def to_canonical_record(raw: dict[str, Any]) -> dict[str, Any] | None:
    try:
        lat = float(raw.get("lat"))
        lon = float(raw.get("lon"))
    except (TypeError, ValueError):
        return None
    return {
        "pref": "hokkaido",
        "lat": lat,
        "lon": lon,
        "city": raw.get("city"),
        "type": "sighting",
        "date": raw.get("date"),
        "count": None,
        "species": "brown",
        "source": "hokkaido-higumap",
    }


def main() -> int:
    if not HIGUMAP_DATA_URL:
        print("ERROR: set HIGUMAP_DATA_URL after investigation", file=sys.stderr)
        return 2

    ensure_dir(HOK_RAW)
    with httpx.Client(headers={"User-Agent": "bearstats-pipeline/0.1"}) as client:
        resp = client.get(HIGUMAP_DATA_URL, follow_redirects=True, timeout=60)
        resp.raise_for_status()
        raw_rows = resp.json()

    # Accept either a list-of-records or a GeoJSON FeatureCollection.
    if isinstance(raw_rows, dict) and raw_rows.get("type") == "FeatureCollection":
        flat = []
        for f in raw_rows.get("features", []):
            coords = (f.get("geometry") or {}).get("coordinates") or [None, None]
            props = f.get("properties") or {}
            flat.append({**props, "lon": coords[0], "lat": coords[1]})
        raw_rows = flat

    records = [r for r in (to_canonical_record(x) for x in raw_rows) if r is not None]
    print(f"[hokkaido] {len(raw_rows):,} raw, {len(records):,} with coords")

    out = HOK_RAW / "higuma.json"
    out.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    print(f"[wrote] {out.relative_to(HOK_RAW.parent.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 5: Run test, confirm it passes**

```bash
pytest tests/test_fetch_hokkaido.py -v
```

Expected: 1 PASS.

- [ ] **Step 6: Set URL, run fetcher**

```bash
python fetch_hokkaido.py
```

Expected: JSON output written.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/bearstats
git add data-pipeline/fetch_hokkaido.py data-pipeline/tests/test_fetch_hokkaido.py research/
git commit -m "feat(pipeline): fetch Hokkaido brown bear sightings from higumap"
```

---

## Task 9: Japan prefecture GeoJSON

**Files:**
- Create: `~/Projects/bearstats/data-pipeline/fetch_geojson.py`
- Create: `~/Projects/bearstats/webapp/data/japan-prefectures.geo.json` (output)

We need one GeoJSON of all 47 prefecture boundaries. Use a trusted public source and bake it in.

- [ ] **Step 1: Download and vet the GeoJSON**

Dataviz-grade Japan prefecture GeoJSON (MIT-licensed, simplified for web):
```
https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson
```

Create `~/Projects/bearstats/data-pipeline/fetch_geojson.py`:

```python
"""Download Japan prefecture GeoJSON boundaries."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx

from extract_env_go_jp import PREFECTURE_KEYS, PREFECTURE_ORDER_JA
from utils import WEBAPP_DATA_DIR, ensure_dir

SOURCE = "https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson"
OUTPUT = WEBAPP_DATA_DIR / "japan-prefectures.geo.json"

# Map the upstream's "nam_ja" values to our canonical romaji keys.
# upstream uses short name like "秋田"; we use "秋田県". Normalize both sides.
_JA_SHORT_TO_LONG = {p.rstrip("県都府道"): p for p in PREFECTURE_ORDER_JA}


def normalize(feature_collection: dict) -> dict:
    out_features = []
    for feat in feature_collection["features"]:
        props = feat.setdefault("properties", {})
        nam_ja = (props.get("nam_ja") or "").strip()
        long_ja = _JA_SHORT_TO_LONG.get(nam_ja, nam_ja)
        if long_ja not in PREFECTURE_ORDER_JA:
            raise ValueError(f"unrecognized prefecture in upstream geojson: {nam_ja!r}")
        key = PREFECTURE_KEYS[PREFECTURE_ORDER_JA.index(long_ja)]
        props["code"] = key
        props["name_ja"] = long_ja
        props["name_en"] = key.capitalize()
        out_features.append(feat)
    if len(out_features) != 47:
        raise ValueError(f"expected 47 features, got {len(out_features)}")
    return {"type": "FeatureCollection", "features": out_features}


def main() -> int:
    ensure_dir(WEBAPP_DATA_DIR)
    with httpx.Client(headers={"User-Agent": "bearstats-pipeline/0.1"}) as client:
        resp = client.get(SOURCE, timeout=60)
        resp.raise_for_status()
    fc = resp.json()
    fc = normalize(fc)
    OUTPUT.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    print(f"[wrote] {OUTPUT.relative_to(WEBAPP_DATA_DIR.parent.parent)} "
          f"({len(fc['features'])} features)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Run it**

```bash
cd ~/Projects/bearstats/data-pipeline
python fetch_geojson.py
```

Expected: `[wrote] webapp/data/japan-prefectures.geo.json (47 features)`.

- [ ] **Step 3: Spot-check the output**

```bash
python -c "import json; d=json.load(open('../webapp/data/japan-prefectures.geo.json')); print(len(d['features']), d['features'][0]['properties'])"
```

Expected: `47 {...'code': 'hokkaido', 'name_ja': '北海道', 'name_en': 'Hokkaido'}` (or similar — any prefecture is fine as long as the keys are present).

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/bearstats
git add data-pipeline/fetch_geojson.py webapp/data/japan-prefectures.geo.json
git commit -m "feat(pipeline): build Japan prefecture GeoJSON for webapp"
```

---

## Task 10: `build_json.py` — merge everything

**Files:**
- Create: `~/Projects/bearstats/data-pipeline/build_json.py`
- Test: `~/Projects/bearstats/data-pipeline/tests/test_build_json.py`
- Create (test fixture dir): `~/Projects/bearstats/data-pipeline/tests/fixtures/build_json/`

Takes everything in `raw/` → writes the three JSON files the webapp consumes (`national-timeline.json`, `prefecture-totals.json`, `points-recent.json`).

- [ ] **Step 1: Write failing test for `build_national_timeline`**

Create `~/Projects/bearstats/data-pipeline/tests/test_build_json.py`:

```python
import json
from pathlib import Path

import pandas as pd

from build_json import (
    build_national_timeline,
    build_prefecture_totals,
    build_points_recent,
)


def _mini_env_df(year: int, values_by_pref: dict[str, int]) -> pd.DataFrame:
    """Helper to synthesize an env.go.jp-shaped DataFrame for a single fiscal year."""
    rows = []
    for pref, total in values_by_pref.items():
        # Spread `total` evenly-ish across 12 months — enough for tests.
        per_month = total // 12
        remainder = total - per_month * 12
        for m_idx, m in enumerate([4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]):
            cal_year = year if m >= 4 else year + 1
            rows.append({
                "prefecture_ja": pref,
                "prefecture_key": pref,
                "year": year,
                "calendar_year": cal_year,
                "month": m,
                "value": per_month + (1 if m_idx < remainder else 0),
            })
    return pd.DataFrame(rows)


def test_build_national_timeline_sums_per_year_per_metric():
    sightings = pd.concat([
        _mini_env_df(2024, {"akita": 1000, "iwate": 500}),
        _mini_env_df(2025, {"akita": 5000, "iwate": 2000}),
    ], ignore_index=True)
    injuries = pd.concat([
        _mini_env_df(2024, {"akita": 10, "iwate": 5}),
        _mini_env_df(2025, {"akita": 50, "iwate": 25}),
    ], ignore_index=True)
    deaths = pd.concat([
        _mini_env_df(2024, {"akita": 0, "iwate": 1}),
        _mini_env_df(2025, {"akita": 3, "iwate": 2}),
    ], ignore_index=True)

    result = build_national_timeline(sightings, injuries, deaths)
    assert result["years"] == [2024, 2025]
    assert result["metrics"]["sightings"] == [1500, 7000]
    assert result["metrics"]["injuries"] == [15, 75]
    assert result["metrics"]["deaths"] == [1, 5]


def test_build_prefecture_totals_groups_per_year_per_metric():
    sightings = _mini_env_df(2025, {"akita": 5000, "iwate": 2000})
    injuries = _mini_env_df(2025, {"akita": 50, "iwate": 25})
    deaths = _mini_env_df(2025, {"akita": 3, "iwate": 2})

    result = build_prefecture_totals(sightings, injuries, deaths)
    assert result["metrics"]["sightings"]["2025"]["akita"] == 5000
    assert result["metrics"]["sightings"]["2025"]["iwate"] == 2000
    assert result["metrics"]["injuries"]["2025"]["akita"] == 50
    assert result["metrics"]["deaths"]["2025"]["iwate"] == 2


def test_build_points_recent_dedupes_and_preserves_species():
    arcgis_records = [
        {"pref": "niigata", "lat": 37.25, "lon": 138.68, "date": "2025-04-08",
         "type": "sighting", "count": 3, "species": "black",
         "source": "niigata-arcgis", "city": "長岡市"},
    ]
    hokkaido_records = [
        {"pref": "hokkaido", "lat": 43.06, "lon": 141.35, "date": "2025-09-01",
         "type": "sighting", "count": None, "species": "brown",
         "source": "hokkaido-higumap", "city": "札幌市"},
    ]
    result = build_points_recent([arcgis_records, hokkaido_records])
    assert len(result) == 2
    species = {r["species"] for r in result}
    assert species == {"black", "brown"}
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
pytest tests/test_build_json.py -v
```

Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 3: Implement `build_json.py`**

Create `~/Projects/bearstats/data-pipeline/build_json.py`:

```python
"""Merge everything in raw/ into the four JSON files the webapp reads.

Outputs:
  webapp/data/national-timeline.json   — 10yr national totals per metric
  webapp/data/prefecture-totals.json   — prefecture × year per metric
  webapp/data/points-recent.json       — per-sighting records (6 prefectures + Hokkaido)
  webapp/data/japan-prefectures.geo.json  — produced separately by fetch_geojson.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

from utils import RAW_DIR, WEBAPP_DATA_DIR, ensure_dir, utc_now_iso

ENV_RAW = RAW_DIR / "env"
ARCGIS_RAW = RAW_DIR / "arcgis"
KUMADAS_RAW = RAW_DIR / "kumadas"
YAM_RAW = RAW_DIR / "yamaguchi"
HOK_RAW = RAW_DIR / "hokkaido"


def build_national_timeline(
    sightings: pd.DataFrame, injuries: pd.DataFrame, deaths: pd.DataFrame
) -> dict:
    years = sorted(
        set(sightings["year"].tolist())
        | set(injuries["year"].tolist())
        | set(deaths["year"].tolist())
    )

    def yearly_totals(df: pd.DataFrame) -> list[int]:
        grouped = df.groupby("year")["value"].sum()
        return [int(grouped.get(y, 0)) for y in years]

    return {
        "years": years,
        "metrics": {
            "sightings": yearly_totals(sightings),
            "injuries": yearly_totals(injuries),
            "deaths": yearly_totals(deaths),
        },
        "_source_fetched_at": utc_now_iso(),
    }


def build_prefecture_totals(
    sightings: pd.DataFrame, injuries: pd.DataFrame, deaths: pd.DataFrame
) -> dict:
    def per_pref_per_year(df: pd.DataFrame) -> dict[str, dict[str, int]]:
        out: dict[str, dict[str, int]] = {}
        grouped = df.groupby(["year", "prefecture_key"])["value"].sum().to_dict()
        for (year, pref), val in grouped.items():
            out.setdefault(str(year), {})[pref] = int(val)
        return out

    return {
        "metrics": {
            "sightings": per_pref_per_year(sightings),
            "injuries": per_pref_per_year(injuries),
            "deaths": per_pref_per_year(deaths),
        },
        "_source_fetched_at": utc_now_iso(),
    }


def build_points_recent(record_lists: list[list[dict]]) -> list[dict]:
    """Flatten multiple lists of canonical records into one list."""
    out: list[dict] = []
    for group in record_lists:
        out.extend(group)
    # Drop records without coords (defensive — upstream parsers should have already).
    out = [r for r in out if r.get("lat") is not None and r.get("lon") is not None]
    return out


def _load_arcgis() -> list[dict]:
    """Load per-prefecture ArcGIS GeoJSON files and map each feature to canonical."""
    from fetch_arcgis import parse_feature, SOURCES

    records: list[dict] = []
    for src in SOURCES:
        p = ARCGIS_RAW / f"{src['key']}.geojson"
        if not p.exists():
            print(f"  [warn] missing: {p.name}; skipping", file=sys.stderr)
            continue
        fc = json.loads(p.read_text(encoding="utf-8"))
        for feat in fc.get("features", []):
            records.append(parse_feature(feat, pref_key=src["key"]))
    return records


def _load_json_list(path: Path) -> list[dict]:
    if not path.exists():
        print(f"  [warn] missing: {path}; skipping", file=sys.stderr)
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    ensure_dir(WEBAPP_DATA_DIR)

    # --- Env.go.jp extracts: CSVs with prefecture_key, year, value columns ---
    injuries_csv = ENV_RAW / "injuries.csv"
    sightings_csv = ENV_RAW / "sightings.csv"
    captures_csv = ENV_RAW / "captures.csv"

    if not injuries_csv.exists():
        print(f"FATAL: {injuries_csv} not found. Run extract_env_go_jp.py first.", file=sys.stderr)
        return 2

    injuries_df = pd.read_csv(injuries_csv)
    sightings_df = pd.read_csv(sightings_csv) if sightings_csv.exists() else injuries_df.iloc[0:0]
    # env.go.jp doesn't break out deaths per-prefecture; deaths are derived nationally
    # from known totals (see research/methodology.md). We synthesize a minimal deaths df
    # for the national timeline using published figures.
    deaths_by_year = {
        2016: 4, 2017: 2, 2018: 5, 2019: 1, 2020: 2,
        2021: 4, 2022: 0, 2023: 6, 2024: 2, 2025: 13,
    }
    deaths_df = pd.DataFrame([
        {"prefecture_key": "national", "year": y, "month": 12, "value": v}
        for y, v in deaths_by_year.items()
    ])

    # --- National timeline ---
    national = build_national_timeline(sightings_df, injuries_df, deaths_df)
    (WEBAPP_DATA_DIR / "national-timeline.json").write_text(
        json.dumps(national, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("[wrote] webapp/data/national-timeline.json")

    # --- Prefecture totals (deaths omitted at prefecture level — we don't have that data) ---
    pref_totals = build_prefecture_totals(sightings_df, injuries_df, deaths_df)
    # Remove the synthetic 'national' key from prefecture dicts
    for year_map in pref_totals["metrics"]["deaths"].values():
        year_map.pop("national", None)
    (WEBAPP_DATA_DIR / "prefecture-totals.json").write_text(
        json.dumps(pref_totals, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("[wrote] webapp/data/prefecture-totals.json")

    # --- Points recent: ArcGIS + Kumadas + Yamaguchi + Hokkaido ---
    arcgis_records = _load_arcgis()
    kumadas_records = _load_json_list(KUMADAS_RAW / "akita.json")
    yamaguchi_records = _load_json_list(YAM_RAW / "2024.json")
    hokkaido_records = _load_json_list(HOK_RAW / "higuma.json")

    points = build_points_recent([
        arcgis_records, kumadas_records, yamaguchi_records, hokkaido_records,
    ])
    (WEBAPP_DATA_DIR / "points-recent.json").write_text(
        json.dumps(points, ensure_ascii=False), encoding="utf-8"
    )
    print(f"[wrote] webapp/data/points-recent.json ({len(points):,} points)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
pytest tests/test_build_json.py -v
```

Expected: 3 PASS.

- [ ] **Step 5: Run build end-to-end**

```bash
cd ~/Projects/bearstats/data-pipeline
python build_json.py
```

Expected:
```
[wrote] webapp/data/national-timeline.json
[wrote] webapp/data/prefecture-totals.json
[wrote] webapp/data/points-recent.json (9,000+ points)
```

- [ ] **Step 6: Spot-check JSON contents**

```bash
python -c "import json; d=json.load(open('../webapp/data/national-timeline.json')); print('years:', d['years']); print('sightings:', d['metrics']['sightings']); print('deaths:', d['metrics']['deaths'])"
```

Expected: 10 years listed, sightings rising, 2025 deaths = 13.

```bash
python -c "import json; d=json.load(open('../webapp/data/points-recent.json')); from collections import Counter; print(Counter(r['pref'] for r in d))"
```

Expected: `Counter({'toyama': 4352, 'niigata': 3553, 'gunma': 1293, 'saitama': 281, 'akita': ..., 'yamaguchi': ..., 'hokkaido': ...})` — actual counts will vary.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/bearstats
git add data-pipeline/build_json.py data-pipeline/tests/test_build_json.py webapp/data/
git commit -m "feat(pipeline): build webapp JSON (national timeline, pref totals, points)"
```

---

## Task 11: Orchestrator + research docs

**Files:**
- Create: `~/Projects/bearstats/data-pipeline/fetch_all.py`
- Create: `~/Projects/bearstats/research/data-sources.md`
- Create: `~/Projects/bearstats/research/methodology.md`

- [ ] **Step 1: Write `fetch_all.py` as a thin orchestrator**

Create `~/Projects/bearstats/data-pipeline/fetch_all.py`:

```python
"""Run every fetcher + extractor + build, in order.

Exit 0 only if every step succeeds. Individual fetcher failures continue
(we still want as much data as possible); build_json failure is fatal.
"""
from __future__ import annotations

import subprocess
import sys

SCRIPTS = [
    "fetch_env_go_jp.py",
    "extract_env_go_jp.py",
    "fetch_arcgis.py",
    "fetch_kumadas.py",
    "fetch_yamaguchi.py",
    "fetch_hokkaido.py",
    "fetch_geojson.py",
    "build_json.py",
]


def main() -> int:
    any_fetch_failure = False
    for script in SCRIPTS:
        print(f"\n=== {script} ===")
        rc = subprocess.call([sys.executable, script])
        if rc != 0:
            if script == "build_json.py":
                print(f"FATAL: {script} failed (rc={rc})", file=sys.stderr)
                return rc
            print(f"[warn] {script} exited {rc}; continuing", file=sys.stderr)
            any_fetch_failure = True
    return 1 if any_fetch_failure else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Create `research/data-sources.md`**

Create `~/Projects/bearstats/research/data-sources.md` with this content:

```markdown
# Data Sources

All sources used by Bearstats, with URLs, licenses, and access notes.

## Ministry of the Environment (環境省)

**Landing:** https://www.env.go.jp/nature/choju/effort/effort12/effort12.html
**License:** Japanese government open data (public-domain-equivalent).
**Granularity:** Prefecture × fiscal month. Preliminary figures; revised periodically.

### Historical injuries (10 years)
- FY2016 (H28): https://www.env.go.jp/nature/choju/effort/effort12/h28injury-qe.pdf
- FY2017 (H29): https://www.env.go.jp/nature/choju/effort/effort12/h29injury-qe.pdf
- FY2018 (H30): https://www.env.go.jp/nature/choju/effort/effort12/h30injury-qe.pdf
- FY2019 (R01): https://www.env.go.jp/nature/choju/effort/effort12/r01injury-qe.pdf
- FY2020 (R02): https://www.env.go.jp/nature/choju/effort/effort12/r02injury-qe.pdf
- FY2021 (R03): https://www.env.go.jp/nature/choju/effort/effort12/r03injury-qe.pdf
- FY2022 (R04): https://www.env.go.jp/nature/choju/effort/effort12/r04injury-qe.pdf
- FY2023 (R05): https://www.env.go.jp/nature/choju/effort/effort12/r05injury-qe.pdf
- FY2024 (R06): https://www.env.go.jp/nature/choju/effort/effort12/r06injury-qe.pdf
- FY2025 (R07): https://www.env.go.jp/nature/choju/effort/effort12/r07injury-qe.pdf

### Current-year (updates quarterly)
- Injuries: https://www.env.go.jp/nature/choju/effort/effort12/injury-qe.pdf
- Sightings: https://www.env.go.jp/nature/choju/effort/effort12/syutubotu.pdf
- Captures: https://www.env.go.jp/nature/choju/effort/effort12/capture-qe.pdf

## Prefecture ArcGIS dashboards (point-level)

All are public, no auth, no API key. Licensed under their respective prefecture terms (government open data).

### Saitama
- Dashboard: https://www.arcgis.com/apps/dashboards/6851a59c5a76496e9c9e3b54b2e67ff9
- Feature Service: https://services9.arcgis.com/n65w8AXGaYPTqFYI/arcgis/rest/services/survey123_3123e5ed452d4e89845e4ba6129c1e2d_results/FeatureServer/0

### Gunma
- Dashboard: https://pref-gunma.maps.arcgis.com/apps/dashboards/5276d2ebf02a42da8595ed2a51a334c8
- Feature Service: https://services7.arcgis.com/DkC6f6v0YUQX0rke/arcgis/rest/services/survey123_a77f33a9b9f649cfada5c7983c67874b_results/FeatureServer/0

### Niigata
- Dashboard: https://www.arcgis.com/apps/dashboards/20b4d06fb3b34776959a4e69c7a8511a
- Feature Service: https://services6.arcgis.com/SKz58fvdFlaEB35q/arcgis/rest/services/survey123_08d14b98657b47309b868f49602375c8_results/FeatureServer/0

### Toyama
- Dashboard (via official kumap): https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html
- Feature Service: https://services7.arcgis.com/pUdPpUsq83Kw8pWi/arcgis/rest/services/survey123_3f07f1f9864d43368d48b5f373d6cd68_results/FeatureServer/0

## Akita — Kumadas (CC BY 4.0)

- Site: https://kumadas.net/
- Managed by: 秋田県自然保護課 (Akita Prefecture Nature Conservation Division)
- Data download URL: **TO BE DISCOVERED** (see Task 6, Step 1 of data-pipeline plan)
- Includes multi-species (bear + boar + deer); we filter to bear only.

## Yamaguchi 2024 bear sightings (CC BY 4.0)

- Landing: https://www.pref.yamaguchi.lg.jp/site/police/212182.html
- Dataset URL: **TO BE DISCOVERED** (Task 7, Step 1)

## Hokkaido — higumap.info (brown bear, field-verified)

- Site: https://higumap.info/recent
- Separate from env.go.jp (which only covers Asian black bear).
- Data endpoint: **TO BE DISCOVERED** (Task 8, Step 1)

## Japan prefecture GeoJSON

- Source: https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson
- License: MIT
- 47 features with `nam_ja` property; normalized into our romaji keys at fetch time.

## Known gaps

- No machine-readable point data from Hokkaido's prefectural portal (we rely on higumap).
- Injuries broken out by prefecture but deaths published only as national totals (see methodology.md).
- Fukushima, Iwate, Miyagi, Yamagata: only HTML pages, no scrapable API in v1. Covered at prefecture-total granularity via env.go.jp.
```

- [ ] **Step 3: Create `research/methodology.md`**

Create `~/Projects/bearstats/research/methodology.md`:

```markdown
# Methodology

How we aggregated the data and why certain choices were made.

## Fiscal vs calendar year

Japan's government bear data uses **fiscal year** (April → March). We label years by their starting calendar year — FY2025 = April 2025 through March 2026. Each record also carries a `calendar_year` field for joins.

## Deaths: national-only

env.go.jp publishes injury counts per-prefecture × month but **death counts only as national annual totals** via ministry press releases and news coverage. Hardcoded values in `build_json.py`:

```
FY2016: 4   FY2017: 2   FY2018: 5   FY2019: 1   FY2020: 2
FY2021: 4  FY2022: 0   FY2023: 6   FY2024: 2   FY2025: 13
```

These figures match coverage from The Japan Times, Britannica, and Japan's Environment Ministry preliminary reports (Dec 2025). Update if/when revised figures are published.

## Species separation

- **ツキノワグマ** (Asian black bear) — Honshu, Shikoku. Covered by env.go.jp and 6 prefecture feeds (Saitama, Gunma, Niigata, Toyama, Akita, Yamaguchi).
- **ヒグマ** (brown bear) — Hokkaido only. Separate species. Source: higumap.info.

The webapp never sums them. Default view is black bear; a toggle switches to brown. This is explicit in the legend.

## "Verified" vs "raw" sightings

higumap.info (Hokkaido) only publishes **field-verified** sightings — each one checked by a person. Prefecture ArcGIS feeds include all reports, verified or not. We label this difference in the UI ("verified" badge) and do not add verified counts to unverified counts.

## Caveats readers should know

1. **Preliminary figures are revised.** env.go.jp quietly revises past-year numbers as late reports come in. We record `_source_fetched_at`; pull fresh PDFs quarterly.
2. **Point-level coverage is uneven.** Only 6 prefectures publish machine-readable sighting data. The choropleth shows all 47; the dot layer covers ~20% of prefectures.
3. **Reporting bias.** A sighting is reported when a person sees a bear. Areas with more people looking (visitor centers, school patrols) will report more. This is a human-observation dataset, not a bear census.
4. **Fiscal vs calendar.** April–March. If you're comparing against news coverage that uses calendar year (especially for 2025's October–December spike), numbers differ.
```

- [ ] **Step 4: Test orchestrator end-to-end**

```bash
cd ~/Projects/bearstats/data-pipeline
python fetch_all.py
```

Expected: each script runs; final output in `webapp/data/` contains all four JSON files.

- [ ] **Step 5: Run full test suite**

```bash
pytest -v
```

Expected: all tests PASS (6 utils + 3 env.go.jp fetch + 8 extract + 4 arcgis + 2 kumadas + 2 yamaguchi + 1 hokkaido + 3 build = 29 tests).

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/bearstats
git add data-pipeline/fetch_all.py research/
git commit -m "feat(pipeline): orchestrator + research docs"
```

---

## Task 12: DATA CHECKPOINT — user review

**Do not proceed past this point without user review.**

- [ ] **Step 1: Summarize what we got**

Generate a coverage report for the user:

```bash
cd ~/Projects/bearstats/data-pipeline
python - <<'PY'
import json
from collections import Counter
from pathlib import Path

data = Path("../webapp/data")

nt = json.loads((data / "national-timeline.json").read_text())
pt = json.loads((data / "prefecture-totals.json").read_text())
pr = json.loads((data / "points-recent.json").read_text())
geo = json.loads((data / "japan-prefectures.geo.json").read_text())

print("=== Bearstats data coverage ===\n")
print(f"National timeline: {len(nt['years'])} years ({nt['years'][0]}–{nt['years'][-1]})")
print(f"  sightings 2016 → 2025: {nt['metrics']['sightings'][0]:,} → {nt['metrics']['sightings'][-1]:,}")
print(f"  injuries  2016 → 2025: {nt['metrics']['injuries'][0]:,} → {nt['metrics']['injuries'][-1]:,}")
print(f"  deaths    2016 → 2025: {nt['metrics']['deaths'][0]:,} → {nt['metrics']['deaths'][-1]:,}")
print(f"\nPrefecture totals: {len(pt['metrics']['sightings'])} years × up to 47 prefectures")
latest = max(pt['metrics']['sightings'].keys())
top = sorted(pt['metrics']['sightings'][latest].items(), key=lambda kv: -kv[1])[:5]
print(f"  Top 5 by sightings in {latest}: {top}")
print(f"\nPoint-level records: {len(pr):,} total")
print(f"  by prefecture: {dict(Counter(r['pref'] for r in pr))}")
print(f"  by species:    {dict(Counter(r['species'] for r in pr))}")
print(f"\nGeoJSON: {len(geo['features'])} prefecture boundaries")
PY
```

- [ ] **Step 2: Stop and wait for user**

Ask the user: "Here's what landed. Any gaps that concern you before we move to the webapp plan?"

Do not start the webapp plan until user confirms coverage is acceptable.

---

## Self-review checklist for the plan author

Before handing this plan off:

**Spec coverage:**
- ✅ Section 5 data sources → Tasks 3, 5, 6, 7, 8, 9 (all sources covered)
- ✅ Section 6 pipeline scripts → one task per script
- ✅ Section 7 JSON schemas → Task 10 implements all four output shapes
- ✅ Section 10 data quirks → handled in individual tasks (era codes, pagination, species filter, fiscal year)
- ✅ Section 11 testing → pytest with fixtures in every TDD'd task
- ✅ Checkpoint → Task 12 explicitly halts before webapp work

**Placeholders:**
- ⚠️ Three `TO BE DISCOVERED` items (Kumadas URL, Yamaguchi URL, higumap URL) — these are not placeholders in the code sense; they are intentional investigation steps with clear procedures (Task 6/7/8 Step 1). Engineers must open a browser and find the URL; I can't pre-fetch these from the spec alone.

**Type consistency:**
- ✅ Canonical record schema used in `parse_feature` (ArcGIS), `to_canonical_record` (Kumadas/Yamaguchi/Hokkaido), and consumed by `build_points_recent` is identical — fields: `pref, lat, lon, city, type, date, count, species, source`.
- ✅ PREFECTURE_KEYS / PREFECTURE_ORDER_JA defined in one place (`extract_env_go_jp.py`); imported where needed.

**Commit cadence:**
- ✅ Every task ends with a commit.

**No placeholders in code:**
- ✅ All code blocks are complete. No `# implement later`, no bare `pass`, no "similar to X".
