// Thirteen years of sightings, plus the FY2026 stub: claim 1's headline chart.
// One bar per fiscal year so the reader sees FY2025 standing clear of every
// year before it, and FY2026 sitting low because only three months of it
// have happened yet — the bar's own shortness carries "this is partial",
// no separate annotation needed for that part.
//
// Assumes D3 v7 is loaded globally.

/** Sum a fiscal year's monthly sightings from context.json. FY2026 sums to
 * only its reported months (the rest are null) — that partial total is
 * exactly the "Apr-Jun 12,628" figure the chart labels. */
export function annualSeries(ctx) {
  const mn = ctx && ctx.monthly_national;
  if (!mn || !mn.years) return [];
  const sightings = mn.sightings || {};
  return mn.years.map(fy => {
    const values = sightings[String(fy)] || [];
    const total = values.reduce((sum, v) => sum + (v || 0), 0);
    const partial = values.some(v => v == null) || values.length < 12;
    return { fy, total, partial };
  });
}

/**
 * The record year against its runner-up, both drawn from closed years only —
 * derived so the ratio in the callout cannot drift out of sync with the bars.
 */
export function recordCallout(rows) {
  const closed = rows.filter(r => !r.partial);
  if (!closed.length) return null;
  const sorted = [...closed].sort((a, b) => b.total - a.total);
  const top = sorted[0];
  const runnerUp = sorted[1] || null;
  if (!runnerUp || runnerUp.total <= 0) {
    return { top, runnerUp: null, ratio: null, text: `${top.total.toLocaleString()}` };
  }
  const ratio = top.total / runnerUp.total;
  return {
    top,
    runnerUp,
    ratio,
    text: `${top.total.toLocaleString()}, ${ratio.toFixed(1)}x the previous high`,
  };
}

/**
 * Bar i's grown fraction at progress t: bars rise left to right, one at a
 * time, each in an equal slice of [0, growEnd]. Pure so play()'s staggered
 * transition and setProgress(t)'s instant frame agree.
 */
export function barGrowFraction(t, i, n, growEnd = 0.85) {
  if (n <= 0) return 0;
  const start = (i / n) * growEnd;
  const end = ((i + 1) / n) * growEnd;
  const span = end - start;
  const local = span <= 0 ? (t >= end ? 1 : 0) : (t - start) / span;
  return Math.min(1, Math.max(0, local));
}

/** Callouts fade in only once every bar has finished rising. */
export function calloutOpacityForProgress(t, growEnd = 0.85) {
  const span = 1 - growEnd;
  if (span <= 0) return t >= growEnd ? 1 : 0;
  return Math.min(1, Math.max(0, (t - growEnd) / span));
}

function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  return {
    ink: v("--ink", "#2b2620"),
    ink2: v("--ink-2", "#5a5148"),
    rule: v("--rule", "#d8cdb8"),
    sight: v("--sight", "#4a6741"),
    sight2: v("--sight-2", "#7f9a6c"),
    paper: v("--paper", "#f6f1e7"),
    serif: v("--font-serif", "Georgia, 'Times New Roman', serif"),
    sans: v("--font-sans", "system-ui, sans-serif"),
    mono: v("--font-mono", "ui-monospace, monospace"),
  };
}

const MARGIN = { top: 42, right: 14, bottom: 26, left: 44 };

let instanceCount = 0;

