import csv
OUT='/Users/fergus/Projects/bearstats/data-pipeline/research/mast/'
BASE='https://www.pref.toyama.jp/documents/21689/'
CODE={'豊作':4,'並作':3,'不作':2,'凶作':1}
# year -> (era, file, url, publish_date, basis, timing)
Y={
2015:('H27','no-figure_h27houkyou_20150828hp.pdf',BASE+'no-figure_h27houkyou_20150828hp.pdf','2015-08-28','date in file name (…_20150828hp)','ブナ 8月、ナラ 8月中下旬'),
2016:('H28','no-figure_h28houkyou_20160905hp.pdf',BASE+'no-figure_h28houkyou_20160905hp.pdf','2016-09-05','date in file name (…_20160905hp)','ブナ 8月、ナラ 8月中下旬'),
2017:('H29','no-figure_h29houkyou_20170906hp.pdf',BASE+'no-figure_h29houkyou_20170906hp.pdf','2017-09-06','date in file name (…_20170906hp)','ブナ 8月、ナラ 8月中下旬'),
2018:('H30','no-figure_h30houkyou_20180904hp.pdf',BASE+'no-figure_h30houkyou_20180904hp.pdf','2018-09-04','date in file name (…_20180904hp)','ブナ 8月、ナラ 8月中下旬'),
2019:('R1','no-figure_r1houkyou_20191011hp.pdf',BASE+'no-figure_r1houkyou_20191011hp.pdf','2019-10-11','date in file name (…_20191011hp)','ブナ 8月、ナラ 8月中下旬'),
2020:('R2','no-figure_r2houkyou_20200902hp.pdf',BASE+'no-figure_r2houkyou_20200902hp.pdf','2020-09-02','date in file name (…_20200902hp)','ブナ 8月、ナラ 8月中下旬'),
2021:('R3','r4koushin_r3houkyou_20220906.pdf',BASE+'r4koushin_r3houkyou_20220906.pdf','2021-09-07','original file name r3houkyou_20210907hp.pdf (Wayback CDX 2022-01-11); current file is the 2022-09-06 re-upload with figures removed, text identical','ブナ 8月、ナラ 8月中下旬'),
2022:('R4','r5koushin_r4_houkyoutyousa.pdf',BASE+'r5koushin_r4_houkyoutyousa.pdf','2022-09-06','inferred: R3 file re-uploaded as …_20220906 when R4 was posted; R4 PDF CreationDate 2022-09-01; Chubu Forest Office page of 2022-09-08 already cites it','ブナ 8月、ナラ 8月中下旬'),
2023:('R5','r5houkyoutyousa_rev.pdf',BASE+'r5houkyoutyousa_rev.pdf','2023-09-06','inferred: R4 file re-uploaded with PDF CreationDate 2023-09-06 when R5 was posted; Chubu Forest Office page of 2023-09-08 links it; file on disk is the revised copy (CreationDate 2024-09-05, maps removed per its PDF title)','ブナ 8月、ナラ 8月中下旬'),
2024:('R6','r6houkyou.pdf',BASE+'r6houkyou.pdf','2024-09-05','page 更新日 2024年9月5日 (Wayback snapshot 2024-09-06); PDF CreationDate 2024-09-05','ブナ７月下旬～８月、ナラ類８月中下旬'),
2025:('R7','r7houkyou.pdf',BASE+'r7houkyou.pdf','2025-09-04','page 更新日 2025年9月4日 (Wayback snapshot 2026-02-13); PDF CreationDate 2025-09-02','ブナ７月下旬～８月、ナラ類８月中下旬'),
2026:('R8','r8houkyou1.pdf',BASE+'r8houkyou1.pdf','2026-09-04','page 更新日 2026年9月4日 (live page, copy raw/research/mast/toyama-page.html); PDF CreationDate 2026-09-02','ブナ７月下旬～８月、ナラ類８月中下旬'),
}
SP={'buna':'ブナ','mizunara':'ミズナラ','konara':'コナラ'}
TEXT='pdftotext -layout text layer'
MAP='site-category symbols on the map figure read visually from the rendered page (pdftoppm 300-600 dpi, Read tool)'
rows=[]
def add(year,sp,region,cat,note='',sites='',trees='',ho='',na='',fu='',ky='',unres='',cm='',method=TEXT,extra='',src=None):
    era,f,u,pd,basis,timing=Y[year]
    if src: f,u,pd,basis=src
    rows.append(dict(year=year,era_year=era,species=sp,species_ja=SP[sp],region=region,category=cat,category_code=CODE.get(cat,''),
        site_note=note,survey_sites=sites,trees_surveyed=trees,n_sites_houasaku=ho,n_sites_namisaku=na,n_sites_fusaku=fu,n_sites_kyousaku=ky,
        n_sites_unresolved=unres,count_method=cm,survey_timing=timing,source_file='data-pipeline/raw/research/toyama/'+f,source_url=u,
        publish_date=pd,publish_date_basis=basis,method=method,note=extra))
