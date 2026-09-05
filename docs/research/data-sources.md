# Data sources catalogue

Written 2026-09-05. This is the list of every primary source worth using for the claims in `docs/GOAL.md`, grouped by domain. Each entry gives the URL, the publisher, the years covered, the granularity, the file format, how it can be automated, and the GOAL.md claim it serves.

Status labels, applied to every entry:

- **Verified (this run)**: the file or page was downloaded in the 2026-09-05 research passes, opened, and its table structure read. A local copy exists under `data-pipeline/raw/research/` and the path is given.
- **Held (pipeline)**: already fetched and parsed by the production pipeline in `data-pipeline/`, with output in `data-pipeline/raw/` and `webapp/data/`. Verified by virtue of being in use.
- **Seen only**: the URL or citation was found in search results or on an index page, but the content was not fetched or could not be read (paywall, bot challenge, blocked). Nothing from these sources is used on the page yet.
- **Secondary**: not a primary source. Listed so it is not mistaken for one.

All local paths below are relative to `data-pipeline/raw/research/` unless stated otherwise.

Claim numbers refer to the table in `docs/GOAL.md`: 1 record year, 2 autumn and Tohoku concentration, 3 FY2026 running ahead, 4 spring does not predict autumn, 5 mast failure drives autumn surges, 6 weather drives mast, 7 baseline shift in population and hunters, 8 casualties in 2026.

---

## 1. Ministry of the Environment: sightings, injuries, captures

These are the series the page is built on. The landing page for all three current files is `https://www.env.go.jp/nature/choju/effort/effort12/effort12.html`. The pipeline script `data-pipeline/fetch_env_go_jp.py` downloads them and `extract_env_go_jp.py` parses them.

### 1.1 Monthly bear sightings by prefecture, syutubotu.pdf

- URL: `https://www.env.go.jp/nature/choju/effort/effort12/syutubotu.pdf`
- Publisher: 環境省 (Ministry of the Environment), title クマ類の出没情報について［速報値］
- Years: the live file always holds the most recent five fiscal years. Edition dated 令和8年8月6日 covers FY2022 to FY2026 (FY2026 through June).
- Granularity: 39 prefectures by 12 months by 5 fiscal years, plus a national total row (計) and annual totals. Counts are provisional and are reports, not bears.
- Format: one-page PDF, dense unruled table. Blank cells for future months are truly empty, so text-line splitting cannot align columns. Extract by word x-coordinates with pdfplumber. The script `moe/extract_syutubotu_monthly.py` does this and validates that every prefecture-year sums to its printed 合計 (live file 185 of 185 pass).
- Automation: poll the fixed URL monthly, compare sha256, re-parse. MoE updates it around the first week of each month.
- Serves: claims 1, 2, 3, 4. Verified national totals FY2022 to FY2026 are 11,136 / 24,348 / 20,513 / 50,801 / 12,628. Akita FY2025 13,592 plus Iwate 9,739 is 45.9 percent of the national total.
- Status: **Held (pipeline)** at `data-pipeline/raw/env/syutubotu.pdf` and `sightings.csv`; also **Verified (this run)** at `moe/syutubotu.pdf` with `moe/extracted/sightings-total-by-prefecture-by-fy.csv` and `moe/extracted/sightings-by-prefecture-by-month-by-fy.csv`.

### 1.2 Older editions of syutubotu.pdf via the Wayback Machine

- URLs:
  - `http://web.archive.org/web/20161223083529/http://www.env.go.jp/nature/choju/effort/effort12/syutubotu.pdf` (edition dated 平成28年12月1日, FY2013 to FY2016 partial)
  - `http://web.archive.org/web/20210418123348/http://www.env.go.jp/nature/choju/effort/effort12/syutubotu.pdf` (edition dated 令和3年3月26日, FY2016 to FY2020 partial)
  - `http://web.archive.org/web/20220630075831/https://www.env.go.jp/nature/choju/effort/effort12/syutubotu.pdf` (edition dated 令和4年6月6日, FY2018 to FY2022 partial)
- Publisher: 環境省, archived by the Internet Archive.
- Years: chained with the live file these give continuous monthly national and prefectural sightings from FY2013 to FY2026.
- Granularity: same prefecture by month by fiscal year table as the live file. The 2016 edition lists 37 prefectures (no 北海道 or 千葉 rows).
- Format: PDF, same layout. The same x-coordinate extractor works on all three. One known source inconsistency: in the 2022 edition the FY2021 month cells sum to 12,735 while the printed total is 12,766; this is in the MoE document, not the parser.
- Automation: one-off backfill, already done. Snapshots do not change. The extracted series is at `moe/extracted/national-monthly-sightings-fy2013-fy2026.csv` (built by `moe/extracted/extract_national_monthly.py`).
- Serves: claim 4 (extends the spring-versus-autumn test from 4 years to 13 complete fiscal years).
- Status: **Verified (this run)** at `moe/syutubotu-2016-snapshot.pdf`, `moe/syutubotu-2021-snapshot.pdf`, `moe/syutubotu-2022-snapshot.pdf`.