export function mountAnnual(container, data) {
  container.innerHTML = "";
  const ctx = data && data.context;
  const rows = annualSeries(ctx);
  if (!rows.length) return { play() {}, setProgress() {}, stop() {} };

  const T = readTokens();
  const record = recordCallout(rows);
  const { width: W, height: H } = container.getBoundingClientRect();
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");

  const plotW = W - MARGIN.left - MARGIN.right;
  const plotH = H - MARGIN.top - MARGIN.bottom;

  const x = d3.scaleBand()
    .domain(rows.map(d => d.fy))
    .range([MARGIN.left, MARGIN.left + plotW])
    .padding(0.24);
  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, d => d.total) * 1.08])
    .range([MARGIN.top + plotH, MARGIN.top]);

  // Hairline frame around the plot — the panel itself has no background.
  svg.append("rect")
    .attr("x", MARGIN.left).attr("y", MARGIN.top)
    .attr("width", plotW).attr("height", plotH)
    .attr("fill", "none").attr("stroke", T.rule).attr("stroke-width", 1);

  // A couple of quiet horizontal grid lines, tick labels in sans.
  const gGrid = svg.append("g");
  y.ticks(4).slice(1).forEach(v => {
    gGrid.append("line")
      .attr("x1", MARGIN.left).attr("x2", MARGIN.left + plotW)
      .attr("y1", y(v)).attr("y2", y(v))
      .attr("stroke", T.rule).attr("stroke-width", 1).attr("opacity", 0.6);
    gGrid.append("text")
      .attr("x", MARGIN.left - 8).attr("y", y(v) + 4)
      .attr("text-anchor", "end")
      .style("font-family", T.sans).attr("font-size", 11).attr("fill", T.ink2)
      .text(d3.format("~s")(v));
  });

  // Fiscal-year ticks, thinned when bars get narrow so labels never collide.
  const labelEvery = plotW / rows.length < 24 ? 3 : plotW / rows.length < 34 ? 2 : 1;
  const gAxis = svg.append("g");
  rows.forEach((d, i) => {
    if (i % labelEvery !== 0 && d.fy !== record?.top.fy) return;
    gAxis.append("text")
      .attr("x", x(d.fy) + x.bandwidth() / 2)
      .attr("y", y(0) + 16)
      .attr("text-anchor", "middle")
      .style("font-family", T.sans).attr("font-size", 11).attr("fill", T.ink2)
      .text(`’${String(d.fy).slice(2)}`);
  });

  // Diagonal hatch for the partial FY2026 stub — a bar that is short because
  // the year is short, not because sightings slowed.
  const defs = svg.append("defs");
  // A unique id per mount: two chart-annual instances in one document (as in
  // the visual-QA harness) must not collide on the same <pattern> id.
  const patternId = `annual-hatch-${instanceCount++}`;
  defs.append("pattern")
    .attr("id", patternId).attr("width", 5).attr("height", 5)
    .attr("patternTransform", "rotate(45)")
    .attr("patternUnits", "userSpaceOnUse")
    .append("rect").attr("width", 2).attr("height", 5).attr("fill", T.sight2);

  const barColor = d => {
    if (d.partial) return `url(#${patternId})`;
    if (record && d.fy === record.top.fy) return T.ink;
    return T.sight;
  };

  const bars = svg.append("g").selectAll("rect")
    .data(rows)
    .join("rect")
    .attr("x", d => x(d.fy))
    .attr("width", x.bandwidth())
    .attr("y", y(0))
    .attr("height", 0)
    .attr("fill", barColor)
    .attr("stroke", d => (d.partial ? T.ink2 : "none"))
    .attr("stroke-width", d => (d.partial ? 1 : 0));

  const gLabels = svg.append("g").attr("opacity", 0);

  // FY2023 (or whichever year is the runner-up): its own value, quietly.
  if (record && record.runnerUp) {
    const d = record.runnerUp;
    gLabels.append("text")
      .attr("x", x(d.fy) + x.bandwidth() / 2)
      .attr("y", y(d.total) - 8)
      .attr("text-anchor", "middle")
      .style("font-family", T.mono).attr("font-size", 11).attr("fill", T.ink2)
      .style("font-variant-numeric", "tabular-nums")
      .text(d.total.toLocaleString());
  }

  // The FY2026 stub's own label. It's always the rightmost bar and its
  // neighbour (FY2025) is the tallest bar on the chart, so there is no y
  // at the stub's own height where a wide label could clear it on the
  // left — the label shortens to just the figure when the bars are
  // narrow, where "Apr-Jun" would otherwise spill across the FY2025 bar.
  // It's always end-anchored on the frame's own right edge rather than
  // centred on the bar: centred can run past the viewBox at any panel
  // width once the margin is small relative to the font size, not only
  // at the narrowest ones.
  const partialRow = rows.find(r => r.partial);
  if (partialRow) {
    const bandwidth = plotW / rows.length;
    const stubText = bandwidth < 24
      ? partialRow.total.toLocaleString()
      : `Apr-Jun ${partialRow.total.toLocaleString()}`;
    gLabels.append("text")
      .attr("x", MARGIN.left + plotW)
      .attr("y", y(partialRow.total) - 8)
      .attr("text-anchor", "end")
      .style("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
      // A paper-coloured halo: when narrow this label's left end can sit
      // over FY2025's (near-black) bar, where plain --ink-2 text would be
      // unreadable.
      .style("paint-order", "stroke")
      .attr("stroke", T.paper).attr("stroke-width", 3).attr("stroke-linejoin", "round")
      .text(stubText);
  }

  // The one callout: the record year, serif italic, with a 1px leader and a
  // 4px dot planted at the top of its bar.
  if (record) {
    const cx = x(record.top.fy) + x.bandwidth() / 2;
    const topY = y(record.top.total);
    const textY = MARGIN.top + 14;
    gLabels.append("line")
      .attr("x1", cx).attr("y1", topY).attr("x2", cx).attr("y2", textY + 4)
      .attr("stroke", T.ink).attr("stroke-width", 1);
    gLabels.append("circle")
      .attr("cx", cx).attr("cy", topY).attr("r", 4).attr("fill", T.ink);
    const nearRight = cx > MARGIN.left + plotW * 0.6;
    gLabels.append("text")
      .attr("x", nearRight ? cx - 6 : cx + 6)
      .attr("y", textY)
      .attr("text-anchor", nearRight ? "end" : "start")
      .style("font-family", T.serif).style("font-style", "italic")
      .attr("font-size", 14).attr("fill", T.ink)
      .text(record.text);
  }

  function renderFrame(t) {
    bars.attr("y", (d, i) => {
      const f = barGrowFraction(t, i, rows.length);
      return y(0) - f * (y(0) - y(d.total));
    }).attr("height", (d, i) => barGrowFraction(t, i, rows.length) * (y(0) - y(d.total)));
    gLabels.attr("opacity", calloutOpacityForProgress(t));
  }

  function play() {
    bars.interrupt();
    gLabels.interrupt();
    const n = rows.length;
    bars.transition()
      .delay((_, i) => (i / n) * 0.85 * 1600)
      .duration(1600 * 0.85 / n + 200)
      .ease(d3.easeCubicOut)
      .attr("y", d => y(d.total))
      .attr("height", d => y(0) - y(d.total));
    gLabels.transition().delay(1600 * 0.85).duration(1600 * 0.15 + 150).attr("opacity", 1);
  }

  function setProgress(t) {
    bars.interrupt();
    gLabels.interrupt();
    renderFrame(t);
  }

  function stop() {
    bars.interrupt();
    gLabels.interrupt();
  }

  return { play, setProgress, stop };
}
