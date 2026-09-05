# Stats and claims: verdict on each GOAL.md claim

Written 2026-09-05. This file rolls up the four cross-checks in `docs/research/` (`cross-spring-vs-autumn.md`, `cross-mast-vs-outbreak.md`, `cross-weather-vs-mast.md`, `cross-baseline.md`) and the held JSON in `webapp/data/`. Every number below was read from a file on disk in this session or in one of those four documents. The file each number came from is named next to it. Nothing is quoted from memory.

Verdict scale: supported, partly supported, not supported, untestable yet.

Fiscal year N runs April N to March N+1. "Sightings" means reports of bears made to a prefecture, as compiled by the Ministry of the Environment (MoE) in the 速報値 (provisional) table `syutubotu.pdf`. "Injured" means victims (被害者数) in MoE's injury table.

## Claim 1: Fiscal 2025 was the worst year on record (50,801 sightings, 238 injured, 13 killed)

Verdict: supported.

Numbers:

- FY2025 sightings were 50,801. Source: `webapp/data/national-timeline.json`, built from MoE `syutubotu.pdf` dated 令和8年8月6日. Window: April 2025 to March 2026.
- The previous highest year in the 13-year series FY2013 to FY2025 was FY2023 at 24,348. Source: `data-pipeline/raw/research/moe/extracted/national-monthly-sightings-fy2013-fy2026.csv`, built from the live PDF and three Wayback Machine editions (2016-12-23, 2021-04-18, 2022-06-30).
- FY2025 was 2.09 times FY2023 and 2.48 times FY2024 (20,513).
- FY2025 injured were 238 and killed were 13. Source: `national-timeline.json`, MoE injury tables FY2008 to FY2026.
- The previous highs in the injury series were 219 injured (FY2023) and 6 killed (FY2023). The injury series begins FY2008.
- FY2025 permitted captures were 14,741. The previous high was 9,271 (FY2023). Source: `national-timeline.json` captures_total, MoE capture table FY2008 to FY2026.

Caveats:

- The sightings series held here starts at FY2013. "On record" for sightings should read "since at least fiscal 2013" unless earlier MoE editions are fetched.
- The injury and death series start at FY2008, so "most since the count began in 2008" is exact for those two figures.
- Counts are provisional and MoE revises them. FY2020 rose from 20,723 to 20,887 between the 2021 and 2022 editions. FY2021's printed total (12,766) differs from the sum of its months (12,735) inside the same MoE document.
- A sighting is a report, not a bear. Reporting rises when people are alarmed.

Chart: annual sightings FY2013 to FY2025 as bars, with FY2026 shown as an Apr-Jun stub, and injured and killed FY2008 to FY2025 as two small bar rows beneath. This is one chart, not three, so the reader sees that all three series peaked in FY2025.

## Claim 2: The surge was concentrated in autumn 2025 and in Tohoku (Akita + Iwate = 46%)

Verdict: supported. The prefecture by month table that GOAL.md asked for now exists and sharpens the claim.

Numbers:

- Akita reported 13,592 and Iwate 9,739 in FY2025, together 23,331, which is 45.9% of 50,801. Source: `webapp/data/prefecture-totals.json`.
- October and November 2025 together were 26,336 sightings, 51.8% of the year. October alone was 15,998. Source: `national-timeline.json` monthly.
- By prefecture, October plus November 2025 were: Akita 9,143 (34.7% of the national Oct+Nov), Iwate 4,708 (17.9%), Miyagi 2,208, Niigata 2,019, Yamagata 1,482, Aomori 1,124, Fukushima 1,047. Source: `data-pipeline/raw/research/moe/extracted/sightings-by-prefecture-by-month-by-fy.csv`, live-2026-08-06 rows.
- The six Tohoku prefectures were 19,712 of the 26,336 Oct+Nov sightings, 74.8%.
- Akita plus Iwate were 8,898 of the 15,998 October sightings, 55.6%.
- Injuries followed the same shape. FY2025 victims by month were September 39, October 89, November 33. October plus November were 122 of 238 victims (51%). Seven of the 13 deaths were in October. Source: `data-pipeline/raw/env/injuries_monthly.csv`.
- FY2025 victims by prefecture: Akita 67, Iwate 40, Fukushima 24, Niigata 17, Nagano 16, Yamagata 12. Deaths: Iwate 5, Akita 4, Hokkaido 2, Miyagi 1, Nagano 1. Same source.

