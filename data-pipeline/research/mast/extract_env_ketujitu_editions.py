"""Extract every edition of the MoE national mast table (堅果類の着花結実情報について,
ketujitu.pdf) into one long CSV: prefecture x species x fiscal year x survey type.

Run from the repo root:
    data-pipeline/.venv/bin/python data-pipeline/research/mast/extract_env_ketujitu_editions.py

Inputs (git-ignored raw downloads):
    data-pipeline/raw/research/gaps/ketujitu-wb-<wayback-ts>.pdf   (six Wayback editions)
    data-pipeline/raw/research/mast/env-ketujitu.pdf               (live 2024-04-22 edition)
Output (tracked):
    data-pipeline/research/mast/env_ketujitu_by_prefecture_species_fy2017_fy2023.csv

Every value is read from a PDF on disk with pdfplumber table detection. The only manual
intervention is the two-cell merge in the 2020-10-23 edition described in MANUAL_FIXES,
where pdfplumber split one wrapped cell across two prefecture rows; the merge is verified
against `pdftotext -layout` output and flagged in the `method` column.
"""
from __future__ import annotations

import csv
import re
from collections import Counter, defaultdict
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[3]
RAW_GAPS = ROOT / "data-pipeline/raw/research/gaps"
RAW_MAST = ROOT / "data-pipeline/raw/research/mast"
OUT = ROOT / "data-pipeline/research/mast/env_ketujitu_by_prefecture_species_fy2017_fy2023.csv"

WB = "http://web.archive.org/web/{ts}id_/{scheme}://www.env.go.jp/nature/choju/effort/effort12/ketujitu.pdf"
LIVE = "https://www.env.go.jp/nature/choju/effort/effort12/ketujitu.pdf"

# Editions in chronological order (oldest first). publish_date is the date printed in the
# table header where there is one; otherwise the PDF CreationDate (pdfinfo, converted to JST),
# which `date_source` records.
EDITIONS = [
    dict(label="2016-10-26", publish_date="2016-10-26", date_source="header 平成28年10月26日",
         file=RAW_GAPS / "ketujitu-wb-20161223083532.pdf", url=WB.format(ts="20161223083532", scheme="http")),
    dict(label="2019-01-07", publish_date="2019-01-07", date_source="header 平成31年1月7日",
         file=RAW_GAPS / "ketujitu-wb-20190513220230.pdf", url=WB.format(ts="20190513220230", scheme="https")),
    dict(label="2020-10-23", publish_date="2020-10-23", date_source="pdf CreationDate (header undated)",
         file=RAW_GAPS / "ketujitu-wb-20201101095717.pdf", url=WB.format(ts="20201101095717", scheme="https")),
    dict(label="2021-11-01", publish_date="2021-11-01", date_source="header 令和３年11月１日時点",
         file=RAW_GAPS / "ketujitu-wb-20220630070835.pdf", url=WB.format(ts="20220630070835", scheme="https")),
    dict(label="2022-09-07", publish_date="2022-09-07", date_source="pdf CreationDate (header undated, marked 別添３)",
         file=RAW_GAPS / "ketujitu-wb-20221022220755.pdf", url=WB.format(ts="20221022220755", scheme="https")),
    dict(label="2023-04-21", publish_date="2023-04-21", date_source="pdf CreationDate (header undated; 青森 cell says 10/7時点)",
         file=RAW_GAPS / "ketujitu-wb-20230613164542.pdf", url=WB.format(ts="20230613164542", scheme="https")),
    dict(label="2024-04-22", publish_date="2024-04-22", date_source="header 令和６年４月22日時点",
         file=RAW_MAST / "env-ketujitu.pdf", url=LIVE),
]

ERA = {"H25": 2013, "H26": 2014, "H27": 2015, "H28": 2016, "H29": 2017, "H30": 2018,
       "H31": 2019, "R1": 2019, "R2": 2020, "R3": 2021, "R4": 2022, "R5": 2023}
SPECIES_EN = {"ブナ": "buna", "ミズナラ": "mizunara", "コナラ": "konara"}