P,E,W='prefecture','east','west'
# 2015 H27
add(2015,'buna',P,'並作','凶作だった昨年より良い',14,303,extra='14 sites (馬場島 not yet in the list)')
add(2015,'mizunara',P,'並作','凶作だった昨年より良い',16,368)
add(2015,'konara',P,'不作','並作だった昨年よりやや悪い',9,203)
# 2016 H28 (no prefecture-level category given for buna/mizunara)
add(2016,'buna',E,'凶作','全箇所で凶作',extra='no 全県 category printed for ブナ in 2016; prefecture summary says east same-or-worse than the H18/H22 outbreak years, west better')
add(2016,'buna',W,'不作','凶作から並作までばらつく')
add(2016,'buna',P,'','',15,324,extra='no 全県 category printed; 15 sites / 324 trees is the prefecture total')
add(2016,'mizunara',E,'凶作','全箇所で凶作')
add(2016,'mizunara',W,'不作','凶作から並作までばらつく')
add(2016,'mizunara',P,'','',16,366,extra='no 全県 category printed; 16 sites / 366 trees is the prefecture total')
add(2016,'konara',P,'不作','不作と並作の箇所がある',10,224,extra='text says 10箇所 but lists only 9 site names (三峯,魚津,東福寺野,吉峰,猿倉,頼成,医王山,倶利伽羅,五位)')
# 2017 H29
add(2017,'buna',P,'不作','凶作から並作までばらつく',15,323)
add(2017,'mizunara',E,'並作','不作と並作の箇所がある')
add(2017,'mizunara',W,'不作','凶作と不作の箇所がある')
add(2017,'mizunara',P,'','',16,366,extra='no 全県 category printed for ミズナラ in 2017')
add(2017,'konara',E,'並作','不作と並作の箇所がある')
add(2017,'konara',W,'不作','不作と並作の箇所がある')
add(2017,'konara',P,'','',10,221,extra='no 全県 category printed for コナラ in 2017')
# 2018 H30
add(2018,'buna',P,'並作','',15,327,extra='ブナ 標高800m以上に分布')
add(2018,'buna',E,'並作','不作、並作、豊作の箇所がある')
add(2018,'buna',W,'並作','凶作から豊作までばらつく')
add(2018,'mizunara',P,'並作','',16,369,extra='ミズナラ 標高400〜800mに分布')
add(2018,'mizunara',E,'不作','不作と並作の箇所がある')
add(2018,'mizunara',W,'並作','並作と豊作の箇所がある')
add(2018,'konara',P,'不作','',10,222,extra='コナラ 標高400m以下に分布')
add(2018,'konara',E,'不作','凶作、不作、並作の箇所がある')
add(2018,'konara',W,'並作','不作と並作の箇所がある')
# 2019 R1
add(2019,'buna',P,'凶作','全箇所で凶作',15,'',0,0,0,15,0,'text: 全箇所で凶作 over 15箇所')
add(2019,'mizunara',P,'凶作','',16)
add(2019,'mizunara',E,'不作','凶作から並作までばらつく')
add(2019,'mizunara',W,'凶作','全箇所で凶作')
add(2019,'konara',P,'不作','凶作から並作までばらつく',10)
# 2020 R2
add(2020,'buna',P,'凶作','1箇所を除き凶作',15,'','','','',14,1,'text: 1箇所を除き凶作 over 15箇所; the category of the one non-凶作 site is not stated',extra='first two consecutive ブナ 凶作 years since the survey began in 2005 (平成17年の調査開始以来初めて２年連続凶作)')
add(2020,'buna',E,'凶作','')
add(2020,'buna',W,'凶作','')
add(2020,'mizunara',P,'不作','凶作から並作までばらつく',16)
add(2020,'mizunara',E,'不作','')
add(2020,'mizunara',W,'不作','')
add(2020,'konara',P,'不作','凶作から並作までばらつく',10)
add(2020,'konara',E,'不作','凶作から並作までばらつく')
add(2020,'konara',W,'凶作','１箇所を除き凶作')
# 2021 R3 (map counts from the original 2021-09-07 file, Wayback copy)
R3SRC=('wb-r3houkyou_20210907hp.pdf','http://web.archive.org/web/20220111113855id_/https://www.pref.toyama.jp/documents/21689/r3houkyou_20210907hp.pdf','2021-09-07','date in original file name r3houkyou_20210907hp.pdf; Wayback capture 2022-01-11')
add(2021,'buna',P,'並作','不作から豊作までばらつく',15,'',2,9,4,0,0,MAP,extra='category and site list from the current text-only file; site counts from the map in the original 2021 file (Wayback copy)')
add(2021,'buna',E,'並作','',method=MAP,extra='east/west symbols shown in the map box of the original 2021 file (Wayback copy); text-only current file gives 全県 only',src=R3SRC)
add(2021,'buna',W,'並作','',method=MAP,extra='as above',src=R3SRC)
add(2021,'mizunara',P,'不作','凶作から並作までばらつく',16,'',0,3,11,1,1,MAP,extra='one of the three overlapping 有峰 symbols (猪根/峠谷/西岸) is hidden; 11 不作 counts only visible symbols')
add(2021,'mizunara',E,'不作','',method=MAP,extra='map box of the original 2021 file',src=R3SRC)
add(2021,'mizunara',W,'不作','',method=MAP,extra='map box of the original 2021 file',src=R3SRC)
add(2021,'konara',P,'不作','凶作から並作までばらつく',10,'',0,1,8,1,0,MAP)
add(2021,'konara',E,'不作','',method=MAP,extra='map box of the original 2021 file',src=R3SRC)
add(2021,'konara',W,'不作','',method=MAP,extra='map box of the original 2021 file',src=R3SRC)
# 2022 R4
add(2022,'buna',P,'不作','凶作から豊作までばらつく',15)
add(2022,'mizunara',P,'不作','凶作から並作までばらつく',16)
add(2022,'konara',P,'並作','不作から並作までばらつく',10)
# 2023 R5
add(2023,'buna',P,'不作','',15)
add(2023,'buna',E,'凶作','全箇所にて凶作')
add(2023,'buna',W,'不作','凶作、不作がばらつく')
add(2023,'mizunara',P,'不作','',16)
add(2023,'mizunara',E,'不作','凶作、不作がばらつく (brace covers east and west)')
add(2023,'mizunara',W,'不作','凶作、不作がばらつく (brace covers east and west)')
add(2023,'konara',P,'不作','',11,extra='氷見 added as 11th コナラ site')
add(2023,'konara',E,'並作','凶作、不作、並作がばらつく (brace covers east and west)')
add(2023,'konara',W,'不作','凶作、不作、並作がばらつく (brace covers east and west)')
# 2024 R6 (maps)
add(2024,'buna',P,'不作','',15,'',0,3,5,7,0,MAP)
add(2024,'buna',E,'不作','')
add(2024,'buna',W,'不作','')
add(2024,'mizunara',P,'並作','',16,'',1,11,4,0,0,MAP)
add(2024,'mizunara',E,'並作','')
add(2024,'mizunara',W,'並作','')
add(2024,'konara',P,'並作','',11,'',0,7,3,1,0,MAP)
add(2024,'konara',E,'並作','')
add(2024,'konara',W,'並作','')
# 2025 R7
add(2025,'buna',P,'凶作','全箇所で凶作',15,'',0,0,0,15,0,'text: ブナは全箇所で凶作; map shows 15 ×')
add(2025,'buna',E,'凶作','')
add(2025,'buna',W,'凶作','')
add(2025,'mizunara',P,'不作','ほとんどの箇所で凶作または不作（凶作３、不作11）',16,'',0,2,11,3,0,'text gives 凶作3, 不作11; remaining 2 read as 並作 from the map (医王山, 西赤尾)')
add(2025,'mizunara',E,'不作','')
add(2025,'mizunara',W,'不作','')
add(2025,'konara',P,'不作','',11,'',0,2,8,1,0,MAP)
add(2025,'konara',E,'不作','')
add(2025,'konara',W,'不作','')
# 2026 R8
add(2026,'buna',P,'豊作','',15,'',11,3,1,0,0,MAP,extra='report also says Apr-Aug 2026 bear sightings/outings were 261, above normal')
add(2026,'buna',E,'豊作','')
add(2026,'buna',W,'豊作','')
add(2026,'mizunara',P,'並作','',16,'',0,10,6,0,0,MAP)
add(2026,'mizunara',E,'並作','')
add(2026,'mizunara',W,'並作','')
add(2026,'konara',P,'並作','',11,'',0,10,1,0,0,MAP)
add(2026,'konara',E,'並作','')
add(2026,'konara',W,'並作','')
# retrospective outbreak-year rows quoted in the 2020 (R2) and 2018 (H30) reports
for yr in (2006,2010):
    for sp,cat in (('buna','凶作'),('mizunara','凶作'),('konara','不作')):
        era,f,u,pd,basis,timing=Y[2020]
        rows.append(dict(year=yr,era_year={2006:'H18',2010:'H22'}[yr],species=sp,species_ja=SP[sp],region=P,category=cat,category_code=CODE[cat],
            site_note='',survey_sites='',trees_surveyed='',n_sites_houasaku='',n_sites_namisaku='',n_sites_fusaku='',n_sites_kyousaku='',n_sites_unresolved='',count_method='',
            survey_timing='',source_file='data-pipeline/raw/research/toyama/'+f,source_url=u,publish_date=pd,publish_date_basis=basis,method=TEXT,
            note='retrospective: comparison table in the 2020 report (平成18,22、令和元年 県下全域: ブナ凶作 ミズナラ凶作 コナラ不作); same statement in the 2018 report'))
