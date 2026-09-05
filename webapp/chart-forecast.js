// The 2026 forecast next to 2025 and 2023 at the same point in the year.
//
// Five prefecture rows, each with three tiles (July forecast index for 2023,
// 2025 and 2026); 2026 is drawn larger because it is the one that matters.
// Below that, the means line and the other three surveys, then the track
// record computed straight off the office's own 70 prefecture-years so it
// cannot drift out of step with the underlying data.
//
// Assumes D3 v7 is loaded globally.

const PREFS = [
  { key: "aomori", label: "Aomori" },
  { key: "iwate", label: "Iwate" },
  { key: "miyagi", label: "Miyagi" },
  { key: "akita", label: "Akita" },
  { key: "yamagata", label: "Yamagata" },
];
const ORDER = { "大凶作": 0, "凶作": 1, "並作": 2, "豊作": 3 };
const GOOD = new Set(["並作", "豊作"]);
const POOR = new Set(["凶作", "大凶作"]);

/**
 * {byPref, means, surveys, record}. byPref carries each prefecture's July
 * forecast index at the same point in 2023, 2025 and 2026, and the 2026
 * forecast category. record is derived from all 70 prefecture-year rows
 * with both a forecast and an actual category on file (FY2012-2025).
 */
export function forecastPanel(ctx) {
  const mast = ctx?.context?.mast || {};
  const tho = mast.tohoku_office || [];
  const forecast2026 = mast.forecast_2026 || {};

  const byPrefFy = new Map();
  for (const r of tho) {
    if (!byPrefFy.has(r.pref)) byPrefFy.set(r.pref, new Map());
    byPrefFy.get(r.pref).set(r.fy, r);
  }

  const byPref2026 = forecast2026.tohoku_office_by_pref || {};
  const byPref = PREFS.map(p => {
    const rows = byPrefFy.get(p.key) || new Map();
    const r2026 = rows.get(2026);
    return {
      pref: p.key,
      label: p.label,
      f2023: rows.get(2023)?.forecast_index ?? null,
      f2025: rows.get(2025)?.forecast_index ?? null,
      f2026: byPref2026[p.key] ?? r2026?.forecast_index ?? null,
      category2026: r2026?.forecast_category_normalised ?? null,
    };
  });

  const meanOf = key => {
    const vals = byPref.map(p => p[key]).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const means = {
    2023: meanOf("f2023"),
    2025: meanOf("f2025"),
    2026: forecast2026.tohoku_office_mean ?? meanOf("f2026"),
  };

  const surveys = [
    forecast2026.niigata != null && { name: "Niigata, 189 points", value: forecast2026.niigata, date: (forecast2026.sources || []).find(s => /新潟/.test(s.name))?.date },
    forecast2026.toyama != null && { name: "Toyama", value: forecast2026.toyama, date: (forecast2026.sources || []).find(s => /富山/.test(s.name))?.date },
    forecast2026.akita_sites != null && { name: "Akita, five sites", value: forecast2026.akita_sites, date: (forecast2026.sources || []).find(s => /秋田/.test(s.name))?.date },
    { name: "Fukushima, flowering", value: "豊作", date: null },
  ].filter(Boolean);

  // Track record: every FY2012-2025 prefecture-year with both a forecast and
  // an actual category on file (70 rows in the research doc).
  const complete = tho.filter(r => r.category_normalised != null && r.forecast_category_normalised != null);
  const total = complete.length;
  const exact = complete.filter(r => r.category_normalised === r.forecast_category_normalised).length;
  const withinOne = complete.filter(r => Math.abs(ORDER[r.category_normalised] - ORDER[r.forecast_category_normalised]) <= 1).length;
  const poorForecast = complete.filter(r => POOR.has(r.forecast_category_normalised));
  const poorNeverGoodCount = poorForecast.filter(r => GOOD.has(r.category_normalised)).length;
  const goodForecast = complete.filter(r => GOOD.has(r.forecast_category_normalised));
  const goodToWorstCount = goodForecast.filter(r => r.category_normalised === "大凶作").length;
  const goodToPoorCount = goodForecast.filter(r => r.category_normalised === "凶作").length;

  const record = {
    exact, total, withinOne,
    poorNeverGood: `${poorNeverGoodCount} of ${poorForecast.length}`,
    goodNeverWorst: `${goodToWorstCount} of ${goodForecast.length}`,
    goodToPoor: `${goodToPoorCount} of ${goodForecast.length}`,
  };

  return { byPref, means, surveys, record };
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
  mast: [0, 1, 2, 3, 4, 5].map(i => cssVar(`--mast-${i}`, ["#2b2620", "#4b4237", "#6d604f", "#958468", "#c2b48e", "#efe6d2"][i])),
  serif: cssVar("--font-serif", "Newsreader, Georgia, serif"),
  sans: cssVar("--font-sans", "Public Sans, system-ui, sans-serif"),
  mono: cssVar("--font-mono", "JetBrains Mono, ui-monospace, monospace"),
});

