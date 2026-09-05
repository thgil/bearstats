# Cross-check: beech mast index vs autumn bear outbreaks, FY2012 to FY2026, on primary survey data only

Rewritten 2026-09-05. Serves GOAL.md claim 5 ("Autumn surges follow failed beech/oak mast crops (2023, 2025)"), the alternate-bearing half of claim 6, and the "risk for the autumn ahead" panel. Every number below was printed by `cross_mast_vs_outbreak.py` (script and verbatim output at the end of this file) from a file on disk. Nothing is quoted from memory or from press reports.

What changed from the previous version of this file: the earlier version had the Tohoku Regional Forest Office index for three autumns only (FY2023 to FY2025) and classed FY2019 to FY2022 as failure or non-failure years from a six-point Miyagi proxy. That proxy classification is dropped. The office's own releases have now been extracted for every year from FY2012 (`data-pipeline/research/mast/README.md`), so every category in this file is the publisher's own: the office's five-prefecture index and category, Toyama's four grades, the Ministry of the Environment's national table, Akita's five sites and Miyagi's chart of the office's Miyagi points. The failure-year means printed in the old version (11,788 vs 2,520 Oct+Nov sightings; 193 vs 83 injured) are withdrawn. The old version's "15 of 15 forecast matches" is withdrawn too; on 70 prefecture-years the exact match rate is 48 of 70.

## Sources actually read

| Series | File read | Origin | Coverage |
|---|---|---|---|
| Beech autumn result, numeric 豊凶指数 (0 to 5) and category, five Tohoku prefectures, 145 fixed points (135 to 145 reporting) | `data-pipeline/research/mast/tohoku_forest_office_fruiting_actual.csv` | 東北森林管理局 結実状況 press releases, `https://www.rinya.maff.go.jp/tohoku/sidou/attach/pdf/buna-NN.pdf` (FY2012 to FY2022) and `raw/research/mast/buna-r5..r7-fruiting.pdf` (FY2023 to FY2025); `source_url` and `publish_date` on every row | FY2012 to FY2025, 70 rows |
| Beech July flowering forecast, same office, same index | `data-pipeline/research/mast/tohoku_forest_office_flowering_forecast.csv` | 東北森林管理局 開花状況と結実予測 releases | FY2012 to FY2026, 75 rows |
| Office index definition and category thresholds | `data-pipeline/research/mast/README.md` | quoted from `buna-27.pdf` and `buna-46.pdf` | per point 5/3/1/0, prefecture index = weighted mean; 豊作 >= 3.5, 並作 2.0 to 3.5, 凶作 1.0 to 2.0, below 1.0 皆無 (to FY2016) or 大凶作 (from FY2017, same class) |
| Toyama beech, mizunara, konara, four grades (豊作/並作/不作/凶作), prefecture and east/west | `data-pipeline/research/mast/toyama_mast_2015_2026.csv` | 富山県森林研究所 yearly press releases, `https://www.pref.toyama.jp/documents/21689/` | 2015 to 2026, plus 2006 and 2010 restated in the 2020 release |
| MoE national mast table, prefecture by species, categorical | `data-pipeline/research/mast/env_ketujitu_by_prefecture_species_fy2017_fy2023.csv` | 環境省 堅果類の着花結実情報, seven editions (six Wayback captures plus the live 2024-04-22 file) | fruiting FY2013 to FY2023, 33 prefectures |
| Akita five-site beech result (○ 豊作, △ 並作, × 凶作) and 2026 forecast | `data-pipeline/research/mast/akita_buna_2002_2025.csv`, `akita_2026_forecast.csv` | 秋田県, from `raw/research/mast/akita-buna-mizunara-2002-2025.pdf` and `akita-buna-2026-forecast.pdf` | 2002 to 2025; forecast 2026 |
| Miyagi chart of the office's Miyagi points, five classes | `data-pipeline/research/mast/miyagi_mast_index_1998_2025.csv` | 宮城県, from `raw/research/mast/miyagi-r7graph_2.pdf` | 1998 to 2025 |
| Niigata July 2026 beech survey (速報) | `data-pipeline/research/mast/niigata_buna_forecast_r8.csv` | 新潟県, `raw/research/mast/niigata-r8-kekka-sokuho.pdf`, 2026-08-07 | 2026 only |
| Fukushima beech, mizunara, konara flowering and fruiting | `data-pipeline/research/mast/fukushima_r4_r8.csv` | 福島県 xlsx | FY2022 to FY2026 (FY2026 flowering only) |
| Sightings by prefecture by month | `data-pipeline/research/moe/sightings-by-prefecture-by-month-by-fy.csv` | 環境省 syutubotu.pdf, live 2026-08-06 edition plus Wayback editions 2016-12-23, 2021-04-18, 2022-06-30 | FY2013 to FY2026 (FY2026 to June) |
| Injured (victims) and killed, national monthly | `data-pipeline/research/moe/injuries_monthly_fy2014_fy2026.csv`; FY2013 annual from `webapp/data/national-timeline.json` | 環境省 injury-qe PDFs | FY2014 to FY2026 monthly; FY2008 on annual |

Not used: `yamagata_buna_h15_r7.csv` (column alignment unverified, see `data-sources.md` 3.4) and any newspaper report.

Two source inconsistencies met on the way, both kept as printed by the primary and flagged:

1. FY2012 Miyagi. The office's own release (`buna-45.pdf`, dated 2012-11-21, re-read from the rendered page today: 1/2/2/1 of 6 points, index 2.2, 並作, and the body text says 「宮城県以外の4県では「皆無」」) grades Miyagi 並作. Miyagi's chart of the same points says 皆無. The office's release is used. All other years FY2013 to FY2025 agree between the two files.
2. FY2014 Aomori index prints as 0.8 but its point counts give 0.68, and the office's later summary tables say 0.7 (README item 1). Category is 皆無 either way and nothing here depends on the decimal.

## Table 1: Tohoku office autumn index by prefecture and year, next to that prefecture's October and Oct+Nov sightings

Index and category as printed by the office (皆無 and 大凶作 are the same class, below 1.0). The five-prefecture mean is the plain mean of the five printed indices and its class uses the office's thresholds. Sightings are the MoE monthly table; there is no prefecture table for FY2012.

1a. Index (category):

| FY | 青森 | 岩手 | 宮城 | 秋田 | 山形 | 5-pref mean (class) | Akita 5 sites |
|---|---|---|---|---|---|---|---|
| 2012 | 0.4 (皆無) | 0.04 (皆無) | 2.2 (並作) | 0.7 (皆無) | 0.2 (皆無) | 0.71 (大凶作) | ××××× |
| 2013 | 3.4 (並作) | 3.8 (豊作) | 5.0 (豊作) | 2.9 (並作) | 2.3 (並作) | 3.48 (並作) | ×○△○× |
| 2014 | 0.8 (皆無) | 0.2 (皆無) | 0.7 (皆無) | 0.4 (皆無) | 0.2 (皆無) | 0.46 (大凶作) | ××××× |
| 2015 | 2.0 (並作) | 4.2 (豊作) | 3.4 (並作) | 1.8 (凶作) | 3.5 (豊作) | 2.98 (並作) | ×○△○△ |
| 2016 | 0.5 (皆無) | 0.045 (皆無) | 0.0 (皆無) | 0.1 (皆無) | 0.1 (皆無) | 0.15 (大凶作) | ××××× |
| 2017 | 1.2 (凶作) | 1.2 (凶作) | 0.7 (大凶作) | 0.7 (大凶作) | 0.4 (大凶作) | 0.84 (大凶作) | ×△××× |
| 2018 | 1.2 (凶作) | 1.8 (凶作) | 2.5 (並作) | 1.7 (凶作) | 3.9 (豊作) | 2.22 (並作) | ×××○○ |
| 2019 | 0.6 (大凶作) | 0.1 (大凶作) | 0.3 (大凶作) | 0.2 (大凶作) | 0.0 (大凶作) | 0.24 (大凶作) | ××××× |
| 2020 | 2.3 (並作) | 1.3 (凶作) | 0.7 (大凶作) | 2.0 (並作) | 0.3 (大凶作) | 1.32 (凶作) | △△××× |
| 2021 | 1.0 (凶作) | 0.7 (大凶作) | 1.7 (凶作) | 0.2 (大凶作) | 1.5 (凶作) | 1.02 (凶作) | ××××× |
| 2022 | 2.9 (並作) | 2.7 (並作) | 1.3 (凶作) | 2.8 (並作) | 3.1 (並作) | 2.56 (並作) | ×○○○○ |
| 2023 | 0.1 (大凶作) | 0.0 (大凶作) | 0.0 (大凶作) | 0.1 (大凶作) | 0.1 (大凶作) | 0.06 (大凶作) | ××××× |
| 2024 | 3.8 (豊作) | 2.7 (並作) | 4.2 (豊作) | 2.6 (並作) | 2.9 (並作) | 3.24 (並作) | ○○○△△ |
| 2025 | 0.2 (大凶作) | 0.1 (大凶作) | 0.2 (大凶作) | 0.0 (大凶作) | 0.0 (大凶作) | 0.10 (大凶作) | ××××× |