Caveats:

- These are raw counts, not counts per area or per head of population.
- Prefectures compile reports by different methods (police, municipalities, or both), so the prefecture ranking partly reflects reporting practice.
- FY2022 autumn counts for Akita (Oct 11, Nov 4) are real, not extraction errors. They were re-read from the PDF by word position.

Chart: a prefecture by month heatmap for FY2025, Tohoku rows on top, with the FY2024 heatmap beside it at the same colour scale. This is the chart that shows where October happened.

## Claim 3: Fiscal 2026 is running ahead, Apr-Jun sightings +67% on FY2025

Verdict: supported.

Numbers:

- FY2026 April to June sightings were 12,628 against 7,555 in FY2025, a rise of 67.2%. Source: `national-timeline.json` ytd block, MoE edition dated 令和8年8月6日.
- By month: April 1,787 vs 800; May 4,581 vs 2,528; June 6,260 vs 4,227.
- 12,628 is the highest April to June count in the 14-year series FY2013 to FY2026. The previous high was 7,601 (FY2024). Source: `national-monthly-sightings-fy2013-fy2026.csv`.
- June 2026 (6,260) is higher than every single month in FY2013 to FY2025 except October 2025 (15,998) and November 2025 (10,338). Same source.
- The spring 2026 rise came mostly from Tohoku. Of the +5,073 change in Apr-Jun versus FY2025, Iwate contributed +1,393, Akita +800, Miyagi +517, Shimane +315, Fukushima +295. The six Tohoku prefectures were 7,648 of 12,628, 60.6%. Source: `sightings-by-prefecture-by-month-by-fy.csv`.
- FY2026 Apr-Jun alone (12,628) exceeds the full-year totals of FY2013 (9,133) and FY2015 (9,597).

Caveats:

- A share of the rise is reporting. After a year with 13 deaths, more people report bears and more prefectures log traces. The data cannot separate that from bears.
- Figures are provisional and the FY2026 months will be revised in later editions.

Chart: the existing monthly line, FY2026 against FY2025, with FY2024 added as a grey reference line because FY2024 also had a high spring.

## Claim 4: Spring does not predict autumn

Verdict: partly supported. The claim is right about the autumn spike and wrong if read as "spring tells you nothing".

Numbers (all from `docs/research/cross-spring-vs-autumn.md`, 13 complete years FY2013 to FY2025, `national-monthly-sightings-fy2013-fy2026.csv`):

- The specific example is exact. FY2024 Apr-Jun was 7,601 and FY2025 Apr-Jun was 7,555. FY2024 finished at 20,513, which is 40.4% of FY2025's 50,801.
- The ratio of Oct-Nov sightings to Apr-Jun sightings ranged from 0.23 (FY2017) to 3.49 (FY2025), a 15-fold spread, median 0.54.
- Spearman rank correlation between Apr-Jun and Oct-Nov was +0.47 (permutation p = 0.11, n = 13). Without FY2025 it was +0.36 (p = 0.25).
- The Apr-Jun count had no relationship with the Oct-Nov/Apr-Jun ratio once FY2025 was excluded (Pearson r = +0.10, p = 0.74).
- The year-on-year direction of spring got the direction of autumn wrong in 5 of 12 adjacent-year pairs, including FY2018 to 19, FY2023 to 24 and FY2024 to 25.
- Three of the four largest autumns (FY2019, FY2020, FY2023) came from springs ranked 7th, 8th and 5th of 13.
- But spring does correlate with the full year: Pearson r = +0.72, Spearman +0.69 (n = 13). A high spring sets a high floor for the year.
- Applying each of the 13 past seasonal shapes to the FY2026 spring gives full-year what-ifs from 28,293 (FY2018 shape) to 84,913 (FY2025 shape). Even the flattest shape lands above FY2023's 24,348. These are what-ifs, not forecasts.

Caveats:

