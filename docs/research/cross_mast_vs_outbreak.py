"""Beech mast index vs autumn bear outbreaks, FY2012-FY2026, on primary survey categories only.

Run from anywhere with data-pipeline/.venv/bin/python. No scipy in the venv, so Spearman rho and
the permutation p-value are plain Python. Every number printed is read from a file named here.

Inputs (all under /Users/fergus/Projects/bearstats):
  data-pipeline/research/mast/tohoku_forest_office_fruiting_actual.csv      (Tohoku office, autumn, FY2012-FY2025)
  data-pipeline/research/mast/tohoku_forest_office_flowering_forecast.csv   (Tohoku office, July, FY2012-FY2026)
  data-pipeline/research/mast/toyama_mast_2015_2026.csv                     (Toyama, Aug/Sep, 2015-2026)
  data-pipeline/research/mast/env_ketujitu_by_prefecture_species_fy2017_fy2023.csv  (MoE table, FY2013-FY2023)
  data-pipeline/research/mast/akita_buna_2002_2025.csv, akita_2026_forecast.csv    (Akita five sites)
  data-pipeline/research/mast/miyagi_mast_index_1998_2025.csv               (Miyagi chart of the office's Miyagi points)
  data-pipeline/research/mast/niigata_buna_forecast_r8.csv                  (Niigata July 2026 速報)
  data-pipeline/research/mast/fukushima_r4_r8.csv                           (Fukushima xlsx)
  data-pipeline/research/moe/sightings-by-prefecture-by-month-by-fy.csv     (MoE sightings, prefecture x month, FY2013-FY2026)
  data-pipeline/research/moe/injuries_monthly_fy2014_fy2026.csv             (MoE injuries, national monthly)
"""
import csv, random, statistics
from collections import defaultdict, Counter

ROOT = '/Users/fergus/Projects/bearstats'
MAST = f'{ROOT}/data-pipeline/research/mast'
MOE = f'{ROOT}/data-pipeline/research/moe'
PREFS = ['青森県', '岩手県', '宮城県', '秋田県', '山形県']
SHORT = {p: p[:-1] for p in PREFS}
FAIL = {'皆無', '大凶作', '凶作'}          # office classes below 2.0; Toyama 凶作/不作
GOOD = {'並作', '豊作'}
ORD = {'皆無': 0, '大凶作': 0, '凶作': 1, '並作': 2, '豊作': 3}   # 皆無 renamed 大凶作 from FY2017 (buna-13.pdf footnote)

def rd(path):
    return list(csv.DictReader(open(path, encoding='utf-8')))

# ---------- Spearman with average ranks, permutation p ----------
def ranks(v):
    order = sorted(range(len(v)), key=lambda i: v[i]); r = [0.0] * len(v); i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and v[order[j + 1]] == v[order[i]]:
            j += 1
        for k in range(i, j + 1):
            r[order[k]] = (i + j) / 2 + 1
        i = j + 1
    return r

def pearson(x, y):
    mx, my = statistics.mean(x), statistics.mean(y)
    sxx = sum((a - mx) ** 2 for a in x); syy = sum((b - my) ** 2 for b in y)
    return sum((a - mx) * (b - my) for a, b in zip(x, y)) / (sxx * syy) ** 0.5

def spearman(x, y, n_perm=20000, seed=1):
    rx, ry = ranks(x), ranks(y); rho = pearson(rx, ry)
    rng = random.Random(seed); hits = 0; ry2 = ry[:]
    for _ in range(n_perm):
        rng.shuffle(ry2)
        if abs(pearson(rx, ry2)) >= abs(rho) - 1e-12:
            hits += 1
    return rho, hits / n_perm

# ---------- Load ----------
act = defaultdict(dict); fc = defaultdict(dict)
for r in rd(f'{MAST}/tohoku_forest_office_fruiting_actual.csv'):
    act[int(r['fiscal_year'])][r['prefecture']] = (float(r['mast_index']), r['actual_category'], r['publish_date'])
for r in rd(f'{MAST}/tohoku_forest_office_flowering_forecast.csv'):
    fc[int(r['fiscal_year'])][r['prefecture']] = (float(r['mast_index']), r['forecast_category'], r['publish_date'])
assert sorted(act) == list(range(2012, 2026)) and sorted(fc) == list(range(2012, 2027))
assert all(len(act[y]) == 5 for y in act) and all(len(fc[y]) == 5 for y in fc)

