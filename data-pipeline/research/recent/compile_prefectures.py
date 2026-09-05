"""Print the coverage-weighted national preliminary for the months the ministry
has not yet published, from research/recent/prefectures_fy2026.csv (the
prefectural FY2026 compilation, one row per prefecture per fiscal month) and
research/moe/sightings-by-prefecture-by-month-by-fy.csv (the ministry's table,
which supplies every FY2025 figure).

For each such month it lists the comparable prefectures whose source is dated
on or after the month's end, those prefectures' share of the ministry's FY2025
national total for the month, the sum of their FY2026 counts, the sum of their
FY2025 counts, and the ratio. The arithmetic lives in build_context.py
(build_prefectures_fy2026) so context.json and this printout cannot drift.

    data-pipeline/.venv/bin/python data-pipeline/research/recent/compile_prefectures.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))  # data-pipeline/

from build_context import FISCAL_MONTHS, build_prefectures_fy2026  # noqa: E402

PREF_CSV = HERE / "prefectures_fy2026.csv"
MOE_CSV = HERE.parent / "moe" / "sightings-by-prefecture-by-month-by-fy.csv"


def main(months: list[int] | None = None) -> int:
    pref_df = pd.read_csv(PREF_CSV)
    moe_df = pd.read_csv(MOE_CSV)
    prefectures, preliminary = build_prefectures_fy2026(moe_df, pref_df)
    by_key = {p["pref"]: p for p in prefectures}

    print(f"prefectures in compilation: {len(prefectures)} "
          f"({sum(p['comparable'] for p in prefectures)} comparable)")
    for m_s, entry in preliminary.items():
        m = int(m_s)
        if months and m not in months:
            continue
        i = FISCAL_MONTHS.index(m)
        print(f"\n== FY2026 month {m} (2026-{m:02d}) ==")
        print(f"  comparable prefectures with a complete month: {len(entry['prefectures'])}")
        for k in entry["prefectures"]:
            p = by_key[k]
            print(f"    {k:<10} {p['pref_ja']}  2026={p['fy2026'][i]:>5}  2025={p['fy2025'][i]:>5}  as_of={p['as_of']}")
        print(f"  FY2025 share of national total for the month: "
              f"{entry['coverage_share_fy2025']:.4f}  ({entry['sum_2025']} of {entry['national_fy2025']})")
        print(f"  sum FY2026 = {entry['sum_2026']}")
        print(f"  sum FY2025 = {entry['sum_2025']}")
        print(f"  ratio FY2026/FY2025 = {entry['ratio']:.4f}")
        left_out = [p for p in prefectures if p["pref"] not in entry["prefectures"]]
        print("  left out: " + ", ".join(
            f"{p['pref']} ({'not comparable' if not p['comparable'] else 'no value' if p['fy2026'][i] is None else 'month incomplete, as_of ' + str(p['as_of'])})"
            for p in left_out))
    return 0


if __name__ == "__main__":
    sys.exit(main([int(a) for a in sys.argv[1:]] or None))
