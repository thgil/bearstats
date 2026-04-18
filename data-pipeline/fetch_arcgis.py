"""Fetch bear-sighting point data from prefecture ArcGIS Feature Services.

All four use the Survey123 schema; we map `field_*` → canonical names here
so downstream code stays clean.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from utils import RAW_DIR, ensure_dir

ARCGIS_RAW = RAW_DIR / "arcgis"

SOURCES = [
    {
        "key": "saitama",
        "url": "https://services9.arcgis.com/n65w8AXGaYPTqFYI/arcgis/rest/services/survey123_3123e5ed452d4e89845e4ba6129c1e2d_results/FeatureServer/0",
    },
    {
        "key": "gunma",
        "url": "https://services7.arcgis.com/DkC6f6v0YUQX0rke/arcgis/rest/services/survey123_a77f33a9b9f649cfada5c7983c67874b_results/FeatureServer/0",
    },
    {
        "key": "niigata",
        "url": "https://services6.arcgis.com/SKz58fvdFlaEB35q/arcgis/rest/services/survey123_08d14b98657b47309b868f49602375c8_results/FeatureServer/0",
    },
    {
        "key": "toyama",
        "url": "https://services7.arcgis.com/pUdPpUsq83Kw8pWi/arcgis/rest/services/survey123_3f07f1f9864d43368d48b5f373d6cd68_results/FeatureServer/0",
    },
]

PAGE_SIZE = 2000


def page_params(offset: int) -> dict[str, Any]:
    return {
        "where": "1=1",
        "outFields": "*",
        "resultOffset": offset,
        "resultRecordCount": PAGE_SIZE,
        "f": "geojson",
    }


# Survey123 field mapping. All four prefectures use this schema for bear
# sightings (verified from Niigata sample; same Survey123 template across
# prefectures per the webmap resolution we did during design).
_TYPE_MAP = {
    "目撃": "sighting",      # sighting
    "痕跡": "trace",          # trace / sign (footprint, scat, claw marks)
    "人身被害": "injury",      # injury incident
    "捕獲": "capture",         # captured/culled
}


def _parse_count_ja(raw: str | None) -> int | None:
    """'3頭' → 3, '親1子2' → 3, otherwise None."""
    if not raw:
        return None
    # Sum all integer groups found (handles '親1子2' = 3).
    nums = [int(n) for n in re.findall(r"\d+", str(raw))]
    return sum(nums) if nums else None


def _parse_date_ms(raw: int | str | None) -> str | None:
    """ArcGIS Survey123 dates come as epoch-ms integers. → 'YYYY-MM-DD'."""
    if raw is None or raw == "":
        return None
    try:
        ms = int(raw)
    except (TypeError, ValueError):
        return None
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def parse_feature(feature: dict, pref_key: str) -> dict[str, Any]:
    geom = feature.get("geometry") or {}
    coords = geom.get("coordinates") or [None, None]
    props = feature.get("properties") or {}

    return {
        "pref": pref_key,
        "lat": coords[1],
        "lon": coords[0],
        "city": props.get("field_7"),
        "area": props.get("field_17"),
        "type": _TYPE_MAP.get((props.get("field_8") or "").strip(), "sighting"),
        "date": _parse_date_ms(props.get("field_20")),
        "time": props.get("field_21"),
        "count": _parse_count_ja(props.get("field_26")),
        "description": props.get("field_9"),
        "species": "black",  # all Honshu prefecture sources are Asian black bear
        "source": f"{pref_key}-arcgis",
    }


def fetch_all_features(client: httpx.Client, base_url: str) -> list[dict]:
    features: list[dict] = []
    offset = 0
    while True:
        resp = client.get(f"{base_url}/query", params=page_params(offset), timeout=60)
        resp.raise_for_status()
        data = resp.json()
        chunk = data.get("features", [])
        features.extend(chunk)
        if len(chunk) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return features


def main() -> int:
    ensure_dir(ARCGIS_RAW)
    errors = 0
    with httpx.Client(headers={"User-Agent": "bearstats-pipeline/0.1"}) as client:
        for src in SOURCES:
            try:
                print(f"[fetch] {src['key']} …", end="", flush=True)
                features = fetch_all_features(client, src["url"])
                out = ARCGIS_RAW / f"{src['key']}.geojson"
                out.write_text(
                    json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False),
                    encoding="utf-8",
                )
                print(f" {len(features):,} features → {out.name}")
            except httpx.HTTPError as e:
                errors += 1
                print(f" ERROR: {e}", file=sys.stderr)
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
