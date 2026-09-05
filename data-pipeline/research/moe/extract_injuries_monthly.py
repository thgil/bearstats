"""Build the national monthly bear-injury series FY2014-FY2026 from MoE PDFs.

Inputs (all env.go.jp, effort12 directory):
  raw/research/moe/h26injury-qe.pdf   FY2014  (fetched 2026-09-05)
  raw/research/moe/h27injury-qe.pdf   FY2015  (fetched 2026-09-05)
  raw/env/{h28,h29,h30,r01..r07}injury-qe.pdf   FY2016-FY2025 (pipeline files)
  raw/research/moe/r08injury-qe.pdf   FY2026 running year, April-July only
                                       (fetched 2026-09-05)

Every closed-year file is parsed with the pipeline's own
extract_env_go_jp.extract_injury_pdf, which handles the H26/H27 layout
unchanged. The running-year file has blank cells for months not yet reported,
which makes pdfplumber merge the first data row; it is parsed here by word
position against the column grid of the 計 row instead.

Outputs (research/moe/):
  injuries_monthly_fy2014_fy2026.csv                national, one row per FY x month
  injuries_monthly_by_prefecture_fy2014_fy2026.csv  39 prefectures x FY x month

Run from data-pipeline/:  .venv/bin/python research/moe/extract_injuries_monthly.py
"""
from __future__ import annotations

import sys
import unicodedata
from pathlib import Path

import pandas as pd
import pdfplumber

PIPELINE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PIPELINE))

from extract_env_go_jp import (  # noqa: E402
    PDF_TO_LONG_NAME,
    PREFECTURE_KEYS,
    PREFECTURE_NAMES_IN_PDF,
    PREFECTURE_ORDER_JA,
    _FISCAL_MONTH_ORDER,
    _clean_cell,
    extract_injury_pdf,
    parse_ytd_month,
)

BASE_URL = "https://www.env.go.jp/nature/choju/effort/effort12/"
OUT_DIR = PIPELINE / "research" / "moe"

# publish_date = HTTP Last-Modified of the file on www.env.go.jp, read with
# `curl -sI` on 2026-09-05. pdf_created = the PDF's own CreationDate (pdfinfo).
# The ministry regenerated the FY2014-FY2022 archive files in Dec 2023 and
# re-uploaded all closed years on 2025-06-14, so neither date is the original
# release date of the figures; see README-injuries-monthly.md.
SOURCES: list[tuple[str, int, str, str, str]] = [
    # (file code, fiscal year, raw dir, publish_date, pdf_created)
    ("h26", 2014, "raw/research/moe", "2025-06-14", "2023-12-04"),
    ("h27", 2015, "raw/research/moe", "2025-06-14", "2023-12-04"),
    ("h28", 2016, "raw/env", "2025-06-14", "2023-12-04"),
    ("h29", 2017, "raw/env", "2025-06-14", "2023-12-04"),
    ("h30", 2018, "raw/env", "2025-06-14", "2023-12-04"),
    ("r01", 2019, "raw/env", "2025-06-14", "2023-12-01"),
    ("r02", 2020, "raw/env", "2025-06-14", "2023-12-01"),
    ("r03", 2021, "raw/env", "2025-06-14", "2023-12-01"),
    ("r04", 2022, "raw/env", "2025-06-14", "2023-12-01"),
    ("r05", 2023, "raw/env", "2025-06-14", "2025-05-12"),
    ("r06", 2024, "raw/env", "2025-06-14", "2025-05-12"),
    ("r07", 2025, "raw/env", "2026-04-07", "2026-04-06"),
    ("r08", 2026, "raw/research/moe", "2026-08-12", "2026-08-07"),
]

# The running-year file carries no cut-off note of its own. The companion
# summary raw/env/injury-qe.pdf (dated 令和8年8月12日) labels the same figures
# "Ｒ０８年度 (R08年7月末)", i.e. April through July. Months after the cut-off
# are blank in the prefecture rows (not yet reported) and are not emitted.
RUNNING_YEAR_CUTOFF_SOURCE = PIPELINE / "raw/env/injury-qe.pdf"


def running_year_cutoff() -> int:
    with pdfplumber.open(RUNNING_YEAR_CUTOFF_SOURCE) as pdf:
        text = "\n".join(p.extract_text() or "" for p in pdf.pages)
    for line in text.splitlines():
        if "月末" in unicodedata.normalize("NFKC", line):
            m = parse_ytd_month(line)
            if m:
                return m
    raise ValueError("no 月末 cut-off found in injury-qe.pdf")


