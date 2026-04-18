import json
from pathlib import Path

from fetch_arcgis import SOURCES, parse_feature, page_params


def test_sources_has_four_prefectures():
    keys = sorted(s["key"] for s in SOURCES)
    assert keys == ["gunma", "niigata", "saitama", "toyama"]


def test_page_params_first_page():
    p = page_params(offset=0)
    assert p["resultOffset"] == 0
    assert p["resultRecordCount"] == 2000
    assert p["where"] == "1=1"
    assert p["outFields"] == "*"
    assert p["f"] == "geojson"


def test_parse_feature_minimal_niigata():
    feature = {
        "geometry": {"type": "Point", "coordinates": [138.679, 37.252]},
        "properties": {
            "field_7": "長岡市",
            "field_8": "目撃",
            "field_17": "小国町山野田",
            "field_20": 1744081200000,
            "field_26": "3頭",
        },
    }
    record = parse_feature(feature, pref_key="niigata")
    assert record["pref"] == "niigata"
    assert record["lat"] == 37.252
    assert record["lon"] == 138.679
    assert record["city"] == "長岡市"
    assert record["type"] == "sighting"
    assert record["date"] == "2025-04-08"
    assert record["count"] == 3
    assert record["species"] == "black"
    assert record["source"] == "niigata-arcgis"


def test_parse_feature_survives_missing_optional_fields():
    feature = {
        "geometry": {"type": "Point", "coordinates": [139.0, 36.0]},
        "properties": {"field_7": "前橋市"},
    }
    record = parse_feature(feature, pref_key="gunma")
    assert record["pref"] == "gunma"
    assert record["city"] == "前橋市"
    assert record["date"] is None
    assert record["count"] is None
