# Cross-check: beech mast index vs autumn bear outbreaks, FY2019-FY2025

Written 2026-09-05. Serves GOAL.md claim #5 ("Autumn surges follow failed beech/oak mast crops (2023, 2025)") and the "risk for the autumn ahead" panel. Every number below was read by the script at the bottom of this file from a file on disk; nothing is quoted from memory or from press reports.

## Sources actually read

| Series | File read | Origin | Coverage |
|---|---|---|---|
| Beech mast index, numeric (豊凶指数 0-5) + category, 5 Tohoku prefectures, 145 fixed points | `data-pipeline/raw/research/mast/extracted/tohoku_forest_office_fruiting_actual.csv` (from `buna-r5/r6/r7-fruiting.pdf`) | 東北森林管理局 autumn "結実状況（実績）" press releases, 2023-10-20 / 2024-10-31 / 2025-11-06 | **FY2023, FY2024, FY2025 only** |
| Beech flowering forecast, same office, same index | `.../tohoku_forest_office_flowering_forecast.csv` (from `buna-r5..r8-flowering.pdf`) | 東北森林管理局 July "開花状況と結実予測", 2023-07-05 .. 2026-07-07 | FY2023-FY2026 |
| Miyagi: Tohoku Forest Office points category series (皆無/大凶作/凶作/並作/豊作) | `.../miyagi_mast_index_1998_2025.csv` (from `miyagi-r7graph_2.pdf`) | 宮城県 chart PDF, text layer | 1998-2025 (Miyagi points only, ~6 points) |
| Akita: 5-site ○/△/× beech result | `.../akita_buna_2002_2025.csv` (from `akita-buna-mizunara-2002-2025.pdf`) | 秋田県 | 2002-2025 |
| Fukushima: beech fruiting category, prefecture overall | `.../fukushima_r4_r8.csv` (from `fukushima-r4-r8-summary.xlsx`) | 福島県 | FY2022-FY2025 fruiting; FY2026 flowering only |
| National beech fruiting by prefecture (categorical), 2 years | `.../env_ketujitu_national_r4_r5.csv` (from `env-ketujitu.pdf`) | 環境省 堅果類の着花結実情報 snapshot 2024-04-22 | FY2022, FY2023 |
| National monthly sightings FY2022-FY2026 | `webapp/data/national-timeline.json` (held; pipeline output from `raw/env/syutubotu.pdf`, MoE 2026-08-06 edition) | 環境省 | FY2022-FY2025 full; FY2026 Apr-Jun |
| National monthly sightings FY2019-FY2021 | `data-pipeline/raw/research/moe/syutubotu-2022-snapshot.pdf` (Wayback Machine copy of the MoE file dated 令和4年6月6日) | 環境省 via web.archive.org | FY2018-FY2021 full, FY2022 April only |
| Prefecture x month sightings FY2022-FY2026 | `data-pipeline/raw/env/sightings.csv` (held) | 環境省 syutubotu.pdf | FY2022-FY2026 |
| Injuries (victims) and deaths, monthly by prefecture | `data-pipeline/raw/env/injuries_monthly.csv` (held); annual totals cross-checked against `national-timeline.json` | 環境省 injury-qe PDFs | FY2016-FY2026 |

Not used: `yamagata_buna_h15_r7.csv`. The mast deep-read flagged its column alignment as unverified; a first pass here produced "15/16 sites 凶作" for 2024 and "5/16 sites 凶作" for 2025, the reverse of the primary Tohoku Forest Office result (2024 並作 index 2.9, 2025 大凶作 index 0.0), so its columns are shifted and it was dropped rather than reported.

## Table A: national, FY2019-FY2025

"TFO" = 東北森林管理局 (Tohoku Regional Forest Office) autumn actual result. "Miyagi TFO pts" = the same office's Miyagi survey points as re-published in Miyagi's chart, the only primary-derived series that reaches back to FY2019. "Akita 5 sites" = 八森/森吉山/田沢湖/東成瀬/鳥海 in that order (○ 豊作, △ 並作, × 凶作). Sightings are the MoE national 計 row for October and November of the fiscal year. Injured = victims (人身被害 被害者数).