1b. Sightings, October / October plus November, same prefecture:

| FY | 青森 | 岩手 | 宮城 | 秋田 | 山形 | Five Tohoku as share of national Oct | National Oct / Oct+Nov |
|---|---|---|---|---|---|---|---|
| 2013 | 10 / 13 | 67 / 110 | 13 / 20 | 16 / 23 | 6 / 10 | 18% | 615 / 1,154 |
| 2014 | 8 / 14 | 91 / 127 | 30 / 54 | 12 / 16 | 28 / 40 | 7% | 2,546 / 3,946 |
| 2015 | 9 / 15 | 33 / 40 | 16 / 25 | 6 / 9 | 8 / 11 | 8% | 856 / 1,305 |
| 2016 | 22 / 24 | 98 / 176 | 204 / 380 | 28 / 36 | 30 / 40 | 15% | 2,589 / 4,444 |
| 2017 | 61 / 87 | 59 / 107 | 21 / 29 | 154 / 186 | 26 / 40 | 42% | 771 / 1,182 |
| 2018 | 14 / 17 | 69 / 115 | 53 / 90 | 14 / 19 | 15 / 27 | 23% | 727 / 1,393 |
| 2019 | 68 / 84 | 65 / 114 | 52 / 114 | 40 / 69 | 46 / 72 | 10% | 2,679 / 4,630 |
| 2020 | 15 / 21 | 275 / 420 | 216 / 396 | 116 / 159 | 261 / 352 | 21% | 4,213 / 6,501 |
| 2021 | 21 / 30 | 120 / 173 | 41 / 61 | 100 / 131 | 16 / 23 | 21% | 1,393 / 2,455 |
| 2022 | 12 / 17 | 51 / 89 | 30 / 38 | 11 / 15 | 11 / 17 | 11% | 1,026 / 1,588 |
| 2023 | 236 / 345 | 1,627 / 2,211 | 275 / 619 | 1,472 / 2,055 | 139 / 220 | 63% | 5,983 / 9,683 |
| 2024 | 21 / 41 | 105 / 184 | 48 / 63 | 37 / 100 | 5 / 7 | 10% | 2,235 / 3,518 |
| 2025 | 770 / 1,124 | 3,088 / 4,708 | 1,239 / 2,208 | 5,810 / 9,143 | 870 / 1,482 | 74% | 15,998 / 26,336 |

Per-prefecture Spearman rank correlation between the prefecture's own autumn index and its own October sightings, FY2013 to FY2025, n = 13, two-sided permutation p from 20,000 shuffles:

| Prefecture | rho, October | p | rho, Oct+Nov | p |
|---|---|---|---|---|
| 青森 | -0.61 | 0.030 | -0.54 | 0.056 |
| 岩手 | -0.57 | 0.045 | -0.61 | 0.028 |
| 宮城 | -0.68 | 0.011 | -0.72 | 0.006 |
| 秋田 | -0.55 | 0.051 | -0.52 | 0.070 |
| 山形 | -0.83 | 0.001 | -0.79 | 0.002 |

Reading Table 1:

- Every prefecture's sign is negative: a lower beech index goes with a higher October count, in each of the five prefectures separately.
- The two record autumns are the two region-wide 大凶作 years with the lowest means on file (0.06 and 0.10), and in those years the five Tohoku prefectures were 63% and 74% of the national October count.
- The earlier region-wide 大凶作 years (2014, 2016, 2019) produced national October counts of 2,546, 2,589 and 2,679, but the five Tohoku prefectures were only 7%, 15% and 10% of those. Those Octobers happened elsewhere (Table 6 shows beech failed across Hokuriku and Nagano in the same years). FY2017 was 大凶作 (0.84) and the national October was the fourth lowest in the series (771), though Akita's own October (154) was its highest before 2020.
- FY2020, classed in the old version as a failure year from the Miyagi proxy, was 並作 in Akita (2.0) and Aomori (2.3) by the office's own count; Iwate, Miyagi and Yamagata were 凶作 or 大凶作 and those three prefectures had their largest Octobers of the pre-2023 series (275, 216, 261). FY2021, classed in the old version as a non-failure year, was 大凶作 in Akita (0.2) and Iwate (0.7). So the proxy was wrong in both directions for Akita, which is why it is dropped.

## Table 2: national October sightings vs the five-prefecture mean index

| FY | 5-pref mean | Class | National Oct | National Oct+Nov | FY total | Oct+Nov share of FY | Injured FY | Injured Oct+Nov | Killed FY | Akita+Iwate Oct | Akita+Iwate share of national Oct |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2013 | 3.48 | 並作 | 615 | 1,154 | 9,133 | 13% | 56 | n/a | 2 | 83 | 13% |
| 2014 | 0.46 | 大凶作 | 2,546 | 3,946 | 15,981 | 25% | 122 | 39 | 2 | 103 | 4% |
| 2015 | 2.98 | 並作 | 856 | 1,305 | 9,597 | 14% | 56 | 6 | 0 | 39 | 5% |
| 2016 | 0.15 | 大凶作 | 2,589 | 4,444 | 18,116 | 25% | 105 | 39 | 4 | 126 | 5% |
| 2017 | 0.84 | 大凶作 | 771 | 1,182 | 12,812 | 9% | 108 | 23 | 2 | 213 | 28% |
| 2018 | 2.22 | 並作 | 727 | 1,393 | 12,809 | 11% | 53 | 6 | 0 | 83 | 11% |
| 2019 | 0.24 | 大凶作 | 2,679 | 4,630 | 18,317 | 25% | 157 | 69 | 1 | 105 | 4% |
| 2020 | 1.32 | 凶作 | 4,213 | 6,501 | 20,887 | 31% | 158 | 66 | 2 | 391 | 9% |
| 2021 | 1.02 | 凶作 | 1,393 | 2,455 | 12,766 | 19% | 88 | 18 | 5 | 220 | 16% |
| 2022 | 2.56 | 並作 | 1,026 | 1,588 | 11,136 | 14% | 75 | 6 | 2 | 62 | 6% |
| 2023 | 0.06 | 大凶作 | 5,983 | 9,683 | 24,348 | 40% | 219 | 103 | 6 | 3,099 | 52% |
| 2024 | 3.24 | 並作 | 2,235 | 3,518 | 20,513 | 17% | 85 | 14 | 3 | 142 | 6% |
| 2025 | 0.10 | 大凶作 | 15,998 | 26,336 | 50,801 | 52% | 238 | 122 | 13 | 8,898 | 56% |

Spearman rank correlations with the five-prefecture mean index (permutation p, 20,000 shuffles):

| Against | rho | p | n | Years |
|---|---|---|---|---|
| National October sightings | -0.74 | 0.004 | 13 | FY2013 to FY2025 |
| National Oct+Nov sightings | -0.74 | 0.005 | 13 | FY2013 to FY2025 |
| Akita plus Iwate October sightings | -0.62 | 0.026 | 13 | FY2013 to FY2025 |
| National injured, full fiscal year | -0.80 | 0.001 | 13 | FY2013 to FY2025 |
| National injured, Oct+Nov | -0.85 | 0.001 | 12 | FY2014 to FY2025 |

Grouping years by the class of the five-prefecture mean:

| Class of 5-pref mean | Years | National Oct sightings, median (range) | National Oct+Nov, median | Injured FY, median (mean) | Injured Oct+Nov as share of FY |
|---|---|---|---|---|---|
| 大凶作 (mean below 1.0) | 2014, 2016, 2017, 2019, 2023, 2025 | 2,634 (771 to 15,998) | 4,537 | 140 (158) | 32%, 37%, 21%, 44%, 47%, 51% |
| 凶作 (1.0 to 2.0) | 2020, 2021 | 2,803 (1,393 to 4,213) | 4,478 | 123 (123) | 42%, 20% |
| 並作 or 豊作 (2.0 and above) | 2013, 2015, 2018, 2022, 2024 | 856 (615 to 2,235) | 1,393 | 56 (65) | 11%, 11%, 8%, 16% (no monthly data for 2013) |

