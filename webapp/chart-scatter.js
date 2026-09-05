// Spring against autumn, 13 years: claim 4's chart. A high spring does not
// pin down the autumn — the vertical scatter at any given x is the point —
// so points are plotted, not connected, and FY2026's spring lands as a
// vertical line with no autumn yet to plot against it.
//
// Assumes D3 v7 is loaded globally.

/** Apr-Jun and Oct+Nov sums for every closed fiscal year. */
export function scatterPoints(ctx) {
  const mn = ctx && ctx.monthly_national;
  if (!mn || !mn.years) return [];
  const sightings = mn.sightings || {};
  return mn.years
    .filter(fy => fy <= 2025)
    .map(fy => {
      const v = sightings[String(fy)] || [];
      if (v.some(x => x == null) || v.length < 12) return null;
      const spring = v[0] + v[1] + v[2];
      const autumn = v[6] + v[7];
      return { fy, spring, autumn };
    })
    .filter(Boolean);
}

/** The Oct+Nov / Apr-Jun ratio's range across the points — read off the data
 * for the "0.23x to 3.49x" note rather than writing the figures down. */
export function autumnSpringRatioRange(points) {
  if (!points.length) return null;
  const ratios = points.map(p => p.autumn / p.spring);
  return { min: Math.min(...ratios), max: Math.max(...ratios) };
}

/**
 * What-if full-year totals for a hypothetical spring, applying each closed
 * year's own full-year/spring ratio (its "seasonal shape") to that spring.
 * These are arithmetic, not forecasts — every past shape gives one number.
 */
export function whatIfRange(ctx, spring2026) {
  const mn = ctx && ctx.monthly_national;
  if (!mn || !mn.years) return null;
  const sightings = mn.sightings || {};
  const whatIfs = mn.years
    .filter(fy => fy <= 2025)
    .map(fy => {
      const v = sightings[String(fy)] || [];
      if (v.some(x => x == null) || v.length < 12) return null;
      const spring = v[0] + v[1] + v[2];
      const full = v.reduce((s, x) => s + x, 0);
      if (spring <= 0) return null;
      return (full / spring) * spring2026;
    })
    .filter(v => v != null);
  if (!whatIfs.length) return null;
  return { min: Math.min(...whatIfs), max: Math.max(...whatIfs) };
}

/**
 * Nudge label positions down, one box-height at a time, until none overlaps
 * one already placed — several years cluster within a few pixels of each
 * other (FY2015 and FY2022 both sit near 4k/1.5k), and left alone their
 * "FY'xx" labels print on top of each other.
 */
export function declutterLabels(items, boxW = 34, boxH = 12) {
  const placed = [];
  return items.map(it => {
    let y = it.y;
    let guard = 0;
    while (placed.some(p => Math.abs(p.x - it.x) < boxW && Math.abs(p.y - y) < boxH) && guard < 10) {
      y += boxH;
      guard++;
    }
    placed.push({ x: it.x, y });
    return { ...it, y };
  });
}

/** Point i's reveal fraction: points appear one at a time, in year order. */
export function pointRevealOpacity(t, i, n, growEnd = 0.85) {
  if (n <= 0) return 1;
  const start = (i / n) * growEnd;
  const end = start + (1 / n) * growEnd + 0.02;
  const span = end - start;
  if (span <= 0) return t >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (t - start) / span));
}

function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  return {
    ink: v("--ink", "#2b2620"),
    ink2: v("--ink-2", "#5a5148"),
    rule: v("--rule", "#d8cdb8"),
    sight: v("--sight", "#4a6741"),
    harm: v("--harm", "#b5482a"),
    serif: v("--font-serif", "Georgia, 'Times New Roman', serif"),
    sans: v("--font-sans", "system-ui, sans-serif"),
    mono: v("--font-mono", "ui-monospace, monospace"),
  };
}

const MARGIN = { top: 28, right: 20, bottom: 34, left: 46 };
const SPRING_2026 = 12628;