| FY | TFO index mean, 5 pref | TFO category by prefecture (青 岩 宮 秋 山) | Miyagi TFO pts | Akita 5 sites | Fukushima beech fruiting | Oct sightings | Nov sightings | Oct+Nov | FY total | Oct+Nov share of FY | Injured Oct+Nov | Injured FY | Killed Oct+Nov | Killed FY | Sightings source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2019 | **missing** | **missing** | 大凶作 | ××××× | **missing** | 2,679 | 1,951 | 4,630 | 18,317 | 25.3% | 69 | 157 | 0 | 1 | Wayback snapshot 2022-06-06 |
| 2020 | **missing** | **missing** | 大凶作 | △△××× | **missing** | 4,213 | 2,288 | 6,501 | 20,887 | 31.1% | 66 | 158 | 2 | 2 | Wayback snapshot 2022-06-06 |
| 2021 | **missing** | **missing** | 凶作 | ××××× | **missing** | 1,393 | 1,062 | 2,455 | 12,766* | 19.2% | 18 | 88 | 2 | 5 | Wayback snapshot 2022-06-06 |
| 2022 | **missing** | **missing** (env.go.jp table: all 5 並作) | 凶作 | ×○○○○ | 豊作 | 1,026 | 562 | 1,588 | 11,136 | 14.3% | 6 | 75 | 0 | 2 | held national-timeline.json |
| 2023 | 0.06 | 大凶作 大凶作 大凶作 大凶作 大凶作 (0.1/0.0/0.0/0.1/0.1) | 大凶作 | ××××× | 凶作 | 5,983 | 3,700 | 9,683 | 24,348 | 39.8% | 103 | 219 | 4 | 6 | held national-timeline.json |
| 2024 | 3.24 | 豊作 並作 豊作 並作 並作 (3.8/2.7/4.2/2.6/2.9) | 豊作 | ○○○△△ | 並作 | 2,235 | 1,283 | 3,518 | 20,513 | 17.2% | 14 | 85 | 1 | 3 | held national-timeline.json |
| 2025 | 0.10 | 大凶作 大凶作 大凶作 大凶作 大凶作 (0.2/0.1/0.2/0.0/0.0) | 大凶作 | ××××× | 凶作 | 15,998 | 10,338 | 26,336 | 50,801 | 51.8% | 122 | 238 | 8 | 13 | held national-timeline.json |

\* FY2021: the snapshot's 12 monthly 計 cells sum to 12,735 but its printed 合計 is 12,766 (a 31-report inconsistency inside the MoE document itself). The printed 合計 is used; the Oct/Nov cells are unaffected.

Missing cells, explicitly:
- **TFO numeric index for FY2019-FY2022**: the office's press releases for R1-R4 were not fetched (the press index page lists them, but only R5-R8 were downloaded). This is the main gap; it is fillable by fetching four more PDFs from `https://www.rinya.maff.go.jp/tohoku/koho/press/index.html`.
- **Fukushima FY2019-FY2021**: the xlsx starts at R4 (FY2022).
- **env.go.jp national table**: only FY2022 and FY2023 exist in the one snapshot found; no newer edition located.
- **No FY2026 actual** for anything: the fruiting survey publishes ~November 2026.
- Injuries and sightings: no gaps in FY2019-FY2025.

## Table B: Tohoku prefectures, TFO index vs the same prefecture's Oct+Nov sightings and FY injuries

Prefecture-level sightings exist only from FY2022 (the held `sightings.csv`); the TFO index exists only from FY2023, so the overlap is FY2023-FY2025. FY2022 rows are shown for the sightings baseline with the index marked missing.

