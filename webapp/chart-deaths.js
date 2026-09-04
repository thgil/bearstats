// Deaths by fiscal year, as columns.
//
// Discrete annual counts, so columns rather than a line — and the whole point
// is how far FY2025 stands clear of every year before it, which a shape carries
// better than a spun-up counter.
//
// Assumes D3 v7 is loaded globally.

/** Closed fiscal years only — a part-year column would read as a collapse. */
export function deathsByYear(timeline) {
  const years = timeline.years_injuries || [];
  const values = (timeline.metrics || {}).deaths || [];
  const partial = new Set(timeline.partial_years || []);
  return years
    .map((year, i) => ({ year, value: values[i] }))
    .filter(d => !partial.has(d.year) && Number.isFinite(d.value));
}

/** The record year, and how far clear of the runner-up it stands. */
export function peak(rows) {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  return { top: sorted[0], runnerUp: sorted[1] || null };
}

/**
 * Describe the peak against the runner-up. Derived rather than written down, so
 * it cannot quietly become false when a new year lands.
 */
export function peakCaption(top, runnerUp) {
  if (!runnerUp || runnerUp.value <= 0) return "the first year on record";
  const ratio = top.value / runnerUp.value;
  if (ratio >= 2) return "more than double any year before";
  if (ratio > 1) return `above the previous worst (${runnerUp.value}, FY${runnerUp.year})`;
  return `level with FY${runnerUp.year}`;
}

const MARGIN = { top: 34, right: 16, bottom: 30, left: 30 };
const DIM = "#3c4560";
const HOT = "#ff3b30";
const INK = "#e8e8ea";
const MUTED = "#9aa0b4";

export function mountDeathsChart(container, timeline) {
  const rows = deathsByYear(timeline);
  if (!rows.length) return { play: () => {} };

  const { top, runnerUp } = peak(rows);
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
    .domain(rows.map(d => d.year))
    .range([MARGIN.left, MARGIN.left + plotW])
    .padding(0.28);
  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, d => d.value)])
    .range([MARGIN.top + plotH, MARGIN.top]);

  svg.append("line")
    .attr("x1", MARGIN.left).attr("x2", MARGIN.left + plotW)
    .attr("y1", y(0)).attr("y2", y(0))
    .attr("stroke", "rgba(255,255,255,0.12)");

  const bars = svg.append("g").selectAll("rect")
    .data(rows)
    .join("rect")
    .attr("x", d => x(d.year))
    .attr("width", x.bandwidth())
    .attr("y", y(0))
    .attr("height", 0)
    .attr("rx", 3)
    .attr("fill", d => (d.year === top.year ? HOT : DIM));

  // Year labels thin out on narrow viewports so they never collide.
  const step = plotW / rows.length < 26 ? 2 : 1;
  svg.append("g").selectAll("text")
    .data(rows.filter((_, i) => i % step === 0 || rows[i].year === top.year))
    .join("text")
    .attr("x", d => x(d.year) + x.bandwidth() / 2)
    .attr("y", y(0) + 18)
    .attr("text-anchor", "middle")
    .attr("fill", d => (d.year === top.year ? INK : MUTED))
    .attr("font-size", 10)
    .attr("font-weight", d => (d.year === top.year ? 700 : 500))
    .text(d => `’${String(d.year).slice(2)}`);

  // One annotation, on the only year that needs one. The peak is usually the
  // most recent year and so sits hard against the right edge — anchor the
  // caption inward from whichever edge it is near, or it runs off the frame.
  const centre = x(top.year) + x.bandwidth() / 2;
  const plotRight = MARGIN.left + plotW;
  const nearRight = centre > MARGIN.left + plotW * 0.66;
  const nearLeft = centre < MARGIN.left + plotW * 0.34;
  const anchor = nearRight ? "end" : nearLeft ? "start" : "middle";
  const noteX = nearRight ? plotRight : nearLeft ? MARGIN.left : centre;

  const note = svg.append("g").attr("opacity", 0);
  note.append("text")
    .attr("x", noteX)
    .attr("y", y(top.value) - 20)
    .attr("text-anchor", anchor)
    .attr("fill", HOT).attr("font-size", 15).attr("font-weight", 800)
    .text(top.value);
  if (runnerUp) {
    note.append("text")
      .attr("x", noteX)
      .attr("y", y(top.value) - 6)
      .attr("text-anchor", anchor)
      .attr("fill", MUTED).attr("font-size", 11).attr("font-weight", 600)
      .text(peakCaption(top, runnerUp));
  }

  function play() {
    bars.transition()
      .delay((_, i) => i * 45)
      .duration(520)
      .ease(d3.easeCubicOut)
      .attr("y", d => y(d.value))
      .attr("height", d => y(0) - y(d.value));
    note.transition().delay(rows.length * 45 + 260).duration(360).attr("opacity", 1);
  }

  return { play };
}
