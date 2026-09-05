"""Build the extended Tohoku Regional Forest Office beech CSVs (FY2012-FY2022 rows)
from values transcribed from the PDFs under data-pipeline/raw/research/tohoku/.

Every value below was read from the named PDF (pdftotext -layout for files with a
text layer; visual read of the rendered page for buna-25, buna-44, buna-45).
"""
import csv, math, sys

BASE = "https://www.rinya.maff.go.jp/tohoku/sidou/attach/pdf/"
RESEARCH = "/Users/fergus/Projects/bearstats/data-pipeline/research/mast/"
PREFS = ["青森県", "岩手県", "宮城県", "秋田県", "山形県"]
TEXT = "pdftotext -layout text layer"
VISUAL = "visual read of scanned PDF (no text layer; page rendered with pdftoppm and read with the Read tool)"

# (fy, pdf number, publish_date, method, rows[pref -> (full, partial, slight, none, total, index, category, note)])
ACTUAL = [
    (2012, 45, "2012-11-21", VISUAL, {
        "青森県": (0, 1, 11, 26, 38, "0.4", "皆無", ""),
        "岩手県": (0, 0, 1, 23, 24, "0.04", "皆無", "index printed to two decimals in the PDF"),
        "宮城県": (1, 2, 2, 1, 6, "2.2", "並作", ""),
        "秋田県": (1, 1, 28, 25, 55, "0.7", "皆無", ""),
        "山形県": (0, 0, 4, 18, 22, "0.2", "皆無", ""),
    }),
    (2013, 46, "2013-11-22", TEXT, {
        "青森県": (18, 10, 8, 2, 38, "3.4", "並作", ""),
        "岩手県": (14, 6, 2, 2, 24, "3.8", "豊作", ""),
        "宮城県": (6, 0, 0, 0, 6, "5.0", "豊作", ""),
        "秋田県": (21, 10, 24, 0, 55, "2.9", "並作", ""),
        "山形県": (4, 7, 10, 1, 22, "2.3", "並作", ""),
    }),
    (2014, 48, "2015-03-27", TEXT, {
        "青森県": (1, 1, 17, 18, 37, "0.8", "皆無", "printed 0.8 in buna-48 but the printed counts 1/1/17/18 of 37 give 0.68; the office's later summary tables (buna-50, buna-52, buna-12) restate this year as 0.7, the archive page as 0.8; kept as printed in the primary. Release dated 2015-03-27"),
        "岩手県": (0, 0, 4, 20, 24, "0.2", "皆無", ""),
        "宮城県": (0, 0, 4, 2, 6, "0.7", "皆無", ""),
        "秋田県": (0, 2, 13, 39, 54, "0.4", "皆無", ""),
        "山形県": (0, 0, 5, 17, 22, "0.2", "皆無", "2 points not surveyed (road washout)"),
    }),
    (2015, 50, "2015-12-09", TEXT, {
        "青森県": (6, 9, 16, 6, 37, "2.0", "並作", ""),
        "岩手県": (17, 5, 1, 1, 24, "4.2", "豊作", ""),
        "宮城県": (1, 4, 0, 0, 5, "3.4", "並作", ""),
        "秋田県": (9, 11, 18, 14, 52, "1.8", "凶作", ""),
        "山形県": (10, 8, 2, 2, 22, "3.5", "豊作", "5 points not surveyed in total (road washout); 140 surveyed"),
    }),
    (2016, 52, "2016-11-16", TEXT, {
        "青森県": (0, 2, 14, 22, 38, "0.5", "皆無", ""),
        "岩手県": (0, 0, 1, 21, 22, "0.045", "皆無", "index printed to three decimals in the PDF"),
        "宮城県": (0, 0, 0, 6, 6, "0.0", "皆無", ""),
        "秋田県": (0, 0, 5, 48, 53, "0.1", "皆無", ""),
        "山形県": (0, 0, 3, 19, 22, "0.1", "皆無", "4 points not surveyed in total (road washout); 141 surveyed"),
    }),
    (2017, 13, "2017-11-27", TEXT, {
        "青森県": (1, 9, 13, 15, 38, "1.2", "凶作", ""),
        "岩手県": (0, 5, 13, 6, 24, "1.2", "凶作", ""),
        "宮城県": (0, 1, 1, 4, 6, "0.7", "大凶作", ""),
        "秋田県": (1, 3, 22, 27, 53, "0.7", "大凶作", ""),
        "山形県": (0, 0, 8, 14, 22, "0.4", "大凶作", "2 points not surveyed in total (road closed); 143 surveyed; class 皆無 renamed 大凶作 from this year"),
    }),
    (2018, 17, "2018-11-05", TEXT, {
        "青森県": (2, 5, 22, 9, 38, "1.2", "凶作", ""),
        "岩手県": (2, 6, 15, 1, 24, "1.8", "凶作", ""),
        "宮城県": (1, 3, 1, 1, 6, "2.5", "並作", ""),
        "秋田県": (4, 16, 23, 11, 54, "1.7", "凶作", ""),
        "山形県": (14, 4, 3, 1, 22, "3.9", "豊作", "1 point not surveyed in total; 144 surveyed"),
    }),
    (2019, 25, "2019-11-12", VISUAL, {
        "青森県": (0, 1, 19, 18, 38, "0.6", "大凶作", ""),
        "岩手県": (0, 0, 3, 21, 24, "0.1", "大凶作", ""),
        "宮城県": (0, 0, 2, 4, 6, "0.3", "大凶作", ""),
        "秋田県": (0, 0, 10, 45, 55, "0.2", "大凶作", ""),
        "山形県": (0, 0, 1, 21, 22, "0.0", "大凶作", ""),
    }),
    (2020, 27, "2020-11-11", TEXT, {
        "青森県": (7, 12, 17, 2, 38, "2.3", "並作", ""),
        "岩手県": (1, 4, 12, 6, 23, "1.3", "凶作", ""),
        "宮城県": (0, 1, 1, 4, 6, "0.7", "大凶作", ""),
        "秋田県": (11, 8, 28, 7, 54, "2.0", "並作", ""),
        "山形県": (1, 0, 2, 18, 21, "0.3", "大凶作", "3 points not surveyed in total (road damage); 142 surveyed"),
    }),
    (2021, 29, "2021-11-11", TEXT, {
        "青森県": (1, 4, 20, 13, 38, "1.0", "凶作", ""),
        "岩手県": (1, 0, 10, 12, 23, "0.7", "大凶作", ""),
        "宮城県": (0, 2, 4, 0, 6, "1.7", "凶作", ""),
        "秋田県": (0, 0, 11, 43, 54, "0.2", "大凶作", ""),
        "山形県": (2, 3, 13, 3, 21, "1.5", "凶作", "3 points not surveyed in total (road damage); 142 surveyed"),
    }),
]
# FY2022 fruiting was published per prefecture, one PDF each.
ACTUAL_R4 = [
    ("青森県", 38, "2022-10-26", (10, 14, 11, 1, 36, "2.9", "並作", "2 points not surveyed (road damage)")),
    ("岩手県", 40, "2022-10-28", (6, 9, 5, 3, 23, "2.7", "並作", "1 point not surveyed (road damage)")),
    ("宮城県", 39, "2022-10-07", (0, 2, 2, 2, 6, "1.3", "凶作", "")),
    ("秋田県", 36, "2022-10-26", (21, 9, 16, 6, 52, "2.8", "並作", "3 points not surveyed (road damage)")),
    ("山形県", 37, "2022-10-21", (8, 8, 2, 3, 21, "3.1", "並作", "1 point not surveyed (road damage)")),
]

