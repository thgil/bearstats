from fetch_hokkaido import to_canonical_record


def test_to_canonical_record_sighting():
    raw = {
        "id": 15759,
        "lat": 43.5442,
        "lng": 144.2027,
        "foundDt": 1774969200000,  # epoch ms
        "witnessFlg": 1,
        "captureFlg": 0,
        "popupLabel": "14時00分頃目撃 道路を南から北へ横切り",
    }
    r = to_canonical_record(raw)
    assert r is not None
    assert r["pref"] == "hokkaido"
    assert r["species"] == "brown"
    assert r["source"] == "hokkaido-higumap"
    assert r["lat"] == 43.5442
    assert r["lon"] == 144.2027
    assert r["type"] == "sighting"  # witnessFlg=1 → sighting
    assert r["date"]  # non-empty ISO date string


def test_to_canonical_record_capture():
    raw = {
        "id": 15761,
        "lat": 42.4442,
        "lng": 140.0427,
        "foundDt": 1775142000000,
        "witnessFlg": None,
        "captureFlg": 1,
        "popupLabel": "",
    }
    r = to_canonical_record(raw)
    assert r["type"] == "capture"


def test_to_canonical_record_rejects_missing_coords():
    raw = {"id": 1, "lat": None, "lng": None,
           "foundDt": 0, "witnessFlg": None, "captureFlg": None}
    assert to_canonical_record(raw) is None


def test_to_canonical_record_default_type_when_both_flags_null():
    raw = {"id": 2, "lat": 43.0, "lng": 141.0,
           "foundDt": 1775000000000, "witnessFlg": None, "captureFlg": 0,
           "popupLabel": ""}
    r = to_canonical_record(raw)
    # Neither sighting flag nor capture flag → default to "sighting" (the common case)
    assert r["type"] == "sighting"