### 1.3 Injuries and deaths, injury-qe.pdf and yearly archives

- URLs: current year `https://www.env.go.jp/nature/choju/effort/effort12/injury-qe.pdf`; closed years `https://www.env.go.jp/nature/choju/effort/effort12/<code>injury-qe.pdf` where code is h28, h29, h30, r01 to r07.
- Publisher: 環境省, クマ類による人身被害について［速報値］
- Years: FY2016 (H28) to FY2026 monthly by prefecture in the yearly files; annual totals FY2008 onward in the pipeline output.
- Granularity: prefecture by month, incidents, victims, deaths.
- Format: PDF tables, parsed by the pipeline into `data-pipeline/raw/env/injuries_monthly.csv` (4,680 rows) and `injuries.csv`.
- Automation: poll the current-year URL monthly; the closed-year archive is stable.
- Serves: claims 1 (238 injured, 13 killed in FY2025) and 8 (FY2026 year to date).
- Status: **Held (pipeline)**.

### 1.4 Permitted captures by prefecture, capture-qe.pdf

- URL: `https://www.env.go.jp/nature/choju/effort/effort12/capture-qe.pdf`
- Publisher: 環境省, クマ類の捕獲数（許可捕獲数）について［速報値］
- Years: FY2008 (H20) to FY2026 (provisional to end of June 2026).
- Granularity: prefecture by fiscal year, columns 計 (total), 捕殺 (culled), 非捕殺 (released).
- Format: PDF, text-extractable table. Pipeline output `data-pipeline/raw/env/captures.csv` (684 rows).
- Automation: poll the fixed URL monthly.
- Serves: claim 7 (captures rose from 1,492 in FY2008 to 14,741 in FY2025).
- Status: **Held (pipeline)**; a reference copy also at `moe/capture-qe.pdf`.

### 1.5 Long-run national captures, hokakusuu.pdf

- URL: `https://www.env.go.jp/nature/choju/docs/docs4/hokakusuu.pdf`
- Publisher: 環境省, 狩猟及び許可捕獲等による主な鳥獣の捕獲数
- Years: 1960 to 2000 in five-year steps, then annual to FY2020 (provisional). Not updated past FY2020 in the fetched version.
- Granularity: national only, six species including クマ類, split into 狩猟 (hunting) and その他 (permitted other). Rounded to 100. Bear hunting sub-row marked 未集計 for FY2019 and FY2020.
- Format: one-page PDF, text-extractable with pdftotext -layout.
- Automation: check the index `https://www.env.go.jp/nature/choju/docs/docs4/` for a newer edition once a year. Low priority because 1.4 is more useful.
- Serves: claim 7 (context). Bear その他 captures: 6,300 in FY2019, 7,200 in FY2020. Agrees with 1.4 within rounding for 2010 to 2020; do not mix the two on one chart because their definitions differ.
- Status: **Verified (this run)** at `moe/hokakusuu.pdf`.

---

## 2. Ministry of the Environment: population and hunters (claim 7)

### 2.1 Bear population estimates by prefecture, draft bear guideline FY2026

- URL: `https://www.env.go.jp/content/000377671.pdf`
- Publisher: 環境省, 特定鳥獣保護・管理計画作成のためのガイドライン（クマ編）令和8年度版（案）, table 表Ⅱ-２ 都道府県のクマ推定個体数の推移, dated 令和8年2月時点.
- Years: per prefecture, three non-aligned survey points: latest (2020 to 2024), a 2010s survey, and a pre-2010 survey.
- Granularity: prefecture or multi-prefecture regional population; 25 rows with data, 8 prefectures explicitly unpublished.
- Format: PDF, text-extractable table without ruling lines. Extracted to `moe/extracted/population-by-prefecture.csv`.
- Automation: none practical; the guideline is revised every few years. Re-check `https://www.env.go.jp/nature/choju/` when the final FY2026 edition is published.
- Serves: claim 7. The latest column sums to 57,308 (black bear only 45,708 excluding Hokkaido 11,600). There is no MoE national population time series by year; chart this as per-prefecture points at their own survey years, not a national line.
- Status: **Verified (this run)** at `moe/kuma-guideline-r08-draft.pdf`. The FY2022 edition (`moe/kuma-guideline-r04.pdf`) has no such table.

### 2.2 Hunting licence holders by type and by age, 鳥獣関係統計

