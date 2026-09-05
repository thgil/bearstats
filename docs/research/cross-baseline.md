# Cross-baseline check: population, hunters, captures, sightings, casualties by year

Written 2026-09-05. Purpose: test GOAL.md claim #7 ("bear population ~15,000 (2012) to ~54,000 (2025); hunters >70,000 (1970s) to <20,000") against primary Ministry of the Environment (MoE) series, and mark every cell as primary or secondary.

Every number below was read from a file on disk in this session. Files are under `data-pipeline/raw/research/moe/` (earlier sweep) and `data-pipeline/raw/research/baseline/` (this pass). The script that produced the numbers is `data-pipeline/raw/research/baseline/cross_baseline.py`; its full output is reproduced at the end.

## Sources and their status

| Series | Source | File | Status |
|---|---|---|---|
| Sightings FY2022-26, injuries/deaths FY2008-26, captures FY2008-26 | MoE effort12 syutubotu.pdf / injury-qe.pdf / capture-qe.pdf, via the pipeline | `webapp/data/national-timeline.json` | **primary** (held) |
| Licence holders 1975-2021, by type | MoE 種別狩猟免許所持者数 (docs4/syubetu.pdf), rounded to 100 | `baseline/syubetu.pdf` | **primary** (fetched this pass) |
| Licence holders 1975-2021, by age | MoE 年代別狩猟免許所持者数 (docs4/nenreibetu.pdf) | `baseline/nenreibetu.pdf` | **primary** (fetched, read; not tabulated) |
| Licence holders FY2019-21, exact | MoE 鳥獣関係統計 R3-02.xlsx | `moe/extracted/hunting-license-holders-national.csv` | **primary** |
| National bear captures 1960-2020 (狩猟 / その他) | MoE docs4/hokakusuu.pdf, rounded to 100 | `moe/hokakusuu.pdf` | **primary** |
| Population, per prefecture, 3 non-aligned time points | MoE 特定鳥獣保護・管理計画ガイドライン（クマ編）令和8年度版（案） 表II-2, dated Feb 2026 | `moe/extracted/population-by-prefecture.csv` | **primary** (draft) |
| Population, national, 2006 / 1990-2000s | 環境研究総合推進費 手引き (bear-project.org, March 2012), table 3-1, citing 環境省部内資料 2006 and 米田・間野 2011 | `baseline/tebiki-tougou-2012.pdf` | **primary-ish** (MoE-funded manual quoting an internal MoE figure) |
| Population 15,000 (2012) → 54,000 (2025); licences 518,000 (1975) → 218,500 (2020); injuries 213 (2023), ~220 + 13 deaths (2025) | Britannica, "Why Have There Been So Many Bear Attacks in Japan in 2025?", dated 2025-11-18 (Wayback snapshot 2026-05-04) | `baseline/britannica-wb.html` | **secondary** |
| 13 dead / 217 injured through Nov 2025 | Japan Times 2025-12-06 (Alice French); only the lede is outside the paywall | `baseline/jt-20251206-wb.html` | **secondary** |
| Hunters ">70,000 (1970s) → <20,000" | `webapp/index.html` line 195, attributed to "Japan Times, Britannica" | — | **secondary, no source located** |

Britannica and Japan Times block direct fetches (Cloudflare challenge); both were read from Wayback Machine snapshots. The Japan Times 2025-12-26 commentary (Michael MacArthur Bosack) is paywalled beyond the lede; search snippets attribute "around 220,000 licensed hunters ... 532,265 registered in 1970" to it, but that text was not read and is not used below.

## Table 1: combined series by year

Fiscal years (April-March) for MoE series. Licences are counted at fiscal-year end; MoE notes the licence series was compiled every 5 years before 2005 and annually since. Captures (held) = 許可捕獲 total from capture-qe.pdf; captures (hokakusuu) = その他 row (permitted captures for damage prevention / population control), rounded to 100. P = primary, S = secondary.