sight = {}
for r in rd(f'{MOE}/sightings-by-prefecture-by-month-by-fy.csv'):
    sight[(r['prefecture'], int(r['fiscal_year']))] = r
def oct_(p, fy): return int(sight[(p, fy)]['10月'])
def octnov(p, fy): return int(sight[(p, fy)]['10月']) + int(sight[(p, fy)]['11月'])
def fytot(p, fy): return int(sight[(p, fy)]['合計'])

inj_fy = Counter(); inj_on = Counter(); dead_fy = Counter()
for r in rd(f'{MOE}/injuries_monthly_fy2014_fy2026.csv'):
    fy, m = int(r['fiscal_year']), int(r['month'])
    inj_fy[fy] += int(r['injured']); dead_fy[fy] += int(r['killed'])
    if m in (10, 11): inj_on[fy] += int(r['injured'])
# FY2013 annual injured and killed (the monthly file starts FY2014): webapp/data/national-timeline.json, MoE injury tables FY2008 on
import json
nt = json.load(open(f'{ROOT}/webapp/data/national-timeline.json'))
nt_inj = dict(zip(nt['years_injuries'], nt['metrics']['injuries'])); nt_dead = dict(zip(nt['years_injuries'], nt['metrics']['deaths']))
for y in range(2014, 2026): assert inj_fy[y] == nt_inj[y] and dead_fy[y] == nt_dead[y], y
inj_fy[2013] = nt_inj[2013]; dead_fy[2013] = nt_dead[2013]

akita = {int(r['year']): [r[k] for k in ('hachimori', 'moriyoshizan', 'tazawako', 'higashinaruse', 'chokai')]
         for r in rd(f'{MAST}/akita_buna_2002_2025.csv')}
akita26 = {r['site']: r['forecast_2026'] for r in rd(f'{MAST}/akita_2026_forecast.csv')}
miyagi = {int(r['year']): r['buna_tohoku_forest_office'].replace('皆無(=大凶作)', '大凶作') for r in rd(f'{MAST}/miyagi_mast_index_1998_2025.csv')}
toyama = {}
for r in rd(f'{MAST}/toyama_mast_2015_2026.csv'):
    toyama[(int(r['year']), r['species'], r['region'])] = (r['category'], r['publish_date'])
niigata = {r['region']: (r['forecast'], r['publish_date'], r['survey_points']) for r in rd(f'{MAST}/niigata_buna_forecast_r8.csv')}
fuku = {(int(r['fiscal_year']), r['species'], r['survey_type']): r['overall'] for r in rd(f'{MAST}/fukushima_r4_r8.csv')}
ketu = {}
for r in rd(f'{MAST}/env_ketujitu_by_prefecture_species_fy2017_fy2023.csv'):
    if r['survey_type'] == 'fruiting':
        ketu[(r['prefecture'], r['species'], int(r['fiscal_year']))] = (r['category'] if r['status'] == 'value' else r['status'], r['text_clean'], r['category_rule'])

def mean_idx(fy): return statistics.mean(act[fy][p][0] for p in PREFS)
def cat_of(idx): return '豊作' if idx >= 3.5 else '並作' if idx >= 2.0 else '凶作' if idx >= 1.0 else '大凶作'

# ---------- Table 1 ----------
print('=== Table 1: Tohoku office autumn index by prefecture and year, with that prefecture\'s October and Oct+Nov sightings ===')
print('(index and category from tohoku_forest_office_fruiting_actual.csv; sightings from sightings-by-prefecture-by-month-by-fy.csv, FY2013 on; Akita five-site column from akita_buna_2002_2025.csv)')
hdr = '| FY | ' + ' | '.join(f'{SHORT[p]} index (cat) | {SHORT[p]} Oct | {SHORT[p]} Oct+Nov' for p in PREFS) + ' | 5-pref mean | Akita 5 sites |'
print(hdr); print('|' + '---|' * (2 + 3 * 5 + 1))
for fy in range(2012, 2026):
    cells = []
    for p in PREFS:
        idx, cat, _ = act[fy][p]
        s = SHORT[p]
        if fy >= 2013:
            cells += [f'{idx:.1f} ({cat})', f'{oct_(s, fy):,}', f'{octnov(s, fy):,}']
        else:
            cells += [f'{idx:.1f} ({cat})', 'n/a', 'n/a']
    print(f'| {fy} | ' + ' | '.join(cells) + f' | {mean_idx(fy):.2f} ({cat_of(mean_idx(fy))}) | {"".join(akita[fy])} |')

