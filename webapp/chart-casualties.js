// April-July injured and killed, 2016-2026: claim 8's chart. Two bar rows,
// eleven years each, so 53 injured reads as ordinary against a decade and 6
// killed reads as the window's high point rather than a two-year comparison
// hiding both facts.
//
// Assumes D3 v7 is loaded globally.

/** Apr-Jul (the first four months of context's casualties table) injured and
 * killed, FY2016-2026 — the window claim 8 uses. The table on disk starts at
 * 2014, but 2014-15 are dropped so every row is a year with a full spring
 * sightings comparison alongside it elsewhere on the page. */
export function casualtyRows(ctx) {
  const cm = ctx && ctx.casualties_monthly;
  if (!cm || !cm.years) return [];
  const injured = cm.injured || {};
  const killed = cm.killed || {};
  return cm.years.filter(year => year >= 2016).map(year => {
    const inj = (injured[String(year)] || []).slice(0, 4);
    const kil = (killed[String(year)] || []).slice(0, 4);
    const sum = arr => (arr.some(v => v == null) ? null : arr.reduce((a, b) => a + b, 0));
    return { year, injured: sum(inj), killed: sum(kil) };
  }).filter(d => d.injured != null && d.killed != null);
}

/** The most recent year against the highest year before it, for one series. */
export function casualtyPeak(rows, key) {
  if (!rows.length) return null;
  const latest = rows[rows.length - 1];
  const prior = rows.slice(0, -1);
  if (!prior.length) return { latest, priorHigh: null };
  const priorHigh = prior.reduce((a, b) => (b[key] > a[key] ? b : a));
  return { latest, priorHigh };
}

export function casualtyBarFraction(t, i, n, growEnd = 0.85) {
  if (n <= 0) return 0;
  const start = (i / n) * growEnd;
  const end = ((i + 1) / n) * growEnd;
  const span = end - start;
  const local = span <= 0 ? (t >= end ? 1 : 0) : (t - start) / span;
  return Math.min(1, Math.max(0, local));
}

export function casualtyLabelOpacity(t, growEnd = 0.85) {
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
    serif: v("--font-serif", "Georgia, 'Times New Roman', serif"),
    sans: v("--font-sans", "system-ui, sans-serif"),
    mono: v("--font-mono", "ui-monospace, monospace"),
  };
}

const MARGIN = { top: 52, right: 14, bottom: 42, left: 34 };
const ROW_GAP = 22;
const SUBTITLE_FULL = "One bar = April to July of one year, all Japan";
const SUBTITLE_SHORT = "One bar = April to July of one year";

