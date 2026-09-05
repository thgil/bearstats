"""Fetch prefecture-published bear-sighting counts that run ahead of the
Ministry of the Environment's own national table.

The ministry's syutubotu.pdf is a few weeks behind: prefectures publish their
own running tallies sooner. Three prefectures are covered here:

  Akita  - クマダス (kumadas) open data, a point-level CSV updated daily,
           published under CC BY 4.0 on the prefecture's CKAN portal.
  Iwate  - a one-page PDF table (fiscal year x month) scraped off a landing
           page; from FY2026 the prefecture switched to counting through its
           "Bears" app, so FY2026 is not comparable with earlier years.
  Miyagi - a one-page PDF (city x month, with a 月別計 total row) scraped off
           a different landing page.

This script downloads the three raw sources into raw/research/recent/ (an
idempotent download, same convention as fetch_env_go_jp.py), extracts them
into tracked CSVs under research/recent/, and prints cross-checks against the
ministry's own prefecture-by-month table so a broken extractor is caught here
rather than downstream in build_context.py.

Individual source failures are non-fatal (same convention as fetch_all.py):
we fall back to whatever tracked CSV is already on disk so build_context.py
always has something to read.
"""
from __future__ import annotations

import re
import sys
import unicodedata
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib.parse import urljoin

import httpx
import pandas as pd
import pdfplumber

from utils import RAW_DIR, REPO_ROOT, ensure_dir, sha256_of_file

RAW_RECENT = RAW_DIR / "research" / "recent"
RESEARCH_RECENT = REPO_ROOT / "data-pipeline" / "research" / "recent"
MOE_PREF_MONTH = REPO_ROOT / "data-pipeline" / "research" / "moe" / "sightings-by-prefecture-by-month-by-fy.csv"

HEADERS = {"User-Agent": "bearstats-pipeline/0.1"}

FISCAL_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]

AKITA_CSV_URL = (
    "https://ckan.pref.akita.lg.jp/dataset/f801a10f-f076-47e4-b5a6-0bb5569639e0/"
    "resource/0678f9b3-4bf7-4212-9c0e-c0cb9b09b3cf/download/050008_kumadas.csv"
)
AKITA_DATASET_URL = "https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003"

IWATE_LANDING_URL = "https://www.pref.iwate.jp/kurashikankyou/shizen/yasei/1049881/1056087.html"
MIYAGI_LANDING_URL = "https://www.pref.miyagi.jp/soshiki/sizenhogo/r8kumamokugeki.html"

AKITA_TYPE_COLUMNS = {
    "目撃": "sighting",
    "痕跡(食害)": "trace_food_damage",
    "痕跡(その他)": "trace_other",
    "人身被害": "injury",
}

IWATE_NOTE_FY2026 = (
    "Iwate changed to counting through the Bears app in April 2026; the "
    "prefecture says FY2026 differs in nature from earlier years."
)


# --------------------------------------------------------------------------
# small shared helpers
# --------------------------------------------------------------------------

def _reiwa_to_fy(text: str) -> int | None:
    """'令和８年度' / '令和8年度※' -> 2026. Reiwa 1 = calendar 2019."""
    s = unicodedata.normalize("NFKC", text)
    m = re.search(r"令和\s*(\d+)\s*年", s)
    return int(m.group(1)) + 2018 if m else None


def _reiwa_date(text: str) -> date | None:
    """'令和８年8月21日時点' -> date(2026, 8, 21)."""
    s = unicodedata.normalize("NFKC", text)
    m = re.search(r"令和\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日", s)
    if not m:
        return None
    reiwa, month, day = (int(g) for g in m.groups())
    return date(reiwa + 2018, month, day)


def _int_or_none(cell: str | None) -> int | None:
    if cell is None:
        return None
    s = str(cell).strip().replace(",", "")
    if s in ("", "-", "－", "―"):
        return None
    return int(s)


def download(client: httpx.Client, url: str, dest: Path) -> Path:
    """Idempotent download: keep the cached copy unless the fresh one differs."""
    ensure_dir(dest.parent)
    tmp = dest.with_suffix(dest.suffix + ".tmp")
    resp = client.get(url, follow_redirects=True, timeout=60)
    resp.raise_for_status()
    tmp.write_bytes(resp.content)
    if dest.exists() and sha256_of_file(dest) == sha256_of_file(tmp):
        tmp.unlink()
        print(f"[unchanged] {dest.name}")
    else:
        tmp.replace(dest)
        print(f"[saved]     {dest.name} ({len(resp.content):,} bytes)")
    return dest