- n = 13, and the two mast-failure years (FY2023, FY2025) dominate every statistic. Pearson r for spring vs Oct-Nov is +0.60 with FY2025 and +0.33 without it.
- The four years on the site (FY2022 to FY2025) cannot support any statistical claim. The 13-year series can.
- FY2013 to FY2015 come from an edition whose note says prefectures without comprehensive data were omitted, though the prefecture list is the same 37.
- The honest wording is "spring does not predict the autumn spike", not "spring does not matter".

Chart: a scatter of Apr-Jun (x) against Oct-Nov (y) for the 13 years, each point labelled with its fiscal year, with a vertical line at 12,628 for FY2026. The reader sees the vertical scatter at any given x.

## Claim 5: Autumn surges follow failed beech/oak mast crops (2023, 2025)

Verdict: supported for beech on 13 years of primary survey data, as a rank relationship and as a categorical one. Supported for oak in FY2023 (Akita, Iwate) and FY2025 (Toyama, Fukushima) on categorical data. Not supported as a relationship that sets the size of the spike.

Numbers (from `docs/research/cross-mast-vs-outbreak.md`, rewritten 2026-09-05 on primary categories only; the proxy classification of FY2019 to FY2022 and the failure-year means 11,788 / 2,520 sightings and 193 / 83 injured printed in the earlier version are withdrawn):

- Tohoku Regional Forest Office (東北森林管理局) autumn beech result, 145 fixed points, index 0 to 5, now FY2012 to FY2025 (70 prefecture-years). Five-prefecture mean by year, FY2012 to FY2025: 0.71, 3.48, 0.46, 2.98, 0.15, 0.84, 2.22, 0.24, 1.32, 1.02, 2.56, 0.06, 3.24, 0.10. Source: `data-pipeline/research/mast/tohoku_forest_office_fruiting_actual.csv`, built from the office's releases `buna-NN.pdf` (FY2012 to FY2022, archive page `https://www.rinya.maff.go.jp/tohoku/sidou/buna.html`) and `buna-r5/r6/r7-fruiting.pdf` (2023-10-20, 2024-10-31, 2025-11-06).
- FY2023 and FY2025 were 大凶作 in all five prefectures (means 0.06 and 0.10), the two lowest means in 14 years. FY2024 was 並作 to 豊作 everywhere (3.24).
- Spearman rho between the five-prefecture mean and national October sightings is -0.74 (permutation p = 0.004, n = 13, FY2013 to FY2025); against Oct+Nov sightings -0.74 (p = 0.005); against full-year injured -0.80 (p = 0.001, n = 13); against Oct+Nov injured -0.85 (p = 0.001, n = 12). Sightings: `data-pipeline/research/moe/sightings-by-prefecture-by-month-by-fy.csv`. Injuries: `data-pipeline/research/moe/injuries_monthly_fy2014_fy2026.csv`, with FY2013 from `webapp/data/national-timeline.json`.
- Within each prefecture, its own index against its own October sightings: Aomori -0.61, Iwate -0.57, Miyagi -0.68, Akita -0.55, Yamagata -0.83 (n = 13 each, p from 0.001 to 0.051).
- Grouped by the class of the five-prefecture mean: the six 大凶作 years (2014, 2016, 2017, 2019, 2023, 2025) had a median national October of 2,634 sightings and median full-year injured of 140; the two 凶作 years (2020, 2021) 2,803 and 123; the five 並作 years (2013, 2015, 2018, 2022, 2024) 856 and 56. The six largest Octobers in the series are all years with a mean below 2.0, and no 並作 year has produced a national October above 2,235 (FY2024).
- The five Tohoku prefectures were 63% of the national October in FY2023 and 74% in FY2025, but only 7%, 15% and 10% in the earlier 大凶作 years 2014, 2016 and 2019. The MoE national table shows beech graded 凶作 or 大凶作 in 8 of 9, 8 of 8 and 9 of 9 of the five Tohoku prefectures plus Fukushima, Niigata, Toyama and Nagano in those three years, and 9 of 9 in 2023, against 0 of 8 in 2015, 1 of 9 in 2018 and 1 of 9 in 2022. Source: `data-pipeline/research/mast/env_ketujitu_by_prefecture_species_fy2017_fy2023.csv` (seven MoE editions, FY2013 to FY2023).
- Oak: in the MoE table Akita and Iwate were 凶作 for both ミズナラ and コナラ in FY2023. Toyama's 2025 result is ブナ 凶作, ミズナラ 不作, コナラ 不作 (`data-pipeline/research/mast/toyama_mast_2015_2026.csv`, published 2025-09-04). Fukushima's FY2025 fruiting is 凶作 for all three species (`fukushima_r4_r8.csv`). No FY2025 oak category is on disk for Akita or Iwate.
- Akita's five-site beech survey was × at all five sites in 2023 and 2025 and ○ at three sites in 2024. Source: `data-pipeline/research/mast/akita_buna_2002_2025.csv`.