export function mountCasualties(container, data) {
  container.innerHTML = "";
  const ctx = data && data.context;
  const rows = casualtyRows(ctx);
  if (!rows.length) return { play() {}, setProgress() {}, stop() {} };

  const T = readTokens();
  const injuredPeak = casualtyPeak(rows, "injured");
  const killedPeak = casualtyPeak(rows, "killed");
  const latestYear = rows[rows.length - 1].year;
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

  // Legend: the running year (ink) against every year before it (harm), the
  // one colour code on this chart — its own row (2), top-right, so it never
  // has to share a row with the subtitle at any panel width.
  const gLegend = svg.append("g");
  const legendItems = [
    { color: T.harm, label: `2016 to ${latestYear - 1}` },
    { color: T.ink, label: String(latestYear) },
  ];
  const legendY = 28;
  let legendX = MARGIN.left + plotW;
  legendItems.slice().reverse().forEach(item => {
    const label = gLegend.append("text")
      .attr("y", legendY)
      .style("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
      .text(item.label);
    legendX -= label.node().getComputedTextLength();
    label.attr("x", legendX).attr("text-anchor", "start");
    legendX -= 4;
    gLegend.append("rect")
      .attr("x", legendX - 12).attr("y", legendY - 8).attr("width", 12).attr("height", 8)
      .attr("fill", item.color);
    legendX -= 12 + 10;
  });

  ["injured", "killed"].forEach(key => {
    svg.append("rect")
      .attr("x", MARGIN.left).attr("y", rowTop[key])
      .attr("width", plotW).attr("height", rowH)
      .attr("fill", "none").attr("stroke", T.rule).attr("stroke-width", 1);
  });

  const x = d3.scaleBand()
    .domain(rows.map(d => d.year))
    .range([MARGIN.left, MARGIN.left + plotW])
    .padding(0.24);

  const yFor = key => d3.scaleLinear()
    .domain([0, d3.max(rows, d => d[key]) * 1.15])
    .range([rowTop[key] + rowH, rowTop[key]]);
  const yScale = { injured: yFor("injured"), killed: yFor("killed") };
  const peaks = { injured: injuredPeak, killed: killedPeak };
  const rowTitle = { injured: "People injured, Apr-Jul", killed: "People killed, Apr-Jul" };

  // Y-axis title per row: the unit and window, horizontal, at the top of
  // that row's own axis — doubles as the row's series label.
  ["injured", "killed"].forEach(key => {
    svg.append("text")
      .attr("x", MARGIN.left).attr("y", rowTop[key] - 6)
      .style("font-family", T.sans).attr("font-size", 11).attr("fill", T.ink2)
      .text(rowTitle[key]);
  });

  // Y-axis tick labels.
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

  const labelEvery = plotW / rows.length < 16 ? 3 : plotW / rows.length < 26 ? 2 : 1;
  const gAxis = svg.append("g");
  rows.forEach((d, i) => {
    if (i % labelEvery !== 0 && d.year !== latestYear) return;
    gAxis.append("text")
      .attr("x", x(d.year) + x.bandwidth() / 2)
      .attr("y", rowTop.killed + rowH + 13)
      .attr("text-anchor", "middle")
      .style("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
      .text(`’${String(d.year).slice(2)}`);
  });

  // X-axis title: the year ticks alone ('16, '26...) read as calendar years —
  // this says they are fiscal years, and repeats the window.
  gAxis.append("text")
    .attr("x", MARGIN.left + plotW / 2).attr("y", rowTop.killed + rowH + 30)
    .attr("text-anchor", "middle")
    .style("font-family", T.sans).attr("font-size", 11).attr("fill", T.ink2)
    .text("Fiscal year (April to July)");

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
      .attr("fill", d => (d.year === latestYear ? T.ink : T.harm));

    const gLabels = svg.append("g").attr("opacity", 0);

    // The running year's own callout.
    const cur = rows.find(d => d.year === latestYear);
    if (cur) {
      const cx = x(cur.year) + x.bandwidth() / 2;
      const topY = y(cur[key]);
      const nearRight = cx > MARGIN.left + plotW * 0.62;
      gLabels.append("line")
        .attr("x1", cx).attr("y1", topY).attr("x2", cx).attr("y2", topY - 12)
        .attr("stroke", T.ink).attr("stroke-width", 1);
      gLabels.append("circle").attr("cx", cx).attr("cy", topY).attr("r", 4).attr("fill", T.ink);
      const suffix = key === "killed" ? ", window high" : "";
      gLabels.append("text")
        .attr("x", nearRight ? cx - 6 : cx + 6).attr("y", topY - 16)
        .attr("text-anchor", nearRight ? "end" : "start")
        .style("font-family", T.serif).style("font-style", "italic")
        .attr("font-size", 13).attr("fill", T.ink)
        .text(`${cur[key]}${suffix}`);
    }

    // The previous high, quietly labelled.
    if (peak && peak.priorHigh) {
      const ph = peak.priorHigh;
      const cx = x(ph.year) + x.bandwidth() / 2;
      const topY = y(ph[key]);
      gLabels.append("text")
        .attr("x", cx).attr("y", topY - 6)
        .attr("text-anchor", "middle")
        .style("font-family", T.mono).attr("font-size", 10).attr("fill", T.ink2)
        .style("font-variant-numeric", "tabular-nums")
        .text(ph[key]);
    }

    return { bars, gLabels, y };
  }

  const injured = buildRow("injured");
  const killed = buildRow("killed");
  const parts = [{ ...injured, key: "injured" }, { ...killed, key: "killed" }];

  function renderFrame(t) {
    parts.forEach(part => {
      part.bars.attr("y", (d, i) => {
        const f = casualtyBarFraction(t, i, rows.length);
        return part.y(0) - f * (part.y(0) - part.y(d[part.key]));
      }).attr("height", (d, i) => {
        const f = casualtyBarFraction(t, i, rows.length);
        return f * (part.y(0) - part.y(d[part.key]));
      });
      part.gLabels.attr("opacity", casualtyLabelOpacity(t));
    });
  }

  function play() {
    parts.forEach(part => { part.bars.interrupt(); part.gLabels.interrupt(); });
    const n = rows.length;
    parts.forEach(part => {
      part.bars.transition()
        .delay((_, i) => (i / n) * 0.85 * 1400)
        .duration(1400 * 0.85 / n + 200)
        .ease(d3.easeCubicOut)
        .attr("y", d => part.y(d[part.key]))
        .attr("height", d => part.y(0) - part.y(d[part.key]));
      part.gLabels.transition().delay(1400 * 0.85).duration(1400 * 0.15 + 150).attr("opacity", 1);
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
