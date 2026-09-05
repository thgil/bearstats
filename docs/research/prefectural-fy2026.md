# Prefectural FY2026 tallies and a coverage-weighted national preliminary

Written 2026-09-05. The Ministry of the Environment's prefecture-by-month table (`data-pipeline/research/moe/sightings-by-prefecture-by-month-by-fy.csv`, edition dated 2026-08-06) stops at June 2026. Prefectures publish their own monthly tallies weeks earlier. This note compiles those tallies for the twenty prefectures with the largest FY2025 totals in the ministry's table and uses the comparable ones to estimate how July and August 2026 stand against July and August 2025.

Files:

- `data-pipeline/research/recent/prefectures_fy2026.csv`: one row per prefecture per fiscal month (April to March), FY2026 only. Columns `pref` (romaji key as in `webapp/data/prefecture-totals.json`), `pref_ja`, `fiscal_year`, `month`, `count` (blank where the source printed nothing or the month lies past the source's date), `as_of`, `source_url`, `source_title`, `format`, `comparable`, `method_note`. Every value was read from the page or file named in `source_url`; the raw downloads sit under `data-pipeline/raw/research/recent/<pref>/`.
- `data-pipeline/research/recent/compile_prefectures.py`: prints the preliminary below. The arithmetic is `build_prefectures_fy2026()` in `data-pipeline/build_context.py`, which also writes it to `webapp/data/context.json` as `recent.prefectures` and `recent.national_preliminary`.
- Akita, Iwate and Miyagi are copied from their existing per-prefecture CSVs (`akita_monthly.csv`, `iwate_monthly.csv`, `miyagi_monthly.csv`), not re-extracted. FY2025 figures always come from the ministry's table; each prefecture's own FY2025 row was checked against it and the result is recorded in `method_note`.
- The four ArcGIS point feeds (Toyama, Niigata, Gunma, Saitama; `webapp/data/points-recent.json`, `recent.series[sample4]`) are a separate series and are not part of this compilation. Toyama, Niigata and Gunma appear here through their own published tables instead.

## Rules

A prefecture enters the preliminary for a month only if

1. `comparable` is true: the prefecture's own FY2025 row equals the ministry's FY2025 row for that prefecture, and the prefecture reports no method change for FY2026 (Iwate does; Gifu gives a sightings-only cumulative with no FY2025 figure to check).
2. the month has a value, and
3. the source's `as_of` date is on or after the last day of the month (so Fukushima's July, published through 15 July, and Yamagata's August, dated 30 August, are left out).

Coverage share is the sum of the used prefectures' FY2025 counts for the month divided by the ministry's FY2025 national total for that month (sum of the prefecture rows, 計 row excluded: 5,161 for July, 4,069 for August). The ratio is the sum of the used prefectures' FY2026 counts over the same prefectures' FY2025 counts. Only months the ministry has not yet published (July onward) are computed; September has no source dated on or after 30 September yet.

## Output of `compile_prefectures.py` (2026-09-05)

```
prefectures in compilation: 18 (16 comparable)

== FY2026 month 7 (2026-07) ==
  comparable prefectures with a complete month: 12
    akita      秋田  2026=  904  2025= 1055  as_of=2026-08-31
    miyagi     宮城  2026=  222  2025=  250  as_of=2026-09-02
    yamagata   山形  2026=  195  2025=  351  as_of=2026-08-30
    niigata    新潟  2026=  147  2025=  246  as_of=2026-09-05
    gunma      群馬  2026=  171  2025=  109  as_of=2026-08-19
    nagano     長野  2026=  203  2025=  200  as_of=2026-09-04
    fukui      福井  2026=   82  2025=  102  as_of=2026-08-23
    shimane    島根  2026=  168  2025=  150  as_of=2026-07-31
    hiroshima  広島  2026=   78  2025=   64  as_of=2026-07-31
    yamaguchi  山口  2026=   62  2025=   58  as_of=2026-09-04
    ishikawa   石川  2026=   37  2025=   47  as_of=2026-09-02
    yamanashi  山梨  2026=   50  2025=   52  as_of=2026-09-04
  FY2025 share of national total for the month: 0.5201  (2684 of 5161)
  sum FY2026 = 2319
  sum FY2025 = 2684
  ratio FY2026/FY2025 = 0.8640
  left out: iwate (not comparable), fukushima (month incomplete, as_of 2026-07-28), gifu (not comparable), toyama (no value), hyogo (no value), tochigi (no value)

== FY2026 month 8 (2026-08) ==
  comparable prefectures with a complete month: 7
    akita      秋田  2026=  251  2025=  766  as_of=2026-08-31
    miyagi     宮城  2026=  132  2025=  225  as_of=2026-09-02
    niigata    新潟  2026=   43  2025=  180  as_of=2026-09-05
    nagano     長野  2026=   81  2025=  183  as_of=2026-09-04
    yamaguchi  山口  2026=   42  2025=   47  as_of=2026-09-04
    ishikawa   石川  2026=   10  2025=   30  as_of=2026-09-02
    yamanashi  山梨  2026=   37  2025=   42  as_of=2026-09-04
  FY2025 share of national total for the month: 0.3620  (1473 of 4069)
  sum FY2026 = 596
  sum FY2025 = 1473
  ratio FY2026/FY2025 = 0.4046
  left out: iwate (not comparable), yamagata (month incomplete, as_of 2026-08-30), fukushima (no value), gunma (no value), gifu (not comparable), toyama (no value), fukui (month incomplete, as_of 2026-08-23), shimane (no value), hiroshima (no value), hyogo (no value), tochigi (no value)
```

Reading: over prefectures that produced 52% of July 2025's national count, July 2026 ran at 0.86 of July 2025 (2,319 against 2,684). Over prefectures that produced 36% of August 2025's count, August 2026 ran at 0.40 of August 2025 (596 against 1,473); every one of the seven is below its own August 2025 figure, Akita most (251 against 766). Two cautions on August: Akita's `as_of` is exactly 31 August, so reports filed late for August may not yet be in the クマダス download, and the seven-prefecture set is dominated by Akita (52% of the FY2025 denominator). The August ratio should be re-run once Yamagata (dated 30 August) and Fukui (23 August) publish month-end tables.

The two ratios are not a national forecast. FY2025's national curve was driven by October and November (15,998 and 10,338 in the ministry's 計 row against 5,161 in July); the summer months say little about the autumn.

