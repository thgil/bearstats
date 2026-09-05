// Alternate bearing: a good beech crop the year before a failure.
//
// Five rows, one per Tohoku prefecture, FY2012-2025 (14 tiles): dark = poor
// (凶作/大凶作), pale = good (並作/豊作). An arrow marks every good-year tile
// that is followed by a poor one, because that transition (22 of 23 in the
// office's own record) is the whole point of the chart. A sixth row, Akita's
// independent five-site survey back to 2002, is added when the panel is
// tall enough to hold it without crowding the five main rows.
//
// Assumes D3 v7 is loaded globally.

const PREFS = [
  { key: "aomori", label: "Aomori" },
  { key: "iwate", label: "Iwate" },
  { key: "miyagi", label: "Miyagi" },
  { key: "akita", label: "Akita" },
  { key: "yamagata", label: "Yamagata" },
];
const GOOD = new Set(["並作", "豊作"]);

/**
 * Per prefecture, the FY2012-2025 sequence of {fy, good, category}, plus the
 * count of good-year-to-poor-year and poor-year-to-poor-year transitions
 * across all five prefectures (both years' categories must be on record, so
 * FY2026's forecast-only row never counts).
 */
export function alternatePairs(ctx) {
  const tho = ctx?.context?.mast?.tohoku_office || [];
  const byFy = new Map();
  for (const r of tho) {
    if (r.category_normalised == null) continue;
    if (!byFy.has(r.fy)) byFy.set(r.fy, {});
    byFy.get(r.fy)[r.pref] = r.category_normalised;
  }
  const years = [...byFy.keys()].sort((a, b) => a - b)
    .filter(fy => PREFS.every(p => byFy.get(fy)[p.key] != null));

  const rows = PREFS.map(p => ({
    pref: p.key,
    label: p.label,
    years: years.map(fy => {
      const category = byFy.get(fy)[p.key];
      return { fy, category, good: GOOD.has(category) };
    }),
  }));

  let goodToPoor = 0, goodTotal = 0, poorToPoor = 0, poorTotal = 0;
  for (const row of rows) {
    for (let i = 0; i < row.years.length - 1; i++) {
      const a = row.years[i], b = row.years[i + 1];
      if (a.good) {
        goodTotal++;
        if (!b.good) goodToPoor++;
      } else {
        poorTotal++;
        if (!b.good) poorToPoor++;
      }
    }
  }

  const akitaFiveSite = akitaSiteSeries(ctx);

  return {
    years,
    rows,
    goodToPoor, goodTotal,
    poorToPoor, poorTotal,
    akitaFiveSite,
  };
}

/** Akita's independent five-site score (0-5, count of ○ sites), 2002-2025, actual results only. */
export function akitaSiteSeries(ctx) {
  const sites = ctx?.context?.mast?.akita_sites || [];
  return sites
    .filter(r => !r.forecast)
    .sort((a, b) => a.year - b.year)
    .map(r => ({ year: r.year, score: r.score, any: r.score > 0 }));
}