Ranked by October sightings, the six largest Octobers (2025, 2023, 2020, 2019, 2016, 2014) are all years whose five-prefecture mean was below 2.0, and the five 並作 years occupy ranks 7, 9, 10, 12 and 13. The one 大凶作 year that did not produce a large national October is 2017. Ranked by injured, the eight highest years are all mean-below-2.0 years and the five 並作 years are the five lowest.

The means are not a useful summary because 2025 is 2.7 times the next largest October; the medians are. A 並作 or 豊作 mean has never coincided with a national October above 2,235 in this series, and a mean below 1.0 has coincided with an October below 2,500 once (2017).

## Table 3: July forecast vs autumn actual category, all 70 prefecture-years FY2012 to FY2025

The office publishes a forecast category from the July flowering survey and the actual category from the autumn fruiting survey, both from the same points and the same index. 皆無 is folded into 大凶作.

| Forecast \ Actual | 大凶作 | 凶作 | 並作 | 豊作 |
|---|---|---|---|---|
| 大凶作 | 27 | 0 | 0 | 0 |
| 凶作 | 9 | 3 | 0 | 0 |
| 並作 | 0 | 6 | 12 | 1 |
| 豊作 | 0 | 2 | 4 | 6 |

- Exact category match: 48 of 70 (69%). Within one grade: 68 of 70. Two-class agreement (凶作 or worse versus 並作 or better): 62 of 70 (89%).
- The misses are one-directional. In 21 of the 22 misses the autumn came in worse than the July forecast; the one exception is FY2015 Yamagata (forecast 3.4 並作, actual 3.5 豊作). Mean actual minus forecast index is -0.48 over the 70 pairs; mean absolute difference 0.55.
- A forecast of 大凶作 has been followed by 大凶作 27 times out of 27. A forecast of 凶作 or 大凶作 has never been followed by 並作 or 豊作 (0 of 39).
- A forecast of 並作 or 豊作 has been followed by 凶作 8 times out of 31 (FY2015 秋田, FY2017 青森, FY2018 青森, 岩手, 秋田, FY2021 青森, 宮城, FY2022 宮城) and by 大凶作 0 times out of 31. The two worst slips were Miyagi, whose six points make its index the coarsest: FY2021 forecast 4.0 豊作 to actual 1.7 凶作, and FY2022 forecast 4.0 豊作 to actual 1.3 凶作.
- On the five-prefecture mean, forecast and actual by year: 2012 1.30 to 0.71; 2013 3.44 to 3.48; 2014 0.94 to 0.46; 2015 3.18 to 2.98; 2016 0.68 to 0.15; 2017 1.20 to 0.84; 2018 2.80 to 2.22; 2019 0.68 to 0.24; 2020 2.04 to 1.32; 2021 1.98 to 1.02; 2022 3.64 to 2.56; 2023 0.54 to 0.06; 2024 3.30 to 3.24; 2025 0.44 to 0.10. Spearman rho between the two means is +0.96 (n = 14). The mean has slipped from 並作 in July to 凶作 in autumn twice (2020, 2021) and has never slipped from 並作 or better to 大凶作.

What this means for the 2026 forecast (mean 3.90, the highest July mean in the 15 years on file): the record says the autumn will probably come in somewhat below the July figure, that a fall to 凶作 in one or two prefectures would be ordinary, and that a fall to region-wide 大凶作 has no precedent in 14 years.

## Table 4: alternate bearing. How often a 並作/豊作 autumn is followed by 凶作/大凶作 the next year

Office actual categories, FY2012 to FY2025, 13 year-to-year transitions per prefecture.

| Prefecture | 並作/豊作 years | Followed by 凶作/大凶作 | Followed by 並作/豊作 | 凶作/大凶作 years (to FY2024) | Followed by 凶作/大凶作 | Followed by 並作/豊作 | 豊作 years | 豊作 followed by 大凶作 |
|---|---|---|---|---|---|---|---|---|
| 青森 | 5 (2013, 2015, 2020, 2022, 2024) | 5 | 0 | 8 | 3 | 5 | 1 (2024) | 1 |
| 岩手 | 4 (2013, 2015, 2022, 2024) | 4 | 0 | 9 | 5 | 4 | 2 (2013, 2015) | 2 |
| 宮城 | 5 (2012, 2013, 2015, 2018, 2024) | 4 | 1 (2012, followed by 5.0 豊作 in 2013) | 8 | 5 | 3 | 2 (2013, 2024) | 2 |
| 秋田 | 4 (2013, 2020, 2022, 2024) | 4 | 0 | 9 | 5 | 4 | 0 | 0 |
| 山形 | 5 (2013, 2015, 2018, 2022, 2024) | 5 | 0 | 8 | 3 | 5 | 2 (2015, 2018) | 2 |
| All five | 23 | 22 (96%) | 1 | 42 | 21 (50%) | 21 | 7 | 7 |

- A 並作 or 豊作 autumn was followed by 凶作 or 大凶作 in 22 of 23 prefecture-years. The one exception is Miyagi FY2012 to FY2013, the year the office's release and Miyagi's chart disagree about (see the source note above). Every one of the seven 豊作 prefecture-years was followed by 大凶作.
- A 凶作 or 大凶作 autumn tells nothing about the next year: 21 of 42 were followed by another poor year and 21 by 並作 or 豊作.
- Longer or independent series say the same. Miyagi's chart of the office's Miyagi points, 1998 to 2025 (27 transitions): 7 of 8 並作/豊作 years were followed by 凶作/大凶作 (the exception is 2004 並作 to 2005 豊作), and 12 of 19 poor years were followed by another poor year. Akita's five sites, 2002 to 2025: every year with any site ○ (2005, 2013, 2015, 2018, 2022, 2024) was followed by × at all five sites. Toyama beech, prefecture category 2015 to 2026: 並作 2015, 凶作 east and 不作 west 2016, 不作 2017, 並作 2018, 凶作 2019, 凶作 2020, 並作 2021, 不作 2022, 不作 2023, 不作 2024, 凶作 2025, 豊作 2026. Toyama's three 並作 years (2015, 2018, 2021) were each followed by 不作 or 凶作.
- The consequence for the page: FY2024 was 並作 to 豊作 across Tohoku, so on this record a poor FY2025 crop was the expected outcome, and FY2026's forecast good crop after a 大凶作 year is the 50-50 branch coming up good. It also means that if autumn 2026 is 並作 or 豊作, autumn 2027 is very likely to be poor.

## Table 5: the 2026 forecast next to 2025 and 2023 at the same point in the year

| Survey | 2023 | 2025 | 2026 |
|---|---|---|---|
| Tohoku office July flowering forecast, 青森 | 0.5 大凶作 (2023-07-05) | 0.5 大凶作 (2025-07-11) | 3.4 並作 (2026-07-07) |
| Tohoku office July flowering forecast, 岩手 | 0.4 大凶作 | 0.6 大凶作 | 3.5 豊作 |
| Tohoku office July flowering forecast, 宮城 | 0.8 大凶作 | 0.3 大凶作 | 5.0 豊作 |
| Tohoku office July flowering forecast, 秋田 | 0.3 大凶作 | 0.4 大凶作 | 3.6 豊作 |
| Tohoku office July flowering forecast, 山形 | 0.7 大凶作 | 0.4 大凶作 | 4.0 豊作 |
| Tohoku office July forecast, five-prefecture mean | 0.54 | 0.44 | 3.90 |
| Tohoku office autumn actual, five-prefecture mean | 0.06 | 0.10 | due November 2026 |
| Toyama ブナ, prefecture, August survey published early September | 不作 (2023-09-06) | 凶作 (2025-09-04) | 豊作 (2026-09-04) |
| Toyama ミズナラ, same | 不作 | 不作 | 並作 |
| Toyama コナラ, same | 不作 | 不作 | 並作 |
| Niigata ブナ, July survey, 189 points, published 2026-08-07 | not on disk | not on disk | 豊作 prefecture-wide and in all four regions (上越, 魚沼, 中越, 下越) |
| Niigata ブナ autumn result, MoE table (a different date, shown for want of the July file) | 凶作 (MoE edition 2024-04-22) | not on disk | n/a |
| Akita five-site forecast (published November of the prior year) | forecast not on disk; actual ××××× | forecast not on disk; actual ××××× | ○ ○ △ ○ ○ (八森, 森吉山, 田沢湖, 東成瀬, 鳥海) |
| Fukushima ブナ flowering (prefecture xlsx) | 大凶作 | 大凶作 | 豊作 |
| Fukushima ブナ fruiting | 凶作 | 凶作 | due autumn |

