"""Shared helpers for the data pipeline."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path

# REPO_ROOT is the parent of the data-pipeline directory
REPO_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = REPO_ROOT / "data-pipeline" / "raw"
WEBAPP_DATA_DIR = REPO_ROOT / "webapp" / "data"


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
