# Toyama Prefecture mast (堅果類・ドングリ豊凶) survey, 2015-2026

Two CSVs built 2026-09-05 from the prefecture's yearly one-page press releases
「堅果類（ドングリ）の豊凶調査結果について」, produced by the 富山県森林研究所 and posted at
https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/houkyou.html
(copy of the page: `data-pipeline/raw/research/mast/toyama-page.html`, 更新日 2026-09-04).
Raw PDFs (git-ignored): `data-pipeline/raw/research/toyama/` — the twelve files linked from that page
(`https://www.pref.toyama.jp/documents/21689/<file>`), plus the original 2021 file
`wb-r3houkyou_20210907hp.pdf` (Wayback capture 2022-01-11, the one still carrying the site maps),
the Wayback CDX listings `wayback-cdx-*.txt`, page snapshots `wb-houkyou-*.html`,
and the Chubu Regional Forest Office cross-check pages `chubu-230908.html`, `chubu-220908.html`.
All twelve PDFs have a text layer (pdftotext -layout). Files whose name starts `no-figure_` are
figure-less re-uploads made 2022-01-11 (PDF CreationDate); their text is what was extracted.

## Files

* `toyama_mast_2015_2026.csv` — one row per year x species (ブナ/ミズナラ/コナラ) x region
  (prefecture = 全県, east = 県東部, west = 県西部; the 神通川 is the boundary, east of it is 県東部).
  Rows exist only where the report prints a category for that region. Prefecture rows also carry the
  number of survey sites (箇所), trees surveyed (個体, printed 2015-2018 only) and, where the report
  gives or shows them, the number of sites in each category. Two retrospective rows (2006 = H18,
  2010 = H22, the two "mass outbreak" years) come from the comparison table printed in the 2020 report.
* `toyama_mast_sites_2021_2026.csv` — one row per survey site for the four years whose file shows a map
  with per-site symbols (2021 original file, 2024, 2025, 2026). Categories were read visually from the
  rendered maps (pdftoppm at 300 and 600 dpi, viewed with the Read tool); the `method` column says so.
  East/west in this file is the side of the dashed 神通川 line the symbol sits on; 桧峠 and 猿倉 sit on
  the line.

## The office's own definition of the categories (verbatim from every report)

作柄は豊作、並作、不作、凶作の４段階区分（健全堅果密度と着果指数に基づく）

i.e. four grades — 豊作 (good), 並作 (average), 不作 (poor), 凶作 (failure) — assigned from sound-nut
density and a fruiting index. The reports do not print the underlying densities or index values, nor
the thresholds. Survey timing: ブナ 8月, ナラ 8月中下旬 (2015-2023); ブナ 7月下旬～8月, ナラ類 8月中下旬
(2024-2026). Site lists: ブナ 15 sites (14 in 2015), ミズナラ 16, コナラ 9 (2015), 10 (2016-2022; the 2016
report says 10箇所 but lists 9 names), 11 from 2023 (氷見 added).

`category_code` (4 = 豊作, 3 = 並作, 2 = 不作, 1 = 凶作) is OUR ordinal code for charting, not a value
published by the prefecture. Map symbols: ● 豊作, ○ 並作, △ 不作, × 凶作.

## Publish dates

`publish_date` is the date the prefecture posted the result; `publish_date_basis` says where it came
from (file-name date stamp for 2015-2020; original file name `r3houkyou_20210907hp.pdf` for 2021;
page 更新日 for 2024-2026). 2022 and 2023 are inferred (PDF CreationDate of the re-uploaded previous-year
file, and the Chubu Forest Office pages of 2022-09-08 / 2023-09-08 that already cite them) and are marked
as such.

## Ambiguities recorded in the rows

* 2016 and 2017: no 全県 category printed for ブナ/ミズナラ (2016) and ミズナラ/コナラ (2017); only east/west.
* 2020 ブナ: 「1箇所を除き凶作」— 14 凶作 sites, the 15th site's grade not stated (`n_sites_unresolved` = 1).
* 2021 ミズナラ map: three 有峰 symbols overlap; one is hidden (`n_sites_unresolved` = 1, one site row blank).
* 2023: the east/west qualifier text is a single brace spanning both regions for ミズナラ and コナラ.
* 2025 ミズナラ: the text gives 凶作 3, 不作 11; the two 並作 sites are read from the map.
* The 2026 report also states 261 bear outings/sightings for April-August 2026 (above normal); that number
  is in the `note` column only.

## Cross-check

Chubu Regional Forest Office (national forest, separate survey, 7-grade scale) for Toyama:
2022 (page 2022-09-08): ブナ 並作, ミズナラ 不作, and it quotes the prefecture's 2022 result as
ブナ 不作 / ミズナラ 不作 / コナラ 並作 — matching this table. 2023 (page 2023-09-08, 63 sites): ブナ 凶作 in all
three districts, ミズナラ 不作/並作下/凶作. Pages for 2021 and 2020 returned HTTP 403.