PREF_EN = {
    "北海道": "Hokkaido", "青森": "Aomori", "岩手": "Iwate", "宮城": "Miyagi", "秋田": "Akita",
    "山形": "Yamagata", "福島": "Fukushima", "栃木": "Tochigi", "群馬": "Gunma", "埼玉": "Saitama",
    "東京": "Tokyo", "神奈川": "Kanagawa", "新潟": "Niigata", "富山": "Toyama", "石川": "Ishikawa",
    "福井": "Fukui", "山梨": "Yamanashi", "長野": "Nagano", "岐阜": "Gifu", "静岡": "Shizuoka",
    "愛知": "Aichi", "三重": "Mie", "滋賀": "Shiga", "京都": "Kyoto", "大阪": "Osaka", "兵庫": "Hyogo",
    "奈良": "Nara", "和歌山": "Wakayama", "鳥取": "Tottori", "島根": "Shimane", "岡山": "Okayama",
    "広島": "Hiroshima", "山口": "Yamaguchi",
}

# pdfplumber splits one wrapped cell of the 2020-10-23 edition across the 島根 and 岡山 rows:
# 島根 H29 ブナ comes out as "凶作（東\n部）\n並昨（西" and 岡山 H29 ブナ as "部）\n豊作".
# `pdftotext -layout` shows the 島根 row carries 凶作（東部）並昨（西部） and 岡山 carries 豊作.
MANUAL_FIXES = {
    ("2020-10-23", "島根", "ブナ", 2017, "fruiting"): "凶作（東部）並昨（西部）",
    ("2020-10-23", "岡山", "ブナ", 2017, "fruiting"): "豊作",
}

JOIN_WITH_SPACE = ("東部", "西部", "極小値", "（", "(")

# Notes attached to particular output rows (appended to `remarks`).
ROW_NOTES = {
    ("鳥取", 2021, "flowering"): "2021-11-01 edition: the 鳥取 row's 開花期 survey-period cell reads ①豊作②並作下③並作上 "
                                 "(probably the R3 flowering result entered in the wrong column); the R3開花状況 cells themselves are －. "
                                 "Recorded as printed, not moved.",
}


def clean(raw: str) -> str:
    """Join wrapped lines. A space is kept only where the next line starts a new clause."""
    parts = [p.strip() for p in raw.split("\n") if p.strip()]
    out = ""
    for p in parts:
        if out and p.startswith(JOIN_WITH_SPACE):
            out += " "
        out += p
    return out


NO_VALUE = {"", "－", "―", "-", "—"}
PENDING = re.compile(r"調査中|予定|整理中|取りまとめ中|集計中")
NOT_PUBLISHED = re.compile(r"公表しない|未公表|公表未定|未回答|不明")
NOT_SURVEYED = re.compile(r"調査未実施|未調査")
FORECAST = re.compile(r"予測")

# Ordered rules; the first regex that matches the cleaned text wins.
# Buckets follow the task brief: 大凶作 (incl. 皆無), 凶作 (incl. 不作), 並作, 豊作 (incl. 大豊作).
# Range cells use the MoE's own footnote rule printed under the 計 row of every edition:
# 「並作～豊作」は豊作、「凶作～並作」「凶作～豊作」「不作～並作」は並作、「不作」は凶作として集計.
RULES = [
    # cells whose headline category is followed by a parenthesised range or breakdown
    (r"^凶作（大凶作～並作下）$", "凶作", "headline before parenthesis"),
    (r"^並作下（凶作～並作上）$", "並作", "headline before parenthesis"),
    (r"^不作（東部：[^）]*）$", "凶作", "headline before parenthesis; 不作 counted as 凶作 (MoE rule)"),
    (r"^並作（東部：[^）]*）$", "並作", "headline before parenthesis"),
    (r"^全県：凶作 東部：不作 西部：凶作$", "凶作", "全県 value"),
    (r"^(大凶作|凶|並下) 極小値を基準", None, "hyogo-threshold"),  # handled below
    # exact single categories (optionally with a locality / footnote suffix)
    (r"^(皆無|大凶作)( ?[（(].*)?$", "大凶作", "exact"),
    (r"^(凶作|不作|やや凶作|凶)( ?[（(].*)?$", "凶作", "exact; 不作/やや凶作 counted as 凶作 (MoE rule)"),
    (r"^(並作|並上|並下|並作上|並作下|並作（上）|並作※|並昨)( ?[（(].*)?$", "並作", "exact; 並上/並下 are 並作 sub-grades"),
    (r"^(豊作|大豊作|豊～大豊作)( ?[（(].*)?$", "豊作", "exact; 大豊作 counted as 豊作"),
    # majority-of-sites wording (山形)
    (r"^ほとんどの箇所が豊作$|^豊作の箇所が多い$", "豊作", "majority wording"),
    (r"^ほとんどの箇所が凶作$|^凶作の箇所が多い$", "凶作", "majority wording"),
    (r"^並作の箇所が多い$", "並作", "majority wording"),
    # forecasts standing in for a result
    (r"^凶作予測$|^凶作（春調査時の予測）$", "凶作", "forecast stated in a result column"),
    # ranges named in the MoE footnote rule
    (r"^並作～豊作( ?[（(].*)?$", "豊作", "MoE rule 並作～豊作→豊作"),
    (r"^(凶作～並作|凶作～豊作|不作～並作|並作～不作|並作～凶作|凶作～並下)( ?[（(].*)?$", "並作", "MoE rule 凶作～並作/凶作～豊作/不作～並作→並作"),
    # ranges wholly inside one bucket
    (r"^(不作・凶作|不作～凶作|凶作～不作)$", "凶作", "range within 凶作/不作 bucket"),
    (r"^大凶作～不作$", "凶作", "range 大凶作～不作→凶作 (spans 大凶作/凶作 buckets; MoE's 計 row tallies 大凶作 as 凶作)"),
    (r"^(並下～並上|並下～並|並作～並上)$", "並作", "range within 並作 bucket"),
    (r"^(概ね並作～豊作)$", "豊作", "MoE rule 並作～豊作→豊作 (概ね ignored)"),
    # ranges spanning buckets: mapped to 並作 by analogy with the MoE rule for 凶作～豊作
    (r"^(大凶作～並作|大凶作～豊作|大凶作～大豊作|凶作～大豊作|不作～豊作|不作・並作|大凶～豊作|凶作～並作下)$", "並作", "range spanning buckets→並作 (by analogy with MoE rule)"),
    (r"^並（不作）$", "並作", "ambiguous 並（不作）: headline 並 taken"),
]


