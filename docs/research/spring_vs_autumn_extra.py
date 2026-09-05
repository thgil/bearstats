"""Permutation p-values and leave-FY2025-out sensitivity for the spring-vs-autumn correlations."""
import csv, random, statistics as st
CSV = "/Users/fergus/Projects/bearstats/data-pipeline/raw/research/moe/extracted/national-monthly-sightings-fy2013-fy2026.csv"
rows = {int(r["fy"]): r for r in csv.DictReader(open(CSV))}
def blk(r, ms): return sum(int(r[f"m{m:02d}"]) for m in ms)
yrs = [fy for fy in sorted(rows) if fy <= 2025]
spring = {fy: blk(rows[fy],[4,5,6]) for fy in yrs}
autumn = {fy: blk(rows[fy],[10,11]) for fy in yrs}
def pearson(x, y):
    mx, my = st.mean(x), st.mean(y)
    return sum((a-mx)*(b-my) for a,b in zip(x,y)) / (sum((a-mx)**2 for a in x)*sum((b-my)**2 for b in y))**0.5
def ranks(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); r=[0]*len(v)
    for p,i in enumerate(o): r[i]=p+1
    return r
def spearman(x,y): return pearson(ranks(x),ranks(y))
random.seed(1)
def perm_p(x, y, f, n=20000):
    obs = f(x,y); y2=list(y); k=0
    for _ in range(n):
        random.shuffle(y2); k += abs(f(x,y2)) >= abs(obs)
    return obs, k/n
for label, ys in [("all 13 complete years FY2013-25", yrs), ("excluding FY2025", [y for y in yrs if y!=2025]), ("excluding FY2023 and FY2025", [y for y in yrs if y not in (2023,2025)])]:
    x=[spring[y] for y in ys]; a=[autumn[y] for y in ys]; r=[autumn[y]/spring[y] for y in ys]
    pr,pp = perm_p(x,a,pearson); sr,sp = perm_p(x,a,spearman); rr,rp = perm_p(x,r,pearson)
    print(f"{label} (n={len(ys)}): spring vs Oct-Nov Pearson r={pr:+.2f} (perm p={pp:.3f}), Spearman rho={sr:+.2f} (p={sp:.3f}); spring vs Oct-Nov/spring ratio r={rr:+.2f} (p={rp:.3f})")
# Does spring being above the previous year predict Oct-Nov above the previous year?
print("\nContingency, 12 adjacent-year pairs: spring up/down vs Oct-Nov up/down")
c={}
for p,q in zip(yrs, yrs[1:]):
    key=("spring up" if spring[q]>spring[p] else "spring down", "autumn up" if autumn[q]>autumn[p] else "autumn down")
    c[key]=c.get(key,0)+1
for k in sorted(c): print(" ", k, c[k])
