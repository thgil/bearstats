"""Run every fetcher + extractor + build, in order.

Exit 0 only if every step succeeds. Individual fetcher failures continue
(we still want as much data as possible); build_json failure is fatal.
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
]


def main() -> int:
    any_failure = False
    for script in SCRIPTS:
        print(f"\n=== {script} ===")
        rc = subprocess.call([sys.executable, script])
        if rc != 0:
            if script == "build_json.py":
                print(f"FATAL: {script} failed (rc={rc})", file=sys.stderr)
                return rc
            print(f"[warn] {script} exited {rc}; continuing", file=sys.stderr)
            any_failure = True
    return 1 if any_failure else 0


if __name__ == "__main__":
    sys.exit(main())