def normalise(text: str) -> tuple[str, str, str]:
    """Return (status, category, rule)."""
    if text in NO_VALUE:
        return "no_data", "", ""
    if NOT_SURVEYED.search(text):
        return "not_surveyed", "", ""
    if PENDING.search(text) and not FORECAST.search(text):
        return "pending", "", ""
    if NOT_PUBLISHED.search(text):
        return "not_published", "", ""
    if re.search(r"（東部）.*（西部）", text):
        return "ambiguous", "", "east/west split with different categories"
    if text.startswith(("大凶作 極小値", "凶 極小値", "並下 極小値")):
        head = text.split(" ")[0]
        cat = {"大凶作": "大凶作", "凶": "凶作", "並下": "並作"}[head]
        return "value", cat, "headline before threshold note"
    for pat, cat, rule in RULES:
        if cat and re.match(pat, text):
            status = "forecast" if FORECAST.search(text) else "value"
            return status, cat, rule
    return "ambiguous", "", "no rule matched"


def parse_edition(ed: dict) -> list[dict]:
    with pdfplumber.open(ed["file"]) as pdf:
        tables = pdf.pages[0].extract_tables()
    assert len(tables) == 1, ed["file"]
    t = tables[0]
    head0, head1 = t[0], t[1]
    # forward-fill the group header (【R2結実状況】 etc.) across its three species columns
    groups: list[str | None] = []
    cur = None
    for h in head0:
        if h:
            cur = h
        groups.append(cur)
    cols = []
    for j, (g, s) in enumerate(zip(groups, head1)):
        m = re.match(r"【(H\d+|R\d+)(結実|開花)状況】", (g or "").replace("\n", ""))
        if m and s in SPECIES_EN:
            cols.append((j, ERA[m.group(1)], m.group(1), "fruiting" if m.group(2) == "結実" else "flowering", s))
    remarks_col = len(head0) - 1
    assert "備" in (head0[remarks_col] or ""), ed["file"]
    rows = []
    for r in t[2:]:
        pref = (r[0] or "").replace("\n", "").strip()
        if pref == "計" or pref not in PREF_EN:
            continue
        remark = clean(r[remarks_col] or "")
        for j, fy, era, stype, sp in cols:
            raw = r[j] if r[j] is not None else ""
            key = (ed["label"], pref, sp, fy, stype)
            method = "pdfplumber extract_tables"
            if key in MANUAL_FIXES:
                raw = MANUAL_FIXES[key]
                method = "pdfplumber extract_tables; split cell re-merged by hand from pdftotext -layout"
            rows.append(dict(edition=ed["label"], prefecture=pref, species=sp, fiscal_year=fy,
                             era_label=era, survey_type=stype, raw=raw, remark=remark, method=method))
    return rows