/**
 * Short, never-truncated display line for one of the four other-source
 * surveys. Each source's raw value string has its own shape (Niigata names
 * a points count and a region tally, Toyama lists three species, Akita
 * counts sites), so each gets its own compact phrasing rather than a
 * generic "name: value" that risks running long enough to need an ellipsis.
 */
function formatSurveyLine(s) {
  const raw = String(s.value ?? "");
  if (/^Niigata/.test(s.name)) {
    const pts = /(\d+)\s*points/.exec(raw)?.[1] ?? "?";
    const region = /(\d+)\s*of\s*(\d+)\s*regions/.exec(raw);
    const cat = /^(\S+)/.exec(raw)?.[1] ?? raw;
    const regionPhrase = region && region[1] === region[2]
      ? `all ${region[2]} regions`
      : region ? `${region[1]} of ${region[2]} regions` : "";
    return `Niigata, ${pts} points: ${cat}${regionPhrase ? ` in ${regionPhrase}` : ""}`;
  }
  if (/^Toyama/.test(s.name)) {
    return `Toyama: ${raw.split(/,\s*/).join(" · ")}`;
  }
  if (/^Akita/.test(s.name)) {
    const m = /○\s*at\s*(\d+)\s*of\s*(\d+)/.exec(raw);
    return `Akita five sites: ○ at ${m ? `${m[1]} of ${m[2]}` : raw}`;
  }
  if (/^Fukushima/.test(s.name)) {
    return `Fukushima flowering: ${raw}`;
  }
  return `${s.name}: ${raw}`;
}

/**
 * Relative luminance of a CSS colour. Accepts anything d3.color understands
 * — in particular "rgb(r, g, b)", which is what d3.scaleLinear's colour
 * interpolation actually returns (not the "#rrggbb" hex it started from), so
 * a naive hex-only regex here silently fails on every interpolated tile and
 * always falls back to dark ink text, even over the darkest tiles.
 */
function luminance(color) {
  const c = typeof d3 !== "undefined" && d3.color ? d3.color(color) : null;
  if (!c) return 1;
  const { r, g, b } = c.rgb();
  return 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
}