print('\nPer-prefecture Spearman rho, autumn index vs same prefecture October sightings, FY2013-FY2025 (n=13), permutation p (20,000 shuffles):')
for p in PREFS:
    ys = list(range(2013, 2026)); x = [act[y][p][0] for y in ys]
    r1, p1 = spearman(x, [oct_(SHORT[p], y) for y in ys]); r2, p2 = spearman(x, [octnov(SHORT[p], y) for y in ys])
    print(f'  {SHORT[p]}: Oct rho = {r1:+.2f} (p = {p1:.3f}); Oct+Nov rho = {r2:+.2f} (p = {p2:.3f})')

print('\nFive Tohoku prefectures as a share of national October sightings:', ', '.join(f'{y}: {sum(oct_(SHORT[p], y) for p in PREFS):,}/{oct_("計", y):,} = {sum(oct_(SHORT[p], y) for p in PREFS) / oct_("計", y):.0%}' for y in range(2013, 2026)))
print('\nMiyagi check: office Miyagi category (fruiting CSV) vs Miyagi chart category (miyagi_mast_index_1998_2025.csv), FY2012-FY2025:')
for fy in range(2012, 2026):
    a = act[fy]['宮城県'][1].replace('皆無', '大凶作'); b = miyagi[fy]
    if a != b: print(f'  MISMATCH FY{fy}: office release {act[fy]["宮城県"][1]} ({act[fy]["宮城県"][0]}) vs Miyagi chart {b}')
print('  (all other years agree)')

# ---------- Table 2 ----------
print('\n=== Table 2: national October sightings vs five-prefecture mean index, FY2013-FY2025 ===')
print('| FY | 5-pref mean index | Region class | Oct sightings (national) | Oct+Nov (national) | FY total | Oct+Nov share | Injured FY | Injured Oct+Nov | Killed FY | Akita+Iwate Oct | Akita+Iwate share of national Oct |')
print('|---|---|---|---|---|---|---|---|---|---|---|---|')
ys = list(range(2013, 2026))
for fy in ys:
    m = mean_idx(fy); ai = oct_('秋田', fy) + oct_('岩手', fy); n = oct_('計', fy)
    inj = f'{inj_fy[fy]}'; injon = f'{inj_on[fy]}' if fy >= 2014 else 'n/a'; d = f'{dead_fy[fy]}'
    print(f'| {fy} | {m:.2f} | {cat_of(m)} | {n:,} | {octnov("計", fy):,} | {fytot("計", fy):,} | {octnov("計", fy) / fytot("計", fy):.0%} | {inj} | {injon} | {d} | {ai:,} | {ai / n:.0%} |')
x = [mean_idx(y) for y in ys]
for label, yfun, yy in [('national Oct sightings', lambda y: oct_('計', y), ys), ('national Oct+Nov sightings', lambda y: octnov('計', y), ys),
                        ('Akita+Iwate Oct sightings', lambda y: oct_('秋田', y) + oct_('岩手', y), ys),
                        ('national FY injured', lambda y: inj_fy[y], ys), ('national Oct+Nov injured', lambda y: inj_on[y], ys[1:])]:
    xx = [mean_idx(y) for y in yy]; rho, pv = spearman(xx, [yfun(y) for y in yy])
    print(f'Spearman rho(5-pref mean index, {label}) = {rho:+.2f}, permutation p = {pv:.3f}, n = {len(yy)} (FY{yy[0]}-FY{yy[-1]})')
fail_yrs = [y for y in ys if mean_idx(y) < 1.0]; kyo = [y for y in ys if 1.0 <= mean_idx(y) < 2.0]; good_yrs = [y for y in ys if mean_idx(y) >= 2.0]
print(f'\nRegion class by 5-pref mean index: 大凶作 (<1.0) {fail_yrs}; 凶作 (1.0-2.0) {kyo}; 並作/豊作 (>=2.0) {good_yrs}')
for label, grp in [('mean <1.0', fail_yrs), ('mean 1.0-2.0', kyo), ('mean >=2.0', good_yrs)]:
    o = [oct_('計', y) for y in grp]; on = [octnov('計', y) for y in grp]; inj = [inj_fy[y] for y in grp]
    print(f'  {label} (n={len(grp)}): national Oct sightings median {statistics.median(o):,.0f} mean {statistics.mean(o):,.0f} range {min(o):,}-{max(o):,}; Oct+Nov median {statistics.median(on):,.0f}; FY injured median {statistics.median(inj):.0f} mean {statistics.mean(inj):.0f} (n={len(inj)})')