def main() -> None:
    by_key: dict[tuple, list[dict]] = defaultdict(list)
    ed_by_label = {e["label"]: e for e in EDITIONS}
    for ed in EDITIONS:
        for row in parse_edition(ed):
            by_key[(row["prefecture"], row["species"], row["fiscal_year"], row["survey_type"])].append(row)

    pref_order = list(PREF_EN)
    sp_order = list(SPECIES_EN)
    out_rows = []
    for key in sorted(by_key, key=lambda k: (k[2], k[3] != "fruiting", pref_order.index(k[0]), sp_order.index(k[1]))):
        versions = by_key[key]  # already oldest→newest
        latest = versions[-1]
        text = clean(latest["raw"])
        status, cat, rule = normalise(text)
        earlier = []
        for v in versions[:-1]:
            if clean(v["raw"]) != text:
                earlier.append(f"{v['edition']}={clean(v['raw']) or '(blank)'}")
        ed = ed_by_label[latest["edition"]]
        pref, sp, fy, stype = key
        out_rows.append(dict(
            prefecture=pref, prefecture_en=PREF_EN[pref], species=sp, species_en=SPECIES_EN[sp],
            fiscal_year=fy, era_label=latest["era_label"], survey_type=stype,
            raw_text=latest["raw"].replace("\n", "\\n"), text_clean=text,
            status=status, category=cat, category_rule=rule,
            edition=latest["edition"], edition_count=len(versions),
            earlier_editions="; ".join(earlier),
            remarks="; ".join(x for x in (latest["remark"], ROW_NOTES.get((pref, fy, stype), "")) if x),
            method=latest["method"],
            source_file=str(ed["file"].relative_to(ROOT)), source_url=ed["url"],
            publish_date=ed["publish_date"], publish_date_source=ed["date_source"],
        ))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out_rows[0]))
        w.writeheader()
        w.writerows(out_rows)
    print(f"wrote {len(out_rows)} rows to {OUT}")
    print("status counts:", Counter(r["status"] for r in out_rows))
    amb = [r for r in out_rows if r["status"] == "ambiguous"]
    for r in amb:
        print("AMBIGUOUS:", r["prefecture"], r["species"], r["fiscal_year"], r["survey_type"], repr(r["text_clean"]), r["edition"])

    # Sanity check: recompute each edition's printed 計 row (豊作/並作/凶作 counts) from the
    # parsed cells with the normalisation above, and report how many columns match exactly.
    matched = total = 0
    for ed in EDITIONS:
        with pdfplumber.open(ed["file"]) as pdf:
            t = pdf.pages[0].extract_tables()[0]
        total_row = next(r for r in t if (r[0] or "").strip() == "計")
        rows = parse_edition(ed)
        groups, cur = [], None
        for h in t[0]:
            cur = h or cur
            groups.append(cur)
        print(f"\n== {ed['label']} printed 計 vs recomputed (豊/並/凶)")
        for j, (g, sp) in enumerate(zip(groups, t[1])):
            m = re.match(r"【(H\d+|R\d+)(結実|開花)状況】", (g or "").replace("\n", ""))
            if not (m and sp in SPECIES_EN):
                continue
            stype = "fruiting" if m.group(2) == "結実" else "flowering"
            c = Counter()
            for r in rows:
                if (r["era_label"], r["survey_type"], r["species"]) == (m.group(1), stype, sp):
                    st, cat, _ = normalise(clean(r["raw"]))
                    if st in ("value", "forecast") and cat:
                        c[{"大凶作": "凶作"}.get(cat, cat)] += 1
            pm = re.findall(r"(豊作|並作|凶作)\s*(\d+)", (total_row[j] or ""))
            printed = {k: int(v) for k, v in pm}
            mine = {"豊作": c["豊作"], "並作": c["並作"], "凶作": c["凶作"]}
            ok = printed == mine
            matched += ok
            total += 1
            flag = "" if ok else "   <-- differs"
            print(f"  {m.group(1):3s} {stype:9s} {sp:5s} printed {printed.get('豊作')}/{printed.get('並作')}/{printed.get('凶作')}  recomputed {mine['豊作']}/{mine['並作']}/{mine['凶作']}{flag}")
    print(f"\n計-row check: {matched}/{total} edition-columns match exactly")


if __name__ == "__main__":
    main()
