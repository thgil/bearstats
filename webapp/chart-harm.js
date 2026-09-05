// Injured and killed, FY2008-2025: two small bar rows stacked, each on its
// own scale, because 238 injured and 13 killed would put "killed" flat on
// the axis if they shared one. The point is the same shape in both rows —
// FY2025 clearing FY2023 — not the absolute size of one against the other.
//
// Assumes D3 v7 is loaded globally.

/** Closed fiscal years only, injured and killed side by side per year. A
 * running year would read as a collapse against the year before it. */
export function harmRows(timeline) {
  const years = (timeline && timeline.years_injuries) || [];
  const injured = ((timeline && timeline.metrics) || {}).injuries || [];
  const killed = ((timeline && timeline.metrics) || {}).deaths || [];
  const partial = new Set((timeline && timeline.partial_years) || []);
  return years
    .map((year, i) => ({ year, injured: injured[i], killed: killed[i] }))
    .filter(d => !partial.has(d.year) && Number.isFinite(d.injured) && Number.isFinite(d.killed));
}

/** The record year and its runner-up for one series ("injured" or "killed"). */
export function harmPeak(rows, key) {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => b[key] - a[key]);
  return { top: sorted[0], runnerUp: sorted[1] || null };
}

/** Bar i's grown fraction, one row's worth — both rows share this so their
 * bars rise together, year by year, left to right. */
export function harmBarFraction(t, i, n, growEnd = 0.85) {
  if (n <= 0) return 0;
  const start = (i / n) * growEnd;
  const end = ((i + 1) / n) * growEnd;
  const span = end - start;
  const local = span <= 0 ? (t >= end ? 1 : 0) : (t - start) / span;
  return Math.min(1, Math.max(0, local));
}

export function harmLabelOpacity(t, growEnd = 0.85) {
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
    harm: v("--harm", "#b5482a"),
    harm2: v("--harm-2", "#d98b6f"),
    serif: v("--font-serif", "Georgia, 'Times New Roman', serif"),
    sans: v("--font-sans", "system-ui, sans-serif"),
    mono: v("--font-mono", "ui-monospace, monospace"),
  };
}

const MARGIN = { top: 40, right: 14, bottom: 42, left: 34 };
const ROW_GAP = 22;
const SUBTITLE_FULL = "One bar = one fiscal year (April to March), all Japan";
const SUBTITLE_SHORT = "One bar = one fiscal year, all Japan";

