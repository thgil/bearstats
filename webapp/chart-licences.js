// Hunting licences, 1975 to 2021: gun licences collapsed, trap licences grew.
//
// Three lines drawn from the same MoE table: gun (第一種+第二種銃猟), trap,
// and the all-licence-types total. The years are irregular (every five years
// to 2005, then annual), so this reads as a line chart on the years actually
// published, not a synthetic even grid.
//
// Assumes D3 v7 is loaded globally.

/** [{year, total, gun, trap, net}], 1975-2021, whichever years are on file. */
export function licenceSeries(ctx) {
  const rows = ctx?.context?.licences || [];
  return rows
    .map(r => ({
      year: r.year,
      total: r.total,
      // First-class gun licences only (第1種銃猟), the series the copy quotes:
      // 493,700 in 1975 to 84,400 in 2021. gun2 (air rifles) is ~2,000.
      gun: r.gun1 ?? 0,
      trap: r.trap ?? null,
      net: r.net ?? null,
    }))
    .sort((a, b) => a.year - b.year);
}

function cssVar(name, fallback) {
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const TOKENS = () => ({
  ink: cssVar("--ink", "#2b2620"),
  ink2: cssVar("--ink-2", "#4d453d"),
  rule: cssVar("--rule", "#d8cdb8"),
  sight: cssVar("--sight", "#4a6741"),
  serif: cssVar("--font-serif", "Newsreader, Georgia, serif"),
  sans: cssVar("--font-sans", "Public Sans, system-ui, sans-serif"),
  mono: cssVar("--font-mono", "JetBrains Mono, ui-monospace, monospace"),
});

const SERIES = [
  { key: "gun", label: "gun", end: "84,400 gun", colorKey: "ink" },
  { key: "trap", label: "trap", end: "119,500 trap", colorKey: "sight" },
  { key: "total", label: "all", end: "213,400 all", colorKey: "rule" },
];

/** Dash-array line length, for the draw-on transition. */
export function pathLength(path) {
  return path && typeof path.getTotalLength === "function" ? path.getTotalLength() : 0;
}

/** Y-axis tick label: "500k" rather than "500,000", so it fits a margin sized to it. */
export function formatK(v) {
  return v === 0 ? "0" : `${Math.round(v / 1000)}k`;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function mountLicences(container, data) {
  container.innerHTML = "";
  const rows = licenceSeries(data);
  if (!rows.length) return { play() {}, setProgress() {}, stop() {} };

  const T = TOKENS();
  const colors = { ink: T.ink, sight: T.sight, rule: T.ink2 }; // "total" line drawn slightly darker than a pure rule so it stays legible
  const { width: W, height: H } = container.getBoundingClientRect();

  // "500,000" against a 46px margin runs past x=0 and gets clipped by the
  // container's overflow:hidden — the margin was sized for nothing in
  // particular. Two fixes: format ticks as "500k" (much narrower), and size
  // the margin to whatever the widest formatted tick actually needs, using
  // the same (nice()'d) domain the final y-scale below will use.
  const maxY = d3.max(rows, d => Math.max(d.total, d.gun, d.trap || 0));
  const yDomain = d3.scaleLinear().domain([0, maxY]).nice().domain();
  const previewTicks = d3.scaleLinear().domain(yDomain).ticks(4);
  const tickCharW = 10 * 0.62; // 10px sans-serif digits/letters, generous estimate
  const widestTickW = Math.max(...previewTicks.map(v => formatK(v).length)) * tickCharW;

  // Reserved above the frame: subtitle line, swatch legend, and the y-axis
  // title (horizontal, never rotated). Below the frame: the x tick row plus
  // its own axis title, plus the closing note.
  const subtitleH = 14, legendH = 14, yAxisTitleH = 13, xAxisTitleH = 13;
  const M = {
    top: 6 + subtitleH + legendH + yAxisTitleH + 4,
    right: 86,
    bottom: 28 + xAxisTitleH,
    left: Math.ceil(widestTickW) + 16,
  };

  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%").style("height", "100%");

  // ---- subtitle: what one line is, and the window ---------------------------
  svg.append("text")
    .attr("x", 2).attr("y", 6 + 9)
    .attr("font-family", T.sans).attr("font-size", 12).attr("fill", T.ink2)
    .text("One line = one licence type, 1975 to 2021");

  // ---- legend: swatches for the three lines, in addition to the end labels --
  const legendY = 6 + subtitleH + 11;
  const legendItems = [
    { label: "gun", fill: colors.ink },
    { label: "trap", fill: colors.sight },
    { label: "all", fill: colors.rule },
  ];
  let legendCx = 2;
  legendItems.forEach(item => {
    const sw = 12, sh = 2.5;
    svg.append("rect")
      .attr("x", legendCx).attr("y", legendY - sh - 1).attr("width", sw).attr("height", sh)
      .attr("fill", item.fill);
    legendCx += sw + 4;
    svg.append("text")
      .attr("x", legendCx).attr("y", legendY)
      .attr("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
      .text(item.label);
    legendCx += item.label.length * 10 * 0.58 + 14;
  });

  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom - 16; // 16px reserved for the closing note

  const x = d3.scaleLinear().domain(d3.extent(rows, d => d.year)).range([M.left, M.left + plotW]);
  const y = d3.scaleLinear().domain(yDomain).range([M.top + plotH, M.top]);

  // ---- y-axis title: horizontal, above the axis, never rotated --------------
  svg.append("text")
    .attr("x", 2).attr("y", M.top - yAxisTitleH + 8)
    .attr("font-family", T.sans).attr("font-size", 10.5).attr("fill", T.ink2)
    .text("Licence holders");

  // Hairline frame + y ticks.
  svg.append("rect")
    .attr("x", M.left).attr("y", M.top).attr("width", plotW).attr("height", plotH)
    .attr("fill", "none").attr("stroke", T.rule);
  svg.append("g").selectAll("text").data(y.ticks(4)).join("text")
    .attr("x", M.left - 6).attr("y", d => y(d) + 3)
    .attr("text-anchor", "end")
    .attr("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
    .text(d => formatK(d));

  // Candidate ticks (every decade, plus the first and last published year)
  // thinned to whatever the plot is actually wide enough to hold: keep a
  // candidate only if it clears the previous kept tick by minGap px, and
  // always keep the last year even if that means dropping the one before it
  // — the final year (2021) matters more than an evenly spaced grid.
  const candidates = [...new Set(rows.map(r => r.year).filter((y2, i, arr) => i === 0 || i === arr.length - 1 || y2 % 10 === 0))].sort((a, b) => a - b);
  const minGap = 26;
  const xTicks = [];
  candidates.forEach(yv => {
    if (!xTicks.length || x(yv) - x(xTicks.at(-1)) >= minGap) {
      xTicks.push(yv);
    } else if (yv === candidates.at(-1)) {
      xTicks.pop();
      xTicks.push(yv);
    }
  });
  svg.append("g").selectAll("text").data(xTicks).join("text")
    .attr("x", d => x(d)).attr("y", M.top + plotH + 16)
    .attr("text-anchor", "middle")
    .attr("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
    .text(d => d);
  svg.append("text")
    .attr("x", M.left + plotW / 2).attr("y", M.top + plotH + 16 + xAxisTitleH)
    .attr("text-anchor", "middle")
    .attr("font-family", T.sans).attr("font-size", 10.5).attr("fill", T.ink2)
    .text("Year");

  const lineGens = SERIES.map(s => ({
    ...s,
    gen: d3.line().defined(d => d[s.key] != null).x(d => x(d.year)).y(d => y(d[s.key])),
  }));

  const paths = lineGens.map(s => {
    const path = svg.append("path")
      .datum(rows)
      .attr("fill", "none")
      .attr("stroke", colors[s.colorKey])
      .attr("stroke-width", s.key === "total" ? 1.25 : 1.75)
      .attr("d", s.gen);
    return { spec: s, path };
  });

  // End labels: the last defined point of each series.
  const endLabels = paths.map(({ spec, path }) => {
    const defined = rows.filter(r => r[spec.key] != null);
    const last = defined.at(-1);
    if (!last) return null;
    const g = svg.append("g").attr("opacity", 0);
    g.append("text")
      .attr("x", x(last.year) + 6).attr("y", y(last[spec.key]) + 3)
      .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 11)
      .attr("fill", colors[spec.colorKey])
      .text(spec.end);
    return g;
  });

  const startYear = rows[0];
  const startLabel = svg.append("g").attr("opacity", 0);
  startLabel.append("text")
    .attr("x", x(startYear.year)).attr("y", y(startYear.gun) - 8)
    .attr("text-anchor", "start")
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 11)
    .attr("fill", T.ink)
    .text("493,700 gun, 1975");

  const note = svg.append("g").attr("opacity", 0);
  note.append("text")
    .attr("x", M.left).attr("y", H - 4)
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 11.5)
    .attr("fill", T.ink2)
    .text("119,100 of 213,400 holders were 60 or older in 2021.");

  const lengths = paths.map(({ path }) => pathLength(path.node()));
  paths.forEach(({ path }, i) => {
    path.attr("stroke-dasharray", lengths[i]).attr("stroke-dashoffset", lengths[i]);
  });

  function play() {
    // "Played once, on scroll" (chapter 4 has no director driving
    // setProgress) means nothing else guarantees this ever finishes before
    // it's looked at — a quick screenshot or a fast scroll can land mid-draw
    // and never see the rest. Reduced motion jumps straight to the end
    // state instead of racing a ~1.6s staggered reveal against whatever
    // happens to look at the chart next.
    if (prefersReducedMotion()) {
      paths.forEach(({ path }) => path.interrupt().attr("stroke-dashoffset", 0));
      startLabel.interrupt().attr("opacity", 1);
      endLabels.forEach(g => g && g.interrupt().attr("opacity", 1));
      note.interrupt().attr("opacity", 1);
      return;
    }
    paths.forEach(({ path }, i) => {
      path.interrupt().transition().delay(i * 120).duration(900).ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    });
    startLabel.interrupt().transition().delay(120).duration(300).attr("opacity", 1);
    endLabels.forEach(g => g && g.interrupt().transition().delay(1100).duration(300).attr("opacity", 1));
    note.interrupt().transition().delay(1300).duration(300).attr("opacity", 1);
  }

  function setProgress(t) {
    paths.forEach(({ path }, i) => {
      path.interrupt().attr("stroke-dashoffset", lengths[i] * (1 - t));
    });
    startLabel.interrupt().attr("opacity", t > 0.05 ? 1 : 0);
    endLabels.forEach(g => g && g.interrupt().attr("opacity", t >= 0.9 ? 1 : 0));
    note.interrupt().attr("opacity", t >= 0.95 ? 1 : 0);
  }

  function stop() {
    paths.forEach(({ path }) => path.interrupt());
    startLabel.interrupt();
    endLabels.forEach(g => g && g.interrupt());
    note.interrupt();
  }

  return { play, setProgress, stop };
}