- URLs: index `https://www.env.go.jp/nature/choju/docs/docs2.html`; each edition at `https://www.env.go.jp/nature/choju/docs/docs2/<era-year>/<code><era-year>tou.html` (for example `docs2/r03/r03tou.html`, `docs2/h30/06h30tou.html`); the R3 edition links `R3-02.xlsx` (種別狩猟免状交付状況) and `R3-03.xlsx` (年齢別狩猟免状交付状況).
- Publisher: 環境省.
- Years: annual editions from 平成11年度 (1999) to 令和3年度 (2021, latest published). Each edition shows three fiscal years.
- Granularity: national plus all 47 prefectures, by licence type (網, わな, 第一種銃猟, 第二種銃猟) and separately by age band.
- Format: Excel (.xlsx) in recent editions; read with openpyxl. Extracted to `moe/extracted/hunting-license-holders-national.csv` and `hunting-license-holders-by-age-national.csv`.
- Automation: scrape the docs2 index once a year for a new edition, then download the linked xlsx files. Older editions may be PDF or xls.
- Serves: claim 7. Total holders FY2019 215,417, FY2020 218,493, FY2021 213,370. 第一種銃猟 84,417 in FY2021. Largest age bands in FY2021: 70 to 79 (59,822) and 60 to 69 (47,147).
- Status: **Verified (this run)** at `moe/R3-02.xlsx`, `moe/R3-03.xlsx`, `baseline/docs2.html`, `baseline/r01tou.html`.

### 2.3 Licence holders 1975 to 2021, summary PDFs

- URLs: `https://www.env.go.jp/nature/choju/docs/docs4/syubetu.pdf` (種別狩猟免許所持者数) and `https://www.env.go.jp/nature/choju/docs/docs4/nenreibetu.pdf` (年代別狩猟免許所持者数), both linked from `https://www.env.go.jp/nature/choju/docs/docs4/`.
- Publisher: 環境省.
- Years: 1975 to 2021, every five years before 2005 and annual after. Rounded to 100.
- Granularity: national, by licence type and by age band.
- Format: PDF, read by x-position with pdfplumber in `baseline/cross_baseline.py`.
- Automation: check the docs4 index once a year.
- Serves: claim 7. Total licence holders 517,800 (1975) to 213,400 (2021), a 59 percent fall; 第一種銃猟 493,700 to 84,400, an 83 percent fall. This contradicts the page's current "over 70,000 to under 20,000" sentence, for which no source was found anywhere.
- Status: **Verified (this run)** at `baseline/syubetu.pdf`, `baseline/nenreibetu.pdf`, `baseline/docs4-index.html`.

### 2.4 National population figures from the 2012 survey manual

- URL: hosted at bear-project.org; the exact URL was not recorded in the notes available for this catalogue and must be recovered from the baseline pass before citing.
- Publisher: 環境研究総合推進費 クマ類の個体数推定法の開発に関する研究チーム, クマ類の個体数を調べる ヘア・トラップ法とカメラトラップ法の手引き（統合版）, March 2012. Table 3-1 quotes 環境省部内資料 2006 and 米田・間野 2011.
- Years: a single "2006" figure of 16,000 black bears, and a 1990s to 2000s stack of prefectural surveys giving 13,000 to 21,000 black bears and 1,700 to 3,600 brown bears.
- Granularity: national summary only.
- Format: PDF.
- Automation: none; historical document.
- Serves: claim 7. This is the origin of the "15,000 in 2012" figure and it is a lower bound of a black-bear-only range from older surveys, not a 2012 count.
- Status: **Verified (this run)** at `baseline/tebiki-tougou-2012.pdf`.

### 2.5 Other MoE briefing material fetched but not yet parsed

- `baseline/conf04-r05-mat02.pdf`: 資料2 クマ類の生息状況、及び被害状況等について（途中経過）, an MoE council paper from FY2023. `baseline/docs6-02.pdf`: an 8 MB MoE document. `kuma-situation.pdf`, `env-kuma-situation.pdf`, `env_mat02_r05.pdf`: MoE briefing decks that appear to stop at the FY2023 edition. `env-manual-gaiyou.pdf`, `cas-kumahigai-shiryo1.pdf`, `maff-tukuba-kensyu10.pdf`, `biodic_tumiage3.pdf`: related compilations. URLs for these were not recorded in the notes available here.
- Serves: background for claims 2 and 7. None contain a series that is not already covered above.
- Status: **Verified (this run)** as fetched files, but not parsed and not source-URL-confirmed in this catalogue.

---

## 3. Beech and oak mast surveys (claim 5)

### 3.1 Tohoku Regional Forest Office beech flowering forecast and fruiting result

This is the recommended primary automated feed for the mast index.