print('  Sorted national October sightings with region class:', sorted(((oct_('計', y), y, cat_of(mean_idx(y))) for y in ys), reverse=True))
print('  Sorted national FY injured with region class:', sorted(((inj_fy[y], y, cat_of(mean_idx(y))) for y in ys), reverse=True))
print('  Injured Oct+Nov as share of FY, by region class:', {lab: [f'{y}: {inj_on[y] / inj_fy[y]:.0%}' for y in grp if y >= 2014] for lab, grp in (('<1.0', fail_yrs), ('1.0-2.0', kyo), ('>=2.0', good_yrs))})

# ---------- Table 3 ----------
print('\n=== Table 3: July forecast vs autumn actual category, all prefecture-years FY2012-FY2025 ===')
pairs = [(fy, p, fc[fy][p], act[fy][p]) for fy in range(2012, 2026) for p in PREFS]
def norm(c): return '大凶作' if c == '皆無' else c
exact = sum(norm(f[1]) == norm(a[1]) for _, _, f, a in pairs)
within1 = sum(abs(ORD[f[1]] - ORD[a[1]]) <= 1 for _, _, f, a in pairs)
two = sum((f[1] in FAIL) == (a[1] in FAIL) for _, _, f, a in pairs)
worse = sum(ORD[a[1]] < ORD[f[1]] for _, _, f, a in pairs); better = sum(ORD[a[1]] > ORD[f[1]] for _, _, f, a in pairs)
mae = statistics.mean(abs(a[0] - f[0]) for _, _, f, a in pairs); bias = statistics.mean(a[0] - f[0] for _, _, f, a in pairs)
print(f'n = {len(pairs)} prefecture-years. Exact category match {exact}/{len(pairs)} = {exact / len(pairs):.0%}. Within one grade {within1}/{len(pairs)}. '
      f'Two-class (凶作 or worse vs 並作 or better) agreement {two}/{len(pairs)} = {two / len(pairs):.0%}. Actual worse than forecast {worse}, better {better}. '
      f'Mean |actual - forecast| index = {mae:.2f}; mean (actual - forecast) = {bias:+.2f}.')
print('Confusion (rows = forecast, cols = actual), 皆無 folded into 大凶作:')
cats = ['大凶作', '凶作', '並作', '豊作']; conf = Counter((norm(f[1]), norm(a[1])) for _, _, f, a in pairs)
print('| forecast \\ actual | ' + ' | '.join(cats) + ' |'); print('|---|' + '---|' * 4)
for c in cats: print(f'| {c} | ' + ' | '.join(str(conf[(c, d)]) for d in cats) + ' |')
print('Misses (forecast -> actual):')
for fy, p, f, a in pairs:
    if norm(f[1]) != norm(a[1]): print(f'  FY{fy} {SHORT[p]}: forecast {f[0]:.1f} {f[1]} -> actual {a[0]:.1f} {a[1]}')
fc_good_act_fail = [(fy, SHORT[p]) for fy, p, f, a in pairs if f[1] in GOOD and a[1] in FAIL]
fc_fail_act_good = [(fy, SHORT[p]) for fy, p, f, a in pairs if f[1] in FAIL and a[1] in GOOD]
print(f'Forecast 並作/豊作 but actual 凶作/大凶作: {len(fc_good_act_fail)} {fc_good_act_fail}')
print(f'Forecast 凶作/大凶作 but actual 並作/豊作: {len(fc_fail_act_good)} {fc_fail_act_good}')
fm = [statistics.mean(fc[y][p][0] for p in PREFS) for y in range(2012, 2026)]; am = [mean_idx(y) for y in range(2012, 2026)]
print(f'Five-prefecture mean, forecast vs actual, by year: ' + ', '.join(f'{y}: {f:.2f}->{a:.2f}' for y, f, a in zip(range(2012, 2026), fm, am)))
print(f'Spearman rho(mean forecast, mean actual) = {spearman(fm, am)[0]:+.2f}, n = 14')