# --------------------------------------------------------------------------
# fetchers
# --------------------------------------------------------------------------

def fetch_akita(client: httpx.Client) -> Path:
    return download(client, AKITA_CSV_URL, RAW_RECENT / "akita_kumadas.csv")


def fetch_iwate(client: httpx.Client) -> Path:
    """Scrape the 出没状況 PDF link off the Iwate landing page."""
    resp = client.get(IWATE_LANDING_URL, timeout=60)
    resp.raise_for_status()
    html = resp.text
    # <a href="...YYYYMMDD_shutubotu.pdf" ...>ツキノワグマ出没状況 (PDF ...)</a>
    for m in re.finditer(r'<a\s[^>]*href="([^"]+_shutubotu\.pdf)"[^>]*>(.*?)</a>', html, re.S):
        href, link_text = m.group(1), re.sub(r"<[^>]+>", "", m.group(2))
        if "出没状況" in link_text:
            url = urljoin(IWATE_LANDING_URL, href)
            fname_date = re.search(r"(\d{8})_shutubotu\.pdf", url)
            fname = f"iwate_shutubotu_{fname_date.group(1)}.pdf" if fname_date else "iwate_shutubotu.pdf"
            return download(client, url, RAW_RECENT / fname)
    raise ValueError(f"no 出没状況 PDF link found on {IWATE_LANDING_URL}")


def fetch_miyagi(client: httpx.Client) -> Path:
    """Scrape the *_kouhyou_shukei.pdf link off the Miyagi landing page."""
    resp = client.get(MIYAGI_LANDING_URL, timeout=60)
    resp.raise_for_status()
    html = resp.text
    m = re.search(r'href="([^"]*_kouhyou_shukei\.pdf)"', html)
    if not m:
        raise ValueError(f"no *_kouhyou_shukei.pdf link found on {MIYAGI_LANDING_URL}")
    url = urljoin(MIYAGI_LANDING_URL, m.group(1))
    fname_date = re.search(r"(\d{8})_kouhyou_shukei\.pdf", url)
    fname = f"miyagi_shukei_{fname_date.group(1)}.pdf" if fname_date else "miyagi_shukei.pdf"
    return download(client, url, RAW_RECENT / fname)


# --------------------------------------------------------------------------
# extractors -> tracked CSVs under research/recent/
# --------------------------------------------------------------------------

def _parse_akita_datetime(raw: object) -> datetime | None:
    if raw is None or (isinstance(raw, float) and raw != raw):
        return None
    s = str(raw).strip()
    if not s:
        return None
    if "/" in s:
        for fmt in ("%Y/%m/%d %H:%M", "%Y/%m/%d"):
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                continue
        return None
    # ~1,200 old rows carry an Excel/Lotus serial day number instead of a
    # formatted date string (e.g. 45082.33333); epoch 1899-12-30 matches the
    # convention Excel, and pandas' origin="1899-12-30", both use.
    try:
        serial = float(s)
    except ValueError:
        return None
    return datetime(1899, 12, 30) + timedelta(days=serial)


def extract_akita(csv_path: Path) -> tuple[pd.DataFrame, date, int]:
    """Akita's クマダス point CSV -> one row per (fiscal_year, month).

    Returns (monthly dataframe, as_of date of the latest dated bear record,
    count of undated/unparseable 目撃日時 cells among bear rows).
    """
    df = pd.read_csv(csv_path, encoding="utf-8-sig", dtype=str)
    bear = df[df["獣種"] == "ツキノワグマ"].copy()
    bear["dt"] = bear["目撃日時"].map(_parse_akita_datetime)

    undated = int(bear["dt"].isna().sum())
    dated = bear.dropna(subset=["dt"])
    as_of = dated["dt"].max().date()

    dated = dated.copy()
    dated["calendar_year"] = dated["dt"].dt.year
    dated["month"] = dated["dt"].dt.month
    dated["fiscal_year"] = dated["calendar_year"].where(dated["month"] >= 4, dated["calendar_year"] - 1)

    rows = []
    for (fy, month), g in dated.groupby(["fiscal_year", "month"]):
        rec = {"fiscal_year": int(fy), "month": int(month), "bear_reports": int(len(g))}
        for ja, col in AKITA_TYPE_COLUMNS.items():
            rec[col] = int((g["情報種別"] == ja).sum())
        rec["as_of"] = as_of.isoformat()
        rec["source_url"] = AKITA_DATASET_URL
        rows.append(rec)

    out = pd.DataFrame(rows)
    month_order = {m: i for i, m in enumerate(FISCAL_MONTHS)}
    out = out.assign(_order=out["month"].map(month_order)).sort_values(
        ["fiscal_year", "_order"]).drop(columns="_order").reset_index(drop=True)
    out_path = RESEARCH_RECENT / "akita_monthly.csv"
    ensure_dir(out_path.parent)
    out.to_csv(out_path, index=False)
    print(f"[wrote] {out_path.relative_to(REPO_ROOT)} ({len(out)} rows)")
    return out, as_of, undated