- URLs, forecast (July, 開花状況と結実予測): `https://www.rinya.maff.go.jp/tohoku/attach/pdf/index-36.pdf` (R5, 2023-07-05), `index-107.pdf` (R6), `index-153.pdf` (R7), `index-180.pdf` (R8, 2026-07-07).
- URLs, actual (autumn, 結実状況について（実績）): `https://www.rinya.maff.go.jp/tohoku/koho/press/attach/pdf/index-18.pdf` (R5, 2023-10-20), `https://www.rinya.maff.go.jp/tohoku/attach/pdf/index-125.pdf` (R6, 2024-10-31), `https://www.rinya.maff.go.jp/tohoku/sidou/attach/pdf/buna-55.pdf` (R7, 2025-11-06).
- Index page: `https://www.rinya.maff.go.jp/tohoku/koho/press/index.html`, which lists releases from R3 (2021) to R8 (2026).
- Publisher: 東北森林管理局 (Tohoku Regional Forest Office, Forestry Agency).
- Years: forecast 2023 to 2026, actual 2023 to 2025. The 2026 actual publishes around November 2026. Releases for R1 to R4 exist on the index page but were not downloaded; fetching them would extend the numeric index back to 2019.
- Granularity: five Tohoku prefectures (青森, 岩手, 宮城, 秋田, 山形), 135 to 145 fixed survey points, giving a numeric 豊凶指数 (0 to 5) and a category (大凶作, 凶作, 並作, 豊作).
- Format: PDF press release with one table. Extracted to `mast/extracted/tohoku_forest_office_flowering_forecast.csv` and `tohoku_forest_office_fruiting_actual.csv`, each with source URL and publish date per row.
- Automation: the July forecast path increments but not predictably, and the autumn actual path changes location each year. Scrape the press index page in July and November and follow the link whose title contains ブナ, rather than guessing paths.
- Serves: claim 5 and the "risk for the autumn ahead" panel. FY2023 and FY2025 were 大凶作 in all five prefectures (index 0.0 to 0.2); FY2024 was 並作 to 豊作 (2.6 to 4.2). The 2026 forecast is 並作 in Aomori (3.4) and 豊作 elsewhere (Iwate 3.5, Miyagi 5.0, Akita 3.6, Yamagata 4.0). In the 15 prefecture-years available the July forecast category matched the autumn actual category every time.
- Status: **Verified (this run)** at `mast/buna-r5-flowering.pdf` through `buna-r8-flowering.pdf` and `buna-r5-fruiting.pdf` through `buna-r7-fruiting.pdf`.

### 3.2 MoE national mast table, ketujitu.pdf

- URL: `https://www.env.go.jp/nature/choju/effort/effort12/ketujitu.pdf`
- Publisher: 環境省, 堅果類の着花結実情報について.
- Years: one snapshot dated 2024-04-22 giving R4 (FY2022) and R5 (FY2023) results. No newer edition was found by search.
- Granularity: about 28 prefectures with bears, by species (ブナ, ミズナラ, コナラ), flowering and fruiting, categorical. A footnote names the surveying agency per prefecture.
- Format: PDF table. Extracted to `mast/extracted/env_ketujitu_national_r4_r5.csv`.
- Automation: poll the URL and the effort12 landing page; also try sibling paths such as effort13 once a year.
- Serves: claim 5, as the widest single national cross-check outside Tohoku.
- Status: **Verified (this run)** at `mast/env-ketujitu.pdf`.

### 3.3 Akita Prefecture beech and mizunara results 2002 to 2025, and 2026 forecast

- URLs: `https://www.pref.akita.lg.jp/uploads/public/archive_0000077382_00/ブナ・ミズナラ豊凶結果2025.pdf` (percent-encoded in the notes) and `https://www.pref.akita.lg.jp/uploads/public/archive_0000077382_00/ブナ豊凶予報2026.pdf`.
- Publisher: 秋田県.
- Years: 2002 to 2025 results (24 years); 2026 forecast published November 2025.
- Granularity: five named sites (八森, 森吉山, 田沢湖, 東成瀬, 鳥海), categorical ○ 豊作, △ 並作, × 凶作.
- Format: PDF table (results) and PDF map with legend (forecast). Extracted to `mast/extracted/akita_buna_2002_2025.csv` and `akita_2026_forecast.csv`.
- Automation: the archive folder id is stable; the filename carries the year. Check the prefecture page (saved as `akita-page.html`) each autumn.
- Serves: claims 4 and 5 (long series). 2023 and 2025 were × at all five sites; 2026 forecast is ○ at four of five sites and △ at one.
- Status: **Verified (this run)** at `mast/akita-buna-mizunara-2002-2025.pdf` and `mast/akita-buna-2026-forecast.pdf`.

### 3.4 Yamagata Prefecture beech results H15 to R7