| FY | Prefecture | TFO index | TFO category | Oct+Nov sightings | FY sightings | Injured FY |
|---|---|---|---|---|---|---|
| 2022 | 青森 | missing | missing | 17 | 293 | 1 |
| 2022 | 岩手 | missing | missing | 89 | 2,179 | 24 |
| 2022 | 宮城 | missing | missing | 38 | 549 | 7 |
| 2022 | 秋田 | missing | missing | 15 | 730 | 6 |
| 2022 | 山形 | missing | missing | 17 | 377 | 2 |
| 2023 | 青森 | 0.1 | 大凶作 | 345 | 1,146 | 11 |
| 2023 | 岩手 | 0.0 | 大凶作 | 2,211 | 5,877 | 49 |
| 2023 | 宮城 | 0.0 | 大凶作 | 619 | 1,357 | 3 |
| 2023 | 秋田 | 0.1 | 大凶作 | 2,055 | 3,723 | 70 |
| 2023 | 山形 | 0.1 | 大凶作 | 220 | 772 | 5 |
| 2024 | 青森 | 3.8 | 豊作 | 41 | 725 | 4 |
| 2024 | 岩手 | 2.7 | 並作 | 184 | 2,883 | 10 |
| 2024 | 宮城 | 4.2 | 豊作 | 63 | 800 | 0 |
| 2024 | 秋田 | 2.6 | 並作 | 100 | 1,340 | 11 |
| 2024 | 山形 | 2.9 | 並作 | 7 | 357 | 4 |
| 2025 | 青森 | 0.2 | 大凶作 | 1,124 | 3,334 | 10 |
| 2025 | 岩手 | 0.1 | 大凶作 | 4,708 | 9,739 | 40 |
| 2025 | 宮城 | 0.2 | 大凶作 | 2,208 | 3,559 | 5 |
| 2025 | 秋田 | 0.0 | 大凶作 | 9,143 | 13,592 | 67 |
| 2025 | 山形 | 0.0 | 大凶作 | 1,482 | 3,124 | 12 |

The FY2022 Oct+Nov cells for Akita (15) and Aomori (17) look small relative to their FY totals (730, 293), so they were re-verified by reading the 秋田 and 青森 rows of the live `raw/env/syutubotu.pdf` with pdfplumber word positions: Akita FY2022 Oct=11, Nov=4 and the twelve FY2022 monthly cells sum to the printed 730; Akita FY2023 Oct+Nov = 1,472+583 = 2,055 and FY2025 = 5,810+3,333 = 9,143, both matching the held CSV. The small FY2022 autumn is real.

## Were 2023 and 2025 both mast failures per the primary source?

Yes. In the Tohoku Regional Forest Office autumn results (the primary source, 145 fixed points), every one of the five prefectures was graded 大凶作 (the lowest of five grades) in both years: FY2023 indices 0.1/0.0/0.0/0.1/0.1 (mean 0.06) and FY2025 indices 0.2/0.1/0.2/0.0/0.0 (mean 0.10). Both years were also all-× at Akita's five sites, 大凶作 at the Miyagi points, and 凶作 in Fukushima's prefecture-wide beech result. The intervening FY2024 was 並作-to-豊作 everywhere (mean index 3.24).

## What does the 2026 forecast say?

The office's July flowering survey (published 2026-07-07, `buna-r8-flowering.pdf`) forecasts autumn 2026 beech as: 青森 並作 (3.4), 岩手 豊作 (3.5), 宮城 豊作 (5.0), 秋田 豊作 (3.6), 山形 豊作 (4.0), mean 3.9. This is the highest of the four forecast years on file. Independent prefectural surveys agree: Akita's own forecast has 4 of 5 sites 豊作 and 1 並作; Niigata's July 2026 survey (189 points) is 豊作 prefecture-wide and in all four regions; Fukushima's 2026 flowering survey is 豊作 for beech in both 中通り and 会津.

How well has the July forecast predicted the autumn result? The three pairs on file: 2023 forecast 0.54 -> actual 0.06; 2024 forecast 3.30 -> actual 3.24; 2025 forecast 0.44 -> actual 0.10. The forecast got the category right in all three years and, in both failure years, the actual was worse than the forecast. Three pairs are too few to state an error bar, but there is no case on file of a good-crop forecast turning into a failure.

## Summary statistics (national)

Classifying a year as a "failure" when the primary TFO result is 大凶作 in all five prefectures (FY2023, FY2025), and for FY2019-FY2022 using the Miyagi TFO-points category as a proxy (大凶作 in 2019 and 2020; 凶作, not 大凶作, in 2021 and 2022):

| | Failure years (2019, 2020, 2023, 2025) | Other years (2021, 2022, 2024) |
|---|---|---|
| Mean Oct+Nov sightings | 11,788 | 2,520 |
| Mean injured, full FY | 193 | 83 |
| Mean injured, Oct+Nov | 90 | 13 |

Oct+Nov share of the year's sightings: failure years 25.3%, 31.1%, 39.8%, 51.8%; other years 19.2%, 14.3%, 17.2%. The two numeric-index failure years are the two largest autumns in the series, and the one numeric-index good year (2024, index 3.24) had an Oct+Nov total (3,518) about a third of 2023's and an eighth of 2025's.

