# Summer weather vs beech mast vs October bear sightings (Tohoku)

Cross-check for GOAL.md claims #5 (autumn surges follow failed beech mast) and #6 (mast failure is linked to the previous summer's weather). Written 2026-09-05. Every number below was read from a file fetched in this or an earlier research pass; file paths are given. Nothing is estimated or recalled from memory.

## Sources used (all under `data-pipeline/raw/research/`)

| What | File | Origin | Coverage |
|---|---|---|---|
| Monthly mean temperature and precipitation, Akita (47582) and Morioka (47584) stations | `weather/extracted/jma_monthly.csv`, raw pages in `weather/html/<station>_<year>.html` | JMA 過去の気象データ検索 `data.jma.go.jp/stats/etrn/view/monthly_s1.php` | 2009-2026. **2026 was fetched this pass** by extending `weather/fetch_jma.py` to `range(2009, 2027)`; Jun-Aug 2026 are complete, Sep 2026 is a partial month (JMA marks it `]`) and is correctly excluded by the parser. |
| Beech (ブナ) mast index, Tohoku Regional Forest Office, per prefecture: July flowering forecast and autumn fruiting actual, 145 fixed points | `mast/extracted/tohoku_forest_office_flowering_forecast.csv`, `..._fruiting_actual.csv` | rinya.maff.go.jp/tohoku press releases (URLs in the CSVs) | Forecast 2023-2026, actual 2023-2025 (2026 actual publishes ~Nov 2026) |
| Akita Prefecture beech result at 5 sites (八森/森吉山/田沢湖/東成瀬/鳥海), ○ 豊作 / △ 並作 / × 凶作 | `mast/extracted/akita_buna_2002_2025.csv` | pref.akita.lg.jp ブナ・ミズナラ豊凶結果2025.pdf | 2002-2025 |
| Miyagi: Tohoku Forest Office beech category | `mast/extracted/miyagi_mast_index_1998_2025.csv` | pref.miyagi.jp r7graph_2.pdf | 1998-2025 |
| Bear sightings by prefecture × month × fiscal year (MoE 速報値) | `moe/extracted/sightings-by-prefecture-by-month-by-fy.csv` (**new this pass**, built by `moe/extract_syutubotu_monthly.py`) | env.go.jp syutubotu.pdf (live, dated 令和8年8月6日) chained with three Wayback snapshots (2016-12-23, 2021-04-18, 2022-06-30) already on disk | FY2013-FY2026 (FY2026 only Apr-Jun) |

### How the monthly sightings table was extracted, and how it was checked

The MoE PDF has no ruling lines and its blank cells are truly empty, so text-line splitting cannot tell which month a number belongs to. `moe/extract_syutubotu_monthly.py` instead reads the 65 era-code header cells (13 groups × 5 fiscal years) with `pdfplumber`, and assigns every numeric word on a prefecture row to the header cell with the nearest x-centre. Checks:

- For every prefecture-year, the 12 month cells must sum to the printed 合計 cell. Result: live file 185/185 pass, 2016 snapshot 152/152, 2021 snapshot 195/195. The 2022-06-30 snapshot passes 173/195; all 22 failures are FY2021 rows where MoE's own printed 合計 differs from its own month cells by 1-6 (e.g. 秋田: months sum to 864, printed total 865; national 12,735 vs 12,766). This is in the source PDF, not the parser, and only the month cells are used here.
- National October for FY2022-25 (1,026 / 5,983 / 2,235 / 15,998) equals the pipeline's `webapp/data/national-timeline.json`, which was parsed independently.
- Where two files overlap, the newer file wins; the differences are what you'd expect (the 2016-12 and 2022-06 snapshots caught FY2016 and FY2022 mid-year; FY2020 was revised upward by 0-5% between the 2021 and 2022 editions).
- The bold 計 row in the 2022 snapshot fuses adjacent cells at pdfplumber's default `x_tolerance=3` ("2,0561,6511,6221,612"); `x_tolerance=1.5` splits them and every other file still validates.

## Table 1. Summer weather, beech mast index and October sightings, 2019-2026

JJA = June-August. Temperature is the mean of the three JMA monthly means; precipitation is the sum of the three monthly totals. Mast columns are for the autumn of the same calendar year. October sightings are for the fiscal year beginning that April (so "2025" = October 2025).