export function mountHarm(container, data) {
  container.innerHTML = "";
  const timeline = data && data.timeline;
  const rows = harmRows(timeline);
  if (!rows.length) return { play() {}, setProgress() {}, stop() {} };

  const T = readTokens();
  const injuredPeak = harmPeak(rows, "injured");
  const killedPeak = harmPeak(rows, "killed");
  const { width: W, height: H } = container.getBoundingClientRect();
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");

  const plotW = W - MARGIN.left - MARGIN.right;
  const plotH = H - MARGIN.top - MARGIN.bottom;
  const rowH = (plotH - ROW_GAP) / 2;
  const rowTop = { injured: MARGIN.top, killed: MARGIN.top + rowH + ROW_GAP };

  // Subtitle: what one mark is, top-left, above everything else.
  svg.append("text")
    .attr("x", MARGIN.left).attr("y", 14)
    .style("font-family", T.sans).attr("font-size", 12).attr("fill", T.ink2)
    .text(W < 400 ? SUBTITLE_SHORT : SUBTITLE_FULL);

  // Hairline frame around each row's plot.
  ["injured", "killed"].forEach(key => {
    svg.append("rect")
      .attr("x", MARGIN.left).attr("y", rowTop[key])
      .attr("width", plotW).attr("height", rowH)
      .attr("fill", "none").attr("stroke", T.rule).attr("stroke-width", 1);
  });

  const x = d3.scaleBand()
    .domain(rows.map(d => d.year))
    .range([MARGIN.left, MARGIN.left + plotW])
    .padding(0.22);

  const yFor = key => d3.scaleLinear()
    .domain([0, d3.max(rows, d => d[key]) * 1.15])
    .range([rowTop[key] + rowH, rowTop[key]]);
  const yInjured = yFor("injured");
  const yKilled = yFor("killed");
  const yScale = { injured: yInjured, killed: yKilled };
  const peaks = { injured: injuredPeak, killed: killedPeak };
  const rowTitle = { injured: "People injured", killed: "People killed" };

  // Y-axis title per row: the unit, horizontal, at the top of that row's own
  // axis — never rotated — doubling as the row's series label (rule 4: two
  // rows already say what they are, so no separate legend is needed).
  ["injured", "killed"].forEach(key => {
    svg.append("text")
      .attr("x", MARGIN.left).attr("y", rowTop[key] - 6)
      .style("font-family", T.sans).attr("font-size", 11).attr("fill", T.ink2)
      .text(rowTitle[key]);
  });

  // Y-axis tick labels, one quiet line at each row's own top (the max), so a
  // bar's height reads against a number, not just against the other bars.
  ["injured", "killed"].forEach(key => {
    const y = yScale[key];
    const maxTick = y.domain()[1];
    [maxTick * 0.5, maxTick].forEach(v => {
      svg.append("line")
        .attr("x1", MARGIN.left).attr("x2", MARGIN.left + plotW)
        .attr("y1", y(v)).attr("y2", y(v))
        .attr("stroke", T.rule).attr("stroke-width", 1).attr("opacity", 0.5);
      svg.append("text")
        .attr("x", MARGIN.left - 6).attr("y", y(v) + 3)
        .attr("text-anchor", "end")
        .style("font-family", T.sans).attr("font-size", 9).attr("fill", T.ink2)
        .text(d3.format("~s")(Math.round(v)));
    });
  });

  // Year ticks under the killed row only (both rows share the same x scale),
  // thinned when the panel is narrow.
  const labelEvery = plotW / rows.length < 16 ? 4 : plotW / rows.length < 24 ? 2 : 1;
  const gAxis = svg.append("g");
  rows.forEach((d, i) => {
    const isPeak = d.year === injuredPeak.top.year || d.year === killedPeak.top.year;
    if (i % labelEvery !== 0 && !isPeak) return;
    gAxis.append("text")
      .attr("x", x(d.year) + x.bandwidth() / 2)
      .attr("y", rowTop.killed + rowH + 13)
      .attr("text-anchor", "middle")
      .style("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
      .text(`’${String(d.year).slice(2)}`);
  });

  // X-axis title: the year ticks alone ('08, '25...) read as calendar years —
  // this says they are fiscal years.
  gAxis.append("text")
    .attr("x", MARGIN.left + plotW / 2).attr("y", rowTop.killed + rowH + 30)
    .attr("text-anchor", "middle")
    .style("font-family", T.sans).attr("font-size", 11).attr("fill", T.ink2)
    .text("Fiscal year (April to March)");

  function buildRow(key) {
    const y = yScale[key];
    const peak = peaks[key];
    const bars = svg.append("g").selectAll("rect")
      .data(rows)
      .join("rect")
      .attr("x", d => x(d.year))
      .attr("width", x.bandwidth())
      .attr("y", y(0))
      .attr("height", 0)
      .attr("fill", d => (peak && d.year === peak.top.year ? T.ink : T.harm));

    const gLabels = svg.append("g").attr("opacity", 0);
    if (peak) {
      const top = peak.top;
      const cx = x(top.year) + x.bandwidth() / 2;
      const value = top[key];
      const topY = y(value);
      const nearRight = cx > MARGIN.left + plotW * 0.62;
      gLabels.append("line")
        .attr("x1", cx).attr("y1", topY).attr("x2", cx).attr("y2", topY - 12)
        .attr("stroke", T.ink).attr("stroke-width", 1);
      gLabels.append("circle").attr("cx", cx).attr("cy", topY).attr("r", 4).attr("fill", T.ink);
      gLabels.append("text")
        .attr("x", nearRight ? cx - 6 : cx + 6).attr("y", topY - 16)
        .attr("text-anchor", nearRight ? "end" : "start")
        .style("font-family", T.serif).style("font-style", "italic")
        .attr("font-size", 13).attr("fill", T.ink)
        .text(String(value));
    }
    if (peak && peak.runnerUp) {
      const ru = peak.runnerUp;
      const cx = x(ru.year) + x.bandwidth() / 2;
      const topY = y(ru[key]);
      gLabels.append("text")
        .attr("x", cx).attr("y", topY - 6)
        .attr("text-anchor", "middle")
        .style("font-family", T.mono).attr("font-size", 10).attr("fill", T.ink2)
        .style("font-variant-numeric", "tabular-nums")
        .text(ru[key]);
    }
    return { bars, gLabels, y };
  }

  const injured = buildRow("injured");
  const killed = buildRow("killed");
  const parts = [injured, killed];

  function renderFrame(t) {
    parts.forEach(part => {
      part.bars.attr("y", (d, i) => {
        const f = harmBarFraction(t, i, rows.length);
        const key = part === injured ? "injured" : "killed";
        return part.y(0) - f * (part.y(0) - part.y(d[key]));
      }).attr("height", (d, i) => {
        const f = harmBarFraction(t, i, rows.length);
        const key = part === injured ? "injured" : "killed";
        return f * (part.y(0) - part.y(d[key]));
      });
      part.gLabels.attr("opacity", harmLabelOpacity(t));
    });
  }

  function play() {
    parts.forEach(part => { part.bars.interrupt(); part.gLabels.interrupt(); });
    const n = rows.length;
    parts.forEach(part => {
      const key = part === injured ? "injured" : "killed";
      part.bars.transition()
        .delay((_, i) => (i / n) * 0.85 * 1500)
        .duration(1500 * 0.85 / n + 200)
        .ease(d3.easeCubicOut)
        .attr("y", d => part.y(d[key]))
        .attr("height", d => part.y(0) - part.y(d[key]));
      part.gLabels.transition().delay(1500 * 0.85).duration(1500 * 0.15 + 150).attr("opacity", 1);
    });
  }

  function setProgress(t) {
    parts.forEach(part => { part.bars.interrupt(); part.gLabels.interrupt(); });
    renderFrame(t);
  }

  function stop() {
    parts.forEach(part => { part.bars.interrupt(); part.gLabels.interrupt(); });
  }

  return { play, setProgress, stop };
}