export function mountForecast(container, data) {
  container.innerHTML = "";
  const { byPref, means, surveys, record } = forecastPanel(data);
  if (!byPref.length) return { play() {}, setProgress() {}, stop() {} };

  const T = TOKENS();
  const { width: W, height: H } = container.getBoundingClientRect();
  const colorScale = d3.scaleLinear().domain([0, 1, 2, 3, 4, 5]).range(T.mast).clamp(true);
  const textFor = fill => (luminance(fill) < 0.4 ? T.paper : T.ink);

  // Wide panels put the text block beside the tile grid instead of below it
  // — stacking everything in one narrow left-hand column left the right
  // half of a desktop panel empty. Below the breakpoint the layout is
  // unchanged: tiles on top, text stacked underneath, tiles sized off the
  // row height as before.
  const isWide = W >= 640;
  const M = { top: 8, right: 12, bottom: 8, left: 76 };
  const subtitleH = 14;
  const legendH = 14;
  const headerH = 16; // "July 2023 / 2025 / 2026" column headers, above every layout
  const tileGap = 10;
  const maxBigW = 110;

  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%").style("height", "100%");

  // ---- subtitle: what one tile is, and the survey window --------------------
  svg.append("text")
    .attr("x", 2).attr("y", M.top + 9)
    .attr("font-family", T.sans).attr("font-size", 12).attr("fill", T.ink2)
    .text("July flowering survey, index 0 to 5, by prefecture");

  // ---- tiny legend for the tile ramp -----------------------------------------
  const legendY = M.top + subtitleH + 11;
  const legendStops = [0, 2.5, 5];
  const legendSwatch = 8;
  legendStops.forEach((v, i) => {
    const lx = 2 + i * 42;
    svg.append("rect")
      .attr("x", lx).attr("y", legendY - legendSwatch + 2).attr("width", legendSwatch).attr("height", legendSwatch)
      .attr("fill", colorScale(v)).attr("stroke", T.rule);
    svg.append("text")
      .attr("x", lx + legendSwatch + 3).attr("y", legendY)
      .attr("font-family", T.sans).attr("font-size", 9.5).attr("fill", T.ink2)
      .text(v);
  });

  const meansH = 18, surveysH = surveys.length * 14 + 6, footerH = 34;
  const gridTop = M.top + subtitleH + legendH + headerH;
  const rowsAreaH = isWide
    ? H - gridTop - M.bottom
    : H - gridTop - M.bottom - meansH - surveysH - footerH;
  const rowH = rowsAreaH / byPref.length;

  const rowsLeft = M.left;
  let smallW, bigW;
  if (isWide) {
    // Tile columns may grow up to maxBigW for the 2026 tile, but never past
    // ~60% of the panel width, so the tiles and the text block read as one
    // composition rather than a strip with empty space beside it.
    const textColW = Math.max(230, W * 0.34);
    const budget = Math.max(90, Math.min(W * 0.6 - M.left, W - M.left - M.right - textColW));
    smallW = Math.max(18, (budget - 2 * tileGap) / 3.5);
    bigW = smallW * 1.5;
    if (bigW > maxBigW) { bigW = maxBigW; smallW = bigW / 1.5; }
  } else {
    smallW = Math.min(36, rowH * 0.7);
    bigW = smallW * 1.5;
  }
  const rowW = smallW * 2 + tileGap * 2 + bigW;
  // Wide: text block sits to the right of the tile grid. Narrow: it stacks
  // below (rowsLeft), as before.
  const textLeft = isWide ? rowsLeft + rowW + 40 : rowsLeft;

  // "July 2023" at 12px needs ~59px; below that a narrow tile column (as on
  // phones, where even the biggest of the three columns can be under that)
  // would overlap its neighbour. Below the threshold every column instead
  // gets just its year, with a single shared "July" label to their left —
  // still says what the columns are, without three overlapping copies of it.
  // Narrower still (two adjacent small columns under ~34px each), even the
  // bare four-digit year would collide with its neighbour, so it drops to a
  // smaller font and a two-digit year.
  const headerFull = smallW >= 60;
  const veryTight = !headerFull && smallW < 34;
  const headerFontSize = headerFull ? 12 : veryTight ? 9.5 : 12;
  const yearLabel = fy => (veryTight ? `’${String(fy).slice(2)}` : String(fy));
  const tileSpecs = [
    { key: "f2023", w: smallW, label: headerFull ? "July 2023" : yearLabel(2023) },
    { key: "f2025", w: smallW, label: headerFull ? "July 2025" : yearLabel(2025) },
    { key: "f2026", w: bigW, label: headerFull ? "July 2026" : yearLabel(2026) },
  ];
  const colCenters = (() => {
    let cx = 0;
    return tileSpecs.map(spec => { const c = cx + spec.w / 2; cx += spec.w + tileGap; return c; });
  })();

  // ---- column headers -----------------------------------------------------------
  if (!headerFull) {
    svg.append("text")
      .attr("x", rowsLeft - 8).attr("y", gridTop - 5)
      .attr("text-anchor", "end")
      .attr("font-family", T.sans).attr("font-size", 12).attr("fill", T.ink2)
      .text("July");
  }
  svg.append("g").selectAll("text").data(tileSpecs).join("text")
    .attr("x", (d, i) => rowsLeft + colCenters[i]).attr("y", gridTop - 5)
    .attr("text-anchor", "middle")
    .attr("font-family", T.sans).attr("font-size", headerFontSize).attr("fill", T.ink2)
    .text(d => d.label);

  const groups = svg.append("g").selectAll("g").data(byPref).join("g")
    .attr("transform", (d, i) => `translate(${rowsLeft},${gridTop + i * rowH})`);

  groups.append("text")
    .attr("x", -8).attr("y", rowH / 2)
    .attr("text-anchor", "end").attr("dominant-baseline", "middle")
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 13)
    .attr("fill", T.ink)
    .text(d => d.label);

  const allTiles = [];
  groups.each(function (d) {
    const g = d3.select(this);
    let cx = 0;
    tileSpecs.forEach(spec => {
      const val = d[spec.key];
      const h = Math.max(14, rowH - 10) * (spec.key === "f2026" ? 1 : 0.72);
      const y0 = (rowH - h) / 2;
      const fill = val != null ? colorScale(val) : "none";
      const rect = g.append("rect")
        .attr("x", cx).attr("y", y0).attr("width", spec.w).attr("height", h)
        .attr("fill", fill)
        .attr("stroke", val == null ? T.rule : "none")
        .attr("opacity", 0);
      const label = g.append("text")
        .attr("x", cx + spec.w / 2).attr("y", y0 + h / 2 + 3)
        .attr("text-anchor", "middle")
        .attr("font-family", T.mono).attr("font-size", spec.key === "f2026" ? 11 : 9)
        .attr("fill", val != null ? textFor(fill) : T.ink2)
        .attr("opacity", 0)
        .text(val != null ? val.toFixed(1) : "-");
      allTiles.push(rect, label);
      cx += spec.w + tileGap;
    });
  });

  // ---- means line -------------------------------------------------------------
  const meansY = isWide ? gridTop + 12 : gridTop + rowsAreaH + 12;
  const meansText = svg.append("text")
    .attr("x", textLeft).attr("y", meansY)
    .attr("font-family", T.mono).attr("font-size", 11.5)
    .attr("fill", T.ink)
    .attr("opacity", 0)
    .text(`July mean ${fmt(means[2023])} · ${fmt(means[2025])} · ${fmt(means[2026])}`);

  // ---- other surveys ------------------------------------------------------------
  // Fixed, hand-shortened phrasing per source (see formatSurveyLine) so none
  // of these ever needs an ellipsis, at any panel width.
  const surveyGroup = svg.append("g").attr("opacity", 0);
  surveys.forEach((s, i) => {
    surveyGroup.append("text")
      .attr("x", textLeft).attr("y", meansY + 18 + i * 14)
      .attr("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
      .text(formatSurveyLine(s));
  });

  // ---- footer -------------------------------------------------------------------
  // Two short lines instead of one long sentence, so the 大凶作/凶作 track
  // record never needs truncating either.
  const footer = svg.append("g").attr("opacity", 0);
  footer.append("text")
    .attr("x", textLeft).attr("y", H - 19)
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 10.5)
    .attr("fill", T.ink)
    .text(`July 並作 or better, then 大凶作: ${record.goodNeverWorst}`);
  footer.append("text")
    .attr("x", textLeft).attr("y", H - 4)
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 10.5)
    .attr("fill", T.ink)
    .text(`then 凶作: ${record.goodToPoor}`);

  function fmt(v) { return v == null ? "-" : v.toFixed(2); }

  function play() {
    let i = 0;
    allTiles.forEach(el => {
      el.interrupt().transition().delay(i * 12).duration(1).attr("opacity", 1);
      i++;
    });
    const afterRows = allTiles.length * 12 + 150;
    meansText.interrupt().transition().delay(afterRows).duration(250).attr("opacity", 1);
    surveyGroup.interrupt().transition().delay(afterRows + 120).duration(250).attr("opacity", 1);
    footer.interrupt().transition().delay(afterRows + 260).duration(300).attr("opacity", 1);
  }

  function setProgress(t) {
    // 2026 tiles fill in last: order tiles so 2023/2025 lead, 2026 trails.
    const n = byPref.length;
    allTiles.forEach((el, idx) => {
      const prefIdx = Math.floor(idx / (tileSpecs.length * 2));
      const withinRow = idx % (tileSpecs.length * 2);
      const specIdx = Math.floor(withinRow / 2);
      // spread: each pref gets a slot, 2026 tiles occupy the back third of progress
      const base = prefIdx / n;
      const order = specIdx === 2 ? 0.7 + base * 0.3 : base * 0.7;
      el.interrupt().attr("opacity", t >= order ? 1 : 0);
    });
    meansText.interrupt().attr("opacity", t >= 0.92 ? 1 : 0);
    surveyGroup.interrupt().attr("opacity", t >= 0.95 ? 1 : 0);
    footer.interrupt().attr("opacity", t >= 0.98 ? 1 : 0);
  }

  function stop() {
    allTiles.forEach(el => el.interrupt());
    meansText.interrupt(); surveyGroup.interrupt(); footer.interrupt();
  }

  return { play, setProgress, stop };
}
