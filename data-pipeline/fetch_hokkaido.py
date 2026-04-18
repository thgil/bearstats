"""Fetch Hokkaido brown bear (ヒグマ) sightings from higumap.info.

https://higumap.info/ — recent-3-months field-verified sighting reports.
Separate species from env.go.jp Asian black bear data; keep isolated.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from typing import Any

import httpx

from utils import RAW_DIR, ensure_dir

HOK_RAW = RAW_DIR / "hokkaido"
HIGUMAP_DATA_URL = "https://higumap.info/recent/reportsJson"


def _parse_date_ms(raw: int | None) -> str | None:
    if raw is None or raw == 0:
        return None
    try:
        ms = int(raw)
    except (TypeError, ValueError):
        return None
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def to_canonical_record(raw: dict[str, Any]) -> dict[str, Any] | None:
    try:
        lat = float(raw.get("lat"))
        lon = float(raw.get("lng"))
    except (TypeError, ValueError):
        return None

    capture_flg = raw.get("captureFlg")
    witness_flg = raw.get("witnessFlg")

    if capture_flg == 1:
        record_type = "capture"
    else:
        record_type = "sighting"

    return {
        "pref": "hokkaido",
        "lat": lat,
        "lon": lon,
        "city": None,  # higumap doesn't publish city-level data
        "type": record_type,
        "date": _parse_date_ms(raw.get("foundDt")),
        "count": None,
        "species": "brown",
        "source": "hokkaido-higumap",
        "description": raw.get("popupLabel") or None,
    }


def main() -> int:
    ensure_dir(HOK_RAW)
    with httpx.Client(headers={"User-Agent": "bearstats-pipeline/0.1"}) as client:
        resp = client.get(HIGUMAP_DATA_URL, timeout=60)
        resp.raise_for_status()
        payload = resp.json()

    raw_rows = payload.get("list", [])
    records = [r for r in (to_canonical_record(x) for x in raw_rows) if r is not None]
    print(f"[hokkaido] {len(raw_rows):,} raw, {len(records):,} with coords")

    out = HOK_RAW / "higuma.json"
    out.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    print(f"[wrote]    {out.relative_to(HOK_RAW.parent.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