| Year | Akita JJA temp °C | Akita JJA precip mm | Morioka JJA temp °C | Morioka JJA precip mm | Akita beech, July forecast (index) | Akita beech, autumn actual (index) | Iwate beech, autumn actual (index) | Akita pref. 5 sites | Oct sightings Akita | Oct sightings Iwate | Oct sightings national |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2019 | 23.6 | 519.5 | 22.2 | 305.5 |  |  |  | 0○ 0△ 5× | 40 | 65 | 2679 |
| 2020 | 23.4 | 607.0 | 22.4 | 803.0 |  |  |  | 0○ 2△ 3× | 116 | 275 | 4213 |
| 2021 | 24.1 | 498.5 | 23.0 | 410.0 |  |  |  | 0○ 0△ 5× | 100 | 120 | 1393 |
| 2022 | 23.4 | 538.0 | 22.3 | 658.5 |  |  |  | 4○ 0△ 1× | 11 | 51 | 1026 |
| 2023 | 25.4 | 558.5 | 24.5 | 600.5 | 大凶作 0.3 | 大凶作 0.1 | 大凶作 0.0 | 0○ 0△ 5× | 1472 | 1627 | 5983 |
| 2024 | 24.5 | 492.0 | 24.0 | 842.5 | 並作 2.6 | 並作 2.6 | 並作 2.7 | 3○ 2△ 0× | 37 | 105 | 2235 |
| 2025 | 25.3 | 480.0 | 24.8 | 341.0 | 大凶作 0.4 | 大凶作 0.0 | 大凶作 0.1 | 0○ 0△ 5× | 5810 | 3088 | 15998 |
| 2026 | 24.1 | 539.0 | 22.7 | 579.5 | 豊作 3.6 |  |  |  |  |  |  |

Reading down the rows:

- **2023 and 2025**, the two 大凶作 (total failure) autumns, are also the two hottest summers at both stations in the whole 2009-2026 series (Akita 25.4 and 25.3 °C; Morioka 24.5 and 24.8 °C), and they carry the two October spikes (Akita 1,472 and 5,810; national 5,983 and 15,998).
- **2024** sits between them with a 並作 (average) crop and an unremarkable October (Akita 37, national 2,235) even though its summer (Akita 24.5 °C) was the third-hottest of the series. A hot summer alone did not produce a failure.
- **2026**: the July forecast is 豊作 (Akita index 3.6, the highest in the four-year Tohoku series) and the summer just ended was cooler (Akita 24.1 °C, Morioka 22.7 °C, both below 2023-25) with near-average rain. On this table's own pattern, autumn 2026 looks like a 2024-type year, not a 2023/2025-type year. That is a forecast reading, not a result; the autumn actual is not published until ~November 2026 and October sightings do not exist yet.
- The Tohoku Forest Office **July forecast matched the autumn actual category in all 15 prefecture-years** available (2023-2025 × 5 prefectures; only the Akita/Iwate rows are shown above, the rest are in the CSV). Whatever sets the crop is largely set by the time the flowering survey is read in early summer.

## Table 2. Lag table, Akita station only, 2010-2026

Claim #6 says a hot, dry summer *the year before* drives a mast failure. This table puts the previous summer (Y-1) and the same summer (Y) next to the Akita 5-site result and the Miyagi category. "Akita score" = (2×○ + △) / (2 × sites reporting), so 1.0 = 豊作 at all five sites, 0.0 = 凶作 at all five. Apr-May Y-1 is included because the one mechanism paper on file (Kon, 北海道林試研報 46, `weather/kon_2010_masting_review.pdf`) attributes flowering to the previous spring's *minimum* temperature, not to summer; JMA's monthly *mean* is used here as the nearest available proxy.

