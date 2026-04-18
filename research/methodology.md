# Methodology

How Bearstats aggregates the data and the caveats you should keep in mind.

## Fiscal vs calendar year

Japan's government bear data uses **fiscal year** (April → March). We label years by their starting calendar year:

- FY2025 = April 2025 through March 2026
- FY2024 = April 2024 through March 2025
- ...

Each CSV record also carries a `calendar_year` field so joins with monthly time series work correctly. The webapp always labels charts with the fiscal-year number unless noted.

## Metrics from env.go.jp injury PDFs

The injury PDFs encode three metrics per prefecture per month:

- **incidents (人身被害件数):** individual incidents (e.g., one bear encounter that injures one person = one incident).
- **victims (被害者数):** people hurt. A single incident can have multiple victims.
- **deaths (死亡者数):** fatalities.

Bearstats uses `victims` for the "injuries" series (the more visceral metric) and `deaths` for the deaths series.

## Data scope summary

| Metric | Granularity | Years | Prefectures |
|---|---|---|---|
| Sightings | prefecture × month | FY2021-FY2025 (5) | 39 |
| Injuries (victims) | prefecture × month | FY2016-FY2025 (10) | 39 |
| Deaths | prefecture × month | FY2016-FY2025 (10) | 39 |
| Captures | prefecture × year | FY2008-FY2025 (18) | 36 |
| Point-level ArcGIS | per sighting | current FY only | 4 (Saitama, Gunma, Niigata, Toyama) |
| Point-level Hokkaido | per sighting | recent 3 months only | 1 (Hokkaido) |

## Species separation

- **ツキノワグマ** (Asian black bear) — Honshu, Shikoku. All env.go.jp + ArcGIS data.
- **ヒグマ** (brown bear) — Hokkaido only. Separate from Honshu data; higumap.info is the sole source.

The webapp presents these as separate overlays with a species toggle. They are never summed.

## Known limitations

1. **Preliminary figures get revised.** env.go.jp revises prior-year numbers as late reports come in. Each JSON carries `_source_fetched_at`. Re-run the pipeline quarterly to refresh.
2. **Uneven point-level coverage.** Only 4 Honshu prefectures (+ Hokkaido separate) publish machine-readable sighting data. Other prefectures are covered at prefecture-totals granularity only.
3. **Reporting bias.** A sighting is reported when a person sees a bear. Areas with more witnesses (visitor centers, school patrols) over-report relative to bear density. This is human observation, not a bear census.
4. **Fiscal vs calendar year.** Late-2025 news coverage often uses calendar year; our data uses fiscal year. FY2025 runs Apr 2025 – Mar 2026, so news "2025 deaths" numbers (calendar) may straddle two of our FY labels.
5. **Deferred sources.** Kumadas (Akita) and Yamaguchi open data are not in v1 because their public data endpoints weren't discoverable without deeper investigation. Both are documented in `data-sources.md` with re-activation notes.

## Regenerating the data

```bash
cd ~/Projects/bearstats/data-pipeline
source .venv/bin/activate
python fetch_all.py
```

This re-downloads all sources and rebuilds `webapp/data/*.json`. Idempotent: unchanged PDFs are cached via sha256.
