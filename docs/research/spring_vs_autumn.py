"""Spring-vs-autumn test on national monthly bear-sighting counts (MoE syutubotu.pdf).
Input: data-pipeline/raw/research/moe/extracted/national-monthly-sightings-fy2013-fy2026.csv
(built by data-pipeline/raw/research/moe/extracted/extract_national_monthly.py from the
live PDF and three Wayback snapshots; each year's 12 months checked against the printed 合計).
FY2022-FY2026 are identical to webapp/data/national-timeline.json 'monthly.sightings'."""
import csv, json, statistics as st
CSV = "/Users/fergus/Projects/bearstats/data-pipeline/raw/research/moe/extracted/national-monthly-sightings-fy2013-fy2026.csv"
JSON = "/Users/fergus/Projects/bearstats/webapp/data/national-timeline.json"
rows = {int(r["fy"]): r for r in csv.DictReader(open(CSV))}
nt = json.load(open(JSON))

# cross-check the CSV against the webapp JSON for the overlapping years
for fy, vals in nt["monthly"]["sightings"].items():
    r = rows[int(fy)]
    csv_vals = [int(r[f"m{m:02d}"]) for m in nt["monthly"]["months"]][:len(vals)]
    assert csv_vals == vals, (fy, csv_vals, vals)
print("CSV matches national-timeline.json for FY2022-FY2026: OK")

def blk(r, months): return sum(int(r[f"m{m:02d}"]) for m in months)
tab = []
for fy in sorted(rows):
    r = rows[fy]
    spring, summer, autumn = blk(r,[4,5,6]), blk(r,[7,8,9]), blk(r,[10,11])
    full = blk(r,[4,5,6,7,8,9,10,11,12,1,2,3])
    tab.append(dict(fy=fy, spring=spring, summer=summer, autumn=autumn, full=full,
                    winter=full-spring-summer-autumn,
                    aut_spr=autumn/spring, full_spr=full/spring, aut_share=autumn/full if full else float("nan"),
                    complete=(fy != 2026), source=r["source"], printed_total=int(r["printed_total"])))

print("\n| FY | Apr-Jun | Jul-Sep | Oct-Nov | Dec-Mar | Full year | Oct-Nov / Apr-Jun | Full / Apr-Jun | Oct-Nov share of year | Source edition |")
print("|---|---:|---:|---:|---:|---:|---:|---:|---:|---|")
for t in tab:
    note = "" if t["full"] == t["printed_total"] else f" (printed 合計 {t['printed_total']:,})"
    if not t["complete"]:
        print(f"| {t['fy']} (Apr-Jun only) | {t['spring']:,} | - | - | - | {t['full']:,} so far | - | - | - | {t['source']} |")
    else:
        print(f"| {t['fy']} | {t['spring']:,} | {t['summer']:,} | {t['autumn']:,} | {t['winter']:,} | {t['full']:,}{note} | {t['aut_spr']:.2f} | {t['full_spr']:.2f} | {t['aut_share']:.0%} | {t['source']} |")

comp = [t for t in tab if t["complete"]]
def pearson(x, y):
    mx, my = st.mean(x), st.mean(y)
    sxy = sum((a-mx)*(b-my) for a,b in zip(x,y))
    sxx = sum((a-mx)**2 for a in x); syy = sum((b-my)**2 for b in y)
    return sxy / (sxx*syy) ** 0.5
def ranks(v):
    order = sorted(range(len(v)), key=lambda i: v[i]); rk=[0]*len(v)
    for pos,i in enumerate(order): rk[i]=pos+1
    return rk
def spearman(x, y): return pearson(ranks(x), ranks(y))

for label, sub in [("FY2013-FY2025 (13 complete years)", comp), ("FY2022-FY2025 (the 4 years on the site)", [t for t in comp if t["fy"]>=2022])]:
    x=[t["spring"] for t in sub]; ya=[t["autumn"] for t in sub]; yr=[t["aut_spr"] for t in sub]; yf=[t["full"] for t in sub]
    print(f"\n{label}: n={len(sub)}")
    print(f"  Pearson r  spring vs Oct-Nov  = {pearson(x,ya):+.2f};  Spearman rho = {spearman(x,ya):+.2f}")
    print(f"  Pearson r  spring vs full year = {pearson(x,yf):+.2f};  Spearman rho = {spearman(x,yf):+.2f}")
    print(f"  Pearson r  spring vs (Oct-Nov/spring ratio) = {pearson(x,yr):+.2f};  Spearman rho = {spearman(x,yr):+.2f}")
    print(f"  Oct-Nov/Apr-Jun ratio: min {min(yr):.2f} (FY{sub[yr.index(min(yr))]['fy']}), median {st.median(yr):.2f}, max {max(yr):.2f} (FY{sub[yr.index(max(yr))]['fy']})")

