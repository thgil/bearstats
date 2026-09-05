"""Extract the national total (計) row of monthly bear sightings from each
syutubotu.pdf edition (live + Wayback snapshots) and validate that each
fiscal year's 12 months sum to the printed 合計 column."""
import re, csv, json, pdfplumber, sys
HERE = "/Users/fergus/Projects/bearstats/data-pipeline/raw/research/moe/"
FILES = {  # file -> (fiscal years in column order, snapshot date)
    "syutubotu-2016-snapshot.pdf": ([2013, 2014, 2015, 2016], "2016-12-01"),
    "syutubotu-2021-snapshot.pdf": ([2016, 2017, 2018, 2019, 2020], "2021-03-26"),
    "syutubotu-2022-snapshot.pdf": ([2018, 2019, 2020, 2021, 2022], "2022-06-06"),
    "syutubotu.pdf":               ([2022, 2023, 2024, 2025, 2026], "2026-08-06"),
}
MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
NUM = re.compile(r"\d{1,3}(?:,\d{3})+|\d+")

def total_row_tokens(path):
    with pdfplumber.open(path) as pdf:
        page = pdf.pages[0]
        words = page.extract_words(x_tolerance=1, keep_blank_chars=False)
    kei = [w for w in words if w["text"] == "計"]
    # the national-total row label is the left-most 計 (there is also 合計 in the header)
    kei = sorted(kei, key=lambda w: w["x0"])[0]
    row = [w for w in words if abs(w["top"] - kei["top"]) < 2 and w["x0"] > kei["x1"]]
    row.sort(key=lambda w: w["x0"])
    toks = []
    for w in row:
        toks.extend(NUM.findall(w["text"]))  # split any glued tokens like "2,0561,651"
    return [int(t.replace(",", "")) for t in toks]

out = {}   # fy -> dict(month->value, total, source)
for fname, (fys, snap) in FILES.items():
    toks = total_row_tokens(HERE + fname)
    n = len(fys)
    assert len(toks) == 13 * n, (fname, len(toks), toks)
    for j, fy in enumerate(fys):
        months = {MONTHS[m]: toks[m * n + j] for m in range(12)}
        printed_total = toks[12 * n + j]
        ok = sum(months.values()) == printed_total
        print(f"{fname:30s} FY{fy}: months={list(months.values())} sum={sum(months.values())} printed_total={printed_total} {'OK' if ok else 'MISMATCH'}")
        rec = dict(fy=fy, source=fname, snapshot=snap, printed_total=printed_total, sum_ok=ok, **{f"m{m:02d}": v for m, v in months.items()})
        # keep the latest edition that has the year (later editions carry revisions and complete partial years)
        out[fy] = rec
with open(HERE + "extracted/national-monthly-sightings-fy2013-fy2026.csv", "w", newline="") as f:
    cols = ["fy", "source", "snapshot", "printed_total", "sum_ok"] + [f"m{m:02d}" for m in MONTHS]
    w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
    for fy in sorted(out): w.writerow(out[fy])
print("\nChosen edition per FY:")
for fy in sorted(out): print(fy, out[fy]["source"], out[fy]["printed_total"])
