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
 * Cut plain text to roughly fit maxWidth px at the given font size, so a
 * long survey line or footer sentence never runs past the chart's frame at
 * 340px width. The per-character estimate is generous (mixed Latin/Japanese
 * text) so it trims a little early rather than clipping.
 */
function truncateToWidth(text, maxWidth, fontSize) {
  const charW = fontSize * 0.62;
  const maxChars = Math.max(6, Math.floor(maxWidth / charW));
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).trimEnd() + "…";
}

function luminance(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
  if (!m) return 1;
  const [r, g, b] = m.slice(1).map(h => parseInt(h, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function mountForecast(container, data) {
  container.innerHTML = "";
  const { byPref, means, surveys, record } = forecastPanel(data);
  if (!byPref.length) return { play() {}, setProgress() {}, stop() {} };

  const T = TOKENS();
  const { width: W, height: H } = container.getBoundingClientRect();
  const colorScale = d3.scaleLinear().domain([0, 1, 2, 3, 4, 5]).range(T.mast).clamp(true);
  const textFor = fill => (luminance(fill) < 0.5 ? T.paper : T.ink);

  const M = { top: 8, right: 12, bottom: 8, left: 76 };
  const meansH = 18, surveysH = surveys.length * 14 + 6, footerH = 34;
  const rowsAreaH = H - M.top - M.bottom - meansH - surveysH - footerH;
  const rowH = rowsAreaH / byPref.length;

  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%").style("height", "100%");

  const smallW = Math.min(36, rowH * 0.7);
  const bigW = smallW * 1.5;
  const tileGap = 10;
  const rowW = smallW * 2 + tileGap * 2 + bigW;
  const rowsLeft = M.left;

  const groups = svg.append("g").selectAll("g").data(byPref).join("g")
    .attr("transform", (d, i) => `translate(${rowsLeft},${M.top + i * rowH})`);

  groups.append("text")
    .attr("x", -8).attr("y", rowH / 2)
    .attr("text-anchor", "end").attr("dominant-baseline", "middle")
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 13)
    .attr("fill", T.ink)
    .text(d => d.label);

  const tileSpecs = [
    { key: "f2023", w: smallW, label: "'23" },
    { key: "f2025", w: smallW, label: "'25" },
    { key: "f2026", w: bigW, label: "'26" },
  ];

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
  const meansY = M.top + rowsAreaH + 12;
  const meansText = svg.append("text")
    .attr("x", rowsLeft).attr("y", meansY)
    .attr("font-family", T.mono).attr("font-size", 11.5)
    .attr("fill", T.ink)
    .attr("opacity", 0)
    .text(`July mean ${fmt(means[2023])} · ${fmt(means[2025])} · ${fmt(means[2026])}`);

  // ---- other surveys ------------------------------------------------------------
  const textMaxW = W - rowsLeft - M.right;
  const surveyGroup = svg.append("g").attr("opacity", 0);
  surveys.forEach((s, i) => {
    surveyGroup.append("text")
      .attr("x", rowsLeft).attr("y", meansY + 18 + i * 14)
      .attr("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
      .text(truncateToWidth(`${s.name}: ${s.value}`, textMaxW, 10));
  });

  // ---- footer -------------------------------------------------------------------
  const footer = svg.append("g").attr("opacity", 0);
  footer.append("text")
    .attr("x", rowsLeft).attr("y", H - 19)
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 10.5)
    .attr("fill", T.ink)
    .text(truncateToWidth(`In ${record.goodNeverWorst.split(" of ")[1]} prefecture-years a July forecast of 並作 or better has never ended in 大凶作.`, textMaxW, 10.5));
  footer.append("text")
    .attr("x", rowsLeft).attr("y", H - 4)
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 10.5)
    .attr("fill", T.ink)
    .text(`It slipped to 凶作 ${record.goodToPoor} times.`);

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