For context, national April to June sightings were 5,691 in FY2023, 7,555 in FY2025 and 12,628 in FY2026 (same MoE table). The spring count is running far ahead of both record years while every mast indicator points the other way. The 2026 Toyama release is the first 豊作 for Toyama beech in the 2015 to 2026 series; the 2020 Toyama release restates 2006 and 2010, the prefecture's two earlier outbreak years, as 凶作 for beech.

## Table 6: MoE national table, beech and oak fruiting categories, FY2013 to FY2023

The Ministry's table compiles prefectural returns (for 青森 and part of 秋田 the return is the Tohoku office's). The four-bucket `category` column is shown; where the printed cell was a range or a phrase it is given in brackets (rules in `data-pipeline/research/mast/README.md`). A dash means no data or not published.

ブナ (beech):

| Pref | 2013 | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 青森 | 豊作 | 大凶作 [皆無] | - | - | 凶作 | 凶作 | 凶作 | 並作 | 凶作 | 並作 | 大凶作 |
| 岩手 | 豊作 | 凶作 | 豊作 | 凶作 [不作] | 凶作 [不作] | 並作 | 凶作 | 凶作 [不作] | 凶作 [不作] | 並作 | 凶作 [不作] |
| 宮城 | - | 凶作 | 豊作 | 凶作 | 凶作 | 豊作 | 凶作 | 凶作 | 並作 | 並作 | 凶作 |
| 秋田 | 豊作 [並作～豊作] | 凶作 | 豊作 | 凶作 | 凶作 | 並作 | 凶作 | 凶作 | 凶作 | 並作 | 凶作 |
| 山形 | 豊作 [並作～豊作] | 凶作 | 豊作 | 凶作 [ほとんどの箇所が凶作] | 凶作 | 並作 [並作の箇所が多い] | 凶作 | 凶作 | 凶作 | 並作 | 凶作 |
| 福島 | 豊作 | 豊作 [豊～大豊作] | 豊作 [豊～大豊作] | 凶作 | 凶作 | 豊作 | 凶作 | 凶作 | 並作 | 豊作 | 凶作 |
| 新潟 | 凶作 [凶作～不作] | 凶作 [凶作～不作] | 豊作 [並作～豊作] | 凶作 [凶作～不作] | 凶作 [凶作～不作] | 豊作 [並作～豊作] | 凶作 [凶作～不作] | 凶作 [凶作～不作] | 凶作 [凶作～不作] | 並作 | 凶作 |
| 富山 | 並作 [凶作～並作] | 凶作 | 並作 | 凶作 [不作] | 凶作 [不作] | 並作 | 凶作 | 凶作 | 並作 | 凶作 [不作] | 凶作 [不作（東部：凶作、西部：不作）] |
| 長野 | 凶作 [不作] | 凶作 | 豊作 [並作～豊作] | 凶作 [凶作～不作] | 凶作 [凶作～不作] | 並作 [大凶作～並作] | 凶作 [大凶作～不作] | 凶作 [大凶作～不作] | 並作 [大凶作～並作] | 並作 [大凶作～豊作] | 凶作 [凶作（大凶作～並作下）] |

ミズナラ (mizunara oak):

