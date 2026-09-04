// Hero chart: how far into the fiscal year each year's sightings had piled up.
//
// A running fiscal year cannot be set beside closed ones as a single total —
// four months against twelve reads as a collapse. Plotting the running total
// month by month fixes that: FY2026's line simply stops where the data stops,
// and its height against the other lines at the same date is the comparison.
//
// Three views share one scaffold, y-domain fixed across all of them so the
// axis never rescales when the view switches:
//  - "running" (default): FY2026 (accent) against FY2025, the record year.
//  - "caution": FY2024 (bench) against FY2025 (accent), FY2026 hidden — the
//    point being that FY2024 was briefly AHEAD of FY2025 in June and still
//    only finished at 40% of it. A spring lead promises nothing about autumn.
//
// play() and setProgress(t) are two views onto the same progress model: a
// line's stroke-dashoffset and a label group's opacity are pure functions of
// t, so an instant frame (for the render pipeline) matches wherever the
// transition would be at that t.
//
// Assumes D3 v7 is loaded globally.

/** Running totals, month by month, in fiscal order. */
export function cumulative(values) {
  let run = 0;
  return values.map(v => (run += v));
}

/**
 * Pull the pace series out of the timeline JSON.
 * Returns years ascending, each with its cumulative track.
 */
export function paceSeries(timeline) {
  const monthly = (timeline.monthly || {}).sightings || {};
  const partial = new Set(timeline.partial_years || []);
  return Object.keys(monthly)
    .map(Number)
    .sort((a, b) => a - b)
    .map(year => ({
      year,
      partial: partial.has(year),
      values: cumulative(monthly[String(year)]),
    }));
}

/**
 * The last month the running year has reported — the date every other year
 * gets read off at.
 */
export function compareIndex(series) {
  const running = series.find(s => s.partial);
  return running ? running.values.length - 1 : -1;
}

/** "FY2024 finished at 20,513" — read straight off the series, not written down. */
export function finishedLabel(series) {
  return `FY${series.year} finished at ${series.values.at(-1).toLocaleString()}`;
}

/**
 * Deterministic line-draw offset. start/end are progress fractions (0..1) a
 * line occupies; before start it is fully hidden, after end fully drawn.
 */
export function dashOffsetForProgress(t, length, start = 0, end = 1) {
  const span = end - start;
  const local = span <= 0 ? (t >= end ? 1 : 0) : (t - start) / span;
  return length * (1 - Math.min(1, Math.max(0, local)));
}

/** Same idea for a label group's fade-in. */
export function opacityForProgress(t, start = 0.8, end = 1) {
  const span = end - start;
  if (span <= 0) return t >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (t - start) / span));
}

const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const MARGIN = { top: 26, right: 26, bottom: 34, left: 52 };

const INK = "#e8e8ea";
const DIM = "#9aa0b4";
const FIELD = "#333b52";   // the closed years that are not the benchmark
const BENCH = "#7d87a8";   // the year the highlighted one is measured against
const HOT = "#ff3b30";     // the highlighted year

const LINE_END = 0.8;      // every line finishes drawing by t = 0.8
const LINE_STAGGER = 0.03; // per-line start offset so they don't move in lockstep
const LABEL_START = 0.8;
const LABEL_END = 1;
const TOTAL_MS = 2000;