| Year | Population estimate | Licence holders (P) | Captures, held (P) | Captures, hokakusuu (P) | Sightings (P) | Injured (P) | Killed (P) |
|---|---|---|---|---|---|---|---|
| 1975 | | 517,800 | | 1,700 | | | |
| 1980 | | 460,800 | | 1,300 | | | |
| 1985 | | 326,300 | | 1,500 | | | |
| 1990 | | 289,500 | | 700 | | | |
| 1995 | | 246,000 | | 800 | | | |
| 2000 | | 210,200 | | 1,200 | | | |
| 2005 | | 203,600 | | 1,100 | | | |
| 2006 | 16,000 black bear (P, MoE internal figure quoted in 2012 manual) | 186,700 | | 4,800 | | | |
| 2007 | | 228,900 | | 1,300 | | | |
| 2008 | | 221,500 | 1,492 | 1,400 | | 55 | 3 |
| 2009 | | 185,900 | 1,717 | 1,500 | | 64 | 2 |
| 2010 | | 190,200 | 4,015 | 4,000 | | 150 | 4 |
| 2011 | | 198,400 | 1,800 | 1,800 | | 81 | 2 |
| 2012 | 15,000-20,000 black bear + ~3,000 brown bear (P, 2012 manual, itself a stack of 1990s-2000s prefectural surveys); "15,000" (S, Britannica) | 180,700 | 3,369 | 3,300 | | 77 | 1 |
| 2013 | | 185,300 | 1,859 | 1,900 | | 56 | 2 |
| 2014 | | 193,800 | 4,167 | 4,100 | | 122 | 2 |
| 2015 | | 190,100 | 1,950 | 1,900 | | 56 | 0 |
| 2016 | | 196,500 | 3,786 | 3,800 | | 105 | 4 |
| 2017 | | 209,600 | 3,953 | 3,900 | | 108 | 2 |
| 2018 | | 207,300 | 3,586 | 3,600 | | 53 | 0 |
| 2019 | | 215,400 (exact 215,417) | 6,281 | 6,300 | | 157 | 1 |
| 2020 | | 218,500 (exact 218,493); "218,500" (S, Britannica) | 7,248 | 7,200 | | 158 | 2 |
| 2021 | | 213,400 (exact 213,370) | 4,485 | | | 88 | 5 |
| 2022 | | not yet published by MoE | 3,875 | | 11,136 | 75 | 2 |
| 2023 | | | 9,271 | | 24,348 | 219 ("213" S, Britannica) | 6 |
| 2024 | | | 5,345 | | 20,513 | 85 | 3 |
| 2025 | "54,000 combined" (S, Britannica) | | 14,741 | | 50,801 | 238 ("~220" S, Britannica, written mid-Nov) | 13 (S agrees) |
| 2026 (partial) | 57,308 = sum of latest per-prefecture estimates, surveys dated 2020-2024 (P, draft guideline Feb 2026); black bear only 45,708 | | 2,136 | | 12,628 (Apr-Jun) | 53 (Apr-Jul) | 6 (Apr-Jul) |

## Table 2: licence holders by type (MoE syubetu.pdf), the series the page's "hunters" sentence should rest on

| Year | Total | 第1種銃猟 (rifle/shotgun) | Note |
|---|---|---|---|
| 1975 | 517,800 | 493,700 | |
| 1985 | 326,300 | 297,000 | |
| 1995 | 246,000 | 208,600 | |
| 2005 | 203,600 | 152,800 | |
| 2012 | 180,700 | 96,200 | series low for total |
| 2016 | 196,500 | 88,900 | |
| 2021 | 213,400 | 84,400 | rifle series low; trap licences (わな) 119,500 now exceed rifle |

Fall 1975→2021: total -59%, rifle -83%. The total has *risen* since 2012 because trap licences grew from 51,600 (2007) to 119,500 (2021). These are licence counts, not distinct persons (one person can hold rifle and trap licences), and none of them is "bear hunters": MoE publishes no bear-specific hunter count. Age: 60+ holders were 119,100 of 213,400 in 2021 (nenreibetu.pdf).

## Table 3: population, what the primary tables actually say