FORECAST = [
    (2012, 44, "2012-07-31", VISUAL, {
        "青森県": (1, 11, 10, 16, 38, "1.3", "凶作", ""),
        "岩手県": (0, 3, 8, 13, 24, "0.7", "皆無", ""),
        "宮城県": (3, 0, 2, 1, 6, "2.8", "並作", ""),
        "秋田県": (0, 5, 32, 18, 55, "0.9", "皆無", ""),
        "山形県": (1, 1, 9, 11, 22, "0.8", "皆無", ""),
    }),
    (2013, 53, "2013-07-25", TEXT, {
        "青森県": (18, 14, 4, 2, 38, "3.6", "豊作", ""),
        "岩手県": (16, 5, 2, 1, 24, "4.0", "豊作", ""),
        "宮城県": (2, 4, 0, 0, 6, "3.7", "豊作", ""),
        "秋田県": (30, 14, 8, 3, 55, "3.6", "豊作", ""),
        "山形県": (4, 6, 12, 0, 22, "2.3", "並作", ""),
    }),
    (2014, 47, "2014-07-31", TEXT, {
        "青森県": (3, 12, 14, 9, 38, "1.7", "凶作", ""),
        "岩手県": (0, 0, 6, 18, 24, "0.3", "皆無", ""),
        "宮城県": (0, 2, 2, 2, 6, "1.3", "凶作", "buna-47 misprints the Miyagi point counts as 3/14/22/29/68 (cumulative totals of the rows above it; index 1.3 and category are printed correctly); counts taken from the forecast row restated in buna-48 (2015-03-27), which gives 0/2/2/2/6 and 1.3"),
        "秋田県": (1, 5, 21, 27, 54, "0.8", "皆無", ""),
        "山形県": (0, 1, 9, 12, 22, "0.6", "皆無", "1 point not surveyed in total (road washout); 144 surveyed"),
    }),
    (2015, 49, "2015-07-10", TEXT, {
        "青森県": (13, 9, 10, 5, 37, "2.8", "並作", ""),
        "岩手県": (15, 6, 2, 1, 24, "4.0", "豊作", ""),
        "宮城県": (3, 1, 2, 0, 6, "3.3", "並作", ""),
        "秋田県": (11, 16, 17, 5, 49, "2.4", "並作", ""),
        "山形県": (12, 4, 3, 3, 22, "3.4", "並作", "7 points not surveyed in total (road washout); 138 surveyed"),
    }),
    (2016, 51, "2016-07-06", TEXT, {
        "青森県": (3, 7, 16, 12, 38, "1.4", "凶作", ""),
        "岩手県": (0, 1, 4, 19, 24, "0.3", "皆無", ""),
        "宮城県": (0, 0, 3, 3, 6, "0.5", "皆無", ""),
        "秋田県": (1, 1, 17, 32, 51, "0.5", "皆無", ""),
        "山形県": (0, 1, 12, 8, 21, "0.7", "皆無", "5 points not surveyed in total (road washout); 140 surveyed"),
    }),
    (2017, 12, "2017-07-13", TEXT, {
        "青森県": (4, 16, 8, 10, 38, "2.0", "並作", ""),
        "岩手県": (1, 6, 11, 6, 24, "1.4", "凶作", ""),
        "宮城県": (0, 1, 1, 4, 6, "0.7", "大凶作", ""),
        "秋田県": (0, 9, 28, 17, 54, "1.0", "凶作", ""),
        "山形県": (0, 2, 13, 7, 22, "0.9", "大凶作", "1 point not surveyed in total; 144 surveyed; class 皆無 renamed 大凶作 from this year"),
    }),
    (2018, 11, "2018-07-05", TEXT, {
        "青森県": (4, 13, 18, 3, 38, "2.0", "並作", ""),
        "岩手県": (7, 8, 7, 2, 24, "2.8", "並作", ""),
        "宮城県": (2, 2, 2, 0, 6, "3.0", "並作", ""),
        "秋田県": (9, 19, 17, 9, 54, "2.2", "並作", ""),
        "山形県": (16, 2, 3, 1, 22, "4.0", "豊作", "1 point not surveyed in total; 144 surveyed"),
    }),
    (2019, 18, "2019-07-05", TEXT, {
        "青森県": (0, 14, 18, 6, 38, "1.6", "凶作", ""),
        "岩手県": (0, 2, 12, 10, 24, "0.8", "大凶作", ""),
        "宮城県": (0, 0, 2, 4, 6, "0.3", "大凶作", ""),
        "秋田県": (1, 0, 30, 24, 55, "0.6", "大凶作", ""),
        "山形県": (0, 0, 3, 19, 22, "0.1", "大凶作", ""),
    }),
    (2020, 20, "2020-07-15", TEXT, {
        "青森県": (13, 16, 8, 1, 38, "3.2", "並作", ""),
        "岩手県": (1, 10, 7, 5, 23, "1.8", "凶作", ""),
        "宮城県": (0, 3, 1, 2, 6, "1.7", "凶作", ""),
        "秋田県": (19, 13, 19, 3, 54, "2.8", "並作", ""),
        "山形県": (1, 1, 8, 12, 22, "0.7", "大凶作", "2 points not surveyed in total (road damage); 143 surveyed"),
    }),
    (2021, 28, "2021-07-08", TEXT, {
        "青森県": (4, 15, 11, 8, 38, "2.0", "並作", ""),
        "岩手県": (1, 1, 14, 7, 23, "1.0", "凶作", ""),
        "宮城県": (3, 3, 0, 0, 6, "4.0", "豊作", ""),
        "秋田県": (4, 5, 17, 28, 54, "1.0", "凶作", ""),
        "山形県": (4, 3, 10, 4, 21, "1.9", "凶作", "3 points not surveyed in total (road damage); 142 surveyed"),
    }),
    (2022, 30, "2022-06-17", TEXT, {
        "青森県": (21, 12, 4, 1, 38, "3.8", "豊作", ""),
        "岩手県": (10, 7, 5, 1, 23, "3.3", "並作", ""),
        "宮城県": (4, 1, 1, 0, 6, "4.0", "豊作", ""),
        "秋田県": (33, 8, 8, 4, 53, "3.7", "豊作", ""),
        "山形県": (9, 7, 5, 0, 21, "3.4", "並作", "4 points not surveyed in total (road damage); 141 surveyed"),
    }),
]