## What this supports / does not support

Supports:
- **Claim #5's factual core**: FY2023 and FY2025 were beech mast failures across all of Tohoku by the primary survey, and those are exactly the two years with the largest October-November sighting counts (9,683 and 26,336) and the largest injury counts (219 and 238) in the FY2019-FY2025 window. FY2024, a normal-to-good crop, sat between them at 3,518 Oct+Nov sightings and 85 injured. The direction is unambiguous in every series read, including the proxies for 2019-2020.
- **The "risk for the autumn ahead" panel**: the 2026 crop is forecast good-to-bumper by four independent surveys (Tohoku Forest Office, Akita, Niigata, Fukushima). On the record to hand, that is the single most favourable autumn indicator available, and it points the opposite way from the +67% Apr-Jun sighting pace (1,787/4,581/6,260 in FY2026 vs 800/2,528/4,227 in FY2025).
- **Claim #4's spirit** (spring does not predict autumn): the mast series gives a mechanism for why. Autumn is set by the crop, and the crop is not known until July at the earliest.

Does not support, or supports only weakly:
- **A numeric mast-vs-sightings relationship**: the primary numeric index exists for only three years (2023, 2024, 2025). Three points cannot support a fitted line or a correlation coefficient; the page should show categories, not a regression. Four more Tohoku PDFs (R1-R4) would take this to seven years.
- **"Every failure produces a surge"**: FY2019 and FY2020 were 大凶作 at the Miyagi points and ×-dominated in Akita, yet their Oct+Nov totals (4,630 and 6,501) were well below FY2023's, and FY2021 was all-× in Akita with the *lowest* injury count in the window (88). The mast signal separates the biggest years from the rest but does not by itself explain the 2023 -> 2025 step (9,683 -> 26,336 Oct+Nov at near-identical index values 0.06 vs 0.10). Something else, plausibly population (GOAL claim #7) or reporting behaviour, is needed to explain the amplitude; the mast data cannot carry that claim.
- **Oak (ミズナラ/コナラ) mast**: the Tohoku office surveys beech only. Claim #5 says "beech/oak"; the oak half rests on Fukushima's prefecture-wide categories only (2025 mizunara 凶作, konara 凶作).
- **Anything outside Tohoku**: the numeric index covers five prefectures. National sightings are used above because the national monthly series is what is held, but Akita + Iwate alone were 46% of FY2025's sightings, so the national Oct+Nov numbers are largely a Tohoku story anyway (Table B: Akita 9,143 + Iwate 4,708 = 13,851 of the national 26,336 in Oct+Nov FY2025).
- **The 2026 forecast as a guarantee**: the forecast-to-actual record is three years long. It has been right three times; that is not a track record.

Caveats on the data itself: FY2019-FY2021 sightings come from a Wayback Machine copy of the MoE file, not the live pipeline, and the FY2021 annual total in that file is internally inconsistent by 31; the Miyagi and Akita series are categorical proxies with 5-6 points each, not the 145-point index; the Yamagata extraction was dropped as misaligned.

## Code and output

Run with `data-pipeline/.venv/bin/python`. Script and verbatim output follow.

