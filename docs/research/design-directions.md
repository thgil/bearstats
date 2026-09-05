# Design research: three visual directions for bearstats

Companion to `docs/GOAL.md`. This file does not add data sources — it is
design/typography/layout research for the presentation layer only. No PDFs
or CSVs were downloaded for this domain (per instructions); nothing here
should be read as a data claim.

## Method and honesty notes

A prior sweep used a real Chrome instance (chrome-devtools MCP) to navigate
to six comparison sites and read **computed CSS** (font-family, font-size,
font-weight, color) directly from the live DOM, plus screenshots at desktop
and mobile (390x844) widths — rather than working from memory. Reuters,
Bloomberg, and the SCMP multimedia subdomain actively blocked the automated
browser (explicit bot walls / slide captcha); those three are marked
`[guess]`/blocked below and are kept separate from verified facts. No color
value or number below is invented; anything not fetched this session is
explicitly labeled as background/unverified.

Current bearstats baseline, read directly from `webapp/styles.css` for
contrast: background `#0f1419`, elevated panel `#1a1f2e`, text `#e8e8ea`,
accent red `#ff3b30`/`#ff5e3a`, Inter font throughout, 12px-radius cards
used for both the scroll step text and the sticky chart panel (a card
nested inside a card). This reads as a competent but generic "dark SaaS
dashboard" — the red accent in particular reads as a default choice, not a
considered one, and does not distinguish "sightings" from "injuries/deaths"
as separate colors.

## What was verified vs. not, per source

| # | Source | Status | What's verified |
|---|---|---|---|
| 1 | The Pudding (pudding.cool) | verified-fetched | Body: Atlas Grotesk 14px; headings/links: Gooper SemiCondensed. "Birthday effect" story (pudding.cool/2025/04/birthday-effect) switches whole page to Tiempos Text serif, headline 48px/500 weight, soft off-black `#4e4e4e`. Home feed background `#191919` with per-card accent colors; individual stories often go to plain white instead — no single house palette. Mobile: strict single column, headline scales to fill viewport. |
| 2 | nippon.com Japan Data | verified-fetched | Montserrat throughout; headline 36px/700 black; body 10px/500, all black text. Background `#f3f6f7` pale blue-grey, white content well. Charts are static raster images with series labeled directly on the line in small white rounded boxes, no separate legend. Standard 4-column card grid, "Most Popular" ranked sidebar. |
| 3 | NYT The Upshot | mixed | Verified: section front white `#ffffff`, nyt-franklin sans, near-black `#121212` text, "TheUpshot" wordmark in serif with two small olive dots. NOT verified this session (article pages blocked with a "blocked...robot" page): the well-known serif-headline + restrained 1-2 color chart + end-of-line direct-labeling pattern — general knowledge only, flagged as background. |
| 4 | Zeit Online | verified-fetched | TabletGothic sans throughout (h2 22px/700, body 14px/400), white text on near-black `#121212` background. Red/orange used ONLY for "Z+" paywall tag and "Abo testen" CTA — nowhere else. Masthead "DIE ZEIT" is the one ornate element, a heavy blackletter/fraktur display face against an otherwise plain grotesque sans. |
| 5 | Reuters Graphics | blocked (guess) | Bot wall: "Access is temporarily restricted... automated (bot) activity." General knowledge only (unverified): white background, sparse sans, map/satellite-heavy. |
| 6 | Bloomberg Graphics | blocked (guess) | Bot wall: "Are you a robot?" General knowledge only (unverified): black/amber terminal-derived palette. |
| — | SCMP multimedia arcade | blocked (guess) | Slide-to-verify captcha, not solved. General knowledge only (unverified): full-bleed illustration, horizontal-scroll sequences. |

The one clearly transferable, verified idea across sources: **direct
on-line/on-chart labeling instead of a separate legend** (seen concretely
at nippon.com; claimed by reputation at Upshot but not confirmed this
session).

## Three directions for bearstats

### Direction A — "Field Notebook"

- **Palette**: paper background `#f6f1e7`, near-black brown ink `#2b2620`,
  hairline rule `#d8cdb8`, rust/terracotta for injuries `#b5482a`, forest
  green for sightings `#4a6741`.
- **Type pairing** (Google Fonts): headlines in **Newsreader** (literary
  serif, holds up at large display sizes — echoes the Pudding's move of
  using a serif to signal "essay" not "dashboard"); body/UI in **Public
  Sans** (clean, government-report-grade sans, a thematic nod to the
  Ministry-of-Environment sourcing); data figures/dates in **JetBrains
  Mono** with tabular numerals.