## Every prefecture in the top 20 by FY2025 total

Ordered by the ministry's FY2025 合計. "Found" means an official monthly table or cumulative figure for FY2026 was fetched; "comparable" is rule 1 above.

| # | Prefecture | FY2025 total (MoE) | Status | FY2026 months on file (Apr..) | as_of | Source | Format |
|---|---|---|---|---|---|---|---|
| 1 | 秋田 Akita | 13,592 | found, comparable | 395, 844, 874, 904, 251 | 2026-08-31 | [クマダス open data](https://ckan.pref.akita.lg.jp/dataset/050008_shizenhogoka_003) | CSV (CKAN) |
| 2 | 岩手 Iwate | 9,739 | found, **not comparable** (Bears app from April 2026) | 376, 934, 1666, 1326 | 2026-08-21 | [ツキノワグマ出没状況](https://www.pref.iwate.jp/kurashikankyou/shizen/yasei/1049881/1056087.html) | HTML/PDF |
| 3 | 宮城 Miyagi | 3,559 | found, comparable | 141, 318, 347, 222, 132 | 2026-09-02 | [令和8年度クマ目撃等情報](https://www.pref.miyagi.jp/soshiki/sizenhogo/r8kumamokugeki.html) | HTML |
| 4 | 新潟 Niigata | 3,528 | found, comparable | 67, 159, 215, 147, 43, 3 | 2026-09-05 | [にいがたクマ出没マップ FeatureServer](https://services6.arcgis.com/SKz58fvdFlaEB35q/arcgis/rest/services/survey123_08d14b98657b47309b868f49602375c8_results/FeatureServer/0/query) | ArcGIS JSON |
| 5 | 青森 Aomori | 3,334 | **not found**: no verified extraction in this compilation | | | | |
| 6 | 山形 Yamagata | 3,124 | found, comparable | 56, 169, 298, 195, 87 | 2026-08-30 | [ツキノワグマ月別目撃件数](https://www.pref.yamagata.jp/documents/2414/080830_tsukibetsu.pdf) | PDF |
| 7 | 福島 Fukushima | 2,047 | found, comparable (July through 15 July only) | 112, 192, 285, 74 | 2026-07-28 | [クマ目撃マップ 市町村別集計](https://www.pref.fukushima.lg.jp/sec/16035b/tukinowaguma-mokugeki.html) | Excel |
| 8 | 群馬 Gunma | 1,398 | found, comparable | 29, 113, 215, 171 | 2026-08-19 | [クマの目撃・出没情報](https://www.pref.gunma.jp/page/7141.html) | HTML |
| 9 | 長野 Nagano | 1,324 | found, comparable | 30, 119, 345, 203, 81, 4 | 2026-09-04 | [目撃及び人身被害の状況](https://www.pref.nagano.lg.jp/yasei/documents/903kuma.pdf) | PDF |
| 10 | 京都 Kyoto | 1,241 | **not found**: no verified extraction in this compilation | | | | |
| 11 | 岐阜 Gifu | 1,104 | found, **not comparable** (cumulative 525 sightings to 2026-08-16, no months, no FY2025 figure) | none | 2026-08-16 | [クマ（ツキノワグマ）について](https://www.pref.gifu.lg.jp/page/4964.html) | HTML sentence |
| 12 | 富山 Toyama | 1,068 | found, comparable, but cumulative only (222 出没 to 2026-07-30) | none | 2026-07-30 | [出没警報 第4報](https://www.pref.toyama.jp/documents/37375/kuma_keiho4.pdf) | PDF bulletin |
| 13 | 福井 Fukui | 950 | found, comparable | 27, 125, 173, 82, 25 | 2026-08-23 | [出没状況 R4-8](https://www.pref.fukui.lg.jp/doc/shizen/tixyouzixyuu/tukinowaguma2_d/fil/R4-8.pdf) | PDF (image) |
| 14 | 島根 Shimane | 891 | found, comparable | 94, 285, 218, 168 | 2026-07-31 | [目撃等件数](https://www.pref.shimane.lg.jp/industry/norin/choujyu_taisaku/kuma_higaitaisaku.data/R8beardata7month.pdf) | PDF |
| 15 | 広島 Hiroshima | 592 | found, comparable | 26, 138, 120, 78 | 2026-07-31 | [月別目撃件数](https://www.pref.hiroshima.lg.jp/uploaded/attachment/679296.pdf) | PDF |
| 16 | 兵庫 Hyogo | 510 | found, comparable (April, May only) | 33, 116 | 2026-06-15 | [対策連絡会議 資料](https://web.pref.hyogo.lg.jp/nk20/documents/dai3kaisiryo.pdf) | PDF |
| 17 | 山口 Yamaguchi | 408 | found, comparable | 26, 65, 56, 62, 42, 7 | 2026-09-04 | [市町別、月別クマ目撃情報](https://www.pref.yamaguchi.lg.jp/uploaded/attachment/250041.pdf) | PDF |
| 18 | 石川 Ishikawa | 384 | found, comparable | 10, 64, 69, 37, 10, 0 | 2026-09-02 | [目撃件数 R8.9.2時点](https://www.pref.ishikawa.lg.jp/sizen/kuma/documents/260902itirann.pdf) | PDF |
| 19 | 山梨 Yamanashi | 352 | found, comparable | 16, 33, 53, 50, 37, 3 | 2026-09-04 | [出没・目撃及び捕獲状況](https://www.pref.yamanashi.jp/documents/61009/20260904kumakinnen.pdf) | PDF |
| 20 | 栃木 Tochigi | 305 | found, comparable (April, May only) | 23, 40 | 2026-06-30 | [クマ出没（目撃）状況](https://www.pref.tochigi.lg.jp/d04/choujyuu/r4_kuma_shutubotu.html) | HTML |

Aomori and Kyoto are the two gaps; together they were 9% of FY2025's national total (4,575 of 50,801).

## Definitions differ between prefectures

The ministry's series is 出没 (sightings and traces, with injuries in some prefectures' feeds). The prefectural tables match it for FY2025 in every comparable case above, but what they count differs, and that is what `method_note` records per row:

- sightings plus traces plus injuries: Akita (クマダス categories), Niigata (目撃 554, 痕跡 78, 人身 2 to date), Fukushima (police log: 目撃 plus traffic accidents, traces, injuries, train strikes), Fukui (目撃・痕跡・捕獲・人身被害), Shimane (目撃等, including 痕跡・被害・捕獲等);
- sightings plus traces: Hiroshima, Hyogo, Toyama;
- sightings only: Yamagata (excludes injuries and trace-only reports), Nagano (human living areas only, forest interior excluded), Gunma (human living areas), Yamaguchi, Ishikawa (痕跡 listed separately), Yamanashi (captures excluded), Tochigi (tallied from newspaper reports), Gifu (cumulative only).

Because each prefecture's FY2025 row equals the ministry's, the FY2026/FY2025 ratio within a prefecture is sound even where the definitions differ across prefectures; the summed ratio simply weights each prefecture by its own count.

## Four discrepancies between the ministry's June 2026 cells and the prefectures' own tables

Recorded so nobody chases them as extraction errors: Niigata June is 213 in the ministry's table and 215 in the live feed (records logged after the ministry's 6 August capture); Gunma June is 231 in the ministry's table and 215 on the prefecture page; Yamanashi June is 52 in the ministry's table and 53 in the 4 September PDF; Hyogo May is 117 in the ministry's table and 116 in the 15 June council deck. The prefecture figure is the one stored here.
