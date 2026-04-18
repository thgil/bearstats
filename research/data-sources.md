# Data Sources

All sources used by Bearstats, with URLs, licenses, and access notes.

## Ministry of the Environment (環境省)

**Landing:** https://www.env.go.jp/nature/choju/effort/effort12/effort12.html
**License:** Japanese government open data (public-domain-equivalent).

Three PDF formats, each with different shape (see Section 5 of the spec).

### Historical injuries (10 yearly PDFs, FY2016-FY2025)
Pattern: `https://www.env.go.jp/nature/choju/effort/effort12/{era}injury-qe.pdf`
where `{era}` = `h28`, `h29`, `h30`, `r01`...`r07`.

### Current-year snapshots
- Injuries: https://www.env.go.jp/nature/choju/effort/effort12/injury-qe.pdf
- Sightings: https://www.env.go.jp/nature/choju/effort/effort12/syutubotu.pdf (5 years in one file)
- Captures: https://www.env.go.jp/nature/choju/effort/effort12/capture-qe.pdf (18 years in one file)

### Notes
- Prefectures in bear tables: **39, not 47**. Kyushu (Fukuoka, Saga, Nagasaki, Kumamoto, Oita, Miyazaki, Kagoshima) and Okinawa are absent — no bears live there. The captures PDF additionally omits Kagawa, Ehime, and Kochi (Shikoku prefectures with zero historical captures).
- Prefecture names are abbreviated (`青森`, not `青森県`; Hokkaido keeps full form).
- Injury PDFs have 3 sub-columns per month: incidents / victims / deaths.

## Prefecture ArcGIS dashboards (point-level, current fiscal year)

All public, no auth. Survey123-based FeatureServer endpoints.

| Prefecture | Dashboard | Feature Service (trunk) |
|---|---|---|
| Saitama | https://www.arcgis.com/apps/dashboards/6851a59c5a76496e9c9e3b54b2e67ff9 | services9.arcgis.com/n65w8AXGaYPTqFYI/arcgis/rest/services/survey123_3123e5ed..._results/FeatureServer/0 |
| Gunma | https://pref-gunma.maps.arcgis.com/apps/dashboards/5276d2ebf02a42da8595ed2a51a334c8 | services7.arcgis.com/DkC6f6v0YUQX0rke/arcgis/rest/services/survey123_a77f33a9..._results/FeatureServer/0 |
| Niigata | https://www.arcgis.com/apps/dashboards/20b4d06fb3b34776959a4e69c7a8511a | services6.arcgis.com/SKz58fvdFlaEB35q/arcgis/rest/services/survey123_08d14b98..._results/FeatureServer/0 |
| Toyama | via https://www.pref.toyama.jp/1709/kurashi/kankyoushizen/shizen/yaseiseibutsu/kumap.html | services7.arcgis.com/pUdPpUsq83Kw8pWi/arcgis/rest/services/survey123_3f07f1f9..._results/FeatureServer/0 |

Full URLs are in `data-pipeline/fetch_arcgis.py` (`SOURCES` constant).

### Notes
- ArcGIS FeatureServers cap each response at their server-side `maxRecordCount` (often 1000). Pagination must use the `exceededTransferLimit` flag.
- Gunma's `field_8` (type code) returns integer 1-4, not Japanese strings. Other prefectures return Japanese (目撃, 痕跡, 人身被害, 捕獲). Both are handled in `fetch_arcgis.parse_feature`.

## Hokkaido — higumap.info (brown bear, field-verified)

- **Site:** https://higumap.info/recent
- **Data endpoint:** `GET https://higumap.info/recent/reportsJson`
- **Response shape:** `{"list": [{"id", "lat", "lng", "foundDt" (epoch ms), "witnessFlg", "captureFlg", "popupLabel"}, ...]}`
- **Scope:** recent 3 months only (publicly available). No historical API.
- Treated as a separate dataset from env.go.jp (brown bear ≠ Asian black bear).

## Japan prefecture GeoJSON

- **Source:** https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson
- **License:** MIT
- 47 features, simplified for web use. Normalized in `fetch_geojson.py` to carry canonical keys (`code`, `name_ja`, `name_en`).

## Deferred sources (not in v1)

### Akita — Kumadas

- https://kumadas.net/ — managed by 秋田県自然保護課
- Officially CC BY 4.0 open data per their documentation, but the public web interface is a JavaScript SPA that did not expose a simple downloadable dataset during initial investigation (2026-04-18).
- **Action needed to unlock:** inspect SPA Network traffic in a browser devtools session to find the XHR endpoint, OR contact `dx@libenri.com` (admin address in site footer) to request a bulk data export URL.

### Yamaguchi — 2024 bear sightings open dataset

- https://yamaguchi-opendata.jp/dashboard?org=35000&res=9565b85b-f459-4c0e-912d-e30578822e09 (2024 dashboard)
- Portal is not standard CKAN; dashboard-only access. Likely has a CSV export behind the UI but not discoverable by simple URL probing.
- **Action needed:** inspect dashboard Network tab for underlying data fetch URL, OR manually export CSV from the dashboard UI.

Both deferrals are non-blocking: bear data from the existing 5 sources (env.go.jp + 4 ArcGIS + Hokkaido) already provides ~9,500 point records and 10 years of historical prefecture-level data — enough for v1.