- URL: `https://www.pref.yamagata.jp/documents/2177/4bunah15r7.pdf`
- Publisher: 山形県.
- Years: 2003 to 2025 (23 years).
- Granularity: 15 named sites, categorical 凶作, 並作, 豊作.
- Format: PDF table with inconsistent blank cells. The text-layout extraction in `mast/extracted/yamagata_buna_h15_r7.csv` is misaligned (it gave 15 of 16 sites 凶作 for 2024, the reverse of the Tohoku office result) and must not be used until re-parsed with pdfplumber table detection or read visually.
- Automation: the documents folder id looks stable; verify each year.
- Serves: claims 4 and 5, once the alignment is fixed.
- Status: **Verified (this run)** as fetched at `mast/yamagata-buna-h15r7.pdf` and `mast/yamagata-buna-r7.pdf`; extraction **not verified**.

### 3.5 Niigata Prefecture 2026 mast survey (速報)

- URL: `https://www.pref.niigata.lg.jp/uploaded/attachment/506777.pdf`
- Publisher: 新潟県, 令和8年度堅果類の豊凶状況調査結果（速報）, published 2026-08-07.
- Years: 2026 only in this file.
- Granularity: four regions (上越, 魚沼, 中越, 下越) plus prefecture-wide, 189 points, survey period 2026-07-01 to 2026-07-31.
- Format: PDF press release with table. Extracted to `mast/extracted/niigata_buna_forecast_r8.csv`.
- Automation: attachment ids are not predictable; scrape the prefecture's bear page (saved as `niigata-page.html`) each August.
- Serves: claim 5 (independent 2026 forecast: 豊作 prefecture-wide and in all four regions).
- Status: **Verified (this run)** at `mast/niigata-r8-kekka-sokuho.pdf`.

### 3.6 Fukushima Prefecture mast survey R4 to R8, Excel

- URL: `https://www.pref.fukushima.lg.jp/uploaded/life/901863_2663542_misc.xlsx`
- Publisher: 福島県.
- Years: FY2022 to FY2026; fruiting through FY2025, FY2026 flowering only.
- Granularity: two sub-regions (中通り, 会津) plus overall, by species (ブナ, ミズナラ, コナラ), flowering and fruiting, categorical.
- Format: Excel, clean cells, read with openpyxl. Extracted to `mast/extracted/fukushima_r4_r8.csv`.
- Automation: the file appears to be updated in place; poll it and diff.
- Serves: claim 5. Beech was 凶作 in FY2023 and FY2025; 2026 flowering 豊作.
- Status: **Verified (this run)** at `mast/fukushima-r4-r8-summary.xlsx`.

### 3.7 Miyagi Prefecture mast index and capture chart 1998 to 2025

- URL: `https://www.pref.miyagi.jp/documents/24763/r7graph_2.pdf`
- Publisher: 宮城県.
- Years: 1998 to 2025 (28 years) for the Tohoku office points; prefecture's own beech and mizunara series from 2013.
- Granularity: prefecture-wide categorical mast index (皆無, 大凶作, 凶作, 並作, 豊作) plus a bear-capture bar chart.
- Format: PDF chart. The mast-index labels are clean text and are extracted to `mast/extracted/miyagi_mast_index_1998_2025.csv`. The capture-count bar labels are interleaved in the text layer and were not extracted; a visual read or a request for the underlying table is needed.
- Automation: the documents folder id looks stable; the filename changes with the era year.
- Serves: claims 5 and 6 (the longest prefectural categorical series on hand).
- Status: **Verified (this run)** at `mast/miyagi-r7graph_2.pdf`; mast half extracted, capture half **not extracted**.

### 3.8 Toyama Prefecture mast surveys R3 and R5

- URLs: `https://www.pref.toyama.jp/documents/21689/r5houkyoutyousa_rev.pdf` and `https://www.pref.toyama.jp/documents/21689/r4koushin_r3houkyou_20220906.pdf`.
- Publisher: 富山県, 堅果類（ドングリ）の豊凶調査結果について.
- Years: 2021 and 2023 only.
- Granularity: prefecture overall plus east and west Toyama, by species, with survey-point counts and named sites.
- Format: PDF press release. Extracted to `mast/extracted/toyama_donguri_r3_r5.csv`.
- Automation: scrape the prefecture's results index page (saved as `mast/toyama-page.html`). The R7 (2025) and R8 (2026) primary press releases were not located; the "first good crop in 15 years" 2026 story rests only on a Hokkoku Shimbun article and is therefore **Secondary** until the primary is found.
- Serves: claim 5 (Hokuriku cross-check).
- Status: **Verified (this run)** at `mast/toyama-r3-houkyou.pdf` and `mast/toyama-r5-houkyou.pdf`.

### 3.9 FFPRI seed production map (tanedas)

- URL: `https://www.ffpri.go.jp/labs/tanedas/` (interactive map).
- Publisher: 森林総合研究所 (Forestry and Forest Products Research Institute).
- Years and granularity: unknown; the earlier sweep concluded it is an interactive map with no flat file.
- Automation: would require browser automation.
- Serves: claim 5, potentially.
- Status: **Seen only**. Not re-attempted this run.

