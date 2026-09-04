// Monthly sightings chart: raw month-by-month counts, one line per fiscal
// year, overlaid Apr→Mar so any two years compare at the same point in the
// season.
//
// Two views share one scaffold. "closed" is the three finished quiet years
// plus FY2025's autumn spike — the point is that autumn broke the pattern.
// "running" holds FY2026's opening months up against FY2025, the record year
// it is chasing, with the other closed years pushed to the background. Both
// views keep the same y-domain (the max across every year) so the switch
// between them doesn't rescale the axis under the reader.
//
// play() and setProgress(t) are two views onto the same progress model: a
// line's stroke-dashoffset and a label group's opacity are pure functions of
// t, so a transition and an instant frame (for the render pipeline) draw
// identically at any given t.
//
// Assumes D3 v7 is loaded globally.

const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const MARGIN = { top: 26, right: 20, bottom: 34, left: 52 };

const INK = "#e8e8ea";
const DIM = "#9aa0b4";
const FIELD = "#333b52";
const BENCH = "#7d87a8";
const HOT = "#ff3b30";

/**
 * Pull the raw monthly series out of the timeline JSON. Unlike chart-pace's
 * cumulative tracks, these are NOT running totals — a mid-season year reads
 * as "this is where the season is", not "this is behind".
 */
export function monthlySeries(timeline) {
  const monthly = (timeline.monthly || {}).sightings || {};
  const partial = new Set(timeline.partial_years || []);
  return Object.keys(monthly)
    .map(Number)
    .sort((a, b) => a - b)
    .map(year => ({
      year,
      partial: partial.has(year),
      values: monthly[String(year)].slice(),
    }));
}

/** Index of a series' highest month. Used instead of hard-coding "June" — one
 * of the closed years (FY2023) actually peaked in October, not June. */
export function peakMonthIndex(values) {
  let best = 0;
  values.forEach((v, i) => { if (v > values[best]) best = i; });
  return best;
}

/** Fiscal months 0..8 (Apr–Dec) fall in the FY's own calendar year; 9..11 (Jan–Mar) in the next. */
export function calendarYearForFyMonth(fyYear, idx) {
  return idx <= 8 ? fyYear : fyYear + 1;
}

/** "15,998 · Oct 2025" — read off the series' own peak, not written down. */
export function peakCallout(series) {
  const i = peakMonthIndex(series.values);
  return `${series.values[i].toLocaleString()} · ${MONTH_LABELS[i]} ${calendarYearForFyMonth(series.year, i)}`;
}

/**
 * Deterministic line-draw offset. start/end are progress fractions (0..1)
 * a line occupies; before start it is fully hidden, after end fully drawn.
 * Pure, so play()'s transition and setProgress(t)'s instant frame agree.
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

/**
 * Push a set of {key, y} points apart so none sit closer than minGap,
 * preserving their vertical order. Used for the "closed" view's end labels:
 * every year's March value is small and they cluster within a few pixels of
 * each other, so left alone the labels would overlap.
 */
export function declutterY(entries, minGap) {
  const sorted = [...entries].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < minGap) {
      sorted[i] = { ...sorted[i], y: sorted[i - 1].y + minGap };
    }
  }
  return sorted;
}

const LINE_END = 0.8;      // every line finishes drawing by t = 0.8
const LINE_STAGGER = 0.03; // per-line start offset so they don't move in lockstep
const LABEL_START = 0.8;
const LABEL_END = 1;
const TOTAL_MS = 1900;

