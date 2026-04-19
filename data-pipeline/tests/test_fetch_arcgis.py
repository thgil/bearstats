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


def test_parse_feature_niigata_schema():
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
    assert record["city"] == "長岡市"
    assert record["type"] == "sighting"
    # 1744081200000ms → 2025-04-08 JST
    assert record["date"] == "2025-04-08"
    assert record["count"] == 3
    assert record["source"] == "niigata-arcgis"


def test_parse_feature_gunma_schema_uses_field_11_18():
    """Gunma: city=field_11, type=field_8 (int), date=field_18."""
    feature = {
        "geometry": {"type": "Point", "coordinates": [139.0, 36.5]},
        "properties": {
            "field_11": "安中市松井田町",
            "field_8": 1,             # integer sighting
            "field_18": 1715310000000,
        },
    }
    record = parse_feature(feature, pref_key="gunma")
    assert record["city"] == "安中市松井田町"
    assert record["type"] == "sighting"
    assert record["date"] == "2024-05-10"
    assert record["source"] == "gunma-arcgis"


def test_parse_feature_saitama_schema_uses_field_1_4_10():
    """Saitama: city=field_4, type=field_10 (int), date=field_1."""
    feature = {
        "geometry": {"type": "Point", "coordinates": [139.3, 36.0]},
        "properties": {
            "field_4": "越生町",
            "field_10": 1,
            "field_1": 1712804400000,
        },
    }
    record = parse_feature(feature, pref_key="saitama")
    assert record["city"] == "越生町"
    assert record["type"] == "sighting"
    assert record["date"] == "2024-04-11"
    assert record["source"] == "saitama-arcgis"


def test_parse_feature_toyama_schema_uses_named_fields():
    """Toyama uses named fields: HasseiCity, HoukokuType, HasseiDateTime, BearAdult/Young/Unknown."""
    feature = {
        "geometry": {"type": "Point", "coordinates": [137.2, 36.7]},
        "properties": {
            "HasseiCity": "黒部市",
            "HoukokuType": "目撃",
            "HasseiDateTime": 1768865100000,
            "HasseiArea": "黒部市宇奈月温泉",
            "BearAdult": 0,
            "BearYoung": 1,
            "BearUnknown": 0,
        },
    }
    record = parse_feature(feature, pref_key="toyama")
    assert record["city"] == "黒部市"
    assert record["type"] == "sighting"
    assert record["date"] == "2026-01-20"
    assert record["count"] == 1
    assert record["source"] == "toyama-arcgis"


def test_parse_feature_survives_missing_optional_fields():
    """Missing properties should yield None where appropriate, not crash."""
    feature = {
        "geometry": {"type": "Point", "coordinates": [139.0, 36.0]},
        "properties": {"field_11": "前橋市"},
    }
    record = parse_feature(feature, pref_key="gunma")
    assert record["pref"] == "gunma"
    assert record["city"] == "前橋市"
    assert record["date"] is None
    assert record["count"] is None