Caveats:

- The index says which years spike, not how big. FY2023 and FY2025 sit at index 0.06 and 0.10 with Octobers of 5,983 and 15,998; FY2014, FY2016 and FY2019 at 0.46, 0.15 and 0.24 with Octobers of about 2,600; FY2017 at 0.84 with 771. The amplitude needs another explanation, plausibly population (claim 7) or reporting.
- Before 2023 the failure-year surges happened mostly outside the five Tohoku prefectures. Beech failure is Honshu-wide in failure years; the concentration of the response in Tohoku is a 2023 and 2025 feature.
- The office surveys beech only, in five prefectures. The MoE table on disk ends at FY2023, so the acorn half of the claim for 2025 rests on Toyama and Fukushima.
- Miyagi's six survey points make its index coarse. Three of the office's PDFs (FY2012 forecast and result, FY2019 result) are scanned images transcribed by eye and checked against the office's later summary tables. The office's FY2012 Miyagi grade (並作, index 2.2) disagrees with Miyagi's own chart of the same points (皆無); the office's release is used.
- n = 13 for every correlation and FY2025 dominates the sightings scale. Rank correlations do not depend on its size; means do, which is why medians are quoted.
- The Yamagata extraction remains unused because its columns are misaligned.

Chart: a two-row strip, FY2012 to FY2026. Top row: the office's five-prefecture mean index as a tile per year, coloured by class (大凶作, 凶作, 並作, 豊作), with the 2026 July forecast (3.9) as a hatched tile. Bottom row: national October sightings as bars, FY2013 to FY2025. The reader sees that every tall bar sits under a dark tile and that 2026 is the lightest tile on the strip.

## Claim 6: Mast failure is linked to weather (a hot, dry summer the year before; heavy flowering the year before that)

Verdict: not supported for the weather half. Supported for the "heavy crop the year before" half, now on the Tohoku office's own 14-year record as well as Akita's sites.

Numbers (weather from `docs/research/cross-weather-vs-mast.md`, JMA monthly data for Akita station 47582 and Morioka 47584, `data-pipeline/raw/research/weather/extracted/jma_monthly.csv`, 2009 to 2026; alternate bearing from `docs/research/cross-mast-vs-outbreak.md` Table 4):

- Prior-summer (June to August, Y-1) mean temperature at Akita against the Akita beech score in year Y gives Spearman rho = +0.45 (p = 0.09, n = 16). The sign is the opposite of the claim. Hotter prior summers preceded better crops.
- Prior-summer precipitation against the beech score gives rho = -0.01 (p = 0.98). No relationship.
- Mean prior-summer temperature was 23.8 °C before good years and 23.4 °C before poor years. A 16-year series cannot resolve a 0.4 °C gap.
- Alternate bearing is the clear regularity. In the Tohoku office's own results (FY2012 to FY2025, 13 year-to-year transitions per prefecture), a 並作 or 豊作 autumn was followed by 凶作 or 大凶作 in 22 of 23 prefecture-years, and every one of the seven 豊作 prefecture-years was followed by 大凶作. The one exception is Miyagi 2012 to 2013 (並作 then 豊作), the year on which the office's release and Miyagi's chart disagree. A poor year says nothing about the next: 21 of 42 凶作/大凶作 years were followed by another poor year and 21 by 並作 or 豊作. Source: `data-pipeline/research/mast/tohoku_forest_office_fruiting_actual.csv`.
- Independent series agree. Every Akita year in which any site recorded ○ (2005, 2013, 2015, 2018, 2022, 2024) was followed by × at all five sites, six of six (`mast/akita_buna_2002_2025.csv`). Miyagi's chart of the office's Miyagi points, 1998 to 2025, has 7 of 8 並作/豊作 years followed by a poor year (`mast/miyagi_mast_index_1998_2025.csv`). Toyama's three 並作 beech years (2015, 2018, 2021) were each followed by 不作 or 凶作 (`mast/toyama_mast_2015_2026.csv`).
- The two recent failures coincided with the two hottest summers of the same year, not the year before. Akita JJA 2023 was 25.4 °C and 2025 was 25.3 °C, the series maxima. But the office's July flowering survey already called 大凶作 in both years before the hottest weeks, so the same-year heat cannot be the cause of the flowering failure.
- Summer 2026 was cooler: Akita JJA 24.1 °C, Morioka 22.7 °C, with near-average rain (Akita 539 mm).

