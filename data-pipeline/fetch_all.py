"""Run every fetcher + extractor + build, in order.

Exit 0 only if every step succeeds. Individual fetcher failures continue
(we still want as much data as possible); a build failure is fatal.
"""
from __future__ import annotations

import subprocess
import sys

SCRIPTS = [
    "fetch_env_go_jp.py",
    "extract_env_go_jp.py",
    "fetch_arcgis.py",
    "fetch_hokkaido.py",
    "fetch_geojson.py",
    "build_json.py",
    # Reads the tracked CSVs under research/ (no fetch step: those are built by
    # the extractors next to them, by hand, when a source publishes).
    "build_context.py",
]
BUILDS = {"build_json.py", "build_context.py"}


def main() -> int:
    any_failure = False
    for script in SCRIPTS:
        print(f"\n=== {script} ===")
        rc = subprocess.call([sys.executable, script])
        if rc != 0:
            if script in BUILDS:
                print(f"FATAL: {script} failed (rc={rc})", file=sys.stderr)
                return rc
            print(f"[warn] {script} exited {rc}; continuing", file=sys.stderr)
            any_failure = True
    return 1 if any_failure else 0


if __name__ == "__main__":
    sys.exit(main())
