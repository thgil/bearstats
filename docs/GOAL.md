# Goal

Bearstats answers one question for a reader in September 2026:

> **Is Japan's bear problem getting worse, and what will decide this autumn?**

Everything on the page exists to answer that. Anything that does not is cut.

## The claims the page makes, and what has to prove each one

| # | Claim | Evidence we have | Evidence we still need |
|---|---|---|---|
| 1 | Fiscal 2025 (Apr 2025 to Mar 2026) was the worst year on record: 50,801 sightings, 238 injured, 13 killed. | MoE monthly sightings FY2022-26; MoE injuries/deaths FY2008-26. | Nothing. Proven. |
| 2 | The surge was concentrated in autumn 2025 and in Tohoku (Akita + Iwate = 46%). | MoE prefecture totals; MoE prefecture x month table FY2013-26 (extracted 2026-09-05). Oct+Nov 2025 = 52% of the year; Tohoku = 75% of that. | Nothing. Proven. |
| 3 | Fiscal 2026 is running ahead: Apr-Jun sightings +67% on the same months of FY2025. | MoE monthly. | Nothing. Proven. Extended 2026-09-05: Akita, Miyagi and the four point-data prefectures show July and August 2026 below 2025 (Akita 904/251 vs 1,055/766). Iwate not comparable. |
| 4 | Spring does not predict autumn (FY2024 was ahead of FY2025 in June and finished at 40%). | MoE monthly FY2013-26 (13 closed years, recovered from archived editions). Oct+Nov / Apr-Jun ranged 0.23 to 3.49; spring vs full year r = +0.72. | Nothing. Partly supported as worded: spring does not set the autumn spike but does set a floor. |
| 5 | Autumn surges follow failed beech/oak mast crops (2023, 2025). | Tohoku Regional Forest Office beech index 2012-2025 (70 prefecture-years, forecast and actual); Akita five-site 2002-2025; Miyagi 1998-2025; Toyama 2015-2026; MoE prefecture x species table FY2013-23. Index vs national October rho = -0.74 (n = 13). | Fiscal 2025 oak categories for Akita and Iwate (MoE table ends FY2023). Supported for beech; acorns only for Fukushima and Toyama. |
| 6 | Mast failure is linked to weather (a hot, dry summer the year before; heavy flowering the year before that). | JMA monthly for six stations 2009-2026, tested against the Akita index (n = 16): prior-summer temperature rho = +0.45, sign opposite to the claim; rainfall no relationship. Alternate bearing is the regularity: 22 of 23 good autumns followed by a poor one. | Nothing. Weather half not supported and removed from the page; alternate-bearing half supported. |
| 7 | The baseline has shifted: bear population ~15,000 (2012) to ~54,000 (2025); hunters >70,000 (1970s) to <20,000. | MoE licence holders 1975-2021 (517,800 to 213,400; gun 493,700 to 84,400); MoE draft guideline population table by prefecture (surveys 1991-2024); captures FY2008-26. | Nothing primary remains; the 70,000/20,000 hunter figure and the 15,000-to-54,000 population comparison were found to be unsourced or not like-for-like and are off the page. |
| 8 | Casualties have not risen with sightings in 2026 (53 vs 55 injured, 6 vs 4 killed). | MoE YTD. | Nothing. Proven, and must be stated with the caveat that counts are small. |

## What "worse" means on this page

"Worse" is measured three ways, each with its own chart, and the page says which one it is talking about every time:

1. **Encounters**: sightings per month, compared with the same month of the previous year.
2. **Harm**: people injured and killed, compared with the same window of the previous year.
3. **Risk for the autumn ahead**: the mast index for the current year, and the weather that drives it.

## Definition of done

- Every number on the page has a source and a date window next to it.
- Every claim in the table above is either backed by a chart of primary data or is removed.
- The page has been reviewed at 360, 390 and 430 px wide and at 660 and 844 px tall (phone with and without browser toolbars) and at 1280 and 1920 wide, with screenshots of every scroll step, before any deploy.
- No text overlaps any other text or any chart at those sizes. Body text contrast is at least 7:1.
- Charts are never shown empty. If an animation has not played, the finished state is shown.
- Every chart passes the stranger test on its own, with the caption covered: it says inside the SVG what one mark is, what each axis measures and in what unit (tick labels and a title), and what each colour means (a legend whenever there is more than one). Callouts carry a number and a subject. The reviewer writes one sentence per chart answering "could a stranger tell what x, y and colour mean?" before deploying.
- The page is updated within a day of the Ministry of the Environment publishing new monthly figures, by running the pipeline.
