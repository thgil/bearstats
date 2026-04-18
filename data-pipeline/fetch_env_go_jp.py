"""Fetch bear-related PDFs from the Japan Ministry of the Environment.

Source landing page:
  https://www.env.go.jp/nature/choju/effort/effort12/effort12.html

Downloads to raw/env/*.pdf. Idempotent via sha256: if a fresh download
differs from the cached copy, we keep the new one.
"""
from __future__ import annotations

import sys
from pathlib import Path

import httpx

from utils import RAW_DIR, ensure_dir, sha256_of_file

BASE = "https://www.env.go.jp/nature/choju/effort/effort12"
ENV_RAW = RAW_DIR / "env"


def historical_injury_urls() -> list[str]:
    """Ten yearly injury PDFs: H28, H29, H30, R01..R07."""
    codes = ["h28", "h29", "h30"] + [f"r0{n}" for n in range(1, 8)]
    return [f"{BASE}/{code}injury-qe.pdf" for code in codes]


def current_pdf_urls() -> list[str]:
    """Current-fiscal-year sightings, captures, injuries."""
    return [
        f"{BASE}/injury-qe.pdf",
        f"{BASE}/syutubotu.pdf",
        f"{BASE}/capture-qe.pdf",
    ]


def download(client: httpx.Client, url: str, dest_dir: Path) -> Path:
    filename = url.rsplit("/", 1)[-1]
    dest = dest_dir / filename
    tmp = dest.with_suffix(dest.suffix + ".tmp")

    resp = client.get(url, follow_redirects=True, timeout=60)
    resp.raise_for_status()
    tmp.write_bytes(resp.content)

    if dest.exists() and sha256_of_file(dest) == sha256_of_file(tmp):
        tmp.unlink()
        print(f"[unchanged] {filename}")
    else:
        tmp.replace(dest)
        print(f"[saved]     {filename} ({len(resp.content):,} bytes)")
    return dest


def main() -> int:
    ensure_dir(ENV_RAW)
    urls = current_pdf_urls() + historical_injury_urls()
    errors: list[str] = []
    with httpx.Client(headers={"User-Agent": "bearstats-pipeline/0.1"}) as client:
        for url in urls:
            try:
                download(client, url, ENV_RAW)
            except httpx.HTTPError as e:
                errors.append(f"{url}: {e}")
                print(f"[error]     {url}: {e}", file=sys.stderr)
    if errors:
        print(f"\n{len(errors)} source(s) failed; see above.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