function cssVar(name, fallback) {
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const TOKENS = () => ({
  paper: cssVar("--paper", "#f6f1e7"),
  ink: cssVar("--ink", "#2b2620"),
  ink2: cssVar("--ink-2", "#4d453d"),
  rule: cssVar("--rule", "#d8cdb8"),
  mast0: cssVar("--mast-0", "#2b2620"),
  mast5: cssVar("--mast-5", "#efe6d2"),
  sight: cssVar("--sight", "#4a6741"),
  serif: cssVar("--font-serif", "Newsreader, Georgia, serif"),
  sans: cssVar("--font-sans", "Public Sans, system-ui, sans-serif"),
  mono: cssVar("--font-mono", "JetBrains Mono, ui-monospace, monospace"),
});

/** i's reveal step (year-by-year) at progress t: tiles appear left to right, row by row. */
export function revealIndex(t, total, growEnd = 0.92) {
  return Math.floor((t / growEnd) * total);
}

const ROW_LABEL_W = 74;

export function mountAlternate(container, data) {
  container.innerHTML = "";
  const { years, rows, goodToPoor, goodTotal, akitaFiveSite } = alternatePairs(data);
  if (!years.length) return { play() {}, setProgress() {}, stop() {} };

  const T = TOKENS();
  const { width: W, height: H } = container.getBoundingClientRect();
  const M = { top: 6, right: 10, bottom: 8, left: ROW_LABEL_W };

  // A sixth row (Akita 2002-2025, 24 tiles) only when there is room for it
  // without squeezing the five main rows below a legible height.
  const showSixth = akitaFiveSite.length > 0 && H >= 380;
  const nRows = showSixth ? 6 : 5;
  const summaryH = 20;
  const plotH = H - M.top - M.bottom - summaryH;
  const rowH = plotH / nRows;
  const tileGap = 2;

  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%").style("height", "100%");

  const plotW = W - M.left - M.right;
  const x = d3.scaleBand().domain(years).range([M.left, M.left + plotW]).paddingInner(0.12);
  const tileW = x.bandwidth();
  const tileH = Math.max(10, rowH - tileGap * 2);

  const allTiles = [];
  const allArrows = [];

  rows.forEach((row, ri) => {
    const g = svg.append("g").attr("transform", `translate(0,${M.top + ri * rowH})`);
    g.append("text")
      .attr("x", M.left - 8).attr("y", rowH / 2)
      .attr("text-anchor", "end").attr("dominant-baseline", "middle")
      .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 13)
      .attr("fill", T.ink)
      .text(row.label);

    row.years.forEach((yr, yi) => {
      const idx = ri * row.years.length + yi;
      const rect = g.append("rect")
        .attr("x", x(yr.fy)).attr("y", tileGap)
        .attr("width", tileW).attr("height", tileH)
        .attr("fill", yr.good ? T.mast5 : T.mast0)
        .attr("opacity", 0)
        .attr("data-order", idx);
      allTiles.push(rect);

      if (yr.good && yi < row.years.length - 1 && !row.years[yi + 1].good) {
        const arrow = g.append("text")
          .attr("x", x(yr.fy) + tileW + (x.step() - tileW) / 2)
          .attr("y", rowH / 2)
          .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
          .attr("font-size", Math.min(13, tileH * 0.7))
          .attr("fill", T.ink)
          .attr("opacity", 0)
          .attr("data-order", idx)
          .text("→");
        allArrows.push(arrow);
      }
    });
  });

  // Sixth row: Akita's independent five-site survey, 2002-2025.
  let sixthTiles = [];
  if (showSixth) {
    const ri = 5;
    const g = svg.append("g").attr("transform", `translate(0,${M.top + ri * rowH})`);
    g.append("text")
      .attr("x", M.left - 8).attr("y", rowH / 2)
      .attr("text-anchor", "end").attr("dominant-baseline", "middle")
      .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 10)
      .attr("fill", T.ink2)
      .text("Akita ×5");

    const x6 = d3.scaleBand().domain(akitaFiveSite.map(d => d.year)).range([M.left, M.left + plotW]).paddingInner(0.12);
    const shade = d3.scaleLinear().domain([0, 5]).range([T.mast0, T.mast5]);
    sixthTiles = akitaFiveSite.map((d, i) => {
      const rect = g.append("rect")
        .attr("x", x6(d.year)).attr("y", tileGap)
        .attr("width", x6.bandwidth()).attr("height", Math.max(8, rowH - tileGap * 2))
        .attr("fill", shade(d.score))
        .attr("opacity", 0)
        .attr("data-order", i);
      if (d.any) {
        rect.attr("stroke", T.ink).attr("stroke-width", 0.75);
      }
      return rect;
    });
  }

  const summaryFull = `A good autumn was followed by a poor one in ${goodToPoor} of ${goodTotal} prefecture-years.`;
  const summaryMaxW = W - M.left - M.right;
  const summaryText = (() => {
    const maxChars = Math.max(10, Math.floor(summaryMaxW / (11.5 * 0.56)));
    return summaryFull.length <= maxChars ? summaryFull : summaryFull.slice(0, maxChars - 1).trimEnd() + "…";
  })();

  const summary = svg.append("g").attr("opacity", 0);
  summary.append("text")
    .attr("x", M.left).attr("y", H - 6)
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 11.5)
    .attr("fill", T.ink)
    .text(summaryText);

  const totalCells = rows.length * years.length + sixthTiles.length;

  function play() {
    let cursor = 0;
    const perStep = 900 / Math.max(1, years.length);
    allTiles.forEach(t => {
      const order = +t.attr("data-order") % years.length;
      t.interrupt().transition().delay(order * perStep).duration(1).attr("opacity", 1);
    });
    allArrows.forEach(a => {
      const order = +a.attr("data-order") % years.length;
      a.interrupt().transition().delay(order * perStep + 120).duration(200).attr("opacity", 1);
    });
    sixthTiles.forEach((t, i) => {
      t.interrupt().transition().delay((i / sixthTiles.length) * 900).duration(1).attr("opacity", 1);
    });
    summary.interrupt().transition().delay(950).duration(300).attr("opacity", 1);
    cursor = totalCells;
  }

  function setProgress(t) {
    const cutoff = t * years.length;
    allTiles.forEach(el => {
      const order = +el.attr("data-order") % years.length;
      el.interrupt().attr("opacity", order < cutoff ? 1 : 0);
    });
    allArrows.forEach(el => {
      const order = +el.attr("data-order") % years.length;
      el.interrupt().attr("opacity", order < cutoff ? 1 : 0);
    });
    const sixthCutoff = t * sixthTiles.length;
    sixthTiles.forEach((el, i) => el.interrupt().attr("opacity", i < sixthCutoff ? 1 : 0));
    summary.interrupt().attr("opacity", t >= 0.95 ? 1 : 0);
  }

  function stop() {
    allTiles.forEach(t => t.interrupt());
    allArrows.forEach(a => a.interrupt());
    sixthTiles.forEach(t => t.interrupt());
    summary.interrupt();
  }

  return { play, setProgress, stop };
}