def extract_running_year_pdf(pdf_path: Path, fiscal_year: int, through_month: int) -> pd.DataFrame:
    """Parse a running-year injury PDF by word position.

    Column x-ranges are taken from the 計 row, whose 40 cells are all present
    even when the prefecture rows have blanks. Each word in a prefecture row
    is assigned to the column containing its x-centre.
    """
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[0]
        table = page.find_tables()[0]
        total_row = next(
            r for r in table.rows
            if r.cells[0] and (page.crop(r.cells[0]).extract_text() or "").strip() == "計"
        )
        if any(c is None for c in total_row.cells) or len(total_row.cells) != 40:
            raise ValueError(f"{pdf_path.name}: 計 row does not have 40 cells")
        col_x = [(c[0], c[2]) for c in total_row.cells]
        words = page.extract_words()

        rows: list[dict] = []
        seen: set[str] = set()
        for r in table.rows:
            if not r.cells[0]:
                continue
            x0, top, x1, bottom = r.bbox
            first = (page.crop(r.cells[0]).extract_text() or "").strip()
            if first not in PREFECTURE_NAMES_IN_PDF:
                continue
            seen.add(first)
            cells: list[list[str]] = [[] for _ in col_x]
            for w in words:
                yc = (w["top"] + w["bottom"]) / 2
                if not (top <= yc <= bottom):
                    continue
                xc = (w["x0"] + w["x1"]) / 2
                for i, (cx0, cx1) in enumerate(col_x):
                    if cx0 <= xc <= cx1:
                        cells[i].append(w["text"])
                        break
            long_name = PDF_TO_LONG_NAME[first]
            key = PREFECTURE_KEYS[PREFECTURE_ORDER_JA.index(long_name)]
            n_reported = _FISCAL_MONTH_ORDER.index(through_month) + 1
            for m_idx, month in enumerate(_FISCAL_MONTH_ORDER[:n_reported]):
                base = 1 + 3 * m_idx
                vals = [" ".join(cells[base + k]) for k in range(3)]
                if any(len(cells[base + k]) > 1 for k in range(3)):
                    raise ValueError(f"{pdf_path.name}: {first} month {month} has multi-word cell {vals}")
                rows.append({
                    "prefecture_ja": long_name,
                    "prefecture_key": key,
                    "year": fiscal_year,
                    "calendar_year": fiscal_year if month >= 4 else fiscal_year + 1,
                    "month": month,
                    "incidents": _clean_cell(vals[0]),
                    "victims": _clean_cell(vals[1]),
                    "deaths": _clean_cell(vals[2]),
                })
        missing = set(PREFECTURE_NAMES_IN_PDF) - seen
        if missing:
            raise ValueError(f"{pdf_path.name}: missing prefectures {sorted(missing)}")

        # Cross-check against the printed 計 row for the reported months.
        df = pd.DataFrame(rows)
        for m_idx, month in enumerate(_FISCAL_MONTH_ORDER[: len(df["month"].unique())]):
            base = 1 + 3 * m_idx
            printed = [
                _clean_cell(page.crop(total_row.cells[base + k]).extract_text()) for k in range(3)
            ]
            got = df[df["month"] == month][["incidents", "victims", "deaths"]].sum().tolist()
            if printed != got:
                raise ValueError(f"{pdf_path.name}: month {month} printed 計 {printed} != summed {got}")
    return df


def main() -> int:
    cutoff = running_year_cutoff()
    frames: list[pd.DataFrame] = []
    for code, fy, raw_dir, publish_date, pdf_created in SOURCES:
        pdf_path = PIPELINE / raw_dir / f"{code}injury-qe.pdf"
        if code == "r08":
            df = extract_running_year_pdf(pdf_path, fy, through_month=cutoff)
            method = "pdfplumber words mapped to 計-row column grid (blank future-month cells)"
        else:
            df = extract_injury_pdf(pdf_path, fiscal_year=fy)
            method = "extract_env_go_jp.extract_injury_pdf (pdfplumber table)"
        df["source_url"] = BASE_URL + f"{code}injury-qe.pdf"
        df["source_file"] = f"{raw_dir}/{code}injury-qe.pdf"
        df["publish_date"] = publish_date
        df["pdf_created"] = pdf_created
        df["method"] = method
        frames.append(df)
        print(f"[{code}] FY{fy}: {len(df)} rows, injured={int(df.victims.sum())}, killed={int(df.deaths.sum())}")

    by_pref = pd.concat(frames, ignore_index=True).rename(
        columns={"year": "fiscal_year", "victims": "injured", "deaths": "killed"}
    )
    by_pref = by_pref[[
        "fiscal_year", "month", "calendar_year", "prefecture_ja", "prefecture_key",
        "incidents", "injured", "killed", "source_url", "publish_date", "pdf_created",
        "source_file", "method",
    ]]
    by_pref.to_csv(OUT_DIR / "injuries_monthly_by_prefecture_fy2014_fy2026.csv", index=False)

    keys = ["fiscal_year", "month", "calendar_year", "source_url", "publish_date", "pdf_created", "source_file", "method"]
    national = (
        by_pref.groupby(keys, sort=False)[["incidents", "injured", "killed"]]
        .sum().reset_index()
    )
    national["status"] = "closed"
    national.loc[national["fiscal_year"] == 2026, "status"] = f"running (through month {cutoff})"
    national = national[[
        "fiscal_year", "month", "calendar_year", "injured", "killed", "incidents",
        "status", "source_url", "publish_date", "pdf_created", "source_file", "method",
    ]]
    national.to_csv(OUT_DIR / "injuries_monthly_fy2014_fy2026.csv", index=False)
    print(f"[wrote] national {len(national)} rows, by-prefecture {len(by_pref)} rows")
    return 0


if __name__ == "__main__":
    sys.exit(main())