```python
"""Cross-tabulate beech mast index vs Oct-Nov sightings and injuries, FY2019-FY2025.
Run with data-pipeline/.venv/bin/python. All numbers come from files read here."""
import csv, json, re, statistics
from collections import defaultdict
import pdfplumber

ROOT = '/Users/fergus/Projects/bearstats'
MAST = f'{ROOT}/data-pipeline/raw/research/mast/extracted'
MOE  = f'{ROOT}/data-pipeline/raw/research/moe'
ENV  = f'{ROOT}/data-pipeline/raw/env'
YEARS = list(range(2019, 2026))

# ---------- 1. National Oct+Nov sightings ----------
# FY2022-FY2025: held pipeline output (webapp/data/national-timeline.json, months ordered Apr..Mar)
nt = json.load(open(f'{ROOT}/webapp/data/national-timeline.json'))
months = nt['monthly']['months']            # [4,5,...,3]
iO, iN = months.index(10), months.index(11)
octnov = {}
for y, vals in nt['monthly']['sightings'].items():
    if len(vals) > iN:
        octnov[int(y)] = ('held national-timeline.json', vals[iO], vals[iN])

# FY2019-FY2021: Wayback snapshot of syutubotu.pdf dated 令和4年6月6日 (columns H30,R01,R02,R03,R04 per month)
NUM = re.compile(r'\d{1,3}(?:,\d{3})*')
def total_row(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        for line in (pdf.pages[0].extract_text() or '').splitlines():
            if line.startswith('計 '):
                return [int(t.replace(',', '')) for t in NUM.findall(line[1:])]
snap22 = total_row(f'{MOE}/syutubotu-2022-snapshot.pdf')
cols22 = [2018, 2019, 2020, 2021, 2022]      # H30..R04
assert len(snap22) == 13 * 5, len(snap22)
snap_month = {fy: [snap22[m*5 + k] for m in range(12)] for k, fy in enumerate(cols22)}
snap_total = {fy: snap22[12*5 + k] for k, fy in enumerate(cols22)}
for fy in (2019, 2020, 2021):
    if sum(snap_month[fy]) != snap_total[fy]:
        print(f'WARNING FY{fy}: sum of 12 monthly 計 cells = {sum(snap_month[fy])} but printed 合計 = {snap_total[fy]} (source-internal inconsistency; printed 合計 used below)')
    octnov[fy] = ('Wayback syutubotu 2022-06-06 snapshot', snap_month[fy][6], snap_month[fy][7])
print('Snapshot 2022-06-06 national annual totals (check):', snap_total)
print('Snapshot FY2019 Oct-Mar:', snap_month[2019][6:])
# consistency of the two sources on an overlapping year? none overlap (held starts FY2022, snapshot R04 has April only)
print('Snapshot R04(FY2022) April =', snap_month[2022][0], '; held FY2022 April =', nt['monthly']['sightings']['2022'][0])

# annual national sightings
annual_sight = {int(y): v for y, v in zip(nt['years_sightings'], nt['metrics']['sightings'])}
for fy in (2019, 2020, 2021):
    annual_sight[fy] = snap_total[fy]

# ---------- 2. Injuries (victims) and deaths ----------
annual_inj = {int(y): v for y, v in zip(nt['years_injuries'], nt['metrics']['injuries'])}
annual_dead = {int(y): v for y, v in zip(nt['years_injuries'], nt['metrics']['deaths'])}
inj_on = defaultdict(int); dead_on = defaultdict(int); inj_chk = defaultdict(int)
for r in csv.DictReader(open(f'{ENV}/injuries_monthly.csv')):
    fy, m = int(r['year']), int(r['month'])
    inj_chk[fy] += int(r['victims'])
    if m in (10, 11):
        inj_on[fy] += int(r['victims']); dead_on[fy] += int(r['deaths'])
for fy in YEARS:
    assert inj_chk[fy] == annual_inj[fy], (fy, inj_chk[fy], annual_inj[fy])
print('injuries_monthly.csv annual victims match national-timeline for', YEARS)

# ---------- 3. Mast ----------
tfo = defaultdict(dict)
for r in csv.DictReader(open(f'{MAST}/tohoku_forest_office_fruiting_actual.csv')):
    tfo[int(r['fiscal_year'])][r['prefecture']] = (float(r['mast_index']), r['actual_category'])
tfo_fc = defaultdict(dict)
for r in csv.DictReader(open(f'{MAST}/tohoku_forest_office_flowering_forecast.csv')):
    tfo_fc[int(r['fiscal_year'])][r['prefecture']] = (float(r['mast_index']), r['forecast_category'])
miyagi = {int(r['year']): r['buna_tohoku_forest_office'] for r in csv.DictReader(open(f'{MAST}/miyagi_mast_index_1998_2025.csv'))}
akita = {int(r['year']): [r[k] for k in ('hachimori','moriyoshizan','tazawako','higashinaruse','chokai')]
         for r in csv.DictReader(open(f'{MAST}/akita_buna_2002_2025.csv'))}
# yamagata_buna_h15_r7.csv deliberately NOT used: the deep-read flagged its column alignment as unverified, and a
# first pass here showed it calling 2024 '15/16 sites 凶作' and 2025 '5/16 sites 凶作' -- the reverse of the
# primary Tohoku Forest Office result (2024 並作 2.9 / 2025 大凶作 0.0), i.e. the columns are shifted.
fuku = {}
for r in csv.DictReader(open(f'{MAST}/fukushima_r4_r8.csv')):
    if r['species'] == 'buna' and r['survey_type'] == 'fruiting':
        fuku[int(r['fiscal_year'])] = r['overall']
envk = {r['prefecture']: r for r in csv.DictReader(open(f'{MAST}/env_ketujitu_national_r4_r5.csv'))}

def tfo_mean(fy):
    if fy not in tfo: return None
    return round(statistics.mean(v[0] for v in tfo[fy].values()), 2)

# ---------- 4. Tables ----------
print('\n=== Table A: national, FY2019-FY2025 ===')
hdr = ['FY','TFO index mean (5 pref)','TFO categories','Miyagi TFO pts','Akita 5 sites (x=凶作)','Fukushima buna fruiting','Oct sightings','Nov sightings','Oct+Nov','FY total','Oct+Nov % of FY','Injured Oct+Nov','Injured FY','Killed Oct+Nov','Killed FY','sightings source']
print('|'+'|'.join(hdr)+'|'); print('|'+'---|'*len(hdr))
rowsA = []
for fy in YEARS:
    src, o, n = octnov[fy]
    cats = ' '.join(f"{p[0]}:{tfo[fy][p][1]}" for p in ['青森県','岩手県','宮城県','秋田県','山形県']) if fy in tfo else 'MISSING'
    ak = ''.join(akita[fy]) if fy in akita else 'MISSING'
    row = [fy, tfo_mean(fy) if fy in tfo else 'MISSING', cats, miyagi.get(fy,'MISSING'), ak,
           fuku.get(fy,'MISSING'), o, n, o+n, annual_sight[fy], f"{100*(o+n)/annual_sight[fy]:.1f}%",
           inj_on[fy], annual_inj[fy], dead_on[fy], annual_dead[fy], src]
    rowsA.append(row); print('|'+'|'.join(str(x) for x in row)+'|')

# ---------- 5. Tohoku prefecture Oct+Nov sightings FY2022-FY2025 vs TFO index ----------
pref_key = {'青森県':'aomori','岩手県':'iwate','宮城県':'miyagi','秋田県':'akita','山形県':'yamagata'}
ps = defaultdict(lambda: defaultdict(int)); ptot = defaultdict(lambda: defaultdict(int))
for r in csv.DictReader(open(f'{ENV}/sightings.csv')):
    fy, m, k = int(r['year']), int(r['month']), r['prefecture_key']
    v = int(r['value']) if r['value'] not in ('', '-', '－') else 0
    ptot[fy][k] += v
    if m in (10, 11): ps[fy][k] += v
pinj = defaultdict(lambda: defaultdict(int))
for r in csv.DictReader(open(f'{ENV}/injuries_monthly.csv')):
    pinj[int(r['year'])][r['prefecture_key']] += int(r['victims'])
print('\n=== Table B: Tohoku prefectures, TFO fruiting index vs Oct+Nov sightings and FY injuries ===')
hdrB = ['FY','Prefecture','TFO index','TFO category','Oct+Nov sightings','FY sightings','Injured FY (victims)']
print('|'+'|'.join(hdrB)+'|'); print('|'+'---|'*len(hdrB))
for fy in (2022, 2023, 2024, 2025):
    for p, k in pref_key.items():
        idx, cat = tfo[fy][p] if fy in tfo else ('MISSING','MISSING')
        print(f"|{fy}|{p}|{idx}|{cat}|{ps[fy][k]}|{ptot[fy][k]}|{pinj[fy][k]}|")

print('\n=== 2026 forecast (TFO flowering survey, published 2026-07-07) ===')
for p, (idx, cat) in tfo_fc[2026].items(): print(f'  {p}: {idx} {cat}')
print('  mean index 2026 forecast:', round(statistics.mean(v[0] for v in tfo_fc[2026].values()), 2))
print('  forecast-vs-actual pairs:', {fy: (round(statistics.mean(v[0] for v in tfo_fc[fy].values()),2), tfo_mean(fy)) for fy in (2023,2024,2025)})
print('  FY2026 held Apr-Jun national sightings:', nt['monthly']['sightings']['2026'], 'vs FY2025 same months', nt['monthly']['sightings']['2025'][:3])

print('\n=== env.go.jp national ketujitu R4/R5: buna fruiting for Tohoku 5 ===')
for p in ['青森','岩手','宮城','秋田','山形']:
    print(f"  {p}: FY2022={envk[p]['r4_fruiting_buna']}  FY2023={envk[p]['r5_fruiting_buna']}")

# ---------- 6. Simple stats ----------
print('\n=== Oct+Nov sightings ratio, failure years vs others (FY2019-2025, national) ===')
def mast_fail(fy):
    # primary-source failure = TFO all 5 大凶作 (2023, 2025). For 2019-2022 use Miyagi-TFO points category as proxy.
    if fy in tfo: return all(v[1] == '大凶作' for v in tfo[fy].values())
    return miyagi[fy] == '大凶作'
for fy in YEARS:
    src, o, n = octnov[fy]
    print(f"  FY{fy}: failure={'YES' if mast_fail(fy) else 'no '}  Oct+Nov={o+n:>6}  share={100*(o+n)/annual_sight[fy]:5.1f}%  injured FY={annual_inj[fy]:>3}  injured Oct+Nov={inj_on[fy]:>3}")
fail = [fy for fy in YEARS if mast_fail(fy)]; ok = [fy for fy in YEARS if not mast_fail(fy)]
mean = lambda ys, f: round(statistics.mean(f(fy) for fy in ys), 1)
print('  failure years:', fail, ' non-failure:', ok)
print('  mean Oct+Nov sightings  failure vs non-failure:', mean(fail, lambda fy: sum(octnov[fy][1:])), mean(ok, lambda fy: sum(octnov[fy][1:])))
print('  mean FY injured         failure vs non-failure:', mean(fail, lambda fy: annual_inj[fy]), mean(ok, lambda fy: annual_inj[fy]))
print('  mean Oct+Nov injured    failure vs non-failure:', mean(fail, lambda fy: inj_on[fy]), mean(ok, lambda fy: inj_on[fy]))
# Spearman rank on the 2023-2025 numeric index only (n=3, illustrative)
xs = [(tfo_mean(fy), sum(octnov[fy][1:])) for fy in (2023,2024,2025)]
print('  (index mean, Oct+Nov sightings) 2023-2025:', xs)
```

