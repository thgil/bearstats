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

// The in-chart note carries only the statistic; the explanation ("no
// support for hot summers causing failures") and the full methods sentence
// both already live in the page's own <p class="g-caption"> next to this
// panel, so repeating a trimmed, truncated copy of either inside the SVG
// only doubled the text without ever managing to say all of it.
const NOTE = "rho = +0.45, n = 16";

export function mountWeather(container, data) {
  container.innerHTML = "";
  const points = weatherPairs(data);
  if (!points.length) return { play() {}, setProgress() {}, stop() {} };

  const T = TOKENS();
  const { width: W, height: H } = container.getBoundingClientRect();

  // Fixed side margins, decided before the wrap check below (which needs a
  // plot-width estimate that does not itself depend on the vertical margins).
  const SIDE = { right: 20, left: 34 };
  const plotWEstimate = W - SIDE.left - SIDE.right;

  /** Greedy word-wrap into as many lines as `text` needs to fit maxWidth px
   * at fontSize — never truncates, so a narrow panel gets a taller axis
   * title instead of a clipped one. */
  function wrapTitle(text, maxWidth, fontSize) {
    const charW = fontSize * 0.56;
    const maxChars = Math.max(10, Math.floor(maxWidth / charW));
    if (text.length <= maxChars) return [text];
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      const cand = line ? `${line} ${w}` : w;
      if (cand.length > maxChars && line) { lines.push(line); line = w; }
      else line = cand;
    }
    if (line) lines.push(line);
    return lines;
  }

  const subtitleText = W < 420
    ? "One dot = one year: no relationship"
    : "One dot = one year, FY2013-2025: no relationship";
  const xTitleText = "June to August mean temperature at Akita, the summer before";
  const xTitleLines = wrapTitle(xTitleText, plotWEstimate, 10.5);

  const subtitleH = 14, yAxisTitleH = 13, xAxisTitleLineH = 13;
  const xAxisTitleH = xAxisTitleLineH * xTitleLines.length;
  const M = { top: 8 + subtitleH + yAxisTitleH + 4, right: SIDE.right, bottom: 20 + xAxisTitleH, left: SIDE.left };

  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%").style("height", "100%");

  // ---- subtitle: what one mark is, the window, and the headline result -----
  svg.append("text")
    .attr("x", 2).attr("y", 8 + 9)
    .attr("font-family", T.sans).attr("font-size", 12).attr("fill", T.ink2)
    .text(subtitleText);

  const noteH = 18; // one line now that the explanation lives in the page caption
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom - noteH;

  const x = d3.scaleLinear()
    .domain(d3.extent(points, d => d.temp)).nice()
    .range([M.left, M.left + plotW]);
  const y = d3.scaleLinear()
    .domain([0, 5]).nice()
    .range([M.top + plotH, M.top]);

  // ---- y-axis title: horizontal, above the axis, never rotated -------------
  svg.append("text")
    .attr("x", 2).attr("y", M.top - yAxisTitleH + 8)
    .attr("font-family", T.sans).attr("font-size", 10.5).attr("fill", T.ink2)
    .text("Akita beech score (0 to 5), that autumn");

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
  svg.append("g").selectAll("text").data(xTitleLines).join("text")
    .attr("x", M.left + plotW / 2).attr("y", (d, i) => M.top + plotH + 16 + xAxisTitleLineH * (i + 1))
    .attr("text-anchor", "middle")
    .attr("font-family", T.sans).attr("font-size", 10.5).attr("fill", T.ink2)
    .text(d => d);
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
  // several fall within a few px of each other in both axes at once (e.g.
  // FY2014/'19/'21/'23 are all within 0.1°C and 0.3 index of each other) —
  // close enough that nudging a label up or down alone still leaves it
  // overlapping a neighbour at the same x. Each label instead tries slots in
  // a widening ring around its own point (12 angles at each of five radii),
  // in point order, taking the first that doesn't overlap anything already
  // placed; the growing radius means even a four-point knot can spread out
  // into the surrounding empty space rather than only ever trying to fit
  // beside itself.
  const labelMinY = M.top + 8, labelMaxY = M.top + plotH - 6;
  const labelPlotLeft = M.left + 2, labelPlotRight = M.left + plotW - 2;
  const labelW = 3 * 10 * 0.62, labelH = 11; // "'XX" at 10px mono, generous estimate
  const boxesOverlap = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

  function candidatesFor(px, py) {
    const angles = [0, 45, -45, 90, -90, 135, -135, 180, 22, -22, 158, -158];
    const radii = [10, 16, 24, 34, 46];
    const cands = [];
    for (const r of radii) {
      for (const a of angles) {
        const rad = (a * Math.PI) / 180;
        const dx = Math.sin(rad) * r, dy = -Math.cos(rad) * r;
        const lx = Math.min(labelPlotRight, Math.max(labelPlotLeft, px + dx));
        const ly = Math.min(labelMaxY, Math.max(labelMinY, py + dy));
        const anchor = dx > 2 ? "start" : dx < -2 ? "end" : "middle";
        const left = anchor === "start" ? lx : anchor === "end" ? lx - labelW : lx - labelW / 2;
        cands.push({ x: lx, y: ly, anchor, left, right: left + labelW, top: ly - labelH, bottom: ly + 3 });
      }
    }
    return cands;
  }

  const placedBoxes = [];
  const order = points.map((_, i) => i).sort((a, b) => x(points[a].temp) - x(points[b].temp));
  const labelPos = new Array(points.length);
  order.forEach(i => {
    const d = points[i];
    const cands = candidatesFor(x(d.temp), y(d.index));
    const chosen = cands.find(c => !placedBoxes.some(b => boxesOverlap(c, b))) || cands[0];
    placedBoxes.push(chosen);
    labelPos[i] = chosen;
  });

  const labels = svg.append("g").selectAll("text").data(points).join("text")
    .attr("x", (d, i) => labelPos[i].x).attr("y", (d, i) => labelPos[i].y)
    .attr("text-anchor", (d, i) => labelPos[i].anchor)
    .attr("font-family", T.mono).attr("font-size", 10)
    .attr("fill", T.ink2)
    .attr("opacity", 0)
    .text(d => `'${String(d.fy).slice(2)}`);

  // In-chart note: just the statistic. The explanation and the full methods
  // sentence live in the page's own caption next to this panel (never
  // truncated here, because there's nothing left to truncate).
  const note = svg.append("g").attr("opacity", 0);
  note.append("text")
    .attr("x", M.left).attr("y", H - 4)
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 12)
    .attr("fill", T.ink)
    .text(NOTE);

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
