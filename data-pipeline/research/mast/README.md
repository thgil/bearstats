# Tohoku Regional Forest Office beech (ブナ) survey, FY2012 to FY2026

Files:

- `tohoku_forest_office_flowering_forecast.csv`: July flowering survey and the office's forecast of the autumn crop, FY2012 to FY2026 (75 rows, 5 prefectures x 15 years).
- `tohoku_forest_office_fruiting_actual.csv`: autumn fruiting survey result, FY2012 to FY2025 (70 rows, 5 prefectures x 14 years).
- `extract_tohoku_forest_office_2012_2022.py`: the script that produced the FY2012 to FY2022 rows. It holds the values transcribed from each PDF and recomputes every index from the point counts before writing.

Publisher: 林野庁 東北森林管理局 (Tohoku Regional Forest Office, Forestry Agency). Archive page: `https://www.rinya.maff.go.jp/tohoku/sidou/buna.html` (saved as `raw/research/gaps/tohoku-sidou-buna.html`). Every row carries `source_url`, `publish_date` (the date printed on the press release), `method` and `notes`.

Raw PDFs for FY2012 to FY2022 are under `data-pipeline/raw/research/tohoku/tohoku-buna-NN.pdf` (git-ignored), fetched 2026-09-05 from `https://www.rinya.maff.go.jp/tohoku/sidou/attach/pdf/buna-NN.pdf`. FY2023 to FY2026 rows were extracted earlier from `raw/research/mast/buna-r5..r8-*.pdf` and are unchanged apart from the two new trailing columns.

| FY | Era | Forecast PDF (date) | Fruiting PDF (date) |
|---|---|---|---|
| 2012 | H24 | buna-44 (2012-07-31, image only) | buna-45 (2012-11-21, image only) |
| 2013 | H25 | buna-53 (2013-07-25) | buna-46 (2013-11-22) |
| 2014 | H26 | buna-47 (2014-07-31) | buna-48 (2015-03-27) |
| 2015 | H27 | buna-49 (2015-07-10) | buna-50 (2015-12-09) |
| 2016 | H28 | buna-51 (2016-07-06) | buna-52 (2016-11-16) |
| 2017 | H29 | buna-12 (2017-07-13) | buna-13 (2017-11-27) |
| 2018 | H30 | buna-11 (2018-07-05) | buna-17 (2018-11-05) |
| 2019 | R1 | buna-18 (2019-07-05) | buna-25 (2019-11-12, image only) |
| 2020 | R2 | buna-20 (2020-07-15) | buna-27 (2020-11-11) |
| 2021 | R3 | buna-28 (2021-07-08) | buna-29 (2021-11-11) |
| 2022 | R4 | buna-30 (2022-06-17) | one PDF per prefecture: buna-39 宮城 (2022-10-07), buna-37 山形 (2022-10-21), buna-36 秋田 and buna-38 青森 (2022-10-26), buna-40 岩手 (2022-10-28) |

## The office's index (豊凶指数), in its own words