# Archive-page summary table (gaps/tohoku-sidou-buna.html), flowering/fruiting per prefecture, for cross-check.
ARCHIVE = {
    2012: "1.3 0.4 0.7 0.04 2.8 2.2 0.9 0.7 0.8 0.2", 2013: "3.6 3.4 4.0 3.8 3.7 5.0 3.6 2.9 2.3 2.3",
    2014: "1.7 0.8 0.3 0.2 1.3 0.7 0.8 0.4 0.6 0.2", 2015: "2.8 2.0 4.0 4.2 3.3 3.4 2.4 1.8 3.4 3.5",
    2016: "1.4 0.5 0.3 0.0 0.5 0.0 0.5 0.1 0.7 0.1", 2017: "2.0 1.2 1.4 1.2 0.7 0.7 1.0 0.7 0.9 0.4",
    2018: "2.0 1.2 2.8 1.8 3.0 2.5 2.2 1.7 4.0 3.9", 2019: "1.6 0.6 0.8 0.1 0.3 0.3 0.6 0.2 0.1 0.0",
    2020: "3.2 2.3 1.8 1.3 1.7 0.7 2.8 2.0 0.7 0.3", 2021: "2.0 1.0 1.0 0.7 4.0 1.7 1.0 0.2 1.9 1.5",
    2022: "3.8 2.9 3.3 2.7 4.0 1.3 3.7 2.8 3.4 3.1",
}