Caveats:

- n = 16 mast years with prior-summer weather, of which only 5 are good years.
- The weather correlations were run against Akita's five-site score. The office's 14-year Akita index now exists (`tohoku_forest_office_fruiting_actual.csv`) and the weather test has not been re-run against it.
- The one mechanism paper on file (Kon 2010) points to the previous spring's minimum temperature. JMA monthly means are not that variable, so that mechanism was not tested, only not supported by a proxy.
- Only Akita was tested. There is no long Iwate weather-to-mast pairing on file.

Chart: no weather chart as a cause. If the page keeps a weather panel, show JJA temperature as a thin context strip under the mast tiles of the Claim 5 chart and label it as context. The chart that carries the supported half of this claim is the Claim 5 index strip itself, FY2012 to FY2026, which shows every 並作 or 豊作 tile followed by a 凶作 or 大凶作 tile.

## Claim 7: The baseline has shifted (population ~15,000 in 2012 to ~54,000 in 2025; hunters >70,000 in the 1970s to <20,000)

Verdict: partly supported. Direction supported for both halves on primary data. The hunter figures on the site are wrong. The population comparison is not like for like.

Numbers (from `docs/research/cross-baseline.md`):

- Licensed hunters (all licence types) fell from 517,800 in 1975 to 213,400 in 2021, a 59% fall. Gun licences (第1種銃猟) fell from 493,700 to 84,400, an 83% fall. Source: MoE 種別狩猟免許所持者数, `data-pipeline/raw/research/baseline/syubetu.pdf`, rounded to 100.
- The total has risen since its 2012 low of 180,700 because trap licences grew from 51,600 (2007) to 119,500 (2021).
- Holders aged 60 and over were 119,100 of 213,400 in 2021. Source: `baseline/nenreibetu.pdf`.
- No MoE file contains 70,000 or 20,000 hunters. MoE has no count of hunters by target species. The site's figures are off by 7.4x and 10.7x against the MoE totals.
- Population: the 2012 MoE-funded manual gives 15,000 to 20,000 black bears plus about 3,000 brown bears, built from prefectural surveys of the 1990s and 2000s. Source: `baseline/tebiki-tougou-2012.pdf`, table 3-1.
- The MoE draft guideline dated February 2026 lists per-prefecture estimates whose latest values sum to 57,308 (45,708 black bears plus 11,600 Hokkaido brown bears), from surveys dated 2020 to 2024. Source: `data-pipeline/raw/research/moe/extracted/population-by-prefecture.csv`.
- All 16 prefectures or regions with both a pre-2010 and a latest estimate in that table rose. Examples: Iwate 1,100 (2006) to 3,700 (2020); Akita 1,052 (2010) to 2,900 (2024); Miyagi 633 (2008) to 3,147 (2020); Nagano 2,770 (2007) to 7,270 (2020); Niigata 1,080 (2010) to 1,118 (2023).
- Britannica's 518,000 (1975) and 218,500 (2020) licence figures match MoE to rounding. Britannica's 54,000 is combined black plus brown and is 6% below the MoE draft sum.
- Permitted captures rose from 1,492 (FY2008) to 7,248 (FY2020) to 14,741 (FY2025). Source: `national-timeline.json`.

Caveats:

- There is no MoE national population series by year. There are three non-aligned time points per prefecture. A national line chart would invent a series.
- Prefectural estimation methods changed after 2012, so part of the population rise is measurement.
- Licence counts are counts of licences, not persons, and none is bear-specific. MoE's latest published edition is FY2021.
- The licence total is flat to rising from 2012 to 2021 while injuries swing with mast years, so licences do not explain year-to-year change. The decline is a 1975 to 2005 story.