# ---------- Table 4 ----------
print('\n=== Table 4: alternate bearing. For each prefecture, how often a 並作/豊作 autumn is followed by 凶作/大凶作 (office actual, FY2012-FY2025, 13 transitions) ===')
print('| Prefecture | 並作/豊作 years | followed by 凶作/大凶作 | followed by 並作/豊作 | 凶作/大凶作 years (excl. 2025) | followed by 凶作/大凶作 | followed by 並作/豊作 | 豊作 years | 豊作 followed by 大凶作 |')
print('|---|---|---|---|---|---|---|---|---|')
tot = Counter()
for p in PREFS:
    gy = [y for y in range(2012, 2025) if act[y][p][1] in GOOD]; g2f = [y for y in gy if act[y + 1][p][1] in FAIL]
    fy_ = [y for y in range(2012, 2025) if act[y][p][1] in FAIL]; f2f = [y for y in fy_ if act[y + 1][p][1] in FAIL]
    hy = [y for y in range(2012, 2025) if act[y][p][1] == '豊作']; h2f = [y for y in hy if norm(act[y + 1][p][1]) == '大凶作']
    tot['g'] += len(gy); tot['g2f'] += len(g2f); tot['f'] += len(fy_); tot['f2f'] += len(f2f); tot['h'] += len(hy); tot['h2f'] += len(h2f)
    print(f'| {SHORT[p]} | {len(gy)} {gy} | {len(g2f)} | {len(gy) - len(g2f)} {[y for y in gy if y not in g2f]} | {len(fy_)} | {len(f2f)} | {len(fy_) - len(f2f)} | {len(hy)} {hy} | {len(h2f)} |')
print(f'| all five | {tot["g"]} | {tot["g2f"]} ({tot["g2f"] / tot["g"]:.0%}) | {tot["g"] - tot["g2f"]} | {tot["f"]} | {tot["f2f"]} ({tot["f2f"] / tot["f"]:.0%}) | {tot["f"] - tot["f2f"]} | {tot["h"]} | {tot["h2f"]} |')
print('Miyagi points 1998-2025 (Miyagi chart, 27 transitions):', end=' ')
gy = [y for y in range(1998, 2025) if miyagi[y] in GOOD]; g2f = [y for y in gy if miyagi[y + 1] in FAIL]
fy_ = [y for y in range(1998, 2025) if miyagi[y] in FAIL]; f2f = [y for y in fy_ if miyagi[y + 1] in FAIL]
print(f'並作/豊作 {len(gy)} years, {len(g2f)} followed by 凶作/大凶作 ({[y for y in gy if y not in g2f]} not); 凶作/大凶作 {len(fy_)} years, {len(f2f)} followed by 凶作/大凶作')
print('Akita five sites 2002-2025 (any site ○ -> next year):', end=' ')
gy = [y for y in range(2002, 2025) if '○' in akita[y]]
print({y: ''.join(akita[y + 1]) for y in gy})
print('Toyama beech 2015-2025 (prefecture category, 2016 east/west only):', ' '.join(f'{y}:{toyama.get((y, "buna", "prefecture"), ("?",))[0] or toyama[(y, "buna", "east")][0] + "/" + toyama[(y, "buna", "west")][0]}' for y in range(2015, 2027)))

# ---------- Table 5 ----------
print('\n=== Table 5: 2026 forecasts next to 2025 and 2023 at the same point in the year ===')
print('| Survey (publisher, date basis) | 2023 | 2025 | 2026 |')
print('|---|---|---|---|')
for p in PREFS:
    c = [f'{fc[y][p][0]:.1f} {fc[y][p][1]} ({fc[y][p][2]})' for y in (2023, 2025, 2026)]
    print(f'| Tohoku office July flowering forecast, {SHORT[p]} | ' + ' | '.join(c) + ' |')
c = [f'{statistics.mean(fc[y][p][0] for p in PREFS):.2f}' for y in (2023, 2025, 2026)]
print('| Tohoku office July forecast, five-prefecture mean index | ' + ' | '.join(c) + ' |')
c = [f'{mean_idx(y):.2f}' for y in (2023, 2025)] + ['due Nov 2026']
print('| Tohoku office autumn actual, five-prefecture mean index | ' + ' | '.join(c) + ' |')
for sp, ja in (('buna', 'ブナ'), ('mizunara', 'ミズナラ'), ('konara', 'コナラ')):
    c = [f'{toyama[(y, sp, "prefecture")][0]} ({toyama[(y, sp, "prefecture")][1]})' for y in (2023, 2025, 2026)]
    print(f'| Toyama {ja}, prefecture, Aug survey published early Sep | ' + ' | '.join(c) + ' |')