def extract_iwate(pdf_path: Path) -> tuple[pd.DataFrame, date]:
    """Iwate's 出没状況 PDF (fiscal year x month table) -> long-form CSV."""
    with pdfplumber.open(pdf_path) as pdf:
        text = pdf.pages[0].extract_text() or ""
        tables = pdf.pages[0].extract_tables()

    as_of = _reiwa_date(text)
    if as_of is None:
        raise ValueError(f"{pdf_path.name}: no 時点 date found in PDF text")

    table = next(t for t in tables if t and t[0] and t[0][0] == "")
    header = table[0]  # ['', '４月', ..., '3月', '計']
    month_cols = [unicodedata.normalize("NFKC", c).replace("月", "") for c in header[1:-1]]
    months = [int(m) for m in month_cols]

    rows = []
    for row in table[1:]:
        label = row[0]
        fy = _reiwa_to_fy(label) if label else None
        if fy is None:
            continue
        for month, cell in zip(months, row[1:-1]):
            count = _int_or_none(cell)
            if count is None:
                continue
            rows.append({
                "fiscal_year": fy,
                "month": month,
                "count": count,
                "as_of": as_of.isoformat(),
                "note": IWATE_NOTE_FY2026 if fy == 2026 else "",
                "source_url": IWATE_LANDING_URL,
            })

    out = pd.DataFrame(rows).sort_values(["fiscal_year", "month"])
    out_path = RESEARCH_RECENT / "iwate_monthly.csv"
    ensure_dir(out_path.parent)
    out.to_csv(out_path, index=False)
    print(f"[wrote] {out_path.relative_to(REPO_ROOT)} ({len(out)} rows)")
    return out, as_of


def extract_miyagi(pdf_path: Path) -> tuple[pd.DataFrame, date]:
    """Miyagi's 市町村別・月別 PDF -> the 月別計 (monthly total) row, long-form."""
    with pdfplumber.open(pdf_path) as pdf:
        text = pdf.pages[0].extract_text() or ""
        tables = pdf.pages[0].extract_tables()

    as_of = _reiwa_date(text)
    if as_of is None:
        raise ValueError(f"{pdf_path.name}: no 時点 date found in PDF text")
    fy = _reiwa_to_fy(text)

    table = next(t for t in tables if any(r and r[0] == "月別計" for r in t))
    total_row = next(r for r in table if r[0] == "月別計")
    months = FISCAL_MONTHS

    rows = []
    for month, cell in zip(months, total_row[1:-1]):
        count = _int_or_none(cell)
        if count is None:
            continue
        rows.append({
            "fiscal_year": fy,
            "month": month,
            "count": count,
            "as_of": as_of.isoformat(),
            "source_url": MIYAGI_LANDING_URL,
        })

    out = pd.DataFrame(rows).sort_values(["fiscal_year", "month"])
    out_path = RESEARCH_RECENT / "miyagi_monthly.csv"
    ensure_dir(out_path.parent)
    out.to_csv(out_path, index=False)
    print(f"[wrote] {out_path.relative_to(REPO_ROOT)} ({len(out)} rows)")
    return out, as_of


# --------------------------------------------------------------------------
# cross-checks against the ministry's own table
# --------------------------------------------------------------------------

def _moe_month_row(moe: pd.DataFrame, pref_ja: str, fy: int) -> dict[int, int]:
    cols = [f"{m}月" for m in FISCAL_MONTHS]
    sub = moe[(moe["prefecture"] == pref_ja) & (moe["fiscal_year"] == fy)]
    if sub.empty:
        return {}
    r = sub.iloc[0]
    return {m: (None if pd.isna(r[c]) else int(r[c])) for m, c in zip(FISCAL_MONTHS, cols)}


