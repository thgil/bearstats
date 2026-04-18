"""Download and normalize Japan prefecture GeoJSON boundaries for the webapp."""
from __future__ import annotations

import json
import re
import sys

import httpx

from extract_env_go_jp import PREFECTURE_KEYS, PREFECTURE_ORDER_JA
from utils import WEBAPP_DATA_DIR, ensure_dir

SOURCE = "https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson"
OUTPUT = WEBAPP_DATA_DIR / "japan-prefectures.geo.json"

# Build a map from "short" Japanese name (no 県/都/府/道 suffix) → canonical long name.
_JA_SHORT_TO_LONG: dict[str, str] = {}
for long in PREFECTURE_ORDER_JA:
    short = re.sub(r"[県都府道]$", "", long) if long != "北海道" else "北海道"
    _JA_SHORT_TO_LONG[short] = long
    # Also allow the long form itself as a key, in case upstream already uses it.
    _JA_SHORT_TO_LONG[long] = long


def normalize(feature_collection: dict) -> dict:
    out_features: list[dict] = []
    for feat in feature_collection.get("features", []):
        props = feat.setdefault("properties", {})
        nam_ja = (props.get("nam_ja") or "").strip()
        long_ja = _JA_SHORT_TO_LONG.get(nam_ja)
        if long_ja is None:
            raise ValueError(f"unrecognized prefecture in upstream geojson: {nam_ja!r}")
        idx = PREFECTURE_ORDER_JA.index(long_ja)
        key = PREFECTURE_KEYS[idx]
        props["code"] = key
        props["name_ja"] = long_ja
        props["name_en"] = key.capitalize()
        out_features.append(feat)
    if len(out_features) != 47:
        raise ValueError(f"expected 47 features, got {len(out_features)}")
    return {"type": "FeatureCollection", "features": out_features}


def main() -> int:
    ensure_dir(WEBAPP_DATA_DIR)
    with httpx.Client(headers={"User-Agent": "bearstats-pipeline/0.1"}) as client:
        resp = client.get(SOURCE, timeout=60)
        resp.raise_for_status()
    fc = normalize(resp.json())
    OUTPUT.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    print(f"[wrote] {OUTPUT.relative_to(WEBAPP_DATA_DIR.parent.parent)} "
          f"({len(fc['features'])} features)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
