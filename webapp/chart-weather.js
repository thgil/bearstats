// Weather does not explain the crop.
//
// For Akita: the prior calendar summer's June-August mean temperature
// against that fiscal year's Tohoku Regional Forest Office Akita beech
// index, FY2013-2025. The point of this chart is a null result, so it is
// deliberately quiet: a loose scatter, one small note, no trend line drawn
// (drawing one would suggest a relationship the numbers do not support).
// The rho/n quoted in the note are the office's own full 16-year weather
// pass (`docs/research/cross-weather-vs-mast.md`), which used Akita's
// independent five-site score back to 2010 because the Forest Office index
// itself only starts at FY2012; that is stated in the caption, not implied
// by the 13 points drawn here.
//
// Assumes D3 v7 is loaded globally.

/**
 * {fy, temp, index, category}[] for FY2013-2025: `temp` is the mean JJA
 * temperature at Akita in calendar year fy-1 (the summer before that
 * autumn's survey); `index` is the Tohoku office's Akita beech index for
 * that fiscal year's autumn result.
 */
export function weatherPairs(ctx) {
  const tho = ctx?.context?.mast?.tohoku_office || [];
  const weather = ctx?.context?.weather?.akita || [];
  const tempByYear = new Map(weather.map(r => [r.year, r.jja_temp]));
  const akitaRows = tho.filter(r => r.pref === "akita" && r.index != null && r.fy >= 2013);

  return akitaRows
    .map(r => ({
      fy: r.fy,
      temp: tempByYear.get(r.fy - 1) ?? null,
      index: r.index,
      category: r.category_normalised,
    }))
    .filter(d => d.temp != null)
    .sort((a, b) => a.fy - b.fy);
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

const NOTE = "rho = +0.45, n = 16: no support for hot summers causing failures";
const CAPTION = "Akita, prior-summer (Jun-Aug) mean temperature vs the same year's beech score, 2010-2025 (Forest Office cross-check)";

export function mountWeather(container, data) {
  container.innerHTML = "";
  const points = weatherPairs(data);
  if (!points.length) return { play() {}, setProgress() {}, stop() {} };

  const T = TOKENS();
  const { width: W, height: H } = container.getBoundingClientRect();
  const M = { top: 16, right: 20, bottom: 34, left: 34 };

  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%").style("height", "100%");

  const noteH = 30;
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom - noteH;

  const x = d3.scaleLinear()
    .domain(d3.extent(points, d => d.temp)).nice()
    .range([M.left, M.left + plotW]);
  const y = d3.scaleLinear()
    .domain([0, 5]).nice()
    .range([M.top + plotH, M.top]);

  // Hairline frame.
  svg.append("rect")
    .attr("x", M.left).attr("y", M.top).attr("width", plotW).attr("height", plotH)
    .attr("fill", "none").attr("stroke", T.rule);

  const xTicks = x.ticks(5);
  svg.append("g").selectAll("text").data(xTicks).join("text")
    .attr("x", d => x(d)).attr("y", M.top + plotH + 16)
    .attr("text-anchor", "middle")
    .attr("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
    .text(d => `${d}°C`);
  const yTicks = y.ticks(5);
  svg.append("g").selectAll("text").data(yTicks).join("text")
    .attr("x", M.left - 6).attr("y", d => y(d) + 3)
    .attr("text-anchor", "end")
    .attr("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
    .text(d => d);

  const dots = svg.append("g").selectAll("circle").data(points).join("circle")
    .attr("cx", d => x(d.temp)).attr("cy", d => y(d.index))
    .attr("r", 4).attr("fill", T.sight).attr("fill-opacity", 0.75)
    .attr("opacity", 0);

  // The point of this chart is that the years cluster with no pattern, so
  // several fall close together in both axes (e.g. '19, '21, '23). A greedy
  // vertical nudge keeps every year label readable without pulling any of
  // them away from its own point by more than a few rows, clamped so a
  // nudge never lands on the axis ticks above or below the frame.
  const labelMinY = M.top + 8, labelMaxY = M.top + plotH - 6;
  const placed = [];
  const labelPos = points.map(d => {
    const lx = x(d.temp) + 6;
    const base = y(d.index) - 6;
    let ly = Math.min(labelMaxY, Math.max(labelMinY, base));
    let attempt = 0;
    while (placed.some(p => Math.abs(p.x - lx) < 26 && Math.abs(p.y - ly) < 12) && attempt < 12) {
      attempt++;
      const dir = attempt % 2 === 0 ? 1 : -1;
      const candidate = base + dir * Math.ceil(attempt / 2) * 12;
      ly = Math.min(labelMaxY, Math.max(labelMinY, candidate));
    }
    placed.push({ x: lx, y: ly });
    return { x: lx, y: ly };
  });

  const labels = svg.append("g").selectAll("text").data(points).join("text")
    .attr("x", (d, i) => labelPos[i].x).attr("y", (d, i) => labelPos[i].y)
    .attr("font-family", T.mono).attr("font-size", 10)
    .attr("fill", T.ink2)
    .attr("opacity", 0)
    .text(d => `'${String(d.fy).slice(2)}`);

  // Trimmed to the plot width so neither line runs past the frame at 340px;
  // the full wording still reaches the reader through the step's own prose.
  const textMaxW = W - M.left - 4;
  const truncateToWidth = (text, fontSize) => {
    const maxChars = Math.max(6, Math.floor(textMaxW / (fontSize * 0.6)));
    return text.length <= maxChars ? text : text.slice(0, maxChars - 1).trimEnd() + "…";
  };

  const note = svg.append("g").attr("opacity", 0);
  note.append("text")
    .attr("x", M.left).attr("y", H - 18)
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 12)
    .attr("fill", T.ink)
    .text(truncateToWidth(NOTE, 12));
  note.append("text")
    .attr("x", M.left).attr("y", H - 4)
    .attr("font-family", T.sans).attr("font-size", 9.5)
    .attr("fill", T.ink2)
    .text(truncateToWidth(CAPTION, 9.5));

  function play() {
    dots.interrupt().transition().delay((_, i) => i * 60).duration(1).attr("opacity", 1);
    labels.interrupt().transition().delay((_, i) => i * 60 + 80).duration(1).attr("opacity", 1);
    note.interrupt().transition().delay(points.length * 60 + 200).duration(300).attr("opacity", 1);
  }

  function setProgress(t) {
    const cutoff = t * points.length;
    dots.interrupt().attr("opacity", (_, i) => (i < cutoff ? 1 : 0));
    labels.interrupt().attr("opacity", (_, i) => (i < cutoff ? 1 : 0));
    note.interrupt().attr("opacity", t >= 0.9 ? 1 : 0);
  }

  function stop() {
    dots.interrupt(); labels.interrupt(); note.interrupt();
  }

  return { play, setProgress, stop };
}