export function mountScatter(container, data) {
  container.innerHTML = "";
  const ctx = data && data.context;
  const points = scatterPoints(ctx);
  if (!points.length) return { play() {}, setProgress() {}, stop() {} };

  const T = readTokens();
  const ratioRange = autumnSpringRatioRange(points);
  const { width: W, height: H } = container.getBoundingClientRect();
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");

  const plotW = W - MARGIN.left - MARGIN.right;
  const plotH = H - MARGIN.top - MARGIN.bottom;

  const xMax = Math.max(SPRING_2026, d3.max(points, d => d.spring)) * 1.08;
  const yMax = d3.max(points, d => d.autumn) * 1.1;
  const x = d3.scaleLinear().domain([0, xMax]).range([MARGIN.left, MARGIN.left + plotW]);
  const y = d3.scaleLinear().domain([0, yMax]).range([MARGIN.top + plotH, MARGIN.top]);

  // Hairline frame.
  svg.append("rect")
    .attr("x", MARGIN.left).attr("y", MARGIN.top)
    .attr("width", plotW).attr("height", plotH)
    .attr("fill", "none").attr("stroke", T.rule).attr("stroke-width", 1);

  // Axis ticks.
  const gAxis = svg.append("g");
  x.ticks(5).forEach(v => {
    if (v === 0) return;
    gAxis.append("line")
      .attr("x1", x(v)).attr("x2", x(v))
      .attr("y1", MARGIN.top).attr("y2", MARGIN.top + plotH)
      .attr("stroke", T.rule).attr("stroke-width", 1).attr("opacity", 0.4);
    gAxis.append("text")
      .attr("x", x(v)).attr("y", MARGIN.top + plotH + 16)
      .attr("text-anchor", "middle")
      .style("font-family", T.sans).attr("font-size", 11).attr("fill", T.ink2)
      .text(d3.format("~s")(v));
  });
  y.ticks(4).forEach(v => {
    if (v === 0) return;
    gAxis.append("text")
      .attr("x", MARGIN.left - 8).attr("y", y(v) + 4)
      .attr("text-anchor", "end")
      .style("font-family", T.sans).attr("font-size", 11).attr("fill", T.ink2)
      .text(d3.format("~s")(v));
  });
  gAxis.append("text")
    .attr("x", MARGIN.left + plotW / 2).attr("y", H - 4)
    .attr("text-anchor", "middle")
    .style("font-family", T.sans).attr("font-size", 11).attr("fill", T.ink2)
    .text("Apr-Jun sightings");

  // The vertical line at spring 2026.
  const lineX = x(SPRING_2026);
  const narrow = plotW < 420;
  const gLine = svg.append("g").attr("opacity", 0);
  gLine.append("line")
    .attr("x1", lineX).attr("x2", lineX)
    .attr("y1", MARGIN.top).attr("y2", MARGIN.top + plotH)
    .attr("stroke", T.sight).attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4 3");
  // The label sits at the line's foot, not its head: no year's spring comes
  // anywhere near 12,628, so the strip along the bottom of the line is
  // always clear, whereas the top row is where FY'25's own label sits. On
  // a narrow (phone) panel the 13 points run close enough to the bottom
  // that even the foot isn't reliably clear, so the label there is dropped —
  // the chart's own caption already says "the line is April to June 2026".
  if (!narrow) {
    gLine.append("text")
      .attr("x", lineX - 5).attr("y", MARGIN.top + plotH - 6)
      .attr("text-anchor", "end")
      .style("font-family", T.serif).style("font-style", "italic")
      .attr("font-size", 12).attr("fill", T.sight)
      .text("spring 2026");
  }

  const RECORD_YEARS = new Set([2023, 2025]);
  const dots = svg.append("g").selectAll("circle")
    .data(points)
    .join("circle")
    .attr("cx", d => x(d.spring))
    .attr("cy", d => y(d.autumn))
    .attr("r", d => (RECORD_YEARS.has(d.fy) ? 5 : 3.5))
    .attr("fill", d => (RECORD_YEARS.has(d.fy) ? T.ink : T.sight))
    .attr("opacity", 0);

  const labelPositions = declutterLabels(
    points.map(d => ({ fy: d.fy, x: x(d.spring) + 6, y: y(d.autumn) - 6 }))
  );
  const labelY = new Map(labelPositions.map(p => [p.fy, p.y]));

  const labels = svg.append("g").selectAll("text")
    .data(points)
    .join("text")
    .attr("x", d => x(d.spring) + 6)
    .attr("y", d => labelY.get(d.fy))
    .style("font-family", T.mono).attr("font-size", 10)
    .attr("fill", d => (RECORD_YEARS.has(d.fy) ? T.ink : T.ink2))
    .style("font-variant-numeric", "tabular-nums")
    .text(d => `FY’${String(d.fy).slice(2)}`)
    .attr("opacity", 0);

  // The one note, in the margin above the frame — never inside the plot, so
  // it can never land on a point or label no matter how the 13 years happen
  // to be scattered at a given panel width.
  const gNote = svg.append("g").attr("opacity", 0);
  if (ratioRange) {
    const min = ratioRange.min.toFixed(2), max = ratioRange.max.toFixed(2);
    const noteText = narrow
      ? `Oct+Nov: ${min}x-${max}x the spring`
      : `Oct+Nov ranged from ${min}x to ${max}x the spring`;
    gNote.append("text")
      .attr("x", MARGIN.left).attr("y", MARGIN.top - 10)
      .attr("text-anchor", "start")
      .style("font-family", T.serif).style("font-style", "italic")
      .attr("font-size", narrow ? 10 : 12).attr("fill", T.ink2)
      .text(noteText);
  }

  function renderFrame(t) {
    const n = points.length;
    dots.attr("opacity", (d, i) => pointRevealOpacity(t, i, n));
    labels.attr("opacity", (d, i) => pointRevealOpacity(t, i, n));
    gLine.attr("opacity", t >= 0.9 ? Math.min(1, (t - 0.9) / 0.1) : 0);
    gNote.attr("opacity", t >= 0.9 ? Math.min(1, (t - 0.9) / 0.1) : 0);
  }

  function play() {
    dots.interrupt(); labels.interrupt(); gLine.interrupt(); gNote.interrupt();
    const n = points.length;
    dots.transition().delay((_, i) => (i / n) * 0.85 * 1500).duration(260).attr("opacity", 1);
    labels.transition().delay((_, i) => (i / n) * 0.85 * 1500 + 80).duration(260).attr("opacity", 1);
    gLine.transition().delay(1500 * 0.9).duration(300).attr("opacity", 1);
    gNote.transition().delay(1500 * 0.9).duration(300).attr("opacity", 1);
  }

  function setProgress(t) {
    dots.interrupt(); labels.interrupt(); gLine.interrupt(); gNote.interrupt();
    renderFrame(t);
  }

  function stop() {
    dots.interrupt(); labels.interrupt(); gLine.interrupt(); gNote.interrupt();
  }

  setProgress(0);

  return { play, setProgress, stop };
}