def run_cross_checks(akita_monthly: pd.DataFrame, iwate_monthly: pd.DataFrame) -> bool:
    ok = True
    moe = pd.read_csv(MOE_PREF_MONTH)

    print("\n=== cross-checks against research/moe/sightings-by-prefecture-by-month-by-fy.csv ===")

    # Akita FY2025 total must equal the ministry's 13,592.
    akita_fy2025 = int(akita_monthly.loc[akita_monthly["fiscal_year"] == 2025, "bear_reports"].sum())
    moe_akita_fy2025 = sum(v for v in _moe_month_row(moe, "秋田", 2025).values() if v is not None)
    match = akita_fy2025 == moe_akita_fy2025 == 13592
    ok &= match
    print(f"  akita FY2025 total: kumadas={akita_fy2025} moe={moe_akita_fy2025} expected=13592 "
          f"{'OK' if match else 'MISMATCH'}")

    # Akita Apr-Jun 2026 must be within 1% of the ministry's 2,107.
    akita_fy2026_q1 = int(akita_monthly.loc[
        (akita_monthly["fiscal_year"] == 2026) & (akita_monthly["month"].isin([4, 5, 6])), "bear_reports"
    ].sum())
    moe_akita_fy2026 = _moe_month_row(moe, "秋田", 2026)
    moe_q1 = sum(v for m, v in moe_akita_fy2026.items() if m in (4, 5, 6) and v is not None)
    within_1pct = moe_q1 and abs(akita_fy2026_q1 - moe_q1) / moe_q1 <= 0.01
    ok &= bool(within_1pct)
    print(f"  akita FY2026 Apr-Jun: kumadas={akita_fy2026_q1} moe={moe_q1} expected~2107 "
          f"{'OK' if within_1pct else 'MISMATCH'}")

    # Iwate FY2025 months: the prefecture's own PDF carries a FY2025 (令和7年度)
    # row, so this is a genuine independent cross-check, not a tautology.
    iwate_fy2025 = {int(r.month): int(r.count) for r in iwate_monthly.itertuples() if r.fiscal_year == 2025}
    moe_iwate_fy2025 = _moe_month_row(moe, "岩手", 2025)
    if iwate_fy2025:
        mismatches = [m for m in FISCAL_MONTHS
                      if moe_iwate_fy2025.get(m) is not None and iwate_fy2025.get(m) != moe_iwate_fy2025.get(m)]
        ok &= not mismatches
        print(f"  iwate FY2025 months vs moe: {'OK, all 12 months match' if not mismatches else f'MISMATCH at {mismatches}'}")
    else:
        print("  iwate FY2025 months vs moe: skipped (no FY2025 row in the Iwate PDF this run)")

    return ok


# --------------------------------------------------------------------------

def main() -> int:
    ensure_dir(RAW_RECENT)
    ensure_dir(RESEARCH_RECENT)
    errors: list[str] = []

    with httpx.Client(headers=HEADERS) as client:
        for name, fetcher in (("akita", fetch_akita), ("iwate", fetch_iwate), ("miyagi", fetch_miyagi)):
            try:
                fetcher(client)
            except (httpx.HTTPError, ValueError) as e:
                errors.append(f"{name}: {e}")
                print(f"[error]     {name}: {e}", file=sys.stderr)

    # Extract from whatever raw files are on disk (freshly fetched, or the
    # cached copy from a previous run if today's fetch failed).
    akita_csv = RAW_RECENT / "akita_kumadas.csv"
    iwate_pdfs = sorted(RAW_RECENT.glob("iwate_shutubotu_*.pdf"))
    miyagi_pdfs = sorted(RAW_RECENT.glob("miyagi_shukei_*.pdf"))

    akita_monthly = iwate_monthly = None
    if akita_csv.exists():
        akita_monthly, akita_as_of, undated = extract_akita(akita_csv)
        print(f"  akita: as_of={akita_as_of.isoformat()}, undated/unparseable 目撃日時 rows: {undated}")
    else:
        errors.append("akita: no raw CSV on disk to extract")

    if iwate_pdfs:
        iwate_monthly, iwate_as_of = extract_iwate(iwate_pdfs[-1])
        print(f"  iwate: as_of={iwate_as_of.isoformat()}")
    else:
        errors.append("iwate: no raw PDF on disk to extract")

    if miyagi_pdfs:
        _, miyagi_as_of = extract_miyagi(miyagi_pdfs[-1])
        print(f"  miyagi: as_of={miyagi_as_of.isoformat()}")
    else:
        errors.append("miyagi: no raw PDF on disk to extract")

    if akita_monthly is not None and iwate_monthly is not None:
        checks_ok = run_cross_checks(akita_monthly, iwate_monthly)
        if not checks_ok:
            errors.append("cross-checks: one or more mismatches (see above)")

    if errors:
        print(f"\n{len(errors)} problem(s); see above.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