def category_for(idx):
    return "豊作" if idx >= 3.5 else "並作" if idx >= 2.0 else "凶作" if idx >= 1.0 else "大凶作/皆無"

problems = []
def check(kind, fy, pref, v):
    full, part, slight, none, total, idx, cat, _ = v
    if full + part + slight + none != total:
        problems.append(f"{kind} {fy} {pref}: counts sum {full+part+slight+none} != total {total}")
    calc = (5 * full + 3 * part + slight) / total
    printed = float(idx)
    if abs(calc - printed) > 0.056 and not (fy == 2014 and pref == "青森県" and kind == "actual"):
        problems.append(f"{kind} {fy} {pref}: computed index {calc:.3f} vs printed {printed}")
    c = category_for(printed)
    if not (cat == c or (c == "大凶作/皆無" and cat in ("大凶作", "皆無"))):
        problems.append(f"{kind} {fy} {pref}: category {cat} inconsistent with index {printed}")
    arch = ARCHIVE[fy].split()
    col = PREFS.index(pref) * 2 + (0 if kind == "forecast" else 1)
    if abs(float(arch[col]) - printed) > 0.05:
        problems.append(f"{kind} {fy} {pref}: archive page says {arch[col]}, PDF says {printed}")

def read_existing(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def write(path, catcol, rows):
    cols = ["fiscal_year", "prefecture", "points_full", "points_partial", "points_slight", "points_none",
            "points_total", "mast_index", catcol, "source_pdf", "source_url", "publish_date", "method", "notes"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow(r)

def row(fy, pref, n, date, method, v, catcol):
    full, part, slight, none, total, idx, cat, note = v
    return {"fiscal_year": fy, "prefecture": pref, "points_full": full, "points_partial": part,
            "points_slight": slight, "points_none": none, "points_total": total, "mast_index": idx,
            catcol: cat, "source_pdf": f"tohoku-buna-{n}.pdf", "source_url": f"{BASE}buna-{n}.pdf",
            "publish_date": date, "method": method, "notes": note}

actual_rows = []
for fy, n, date, method, d in ACTUAL:
    for pref in PREFS:
        check("actual", fy, pref, d[pref]); actual_rows.append(row(fy, pref, n, date, method, d[pref], "actual_category"))
for pref, n, date, v in ACTUAL_R4:
    check("actual", 2022, pref, v); actual_rows.append(row(2022, pref, n, date, TEXT, v, "actual_category"))
forecast_rows = []
for fy, n, date, method, d in FORECAST:
    for pref in PREFS:
        check("forecast", fy, pref, d[pref]); forecast_rows.append(row(fy, pref, n, date, method, d[pref], "forecast_category"))

if problems:
    print("\n".join(problems)); sys.exit(1)

for fname, catcol, new in (("tohoku_forest_office_fruiting_actual.csv", "actual_category", actual_rows),
                           ("tohoku_forest_office_flowering_forecast.csv", "forecast_category", forecast_rows)):
    old = [r for r in read_existing(RESEARCH + fname) if int(r["fiscal_year"]) >= 2023]  # idempotent: keep only the pre-existing FY2023+ rows
    for r in old:
        r.setdefault("method", "text layer (pre-existing row, values unchanged)"); r.setdefault("notes", "")
    write(RESEARCH + fname, catcol, new + old)
    print(fname, "new", len(new), "existing", len(old), "total", len(new) + len(old))