export function mountMonthlyChart(container, timeline) {
  container.innerHTML = "";
  const series = monthlySeries(timeline);
  if (!series.length) return { setView() {}, play() {}, setProgress() {}, stop() {} };

  const byYear = new Map(series.map(s => [s.year, s]));
  const { width: W, height: H } = container.getBoundingClientRect();
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");

  const plotW = W - MARGIN.left - MARGIN.right;
  const plotH = H - MARGIN.top - MARGIN.bottom;

  const x = d3.scaleLinear().domain([0, 11]).range([MARGIN.left, MARGIN.left + plotW]);
  // Full domain across every year, closed or running — so the October spike
  // stays visible as context even in the "running" view, which doesn't draw
  // FY2025's own line past the label it gets underneath each FY2026 point.
  const maxV = d3.max(series, s => d3.max(s.values));
  const y = d3.scaleLinear().domain([0, maxV * 1.06]).range([MARGIN.top + plotH, MARGIN.top]);

  const line = d3.line().x((_, i) => x(i)).y(v => y(v)).curve(d3.curveMonotoneX);

  // Recessive grid, same conventions as chart-pace.
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

  // Month axis, Apr through Mar.
  const gAxis = svg.append("g");
  const labelEvery = plotW / 12 < 34 ? 2 : 1;   // phones: every other month
  MONTH_LABELS.forEach((label, i) => {
    if (i % labelEvery !== 0) return;
    gAxis.append("text")
      .attr("x", x(i)).attr("y", y(0) + 20)
      .attr("text-anchor", "middle")
      .attr("fill", DIM)
      .attr("font-size", 11).attr("font-weight", 500)
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
  // same time as the rest (LINE_END) but starts latest, and — appended last —
  // paints on top. Callers put the accent line last for both reasons.
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

  function buildClosed() {
    clearDynamic();
    const fieldYears = [2022, 2023, 2024].map(yr => byYear.get(yr)).filter(Boolean);
    const accent = byYear.get(2025);
    const defs = [
      ...fieldYears.map(s => ({ series: s, color: FIELD, width: 2 })),
      ...(accent ? [{ series: accent, color: HOT, width: 3.5 }] : []),
    ];
    const paths = buildLines(defs);
    const gLabels = gMarks.append("g").attr("opacity", 0);

    // End labels, one per visible year. Their last (March) values are small
    // and land close together, so declutter the stack rather than let them
    // overlap; if the stack would run past the zero line, shift it all up.
    const endPoints = defs.map(d => ({ key: d.series.year, y: y(d.series.values.at(-1)) }));
    let placed = declutterY(endPoints, 15);
    const zeroY = y(0) - 4;
    const overflow = placed.length ? Math.max(0, placed[placed.length - 1].y - zeroY) : 0;
    if (overflow > 0) placed = placed.map(p => ({ ...p, y: p.y - overflow }));
    placed.forEach(p => {
      gLabels.append("text")
        .attr("x", x(11) - 6).attr("y", p.y + 4)
        .attr("text-anchor", "end")
        .attr("fill", DIM).attr("font-size", 11).attr("font-weight", 600)
        .style("font-variant-numeric", "tabular-nums")
        .text(`FY${p.key}`);
    });

    // A quiet tick + label at each closed year's own peak month — derived
    // per year, not written down, since FY2023 actually peaked in October.
    fieldYears.forEach(s => {
      const i = peakMonthIndex(s.values);
      gLabels.append("line")
        .attr("x1", x(i)).attr("x2", x(i))
        .attr("y1", y(s.values[i]) - 5).attr("y2", y(s.values[i]) + 5)
        .attr("stroke", DIM).attr("stroke-width", 1).attr("opacity", 0.55);
      gLabels.append("text")
        .attr("x", x(i)).attr("y", y(s.values[i]) - 9)
        .attr("text-anchor", "middle")
        .attr("fill", DIM).attr("font-size", 9).attr("font-weight", 500)
        .attr("opacity", 0.75)
        .text(`${MONTH_LABELS[i]} peak`);
    });

    // The one loud callout: autumn 2025's own peak.
    if (accent) {
      const i = peakMonthIndex(accent.values);
      gLabels.append("circle")
        .attr("cx", x(i)).attr("cy", y(accent.values[i]))
        .attr("r", 4).attr("fill", HOT).attr("stroke", "#0f1419").attr("stroke-width", 1.5);
      gLabels.append("text")
        .attr("x", x(i)).attr("y", y(accent.values[i]) - 14)
        .attr("text-anchor", i > 8 ? "end" : "middle")
        .attr("fill", HOT).attr("font-size", 13).attr("font-weight", 700)
        .text(peakCallout(accent));
    }

    return { paths, labels: [{ sel: gLabels, start: LABEL_START, end: LABEL_END }] };
  }

  function buildRunning() {
    clearDynamic();
    const fieldYears = [2022, 2023, 2024].map(yr => byYear.get(yr)).filter(Boolean);
    const bench = byYear.get(2025);
    const accent = byYear.get(2026);
    const defs = [
      ...fieldYears.map(s => ({ series: s, color: FIELD, width: 2 })),
      ...(bench ? [{ series: bench, color: BENCH, width: 2.5 }] : []),
      ...(accent ? [{ series: accent, color: HOT, width: 4 }] : []),
    ];
    const paths = buildLines(defs);
    const gLabels = gMarks.append("g").attr("opacity", 0);

    // Every FY2026 point gets its value; FY2025's same-month value sits
    // directly beneath or above, whichever side isn't already occupied. Both
    // are also clamped clear of the zero baseline (and its axis labels) and
    // the top edge — early months sit low on a chart scaled to October's
    // spike, so an unclamped "beneath" label can land on top of the axis.
    // Both lines rise steeply through spring, so the clear space around a
    // point is upper-left and lower-right of it, not directly above or below
    // — a label centred over the point lands on the line. The bigger value
    // takes the upper-left slot, the smaller the lower-right, and both stay
    // clear of the axis and the top edge.
    const clampLabelY = v => Math.min(Math.max(v, MARGIN.top + 10), y(0) - 14);
    if (accent && bench) {
      accent.values.forEach((v, i) => {
        const bv = bench.values[i];
        const py = y(v), pby = y(bv);
        const accentAbove = py <= pby;
        const place = (val, cy, above, color, size) => {
          gLabels.append("text")
            .attr("x", above ? x(i) - 9 : x(i) + 9)
            .attr("y", clampLabelY(above ? cy - 6 : cy + 15))
            .attr("text-anchor", above ? "end" : "start")
            .attr("fill", color).attr("font-size", size).attr("font-weight", 700)
            .style("font-variant-numeric", "tabular-nums")
            .text(val.toLocaleString());
        };
        gLabels.append("circle").attr("cx", x(i)).attr("cy", py).attr("r", 3.5).attr("fill", HOT);
        gLabels.append("circle").attr("cx", x(i)).attr("cy", pby).attr("r", 3).attr("fill", BENCH);
        place(v, py, accentAbove, HOT, 12);
        place(bv, pby, !accentAbove, BENCH, 11);
      });

      // The record year's autumn peak, named quietly so the spring gap is
      // read against the scale of what followed it last year.
      const pi = peakMonthIndex(bench.values);
      gLabels.append("circle")
        .attr("cx", x(pi)).attr("cy", y(bench.values[pi]))
        .attr("r", 3).attr("fill", BENCH);
      gLabels.append("text")
        .attr("x", x(pi)).attr("y", y(bench.values[pi]) - 12)
        .attr("text-anchor", pi > 8 ? "end" : "middle")
        .attr("fill", BENCH).attr("font-size", 12).attr("font-weight", 700)
        .style("font-variant-numeric", "tabular-nums")
        .text(peakCallout(bench));
    }

    return { paths, labels: [{ sel: gLabels, start: LABEL_START, end: LABEL_END }] };
  }

  let state = null;

  function setView(view) {
    state = view === "running" ? buildRunning() : buildClosed();
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

  setView("closed");

  return { setView, play, setProgress, stop };
}
