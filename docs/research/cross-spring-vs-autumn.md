# Spring vs autumn: does a high Apr-Jun count predict a bad autumn?

Cross-check for GOAL.md claim #4 ("Spring does not predict autumn") and the FY2026 framing in claims #3/#4.
Written 2026-09-05. All arithmetic below was run in `data-pipeline/.venv` (Python, no scipy); the code and its verbatim output are included.

## Data

National monthly bear sighting counts (クマ類の出没情報について［速報値］, Ministry of the Environment, `syutubotu.pdf`), national total row (計), by fiscal year (April to March).

| Fiscal years | File | Edition date | Notes |
|---|---|---|---|
| FY2013-FY2015 | `data-pipeline/raw/research/moe/syutubotu-2016-snapshot.pdf` (Wayback, 2016-12-23 capture) | 平成28年12月1日 | 37 prefectures + 計; no 北海道 or 千葉 rows (both contribute nothing in later editions: 北海道 "－", 千葉 all zero). FY2016 in this edition is partial (Nov onward blank) and was not used. |
| FY2016-FY2017 | `data-pipeline/raw/research/moe/syutubotu-2021-snapshot.pdf` (Wayback, 2021-04-18) | 令和3年3月26日 | FY2020 in this edition is partial (March blank) and was not used. |
| FY2018-FY2021 | `data-pipeline/raw/research/moe/syutubotu-2022-snapshot.pdf` (Wayback, 2022-06-30) | 令和4年6月6日 | FY2019/FY2020 carry small upward revisions vs the 2021 edition (18,314→18,317; 20,723→20,887). |
| FY2022-FY2026 | `data-pipeline/raw/research/moe/syutubotu.pdf` (live) | 令和8年8月6日 | Identical to `webapp/data/national-timeline.json` `monthly.sightings` (asserted in code). FY2026 has Apr-Jun only. |

Extraction: `data-pipeline/raw/research/moe/extracted/extract_national_monthly.py` reads the 計 row of each PDF with pdfplumber word x-positions, splits any glued tokens, and checks that each year's 12 months sum to the printed 合計. Output: `data-pipeline/raw/research/moe/extracted/national-monthly-sightings-fy2013-fy2026.csv`.

Validation result: 18 of 19 (file, year) pairs sum exactly. The one exception is FY2021 in the 2022 edition: monthly cells sum to 12,735 but the printed 合計 is 12,766. I checked every prefecture row of that edition by x-position: the 計 row's months equal the sum of all prefecture months (12,735) and its printed total equals the sum of the prefectures' printed totals (12,766); 21 prefectures have month-vs-total differences of 1-10 in that edition. So the gap is an inconsistency in the source (likely late revisions applied to totals but not to months), not an extraction error. The tables below use the monthly cells (12,735) because the seasonal blocks need months; the printed total is shown alongside.

Caveats that apply to the whole series: counts are 速報値 (provisional) and each prefecture compiles them by its own method (police reports, municipal reports, etc., per 注１ on every edition), so the series is a count of reports, not of bears; the 2016-era edition's 注２ says prefectures without comprehensive data are omitted, so coverage in FY2013-15 may be slightly narrower than later, though the prefecture list is the same 37.

## Seasonal blocks by fiscal year

Spring = Apr-Jun, summer = Jul-Sep, autumn = Oct-Nov, winter = Dec-Mar. Ratios are computed on the raw counts.

| FY | Apr-Jun | Jul-Sep | Oct-Nov | Dec-Mar | Full year | Oct-Nov / Apr-Jun | Full / Apr-Jun | Oct-Nov share of year | Source edition |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 2013 | 3,214 | 4,511 | 1,154 | 254 | 9,133 | 0.36 | 2.84 | 13% | syutubotu-2016-snapshot.pdf |
| 2014 | 3,826 | 7,889 | 3,946 | 320 | 15,981 | 1.03 | 4.18 | 25% | syutubotu-2016-snapshot.pdf |
| 2015 | 3,928 | 4,078 | 1,305 | 286 | 9,597 | 0.33 | 2.44 | 14% | syutubotu-2016-snapshot.pdf |
| 2016 | 6,012 | 7,178 | 4,444 | 482 | 18,116 | 0.74 | 3.01 | 25% | syutubotu-2021-snapshot.pdf |
| 2017 | 5,068 | 6,296 | 1,182 | 266 | 12,812 | 0.23 | 2.53 | 9% | syutubotu-2021-snapshot.pdf |
| 2018 | 5,717 | 5,338 | 1,393 | 361 | 12,809 | 0.24 | 2.24 | 11% | syutubotu-2022-snapshot.pdf |
| 2019 | 5,026 | 8,027 | 4,630 | 634 | 18,317 | 0.92 | 3.64 | 25% | syutubotu-2022-snapshot.pdf |
| 2020 | 4,951 | 8,836 | 6,501 | 599 | 20,887 | 1.31 | 4.22 | 31% | syutubotu-2022-snapshot.pdf |
| 2021 | 4,561 | 5,241 | 2,455 | 478 | 12,735 (printed 合計 12,766) | 0.54 | 2.79 | 19% | syutubotu-2022-snapshot.pdf |
| 2022 | 4,376 | 4,798 | 1,588 | 374 | 11,136 | 0.36 | 2.54 | 14% | syutubotu.pdf |
| 2023 | 5,691 | 7,700 | 9,683 | 1,274 | 24,348 | 1.70 | 4.28 | 40% | syutubotu.pdf |
| 2024 | 7,601 | 8,231 | 3,518 | 1,163 | 20,513 | 0.46 | 2.70 | 17% | syutubotu.pdf |
| 2025 | 7,555 | 13,996 | 26,336 | 2,914 | 50,801 | 3.49 | 6.72 | 52% | syutubotu.pdf |
| 2026 (Apr-Jun only) | 12,628 | - | - | - | 12,628 so far | - | - | - | syutubotu.pdf |