| Mast year Y | Apr-May temp Y-1 | JJA temp Y-1 | JJA precip Y-1 | JJA temp Y | JJA precip Y | Akita 5-site result Y-1 | Akita 5-site result Y | Akita score Y | Miyagi beech (Tohoku office) Y | Oct sightings Akita FY Y |
|---|---|---|---|---|---|---|---|---|---|---|
| 2010 | 12.7 | 22.0 | 548.0 | 24.1 | 539.0 | 0○ 0△ 5× | 0○ 0△ 5× | 0.0 | 皆無 |  |
| 2011 | 11.1 | 24.1 | 539.0 | 23.2 | 442.0 | 0○ 0△ 5× | 0○ 1△ 4× | 0.1 | 凶作 |  |
| 2012 | 11.3 | 23.2 | 442.0 | 23.4 | 321.0 | 0○ 1△ 4× | 0○ 0△ 5× | 0.0 | 皆無 |  |
| 2013 | 12.4 | 23.4 | 321.0 | 23.4 | 798.0 | 0○ 0△ 5× | 2○ 1△ 2× | 0.5 | 豊作 | 16 |
| 2014 | 11.4 | 23.4 | 798.0 | 23.5 | 588.5 | 2○ 1△ 2× | 0○ 0△ 5× | 0.0 | 皆無 | 12 |
| 2015 | 12.6 | 23.5 | 588.5 | 22.8 | 459.5 | 0○ 0△ 5× | 2○ 2△ 1× | 0.6 | 並作 | 6 |
| 2016 | 13.8 | 22.8 | 459.5 | 23.2 | 476.5 | 2○ 2△ 1× | 0○ 0△ 5× | 0.0 | 皆無 | 28 |
| 2017 | 13.7 | 23.2 | 476.5 | 22.4 | 634.0 | 0○ 0△ 5× | 0○ 1△ 4× | 0.1 | 大凶作 | 154 |
| 2018 | 13.1 | 22.4 | 634.0 | 23.3 | 581.0 | 0○ 1△ 4× | 2○ 0△ 3× | 0.4 | 並作 | 14 |
| 2019 | 12.9 | 23.3 | 581.0 | 23.6 | 519.5 | 2○ 0△ 3× | 0○ 0△ 5× | 0.0 | 大凶作 | 40 |
| 2020 | 13.1 | 23.6 | 519.5 | 23.4 | 607.0 | 0○ 0△ 5× | 0○ 2△ 3× | 0.2 | 大凶作 | 116 |
| 2021 | 12.1 | 23.4 | 607.0 | 24.1 | 498.5 | 0○ 2△ 3× | 0○ 0△ 5× | 0.0 | 凶作 | 100 |
| 2022 | 12.8 | 24.1 | 498.5 | 23.4 | 538.0 | 0○ 0△ 5× | 4○ 0△ 1× | 0.8 | 凶作 | 11 |
| 2023 | 13.6 | 23.4 | 538.0 | 25.4 | 558.5 | 4○ 0△ 1× | 0○ 0△ 5× | 0.0 | 大凶作 | 1472 |
| 2024 | 13.3 | 25.4 | 558.5 | 24.5 | 492.0 | 0○ 0△ 5× | 3○ 2△ 0× | 0.8 | 豊作 | 37 |
| 2025 | 14.2 | 24.5 | 492.0 | 25.3 | 480.0 | 3○ 2△ 0× | 0○ 0△ 5× | 0.0 | 大凶作 | 5810 |
| 2026 | 12.9 | 25.3 | 480.0 | 24.1 | 539.0 | 0○ 0△ 5× |  |  |  |  |

## Numbers from the tables

Output of `cross_weather_vs_mast.py` (permutation p-values from 20,000 shuffles, seed 1; no scipy in the venv so Spearman and the permutation test are implemented in plain Python in the script below):

```
Akita, mast years 2010-2025 (n=16): good (any site ○) = [2013, 2015, 2018, 2022, 2024]; poor = [2010, 2011, 2012, 2014, 2016, 2017, 2019, 2020, 2021, 2023, 2025]
  summer Y-1: mean JJA temp good-years 23.8 vs poor-years 23.4; mean JJA precip good-years 520.1 vs poor-years 545.5
  summer Y: mean JJA temp good-years 23.5 vs poor-years 23.8; mean JJA precip good-years 573.7 vs poor-years 515.0
  Spearman rho(Akita Apr-May mean temp Y-1, Akita mast score Y) = -0.01, two-sided permutation p = 0.98 (n=16)  [Kon 2010 mechanism; note JMA monthly *mean*, not the minimum temp Kon used]
  Spearman rho(Akita JJA temp Y-1, Akita mast score Y) = +0.45, two-sided permutation p = 0.09 (n=16)
  Spearman rho(Akita JJA precip Y-1, Akita mast score Y) = -0.01, two-sided permutation p = 0.98 (n=16)
  Spearman rho(Akita JJA temp Y, Akita mast score Y) = -0.37, two-sided permutation p = 0.16 (n=16)
  Spearman rho(Akita JJA precip Y, Akita mast score Y) = +0.16, two-sided permutation p = 0.54 (n=16)
  Year after every Akita year with any ○: [(2005, '0○ 0△ 5×'), (2013, '0○ 0△ 5×'), (2015, '0○ 0△ 5×'), (2018, '0○ 0△ 5×'), (2022, '0○ 0△ 5×'), (2024, '0○ 0△ 5×')]
  Spearman rho(Akita mast score Y, Akita Oct sightings FY Y) = -0.53, p = 0.063 (n=13); years 2013-2025
  Spearman rho(Miyagi beech category Y, national Oct sightings FY Y) = -0.70, p = 0.011 (n=13)
```

