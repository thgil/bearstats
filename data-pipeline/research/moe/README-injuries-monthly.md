# National monthly bear-injury series, FY2014 to FY2026

Files in this directory:

- `injuries_monthly_fy2014_fy2026.csv`: one row per fiscal year x month, national. Columns: `fiscal_year`, `month`, `calendar_year`, `injured` (被害者数, victims), `killed` (死亡者数), `incidents` (人身被害件数), `status`, `source_url`, `publish_date`, `pdf_created`, `source_file`, `method`.
- `injuries_monthly_by_prefecture_fy2014_fy2026.csv`: the same, one row per prefecture (the 39 prefectures that appear in the MoE tables) x fiscal year x month.
- `extract_injuries_monthly.py`: builds both from the PDFs. Run from `data-pipeline/` with `.venv/bin/python research/moe/extract_injuries_monthly.py`.

Fiscal year N = April N to March N+1. Rows are in the ministry's fiscal order (4, 5, ..., 12, 1, 2, 3).

## Sources

All from 環境省, `https://www.env.go.jp/nature/choju/effort/effort12/`, titled 「○ ＨNN年度／ＲNN年度におけるクマの人身被害件数」. One PDF per fiscal year, 39 prefectures x 12 months x (件数, 被害者数, 死亡者数), with a 計 row.

| Fiscal year | File | Local copy | Server Last-Modified (`publish_date`) | PDF CreationDate (`pdf_created`) |
|---|---|---|---|---|
| FY2014 | `h26injury-qe.pdf` | `raw/research/moe/` (fetched 2026-09-05) | 2025-06-14 | 2023-12-04 |
| FY2015 | `h27injury-qe.pdf` | `raw/research/moe/` (fetched 2026-09-05) | 2025-06-14 | 2023-12-04 |
| FY2016-FY2018 | `h28`, `h29`, `h30injury-qe.pdf` | `raw/env/` (pipeline) | 2025-06-14 | 2023-12-04 |
| FY2019-FY2022 | `r01` to `r04injury-qe.pdf` | `raw/env/` (pipeline) | 2025-06-14 | 2023-12-01 |
| FY2023-FY2024 | `r05`, `r06injury-qe.pdf` | `raw/env/` (pipeline) | 2025-06-14 | 2025-05-12 |
| FY2025 | `r07injury-qe.pdf` | `raw/env/` (pipeline) | 2026-04-07 | 2026-04-06 |
| FY2026 (running) | `r08injury-qe.pdf` | `raw/research/moe/` (fetched 2026-09-05) | 2026-08-12 | 2026-08-07 |

`publish_date` is the HTTP `Last-Modified` header returned by www.env.go.jp on 2026-09-05. The ministry regenerated the FY2014 to FY2022 archive files in December 2023 and re-uploaded every closed year on 2025-06-14, so for closed years this is the date of the copy on the server, not the date the figures were first released. No closed-year file carries a printed date. The FY2026 file carries no printed date either; the companion summary `raw/env/injury-qe.pdf` is printed 令和8年8月12日 and labels the same FY2026 figures 「Ｒ０８年度 (R08年7月末)」.

## Method

- Closed years (FY2014 to FY2025): `extract_env_go_jp.extract_injury_pdf` from the pipeline, unchanged. The H26 and H27 files have the same 44 x 40 table layout as the later years and a text layer; no transcription from images was needed.
- Running year (FY2026): `r08injury-qe.pdf` leaves August to March blank in the prefecture rows, which makes pdfplumber merge the first data row's cells. `extract_running_year_pdf` in the script instead takes the 40 column x-ranges from the 計 row (always fully populated) and assigns each word in a prefecture row to the column containing its x-centre. Only April to July are emitted, per the 7月末 cut-off read from `raw/env/injury-qe.pdf`; the blank later months are unreported, not zero.
- The `method` column on every row names which of these produced it.

## Checks performed 2026-09-05

- Parsed monthly sums equal the printed 計 row in each PDF for every month (FY2026: asserted in the script; closed years: compared by eye against `pdftotext -layout` output for H26 and H27, and the FY2016 to FY2025 output is byte-for-byte the pipeline's `raw/env/injuries_monthly.csv`).
- Fiscal-year sums of `injured` and `killed` equal `webapp/data/national-timeline.json` (`metrics.injuries`, `metrics.deaths`) for every year FY2014 to FY2025, and the FY2026 April to July sum (53 injured, 6 killed) equals `ytd.injuries` / `ytd.deaths` for 2026.

| FY | injured | killed | FY | injured | killed |
|---|---|---|---|---|---|
| 2014 | 122 | 2 | 2021 | 88 | 5 |
| 2015 | 56 | 0 | 2022 | 75 | 2 |
| 2016 | 105 | 4 | 2023 | 219 | 6 |
| 2017 | 108 | 2 | 2024 | 85 | 3 |
| 2018 | 53 | 0 | 2025 | 238 | 13 |
| 2019 | 157 | 1 | 2026 (Apr-Jul) | 53 | 6 |
| 2020 | 158 | 2 | | | |

## Caveats

- 被害者数 includes 死亡者数. The FY2026 file says so explicitly (「※被害者数に死亡者数含む」); the H26 and H27 files carry no such note, but their annual totals match the ministry's current multi-year summary (`raw/env/injury-qe.pdf`), which uses one definition throughout.
- All figures are the ministry's 速報値 (preliminary). FY2014 and FY2015 are the earliest monthly files the ministry publishes; FY2008 to FY2013 exist only as annual totals in `injury-qe.pdf`.