---

## 4. Weather (claim 6)

### 4.1 JMA monthly station data, 過去の気象データ検索

- URL pattern: `https://www.data.jma.go.jp/stats/etrn/view/monthly_s1.php?prec_no=<PREC>&block_no=<BLOCK>&year=<YYYY>&month=&day=&view=`. Stations used: Akita 32/47582, Morioka 33/47584, Aomori 31/47575, Yamagata 35/47588, Niigata 54/47604, Toyama 55/47607.
- Publisher: 気象庁 (Japan Meteorological Agency).
- Years: 2009 to 2026 fetched (2026 through August complete; September partial and excluded). Station records go back much further; extending is a one-line change to the year range.
- Granularity: station by month; mean temperature, precipitation total, sunshine hours, plus 24 other columns.
- Format: server-rendered HTML table (`<table id='tablefix1' class='data2_s'>`), parsed by regex in `weather/fetch_jma.py` with no browser needed. Raw pages in `weather/html/<station>_<year>.html`; derived `weather/extracted/jma_monthly.csv` and `jma_summer_means.csv` (June to August aggregates per station-year). Column layout documented in `weather/README.md`.
- Automation: re-run `fetch_jma.py` monthly; it skips station-years already on disk. Fetch the current year fresh each time because the page fills in as months close.
- Serves: claim 6. Akita JJA mean temperature was 25.4 C in 2023 and 25.3 C in 2025 (the two 大凶作 years and the two hottest summers in the series), 24.5 C in 2024, 24.1 C in 2026.
- Status: **Verified (this run)**, 108 station-years, zero parse failures.

### 4.2 JMA bulk download tool, obsdl

- URL: `https://www.data.jma.go.jp/risk/obsdl/`
- Publisher: 気象庁.
- Format: CSV export from a JavaScript form with no documented query-string API.
- Automation: would need browser automation; not needed because 4.1 works.
- Status: **Seen only**.

### 4.3 Mechanism papers on beech masting

- Kon, ブナにおけるマスティングの適応的意義とそのメカニズム, 北海道立林業試験場研究報告 46: `https://www.hro.or.jp/upload/3763/kenpo46-2.pdf`. Finds that flowering is suppressed by a warm late-April to mid-May minimum temperature in the previous year, a spring signal rather than a summer one. Cites Masaka and Sato 2002 for a summer resource hypothesis, which was not located. **Verified (this run)** at `weather/kon_2010_masting_review.pdf`.
- Wada et al., 秋田県におけるブナの開花結実年変動と地域間同調性, 東北森林科学会誌 25(2), 2020: `https://www.jstage.jst.go.jp/article/tjfs/25/2/25_29/_pdf/-char/ja`. Eighteen-year seed-trap record at five Akita sites, 2002 to 2019, mast years 2005, 2013, 2015, 2018. **Verified (this run)** at `weather/wada_2020_akita_beech_synchrony.pdf`.
- Serves: claim 6. The page's wording "hot dry summer the year before" is not what the one mechanism paper on file says; it says previous spring minimum temperature. Rephrase or test both.

---

## 5. Academic papers on mast and bear outbreaks (claims 5 and 7)

### 5.1 Sakata, Kishimoto and Seki 2011, Hyogo population estimate 1994 to 2010

- URL: `https://agriknowledge.affrc.go.jp/RN/2030912465.pdf`
- Publisher: 兵庫ワイルドライフモノグラフ vol. 3.
- Years: 1994 to 2010, annual.
- Granularity: Hyogo Prefecture only. Hierarchical Bayesian population estimate with credible intervals, corrected for mast-driven detection bias; sightings 2000 to 2010; standardized mast index 2005 to 2010 observed and 1994 to 2004 back-estimated.
- Format: 14-page PDF, Japanese CID font; tables need pdfplumber page-level detection. Only the unambiguous columns were extracted, to `academic/extracted/hyogo_population_estimate_1994_2010.csv` and `hyogo_mast_index_sightings_1994_2010.csv`.
- Automation: none; static paper.
- Serves: claim 7 (a measured ten-fold rise in one prefecture: median 62.5 in 1994 to 648.6 in 2010) and claim 5.
- Status: **Verified (this run)** at `academic/sakata_hyogo_wildlife_monograph.pdf`.

### 5.2 Fujiki 2021, municipal bear-occurrence model from mast data, Ursus 32:e6

- URL: `https://bioone.org/journals/ursus/volume-2021/issue-32e6/URSUS-D-19-0008.1/A-model-to-predict-the-occurrence-of-Asiatic-black-bears/10.2192/URSUS-D-19-0008.1.full` (append `.pdf` and use a browser user agent with curl; WebFetch returns empty).
- Publisher: International Association for Bear Research and Management, open access.
- Years: 2005 to 2018, autumn season.
- Granularity: 11 municipalities in Hyogo Prefecture.
- Format: 12-page PDF, clean text tables. Table 3 extracted to `academic/extracted/fujiki2021_municipality_R2.csv`.
- Serves: claim 5 (peer-reviewed R squared up to 0.94 per municipality, 0.87 pooled, for autumn occurrence against a three-species Fagaceae mast index).
- Status: **Verified (this run)** at `academic/fujiki2021_ursus.pdf`.