Ranks (1 = highest), 13 complete years:

| FY | Apr-Jun | rank | Oct-Nov | rank |
|---|---:|---:|---:|---:|
| 2013 | 3,214 | 13 | 1,154 | 13 |
| 2014 | 3,826 | 12 | 3,946 | 6 |
| 2015 | 3,928 | 11 | 1,305 | 11 |
| 2016 | 6,012 | 3 | 4,444 | 5 |
| 2017 | 5,068 | 6 | 1,182 | 12 |
| 2018 | 5,717 | 4 | 1,393 | 10 |
| 2019 | 5,026 | 7 | 4,630 | 4 |
| 2020 | 4,951 | 8 | 6,501 | 3 |
| 2021 | 4,561 | 9 | 2,455 | 8 |
| 2022 | 4,376 | 10 | 1,588 | 9 |
| 2023 | 5,691 | 5 | 9,683 | 2 |
| 2024 | 7,601 | 1 | 3,518 | 7 |
| 2025 | 7,555 | 2 | 26,336 | 1 |

Year-on-year direction, Apr-Jun vs Oct-Nov (12 adjacent pairs):

| Pair | Apr-Jun change | Oct-Nov change | Direction |
|---|---:|---:|---|
| FY2013→14 | +612 (+19%) | +2,792 (+242%) | same |
| FY2014→15 | +102 (+3%) | −2,641 (−67%) | opposite |
| FY2015→16 | +2,084 (+53%) | +3,139 (+241%) | same |
| FY2016→17 | −944 (−16%) | −3,262 (−73%) | same |
| FY2017→18 | +649 (+13%) | +211 (+18%) | same |
| FY2018→19 | −691 (−12%) | +3,237 (+232%) | opposite |
| FY2019→20 | −75 (−1%) | +1,871 (+40%) | opposite |
| FY2020→21 | −390 (−8%) | −4,046 (−62%) | same |
| FY2021→22 | −185 (−4%) | −867 (−35%) | same |
| FY2022→23 | +1,315 (+30%) | +8,095 (+510%) | same |
| FY2023→24 | +1,910 (+34%) | −6,165 (−64%) | opposite |
| FY2024→25 | −46 (−1%) | +22,818 (+649%) | opposite |

Same direction in 7 of 12 pairs (spring up & autumn up 4; spring down & autumn down 3; spring up & autumn down 2; spring down & autumn up 3).

Correlations (permutation p-values, 20,000 shuffles, seed 1):

| Sample | n | Apr-Jun vs Oct-Nov, Pearson r | Spearman ρ | Apr-Jun vs (Oct-Nov/Apr-Jun) ratio, r | Apr-Jun vs full year, r / ρ |
|---|---:|---:|---:|---:|---:|
| FY2013-25 | 13 | +0.60 (p=0.025) | +0.47 (p=0.108) | +0.51 (p=0.083) | +0.72 / +0.69 |
| FY2013-25 excluding FY2025 | 12 | +0.33 (p=0.287) | +0.36 (p=0.246) | +0.10 (p=0.744) | - |
| FY2013-25 excluding FY2023 and FY2025 | 11 | +0.30 (p=0.370) | +0.32 (p=0.344) | −0.03 (p=0.923) | - |
| FY2022-25 (the 4 years on the site) | 4 | +0.54 | +0.40 | +0.47 | +0.67 / +0.40 |

Oct-Nov / Apr-Jun ratio over the 13 complete years: min 0.23 (FY2017), median 0.54, max 3.49 (FY2025). A 15-fold spread.

## FY2026 Apr-Jun against each prior year, and a what-if (not a forecast)

FY2026 Apr-Jun = 12,628 (live syutubotu.pdf, 令和8年8月6日). The two right-hand what-if columns simply multiply 12,628 by each prior year's ratio. They are not forecasts: they assume FY2026 repeats a past year's seasonal shape, and the ratio has ranged 15-fold.

