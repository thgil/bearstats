# Hunting-licence holders, national, 1975 to 2021

File: `hunting-licence-holders-1975-2021.csv` (23 rows). Script: `extract_licence_holders.py` (run from `data-pipeline/` with `.venv/bin/python research/moe/extract_licence_holders.py`).

Sources (環境省 自然環境局, both linked from `https://www.env.go.jp/nature/choju/docs/docs4/`, saved as `raw/research/baseline/docs4-index.html`):

| File | Title | Local copy | `publish_date` |
|---|---|---|---|
| `syubetu.pdf` | 種別狩猟免許所持者数 (by licence type) | `raw/research/baseline/syubetu.pdf` | 2025-11-19, PDF CreationDate; nothing printed in the file |
| `nenreibetu.pdf` | 年代別狩猟免許所持者数 (by age band) | `raw/research/baseline/nenreibetu.pdf` | 2025-11-19, PDF CreationDate |

Both are one-page PowerPoint exports (fetched 2026-09-05). The table has no ruling lines, so every number is assigned to the year header whose x0 is nearest (pdfplumber words). The 合計 row of each PDF is asserted to be 23 values with 517,800 in 1975 and 213,400 in 2021, and each year's components are asserted to sum to the printed total within rounding.

## Columns

`year` (fiscal year; every five years 1975 to 2005, annual from 2005), `total` (合計 from `syubetu.pdf`), `gun1` (第１種銃猟), `gun2` (第２種銃猟), `net` (網猟) and `trap` (わな猟) from 2007, `net_trap_combined` (the single 網・わな猟 licence before the 2007 split), `age60plus` (60歳以上 from `nenreibetu.pdf`), `total_by_age_table` (合計 as printed in `nenreibetu.pdf`), then provenance.

## The ministry's own notes, as printed

- 単位：人 十の位で四捨五入 (rounded to the nearest hundred).
- ※四捨五入のため、合計の数字と内訳の計が一致しない場合がある。
- ※近年（H17年度以降）は毎年集計。それ以前は５年ごとの集計。
- ※2007年（H19年）に「網・わな猟免許」を「網猟免許」と「わな猟免許」に区分。
- ※2015年（H27年）に網免許及びわな猟免許の取得年齢を20歳以上から18歳以上に引き下げ。(nenreibetu.pdf only)

## Inconsistencies between the two PDFs (kept as printed)

The totals differ in three years: 1995 (246,000 by type vs 246,100 by age), 2006 (186,700 vs 186,600) and 2016 (196,500 vs 199,700). The first two are rounding; 2016 is a 3,200 gap in the ministry's own tables. The by-type components for 2016 (6,900 + 98,800 + 88,900 + 1,900 = 196,500) match the by-type total, and the age bands (200 + 7,500 + 15,600 + 23,100 + 28,100 + 125,300 = 199,800) match the by-age total, so each PDF is internally consistent and they disagree with each other. `total` follows `syubetu.pdf`; `total_by_age_table` keeps the other figure.

Cross-check: the exact FY2021 count in the ministry's R3 xlsx (`hunting-license-holders-national.csv`) is 213,370, which rounds to the 213,400 printed here.
