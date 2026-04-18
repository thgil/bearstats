// Animated line chart for the hero section.
// Assumes D3 v7 is loaded globally via <script src="lib/d3.v7.min.js">.

/**
 * Pick the right year axis and value array from the national-timeline shape.
 */
export function timelineFor(timeline, metric) {
  const mapYears = {
    sightings: timeline.years_sightings,
    injuries:  timeline.years_injuries,
    deaths:    timeline.years_injuries,         // deaths share the injury year axis
    captures_total: timeline.years_captures,
  };
  const years = mapYears[metric];
  if (!years) throw new Error(`unknown metric: ${metric}`);
  const values = timeline.metrics[metric];
  if (!values) throw new Error(`metric data missing: ${metric}`);
  return { years, values };
}

const MARGIN = { top: 24, right: 32, bottom: 40, left: 56 };

/**
 * Mount a line chart into `container` (a DOM element). Returns an object
 * with play() and setMetric(metric) methods.
 */
export function mountLineChart(container, timeline, initialMetric = "sightings") {
  const { width: W, height: H } = container.getBoundingClientRect();
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");

  const gAxes = svg.append("g").attr("class", "axes");
  const gLine = svg.append("g").attr("class", "line");
  const gDot  = svg.append("g").attr("class", "final-dot");
  const gLabel= svg.append("g").attr("class", "final-label");

  let currentMetric = initialMetric;

  function render(metric, animate = true) {
    currentMetric = metric;
    const { years, values } = timelineFor(timeline, metric);
    const plotW = W - MARGIN.left - MARGIN.right;
    const plotH = H - MARGIN.top - MARGIN.bottom;

    const x = d3.scaleLinear().domain(d3.extent(years)).range([MARGIN.left, MARGIN.left + plotW]);
    const y = d3.scaleLinear().domain([0, d3.max(values) * 1.05]).range([MARGIN.top + plotH, MARGIN.top]);

    gAxes.selectAll("*").remove();
    gAxes.append("g")
      .attr("transform", `translate(0,${MARGIN.top + plotH})`)
      .call(d3.axisBottom(x).ticks(Math.min(years.length, 10)).tickFormat(d => String(d)))
      .attr("color", "#9aa0b4");
    gAxes.append("g")
      .attr("transform", `translate(${MARGIN.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")))
      .attr("color", "#9aa0b4");

    const line = d3.line()
      .x((_, i) => x(years[i]))
      .y(v => y(v))
      .curve(d3.curveCatmullRom);

    gLine.selectAll("*").remove();
    const path = gLine.append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", "#ff3b30")
      .attr("stroke-width", 3)
      .attr("d", line);

    if (animate) {
      const totalLen = path.node().getTotalLength();
      path
        .attr("stroke-dasharray", `${totalLen} ${totalLen}`)
        .attr("stroke-dashoffset", totalLen)
        .transition()
        .duration(2500)
        .ease(t => Math.pow(t, 3))
        .attr("stroke-dashoffset", 0);
    }

    const lastX = x(years.at(-1));
    const lastY = y(values.at(-1));
    gDot.selectAll("circle").remove();
    const dot = gDot.append("circle")
      .attr("cx", lastX)
      .attr("cy", lastY)
      .attr("r", 0)
      .attr("fill", "#ff3b30");

    if (animate) {
      dot.transition().delay(2500).duration(400).attr("r", 8)
        .on("end", function pulse() {
          d3.select(this).transition().duration(900).attr("r", 12)
            .transition().duration(900).attr("r", 8).on("end", pulse);
        });
    } else {
      dot.attr("r", 8);
    }

    gLabel.selectAll("*").remove();
    gLabel.append("text")
      .attr("x", lastX - 8)
      .attr("y", lastY - 14)
      .attr("text-anchor", "end")
      .attr("fill", "#ff3b30")
      .attr("font-size", 14)
      .attr("font-weight", 700)
      .text(`${years.at(-1)} · ${values.at(-1).toLocaleString()}`);
  }

  render(initialMetric, false);

  return {
    play: () => render(currentMetric, true),
    setMetric: (metric) => render(metric, true),
  };
}