| Prior FY | Its Apr-Jun | FY2026 Apr-Jun vs it | Its Oct-Nov/Apr-Jun | What-if FY2026 Oct-Nov | Its Full/Apr-Jun | What-if FY2026 full year |
|---|---:|---:|---:|---:|---:|---:|
| 2013 | 3,214 | 3.93x (+293%) | 0.36 | 4,534 | 2.84 | 35,884 |
| 2014 | 3,826 | 3.30x (+230%) | 1.03 | 13,024 | 4.18 | 52,746 |
| 2015 | 3,928 | 3.21x (+221%) | 0.33 | 4,195 | 2.44 | 30,853 |
| 2016 | 6,012 | 2.10x (+110%) | 0.74 | 9,334 | 3.01 | 38,052 |
| 2017 | 5,068 | 2.49x (+149%) | 0.23 | 2,945 | 2.53 | 31,924 |
| 2018 | 5,717 | 2.21x (+121%) | 0.24 | 3,077 | 2.24 | 28,293 |
| 2019 | 5,026 | 2.51x (+151%) | 0.92 | 11,633 | 3.64 | 46,022 |
| 2020 | 4,951 | 2.55x (+155%) | 1.31 | 16,581 | 4.22 | 53,274 |
| 2021 | 4,561 | 2.77x (+177%) | 0.54 | 6,797 | 2.79 | 35,259 |
| 2022 | 4,376 | 2.89x (+189%) | 0.36 | 4,583 | 2.54 | 32,136 |
| 2023 | 5,691 | 2.22x (+122%) | 1.70 | 21,486 | 4.28 | 54,027 |
| 2024 | 7,601 | 1.66x (+66%) | 0.46 | 5,845 | 2.70 | 34,079 |
| 2025 | 7,555 | 1.67x (+67%) | 3.49 | 44,020 | 6.72 | 84,913 |

What-if ranges (labelled as such):

- FY2026 Oct-Nov: 2,945 (FY2017 shape) to 44,020 (FY2025 shape); median across the 13 shapes 6,797. Using only the 4 site years FY2022-25: 4,583 to 44,020.
- FY2026 full year: 28,293 (FY2018 shape) to 84,913 (FY2025 shape); median 35,884. Using only FY2022-25: 32,136 to 84,913.
- For scale: FY2025 actual Oct-Nov was 26,336 and full year 50,801. FY2026's Apr-Jun alone (12,628) already exceeds the full-year totals of FY2013 (9,133) and FY2015 (9,597).

The lower bound of the full-year what-if (28,293) would itself be the second-highest year on record after FY2025, because even the flattest seasonal shape in the series (FY2018, full/spring = 2.24) applied to a 12,628 spring lands above FY2023's 24,348. That statement depends only on the arithmetic identity full ≥ spring × min ratio and on no year in the series having a full/spring ratio below 2.24; it is still a what-if, since FY2026 could in principle have a flatter shape than any year since FY2013.

## What this supports / does not support

**Supports:**