| Point | Value | Survey years behind it | Source |
|---|---|---|---|
| "2006" national black bear | 16,000 | unstated (環境省部内資料 2006) | 2012 manual table 3-1 |
| "1990s-2000s" national black bear | 13,000-21,000 | stack of prefectural surveys 1990s-2000s | 2012 manual table 3-1, citing 米田・間野 2011 |
| "1990s" national brown bear | 1,700-3,600 | questionnaire surveys, 1990s | same |
| Latest, all prefectures + Hokkaido | 57,308 | 25 rows, surveys 2020 (8 rows), 2021 (3), 2022 (2), 2023 (3), 2024 (9); 8 prefectures unpublished | draft guideline Feb 2026, table II-2 |
| Latest, black bear only (excl. Hokkaido 11,600) | 45,708 | as above | same |
| "2010s" column | 40,449 | 19 rows only, 2012-2019 | same |

Per-prefecture growth where the same table gives both a pre-2010 and a latest estimate: Iwate 1,100 (2006) → 3,700 (2020), x3.4; Akita 1,052 (2010) → 2,900 (2024), x2.8; Miyagi 633 (2008) → 3,147 (2020), x5.0; Nagano 2,770 (2007) → 7,270 (2020), x2.6; Hokkaido 5,400 (1991) → 11,600 (2023), x2.1; Niigata 1,080 (2010) → 1,118 (2023), x1.0. All 16 comparable rows are ≥1.0; 14 of 16 are ≥1.4x.

## Inconsistencies found

