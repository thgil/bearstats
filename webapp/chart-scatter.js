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
 *
 * `bounds.maxY`, when given, is a floor the nudging must not cross — the
 * chart uses it to keep labels off the x-axis's own tick labels below the
 * frame. Once a label would have to cross maxY to escape a collision, the
 * search switches direction and nudges up instead; `bounds.minY` is the
 * matching ceiling. `bounds.obstacles` is a further list of fixed points
 * (a chart's every dot, not just the labelled ones) a label must also clear
 * — decluttering away from another label can otherwise land a label
 * straight on top of some unrelated, unlabelled point. Each label's own
 * text runs rightward from its (x, y) anchor, not outward in every
 * direction, so an obstacle only counts as being in the way when it falls
 * in that same rightward strip (a small tolerance covers a dot sitting
 * just barely left of the anchor); each obstacle may carry its own `fy` so
 * a label skips the check against its own dot (which sits deliberately
 * close by design) and its own `w`/`h` footprint, defaulting to boxW/boxH.
 * None of `bounds` is set by default, so plain two/three-arg calls behave
 * exactly as before (always nudging down, nothing else to avoid).
 */
export function declutterLabels(items, boxW = 34, boxH = 12, bounds = {}) {
  const { minY = -Infinity, maxY = Infinity, obstacles = [] } = bounds;
  const placed = [];
  return items.map(it => {
    let y = Math.min(maxY, Math.max(minY, it.y));
    const collides = yy => placed.some(p => Math.abs(p.x - it.x) < boxW && Math.abs(p.y - yy) < boxH)
      || obstacles.some(o => {
        if (o.fy === it.fy) return false;
        const dx = o.x - it.x;
        return dx > -4 && dx < (o.w ?? boxW) && Math.abs(o.y - yy) < (o.h ?? boxH);
      });
    // Walk in one direction (down, as before) until either the collision
    // clears or the walk would cross a bound — at which point it turns
    // around and continues the other way, rather than bouncing back to the
    // position that just collided. Every candidate is re-clamped to the
    // bounds (a direction flip can still overshoot the opposite bound in a
    // tight space), and if clamping leaves a step with nowhere new to go,
    // the search stops rather than spin in place until the guard runs out.
    let dir = 1;
    let guard = 0;
    while (collides(y) && guard < 20) {
      guard++;
      let next = y + dir * boxH;
      if (next > maxY || next < minY) {
        dir = -dir;
        next = y + dir * boxH;
      }
      next = Math.min(maxY, Math.max(minY, next));
      if (next === y) break;
      y = next;
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

const MARGIN = { top: 74, right: 20, bottom: 40, left: 46 };
const SPRING_2026 = 12628;
const SUBTITLE_FULL = "One point = one fiscal year, 2013 to 2025";
const SUBTITLE_SHORT = "One point = one fiscal year";
// Below this width there isn't room for all 13 years' labels without them
// colliding, so only the years that carry the chart's claims — plus any
// point tall enough to need pointing out regardless — get one.
const NARROW_LABEL_W = 500;
const ALWAYS_LABEL_YEARS = new Set([2025, 2023, 2024, 2020, 2014, 2013]);

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

  // Subtitle: what one mark is, top-left row 1.
  svg.append("text")
    .attr("x", MARGIN.left).attr("y", 14)
    .style("font-family", T.sans).attr("font-size", 12).attr("fill", T.ink2)
    .text(W < 400 ? SUBTITLE_SHORT : SUBTITLE_FULL);

  // Colour legend: record years (ink) vs the rest (sight) — its own row 2,
  // top-right, so it never has to share a row with the (possibly long)
  // subtitle at any panel width.
  const legendItems = [
    { color: T.ink, label: "record year" },
    { color: T.sight, label: "other years" },
  ];
  const gLegend = svg.append("g");
  const legendY = 30;
  let legendX = MARGIN.left + plotW; // right edge, built leftward
  legendItems.slice().reverse().forEach(item => {
    const label = gLegend.append("text")
      .attr("y", legendY)
      .style("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
      .text(item.label);
    const labelW = label.node().getComputedTextLength();
    legendX -= labelW;
    label.attr("x", legendX).attr("text-anchor", "start");
    legendX -= 14;
    gLegend.append("circle")
      .attr("cx", legendX).attr("cy", legendY - 3.5).attr("r", 3.5)
      .attr("fill", item.color);
    legendX -= 12;
  });

  // Y-axis title: the unit, horizontal, at the top of the axis — row 3, just
  // above the frame.
  svg.append("text")
    .attr("x", MARGIN.left).attr("y", MARGIN.top - 10)
    .style("font-family", T.sans).attr("font-size", 11).attr("fill", T.ink2)
    .text("October plus November sightings");

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
      .attr("x", x(v)).attr("y", MARGIN.top + plotH + 15)
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
  // The axis title gets its own row below the tick labels, not the same
  // baseline — with only a couple of tick digits ("2k", "12k") the two rows
  // never touch, at any panel width.
  gAxis.append("text")
    .attr("x", MARGIN.left + plotW / 2).attr("y", MARGIN.top + plotH + 32)
    .attr("text-anchor", "middle")
    .style("font-family", T.sans).attr("font-size", 11).attr("fill", T.ink2)
    .text("April to June sightings");

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

  // Below the narrow-label width, only the years the chart's own claims
  // name — plus any point tall enough that it would otherwise be a mystery
  // dot — get a label; the rest still plot as dots.
  const showAllLabels = W >= NARROW_LABEL_W;
  const labelPoints = showAllLabels
    ? points
    : points.filter(d => ALWAYS_LABEL_YEARS.has(d.fy) || d.autumn > 8000);

  const labelPositions = declutterLabels(
    labelPoints.map(d => ({ fy: d.fy, x: x(d.spring) + 6, y: y(d.autumn) - 6 })),
    34, 12,
    {
      // Never let a label cross down into the axis frame's own tick-label
      // row, nor up past the top of the plot.
      minY: MARGIN.top + 10, maxY: MARGIN.top + plotH - 6,
      // Nor let it get nudged onto some other, unlabelled year's own dot.
      obstacles: points.map(d => ({ fy: d.fy, x: x(d.spring), y: y(d.autumn) })),
    }
  );
  const labelY = new Map(labelPositions.map(p => [p.fy, p.y]));
  const indexByFy = new Map(points.map((p, i) => [p.fy, i]));
  const n = points.length;

  const labels = svg.append("g").selectAll("text")
    .data(labelPoints)
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
      .attr("x", MARGIN.left).attr("y", MARGIN.top - 26)
      .attr("text-anchor", "start")
      .style("font-family", T.serif).style("font-style", "italic")
      .attr("font-size", narrow ? 10 : 12).attr("fill", T.ink2)
      .text(noteText);
  }

  // Labels may be a subset of points (narrow panels), but their reveal
  // timing still follows each label's own year's place in the full
  // sequence, so a label never appears before or long after its dot.
  function renderFrame(t) {
    dots.attr("opacity", (d, i) => pointRevealOpacity(t, i, n));
    labels.attr("opacity", d => pointRevealOpacity(t, indexByFy.get(d.fy), n));
    gLine.attr("opacity", t >= 0.9 ? Math.min(1, (t - 0.9) / 0.1) : 0);
    gNote.attr("opacity", t >= 0.9 ? Math.min(1, (t - 0.9) / 0.1) : 0);
  }

  function play() {
    dots.interrupt(); labels.interrupt(); gLine.interrupt(); gNote.interrupt();
    dots.transition().delay((_, i) => (i / n) * 0.85 * 1500).duration(260).attr("opacity", 1);
    labels.transition()
      .delay(d => (indexByFy.get(d.fy) / n) * 0.85 * 1500 + 80)
      .duration(260).attr("opacity", 1);
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
