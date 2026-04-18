from fetch_env_go_jp import historical_injury_urls, current_pdf_urls


def test_historical_injury_urls_covers_h28_to_r07():
    urls = historical_injury_urls()
    codes = [u.split("/")[-1] for u in urls]
    assert "r07injury-qe.pdf" in codes
    assert "h28injury-qe.pdf" in codes
    # 10 years total: h28, h29, h30, r01..r07
    assert len(urls) == 10


def test_historical_urls_use_effort12_path():
    for u in historical_injury_urls():
        assert "/effort12/" in u
        assert u.startswith("https://www.env.go.jp/")


def test_current_pdf_urls_has_three_files():
    urls = current_pdf_urls()
    names = sorted(u.split("/")[-1] for u in urls)
    assert names == ["capture-qe.pdf", "injury-qe.pdf", "syutubotu.pdf"]