# spring rank vs autumn rank, 13 complete years
print("\nRank of each complete year by Apr-Jun count vs by Oct-Nov count (1 = highest):")
xs=[t["spring"] for t in comp]; ys=[t["autumn"] for t in comp]
rs=ranks([-v for v in xs]); ra=ranks([-v for v in ys])
print("| FY | Apr-Jun | rank | Oct-Nov | rank |"); print("|---|---:|---:|---:|---:|")
for t,a,b in zip(comp,rs,ra): print(f"| {t['fy']} | {t['spring']:,} | {a} | {t['autumn']:,} | {b} |")

# adjacent-year pairs where spring was up but autumn down, or vice versa
print("\nYear-on-year direction of Apr-Jun vs Oct-Nov:")
agree=0; pairs=0
for p,q in zip(comp, comp[1:]):
    ds = q["spring"]-p["spring"]; da = q["autumn"]-p["autumn"]; pairs+=1; agree += (ds>0)==(da>0)
    print(f"  FY{p['fy']}->FY{q['fy']}: spring {'+' if ds>0 else ''}{ds:,} ({ds/p['spring']:+.0%}), Oct-Nov {'+' if da>0 else ''}{da:,} ({da/p['autumn']:+.0%}) {'same direction' if (ds>0)==(da>0) else 'OPPOSITE'}")
print(f"  same direction in {agree} of {pairs} adjacent-year pairs")

# FY2026 what-if
s26 = next(t for t in tab if t["fy"]==2026)["spring"]
print(f"\nFY2026 Apr-Jun = {s26:,}. Comparison with each prior year's Apr-Jun, and WHAT-IF (not a forecast): FY2026 Oct-Nov and full year if FY2026 repeated that year's ratios")
print("| Prior FY | Its Apr-Jun | FY2026 Apr-Jun vs it | Its Oct-Nov/Apr-Jun | What-if FY2026 Oct-Nov | Its Full/Apr-Jun | What-if FY2026 full year |")
print("|---|---:|---:|---:|---:|---:|---:|")
wa=[]; wf=[]
for t in comp:
    a = s26*t["aut_spr"]; f = s26*t["full_spr"]; wa.append((a,t["fy"])); wf.append((f,t["fy"]))
    print(f"| {t['fy']} | {t['spring']:,} | {s26/t['spring']:.2f}x ({s26/t['spring']-1:+.0%}) | {t['aut_spr']:.2f} | {a:,.0f} | {t['full_spr']:.2f} | {f:,.0f} |")
print(f"\nWhat-if range for FY2026 Oct-Nov: {min(wa)[0]:,.0f} (FY{min(wa)[1]} ratio) to {max(wa)[0]:,.0f} (FY{max(wa)[1]} ratio); median {st.median([a for a,_ in wa]):,.0f}")
print(f"What-if range for FY2026 full year: {min(wf)[0]:,.0f} (FY{min(wf)[1]} ratio) to {max(wf)[0]:,.0f} (FY{max(wf)[1]} ratio); median {st.median([f for f,_ in wf]):,.0f}")
print(f"Using only the 4 site years FY2022-25: Oct-Nov {min(a for a,y in wa if y>=2022):,.0f}-{max(a for a,y in wa if y>=2022):,.0f}; full year {min(f for f,y in wf if y>=2022):,.0f}-{max(f for f,y in wf if y>=2022):,.0f}")
print(f"For scale: FY2025 actual Oct-Nov = {next(t for t in comp if t['fy']==2025)['autumn']:,}, full year = 50,801; FY2026 Apr-Jun already exceeds full-year FY2013 ({rows[2013]['printed_total']}) and FY2015 ({rows[2015]['printed_total']})")