1. The specific FY2024/FY2025 sentence in GOAL.md claim #4 is exactly right on the data: FY2024 Apr-Jun (7,601) was ahead of FY2025 Apr-Jun (7,555), and FY2024 finished at 20,513 / 50,801 = 40.4%.
2. Claim #3's "+67%" is exact: 12,628 / 7,555 = 1.672.
3. With 13 years instead of 4, "spring does not predict autumn" holds in the sense that matters for the page: the Oct-Nov / Apr-Jun ratio ranges from 0.23 to 3.49 (15x), so knowing the spring count pins the autumn count only to within an order of magnitude. Spearman rank correlation between spring and Oct-Nov is +0.47 (p=0.11), not significant at n=13, and falls to +0.36 (p=0.25) without FY2025. The spring count has essentially no relationship with the autumn/spring ratio once FY2025 is excluded (r=+0.10, p=0.74; without FY2023 as well, r=−0.03).
4. The year-on-year direction of spring got the direction of autumn wrong in 5 of 12 adjacent-year pairs, including the three biggest autumn moves relative to spring (FY2018→19, FY2023→24, FY2024→25). Three of the four largest autumns (FY2019, FY2020, FY2023) came from springs ranked 7th, 8th and 5th of 13.
5. The two known mast-failure autumns in the current series, FY2023 and FY2025, are the two highest Oct-Nov/Apr-Jun ratios (1.70 and 3.49) and the two highest Oct-Nov shares of the year (40%, 52%). The earlier high-ratio years (FY2014 1.03, FY2019 0.92, FY2020 1.31) are candidates for the same pattern and could be checked against the mast series in `docs/research` / `raw/research/mast` (Akita's 2002-2025 table covers them).

**Does not support / must be worded carefully:**

1. It does not support "spring is uninformative". Spring level correlates with the full-year total (Pearson +0.72, Spearman +0.69, n=13), largely because spring is a quarter of the year and the whole series has trended up (the three highest springs are FY2024, FY2025, FY2026). A high spring reliably means a high floor for the year, not a high autumn. The page should say "spring does not predict the autumn spike", not "spring tells you nothing".
2. Four years cannot support any statistical claim on their own: with n=4 the correlations above (+0.54 / +0.40) are meaningless in either direction, and the four-year window contains both an extreme (FY2025) and a counter-example (FY2024) by construction. The four-year version of claim #4 is an anecdote; the 13-year version is evidence. The page should cite FY2013-FY2025 and link the three archived editions.
3. Even 13 years is a small sample dominated by two outliers. Pearson r of +0.60 for spring vs Oct-Nov is nominally significant (p=0.025) but collapses to +0.33 (p=0.29) when FY2025 alone is removed; any headline correlation, positive or negative, would be an artefact of one year. The honest summary is "no usable relationship", not "negative relationship" and not "significant positive relationship".
4. The what-if table is not a forecast and should not be shown as one. The 13 seasonal shapes give FY2026 full-year outcomes from 28,293 to 84,913; that range is the point. If the page wants a single forward-looking number it has to come from the mast/weather evidence (claims #5, #6), not from spring counts.
5. The series is national and provisional. It cannot say anything about where autumn 2026 would happen (claim #2 needs the prefecture × month cells, which this extraction confirms are present in every edition but which need the same x-position mapping; FY2021 shows the monthly cells and printed totals can disagree by a few per prefecture).
6. FY2013-FY2015 come from an edition with a slightly different note about coverage (prefectures lacking comprehensive data omitted); the prefecture list is the same 37 as later, but very small early-year totals may partly reflect narrower reporting, which would if anything make the early spring/autumn comparison noisier, not cleaner.

## Code and output

### Extraction (`data-pipeline/raw/research/moe/extracted/extract_national_monthly.py`)

```python
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
```

Output:

```
syutubotu-2016-snapshot.pdf    FY2013: months=[314, 1063, 1837, 1798, 1799, 914, 615, 539, 177, 31, 13, 33] sum=9133 printed_total=9133 OK
syutubotu-2016-snapshot.pdf    FY2014: months=[521, 1397, 1908, 2314, 2691, 2884, 2546, 1400, 194, 31, 28, 67] sum=15981 printed_total=15981 OK
syutubotu-2016-snapshot.pdf    FY2015: months=[459, 1397, 2072, 1909, 1473, 696, 856, 449, 171, 39, 18, 58] sum=9597 printed_total=9597 OK
syutubotu-2016-snapshot.pdf    FY2016: months=[506, 1878, 3622, 3229, 2509, 1384, 1630, 0, 0, 0, 0, 0] sum=14758 printed_total=14758 OK
syutubotu-2021-snapshot.pdf    FY2016: months=[506, 1880, 3626, 3240, 2520, 1418, 2589, 1855, 347, 41, 32, 62] sum=18116 printed_total=18116 OK
syutubotu-2021-snapshot.pdf    FY2017: months=[479, 1655, 2934, 2670, 2279, 1347, 771, 411, 141, 43, 20, 62] sum=12812 printed_total=12812 OK
syutubotu-2021-snapshot.pdf    FY2018: months=[548, 2056, 3113, 2503, 2023, 812, 727, 666, 198, 42, 38, 83] sum=12809 printed_total=12809 OK
syutubotu-2021-snapshot.pdf    FY2019: months=[446, 1651, 2929, 3205, 2663, 2159, 2679, 1951, 374, 100, 63, 94] sum=18314 printed_total=18314 OK
syutubotu-2021-snapshot.pdf    FY2020: months=[515, 1614, 2811, 2988, 3298, 2536, 4183, 2281, 367, 60, 70, 0] sum=20723 printed_total=20723 OK
syutubotu-2022-snapshot.pdf    FY2018: months=[548, 2056, 3113, 2503, 2023, 812, 727, 666, 198, 42, 38, 83] sum=12809 printed_total=12809 OK
syutubotu-2022-snapshot.pdf    FY2019: months=[446, 1651, 2929, 3205, 2663, 2159, 2679, 1951, 374, 100, 63, 97] sum=18317 printed_total=18317 OK
syutubotu-2022-snapshot.pdf    FY2020: months=[515, 1622, 2814, 2994, 3303, 2539, 4213, 2288, 367, 59, 71, 102] sum=20887 printed_total=20887 OK
syutubotu-2022-snapshot.pdf    FY2021: months=[537, 1612, 2412, 2406, 1762, 1073, 1393, 1062, 310, 47, 50, 71] sum=12735 printed_total=12766 MISMATCH
syutubotu-2022-snapshot.pdf    FY2022: months=[307, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] sum=307 printed_total=307 OK
syutubotu.pdf                  FY2022: months=[437, 1526, 2413, 1939, 1809, 1050, 1026, 562, 183, 42, 51, 98] sum=11136 printed_total=11136 OK
syutubotu.pdf                  FY2023: months=[593, 1974, 3124, 2845, 2169, 2686, 5983, 3700, 805, 190, 127, 152] sum=24348 printed_total=24348 OK
syutubotu.pdf                  FY2024: months=[689, 2453, 4459, 3260, 2917, 2054, 2235, 1283, 636, 264, 120, 143] sum=20513 printed_total=20513 OK
syutubotu.pdf                  FY2025: months=[800, 2528, 4227, 5161, 4069, 4766, 15998, 10338, 1851, 484, 250, 329] sum=50801 printed_total=50801 OK
syutubotu.pdf                  FY2026: months=[1787, 4581, 6260, 0, 0, 0, 0, 0, 0, 0, 0, 0] sum=12628 printed_total=12628 OK

Chosen edition per FY:
2013 syutubotu-2016-snapshot.pdf 9133
2014 syutubotu-2016-snapshot.pdf 15981
2015 syutubotu-2016-snapshot.pdf 9597
2016 syutubotu-2021-snapshot.pdf 18116
2017 syutubotu-2021-snapshot.pdf 12812
2018 syutubotu-2022-snapshot.pdf 12809
2019 syutubotu-2022-snapshot.pdf 18317
2020 syutubotu-2022-snapshot.pdf 20887
2021 syutubotu-2022-snapshot.pdf 12766
2022 syutubotu.pdf 11136
2023 syutubotu.pdf 24348
2024 syutubotu.pdf 20513
2025 syutubotu.pdf 50801
2026 syutubotu.pdf 12628
```

### Analysis (`docs/research/spring_vs_autumn.py`)

```python
"""Spring-vs-autumn test on national monthly bear-sighting counts (MoE syutubotu.pdf).
Input: data-pipeline/raw/research/moe/extracted/national-monthly-sightings-fy2013-fy2026.csv
(built by data-pipeline/raw/research/moe/extracted/extract_national_monthly.py from the
live PDF and three Wayback snapshots; each year's 12 months checked against the printed 合計).
FY2022-FY2026 are identical to webapp/data/national-timeline.json 'monthly.sightings'."""
import csv, json, statistics as st
CSV = "/Users/fergus/Projects/bearstats/data-pipeline/raw/research/moe/extracted/national-monthly-sightings-fy2013-fy2026.csv"
JSON = "/Users/fergus/Projects/bearstats/webapp/data/national-timeline.json"
rows = {int(r["fy"]): r for r in csv.DictReader(open(CSV))}
nt = json.load(open(JSON))

# cross-check the CSV against the webapp JSON for the overlapping years
for fy, vals in nt["monthly"]["sightings"].items():
    r = rows[int(fy)]
    csv_vals = [int(r[f"m{m:02d}"]) for m in nt["monthly"]["months"]][:len(vals)]
    assert csv_vals == vals, (fy, csv_vals, vals)
print("CSV matches national-timeline.json for FY2022-FY2026: OK")

def blk(r, months): return sum(int(r[f"m{m:02d}"]) for m in months)
tab = []
for fy in sorted(rows):
    r = rows[fy]
    spring, summer, autumn = blk(r,[4,5,6]), blk(r,[7,8,9]), blk(r,[10,11])
    full = blk(r,[4,5,6,7,8,9,10,11,12,1,2,3])
    tab.append(dict(fy=fy, spring=spring, summer=summer, autumn=autumn, full=full,
                    winter=full-spring-summer-autumn,
                    aut_spr=autumn/spring, full_spr=full/spring, aut_share=autumn/full if full else float("nan"),
                    complete=(fy != 2026), source=r["source"], printed_total=int(r["printed_total"])))

print("\n| FY | Apr-Jun | Jul-Sep | Oct-Nov | Dec-Mar | Full year | Oct-Nov / Apr-Jun | Full / Apr-Jun | Oct-Nov share of year | Source edition |")
print("|---|---:|---:|---:|---:|---:|---:|---:|---:|---|")
for t in tab:
    note = "" if t["full"] == t["printed_total"] else f" (printed 合計 {t['printed_total']:,})"
    if not t["complete"]:
        print(f"| {t['fy']} (Apr-Jun only) | {t['spring']:,} | - | - | - | {t['full']:,} so far | - | - | - | {t['source']} |")
    else:
        print(f"| {t['fy']} | {t['spring']:,} | {t['summer']:,} | {t['autumn']:,} | {t['winter']:,} | {t['full']:,}{note} | {t['aut_spr']:.2f} | {t['full_spr']:.2f} | {t['aut_share']:.0%} | {t['source']} |")

comp = [t for t in tab if t["complete"]]
def pearson(x, y):
    mx, my = st.mean(x), st.mean(y)
    sxy = sum((a-mx)*(b-my) for a,b in zip(x,y))
    sxx = sum((a-mx)**2 for a in x); syy = sum((b-my)**2 for b in y)
    return sxy / (sxx*syy) ** 0.5
def ranks(v):
    order = sorted(range(len(v)), key=lambda i: v[i]); rk=[0]*len(v)
    for pos,i in enumerate(order): rk[i]=pos+1
    return rk
def spearman(x, y): return pearson(ranks(x), ranks(y))

for label, sub in [("FY2013-FY2025 (13 complete years)", comp), ("FY2022-FY2025 (the 4 years on the site)", [t for t in comp if t["fy"]>=2022])]:
    x=[t["spring"] for t in sub]; ya=[t["autumn"] for t in sub]; yr=[t["aut_spr"] for t in sub]; yf=[t["full"] for t in sub]
    print(f"\n{label}: n={len(sub)}")
    print(f"  Pearson r  spring vs Oct-Nov  = {pearson(x,ya):+.2f};  Spearman rho = {spearman(x,ya):+.2f}")
    print(f"  Pearson r  spring vs full year = {pearson(x,yf):+.2f};  Spearman rho = {spearman(x,yf):+.2f}")
    print(f"  Pearson r  spring vs (Oct-Nov/spring ratio) = {pearson(x,yr):+.2f};  Spearman rho = {spearman(x,yr):+.2f}")
    print(f"  Oct-Nov/Apr-Jun ratio: min {min(yr):.2f} (FY{sub[yr.index(min(yr))]['fy']}), median {st.median(yr):.2f}, max {max(yr):.2f} (FY{sub[yr.index(max(yr))]['fy']})")

# spring rank vs autumn rank, 13 complete years
print("\nRank of each complete year by Apr-Jun count vs by Oct-Nov count (1 = highest):")
xs=[t["spring"] for t in comp]; ys=[t["autumn"] for t in comp]
rs=ranks([-v for v in xs]); ra=ranks([-v for v in ys])
print("| FY | Apr-Jun | rank | Oct-Nov | rank |"); print("|---|---:|---:|---:|---:|")
for t,a,b in zip(comp,rs,ra): print(f"| {t['fy']} | {t['spring']:,} | {a} | {t['autumn']:,} | {b} |")

# adjacent-year pairs where spring was up but autumn down, or vice versa
print("\nYear-on-year direction of Apr-Jun vs Oct-Nov:")
agree=0; pairs=0
for p,q in zip(comp, comp[1:]):
    ds = q["spring"]-p["spring"]; da = q["autumn"]-p["autumn"]; pairs+=1; agree += (ds>0)==(da>0)
    print(f"  FY{p['fy']}->FY{q['fy']}: spring {'+' if ds>0 else ''}{ds:,} ({ds/p['spring']:+.0%}), Oct-Nov {'+' if da>0 else ''}{da:,} ({da/p['autumn']:+.0%}) {'same direction' if (ds>0)==(da>0) else 'OPPOSITE'}")
print(f"  same direction in {agree} of {pairs} adjacent-year pairs")

# FY2026 what-if
s26 = next(t for t in tab if t["fy"]==2026)["spring"]
print(f"\nFY2026 Apr-Jun = {s26:,}. Comparison with each prior year's Apr-Jun, and WHAT-IF (not a forecast): FY2026 Oct-Nov and full year if FY2026 repeated that year's ratios")
print("| Prior FY | Its Apr-Jun | FY2026 Apr-Jun vs it | Its Oct-Nov/Apr-Jun | What-if FY2026 Oct-Nov | Its Full/Apr-Jun | What-if FY2026 full year |")
print("|---|---:|---:|---:|---:|---:|---:|")
wa=[]; wf=[]
for t in comp:
    a = s26*t["aut_spr"]; f = s26*t["full_spr"]; wa.append((a,t["fy"])); wf.append((f,t["fy"]))
    print(f"| {t['fy']} | {t['spring']:,} | {s26/t['spring']:.2f}x ({s26/t['spring']-1:+.0%}) | {t['aut_spr']:.2f} | {a:,.0f} | {t['full_spr']:.2f} | {f:,.0f} |")
print(f"\nWhat-if range for FY2026 Oct-Nov: {min(wa)[0]:,.0f} (FY{min(wa)[1]} ratio) to {max(wa)[0]:,.0f} (FY{max(wa)[1]} ratio); median {st.median([a for a,_ in wa]):,.0f}")
print(f"What-if range for FY2026 full year: {min(wf)[0]:,.0f} (FY{min(wf)[1]} ratio) to {max(wf)[0]:,.0f} (FY{max(wf)[1]} ratio); median {st.median([f for f,_ in wf]):,.0f}")
print(f"Using only the 4 site years FY2022-25: Oct-Nov {min(a for a,y in wa if y>=2022):,.0f}-{max(a for a,y in wa if y>=2022):,.0f}; full year {min(f for f,y in wf if y>=2022):,.0f}-{max(f for f,y in wf if y>=2022):,.0f}")
print(f"For scale: FY2025 actual Oct-Nov = {next(t for t in comp if t['fy']==2025)['autumn']:,}, full year = 50,801; FY2026 Apr-Jun already exceeds full-year FY2013 ({rows[2013]['printed_total']}) and FY2015 ({rows[2015]['printed_total']})")
```

Output:

```
CSV matches national-timeline.json for FY2022-FY2026: OK

| FY | Apr-Jun | Jul-Sep | Oct-Nov | Dec-Mar | Full year | Oct-Nov / Apr-Jun | Full / Apr-Jun | Oct-Nov share of year | Source edition |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 2013 | 3,214 | 4,511 | 1,154 | 254 | 9,133 | 0.36 | 2.84 | 13% | syutubotu-2016-snapshot.pdf |
| 2014 | 3,826 | 7,889 | 3,946 | 320 | 15,981 | 1.03 | 4.18 | 25% | syutubotu-2016-snapshot.pdf |
| 2015 | 3,928 | 4,078 | 1,305 | 286 | 9,597 | 0.33 | 2.44 | 14% | syutubotu-2016-snapshot.pdf |
| 2016 | 6,012 | 7,178 | 4,444 | 482 | 18,116 | 0.74 | 3.01 | 25% | syutubotu-2021-snapshot.pdf |
| 2017 | 5,068 | 6,296 | 1,182 | 266 | 12,812 | 0.23 | 2.53 | 9% | syutubotu-2021-snapshot.pdf |
| 2018 | 5,717 | 5,338 | 1,393 | 361 | 12,809 | 0.24 | 2.24 | 11% | syutubotu-2022-snapshot.pdf |
| 2019 | 5,026 | 8,027 | 4,630 | 634 | 18,317 | 0.92 | 3.64 | 25% | syutubotu-2022-snapshot.pdf |
| 2020 | 4,951 | 8,836 | 6,501 | 599 | 20,887 | 1.31 | 4.22 | 31% | syutubotu-2022-snapshot.pdf |
| 2021 | 4,561 | 5,241 | 2,455 | 478 | 12,735 (printed 合計 12,766) | 0.54 | 2.79 | 19% | syutubotu-2022-snapshot.pdf |
| 2022 | 4,376 | 4,798 | 1,588 | 374 | 11,136 | 0.36 | 2.54 | 14% | syutubotu.pdf |
| 2023 | 5,691 | 7,700 | 9,683 | 1,274 | 24,348 | 1.70 | 4.28 | 40% | syutubotu.pdf |
| 2024 | 7,601 | 8,231 | 3,518 | 1,163 | 20,513 | 0.46 | 2.70 | 17% | syutubotu.pdf |
| 2025 | 7,555 | 13,996 | 26,336 | 2,914 | 50,801 | 3.49 | 6.72 | 52% | syutubotu.pdf |
| 2026 (Apr-Jun only) | 12,628 | - | - | - | 12,628 so far | - | - | - | syutubotu.pdf |

FY2013-FY2025 (13 complete years): n=13
  Pearson r  spring vs Oct-Nov  = +0.60;  Spearman rho = +0.47
  Pearson r  spring vs full year = +0.72;  Spearman rho = +0.69
  Pearson r  spring vs (Oct-Nov/spring ratio) = +0.51;  Spearman rho = +0.21
  Oct-Nov/Apr-Jun ratio: min 0.23 (FY2017), median 0.54, max 3.49 (FY2025)

FY2022-FY2025 (the 4 years on the site): n=4
  Pearson r  spring vs Oct-Nov  = +0.54;  Spearman rho = +0.40
  Pearson r  spring vs full year = +0.67;  Spearman rho = +0.40
  Pearson r  spring vs (Oct-Nov/spring ratio) = +0.47;  Spearman rho = +0.40
  Oct-Nov/Apr-Jun ratio: min 0.36 (FY2022), median 1.08, max 3.49 (FY2025)

Rank of each complete year by Apr-Jun count vs by Oct-Nov count (1 = highest):
| FY | Apr-Jun | rank | Oct-Nov | rank |
|---|---:|---:|---:|---:|
| 2013 | 3,214 | 13 | 1,154 | 13 |
| 2014 | 3,826 | 12 | 3,946 | 6 |
| 2015 | 3,928 | 11 | 1,305 | 11 |
| 2016 | 6,012 | 3 | 4,444 | 5 |
| 2017 | 5,068 | 6 | 1,182 | 12 |
| 2018 | 5,717 | 4 | 1,393 | 10 |
| 2019 | 5,026 | 7 | 4,630 | 4 |
| 2020 | 4,951 | 8 | 6,501 | 3 |
| 2021 | 4,561 | 9 | 2,455 | 8 |
| 2022 | 4,376 | 10 | 1,588 | 9 |
| 2023 | 5,691 | 5 | 9,683 | 2 |
| 2024 | 7,601 | 1 | 3,518 | 7 |
| 2025 | 7,555 | 2 | 26,336 | 1 |

Year-on-year direction of Apr-Jun vs Oct-Nov:
  FY2013->FY2014: spring +612 (+19%), Oct-Nov +2,792 (+242%) same direction
  FY2014->FY2015: spring +102 (+3%), Oct-Nov -2,641 (-67%) OPPOSITE
  FY2015->FY2016: spring +2,084 (+53%), Oct-Nov +3,139 (+241%) same direction
  FY2016->FY2017: spring -944 (-16%), Oct-Nov -3,262 (-73%) same direction
  FY2017->FY2018: spring +649 (+13%), Oct-Nov +211 (+18%) same direction
  FY2018->FY2019: spring -691 (-12%), Oct-Nov +3,237 (+232%) OPPOSITE
  FY2019->FY2020: spring -75 (-1%), Oct-Nov +1,871 (+40%) OPPOSITE
  FY2020->FY2021: spring -390 (-8%), Oct-Nov -4,046 (-62%) same direction
  FY2021->FY2022: spring -185 (-4%), Oct-Nov -867 (-35%) same direction
  FY2022->FY2023: spring +1,315 (+30%), Oct-Nov +8,095 (+510%) same direction
  FY2023->FY2024: spring +1,910 (+34%), Oct-Nov -6,165 (-64%) OPPOSITE
  FY2024->FY2025: spring -46 (-1%), Oct-Nov +22,818 (+649%) OPPOSITE
  same direction in 7 of 12 adjacent-year pairs

FY2026 Apr-Jun = 12,628. Comparison with each prior year's Apr-Jun, and WHAT-IF (not a forecast): FY2026 Oct-Nov and full year if FY2026 repeated that year's ratios
| Prior FY | Its Apr-Jun | FY2026 Apr-Jun vs it | Its Oct-Nov/Apr-Jun | What-if FY2026 Oct-Nov | Its Full/Apr-Jun | What-if FY2026 full year |
|---|---:|---:|---:|---:|---:|---:|
| 2013 | 3,214 | 3.93x (+293%) | 0.36 | 4,534 | 2.84 | 35,884 |
| 2014 | 3,826 | 3.30x (+230%) | 1.03 | 13,024 | 4.18 | 52,746 |
| 2015 | 3,928 | 3.21x (+221%) | 0.33 | 4,195 | 2.44 | 30,853 |
| 2016 | 6,012 | 2.10x (+110%) | 0.74 | 9,334 | 3.01 | 38,052 |
| 2017 | 5,068 | 2.49x (+149%) | 0.23 | 2,945 | 2.53 | 31,924 |
| 2018 | 5,717 | 2.21x (+121%) | 0.24 | 3,077 | 2.24 | 28,293 |
| 2019 | 5,026 | 2.51x (+151%) | 0.92 | 11,633 | 3.64 | 46,022 |
| 2020 | 4,951 | 2.55x (+155%) | 1.31 | 16,581 | 4.22 | 53,274 |
| 2021 | 4,561 | 2.77x (+177%) | 0.54 | 6,797 | 2.79 | 35,259 |
| 2022 | 4,376 | 2.89x (+189%) | 0.36 | 4,583 | 2.54 | 32,136 |
| 2023 | 5,691 | 2.22x (+122%) | 1.70 | 21,486 | 4.28 | 54,027 |
| 2024 | 7,601 | 1.66x (+66%) | 0.46 | 5,845 | 2.70 | 34,079 |
| 2025 | 7,555 | 1.67x (+67%) | 3.49 | 44,020 | 6.72 | 84,913 |

What-if range for FY2026 Oct-Nov: 2,945 (FY2017 ratio) to 44,020 (FY2025 ratio); median 6,797
What-if range for FY2026 full year: 28,293 (FY2018 ratio) to 84,913 (FY2025 ratio); median 35,884
Using only the 4 site years FY2022-25: Oct-Nov 4,583-44,020; full year 32,136-84,913
For scale: FY2025 actual Oct-Nov = 26,336, full year = 50,801; FY2026 Apr-Jun already exceeds full-year FY2013 (9133) and FY2015 (9597)
```

### Significance and sensitivity (`docs/research/spring_vs_autumn_extra.py`)

```python
"""Permutation p-values and leave-FY2025-out sensitivity for the spring-vs-autumn correlations."""
import csv, random, statistics as st
CSV = "/Users/fergus/Projects/bearstats/data-pipeline/raw/research/moe/extracted/national-monthly-sightings-fy2013-fy2026.csv"
rows = {int(r["fy"]): r for r in csv.DictReader(open(CSV))}
def blk(r, ms): return sum(int(r[f"m{m:02d}"]) for m in ms)
yrs = [fy for fy in sorted(rows) if fy <= 2025]
spring = {fy: blk(rows[fy],[4,5,6]) for fy in yrs}
autumn = {fy: blk(rows[fy],[10,11]) for fy in yrs}
def pearson(x, y):
    mx, my = st.mean(x), st.mean(y)
    return sum((a-mx)*(b-my) for a,b in zip(x,y)) / (sum((a-mx)**2 for a in x)*sum((b-my)**2 for b in y))**0.5
def ranks(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); r=[0]*len(v)
    for p,i in enumerate(o): r[i]=p+1
    return r
def spearman(x,y): return pearson(ranks(x),ranks(y))
random.seed(1)
def perm_p(x, y, f, n=20000):
    obs = f(x,y); y2=list(y); k=0
    for _ in range(n):
        random.shuffle(y2); k += abs(f(x,y2)) >= abs(obs)
    return obs, k/n
for label, ys in [("all 13 complete years FY2013-25", yrs), ("excluding FY2025", [y for y in yrs if y!=2025]), ("excluding FY2023 and FY2025", [y for y in yrs if y not in (2023,2025)])]:
    x=[spring[y] for y in ys]; a=[autumn[y] for y in ys]; r=[autumn[y]/spring[y] for y in ys]
    pr,pp = perm_p(x,a,pearson); sr,sp = perm_p(x,a,spearman); rr,rp = perm_p(x,r,pearson)
    print(f"{label} (n={len(ys)}): spring vs Oct-Nov Pearson r={pr:+.2f} (perm p={pp:.3f}), Spearman rho={sr:+.2f} (p={sp:.3f}); spring vs Oct-Nov/spring ratio r={rr:+.2f} (p={rp:.3f})")
# Does spring being above the previous year predict Oct-Nov above the previous year?
print("\nContingency, 12 adjacent-year pairs: spring up/down vs Oct-Nov up/down")
c={}
for p,q in zip(yrs, yrs[1:]):
    key=("spring up" if spring[q]>spring[p] else "spring down", "autumn up" if autumn[q]>autumn[p] else "autumn down")
    c[key]=c.get(key,0)+1
for k in sorted(c): print(" ", k, c[k])
```

Output:

```
all 13 complete years FY2013-25 (n=13): spring vs Oct-Nov Pearson r=+0.60 (perm p=0.025), Spearman rho=+0.47 (p=0.108); spring vs Oct-Nov/spring ratio r=+0.51 (p=0.083)
excluding FY2025 (n=12): spring vs Oct-Nov Pearson r=+0.33 (perm p=0.287), Spearman rho=+0.36 (p=0.246); spring vs Oct-Nov/spring ratio r=+0.10 (p=0.744)
excluding FY2023 and FY2025 (n=11): spring vs Oct-Nov Pearson r=+0.30 (perm p=0.370), Spearman rho=+0.32 (p=0.344); spring vs Oct-Nov/spring ratio r=-0.03 (p=0.923)

Contingency, 12 adjacent-year pairs: spring up/down vs Oct-Nov up/down
  ('spring down', 'autumn down') 3
  ('spring down', 'autumn up') 3
  ('spring up', 'autumn down') 2
  ('spring up', 'autumn up') 4
```