Chart: two small panels. Left, licence holders 1975 to 2021 split into gun and trap. Right, a dumbbell per prefecture from its pre-2010 estimate to its latest, each end labelled with its survey year. No national population line.

## Claim 8: Casualties have not risen with sightings in 2026 (53 vs 55 injured, 6 vs 4 killed)

Verdict: supported, with one qualification the site does not state.

Numbers:

- April to July 2026: 53 injured and 6 killed. April to July 2025: 55 injured and 4 killed. Source: `national-timeline.json` ytd block, from MoE injury table with through_month 7, `data-pipeline/raw/env/injuries.csv`.
- April to July injured for every year 2016 to 2026: 39, 54, 31, 50, 32, 37, 42, 56, 47, 55, 53. So 53 is within the range of the last decade and second only to 2023's 56. Source: `injuries_monthly.csv` for 2016 to 2025, `injuries.csv` for 2026.
- April to July deaths for the same years: 4, 1, 0, 1, 0, 3, 2, 1, 2, 4, 6. So 6 is the highest April to July death count in the 11-year window. The previous highs were 4 in 2016 and 2025.
- FY2026 deaths by prefecture through July: Iwate 3, Aomori 1, Akita 1, Yamagata 1. Injured: Iwate 10, Fukushima 9, Akita 7, Yamagata 5, Toyama 4. Source: `injuries.csv`.
- Sightings per injury in April to June: not computed here because the injury window is April to July and the sightings window is April to June. The windows do not match and should not be divided.

Caveats:

- Deaths are single-digit counts. The difference between 4 and 6 is within chance.
- FY2025 had 7 deaths in October alone and 89 victims in October alone. The April to July window says nothing about the autumn.
- The injury table is published to a different cut-off (July) from the sightings table (June). The page must show the two windows separately.

Chart: the existing April to July injured and killed bars, extended to all 11 years 2016 to 2026 rather than only two years. Two years hide the fact that 53 is ordinary and 6 is the window high.

## The story in five sentences