### 5.3 Fujiki 2022, Hyogo mast-based outbreak forecasting review

- URL: `https://agriknowledge.affrc.go.jp/RN/2030942144.pdf`
- Publisher: 兵庫ワイルドライフモノグラフ vol. 14, March 2022.
- Years: monitoring 2005 to 2020.
- Granularity: prefecture and municipality; the mast time series is a chart image, not text.
- Format: 16-page PDF. Model-selection tables only.
- Serves: claim 5 (methodology citation only).
- Status: **Verified (this run)** at `academic/fujiki_hyogo_wildlife_monograph.pdf`.

### 5.4 Paywalled or blocked papers

- Oka et al. 2004, Relationship between changes in beechnut production and Asiatic black bears in northern Japan, J. Wildlife Management 68:979-986. `https://wildlife.onlinelibrary.wiley.com/doi/abs/10.2193/0022-541X(2004)068%5B0979:RBCIBP%5D2.0.CO;2`. Search snippet: positive correlation between nuisance kills and a beechnut failure index in 5 of 7 Tohoku zones. Wiley 403, BioOne mirror redirects. **Seen only**. Most relevant of the blocked set because it covers Tohoku.
- Kozakai et al. 2011, Effect of mast production on home range use of Japanese black bears, J. Wildlife Management 75:867-875. `https://wildlife.onlinelibrary.wiley.com/doi/10.1002/jwmg.122`. **Seen only**.
- Fujiki 2018, Can frequent occurrence of Asiatic black bears around residential areas be predicted by a model-based mast production in multiple Fagaceae species, J. Forest Research. `https://doi.org/10.1080/13416979.2018.1488653`. Abstract via Semantic Scholar: 12-year Hyogo study, R squared 0.96. Full text blocked by Cloudflare. **Seen only**.
- Ida et al. 2021, A 15-year study on the relationship between beech reproductive-organ production and nuisance bear kills in a snowy rural region in central Japan, Landscape and Ecological Engineering. `https://link.springer.com/article/10.1007/s11355-021-00472-9`. Springer bot challenge. **Seen only**.
- Masaka and Sato 2002 (summer resource hypothesis cited by Kon). Not located. **Seen only** as a citation.

### 5.5 Other compilations fetched in earlier sweeps, not parsed

- `jbn_2023_symposium_abstracts.pdf`, `jbn_2024_symposium.pdf`, `jbn_2025_genjyoseiri.pdf` (Japan Bear Network), `shinrinbunka_2023_outbreak.pdf`, `ffpri_2003_seikasenshu.pdf`, `kumajijyo_2023.pdf`. URLs not recorded in the notes available here. Background reading; no series extracted.
- Status: fetched, **not verified** as data sources.

---

## 6. Point-level sighting reports (map layer)

These feed `webapp/data/points-recent.json` (11,885 geocoded points at last build). They serve the map, not a numbered claim.

### 6.1 Prefectural ArcGIS Survey123 feature services

- URLs (FeatureServer layer 0, paginated JSON query, in `data-pipeline/fetch_arcgis.py`):
  - Saitama `https://services9.arcgis.com/n65w8AXGaYPTqFYI/arcgis/rest/services/survey123_3123e5ed452d4e89845e4ba6129c1e2d_results/FeatureServer/0`
  - Gunma `https://services7.arcgis.com/DkC6f6v0YUQX0rke/arcgis/rest/services/survey123_a77f33a9b9f649cfada5c7983c67874b_results/FeatureServer/0`
  - Niigata `https://services6.arcgis.com/SKz58fvdFlaEB35q/arcgis/rest/services/survey123_08d14b98657b47309b868f49602375c8_results/FeatureServer/0`
  - Toyama `https://services7.arcgis.com/pUdPpUsq83Kw8pWi/arcgis/rest/services/survey123_3f07f1f9864d43368d48b5f373d6cd68_results/FeatureServer/0`
- Publisher: the four prefectural governments via ArcGIS Online.
- Years: rolling recent reports; field names differ per prefecture and are mapped in the pipeline.
- Granularity: individual report with coordinates, municipality, type, date, time.
- Format: ArcGIS REST JSON, page size 2000. Raw GeoJSON in `data-pipeline/raw/arcgis/`.
- Automation: already scripted; run daily.
- Status: **Held (pipeline)**.

### 6.2 Hokkaido brown bear reports, higumap.info

