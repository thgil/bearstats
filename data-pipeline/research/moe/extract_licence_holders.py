"""Hunting-licence holders 1975 to 2021, national, from two MoE summary PDFs.

Sources (環境省 自然環境局, linked from https://www.env.go.jp/nature/choju/docs/docs4/):
  syubetu.pdf    種別狩猟免許所持者数  (by licence type)
  nenreibetu.pdf 年代別狩猟免許所持者数 (by age band)

Both are one-page PowerPoint exports whose table has no ruling lines, so the
cells are read by x-position: every number is assigned to the year header whose
x0 is nearest. Counts are rounded to the nearest hundred by the ministry
(十の位で四捨五入), and the two PDFs disagree on a few totals by a hundred or
so, so both totals are kept side by side rather than reconciled.

Run from data-pipeline/ with .venv/bin/python research/moe/extract_licence_holders.py
"""
from __future__ import annotations

import csv
import re
from pathlib import Path

import pdfplumber

HERE = Path(__file__).resolve().parent
PIPELINE = HERE.parent.parent
RAW = PIPELINE / "raw" / "research" / "baseline"
OUT = HERE / "hunting-licence-holders-1975-2021.csv"

BASE_URL = "https://www.env.go.jp/nature/choju/docs/docs4/"
# Neither PDF prints a date. The only date on disk is the PDF CreationDate
# (pdfinfo), so that is what publish_date carries, and the basis column says so.
PUBLISH_DATE = {"syubetu.pdf": "2025-11-19", "nenreibetu.pdf": "2025-11-19"}

NUM = re.compile(r"^[\d,]+$")


def read_table(path: Path) -> tuple[list[int], dict[str, dict[int, int]]]:
    """Return (years, {row_label: {year: value}}) for one PDF.

    Rows are grouped by rounded `top`; the year header is the row made only of
    four-digit years; every other row with numbers is keyed by the text at its
    left edge. One row in syubetu.pdf (網・わな猟 before the 2007 split) has no
    label at all, so an unlabeled numeric row is keyed by its position.
    """
    with pdfplumber.open(path) as pdf:
        words = pdf.pages[0].extract_words()
    rows: dict[int, list] = {}
    for w in words:
        rows.setdefault(round(w["top"]), []).append(w)

    year_x: list[tuple[int, int]] = []
    table: dict[str, dict[int, int]] = {}
    for top in sorted(rows):
        ws = sorted(rows[top], key=lambda w: w["x0"])
        texts = [w["text"] for w in ws]
        if len(texts) >= 20 and all(re.fullmatch(r"(19|20)\d\d", t) for t in texts):
            year_x = [(round(w["x0"]), int(w["text"])) for w in ws]
            continue
        if not year_x or top > 200:  # the bar chart below the table repeats numbers
            continue
        nums = [w for w in ws if NUM.match(w["text"])]
        if not nums:
            continue
        label = "".join(w["text"] for w in ws if not NUM.match(w["text"])) or f"_unlabeled_{top}"
        table[label] = {
            min(year_x, key=lambda yx: abs(yx[0] - w["x0"]))[1]: int(w["text"].replace(",", ""))
            for w in nums
        }
    return [y for _, y in year_x], table


def main() -> None:
    years, by_type = read_table(RAW / "syubetu.pdf")
    years_age, by_age = read_table(RAW / "nenreibetu.pdf")
    assert years == years_age and len(years) == 23, (years, years_age)

    unlabeled = [k for k in by_type if k.startswith("_unlabeled_")]
    assert len(unlabeled) == 1, unlabeled
    net_trap = by_type[unlabeled[0]]
    total = by_type["合計"]
    assert len(total) == 23 and total[1975] == 517_800 and total[2021] == 213_400
    assert len(by_age["60歳以上"]) == 23 and len(by_age["合計"]) == 23

    rows = []
    for y in years:
        gun1 = by_type["第１種銃猟"][y]
        gun2 = by_type["第２種銃猟"][y]
        net = by_type["網猟"].get(y)
        trap = by_type["わな猟"].get(y)
        combined = net_trap.get(y)
        # 2007 onward splits 網・わな into two licences; before that one row.
        assert (net is None and trap is None and combined is not None) if y < 2007 else (
            net is not None and trap is not None and combined is None), y
        parts = gun1 + gun2 + (combined if y < 2007 else net + trap)
        # Components are rounded separately, so allow rounding slack only.
        assert abs(parts - total[y]) <= 300, (y, parts, total[y])
        rows.append({
            "year": y,
            "total": total[y],
            "gun1": gun1,
            "gun2": gun2,
            "net": net,
            "trap": trap,
            "net_trap_combined": combined,
            "age60plus": by_age["60歳以上"][y],
            "total_by_age_table": by_age["合計"][y],
            "source_url": BASE_URL + "syubetu.pdf",
            "source_url_age": BASE_URL + "nenreibetu.pdf",
            "publish_date": PUBLISH_DATE["syubetu.pdf"],
            "publish_date_basis": "PDF CreationDate (pdfinfo); no date printed in the file",
            "source_file": "data-pipeline/raw/research/baseline/syubetu.pdf; nenreibetu.pdf",
            "method": "pdfplumber words assigned to nearest year-header x0",
            "note": "rounded to the nearest 100 by MoE; 1975-2005 every five years",
        })

    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {OUT.relative_to(PIPELINE)} ({len(rows)} rows)")
    for r in rows:
        if r["total"] != r["total_by_age_table"]:
            print(f"  note: {r['year']} total {r['total']:,} (by type) vs {r['total_by_age_table']:,} (by age)")


if __name__ == "__main__":
    main()