rows.sort(key=lambda r:(r['year'],['buna','mizunara','konara'].index(r['species']),[P,E,W].index(r['region'])))
cols=list(rows[0].keys())
with open(OUT+'toyama_mast_2015_2026.csv','w',newline='',encoding='utf-8') as fh:
    w=csv.DictWriter(fh,fieldnames=cols); w.writeheader(); w.writerows(rows)
print('main rows',len(rows))

# ---- site-level table for the four years with maps
EAST={'境川','嘉例沢','馬場島','立山桑谷','立山ブナ平','有峰下部','有峰祐延','有峰峠谷','平沢','芦峅寺','有峰猪根','有峰西岸','有峰東谷','桧峠','三峯','魚津','東福寺野','吉峰','猿倉'}
BOUND={'桧峠','猿倉'}
BUNA=['境川','嘉例沢','馬場島','立山桑谷','立山ブナ平','有峰下部','有峰祐延','有峰峠谷','大長谷','山の神','細尾峠','菅沼','ブナオ峠','大門山','医王山']
MIZU=['境川','嘉例沢','平沢','馬場島','芦峅寺','有峰猪根','有峰西岸','有峰峠谷','有峰東谷','桧峠','牛岳','大長谷','山の神','細尾峠','西赤尾','医王山']
KONA10=['三峯','魚津','東福寺野','吉峰','猿倉','頼成','閑乗寺','医王山','倶利伽羅','五位']
KONA11=KONA10+['氷見']
S={}
S[(2021,'buna')]=dict(zip(BUNA,['並作','並作','並作','並作','並作','不作','不作','不作','並作','不作','豊作','並作','並作','並作','豊作']))
S[(2021,'mizunara')]=dict(zip(MIZU,['不作','凶作','不作','不作','不作','不作','不作','','並作','不作','不作','不作','並作','不作','不作','並作']))
S[(2021,'konara')]=dict(zip(KONA10,['不作','不作','不作','不作','不作','不作','並作','不作','不作','凶作']))
S[(2024,'buna')]=dict(zip(BUNA,['凶作','凶作','不作','並作','不作','並作','並作','不作','凶作','凶作','凶作','凶作','不作','不作','凶作']))
S[(2024,'mizunara')]=dict(zip(MIZU,['不作','不作','並作','豊作','並作','並作','並作','並作','並作','不作','並作','並作','並作','並作','不作','並作']))
S[(2024,'konara')]=dict(zip(KONA11,['不作','並作','並作','並作','並作','並作','並作','並作','不作','不作','凶作']))
S[(2025,'buna')]=dict(zip(BUNA,['凶作']*15))
S[(2025,'mizunara')]=dict(zip(MIZU,['凶作','不作','不作','不作','不作','凶作','不作','不作','不作','凶作','不作','不作','不作','不作','並作','並作']))
S[(2025,'konara')]=dict(zip(KONA11,['不作','並作','凶作','不作','並作','不作','不作','不作','不作','不作','不作']))
S[(2026,'buna')]=dict(zip(BUNA,['豊作','豊作','豊作','並作','並作','豊作','不作','豊作','豊作','豊作','豊作','豊作','豊作','並作','豊作']))
S[(2026,'mizunara')]=dict(zip(MIZU,['不作','不作','並作','並作','並作','並作','並作','並作','並作','不作','不作','不作','並作','不作','並作','並作']))
S[(2026,'konara')]=dict(zip(KONA11,['並作','並作','並作','並作','並作','並作','並作','並作','並作','不作','並作']))
srows=[]
for (yr,sp),d in sorted(S.items()):
    era,f,u,pd,basis,timing=Y[yr]
    if yr==2021: f,u,pd,basis=R3SRC
    for site,cat in d.items():
        note=''
        if yr==2021 and sp=='mizunara' and site in ('有峰猪根','有峰西岸','有峰峠谷'):
            note='three 有峰 symbols overlap; two 不作 triangles visible, one symbol hidden - assignment among 猪根/西岸/峠谷 is by label adjacency, the hidden one is left blank'
        if yr==2021 and sp=='buna' and site in ('細尾峠','山の神'):
            note='細尾峠 filled circle and 山の神 triangle sit between the two labels; assignment by label position (symbol right of 細尾峠, symbol below-right of 山の神, same layout as the 2024 map)'
        if yr==2025 and sp=='buna': note='text confirms 全箇所で凶作'
        if yr==2025 and sp=='mizunara' and cat=='凶作': note='text confirms 凶作 3 sites'
        if site in BOUND: note=(note+'; ' if note else '')+'site lies on the 神通川 boundary line on the map; east/west assignment approximate'
        srows.append(dict(year=yr,era_year=era,species=sp,species_ja=SP[sp],site=site,region_from_map='east' if site in EAST else 'west',category=cat,category_code=CODE.get(cat,''),
            source_file='data-pipeline/raw/research/toyama/'+f,source_url=u,publish_date=pd,method=MAP,note=note))
with open(OUT+'toyama_mast_sites_2021_2026.csv','w',newline='',encoding='utf-8') as fh:
    w=csv.DictWriter(fh,fieldnames=list(srows[0].keys())); w.writeheader(); w.writerows(srows)
print('site rows',len(srows))
# consistency check: site tallies vs main table counts
from collections import Counter
for (yr,sp),d in sorted(S.items()):
    c=Counter(d.values()); m=[r for r in rows if r['year']==yr and r['species']==sp and r['region']==P][0]
    print(yr,sp,dict(c),'| main:',m['n_sites_houasaku'],m['n_sites_namisaku'],m['n_sites_fusaku'],m['n_sites_kyousaku'],m['n_sites_unresolved'],'sites',m['survey_sites'],len(d))