Survey design, from the archive page: 「東北森林管理局では、管内（青森県、岩手県、宮城県、秋田県、山形県）の145箇所の調査地点において、ブナの開花及び種子の豊凶状況調査を実施しています。」 「毎年、145箇所（定点）において、開花状況（初夏）及び結実状況(秋）を目視調査しています。」 Points that could not be reached (road damage) are dropped from that year's total, so `points_total` runs from 135 to 145 across the region.

Per-point score, from `buna-27.pdf` (R2 fruiting release, 参考 section; identical wording in every release from H29 on):

> 区分 / 開花（結実）状況 / 豊凶指数
> 全体　樹冠全体にたくさんの花（実）がついている　５
> 部分　樹冠上部に多くの花（実）がついている　３
> 一部　ごくわずかに花（実）がついている　１
> 非開花（非結実）　まったく花（実）がついていない　０
> ※（ ）書きは結実状況の調査内容
> 結実予測は、各調査箇所の調査結果を数値化、集計し豊凶指数を算出して、下表のとおり結実の豊凶を推測します。
> 豊凶指数 3.5以上 豊作 / 2.0以上3.5未満 並作 / 1.0以上2.0未満 凶作 / 1.0未満 大凶作

Before H29 the four classes were labelled 多 / 中 / 少 / 非開花 (非結実) and the aggregation was described as a weighted mean, from `buna-46.pdf` (H25 fruiting release):

> 多　ほとんどの木に開花が見られる　：結実は「豊作」と予測
> 中　約半数の木に開花が見られる　：結実は「並作」と予測
> 少　僅かな木にのみ一部に開花が見られる　：結実は「凶作」と予測
> 非開花　全く開花が見られない　：結実は「皆無」と予測
> ○結実について、各調査地点の開花状況を「豊作→５、並作→３、凶作→１、皆無→０」として集計し、加重平均値（豊凶指数）により豊凶を推測する。
> ３．５以上 豊作 / ２以上３．５未満 並作 / １以上２未満 凶作 / １未満 皆無

So the prefecture index is `(5 x points_full + 3 x points_partial + 1 x points_slight + 0 x points_none) / points_total`, on a 0 to 5 scale, rounded to one decimal (the office occasionally prints two or three decimals when the value is tiny: 0.04 in FY2012 Iwate, 0.045 in FY2016 Iwate). The build script recomputes this from the counts for all 110 new rows and every one agrees with the printed value to within rounding, with one exception noted below. Column mapping: `points_full` = 全体/多, `points_partial` = 部分/中, `points_slight` = 一部/少, `points_none` = 非開花 (forecast) or 非結実 (fruiting).

Category thresholds: 豊作 >= 3.5, 並作 2.0 to 3.5, 凶作 1.0 to 2.0, and below 1.0 **皆無 up to FY2016, 大凶作 from FY2017**. The rename is stated in `buna-13.pdf` (H29 fruiting release, footnote): 「豊凶指数 1.0 未満は、調査地点の一部で開花又は結実が見られる場合が多くあります。このため、より適切に正確を期するため、平成 29 年度から豊凶区分の「皆無」を｢大凶作」に変更しました。」 The CSVs keep the label as printed in each release; treat 皆無 and 大凶作 as the same class.

## Method column

- `pdftotext -layout text layer`: the PDF has a text layer; the table was read from `pdftotext -layout` output and checked against the totals row and the recomputed index.
- `visual read of scanned PDF ...`: `buna-25.pdf`, `buna-44.pdf` and `buna-45.pdf` have no text layer. Pages were rendered with `pdftoppm` and transcribed from the image; the Akita FY2012 actual index cell was re-rendered at 300 dpi to confirm 0.7. All three transcriptions agree with the office's own summary tables in later releases and on the archive page.
- `text layer (pre-existing row, values unchanged)`: FY2023 to FY2026 rows extracted in an earlier run.

## Known inconsistencies in the primaries (kept as printed, flagged in `notes`)

1. **FY2014 Aomori actual (`buna-48.pdf`)**: printed index 0.8, but the printed counts (1/1/17/18 of 37) give 0.68. The office's later three-year summary tables (`buna-50`, `buna-52`, `buna-12`) restate FY2014 Aomori as 0.7; the archive page says 0.8. Category is 皆無 either way.
2. **FY2014 Miyagi forecast (`buna-47.pdf`)**: the Miyagi row prints 3/14/22/29 of 68 points, which are the cumulative totals of the Aomori, Iwate and Miyagi rows (Miyagi has 6 points). The index 1.3 and category 凶作 are printed correctly. The counts in the CSV (0/2/2/2 of 6) come from the forecast row restated in `buna-48.pdf`, which reproduces the July table as its upper rows.
3. **FY2014 fruiting release is dated 2015-03-27**, four months later than every other year.
4. Cross-check against the archive page's summary table (flowering and fruiting index per prefecture, 平成元年 to 令和8年): all 110 new values match, except the two rounding cases (FY2016 Iwate 0.045 shown as 0.0 on the page; FY2014 Aomori as in item 1).

---

# MoE national mast table (堅果類の着花結実情報について, `ketujitu.pdf`), FY2013 to FY2023

File: `env_ketujitu_by_prefecture_species_fy2017_fy2023.csv` (1,386 rows). One row per prefecture (33 listed by MoE) x species (ブナ, ミズナラ, コナラ) x fiscal year x survey type. The file name keeps the FY2017 to FY2023 range the task asked for; the editions on disk go back to FY2013 (H25), so those years are included as well (fruiting FY2013 to FY2023, flowering FY2021 to FY2023 only, which is all MoE ever printed).

Script: `extract_env_ketujitu_editions.py` (run from the repo root with `data-pipeline/.venv/bin/python`). It reads every edition with pdfplumber table detection, keeps the latest edition's cell for each key, and writes earlier editions' differing text to `earlier_editions`.

Publisher: 環境省 自然環境局. The table is compiled by MoE from prefectural returns; the 備考 column (kept as `remarks`) names the surveying body where it is not the prefecture (e.g. 青森 and part of 秋田: 東北森林管理局). Live URL `https://www.env.go.jp/nature/choju/effort/effort12/ketujitu.pdf` (still 200 on 2026-09-05, byte-identical to the 2024-06-26 Wayback capture; not linked from the effort12 landing page).

## Editions

| `edition` | `publish_date` and how it was fixed | File (git-ignored) | Fruiting columns | Flowering columns |
|---|---|---|---|---|
| 2016-10-26 | header 平成28年10月26日 | `raw/research/gaps/ketujitu-wb-20161223083532.pdf` | H28, H27, H26, H25 | none |
| 2019-01-07 | header 平成31年1月7日 | `raw/research/gaps/ketujitu-wb-20190513220230.pdf` | H30, H29, H28, H27, H26, H25 | none |
| 2020-10-23 | PDF CreationDate (header undated) | `raw/research/gaps/ketujitu-wb-20201101095717.pdf` | R2, R1, H30, H29 | none |
| 2021-11-01 | header 令和３年11月１日時点 | `raw/research/gaps/ketujitu-wb-20220630070835.pdf` | R3 (mostly 調査中), R2, H31 | R3 |
| 2022-09-07 | PDF CreationDate (header undated, marked 別添３) | `raw/research/gaps/ketujitu-wb-20221022220755.pdf` | R3, R2, R1, H30 | R4 |
| 2023-04-21 | PDF CreationDate (header undated; 青森 cell says 10/7時点) | `raw/research/gaps/ketujitu-wb-20230613164542.pdf` | R4 (partly 調査中) | none |
| 2024-04-22 | header 令和６年４月22日時点 | `raw/research/mast/env-ketujitu.pdf` (= Wayback 20240626072218) | R5, R4 | R5, R4 |

`source_url` is the Wayback `id_` URL for the six archived editions and the live URL for the 2024 edition. The Wayback CDX list (`raw/research/gaps/wayback-cdx-ketujitu.txt`) has exactly these seven digests, so no edition is missing. Fiscal year N = April N to March N+1; H31 and R1 are both FY2019.

## Columns

`prefecture`, `prefecture_en`, `species`, `species_en`, `fiscal_year`, `era_label` (H25..R5 as printed), `survey_type` (fruiting = 結実状況, flowering = 開花状況), `raw_text` (the exact pdfplumber cell string; internal line breaks written as the two characters `\n`), `text_clean` (line breaks removed), `status`, `category`, `category_rule`, `edition`, `edition_count` (how many editions carry this key), `earlier_editions` (`<edition>=<text>` for every earlier edition whose text differs), `remarks` (備考 from the latest edition, plus row notes), `method`, `source_file`, `source_url`, `publish_date`, `publish_date_source`.

`status`: `value` (a category was printed), `no_data` (－, ―, blank: no survey or no return), `not_published` (公表しない, 未公表, 未回答, 不明), `ambiguous` (see below). Cells that were `調査中`/`予定` in an earlier edition are filled from the later edition; the earlier text is in `earlier_editions`.

`category` is a four-bucket normalisation of `text_clean`: 大凶作 (incl. 皆無), 凶作 (incl. 不作, やや凶作), 並作 (incl. 並上, 並下, 並作上, 並作下), 豊作 (incl. 大豊作). Range cells follow MoE's own footnote under the 計 row of every edition: 「並作～豊作」は豊作、「凶作～並作」「凶作～豊作」「不作～並作」は並作、「不作」は凶作として集計. Ranges wholly inside one bucket (e.g. 不作・凶作) take that bucket; 長野's 大凶作～不作 (R1, R2 ブナ) is put in 凶作 because MoE's own 計 row tallies 大凶作 as 凶作 (2024 edition R5 ブナ: printed 凶作 22 = 19 凶作 + 3 大凶作 cells), labelled `range 大凶作～不作→凶作` in `category_rule`; ranges spanning 凶作 to 豊作 or wider (mostly 長野) are put in 並作 by analogy with the MoE rule and are labelled `range spanning buckets→並作` in `category_rule` so they can be excluded. Cells with a headline category followed by a parenthesised breakdown (富山 R5, 長野 R5, 兵庫 R1) take the headline. `raw_text` always carries the original wording.

## Checks

- Recomputing each edition's printed 計 row (豊作/並作/凶作 counts) from the parsed cells with the rules above reproduces 64 of 84 edition-columns exactly, including all 12 columns of the 2024-04-22 edition and all 12 of the 2016-10-26 edition. The 20 differences are one cell each and sit in MoE's own hand tallies (e.g. 2021-11-01 R2 ミズナラ printed 3/13/8 while the cells give 3/13/9 after 秋田 changed from 調査中 to 凶作; the R3 flowering totals in that edition count more cells than the column holds) or in how MoE counted 長野's wide ranges, which it treats as 並作 in some editions and 凶作 or 豊作 in others.
- The 2024 edition was compared cell by cell with the earlier, independent extraction `env_ketujitu_national_r4_r5.csv` (396 cells): all agree apart from parenthesis width and the ※ mark, except 富山 R5 コナラ, which the old file gives as 並作 and this file as 不作（東部：並作、西部：不作）. `pdftotext -layout` of `env-ketujitu.pdf` confirms 不作 is the headline value; the old CSV is wrong for that cell.

## Manual interventions and ambiguous cells

1. 2020-10-23 edition, 島根 H29 ブナ: pdfplumber split the wrapped cell across the 島根 and 岡山 rows ("凶作（東\n部）\n並昨（西" and "部）\n豊作"). Re-merged by hand after reading `pdftotext -layout`: 島根 = 凶作（東部）並昨（西部）, 岡山 = 豊作. `method` says so on both rows. The 島根 cell (east 凶作, west 並作, with the source's own 昨 for 作) is the one `ambiguous` row and has no `category`.
2. 2021-11-01 edition, 鳥取: the 開花期 survey-period cell reads ①豊作②並作下③並作上, which looks like the R3 flowering result entered in the wrong column; the R3 開花状況 cells are －. Left as printed and noted in `remarks`.
3. Substantive revisions between editions (all preserved in `earlier_editions`): 鳥取 H25 to H28 were regraded in the 2019 edition after the prefecture moved to a six-class scale in H29 (備考: H29に判定基準を見直し); 青森 H30 ブナ 並作 (2019 edition) became 凶作 from 2020 on; 群馬 H30 ミズナラ/コナラ 並作 became 不作; 島根 R1 コナラ 並作 became 豊作 in the 2022 edition; 鳥取 R4 ミズナラ 豊作 (2023 edition) became 並作上 in 2024; 青森 H28 ブナ 凶作予測 (2016 edition) became － in 2019.
