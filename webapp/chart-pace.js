// Hero chart: how far into the fiscal year each year's sightings had piled up.
//
// A running fiscal year cannot be set beside closed ones as a single total —
// four months against twelve reads as a collapse. Plotting the running total
// month by month fixes that: FY2026's line simply stops where the data stops,
// and its height against the other lines at the same date is the comparison.
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

const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const MARGIN = { top: 26, right: 26, bottom: 34, left: 52 };

const INK = "#e8e8ea";
const DIM = "#9aa0b4";
const FIELD = "#333b52";   // the closed years that are not the benchmark
const BENCH = "#7d87a8";   // the record year the running one is measured against
const HOT = "#ff3b30";     // the running year

export function mountPaceChart(container, timeline) {
  const series = paceSeries(timeline);
  if (!series.length) return { play: () => {} };

  const cmpIdx = compareIndex(series);
  const running = series.find(s => s.partial);
  const closed = series.filter(s => !s.partial);
  // The benchmark is the most recent closed year — the record FY2026 is chasing.
  const bench = closed[closed.length - 1];

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
      .text(d3.format("~s")(v));
  });
  gGrid.append("line")
    .attr("x1", MARGIN.left).attr("x2", MARGIN.left + plotW)
    .attr("y1", y(0)).attr("y2", y(0))
    .attr("stroke", "rgba(255,255,255,0.12)");

  // The read-off date, where the tiles' two numbers come from
  if (cmpIdx >= 0) {
    svg.append("line")
      .attr("x1", x(cmpIdx)).attr("x2", x(cmpIdx))
      .attr("y1", MARGIN.top).attr("y2", y(0))
      .attr("stroke", "rgba(255,255,255,0.16)")
      .attr("stroke-dasharray", "3 4");
  }

  // Month axis, with the read-off month picked out
  const gAxis = svg.append("g");
  MONTH_LABELS.forEach((label, i) => {
    gAxis.append("text")
      .attr("x", x(i)).attr("y", y(0) + 20)
      .attr("text-anchor", "middle")
      .attr("fill", i === cmpIdx ? INK : DIM)
      .attr("font-size", 11)
      .attr("font-weight", i === cmpIdx ? 700 : 500)
      .text(label);
  });

  const gLines = svg.append("g");
  const gMarks = svg.append("g");

  const paths = [];
  closed.forEach(s => {
    const isBench = bench && s.year === bench.year;
    paths.push(gLines.append("path")
      .datum(s.values)
      .attr("fill", "none")
      .attr("stroke", isBench ? BENCH : FIELD)
      .attr("stroke-width", isBench ? 2.5 : 2)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("d", line));
  });

  const hotPath = running && gLines.append("path")
    .datum(running.values)
    .attr("fill", "none")
    .attr("stroke", HOT)
    .attr("stroke-width", 4)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .attr("d", line);

  // Direct labels name the two years being compared. Their June values are
  // already the two tiles above the chart, so repeating them here would be
  // clutter — the only number the chart adds is where the record year ended up.
  if (bench) {
    const endIdx = bench.values.length - 1;
    gMarks.append("text")
      .attr("x", x(endIdx))
      .attr("y", y(bench.values[endIdx]) - 12)
      .attr("text-anchor", "end")
      .attr("fill", BENCH).attr("font-size", 12).attr("font-weight", 700)
      .text(`FY${bench.year} finished at ${bench.values[endIdx].toLocaleString()}`);
    // The hollow marker on the read-off line needs no label of its own: the
    // end label above already names this year, and a second one lands on the
    // line it belongs to.
    if (cmpIdx >= 0) {
      gMarks.append("circle")
        .attr("cx", x(cmpIdx)).attr("cy", y(bench.values[cmpIdx]))
        .attr("r", 5).attr("fill", "#1a1f2e")
        .attr("stroke", BENCH).attr("stroke-width", 2);
    }
  }
  if (running) {
    gMarks.append("circle")
      .attr("cx", x(cmpIdx)).attr("cy", y(running.values.at(-1)))
      .attr("r", 6).attr("fill", HOT)
      .attr("stroke", "#1a1f2e").attr("stroke-width", 2);
    gMarks.append("text")
      .attr("x", x(cmpIdx) + 12).attr("y", y(running.values.at(-1)) - 8)
      .attr("fill", HOT).attr("font-size", 13).attr("font-weight", 700)
      .text(`FY${running.year}`);
  }

  function play() {
    const all = paths.concat(hotPath ? [hotPath] : []);
    gMarks.attr("opacity", 0);
    all.forEach((p, i) => {
      const len = p.node().getTotalLength();
      p.attr("stroke-dasharray", `${len} ${len}`)
        .attr("stroke-dashoffset", len)
        .transition()
        .delay(i * 90)
        .duration(1100)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    });
    gMarks.transition().delay(all.length * 90 + 700).duration(400).attr("opacity", 1);
  }

  return { play };
}