- URL: `https://higumap.info/recent/reportsJson` (site `https://higumap.info/`).
- Publisher: higumap.info, field-verified brown bear reports for the last three months. Separate species; kept isolated in the pipeline.
- Format: JSON. Raw at `data-pipeline/raw/hokkaido/higuma.json`.
- Automation: already scripted in `data-pipeline/fetch_hokkaido.py`.
- Status: **Held (pipeline)**.

### 6.3 Prefecture boundaries

- URL: `https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson`, fetched by `data-pipeline/fetch_geojson.py`.
- Status: **Held (pipeline)**. Geometry only.

---

## 7. Secondary sources, listed so they are not cited as primary

- Britannica, "Why Have There Been So Many Bear Attacks in Japan in 2025?", dated 2025-11-18, read from a Wayback snapshot at `baseline/britannica-wb.html`. Its licence figures (518,000 in 1975, 218,500 in 2020) match MoE 2.3 to rounding; its "54,000 combined" population has no stated source and is 6 percent under the MoE draft-guideline sum; its 213 injuries for 2023 differs from MoE's 219. **Secondary**.
- Japan Times 2025-12-06 (`baseline/jt-20251206-wb.html`) and 2025-12-26 (`baseline/jt-20251226-wb.html`), both paywalled beyond the lede. **Secondary**.
- j-hunters.com/info/suii.php, hunter-association licence trend page. Not fetched. **Secondary**.
- Hokkoku Shimbun article on Toyama's 2026 mast forecast. **Secondary**; primary not yet found (see 3.8).
- kuma-watch.jp. Unverifiable publisher, no primary sourcing. Excluded from all extracted data.
- The page's current "hunters over 70,000 in the 1970s to under 20,000" sentence has no located source at all and is contradicted by 2.2 and 2.3. Remove or replace.

---

## 8. Gaps to close, in priority order

1. Fetch Tohoku Forest Office releases for R1 to R4 (2019 to 2022) from the press index to extend the numeric mast index to seven years (3.1).
2. Re-parse the Yamagata table with pdfplumber table detection so its 23-year series can be used (3.4).
3. Find Toyama's R7 and R8 primary press releases (3.8).
4. Look for a newer MoE national mast table than the 2024-04-22 snapshot (3.2).
5. Read the Miyagi capture bar chart visually to pair 28 years of mast category with captures (3.7).
6. Try institutional or author-hosted copies of Oka 2004, the one blocked paper that covers Tohoku (5.4).
7. Recover and record the source URLs for the fetched-but-uncatalogued files in 2.4, 2.5 and 5.5 before any of them is cited.


## Prefectural sources that run ahead of the ministry (added 2026-09-05)

The ministry's national table lags month end by about six weeks (edition of 6 August 2026 covers to 30 June). Three prefectures publish sooner, and one of them publishes every report with coordinates.

| Source | URL | As of | Granularity | Notes |
|---|---|---|---|---|
| Akita Prefecture, クマダス (ツキノワグマ等情報マップシステム) open data, CC BY 4.0 | https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003 (CSV/JSON/XML/RDF) | records to 2026-08-31; CKAN updated 2026-09-03; "monthly" | every report: id, type (目撃/痕跡/人身被害), municipality, address, datetime, species, sex, group, count, description, lat, lon | 24,603 rows from October 2023; 23,205 black-bear rows. Reconciles with the ministry: FY2025 13,592 = 13,592; Apr-Jun 2026 2,113 vs 2,107. About 1,240 old rows carry Excel serial dates. Verified-fetched. |
| Iwate Prefecture, ツキノワグマ出没状況 (monthly table, six fiscal years) | https://www.pref.iwate.jp/kurashikankyou/shizen/yasei/1049881/1056087.html (PDF link changes by date, e.g. 20260819_shutubotu.pdf) | 2026-08-21 | prefecture x month | FY2026 switched to the Bears app; the prefecture says FY2026 differs in nature from earlier years, so not comparable. Injuries PDF to 2026-08-29 (12 people). Verified-fetched. |
| Miyagi Prefecture, 令和8年度クマ目撃等情報 (市町村別・月別集計) | https://www.pref.miyagi.jp/soshiki/sizenhogo/r8kumamokugeki.html (xlsx + two PDFs, dated) | 2026-09-02 | municipality x month | FY2026 Apr 141, May 318, Jun 347, Jul 222, Aug 132. Verified-fetched. |
| Toyama, Niigata, Gunma, Saitama ArcGIS feeds | already in the pipeline (points-recent.json) | 2026-09-04 | point | Jul 2026 363 vs 420; Aug 134 vs 320. |

Aggregators seen but not used: kumamap.com (claims 128,695 incidents across 47 prefectures; scrapes prefectural systems and news; no documented licence or method), kuma-watch.jp (news plus municipal notices, internal data only), FASTBEAR (Aisometry press release). None is primary.