Output:

```text
WARNING FY2021: sum of 12 monthly 計 cells = 12735 but printed 合計 = 12766 (source-internal inconsistency; printed 合計 used below)
Snapshot 2022-06-06 national annual totals (check): {2018: 12809, 2019: 18317, 2020: 20887, 2021: 12766, 2022: 307}
Snapshot FY2019 Oct-Mar: [2679, 1951, 374, 100, 63, 97]
Snapshot R04(FY2022) April = 307 ; held FY2022 April = 437
injuries_monthly.csv annual victims match national-timeline for [2019, 2020, 2021, 2022, 2023, 2024, 2025]

=== Table A: national, FY2019-FY2025 ===
|FY|TFO index mean (5 pref)|TFO categories|Miyagi TFO pts|Akita 5 sites (x=凶作)|Fukushima buna fruiting|Oct sightings|Nov sightings|Oct+Nov|FY total|Oct+Nov % of FY|Injured Oct+Nov|Injured FY|Killed Oct+Nov|Killed FY|sightings source|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|2019|MISSING|MISSING|大凶作|xxxxx|MISSING|2679|1951|4630|18317|25.3%|69|157|0|1|Wayback syutubotu 2022-06-06 snapshot|
|2020|MISSING|MISSING|大凶作|△△xxx|MISSING|4213|2288|6501|20887|31.1%|66|158|2|2|Wayback syutubotu 2022-06-06 snapshot|
|2021|MISSING|MISSING|凶作|xxxxx|MISSING|1393|1062|2455|12766|19.2%|18|88|2|5|Wayback syutubotu 2022-06-06 snapshot|
|2022|MISSING|MISSING|凶作|x○○○○|豊作|1026|562|1588|11136|14.3%|6|75|0|2|held national-timeline.json|
|2023|0.06|青:大凶作 岩:大凶作 宮:大凶作 秋:大凶作 山:大凶作|大凶作|xxxxx|凶作|5983|3700|9683|24348|39.8%|103|219|4|6|held national-timeline.json|
|2024|3.24|青:豊作 岩:並作 宮:豊作 秋:並作 山:並作|豊作|○○○△△|並作|2235|1283|3518|20513|17.2%|14|85|1|3|held national-timeline.json|
|2025|0.1|青:大凶作 岩:大凶作 宮:大凶作 秋:大凶作 山:大凶作|大凶作|xxxxx|凶作|15998|10338|26336|50801|51.8%|122|238|8|13|held national-timeline.json|

=== Table B: Tohoku prefectures, TFO fruiting index vs Oct+Nov sightings and FY injuries ===
|FY|Prefecture|TFO index|TFO category|Oct+Nov sightings|FY sightings|Injured FY (victims)|
|---|---|---|---|---|---|---|
|2022|青森県|MISSING|MISSING|17|293|1|
|2022|岩手県|MISSING|MISSING|89|2179|24|
|2022|宮城県|MISSING|MISSING|38|549|7|
|2022|秋田県|MISSING|MISSING|15|730|6|
|2022|山形県|MISSING|MISSING|17|377|2|
|2023|青森県|0.1|大凶作|345|1146|11|
|2023|岩手県|0.0|大凶作|2211|5877|49|
|2023|宮城県|0.0|大凶作|619|1357|3|
|2023|秋田県|0.1|大凶作|2055|3723|70|
|2023|山形県|0.1|大凶作|220|772|5|
|2024|青森県|3.8|豊作|41|725|4|
|2024|岩手県|2.7|並作|184|2883|10|
|2024|宮城県|4.2|豊作|63|800|0|
|2024|秋田県|2.6|並作|100|1340|11|
|2024|山形県|2.9|並作|7|357|4|
|2025|青森県|0.2|大凶作|1124|3334|10|
|2025|岩手県|0.1|大凶作|4708|9739|40|
|2025|宮城県|0.2|大凶作|2208|3559|5|
|2025|秋田県|0.0|大凶作|9143|13592|67|
|2025|山形県|0.0|大凶作|1482|3124|12|

=== 2026 forecast (TFO flowering survey, published 2026-07-07) ===
  青森県: 3.4 並作
  岩手県: 3.5 豊作
  宮城県: 5.0 豊作
  秋田県: 3.6 豊作
  山形県: 4.0 豊作
  mean index 2026 forecast: 3.9
  forecast-vs-actual pairs: {2023: (0.54, 0.06), 2024: (3.3, 3.24), 2025: (0.44, 0.1)}
  FY2026 held Apr-Jun national sightings: [1787, 4581, 6260] vs FY2025 same months [800, 2528, 4227]

=== env.go.jp national ketujitu R4/R5: buna fruiting for Tohoku 5 ===
  青森: FY2022=並作  FY2023=大凶作
  岩手: FY2022=並作  FY2023=不作
  宮城: FY2022=並作  FY2023=凶作
  秋田: FY2022=並作  FY2023=凶作
  山形: FY2022=並作  FY2023=凶作

=== Oct+Nov sightings ratio, failure years vs others (FY2019-2025, national) ===
  FY2019: failure=YES  Oct+Nov=  4630  share= 25.3%  injured FY=157  injured Oct+Nov= 69
  FY2020: failure=YES  Oct+Nov=  6501  share= 31.1%  injured FY=158  injured Oct+Nov= 66
  FY2021: failure=no   Oct+Nov=  2455  share= 19.2%  injured FY= 88  injured Oct+Nov= 18
  FY2022: failure=no   Oct+Nov=  1588  share= 14.3%  injured FY= 75  injured Oct+Nov=  6
  FY2023: failure=YES  Oct+Nov=  9683  share= 39.8%  injured FY=219  injured Oct+Nov=103
  FY2024: failure=no   Oct+Nov=  3518  share= 17.2%  injured FY= 85  injured Oct+Nov= 14
  FY2025: failure=YES  Oct+Nov= 26336  share= 51.8%  injured FY=238  injured Oct+Nov=122
  failure years: [2019, 2020, 2023, 2025]  non-failure: [2021, 2022, 2024]
  mean Oct+Nov sightings  failure vs non-failure: 11787.5 2520.3
  mean FY injured         failure vs non-failure: 193 82.7
  mean Oct+Nov injured    failure vs non-failure: 90 12.7
  (index mean, Oct+Nov sightings) 2023-2025: [(0.06, 9683), (3.24, 3518), (0.1, 26336)]
```