- **Layout**: replace the dark glassy step-cards and sticky panel (which
  currently share the same 12px-radius look) with a cream, ruled-notebook
  grid; thin hairline rules divide sections like a field logbook instead of
  rounded card boundaries; chapter numbers appear as a small rotated red
  "stamp" circle, echoing a field researcher's specimen tag.
- **Chart annotation**: labels written directly beside the line/bar in the
  serif's italic, with a small red dot and short leader line pointing at
  the exact peak — a circled observation in a notebook margin, replacing
  the current legend-plus-tooltip approach.
- **Risk**: a light, paper-toned canvas makes the point-map (currently a
  dark basemap with bright red/yellow dots for contrast) much harder to
  read; the map may need its own dark inset, undermining the purity of an
  all-paper direction.

### Direction B — "Warning Poster"

- **Palette**: off-white/paper `#f2efe9` or pure white, ink black `#14110d`,
  a single hazard red `#d0272d` used boldly (deliberately harder/more
  saturated than the current soft brand-red `#ff3b30`), amber/caution-tape
  yellow `#f2b705` reserved for secondary emphasis only.
- **Type pairing** (Google Fonts): **Archivo Black**/**Archivo Expanded**
  for big stat callouts and headlines (poster-weight, evokes Japanese
  hazard-sign lettering); **Noto Sans** for body copy (covers Japanese
  place names and glyphs cleanly — useful given the prefecture data).
- **Layout**: drop rounded cards entirely for squared, black-bordered
  placards; a diagonal red corner ribbon marks "record"/"highest ever"
  moments; section breaks become literal black-and-yellow caution-stripe
  bars instead of the current thin nav underline.
- **Chart annotation**: the number itself becomes an oversized poster
  numeral punched directly over the peak bar/line (not off to the side in
  a callout box) — the way a hazard sign puts the number huge and the
  explanation small underneath it.
- **Risk**: heavy black/red/yellow "hazard sign" language can tip into
  feeling alarmist or clickbait-y for a site whose credibility rests on
  calm, ministry-sourced data journalism; the hazard motif needs to be
  reserved for genuinely record-breaking moments only, not fired on every
  chart.

### Direction C — "Night Watch"

- **Palette**: keep a dark canvas (thematically apt for a nocturnal-animal
  story) but move off generic navy/red-SaaS territory: background `#14170f`
  (near-black moss, not blue-black), elevated panel `#1d2318`, warm
  off-white text `#e9e6da`, primary accent amber/bear-fur gold `#d99a3c`
  (replacing the current all-purpose red), with red-clay `#9c4a3a` reserved
  exclusively for injuries/deaths so red regains a specific meaning instead
  of being the brand color for everything.
- **Type pairing** (Google Fonts): **Fraunces** (soft, slightly rustic
  serif, good at large display sizes for big stat callouts) for headlines;
  keep **Inter** for body/UI since it's already the codebase's font — a
  lower-risk, surgical swap rather than a full font migration; keep the
  existing tabular-nums feature already used in `styles.css`.
- **Layout**: keep the existing scrollytelling skeleton (steps + sticky
  graphic) but remove the doubled rounded-card nesting (`.step-card` and
  `.g` currently share the same 12px radius and border treatment, so a
  card sits inside a card); let step text sit directly on the bare
  background with only a left-hand gold rule marking the active step, the
  way Zeit Online uses its one accent color extremely sparingly.
- **Chart annotation**: borrow nippon.com's direct-on-line labeling (a
  small pill on the series itself instead of a separate legend) and the
  Upshot's habit (per general knowledge, not fetched this session) of
  anchoring a short takeaway clause right at the specific point on the
  chart, e.g. "record" pinned at the FY2025 peak, rather than only in the
  prose card beside it.
- **Risk**: the least visually distinct of the three since it keeps the
  dark canvas and the existing Inter font; stakeholders may perceive it as
  a palette tweak rather than a redesign, even though the color system and
  annotation approach change substantively.

## Recommendation context (not a decision)

All three keep body text on a background at ≥7:1 contrast per
`docs/GOAL.md`'s definition of done — exact ratios should be checked
against the final chosen palette and text sizes before ship, not assumed
from the hex values above. Direction A's paper background is the one most
likely to need a contrast recheck for the point-map specifically (see its
risk note).
