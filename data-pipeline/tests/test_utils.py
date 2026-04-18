from pathlib import Path
from utils import REPO_ROOT, RAW_DIR, WEBAPP_DATA_DIR, sha256_of_file, utc_now_iso, ensure_dir
import tempfile


def test_repo_root_exists_and_is_bearstats():
    assert REPO_ROOT.name == "bearstats"
    assert (REPO_ROOT / "data-pipeline").is_dir()


def test_raw_dir_is_inside_repo():
    assert RAW_DIR == REPO_ROOT / "data-pipeline" / "raw"


def test_webapp_data_dir_is_inside_repo():
    assert WEBAPP_DATA_DIR == REPO_ROOT / "webapp" / "data"


def test_sha256_of_file_deterministic():
    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(b"hello world")
        path = Path(f.name)
    try:
        digest = sha256_of_file(path)
        assert digest == "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
    finally:
        path.unlink()


def test_utc_now_iso_format():
    result = utc_now_iso()
    assert result.endswith("Z")
    assert "T" in result
    assert len(result) == 20


def test_ensure_dir_creates_and_is_idempotent(tmp_path):
    target = tmp_path / "a" / "b" / "c"
    ensure_dir(target)
    assert target.is_dir()
    # calling again doesn't error
    ensure_dir(target)
    assert target.is_dir()