export function mountPaceChart(container, timeline) {
  container.innerHTML = "";
  const series = paceSeries(timeline);
  if (!series.length) return { setView() {}, play() {}, setProgress() {}, stop() {} };

  const byYear = new Map(series.map(s => [s.year, s]));
  const cmpIdx = compareIndex(series);
  const running = series.find(s => s.partial);

  const { width: W, height: H } = container.getBoundingClientRect();
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");

  const plotW = W - MARGIN.left - MARGIN.right;
  const plotH = H - MARGIN.top - MARGIN.bottom;

  const maxV = d3.max(series, s => d3.max(s.values));
  const x = d3.scaleLinear().domain([0, 11]).range([MARGIN.left, MARGIN.left + plotW]);
  const y = d3.scaleLinear().domain([0, maxV * 1.04]).range([MARGIN.top + plotH, MARGIN.top]);

  const line = d3.line().x((_, i) => x(i)).y(v => y(v)).curve(d3.curveMonotoneX);

  // Recessive grid
  const gGrid = svg.append("g");
  y.ticks(4).slice(1).forEach(v => {
    gGrid.append("line")
      .attr("x1", MARGIN.left).attr("x2", MARGIN.left + plotW)
      .attr("y1", y(v)).attr("y2", y(v))
      .attr("stroke", "rgba(255,255,255,0.05)");
    gGrid.append("text")
      .attr("x", MARGIN.left - 10).attr("y", y(v) + 4)
      .attr("text-anchor", "end").attr("fill", DIM)
      .attr("font-size", 11).attr("font-weight", 500)
      .style("font-variant-numeric", "tabular-nums")
      .text(d3.format("~s")(v));
  });
  gGrid.append("line")
    .attr("x1", MARGIN.left).attr("x2", MARGIN.left + plotW)
    .attr("y1", y(0)).attr("y2", y(0))
    .attr("stroke", "rgba(255,255,255,0.12)");

  // The read-off date, where the running/caution years get compared. It is
  // always the running year's last reported month (June, currently), so the
  // same line serves both views without moving.
  if (cmpIdx >= 0) {
    svg.append("line")
      .attr("x1", x(cmpIdx)).attr("x2", x(cmpIdx))
      .attr("y1", MARGIN.top).attr("y2", y(0))
      .attr("stroke", "rgba(255,255,255,0.16)")
      .attr("stroke-dasharray", "3 4");
  }

  // Month axis, with the read-off month picked out
  const gAxis = svg.append("g");
  // On a phone twelve labels collide, so show every other one — keeping
  // the read-off month, which is the one that matters.
  const labelEvery = plotW / 12 < 34 ? 2 : 1;
  MONTH_LABELS.forEach((label, i) => {
    if (i % labelEvery !== 0 && i !== cmpIdx) return;
    gAxis.append("text")
      .attr("x", x(i)).attr("y", y(0) + 20)
      .attr("text-anchor", "middle")
      .attr("fill", i === cmpIdx ? INK : DIM)
      .attr("font-size", 11)
      .attr("font-weight", i === cmpIdx ? 700 : 500)
      .style("font-variant-numeric", "tabular-nums")
      .text(label);
  });

  const gLines = svg.append("g");
  const gMarks = svg.append("g");

  function clearDynamic() {
    gLines.selectAll("*").remove();
    gMarks.selectAll("*").remove();
  }

  // Draw defs in stagger/paint order: the last one finishes drawing at the
  // same time as the rest (LINE_END) but starts latest, and — appended last
  // — paints on top. Callers put the highlighted line last for both reasons.
  function buildLines(defs) {
    return defs.map((d, i) => {
      const sel = gLines.append("path")
        .datum(d.series.values)
        .attr("fill", "none")
        .attr("stroke", d.color)
        .attr("stroke-width", d.width)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("d", line);
      const length = sel.node().getTotalLength();
      sel.attr("stroke-dasharray", `${length} ${length}`).attr("stroke-dashoffset", length);
      return { sel, length, start: i * LINE_STAGGER, end: LINE_END };
    });
  }

  // "running": current behaviour. FY2026 (accent) against the most recent
  // closed year (bench) — the record it is chasing.
  function buildRunningView() {
    clearDynamic();
    const closed = series.filter(s => !s.partial);
    const bench = closed[closed.length - 1];
    const defs = closed.map(s => ({
      series: s,
      color: bench && s.year === bench.year ? BENCH : FIELD,
      width: bench && s.year === bench.year ? 2.5 : 2,
    }));
    if (running) defs.push({ series: running, color: HOT, width: 4 });
    const paths = buildLines(defs);

    const gLabels = gMarks.append("g").attr("opacity", 0);
    // Direct labels name the two years being compared and read off their
    // values at the comparison month — the gap between those two numbers is
    // the whole point of the view.
    if (bench) {
      const endIdx = bench.values.length - 1;
      gLabels.append("text")
        .attr("x", x(endIdx)).attr("y", y(bench.values[endIdx]) - 12)
        .attr("text-anchor", "end")
        .attr("fill", BENCH).attr("font-size", 12).attr("font-weight", 700)
        .text(finishedLabel(bench));
      // Read-off value sits lower-right of the hollow marker, where the
      // rising line leaves room.
      if (cmpIdx >= 0) {
        gLabels.append("circle")
          .attr("cx", x(cmpIdx)).attr("cy", y(bench.values[cmpIdx]))
          .attr("r", 5).attr("fill", "#1a1f2e")
          .attr("stroke", BENCH).attr("stroke-width", 2);
        gLabels.append("text")
          .attr("x", x(cmpIdx) + 11).attr("y", y(bench.values[cmpIdx]) + 17)
          .attr("fill", BENCH).attr("font-size", 12).attr("font-weight", 700)
          .style("font-variant-numeric", "tabular-nums")
          .text(`${bench.values[cmpIdx].toLocaleString()} FY${bench.year}`);
      }
    }
    if (running) {
      const ry = y(running.values.at(-1));
      gLabels.append("circle")
        .attr("cx", x(cmpIdx)).attr("cy", ry)
        .attr("r", 6).attr("fill", HOT)
        .attr("stroke", "#1a1f2e").attr("stroke-width", 2);
      // Upper-left of the marker, where the record year's line has not yet
      // climbed — unless the chart is too narrow for the label to fit
      // between the marker and the axis, in which case it goes above-right.
      const label = `${running.values.at(-1).toLocaleString()} FY${running.year}`;
      const fitsLeft = x(cmpIdx) - 12 - label.length * 7.5 >= MARGIN.left;
      gLabels.append("text")
        .attr("x", fitsLeft ? x(cmpIdx) - 12 : x(cmpIdx) + 10)
        .attr("y", fitsLeft ? ry - 10 : ry - 16)
        .attr("text-anchor", fitsLeft ? "end" : "start")
        .attr("fill", HOT).attr("font-size", 13).attr("font-weight", 700)
        .style("font-variant-numeric", "tabular-nums")
        .text(label);
    }

    return { paths, labels: [{ sel: gLabels, start: LABEL_START, end: LABEL_END }] };
  }

  // "caution": FY2024 (bench) against FY2025 (accent), FY2026 hidden. FY2024
  // led FY2025 at this same read-off month and still finished at 40% of it —
  // the whole point of chapter 3's caution.
  function buildCautionView() {
    clearDynamic();
    const y24 = byYear.get(2024);
    const y25 = byYear.get(2025);
    const others = series.filter(s => !s.partial && s.year !== 2024 && s.year !== 2025);
    const defs = [
      ...others.map(s => ({ series: s, color: FIELD, width: 2 })),
      ...(y24 ? [{ series: y24, color: BENCH, width: 2.5 }] : []),
      ...(y25 ? [{ series: y25, color: HOT, width: 4 }] : []),
    ];
    const paths = buildLines(defs);
    const gLabels = gMarks.append("g").attr("opacity", 0);

    if (y24) {
      const endIdx = y24.values.length - 1;
      gLabels.append("text")
        .attr("x", x(endIdx)).attr("y", y(y24.values[endIdx]) - 12)
        .attr("text-anchor", "end")
        .attr("fill", BENCH).attr("font-size", 12).attr("font-weight", 700)
        .text(finishedLabel(y24));
    }
    if (y25) {
      const endIdx = y25.values.length - 1;
      gLabels.append("text")
        .attr("x", x(endIdx)).attr("y", y(y25.values[endIdx]) - 12)
        .attr("text-anchor", "end")
        .attr("fill", HOT).attr("font-size", 12).attr("font-weight", 700)
        .text(finishedLabel(y25));
    }

    // June read-off: both values come straight off the series, not written
    // down. FY2024 sat above FY2025 here, then fell away — a spring lead
    // (or, in FY2026's case, a spring surplus) says nothing about autumn.
    if (cmpIdx >= 0 && y24 && y25) {
      [y24, y25].forEach(s => {
        const color = s.year === 2024 ? BENCH : HOT;
        gLabels.append("circle")
          .attr("cx", x(cmpIdx)).attr("cy", y(s.values[cmpIdx]))
          .attr("r", 5).attr("fill", "#1a1f2e")
          .attr("stroke", color).attr("stroke-width", 2);
      });
      gLabels.append("text")
        .attr("x", x(cmpIdx) + 10).attr("y", y(y24.values[cmpIdx]) - 10)
        .attr("fill", BENCH).attr("font-size", 12).attr("font-weight", 700)
        .style("font-variant-numeric", "tabular-nums")
        .text(y24.values[cmpIdx].toLocaleString());
      gLabels.append("text")
        .attr("x", x(cmpIdx) + 10).attr("y", y(y25.values[cmpIdx]) + 18)
        .attr("fill", HOT).attr("font-size", 12).attr("font-weight", 700)
        .style("font-variant-numeric", "tabular-nums")
        .text(y25.values[cmpIdx].toLocaleString());
    }

    return { paths, labels: [{ sel: gLabels, start: LABEL_START, end: LABEL_END }] };
  }

  let state = null;

  function setView(view) {
    state = view === "caution" ? buildCautionView() : buildRunningView();
  }

  function play() {
    if (!state) return;
    gLines.selectAll("path").interrupt();
    gMarks.selectAll("*").interrupt();
    state.paths.forEach(p => {
      p.sel.transition()
        .delay(p.start * TOTAL_MS)
        .duration((p.end - p.start) * TOTAL_MS)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    });
    state.labels.forEach(l => {
      l.sel.transition()
        .delay(l.start * TOTAL_MS)
        .duration((l.end - l.start) * TOTAL_MS)
        .attr("opacity", 1);
    });
  }

  function setProgress(t) {
    if (!state) return;
    gLines.selectAll("path").interrupt();
    gMarks.selectAll("*").interrupt();
    state.paths.forEach(p => {
      p.sel.attr("stroke-dashoffset", dashOffsetForProgress(t, p.length, p.start, p.end));
    });
    state.labels.forEach(l => {
      l.sel.attr("opacity", opacityForProgress(t, l.start, l.end));
    });
  }

  function stop() {
    gLines.selectAll("path").interrupt();
    gMarks.selectAll("*").interrupt();
  }

  setView("running");

  return { setView, play, setProgress, stop };
}