| Pref | 2013 | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 青森 | - | - | - | - | - | - | - | - | - | - | - |
| 岩手 | 凶作 | 並作 [凶作～並作] | 並作 [凶作～並作] | 凶作 [不作] | 凶作 [不作] | 凶作 [不作] | 凶作 | 凶作 [不作] | 凶作 [不作] | 凶作 [不作] | 凶作 |
| 宮城 | - | 凶作 | 豊作 | 凶作 | 豊作 | 凶作 | 並作 | 凶作 | 並作 | 並作 | 凶作 |
| 秋田 | 並作 [凶作～並作] | 凶作 | 凶作 | 凶作 | 凶作 | 豊作 | 凶作 | 凶作 | 凶作 | - | 凶作 |
| 山形 | 並作 [凶作～豊作] | 凶作 | 豊作 [並作～豊作] | 凶作 [凶作の箇所が多い] | 豊作 [並作～豊作] | 豊作 [豊作の箇所が多い] | 豊作 [並作～豊作] | 並作 [凶作～豊作] | 並作 [凶作～豊作] | 並作 [凶作～豊作] | 並作 [凶作～並作] |
| 福島 | 並作 | 並作 [凶作～並作] | 並作 [大凶～豊作] | 並作 | 豊作 | 並作 | 並作 | 並作 | 並作 | 並作 | 並作 |
| 新潟 | 並作 [不作～並作] | 凶作 [凶作～不作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 凶作 [凶作～不作] | 並作 | 凶作 [不作] |
| 富山 | 並作 [不作～並作] | 凶作 | 並作 | 凶作 [不作] | 凶作 [不作] | 並作 [不作～並作] | 凶作 [全県：凶作 東部：不作 西部：凶作] | 凶作 [不作] | 凶作 [不作] | 凶作 [不作] | 凶作 [不作（東部：不作、西部：不作）] |
| 長野 | 並作 [並下～並] | 並作 [不作～並作] | 並作 [並下～並上] | 並作 [凶作～並下] | 並作 [凶作～豊作] | 並作 [凶作～大豊作] | 並作 [大凶作～大豊作] | 並作 [大凶作～豊作] | 並作 [大凶作～豊作] | 並作 [大凶作～大豊作] | 並作 [並作下（凶作～並作上）] |

コナラ (konara oak):

| Pref | 2013 | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 青森 | - | - | - | - | - | - | - | - | - | - | - |
| 岩手 | 凶作 | 並作 [凶作～並作] | 並作 [凶作～並作] | 凶作 [不作] | 凶作 [不作] | 凶作 [不作] | 凶作 | 凶作 [不作] | 凶作 [不作] | 凶作 [不作] | 凶作 |
| 宮城 | - | - | - | - | - | - | - | - | - | - | - |
| 秋田 | 豊作 [並作～豊作] | 凶作 | 並作 | 凶作 | 凶作 | 並作 | 凶作 | 凶作 | - | - | 凶作 |
| 山形 | 並作 [凶作～豊作] | 並作 [凶作～豊作] | 豊作 [並作～豊作] | 凶作 [凶作の箇所が多い] | 豊作 [ほとんどの箇所が豊作] | 豊作 [豊作の箇所が多い] | 豊作 [並作～豊作] | 凶作 | 並作 [凶作～豊作] | 並作 [凶作～豊作] | 並作 [凶作～並作] |
| 福島 | 並作 | 並作 [凶作～並作] | 並作 [大凶～豊作] | 並作 | 並作 | 並作 | 並作 | 凶作 | 凶作 | 並作 | 並作 |
| 新潟 | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 凶作 [凶作～不作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 | 凶作 [不作] |
| 富山 | 凶作 [凶作～不作] | 並作 [不作～並作] | 凶作 [不作] | 凶作 [不作] | 並作 | 並作 [不作～並作] | 並作 [凶作～並作] | 凶作 [不作～凶作] | 凶作 [不作] | 並作 | 凶作 [不作（東部：並作、西部：不作）] |
| 長野 | 並作 [並下～並] | 並作 [不作～並作] | 並作 [並下～並上] | 並作 [並作～並上] | 並作 [不作～豊作] | 並作 [凶作～大豊作] | 並作 [大凶作～大豊作] | 並作 [大凶作～豊作] | 並作 [大凶作～大豊作] | 並作 [大凶作～大豊作] | 並作 [並作下（凶作～並作上）] |

Reading Table 6:

- Beech fails in step across Honshu. Counting the nine prefectures above, the number graded 凶作 or 大凶作 for beech was 2 of 8 (2013), 8 of 9 (2014), 0 of 8 (2015), 8 of 8 (2016), 9 of 9 (2017), 1 of 9 (2018), 9 of 9 (2019), 8 of 9 (2020), 5 of 9 (2021), 1 of 9 (2022), 9 of 9 (2023). That ordering matches the Tohoku office's five-prefecture mean year for year, which is why the Tohoku index tracks the national October count even in years when the Tohoku prefectures themselves were a small share of it (2014, 2016, 2019).
- The Tohoku office beech category and the MoE beech category for the same prefecture-year agree on the two-class split in 46 of 52 comparable cells. All six disagreements sit at office indices between 1.3 and 2.0, within a grade of the boundary; the widest gap is FY2015 Akita (office 1.8 凶作, MoE 豊作), where the MoE cell is the prefecture's own return rather than the office's.
- Oak in Akita and Iwate, the two prefectures that produced 52% of October 2023: FY2023 ミズナラ 凶作 and コナラ 凶作 in both. Iwate's mizunara and konara have been 凶作 or 不作 in every year since 2016; Akita's mizunara 凶作 in 8 of the 10 years with data (並作 in 2013, 豊作 in 2018). So the "acorn" half of claim 5 is on a primary footing for FY2023 in Akita and Iwate, and FY2025 oak is on a primary footing for Toyama (ミズナラ 不作, コナラ 不作) and Fukushima (both 凶作). No FY2025 oak category is on disk for Akita or Iwate; the MoE table on disk ends at FY2023.
- In FY2019, the Hokuriku outbreak year named in the MoE draft guideline, beech was 凶作 in Niigata, Toyama, Ishikawa, Fukui and Nagano and oak was 凶作 or 不作 in most of them (Niigata konara 凶作～不作, Toyama mizunara 凶作, Ishikawa mizunara 凶作, Fukui both), while the five Tohoku prefectures were 10% of the national October.

## What this supports and does not support

Supports:

- Claim 5's factual core, now on 13 years rather than three. The five-prefecture beech index and national October sightings are rank-correlated at rho = -0.74 (p = 0.004, n = 13), the index and full-year injuries at rho = -0.80 (p = 0.001, n = 13), and each prefecture's own index against its own October at rho -0.55 to -0.83. The six largest Octobers in the series are all years with a five-prefecture mean below 2.0, and no 並作 year has produced a national October above 2,235.
- The two record years were the two worst crops. FY2023 (mean 0.06) and FY2025 (mean 0.10) are the two lowest means in 14 years and the only two years in which the five Tohoku prefectures were more than half of the national October (63%, 74%).
- The oak half of claim 5 for FY2023 (Akita and Iwate ミズナラ and コナラ 凶作 in the MoE table) and for FY2025 in Toyama and Fukushima.
- The alternate-bearing half of claim 6. 22 of 23 並作/豊作 prefecture-years were followed by a poor year, and 7 of 7 豊作 years by 大凶作.
- The "risk for the autumn ahead" panel. The 2026 July mean of 3.90 is the highest in 15 years of forecasts; Toyama, Niigata, Akita and Fukushima all read 豊作 or 並作 on their own surveys; and in 39 prefecture-years a July forecast of 凶作 or worse has never turned into a good autumn, while in 31 prefecture-years a July forecast of 並作 or better has never turned into 大凶作 (it has turned into 凶作 8 times).

Does not support, or supports only in part:

- A numeric size-of-spike relationship. The index says which years spike, not how big. FY2023 and FY2025 sit at nearly identical index values (0.06 and 0.10) and Octobers of 5,983 and 15,998; FY2014, FY2016 and FY2019 sit at 0.46, 0.15 and 0.24 with Octobers of about 2,600; FY2017 at 0.84 had 771. Something other than the beech index (population, GOAL claim 7, or reporting) sets the amplitude, and the step from 2,600-class Octobers (2014 to 2019) to 6,000 and 16,000 (2023, 2025) at the same index values is the clearest sign of it.
- "Failure in Tohoku causes the surge." Before 2023 the surges happened mostly outside the five Tohoku prefectures even in region-wide 大凶作 years. The honest wording is that beech failure is Honshu-wide in the failure years (Table 6) and that from 2023 the response has been concentrated in Tohoku.
- The oak half for FY2025 in Akita and Iwate. No FY2025 oak category for those two prefectures is on disk. The MoE table's later editions, if published, would fill it.
- The forecast as a guarantee. 22 of 70 prefecture-years missed by one grade and the misses are almost all in the pessimistic direction. The 2026 panel should say "no precedent for a July 並作/豊作 forecast ending in 大凶作", not "the forecast has always been right".
- The FY2026 actual for anything. The office's fruiting release is due in November 2026; Toyama's September result is the only autumn-survey primary published so far.

Caveats on the data: FY2013 to FY2021 sightings come from Wayback copies of the MoE table, and FY2021's printed total (12,766) differs from the sum of its months (12,735) inside the MoE document; three of the office's PDFs (FY2012 both, FY2019 fruiting) are scanned images transcribed by eye and cross-checked against the office's later summary tables; Miyagi's six points make its index coarse; the office surveys beech only; the MoE table is compiled from returns made on different scales by different prefectures and its `category` column is a four-bucket normalisation of them.

## Code and output

Run with `data-pipeline/.venv/bin/python docs/research/cross_mast_vs_outbreak.py`. The script follows, then its verbatim output (also saved as `docs/research/cross-mast-vs-outbreak.out.txt`).

```python
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
```

Output:

```text
=== Table 1: Tohoku office autumn index by prefecture and year, with that prefecture's October and Oct+Nov sightings ===
(index and category from tohoku_forest_office_fruiting_actual.csv; sightings from sightings-by-prefecture-by-month-by-fy.csv, FY2013 on; Akita five-site column from akita_buna_2002_2025.csv)
| FY | 青森 index (cat) | 青森 Oct | 青森 Oct+Nov | 岩手 index (cat) | 岩手 Oct | 岩手 Oct+Nov | 宮城 index (cat) | 宮城 Oct | 宮城 Oct+Nov | 秋田 index (cat) | 秋田 Oct | 秋田 Oct+Nov | 山形 index (cat) | 山形 Oct | 山形 Oct+Nov | 5-pref mean | Akita 5 sites |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2012 | 0.4 (皆無) | n/a | n/a | 0.0 (皆無) | n/a | n/a | 2.2 (並作) | n/a | n/a | 0.7 (皆無) | n/a | n/a | 0.2 (皆無) | n/a | n/a | 0.71 (大凶作) | xxxxx |
| 2013 | 3.4 (並作) | 10 | 13 | 3.8 (豊作) | 67 | 110 | 5.0 (豊作) | 13 | 20 | 2.9 (並作) | 16 | 23 | 2.3 (並作) | 6 | 10 | 3.48 (並作) | x○△○x |
| 2014 | 0.8 (皆無) | 8 | 14 | 0.2 (皆無) | 91 | 127 | 0.7 (皆無) | 30 | 54 | 0.4 (皆無) | 12 | 16 | 0.2 (皆無) | 28 | 40 | 0.46 (大凶作) | xxxxx |
| 2015 | 2.0 (並作) | 9 | 15 | 4.2 (豊作) | 33 | 40 | 3.4 (並作) | 16 | 25 | 1.8 (凶作) | 6 | 9 | 3.5 (豊作) | 8 | 11 | 2.98 (並作) | x○△○△ |
| 2016 | 0.5 (皆無) | 22 | 24 | 0.0 (皆無) | 98 | 176 | 0.0 (皆無) | 204 | 380 | 0.1 (皆無) | 28 | 36 | 0.1 (皆無) | 30 | 40 | 0.15 (大凶作) | xxxxx |
| 2017 | 1.2 (凶作) | 61 | 87 | 1.2 (凶作) | 59 | 107 | 0.7 (大凶作) | 21 | 29 | 0.7 (大凶作) | 154 | 186 | 0.4 (大凶作) | 26 | 40 | 0.84 (大凶作) | x△xxx |
| 2018 | 1.2 (凶作) | 14 | 17 | 1.8 (凶作) | 69 | 115 | 2.5 (並作) | 53 | 90 | 1.7 (凶作) | 14 | 19 | 3.9 (豊作) | 15 | 27 | 2.22 (並作) | xxx○○ |
| 2019 | 0.6 (大凶作) | 68 | 84 | 0.1 (大凶作) | 65 | 114 | 0.3 (大凶作) | 52 | 114 | 0.2 (大凶作) | 40 | 69 | 0.0 (大凶作) | 46 | 72 | 0.24 (大凶作) | xxxxx |
| 2020 | 2.3 (並作) | 15 | 21 | 1.3 (凶作) | 275 | 420 | 0.7 (大凶作) | 216 | 396 | 2.0 (並作) | 116 | 159 | 0.3 (大凶作) | 261 | 352 | 1.32 (凶作) | △△xxx |
| 2021 | 1.0 (凶作) | 21 | 30 | 0.7 (大凶作) | 120 | 173 | 1.7 (凶作) | 41 | 61 | 0.2 (大凶作) | 100 | 131 | 1.5 (凶作) | 16 | 23 | 1.02 (凶作) | xxxxx |
| 2022 | 2.9 (並作) | 12 | 17 | 2.7 (並作) | 51 | 89 | 1.3 (凶作) | 30 | 38 | 2.8 (並作) | 11 | 15 | 3.1 (並作) | 11 | 17 | 2.56 (並作) | x○○○○ |
| 2023 | 0.1 (大凶作) | 236 | 345 | 0.0 (大凶作) | 1,627 | 2,211 | 0.0 (大凶作) | 275 | 619 | 0.1 (大凶作) | 1,472 | 2,055 | 0.1 (大凶作) | 139 | 220 | 0.06 (大凶作) | xxxxx |
| 2024 | 3.8 (豊作) | 21 | 41 | 2.7 (並作) | 105 | 184 | 4.2 (豊作) | 48 | 63 | 2.6 (並作) | 37 | 100 | 2.9 (並作) | 5 | 7 | 3.24 (並作) | ○○○△△ |
| 2025 | 0.2 (大凶作) | 770 | 1,124 | 0.1 (大凶作) | 3,088 | 4,708 | 0.2 (大凶作) | 1,239 | 2,208 | 0.0 (大凶作) | 5,810 | 9,143 | 0.0 (大凶作) | 870 | 1,482 | 0.10 (大凶作) | xxxxx |

Per-prefecture Spearman rho, autumn index vs same prefecture October sightings, FY2013-FY2025 (n=13), permutation p (20,000 shuffles):
  青森: Oct rho = -0.61 (p = 0.030); Oct+Nov rho = -0.54 (p = 0.056)
  岩手: Oct rho = -0.57 (p = 0.045); Oct+Nov rho = -0.61 (p = 0.028)
  宮城: Oct rho = -0.68 (p = 0.011); Oct+Nov rho = -0.72 (p = 0.006)
  秋田: Oct rho = -0.55 (p = 0.051); Oct+Nov rho = -0.52 (p = 0.070)
  山形: Oct rho = -0.83 (p = 0.001); Oct+Nov rho = -0.79 (p = 0.002)

Five Tohoku prefectures as a share of national October sightings: 2013: 112/615 = 18%, 2014: 169/2,546 = 7%, 2015: 72/856 = 8%, 2016: 382/2,589 = 15%, 2017: 321/771 = 42%, 2018: 165/727 = 23%, 2019: 271/2,679 = 10%, 2020: 883/4,213 = 21%, 2021: 298/1,393 = 21%, 2022: 115/1,026 = 11%, 2023: 3,749/5,983 = 63%, 2024: 216/2,235 = 10%, 2025: 11,777/15,998 = 74%

Miyagi check: office Miyagi category (fruiting CSV) vs Miyagi chart category (miyagi_mast_index_1998_2025.csv), FY2012-FY2025:
  MISMATCH FY2012: office release 並作 (2.2) vs Miyagi chart 大凶作
  (all other years agree)

=== Table 2: national October sightings vs five-prefecture mean index, FY2013-FY2025 ===
| FY | 5-pref mean index | Region class | Oct sightings (national) | Oct+Nov (national) | FY total | Oct+Nov share | Injured FY | Injured Oct+Nov | Killed FY | Akita+Iwate Oct | Akita+Iwate share of national Oct |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2013 | 3.48 | 並作 | 615 | 1,154 | 9,133 | 13% | 56 | n/a | 2 | 83 | 13% |
| 2014 | 0.46 | 大凶作 | 2,546 | 3,946 | 15,981 | 25% | 122 | 39 | 2 | 103 | 4% |
| 2015 | 2.98 | 並作 | 856 | 1,305 | 9,597 | 14% | 56 | 6 | 0 | 39 | 5% |
| 2016 | 0.15 | 大凶作 | 2,589 | 4,444 | 18,116 | 25% | 105 | 39 | 4 | 126 | 5% |
| 2017 | 0.84 | 大凶作 | 771 | 1,182 | 12,812 | 9% | 108 | 23 | 2 | 213 | 28% |
| 2018 | 2.22 | 並作 | 727 | 1,393 | 12,809 | 11% | 53 | 6 | 0 | 83 | 11% |
| 2019 | 0.24 | 大凶作 | 2,679 | 4,630 | 18,317 | 25% | 157 | 69 | 1 | 105 | 4% |
| 2020 | 1.32 | 凶作 | 4,213 | 6,501 | 20,887 | 31% | 158 | 66 | 2 | 391 | 9% |
| 2021 | 1.02 | 凶作 | 1,393 | 2,455 | 12,766 | 19% | 88 | 18 | 5 | 220 | 16% |
| 2022 | 2.56 | 並作 | 1,026 | 1,588 | 11,136 | 14% | 75 | 6 | 2 | 62 | 6% |
| 2023 | 0.06 | 大凶作 | 5,983 | 9,683 | 24,348 | 40% | 219 | 103 | 6 | 3,099 | 52% |
| 2024 | 3.24 | 並作 | 2,235 | 3,518 | 20,513 | 17% | 85 | 14 | 3 | 142 | 6% |
| 2025 | 0.10 | 大凶作 | 15,998 | 26,336 | 50,801 | 52% | 238 | 122 | 13 | 8,898 | 56% |
Spearman rho(5-pref mean index, national Oct sightings) = -0.74, permutation p = 0.004, n = 13 (FY2013-FY2025)
Spearman rho(5-pref mean index, national Oct+Nov sightings) = -0.74, permutation p = 0.005, n = 13 (FY2013-FY2025)
Spearman rho(5-pref mean index, Akita+Iwate Oct sightings) = -0.62, permutation p = 0.026, n = 13 (FY2013-FY2025)
Spearman rho(5-pref mean index, national FY injured) = -0.80, permutation p = 0.001, n = 13 (FY2013-FY2025)
Spearman rho(5-pref mean index, national Oct+Nov injured) = -0.85, permutation p = 0.001, n = 12 (FY2014-FY2025)

Region class by 5-pref mean index: 大凶作 (<1.0) [2014, 2016, 2017, 2019, 2023, 2025]; 凶作 (1.0-2.0) [2020, 2021]; 並作/豊作 (>=2.0) [2013, 2015, 2018, 2022, 2024]
  mean <1.0 (n=6): national Oct sightings median 2,634 mean 5,094 range 771-15,998; Oct+Nov median 4,537; FY injured median 140 mean 158 (n=6)
  mean 1.0-2.0 (n=2): national Oct sightings median 2,803 mean 2,803 range 1,393-4,213; Oct+Nov median 4,478; FY injured median 123 mean 123 (n=2)
  mean >=2.0 (n=5): national Oct sightings median 856 mean 1,092 range 615-2,235; Oct+Nov median 1,393; FY injured median 56 mean 65 (n=5)
  Sorted national October sightings with region class: [(15998, 2025, '大凶作'), (5983, 2023, '大凶作'), (4213, 2020, '凶作'), (2679, 2019, '大凶作'), (2589, 2016, '大凶作'), (2546, 2014, '大凶作'), (2235, 2024, '並作'), (1393, 2021, '凶作'), (1026, 2022, '並作'), (856, 2015, '並作'), (771, 2017, '大凶作'), (727, 2018, '並作'), (615, 2013, '並作')]
  Sorted national FY injured with region class: [(238, 2025, '大凶作'), (219, 2023, '大凶作'), (158, 2020, '凶作'), (157, 2019, '大凶作'), (122, 2014, '大凶作'), (108, 2017, '大凶作'), (105, 2016, '大凶作'), (88, 2021, '凶作'), (85, 2024, '並作'), (75, 2022, '並作'), (56, 2015, '並作'), (56, 2013, '並作'), (53, 2018, '並作')]
  Injured Oct+Nov as share of FY, by region class: {'<1.0': ['2014: 32%', '2016: 37%', '2017: 21%', '2019: 44%', '2023: 47%', '2025: 51%'], '1.0-2.0': ['2020: 42%', '2021: 20%'], '>=2.0': ['2015: 11%', '2018: 11%', '2022: 8%', '2024: 16%']}

=== Table 3: July forecast vs autumn actual category, all prefecture-years FY2012-FY2025 ===
n = 70 prefecture-years. Exact category match 48/70 = 69%. Within one grade 68/70. Two-class (凶作 or worse vs 並作 or better) agreement 62/70 = 89%. Actual worse than forecast 21, better 1. Mean |actual - forecast| index = 0.55; mean (actual - forecast) = -0.48.
Confusion (rows = forecast, cols = actual), 皆無 folded into 大凶作:
| forecast \ actual | 大凶作 | 凶作 | 並作 | 豊作 |
|---|---|---|---|---|
| 大凶作 | 27 | 0 | 0 | 0 |
| 凶作 | 9 | 3 | 0 | 0 |
| 並作 | 0 | 6 | 12 | 1 |
| 豊作 | 0 | 2 | 4 | 6 |
Misses (forecast -> actual):
  FY2012 青森: forecast 1.3 凶作 -> actual 0.4 皆無
  FY2013 青森: forecast 3.6 豊作 -> actual 3.4 並作
  FY2013 秋田: forecast 3.6 豊作 -> actual 2.9 並作
  FY2014 青森: forecast 1.7 凶作 -> actual 0.8 皆無
  FY2014 宮城: forecast 1.3 凶作 -> actual 0.7 皆無
  FY2015 秋田: forecast 2.4 並作 -> actual 1.8 凶作
  FY2015 山形: forecast 3.4 並作 -> actual 3.5 豊作
  FY2016 青森: forecast 1.4 凶作 -> actual 0.5 皆無
  FY2017 青森: forecast 2.0 並作 -> actual 1.2 凶作
  FY2017 秋田: forecast 1.0 凶作 -> actual 0.7 大凶作
  FY2018 青森: forecast 2.0 並作 -> actual 1.2 凶作
  FY2018 岩手: forecast 2.8 並作 -> actual 1.8 凶作
  FY2018 秋田: forecast 2.2 並作 -> actual 1.7 凶作
  FY2019 青森: forecast 1.6 凶作 -> actual 0.6 大凶作
  FY2020 宮城: forecast 1.7 凶作 -> actual 0.7 大凶作
  FY2021 青森: forecast 2.0 並作 -> actual 1.0 凶作
  FY2021 岩手: forecast 1.0 凶作 -> actual 0.7 大凶作
  FY2021 宮城: forecast 4.0 豊作 -> actual 1.7 凶作
  FY2021 秋田: forecast 1.0 凶作 -> actual 0.2 大凶作
  FY2022 青森: forecast 3.8 豊作 -> actual 2.9 並作
  FY2022 宮城: forecast 4.0 豊作 -> actual 1.3 凶作
  FY2022 秋田: forecast 3.7 豊作 -> actual 2.8 並作
Forecast 並作/豊作 but actual 凶作/大凶作: 8 [(2015, '秋田'), (2017, '青森'), (2018, '青森'), (2018, '岩手'), (2018, '秋田'), (2021, '青森'), (2021, '宮城'), (2022, '宮城')]
Forecast 凶作/大凶作 but actual 並作/豊作: 0 []
Five-prefecture mean, forecast vs actual, by year: 2012: 1.30->0.71, 2013: 3.44->3.48, 2014: 0.94->0.46, 2015: 3.18->2.98, 2016: 0.68->0.15, 2017: 1.20->0.84, 2018: 2.80->2.22, 2019: 0.68->0.24, 2020: 2.04->1.32, 2021: 1.98->1.02, 2022: 3.64->2.56, 2023: 0.54->0.06, 2024: 3.30->3.24, 2025: 0.44->0.10
Spearman rho(mean forecast, mean actual) = +0.96, n = 14

=== Table 4: alternate bearing. For each prefecture, how often a 並作/豊作 autumn is followed by 凶作/大凶作 (office actual, FY2012-FY2025, 13 transitions) ===
| Prefecture | 並作/豊作 years | followed by 凶作/大凶作 | followed by 並作/豊作 | 凶作/大凶作 years (excl. 2025) | followed by 凶作/大凶作 | followed by 並作/豊作 | 豊作 years | 豊作 followed by 大凶作 |
|---|---|---|---|---|---|---|---|---|
| 青森 | 5 [2013, 2015, 2020, 2022, 2024] | 5 | 0 [] | 8 | 3 | 5 | 1 [2024] | 1 |
| 岩手 | 4 [2013, 2015, 2022, 2024] | 4 | 0 [] | 9 | 5 | 4 | 2 [2013, 2015] | 2 |
| 宮城 | 5 [2012, 2013, 2015, 2018, 2024] | 4 | 1 [2012] | 8 | 5 | 3 | 2 [2013, 2024] | 2 |
| 秋田 | 4 [2013, 2020, 2022, 2024] | 4 | 0 [] | 9 | 5 | 4 | 0 [] | 0 |
| 山形 | 5 [2013, 2015, 2018, 2022, 2024] | 5 | 0 [] | 8 | 3 | 5 | 2 [2015, 2018] | 2 |
| all five | 23 | 22 (96%) | 1 | 42 | 21 (50%) | 21 | 7 | 7 |
Miyagi points 1998-2025 (Miyagi chart, 27 transitions): 並作/豊作 8 years, 7 followed by 凶作/大凶作 ([2004] not); 凶作/大凶作 19 years, 12 followed by 凶作/大凶作
Akita five sites 2002-2025 (any site ○ -> next year): {2005: 'xxxxx', 2013: 'xxxxx', 2015: 'xxxxx', 2018: 'xxxxx', 2022: 'xxxxx', 2024: 'xxxxx'}
Toyama beech 2015-2025 (prefecture category, 2016 east/west only): 2015:並作 2016:凶作/不作 2017:不作 2018:並作 2019:凶作 2020:凶作 2021:並作 2022:不作 2023:不作 2024:不作 2025:凶作 2026:豊作

=== Table 5: 2026 forecasts next to 2025 and 2023 at the same point in the year ===
| Survey (publisher, date basis) | 2023 | 2025 | 2026 |
|---|---|---|---|
| Tohoku office July flowering forecast, 青森 | 0.5 大凶作 (2023-07-05) | 0.5 大凶作 (2025-07-11) | 3.4 並作 (2026-07-07) |
| Tohoku office July flowering forecast, 岩手 | 0.4 大凶作 (2023-07-05) | 0.6 大凶作 (2025-07-11) | 3.5 豊作 (2026-07-07) |
| Tohoku office July flowering forecast, 宮城 | 0.8 大凶作 (2023-07-05) | 0.3 大凶作 (2025-07-11) | 5.0 豊作 (2026-07-07) |
| Tohoku office July flowering forecast, 秋田 | 0.3 大凶作 (2023-07-05) | 0.4 大凶作 (2025-07-11) | 3.6 豊作 (2026-07-07) |
| Tohoku office July flowering forecast, 山形 | 0.7 大凶作 (2023-07-05) | 0.4 大凶作 (2025-07-11) | 4.0 豊作 (2026-07-07) |
| Tohoku office July forecast, five-prefecture mean index | 0.54 | 0.44 | 3.90 |
| Tohoku office autumn actual, five-prefecture mean index | 0.06 | 0.10 | due Nov 2026 |
| Toyama ブナ, prefecture, Aug survey published early Sep | 不作 (2023-09-06) | 凶作 (2025-09-04) | 豊作 (2026-09-04) |
| Toyama ミズナラ, prefecture, Aug survey published early Sep | 不作 (2023-09-06) | 不作 (2025-09-04) | 並作 (2026-09-04) |
| Toyama コナラ, prefecture, Aug survey published early Sep | 不作 (2023-09-06) | 不作 (2025-09-04) | 並作 (2026-09-04) |
| Niigata ブナ, July survey (189 points), published 2026-08-07 | not on disk | not on disk | 豊作 prefecture-wide, all four regions 豊作/豊作/豊作/豊作 |
| Niigata ブナ autumn result, MoE ketujitu table | 凶作 (MoE 2024-04-22) | not on disk | n/a |
| Akita five-site forecast (prefecture, published Nov of prior year) | not on disk (actual xxxxx) | not on disk (actual xxxxx) | ○ ○ △ ○ ○ |
| Fukushima ブナ flowering (prefecture xlsx) | 大凶作 | 大凶作 | 豊作 |
| Fukushima ブナ fruiting | 凶作 | 凶作 | due autumn |
National Apr-Jun sightings: FY2023 5,691, FY2025 7,555, FY2026 12,628

=== Table 6: MoE ketujitu table, beech and oak fruiting categories, FY2013-FY2023 (category column; raw text in brackets where it differs) ===

ブナ:
| Pref | 2013 | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 青森 | 豊作 | 大凶作 [皆無] | - | - | 凶作 | 凶作 | 凶作 | 並作 | 凶作 | 並作 | 大凶作 |
| 岩手 | 豊作 | 凶作 | 豊作 | 凶作 [不作] | 凶作 [不作] | 並作 | 凶作 | 凶作 [不作] | 凶作 [不作] | 並作 | 凶作 [不作] |
| 宮城 | - | 凶作 | 豊作 | 凶作 | 凶作 | 豊作 | 凶作 | 凶作 | 並作 | 並作 | 凶作 |
| 秋田 | 豊作 [並作～豊作] | 凶作 | 豊作 | 凶作 | 凶作 | 並作 | 凶作 | 凶作 | 凶作 | 並作 | 凶作 |
| 山形 | 豊作 [並作～豊作] | 凶作 | 豊作 | 凶作 [ほとんどの箇所が凶作] | 凶作 | 並作 [並作の箇所が多い] | 凶作 | 凶作 | 凶作 | 並作 | 凶作 |
| 福島 | 豊作 | 豊作 [豊～大豊作] | 豊作 [豊～大豊作] | 凶作 | 凶作 | 豊作 | 凶作 | 凶作 | 並作 | 豊作 | 凶作 |
| 新潟 | 凶作 [凶作～不作] | 凶作 [凶作～不作] | 豊作 [並作～豊作] | 凶作 [凶作～不作] | 凶作 [凶作～不作] | 豊作 [並作～豊作] | 凶作 [凶作～不作] | 凶作 [凶作～不作] | 凶作 [凶作～不作] | 並作 | 凶作 |
| 富山 | 並作 [凶作～並作] | 凶作 | 並作 | 凶作 [不作] | 凶作 [不作] | 並作 | 凶作 | 凶作 | 並作 | 凶作 [不作] | 凶作 [不作 （東部：凶作、 西部：不作）] |
| 長野 | 凶作 [不作] | 凶作 | 豊作 [並作～豊作] | 凶作 [凶作～不作] | 凶作 [凶作～不作] | 並作 [大凶作～並作] | 凶作 [大凶作～不作] | 凶作 [大凶作～不作] | 並作 [大凶作～並作] | 並作 [大凶作～豊作] | 凶作 [凶作（大凶作～並作下）] |

ミズナラ:
| Pref | 2013 | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 青森 | - | - | - | - | - | - | - | - | - | - | - |
| 岩手 | 凶作 | 並作 [凶作～並作] | 並作 [凶作～並作] | 凶作 [不作] | 凶作 [不作] | 凶作 [不作] | 凶作 | 凶作 [不作] | 凶作 [不作] | 凶作 [不作] | 凶作 |
| 宮城 | - | 凶作 | 豊作 | 凶作 | 豊作 | 凶作 | 並作 | 凶作 | 並作 | 並作 | 凶作 |
| 秋田 | 並作 [凶作～並作] | 凶作 | 凶作 | 凶作 | 凶作 | 豊作 | 凶作 | 凶作 | 凶作 | - | 凶作 |
| 山形 | 並作 [凶作～豊作] | 凶作 | 豊作 [並作～豊作] | 凶作 [凶作の箇所が多い] | 豊作 [並作～豊作] | 豊作 [豊作の箇所が多い] | 豊作 [並作～豊作] | 並作 [凶作～豊作] | 並作 [凶作～豊作] | 並作 [凶作～豊作] | 並作 [凶作～並作] |
| 福島 | 並作 | 並作 [凶作～並作] | 並作 [大凶～豊作] | 並作 | 豊作 | 並作 | 並作 | 並作 | 並作 | 並作 | 並作 |
| 新潟 | 並作 [不作～並作] | 凶作 [凶作～不作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 凶作 [凶作～不作] | 並作 | 凶作 [不作] |
| 富山 | 並作 [不作～並作] | 凶作 | 並作 | 凶作 [不作] | 凶作 [不作] | 並作 [不作～並作] | 凶作 [全県：凶作 東部：不作 西部：凶作] | 凶作 [不作] | 凶作 [不作] | 凶作 [不作] | 凶作 [不作 （東部：不作、 西部：不作）] |
| 長野 | 並作 [並下～並] | 並作 [不作～並作] | 並作 [並下～並上] | 並作 [凶作～並下] | 並作 [凶作～豊作] | 並作 [凶作～大豊作] | 並作 [大凶作～大豊作] | 並作 [大凶作～豊作] | 並作 [大凶作～豊作] | 並作 [大凶作～大豊作] | 並作 [並作下（凶作～並作上）] |

コナラ:
| Pref | 2013 | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 青森 | - | - | - | - | - | - | - | - | - | - | - |
| 岩手 | 凶作 | 並作 [凶作～並作] | 並作 [凶作～並作] | 凶作 [不作] | 凶作 [不作] | 凶作 [不作] | 凶作 | 凶作 [不作] | 凶作 [不作] | 凶作 [不作] | 凶作 |
| 宮城 | - | - | - | - | - | - | - | - | - | - | - |
| 秋田 | 豊作 [並作～豊作] | 凶作 | 並作 | 凶作 | 凶作 | 並作 | 凶作 | 凶作 | - | - | 凶作 |
| 山形 | 並作 [凶作～豊作] | 並作 [凶作～豊作] | 豊作 [並作～豊作] | 凶作 [凶作の箇所が多い] | 豊作 [ほとんどの箇所が豊作] | 豊作 [豊作の箇所が多い] | 豊作 [並作～豊作] | 凶作 | 並作 [凶作～豊作] | 並作 [凶作～豊作] | 並作 [凶作～並作] |
| 福島 | 並作 | 並作 [凶作～並作] | 並作 [大凶～豊作] | 並作 | 並作 | 並作 | 並作 | 凶作 | 凶作 | 並作 | 並作 |
| 新潟 | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 [不作～並作] | 凶作 [凶作～不作] | 並作 [不作～並作] | 並作 [不作～並作] | 並作 | 凶作 [不作] |
| 富山 | 凶作 [凶作～不作] | 並作 [不作～並作] | 凶作 [不作] | 凶作 [不作] | 並作 | 並作 [不作～並作] | 並作 [凶作～並作] | 凶作 [不作～凶作] | 凶作 [不作] | 並作 | 凶作 [不作 （東部：並作、 西部：不作）] |
| 長野 | 並作 [並下～並] | 並作 [不作～並作] | 並作 [並下～並上] | 並作 [並作～並上] | 並作 [不作～豊作] | 並作 [凶作～大豊作] | 並作 [大凶作～大豊作] | 並作 [大凶作～豊作] | 並作 [大凶作～大豊作] | 並作 [大凶作～大豊作] | 並作 [並作下（凶作～並作上）] |

MoE table, beech fruiting, count of the nine prefectures above graded 凶作/大凶作 vs 並作/豊作 (cells with a value), with the Tohoku office five-prefecture mean:
  FY2013: 2 of 8 凶作/大凶作; office mean 3.48 並作; national Oct 615
  FY2014: 8 of 9 凶作/大凶作; office mean 0.46 大凶作; national Oct 2,546
  FY2015: 0 of 8 凶作/大凶作; office mean 2.98 並作; national Oct 856
  FY2016: 8 of 8 凶作/大凶作; office mean 0.15 大凶作; national Oct 2,589
  FY2017: 9 of 9 凶作/大凶作; office mean 0.84 大凶作; national Oct 771
  FY2018: 1 of 9 凶作/大凶作; office mean 2.22 並作; national Oct 727
  FY2019: 9 of 9 凶作/大凶作; office mean 0.24 大凶作; national Oct 2,679
  FY2020: 8 of 9 凶作/大凶作; office mean 1.32 凶作; national Oct 4,213
  FY2021: 5 of 9 凶作/大凶作; office mean 1.02 凶作; national Oct 1,393
  FY2022: 1 of 9 凶作/大凶作; office mean 2.56 並作; national Oct 1,026
  FY2023: 9 of 9 凶作/大凶作; office mean 0.06 大凶作; national Oct 5,983

Oak in Akita and Iwate in the two beech-failure years with MoE data: 秋田 ミズナラ FY2023 = 凶作; 秋田 コナラ FY2023 = 凶作; 岩手 ミズナラ FY2023 = 凶作; 岩手 コナラ FY2023 = 凶作
Oak in FY2019 (Hokuriku outbreak year): 新潟 ブナ = 凶作～不作; 新潟 ミズナラ = 不作～並作; 新潟 コナラ = 凶作～不作; 富山 ブナ = 凶作; 富山 ミズナラ = 全県：凶作 東部：不作 西部：凶作; 富山 コナラ = 凶作～並作; 石川 ブナ = 凶作; 石川 ミズナラ = 凶作; 石川 コナラ = 並作; 福井 ブナ = 凶作; 福井 ミズナラ = 凶作; 福井 コナラ = 不作
Tohoku office beech vs MoE beech, same prefecture-year, FY2013-FY2023 (two-class agreement): 46/52; disagreements: ['FY2015 秋田 office 1.8 凶作 vs MoE 豊作', 'FY2018 岩手 office 1.8 凶作 vs MoE 並作', 'FY2018 秋田 office 1.7 凶作 vs MoE 並作', 'FY2020 秋田 office 2.0 並作 vs MoE 凶作', 'FY2021 宮城 office 1.7 凶作 vs MoE 並作', 'FY2022 宮城 office 1.3 凶作 vs MoE 並作']
```