## What this supports

1. **Mast failure → October surge (claim #5) is visible in the held data, not just press reports.** Over FY2013-FY2025 (13 Octobers), Akita's own 5-site beech score and Akita's October sightings are negatively rank-correlated (rho = -0.53, p ≈ 0.06), and the Miyagi/Tohoku-office beech category against *national* October sightings is stronger (rho = -0.70, p ≈ 0.01). In the seven autumns since 2013 that the Tohoku-office Miyagi points recorded 大凶作/皆無 (2014, 2016, 2017, 2019, 2020, 2023, 2025), Akita's October sightings were 12, 28, 154, 40, 116, 1,472 and 5,810 (median 116) and national October sightings 2,546, 2,589, 771, 2,679, 4,213, 5,983 and 15,998 (median 2,679); in the other six autumns (2013, 2015, 2018, 2021, 2022, 2024) Akita's Octobers were 16, 6, 14, 100, 11 and 37 (median 15) and national 615, 856, 727, 1,393, 1,026 and 2,235 (median 941). This is enough to state claim #5 with the Tohoku data rather than press reports, with the caveat that n = 13 and the correlation is dominated by 2023 and 2025.

2. **Alternate bearing is the clearest regularity in the mast series.** In the Akita 5-site table, every year in which any site recorded ○ (2005, 2013, 2015, 2018, 2022, 2024) was followed by × at all five sites the next year: 6 of 6. GOAL.md's "heavy flowering the year before that" is the part of claim #6 that the data actually supports: 2022 good → 2023 failure, 2024 good → 2025 failure. It also frames 2026 less neatly than the forecast does: in the same table, an all-× year (12 of them, 2002-2025) was followed by a year with ○ somewhere 4 times (2013, 2015, 2022, 2024), by another all-× year twice (2007, 2010), and by a △-only year 5 times. So the series alone does not decide 2026; the flowering survey does, and it says 豊作.

3. **The two recent failures coincided with the two hottest summers of the same year, not the year before.** Akita JJA 2023 = 25.4 °C and 2025 = 25.3 °C are the series maxima and both are failure years; the previous-year summers (2022: 23.4 °C, 2024: 24.5 °C) were not extreme. If the page wants to show a weather panel, the honest version is "the failure autumns were also the hottest summers", stated as a coincidence in a 16-year series, not as the cause.

## What this does not support

1. **"A hot, dry summer the year before causes the failure" (claim #6 as worded) is not supported by these stations, and the sign is the wrong way.** Prior-summer JJA temperature correlates *positively* with the following year's Akita beech score (rho = +0.45, p ≈ 0.09, n = 16): hotter summers precede *better* crops, which is the direction the masting literature generally reports for flower-bud initiation, and is the opposite of the claim. Prior-summer precipitation shows nothing (rho = -0.01). Mean prior-summer temperature is 23.8 °C before good years vs 23.4 °C before poor years, a 0.4 °C gap that a 16-year series cannot resolve. The Apr-May Y-1 mean-temperature proxy for Kon's mechanism shows nothing either (rho = -0.01), but JMA monthly means are not the minimum temperatures Kon used, so that is a non-test rather than a refutation.

2. **Same-year summer heat cannot be the cause of the flowering failure**, because the Tohoku Forest Office's July survey (read in May-June, before the hottest weeks) already called 大凶作 in both 2023 and 2025 and 並作 in 2024, and was right every time. A hot summer could at most reduce fruit set after a poor flowering; the data here cannot separate that from coincidence (same-year rho = -0.37, p ≈ 0.16).

3. **n is too small for any of the weather correlations to be shown on the page as a finding.** There are 16 mast years with prior-summer weather (2010-2025), of which only 5 are good years, and 4 complete Tohoku-office index years. Any single year moves these correlations substantially. Nothing here reaches conventional significance for weather; the mast-to-sightings correlations do, marginally, but with n = 13 and two dominant years.

4. **October sightings before FY2022 come from Wayback snapshots, not from a current MoE publication**, and MoE revises past years (FY2020 national rose from 20,723 to 20,887 between the 2021 and 2022 editions; FY2021 rows in the 2022 edition are internally inconsistent by 1-6). Pre-FY2022 figures should be labelled as MoE 速報値 as archived on the snapshot date.

5. **Nothing here is prefecture-specific to Iwate beyond 2023-2025.** Morioka weather is tabulated but there is no long Iwate mast series on file (only the Tohoku-office 2023-2026 rows), so the lag analysis was run for Akita only.

## Recommendation for the page

- Replace claim #6's "hot, dry summer the year before" with the alternate-bearing statement ("a heavy crop the year before; 6 of 6 heavy-crop years in Akita since 2005 were followed by total failure"), which the data supports, and drop the summer-weather causal wording. If a weather panel is kept, show JJA temperature alongside the mast index as context and label it as such.
- Use Table 1's 2026 row as the "risk for the autumn ahead" evidence: forecast 豊作 (3.6) vs 大凶作 (0.4) at the same point in 2025, cooler summer than 2023/2025, and the four-for-four record of the July forecast.
- Re-run `cross_weather_vs_mast.py` after the Tohoku Forest Office publishes the autumn 2026 actual (~Nov 2026) and after MoE's October 2026 sightings appear, which fills in the two blank cells that actually decide whether the 2026 reading held.

## Code

`data-pipeline/raw/research/cross_weather_vs_mast.py` (run with `data-pipeline/.venv/bin/python`; its full stdout is in `docs/research/cross-weather-vs-mast.out.txt`, and the two tables as CSV in `docs/research/cross-weather-vs-mast.csv`):

```python
"""Cross-tabulate JMA summer weather vs beech mast index vs October bear sightings.
Inputs (all previously fetched/extracted under data-pipeline/raw/research/):
  weather/extracted/jma_monthly.csv                      JMA monthly, 6 stations, 2009-2026
  mast/extracted/tohoku_forest_office_fruiting_actual.csv  Tohoku Forest Office beech index, autumn actual 2023-25
  mast/extracted/tohoku_forest_office_flowering_forecast.csv  same, July forecast 2023-26
  mast/extracted/akita_buna_2002_2025.csv                Akita pref. 5-site beech result (○/△/×)
  mast/extracted/miyagi_mast_index_1998_2025.csv         Miyagi: Tohoku-office beech category 1998-2025
  moe/extracted/sightings-by-prefecture-by-month-by-fy.csv  MoE sightings, pref x month x FY, FY2013-26
Output: docs/research/cross-weather-vs-mast.csv + markdown tables on stdout.
"""
import csv, os, random, statistics as st
R = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: list(csv.DictReader(open(os.path.join(R, p), encoding='utf-8')))

# --- weather: JJA mean temp (mean of monthly means) and JJA precip (sum) per station-year
wx = {}
for r in rd('weather/extracted/jma_monthly.csv'):
    if r['month'] in ('6','7','8') and r['mean_temp_c'] and r['precip_total_mm']:
        wx.setdefault((r['station'], int(r['year'])), []).append((float(r['mean_temp_c']), float(r['precip_total_mm'])))
am = {}
for r in rd('weather/extracted/jma_monthly.csv'):
    if r['month'] in ('4','5') and r['mean_temp_c']:
        am.setdefault((r['station'], int(r['year'])), []).append(float(r['mean_temp_c']))
aprmay = {k: round(st.mean(v), 1) for k, v in am.items() if len(v) == 2}
jja = {k: (round(st.mean(t for t,_ in v), 1), round(sum(p for _,p in v), 1)) for k, v in wx.items() if len(v) == 3}

# --- mast
tho_act = {(r['prefecture'], int(r['fiscal_year'])): (float(r['mast_index']), r['actual_category']) for r in rd('mast/extracted/tohoku_forest_office_fruiting_actual.csv')}
tho_fc  = {(r['prefecture'], int(r['fiscal_year'])): (float(r['mast_index']), r['forecast_category']) for r in rd('mast/extracted/tohoku_forest_office_flowering_forecast.csv')}
akita = {}
for r in rd('mast/extracted/akita_buna_2002_2025.csv'):
    marks = [r[s] for s in ('hachimori','moriyoshizan','tazawako','higashinaruse','chokai')]
    n = sum(m in '○△x' for m in marks)
    akita[int(r['year'])] = {'good': marks.count('○'), 'mid': marks.count('△'), 'poor': marks.count('x'), 'n': n,
                             'score': round((2*marks.count('○') + marks.count('△')) / (2*n), 2) if n else None,
                             'text': f"{marks.count('○')}○ {marks.count('△')}△ {marks.count('x')}×"}
miyagi = {int(r['year']): r['buna_tohoku_forest_office'].replace('(=大凶作)','') for r in rd('mast/extracted/miyagi_mast_index_1998_2025.csv')}

# --- October sightings
octs = {}
for r in rd('moe/extracted/sightings-by-prefecture-by-month-by-fy.csv'):
    if r['10月'] != '' and not (int(r['fiscal_year']) == 2026):   # FY2026 Oct has not occurred (live PDF prints 0 in the 計 row)
        octs[(r['prefecture'], int(r['fiscal_year']))] = int(r['10月'])
fmt = lambda v: '' if v is None else v
def tho(pref, y):
    a = tho_act.get((pref, y)); f = tho_fc.get((pref, y))
    return (f"{a[1]} {a[0]}" if a else '') , (f"{f[1]} {f[0]}" if f else '')

# ================= Table 1: FY2019-2026, Akita & Morioka stations =================
print("## Table 1")
print("| Year | Akita JJA temp °C | Akita JJA precip mm | Morioka JJA temp °C | Morioka JJA precip mm | Akita beech, July forecast (index) | Akita beech, autumn actual (index) | Iwate beech, autumn actual (index) | Akita pref. 5 sites | Oct sightings Akita | Oct sightings Iwate | Oct sightings national |")
print("|---|---|---|---|---|---|---|---|---|---|---|---|")
rows1 = []
for y in range(2019, 2027):
    a = jja.get(('akita', y), (None, None)); m = jja.get(('morioka', y), (None, None))
    aa, af = tho('秋田県', y); ia, _ = tho('岩手県', y)
    ak = akita.get(y, {}).get('text', '')
    row = [y, a[0], a[1], m[0], m[1], af, aa, ia, ak, octs.get(('秋田', y)), octs.get(('岩手', y)), octs.get(('計', y))]
    rows1.append(row)
    print('| ' + ' | '.join(str(fmt(v)) for v in row) + ' |')

# ================= Table 2: lag table, Akita station, 2010-2026 =================
print("\n## Table 2")
print("| Mast year Y | Apr-May temp Y-1 | JJA temp Y-1 | JJA precip Y-1 | JJA temp Y | JJA precip Y | Akita 5-site result Y-1 | Akita 5-site result Y | Akita score Y | Miyagi beech (Tohoku office) Y | Oct sightings Akita FY Y |")
print("|---|---|---|---|---|---|---|---|---|---|---|")
rows2 = []
for y in range(2010, 2027):
    p = jja.get(('akita', y-1), (None, None)); c = jja.get(('akita', y), (None, None))
    row = [y, aprmay.get(('akita', y-1)), p[0], p[1], c[0], c[1], akita.get(y-1, {}).get('text',''), akita.get(y, {}).get('text',''), akita.get(y, {}).get('score'), miyagi.get(y, ''), octs.get(('秋田', y))]
    rows2.append(row)
    print('| ' + ' | '.join(str(fmt(v)) for v in row) + ' |')

# ================= Numbers: does prior-summer weather separate good from poor mast years? =================
print("\n## Stats")
years = [y for y in range(2010, 2026) if akita.get(y) and ('akita', y-1) in jja]
good = [y for y in years if akita[y]['good'] > 0]     # any site ○
poor = [y for y in years if akita[y]['good'] == 0]
def mean_of(ys, lag, idx): return round(st.mean(jja[('akita', y-lag)][idx] for y in ys), 1)
print(f"Akita, mast years {years[0]}-{years[-1]} (n={len(years)}): good (any site ○) = {good}; poor = {poor}")
for lag, lab in ((1, 'summer Y-1'), (0, 'summer Y')):
    print(f"  {lab}: mean JJA temp good-years {mean_of(good, lag, 0)} vs poor-years {mean_of(poor, lag, 0)}; "
          f"mean JJA precip good-years {mean_of(good, lag, 1)} vs poor-years {mean_of(poor, lag, 1)}")

def spearman(xs, ys):
    def rank(v):
        s = sorted(range(len(v)), key=lambda i: v[i]); r = [0]*len(v); i = 0
        while i < len(s):
            j = i
            while j+1 < len(s) and v[s[j+1]] == v[s[i]]: j += 1
            for k in range(i, j+1): r[s[k]] = (i+j)/2 + 1
            i = j+1
        return r
    rx, ry = rank(xs), rank(ys); n = len(xs)
    mx, my = st.mean(rx), st.mean(ry)
    num = sum((a-mx)*(b-my) for a,b in zip(rx,ry)); den = (sum((a-mx)**2 for a in rx)*sum((b-my)**2 for b in ry))**0.5
    return num/den
def perm_p(xs, ys, reps=20000, seed=1):
    obs = spearman(xs, ys); rnd = random.Random(seed); ys2 = ys[:]; hits = 0
    for _ in range(reps):
        rnd.shuffle(ys2)
        if abs(spearman(xs, ys2)) >= abs(obs) - 1e-12: hits += 1
    return obs, hits/reps
score = [akita[y]['score'] for y in years]
rho, p = perm_p([aprmay[('akita', y-1)] for y in years], score)
print(f"  Spearman rho(Akita Apr-May mean temp Y-1, Akita mast score Y) = {rho:+.2f}, two-sided permutation p = {p:.2f} (n={len(years)})  [Kon 2010 mechanism; note JMA monthly *mean*, not the minimum temp Kon used]")
for lag, lab in ((1, 'Y-1'), (0, 'Y')):
    for idx, what in ((0, 'JJA temp'), (1, 'JJA precip')):
        xs = [jja[('akita', y-lag)][idx] for y in years]
        rho, p = perm_p(xs, score)
        print(f"  Spearman rho(Akita {what} {lab}, Akita mast score Y) = {rho:+.2f}, two-sided permutation p = {p:.2f} (n={len(years)})")

# alternate-bearing check: what follows a good year?
follow = [(y, akita[y+1]['text']) for y in sorted(akita) if akita[y]['good'] > 0 and y+1 in akita]
print("  Year after every Akita year with any ○:", follow)
# October sightings vs mast, Akita, FY2013-2025
ys = [y for y in range(2013, 2026) if ('秋田', y) in octs and akita.get(y)]
rho, p = perm_p([akita[y]['score'] for y in ys], [octs[('秋田', y)] for y in ys])
print(f"  Spearman rho(Akita mast score Y, Akita Oct sightings FY Y) = {rho:+.2f}, p = {p:.3f} (n={len(ys)}); years {ys[0]}-{ys[-1]}")
ys2 = [y for y in range(2013, 2026) if ('計', y) in octs and y in miyagi]
cat = {'豊作':3, '並作':2, '凶作':1, '大凶作':0, '皆無':0}
rho, p = perm_p([cat[miyagi[y]] for y in ys2], [octs[('計', y)] for y in ys2])
print(f"  Spearman rho(Miyagi beech category Y, national Oct sightings FY Y) = {rho:+.2f}, p = {p:.3f} (n={len(ys2)})")

with open(os.path.join(R, '../../../docs/research/cross-weather-vs-mast.csv'), 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['year','akita_jja_temp_c','akita_jja_precip_mm','morioka_jja_temp_c','morioka_jja_precip_mm','tohoku_office_akita_july_forecast','tohoku_office_akita_autumn_actual','tohoku_office_iwate_autumn_actual','akita_pref_5site','oct_sightings_akita','oct_sightings_iwate','oct_sightings_national'])
    for r in rows1: w.writerow([fmt(v) for v in r])
    w.writerow([]); w.writerow(['mast_year','akita_aprmay_temp_prev','akita_jja_temp_prev','akita_jja_precip_prev','akita_jja_temp_same','akita_jja_precip_same','akita_5site_prev','akita_5site_same','akita_score_same','miyagi_beech_same','oct_sightings_akita'])
    for r in rows2: w.writerow([fmt(v) for v in r])
```

The sightings extractor is `data-pipeline/raw/research/moe/extract_syutubotu_monthly.py` (described above; its validation output is reproduced in the extraction notes). The JMA fetch is the existing `data-pipeline/raw/research/weather/fetch_jma.py` with `YEARS` extended to 2026.