1. Fiscal 2025 (April 2025 to March 2026) was the worst year in the Ministry of the Environment's series: 50,801 bear sightings, more than double the previous high of 24,348 in fiscal 2023, with 238 people injured and 13 killed, the most since the injury count began in 2008.
2. The damage was an autumn and Tohoku event: 52% of the year's sightings and 51% of its injuries came in October and November, six Tohoku prefectures produced 75% of those autumn sightings, and the Tohoku Regional Forest Office's 145-point survey graded the beech crop 大凶作 in all five of its prefectures that autumn, as it had in 2023, the previous record year.
3. Spring 2026 is far ahead of spring 2025 (12,628 sightings April to June against 7,555, up 67%, the highest spring in 14 years), but across 13 years the spring count has ranged from a quarter to three and a half times the following October and November, so a high spring sets a high floor for the year without predicting the autumn spike.
4. What does predict the spike is the beech crop (the Forest Office's five-prefecture index and national October sightings are rank-correlated at rho = -0.74 over 13 years), and every survey published so far for autumn 2026 says it is good: the Forest Office's July flowering survey forecasts 豊作 in four of five Tohoku prefectures and 並作 in the fifth (mean index 3.9, the highest July figure in 15 years, against 0.44 at the same point in 2025), Toyama's September result is the first 豊作 for beech in its 12-year series, Niigata's 189-point July survey is 豊作 in all four regions, and Akita's five-site forecast is ○ at four sites; over 70 prefecture-years since 2012 the office's July forecast has matched the autumn category 48 times, has slipped from 並作 or better to 凶作 eight times, and has never slipped to 大凶作.
5. Casualties so far in fiscal 2026 are in line with recent years (53 injured April to July, against 55 in 2025), though 6 deaths by July is the highest for that window since 2016, and the longer background is that the estimated bear population rose in all 16 prefectures or regions with two comparable MoE-tabulated surveys and at least doubled in 12 of them, while gun-hunting licences have fallen 83% since 1975, so a good crop this autumn would lower the risk but would not return it to the level of a decade ago.

## What the site currently gets wrong or leaves ambiguous

Read from the visible text of `webapp/index.html` on 2026-09-05.

1. "Licensed bear hunters number fewer than 20,000, down from more than 70,000 in the 1970s." This is contradicted by MoE. Licence holders were 517,800 in 1975 and 213,400 in 2021. Gun licences were 493,700 and 84,400. No source containing 70,000 or 20,000 was found. Replace with the MoE figures and drop the word "bear", since MoE does not count hunters by species.
2. "Japan's bear population is estimated at about 54,000, up from about 15,000 in 2012." The 15,000 is the lower bound of a black-bear-only range (15,000 to 20,000) from surveys of the 1990s and 2000s, and the 54,000 is black plus brown bears. Like for like: black bears 15,000 to 20,000 then, about 45,700 now; all bears 18,000 to 23,000 then, about 57,300 now (MoE draft guideline, February 2026, surveys 2020 to 2024). State both ends with their survey years and say methods changed.
3. "The acorn and beechnut crop decides it, and that becomes clear from September." and "The 2026 crop is forming now. The sighting figures for September and October will show whether it has failed." The forecast is already published. The Tohoku Regional Forest Office flowering survey was published on 2026-07-07 and forecasts 豊作 or 並作 in all five prefectures. Niigata published its 豊作 result on 2026-08-07. Akita published its five-site forecast in November 2025. The page omits the single most useful forward indicator it set out to show.
4. "The cause was a failed acorn and beechnut crop in the Tohoku region." The beech half is supported by the primary survey. The acorn half is supported for 2023 in Akita and Iwate by the MoE national table (ミズナラ and コナラ 凶作) and for 2025 in Toyama and Fukushima, but no 2025 acorn grade is on disk for Akita or Iwate. Say "beech crop, and oak where it was surveyed".
5. The Methods section attributes "the 2025 crop failure" to "Japan Times, Britannica". The primary source is the Tohoku Regional Forest Office press release of 2025-11-06 (`buna-r7-fruiting.pdf`) and should be cited instead.
6. "Is fiscal 2026 on the same path? So far, yes." This is ambiguous. FY2025's path was made by October, not by spring, and the 13-year series shows spring does not set the autumn. The page's own next section says so. The header should say that spring is running well ahead and that the autumn is not decided by spring.
7. The page's sightings history starts at fiscal 2022. The "record" and "does not predict" claims rest on four years on the page. Thirteen years exist (`national-monthly-sightings-fy2013-fy2026.csv`) and three archived MoE editions are on disk to cite. The four-year version is an anecdote.
8. "A high spring count does not predict a bad autumn." True for the autumn spike. But spring and the full year correlate at r = +0.72 over 13 years. The page should not let a reader conclude spring tells them nothing, because a 12,628 spring makes a low year very unlikely.
9. "In most years sightings peak in June." True in 8 of 13 complete years since FY2013. The others peaked in September (2014), July (2019) and October (2020, 2023, 2025). The sentence is right but the page should show the 13-year monthly shapes so the reader can see the exceptions are the mast-failure years.
10. "Six people killed, against four. The difference in deaths is too small to draw a conclusion from." Correct as far as it goes. It leaves out that 6 is the highest April to July death count since the monthly series begins in 2016. That is worth one sentence, with the same small-count caveat.
11. "Fiscal 2025 ... the most on record." For injuries and deaths this is exact (series begins FY2008). For sightings the page has only four years and this file has 13. Say "the most since at least fiscal 2013" or fetch earlier MoE editions.
12. The hero panel's sightings counter renders as "0" in the static HTML before the animation runs. GOAL.md's definition of done says charts are never shown empty. Confirm the finished state is shown when scripts have not run.
13. The map for Claim 2 shows raw counts and the page says so. It does not say that prefectures compile reports differently, which is the larger caveat. Move that sentence from Methods to beside the map.
14. The injuries window (April to July) and the sightings window (April to June) differ because MoE publishes the two tables to different cut-offs. The page states both dates in the source line but the "This year" section reads as if they are the same window. Label each chart with its own window.
15. Nothing on the page says what a mast index is or that the Tohoku survey covers beech only in five prefectures. If the Claim 5 and 2026-forecast panels are added, that definition has to appear next to them.