print(f'| Niigata ブナ, July survey (189 points), published 2026-08-07 | not on disk | not on disk | {niigata["全体"][0]} prefecture-wide, all four regions {"/".join(niigata[r][0] for r in ("上越", "魚沼", "中越", "下越"))} |')
print(f'| Niigata ブナ autumn result, MoE ketujitu table | {ketu[("新潟", "ブナ", 2023)][1]} (MoE 2024-04-22) | not on disk | n/a |')
print(f'| Akita five-site forecast (prefecture, published Nov of prior year) | not on disk (actual {"".join(akita[2023])}) | not on disk (actual {"".join(akita[2025])}) | ' + ' '.join(akita26[s].split()[0] for s in ('hachimori', 'moriyoshizan', 'tazawako', 'higashinaruse', 'chokai')) + ' |')
print(f'| Fukushima ブナ flowering (prefecture xlsx) | {fuku[(2023, "buna", "flowering")]} | {fuku[(2025, "buna", "flowering")]} | {fuku[(2026, "buna", "flowering")]} |')
print(f'| Fukushima ブナ fruiting | {fuku[(2023, "buna", "fruiting")]} | {fuku[(2025, "buna", "fruiting")]} | due autumn |')
apr_jun = lambda fy: sum(int(sight[('計', fy)][m]) for m in ('4月', '5月', '6月'))
print(f'National Apr-Jun sightings: FY2023 {apr_jun(2023):,}, FY2025 {apr_jun(2025):,}, FY2026 {apr_jun(2026):,}')

# ---------- Table 6: MoE ketujitu, oak ----------
print('\n=== Table 6: MoE ketujitu table, beech and oak fruiting categories, FY2013-FY2023 (category column; raw text in brackets where it differs) ===')
kp = ['青森', '岩手', '宮城', '秋田', '山形', '福島', '新潟', '富山', '長野']
for sp in ('ブナ', 'ミズナラ', 'コナラ'):
    print(f'\n{sp}:'); print('| Pref | ' + ' | '.join(str(y) for y in range(2013, 2024)) + ' |'); print('|---|' + '---|' * 11)
    for p in kp:
        cells = []
        for y in range(2013, 2024):
            v = ketu.get((p, sp, y))
            if v is None: cells.append('n/a')
            elif v[0] in ('no_data', 'not_published', 'ambiguous'): cells.append('-')
            else: cells.append(v[0] if v[1] == v[0] else f'{v[0]} [{v[1]}]')
        print(f'| {p} | ' + ' | '.join(cells) + ' |')
print('\nMoE table, beech fruiting, count of the nine prefectures above graded 凶作/大凶作 vs 並作/豊作 (cells with a value), with the Tohoku office five-prefecture mean:')
for y in range(2013, 2024):
    vals = [ketu[(p, 'ブナ', y)][0] for p in kp if ketu.get((p, 'ブナ', y)) and ketu[(p, 'ブナ', y)][0] in ('大凶作', '凶作', '並作', '豊作')]
    bad = sum(v in ('大凶作', '凶作') for v in vals)
    print(f'  FY{y}: {bad} of {len(vals)} 凶作/大凶作; office mean {mean_idx(y):.2f} {cat_of(mean_idx(y))}; national Oct {oct_("計", y):,}')
print('\nOak in Akita and Iwate in the two beech-failure years with MoE data: ' + '; '.join(f'{p} {sp} FY2023 = {ketu[(p, sp, 2023)][1]}' for p in ('秋田', '岩手') for sp in ('ミズナラ', 'コナラ')))
print('Oak in FY2019 (Hokuriku outbreak year): ' + '; '.join(f'{p} {sp} = {ketu[(p, sp, 2019)][1]}' for p in ('新潟', '富山', '石川', '福井') for sp in ('ブナ', 'ミズナラ', 'コナラ')))
print('Tohoku office beech vs MoE beech, same prefecture-year, FY2013-FY2023 (two-class agreement):', end=' ')
agree = 0; n = 0; mis = []
for y in range(2013, 2024):
    for p in PREFS:
        v = ketu.get((SHORT[p], 'ブナ', y))
        if v and v[0] in ('大凶作', '凶作', '並作', '豊作'):
            n += 1; a = act[y][p][1] in FAIL; b = v[0] in ('大凶作', '凶作')
            if a == b: agree += 1
            else: mis.append(f'FY{y} {SHORT[p]} office {act[y][p][0]} {act[y][p][1]} vs MoE {v[1]}')
print(f'{agree}/{n}; disagreements: {mis}')
