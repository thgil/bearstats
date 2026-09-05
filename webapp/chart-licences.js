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
      gun: (r.gun1 ?? 0) + (r.gun2 ?? 0),
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

export function mountLicences(container, data) {
  container.innerHTML = "";
  const rows = licenceSeries(data);
  if (!rows.length) return { play() {}, setProgress() {}, stop() {} };

  const T = TOKENS();
  const colors = { ink: T.ink, sight: T.sight, rule: T.ink2 }; // "total" line drawn slightly darker than a pure rule so it stays legible
  const { width: W, height: H } = container.getBoundingClientRect();
  const M = { top: 16, right: 86, bottom: 26, left: 46 };

  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%").style("height", "100%");

  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom - 16; // 16px reserved for the closing note

  const x = d3.scaleLinear().domain(d3.extent(rows, d => d.year)).range([M.left, M.left + plotW]);
  const maxY = d3.max(rows, d => Math.max(d.total, d.gun, d.trap || 0));
  const y = d3.scaleLinear().domain([0, maxY]).nice().range([M.top + plotH, M.top]);

  // Hairline frame + y ticks.
  svg.append("rect")
    .attr("x", M.left).attr("y", M.top).attr("width", plotW).attr("height", plotH)
    .attr("fill", "none").attr("stroke", T.rule);
  svg.append("g").selectAll("text").data(y.ticks(4)).join("text")
    .attr("x", M.left - 6).attr("y", d => y(d) + 3)
    .attr("text-anchor", "end")
    .attr("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
    .text(d => d3.format(",")(d));

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