1. **Hunters ">70,000 (1970s) → <20,000" (webapp/index.html) is contradicted by MoE.** MoE has 517,800 licence holders in 1975 and 213,400 in 2021; the page's figures are off by 7.4x and 10.7x respectively. No source containing 70,000/20,000 was found in Britannica, Japan Times, or any MoE file. Even the narrowest MoE category (第1種銃猟, 84,400 in 2021) is not "<20,000". This sentence must be replaced, e.g. "licensed hunters: 518,000 in 1975, 213,000 in 2021; gun licences 494,000 → 84,000; most holders are over 60".
2. **"15,000 (2012) → 54,000 (2025)" compares different things.** The 15,000 is the lower bound of a black-bear-only range (15,000-20,000) published in 2012 from surveys dated 1990s-2000s; the 54,000 is a combined black + brown figure (Britannica's own wording is "combined bear numbers"). Like-for-like: black bear 13,000-21,000 (1990s-2000s surveys) → 45,708 (2020-24 surveys); combined 18,000-23,000 → 57,308. Neither endpoint is a single-year national survey, and prefectural methods changed (hair-trap / camera-trap methods spread after the 2012 manual), so part of the rise is measurement. The direction is nonetheless supported by every prefecture with two comparable surveys.
3. **Britannica 54,000 vs MoE sum 57,308**: +6.1%. Not a contradiction; the guideline table is a Feb 2026 draft and includes surveys through 2024, and Britannica gives no source for its figure. Search snippets say a later edition of the same Britannica page quotes "58,000 by early 2026", consistent with this table.
4. **Britannica licences 518,000 (1975) / 218,500 (2020)** match MoE syubetu.pdf to rounding (517,800 / 218,500). Primary source confirmed.
5. **Britannica injuries 2023 = 213 vs MoE FY2023 = 219** (+6). Britannica appears to use calendar year or a provisional figure; the page should keep MoE's 219.
6. **Britannica "~220 injured, 13 killed" (2025) vs MoE FY2025 final 238 / 13**: the article was written in mid-November, before the fiscal year ended; deaths agree, injuries are simply an earlier cut. Japan Times 2025-12-06 gives 217 injured / 13 dead through end-November (MoE data), consistent.
7. **Held captures (capture-qe.pdf) vs MoE hokakusuu.pdf その他 row**: agree within rounding for 2010-2020 (max |diff| 69 on values of 1,800-7,248) but differ by +92 (2008) and +217 (2009). hokakusuu's その他 is a narrower definition (damage-prevention + population-control permits only, excludes research etc.) and is rounded to 100; capture-qe is total 許可捕獲. Not a data error; do not mix the two on one chart.
8. **MoE licence PDF vs MoE xlsx**: 215,400/218,500/213,400 vs 215,417/218,493/213,370 — rounding only.

## What this supports / does not support

Supports:
- The hunter half of claim #7 in *direction* only: licence holders fell 59% from 1975 to 2021 (517,800 → 213,400), gun licences fell 83% (493,700 → 84,400), and 56% of holders were 60+ in 2021. Primary, MoE, 23 data points.
- The population half of claim #7 in direction: every one of the 16 prefectures/regions with two comparable MoE-tabulated estimates shows an increase (x1.0 to x5.5), and the national stack rose from 18,000-23,000 (combined, 1990s-2000s surveys) to 57,308 (2020-24 surveys).
- Britannica's 518,000 / 218,500 licence figures and its 13 deaths in 2025 are exactly the MoE numbers.
- Captures rising with sightings: permitted captures 1,492 (FY2008) → 7,248 (FY2020) → 14,741 (FY2025), the series the page already holds.

Does not support:
- The specific numbers "hunters >70,000 (1970s) to <20,000" — contradicted by MoE at every level of aggregation; remove.
- The phrase "bear hunters": MoE counts licences by method and age, never by target species.
- "15,000 (2012) to 54,000 (2025)" as a like-for-like tripling; the honest statement is "prefectural estimates summed to 15,000-20,000 black bears (surveys of the 1990s-2000s, published 2012) and to about 46,000 black bears / 57,000 including Hokkaido brown bears (surveys 2020-24, MoE draft guideline, Feb 2026)", with the caveat that survey methods changed.
- A single MoE national population time series by year — none exists in any file read. Charting population must be per-prefecture points at their own survey years, not a national line.
- Licence counts for FY2022 onward — MoE's latest published 鳥獣関係統計 edition is FY2021 (R3).
- Any year-by-year link between licence numbers and sightings/injuries: the licence total is flat-to-rising from 2012 (180,700) to 2021 (213,400) while injuries and captures swing with mast years; the decline is a 1975-2005 story, not a 2010s one. The rifle series is the only one still falling.

Still unresolved: the original source of the "70,000 / 20,000" figures (possibly a regional or matagi-specific number, possibly a misreading of the 第1種銃猟 line); a national population figure for FY2022-24 from MoE; hunting-derived (狩猟) bear kills for FY2019 onward (marked 未集計 in hokakusuu.pdf).

## Code

`data-pipeline/raw/research/baseline/cross_baseline.py`, run with `data-pipeline/.venv/bin/python`:

```python
"""Cross-baseline table: population, licence holders, captures, sightings, injuries by year.
Every number is read from a file on disk; secondary figures are typed in from the
Britannica page text saved at britannica-wb.html (Wayback 2026-05-04 snapshot of the 2025-11-18 article).
"""
import json, csv, re
import pdfplumber

ROOT = '/Users/fergus/Projects/bearstats'
RES = f'{ROOT}/data-pipeline/raw/research'

# ---- 1. held MoE series (webapp/data/national-timeline.json, built from raw/env/*.pdf)
tl = json.load(open(f'{ROOT}/webapp/data/national-timeline.json'))
inj = dict(zip(tl['years_injuries'], tl['metrics']['injuries']))
dth = dict(zip(tl['years_injuries'], tl['metrics']['deaths']))
cap = dict(zip(tl['years_captures'], tl['metrics']['captures_total']))
sgt = dict(zip(tl['years_sightings'], tl['metrics']['sightings']))

# ---- 2. MoE syubetu.pdf: licence holders 1975-2021 (row '合 計'), read by x-position
def row_by_label(page, label_x0_max=40, label=None):
    words = page.extract_words()
    rows = {}
    for w in words:
        rows.setdefault(round(w['top']), []).append(w)
    out = {}
    for top, ws in rows.items():
        txt = ''.join(w['text'] for w in ws if w['x0'] < label_x0_max)
        nums = {round(w['x0']): w['text'] for w in ws if re.fullmatch(r'[\d,]+', w['text'])}
        if label in txt and nums:
            out = nums
    return out

with pdfplumber.open(f'{RES}/baseline/syubetu.pdf') as pdf:
    pg = pdf.pages[0]
    words = pg.extract_words()
    year_row = [w for w in words if round(w['top']) == 41]
    years = [(round(w['x0']), int(w['text'])) for w in year_row]
    tot_row = row_by_label(pg, label='計')
    rifle_row = row_by_label(pg, label='第１種銃猟')
    def nearest(x):  # map a number's x0 to the closest year-header x0
        return min(years, key=lambda yx: abs(yx[0] - x))[1]
    lic = {nearest(x): int(v.replace(',', '')) for x, v in tot_row.items()}
    rifle = {nearest(x): int(v.replace(',', '')) for x, v in rifle_row.items()}
assert len(lic) == 23 and len(rifle) == 23, (len(lic), len(rifle))

# ---- 3. MoE R3-02.xlsx exact totals (already extracted CSV) for cross-check vs rounded PDF
lic_exact = {}
for r in csv.DictReader(open(f'{RES}/moe/extracted/hunting-license-holders-national.csv')):
    y = int(r['fiscal_year'][2:6])  # 'FY2019(R01)' -> 2019
    lic_exact[y] = int(r['total'])

# ---- 4. MoE hokakusuu.pdf: national bear captures 1960-2020 (狩猟 / その他 rows)
hunt, other = {}, {}
txt = open(f'{RES}/baseline/hokakusuu.txt').read() if False else None
import subprocess
txt = subprocess.run(['pdftotext', '-layout', f'{RES}/moe/hokakusuu.pdf', '-'], capture_output=True, text=True).stdout
lines = txt.split('\n')
for i, ln in enumerate(lines):
    m = re.match(r'\s*(\d{4})年度\s+(.*)', ln)
    if not m: continue
    y = int(m.group(1)); top = m.group(2).split(); bot = lines[i + 1].split()[1:]
    if len(top) < 3 or len(bot) < 5:
        continue  # chart axis labels at the foot of the page repeat '2000年度'... with no data
    # top row: boar, deer, bear[, kawau]; bottom row: boar, deer, monkey, serow, bear, kawau
    hunt[y] = None if top[2] == '－' else int(top[2].replace(',', ''))
    other[y] = int(bot[4].replace(',', ''))
assert other[2020] == 7200 and hunt[2018] == 400 and other[1960] == 500

# ---- 5. MoE 2026 draft guideline table II-2 (already extracted CSV): sum of 'latest' estimates
pop_rows = list(csv.DictReader(open(f'{RES}/moe/extracted/population-by-prefecture.csv')))
latest_sum = sum(int(r['latest_estimate']) for r in pop_rows)
latest_sum_black = sum(int(r['latest_estimate']) for r in pop_rows if r['prefecture'] != 'Hokkaido')
latest_years = sorted(int(r['latest_year']) for r in pop_rows)
mid_sum = sum(int(r['2010s_estimate']) for r in pop_rows if r['2010s_estimate'])
mid_n = sum(1 for r in pop_rows if r['2010s_estimate'])
mid_years = sorted(int(r['2010s_year']) for r in pop_rows if r['2010s_year'])

# ---- 6. Secondary figures, typed from britannica-wb.html text (read above in this session)
brit = {'pop_2012': 15000, 'pop_2025': 54000, 'lic_1975': 518000, 'lic_2020': 218500,
        'inj_2023': 213, 'inj_2025_approx': 220, 'deaths_2025': 13}
# Secondary figure on the live page (webapp/index.html line 195): hunters >70,000 (1970s) -> <20,000
page = {'hunters_1970s': 70000, 'hunters_now': 20000}

print('=== A. Licence holders (MoE syubetu.pdf, rounded to 100) vs exact R3-02.xlsx')
for y in sorted(lic):
    ex = lic_exact.get(y)
    print(f'{y}: total={lic[y]:>8,}  rifle(第1種)={rifle[y]:>8,}' + (f'  exact={ex:,} diff={lic[y]-ex:+d}' if ex else ''))

print('\n=== B. Captures: held capture-qe (許可捕獲 total) vs hokakusuu その他 (rounded to 100)')
for y in range(2008, 2021):
    print(f'{y}: held={cap[y]:>6,}  hokakusuu_other={other[y]:>6,}  hunting={hunt[y]}  diff(held-other)={cap[y]-other[y]:+d}')

print('\n=== C. Population sums from 2026 draft guideline table II-2')
print(f'sum latest (all rows incl. Hokkaido brown bear) = {latest_sum:,}; black bear only = {latest_sum_black:,}')
print(f'latest survey years span {latest_years[0]}-{latest_years[-1]}; distribution = {dict((y, latest_years.count(y)) for y in sorted(set(latest_years)))}')
print(f'sum of 2010s column ({mid_n} rows only, years {mid_years[0]}-{mid_years[-1]}) = {mid_sum:,}')

print('\n=== C2. Per-prefecture growth where both a pre-2010 and a latest estimate exist (same table)')
for r in pop_rows:
    if r['pre2010_estimate']:
        a, b = int(r['pre2010_estimate']), int(r['latest_estimate'])
        print(f"{r['prefecture']:<45} {a:>6,} ({r['pre2010_year']}) -> {b:>6,} ({r['latest_year']})  x{b/a:.1f}")

print('\n=== D. Secondary vs primary')
print(f'Britannica pop 2025 = {brit["pop_2025"]:,} vs guideline latest sum {latest_sum:,} -> diff {latest_sum-brit["pop_2025"]:+,} ({(latest_sum/brit["pop_2025"]-1)*100:+.1f}%)')
print(f'Britannica pop 2012 = {brit["pop_2012"]:,} vs 2012 MoE manual 15,000-20,000 black bear (+~3,000 brown) -> combined 18,000-23,000')
print(f'Britannica licences 1975 = {brit["lic_1975"]:,} vs MoE 1975 {lic[1975]:,} -> diff {lic[1975]-brit["lic_1975"]:+,}')
print(f'Britannica licences 2020 = {brit["lic_2020"]:,} vs MoE 2020 {lic[2020]:,} (exact {lic_exact[2020]:,}) -> diff {lic[2020]-brit["lic_2020"]:+,}')
print(f'Britannica injuries 2023 = {brit["inj_2023"]} vs MoE FY2023 {inj[2023]} -> diff {inj[2023]-brit["inj_2023"]:+d}')
print(f'Britannica injuries 2025 ~{brit["inj_2025_approx"]} (Nov 2025 article) vs MoE FY2025 final {inj[2025]}; deaths {brit["deaths_2025"]} vs {dth[2025]}')
print(f'Page claim hunters 1970s >{page["hunters_1970s"]:,} vs MoE 1975 {lic[1975]:,} (ratio {lic[1975]/page["hunters_1970s"]:.1f}x)')
print(f'Page claim hunters now <{page["hunters_now"]:,} vs MoE 2021 {lic[2021]:,} (ratio {lic[2021]/page["hunters_now"]:.1f}x); rifle-only 2021 {rifle[2021]:,}')
print(f'Licence decline 1975->2021: {lic[1975]:,} -> {lic[2021]:,} = {(1-lic[2021]/lic[1975])*100:.0f}% fall; rifle {rifle[1975]:,} -> {rifle[2021]:,} = {(1-rifle[2021]/rifle[1975])*100:.0f}% fall')

print('\n=== E. Combined table by year')
hdr = 'year | pop_est | licences | captures_held | captures_hokakusuu_other | sightings | injuries | deaths'
print(hdr)
pop_pts = {2006: '16,000 (black, MoE internal; via 2012 manual)', 2012: '15,000-20,000 black + ~3,000 brown (MoE-funded manual); Britannica 15,000',
           2025: f'Britannica 54,000 (combined)', 2026: f'{latest_sum:,} = sum of latest per-pref (surveys 2020-24), draft guideline Feb 2026'}
for y in range(1975, 2027):
    cells = [str(y), pop_pts.get(y, ''), f'{lic[y]:,}' if y in lic else '', f'{cap[y]:,}' if y in cap else '',
             f'{other[y]:,}' if y in other else '', f'{sgt[y]:,}' if y in sgt else '',
             str(inj.get(y, '')), str(dth.get(y, ''))]
    if any(cells[1:]): print(' | '.join(cells))
```

## Output

```text
=== A. Licence holders (MoE syubetu.pdf, rounded to 100) vs exact R3-02.xlsx
1975: total= 517,800  rifle(第1種)= 493,700
1980: total= 460,800  rifle(第1種)= 427,100
1985: total= 326,300  rifle(第1種)= 297,000
1990: total= 289,500  rifle(第1種)= 258,100
1995: total= 246,000  rifle(第1種)= 208,600
2000: total= 210,200  rifle(第1種)= 170,500
2005: total= 203,600  rifle(第1種)= 152,800
2006: total= 186,700  rifle(第1種)= 135,300
2007: total= 228,900  rifle(第1種)= 136,000
2008: total= 221,500  rifle(第1種)= 135,400
2009: total= 185,900  rifle(第1種)= 117,500
2010: total= 190,200  rifle(第1種)= 116,500
2011: total= 198,400  rifle(第1種)= 116,100
2012: total= 180,700  rifle(第1種)=  96,200
2013: total= 185,300  rifle(第1種)=  96,400
2014: total= 193,800  rifle(第1種)=  98,000
2015: total= 190,100  rifle(第1種)=  88,600
2016: total= 196,500  rifle(第1種)=  88,900
2017: total= 209,600  rifle(第1種)=  93,700
2018: total= 207,300  rifle(第1種)=  88,000
2019: total= 215,400  rifle(第1種)=  90,000  exact=215,417 diff=-17
2020: total= 218,500  rifle(第1種)=  90,000  exact=218,493 diff=+7
2021: total= 213,400  rifle(第1種)=  84,400  exact=213,370 diff=+30

=== B. Captures: held capture-qe (許可捕獲 total) vs hokakusuu その他 (rounded to 100)
2008: held= 1,492  hokakusuu_other= 1,400  hunting=600  diff(held-other)=+92
2009: held= 1,717  hokakusuu_other= 1,500  hunting=400  diff(held-other)=+217
2010: held= 4,015  hokakusuu_other= 4,000  hunting=400  diff(held-other)=+15
2011: held= 1,800  hokakusuu_other= 1,800  hunting=500  diff(held-other)=+0
2012: held= 3,369  hokakusuu_other= 3,300  hunting=400  diff(held-other)=+69
2013: held= 1,859  hokakusuu_other= 1,900  hunting=500  diff(held-other)=-41
2014: held= 4,167  hokakusuu_other= 4,100  hunting=400  diff(held-other)=+67
2015: held= 1,950  hokakusuu_other= 1,900  hunting=400  diff(held-other)=+50
2016: held= 3,786  hokakusuu_other= 3,800  hunting=400  diff(held-other)=-14
2017: held= 3,953  hokakusuu_other= 3,900  hunting=500  diff(held-other)=+53
2018: held= 3,586  hokakusuu_other= 3,600  hunting=400  diff(held-other)=-14
2019: held= 6,281  hokakusuu_other= 6,300  hunting=None  diff(held-other)=-19
2020: held= 7,248  hokakusuu_other= 7,200  hunting=None  diff(held-other)=+48

=== C. Population sums from 2026 draft guideline table II-2
sum latest (all rows incl. Hokkaido brown bear) = 57,308; black bear only = 45,708
latest survey years span 2020-2024; distribution = {2020: 8, 2021: 3, 2022: 2, 2023: 3, 2024: 9}
sum of 2010s column (19 rows only, years 2012-2019) = 40,449

=== C2. Per-prefecture growth where both a pre-2010 and a latest estimate exist (same table)
Hokkaido                                       5,400 (1991) -> 11,600 (2023)  x2.1
Iwate                                          1,100 (2006) ->  3,700 (2020)  x3.4
Miyagi                                           633 (2008) ->  3,147 (2020)  x5.0
Akita                                          1,052 (2010) ->  2,900 (2024)  x2.8
Yamagata                                       1,500 (2007) ->  2,300 (2021)  x1.5
Tochigi                                          338 (2004) ->    961 (2024)  x2.8
Niigata                                        1,080 (2010) ->  1,118 (2023)  x1.0
Toyama                                           740 (2008) ->  1,449 (2024)  x2.0
Ishikawa                                         560 (1995) ->  1,201 (2021)  x2.1
Fukui                                            850 (2009) ->  1,217 (2024)  x1.4
Yamanashi                                        400 (2000) ->    527 (2020)  x1.3
Nagano                                         2,770 (2007) ->  7,270 (2020)  x2.6
Gifu                                           1,519 (2006) ->  3,717 (2022)  x2.4
Kyoto                                            300 (2005) ->  1,639 (2020)  x5.5
Nishi_Chugoku(Shimane/Hiroshima/Yamaguchi)       480 (1999) ->  1,307 (2020)  x2.7
Kii_Peninsula(Nara/Wakayama/Mie)                 180 (1998) ->    467 (2024)  x2.6

=== D. Secondary vs primary
Britannica pop 2025 = 54,000 vs guideline latest sum 57,308 -> diff +3,308 (+6.1%)
Britannica pop 2012 = 15,000 vs 2012 MoE manual 15,000-20,000 black bear (+~3,000 brown) -> combined 18,000-23,000
Britannica licences 1975 = 518,000 vs MoE 1975 517,800 -> diff -200
Britannica licences 2020 = 218,500 vs MoE 2020 218,500 (exact 218,493) -> diff +0
Britannica injuries 2023 = 213 vs MoE FY2023 219 -> diff +6
Britannica injuries 2025 ~220 (Nov 2025 article) vs MoE FY2025 final 238; deaths 13 vs 13
Page claim hunters 1970s >70,000 vs MoE 1975 517,800 (ratio 7.4x)
Page claim hunters now <20,000 vs MoE 2021 213,400 (ratio 10.7x); rifle-only 2021 84,400
Licence decline 1975->2021: 517,800 -> 213,400 = 59% fall; rifle 493,700 -> 84,400 = 83% fall

=== E. Combined table by year
year | pop_est | licences | captures_held | captures_hokakusuu_other | sightings | injuries | deaths
1975 |  | 517,800 |  | 1,700 |  |  | 
1980 |  | 460,800 |  | 1,300 |  |  | 
1985 |  | 326,300 |  | 1,500 |  |  | 
1990 |  | 289,500 |  | 700 |  |  | 
1995 |  | 246,000 |  | 800 |  |  | 
2000 |  | 210,200 |  | 1,200 |  |  | 
2001 |  |  |  | 2,000 |  |  | 
2002 |  |  |  | 1,200 |  |  | 
2003 |  |  |  | 1,600 |  |  | 
2004 |  |  |  | 2,500 |  |  | 
2005 |  | 203,600 |  | 1,100 |  |  | 
2006 | 16,000 (black, MoE internal; via 2012 manual) | 186,700 |  | 4,800 |  |  | 
2007 |  | 228,900 |  | 1,300 |  |  | 
2008 |  | 221,500 | 1,492 | 1,400 |  | 55 | 3
2009 |  | 185,900 | 1,717 | 1,500 |  | 64 | 2
2010 |  | 190,200 | 4,015 | 4,000 |  | 150 | 4
2011 |  | 198,400 | 1,800 | 1,800 |  | 81 | 2
2012 | 15,000-20,000 black + ~3,000 brown (MoE-funded manual); Britannica 15,000 | 180,700 | 3,369 | 3,300 |  | 77 | 1
2013 |  | 185,300 | 1,859 | 1,900 |  | 56 | 2
2014 |  | 193,800 | 4,167 | 4,100 |  | 122 | 2
2015 |  | 190,100 | 1,950 | 1,900 |  | 56 | 0
2016 |  | 196,500 | 3,786 | 3,800 |  | 105 | 4
2017 |  | 209,600 | 3,953 | 3,900 |  | 108 | 2
2018 |  | 207,300 | 3,586 | 3,600 |  | 53 | 0
2019 |  | 215,400 | 6,281 | 6,300 |  | 157 | 1
2020 |  | 218,500 | 7,248 | 7,200 |  | 158 | 2
2021 |  | 213,400 | 4,485 |  |  | 88 | 5
2022 |  |  | 3,875 |  | 11,136 | 75 | 2
2023 |  |  | 9,271 |  | 24,348 | 219 | 6
2024 |  |  | 5,345 |  | 20,513 | 85 | 3
2025 | Britannica 54,000 (combined) |  | 14,741 |  | 50,801 | 238 | 13
2026 | 57,308 = sum of latest per-pref (surveys 2020-24), draft guideline Feb 2026 |  | 2,136 |  | 12,628 | 53 | 6
```
