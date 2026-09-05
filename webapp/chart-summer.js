// Summer small multiples: April-August sightings, 2025 against 2026, one
// panel per prefecture-level series in context.recent. Ministry totals stop
// at the national level after June, so the only way to say anything about
// July and August is prefecture by prefecture — and those prefectures range
// from Iwate's thousands to Miyagi's low hundreds, so every panel keeps its
// own y-scale rather than one shared axis flattening the small series.
//
// Assumes D3 v7 is loaded globally.

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug"];

/**
 * April-August {month, y2025, y2026} pairs per series in context.recent,
 * plus label/comparable/asOf/note/partialMonth and latestMonthIndex (0-4:
 * the last month with a reported 2026 value, or -1 if none yet). Pure so
 * mount and the tests agree on shape without a DOM.
 */
export function summerPanels(ctx) {
  const recent = ctx && ctx.recent;
  const series = (recent && recent.series) || [];
  return series.map(s => {
    const fy2025 = s.fy2025 || [];
    const fy2026 = s.fy2026 || [];
    const pairs = MONTHS.map((month, i) => ({
      month,
      y2025: fy2025[i] ?? null,
      y2026: fy2026[i] ?? null,
    }));
    let latestMonthIndex = -1;
    pairs.forEach((p, i) => { if (p.y2026 != null) latestMonthIndex = i; });
    return {
      key: s.key,
      label: s.label || s.key,
      source: s.source || null,
      url: s.url || null,
      asOf: s.as_of || null,
      comparable: s.comparable !== false,
      note: s.note || null,
      partialMonth: !!s.partial_month,
      pairs,
      latestMonthIndex,
    };
  });
}

/** The latest (max) as_of date across every series, for the note under the
 * grid — the panels don't all update on the same day. */
export function latestAsOf(panels) {
  const dates = panels.map(p => p.asOf).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

function formatAsOf(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** The single note drawn under the grid, or null if no series has an as_of
 * date yet. */
function asOfNote(iso) {
  const formatted = formatAsOf(iso);
  return formatted ? `2025 from the ministry's table; 2026 from each prefecture, as of ${formatted}.` : null;
}

/**
 * Bar i's grown fraction at progress t: every panel's month i rises together
 * in an equal slice of [0, growEnd], left to right. Pure so play()'s
 * staggered transition and setProgress(t)'s instant frame agree.
 */
export function summerBarFraction(t, i, n, growEnd = 0.85) {
  if (n <= 0) return 0;
  const start = (i / n) * growEnd;
  const end = ((i + 1) / n) * growEnd;
  const span = end - start;
  const local = span <= 0 ? (t >= end ? 1 : 0) : (t - start) / span;
  return Math.min(1, Math.max(0, local));
}

/** Callouts and footers fade in only once every bar has finished rising. */
export function summerCalloutOpacity(t, growEnd = 0.85) {
  const span = 1 - growEnd;
  if (span <= 0) return t >= growEnd ? 1 : 0;
  return Math.min(1, Math.max(0, (t - growEnd) / span));
}

function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  return {
    paper: v("--paper", "#f6f1e7"),
    ink: v("--ink", "#2b2620"),
    ink2: v("--ink-2", "#4d453d"),
    rule: v("--rule", "#d8cdb8"),
    sight: v("--sight", "#4a6741"),
    sight2: v("--sight-2", "#7f9a6c"),
    serif: v("--font-serif", "Newsreader, Georgia, serif"),
    sans: v("--font-sans", "Public Sans, system-ui, sans-serif"),
    mono: v("--font-mono", "JetBrains Mono, ui-monospace, monospace"),
  };
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Break `text` into tspans no wider than maxWidth, appended to `sel`
 * (a d3 selection of one <text>), returning the number of lines drawn. */
function wrapText(sel, text, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/).filter(Boolean);
  sel.text(null);
  let line = [];
  let lineNum = 0;
  let tspan = sel.append("tspan").attr("x", sel.attr("x")).attr("dy", 0);
  words.forEach(word => {
    line.push(word);
    tspan.text(line.join(" "));
    if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
      line.pop();
      tspan.text(line.join(" "));
      line = [word];
      lineNum += 1;
      tspan = sel.append("tspan").attr("x", sel.attr("x")).attr("dy", lineHeight).text(word);
    }
  });
  return lineNum + 1;
}

const GRID_GAP = 14;
const NOTE_FONT_SIZE = 10.5;
const NOTE_LINE_H = 13;

export function mountSummer(container, data) {
  container.innerHTML = "";
  const ctx = data && data.context;
  const panels = summerPanels(ctx);
  if (!panels.length) return { play() {}, setProgress() {}, stop() {} };

  const T = readTokens();
  const noteText = asOfNote(latestAsOf(panels));
  const { width: W, height: H } = container.getBoundingClientRect();

  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");

  // The closing note wraps to as many lines as a narrow panel needs (it runs
  // to one line at 900px but two at 340px) — measured with a throwaway text
  // node first so the grid above it can be sized to leave the right amount
  // of room, rather than guessing a fixed height and clipping the note.
  let noteLines = 1;
  if (noteText) {
    const probe = svg.append("text")
      .attr("x", 2).attr("y", 0).attr("opacity", 0)
      .style("font-family", T.sans).attr("font-size", NOTE_FONT_SIZE);
    noteLines = wrapText(probe, noteText, W - 4, NOTE_LINE_H);
    probe.remove();
  }
  const NOTE_H = noteText ? noteLines * NOTE_LINE_H + 10 : 4;

  // Two hatch patterns, unique per mount so more than one instance of this
  // chart in one document (as in the visual-QA harness) can't collide on
  // <pattern> ids: --rule hatch flags the whole 2026 series for a
  // not-comparable prefecture (Iwate); --sight hatch flags only the single
  // latest-month bar when that month's count is still partial.
  const uid = `summer-${Math.random().toString(36).slice(2, 8)}`;
  const defs = svg.append("defs");
  const ruleHatchId = `${uid}-rule`;
  const sightHatchId = `${uid}-sight`;
  defs.append("pattern")
    .attr("id", ruleHatchId).attr("width", 5).attr("height", 5)
    .attr("patternTransform", "rotate(45)").attr("patternUnits", "userSpaceOnUse")
    .append("rect").attr("width", 2).attr("height", 5).attr("fill", T.rule);
  defs.append("pattern")
    .attr("id", sightHatchId).attr("width", 5).attr("height", 5)
    .attr("patternTransform", "rotate(45)").attr("patternUnits", "userSpaceOnUse")
    .append("rect").attr("width", 2).attr("height", 5).attr("fill", T.sight2);

  // A 2x2 grid on a wide panel, a 4x1 stack once it's too narrow for two
  // columns to each hold a readable bar chart. Below ~420px wide there's
  // also no room for the per-panel "own scale" note or month ticks without
  // them colliding with the bars, so those drop and only the callout stays.
  const stacked = W < 500;
  const compact = W < 420;
  const cols = stacked ? 1 : 2;
  const rows = Math.ceil(panels.length / cols);
  const gridH = H - NOTE_H;
  const cellW = (W - GRID_GAP * (cols - 1)) / cols;
  const cellH = (gridH - GRID_GAP * (rows - 1)) / rows;

  const barFractionState = { t: 0 };
  const allBars = [];
  const allCallouts = [];
  const allFooters = [];

  panels.forEach((panel, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = col * (cellW + GRID_GAP);
    const cy = row * (cellH + GRID_GAP);
    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    const titleSize = compact ? 12 : 13;
    const title = g.append("text")
      .attr("x", 2).attr("y", titleSize)
      .style("font-family", T.serif).style("font-style", "italic")
      .attr("font-size", titleSize).attr("fill", T.ink);
    const titleLines = wrapText(title, panel.label, cellW - 4, titleSize + 2);
    const titleH = titleSize * 1.15 * titleLines + 4;

    const hasFooter = !panel.comparable && !compact;
    const footerLines = 2;
    const footerH = hasFooter ? 10 * footerLines + 6 : 0;

    const M = {
      top: titleH + (compact ? 2 : 12),
      bottom: (compact ? 14 : 20) + footerH,
      left: 4,
      right: 4,
    };
    const plotW = cellW - M.left - M.right;
    const plotH = cellH - M.top - M.bottom;
    const plotTop = M.top;
    const plotBottom = M.top + plotH;

    if (!compact) {
      g.append("text")
        .attr("x", cellW - 2).attr("y", plotTop - 4)
        .attr("text-anchor", "end")
        .style("font-family", T.sans).attr("font-size", 9).attr("fill", T.ink2)
        .text("own scale");
    }

    // Hairline frame — the panel itself has no background.
    g.append("rect")
      .attr("x", M.left).attr("y", plotTop).attr("width", plotW).attr("height", plotH)
      .attr("fill", "none").attr("stroke", T.rule).attr("stroke-width", 1);

    const monthX = d3.scaleBand()
      .domain(MONTHS)
      .range([M.left, M.left + plotW])
      .paddingOuter(0.15)
      .paddingInner(0.3);
    const seriesX = d3.scaleBand()
      .domain(["y2025", "y2026"])
      .range([0, monthX.bandwidth()])
      .padding(0.12);

    const maxVal = d3.max(panel.pairs, d => Math.max(d.y2025 || 0, d.y2026 || 0)) || 1;
    const y = d3.scaleLinear().domain([0, maxVal * 1.15]).range([plotBottom, plotTop]);

    if (!compact) {
      panel.pairs.forEach(d => {
        g.append("text")
          .attr("x", monthX(d.month) + monthX.bandwidth() / 2)
          .attr("y", plotBottom + 12)
          .attr("text-anchor", "middle")
          .style("font-family", T.sans).attr("font-size", 9).attr("fill", T.ink2)
          .text(d.month);
      });
    }

    const barColor = (d, key) => {
      if (key === "y2025") return T.rule;
      if (!panel.comparable) return `url(#${ruleHatchId})`;
      if (panel.partialMonth && d.month === MONTHS[panel.latestMonthIndex]) return `url(#${sightHatchId})`;
      return T.sight;
    };

    const panelBars = panel.pairs.flatMap((d, i) => (["y2025", "y2026"]).map(key => {
      const val = d[key];
      const rect = g.append("rect")
        .attr("x", monthX(d.month) + seriesX(key))
        .attr("width", seriesX.bandwidth())
        .attr("y", y(0)).attr("height", 0)
        .attr("fill", val == null ? "none" : barColor(d, key))
        .attr("stroke", key === "y2025" ? T.ink2 : "none")
        .attr("stroke-width", key === "y2025" ? 1 : 0);
      return { rect, i, value: val, y0: y(0), y1: val == null ? y(0) : y(val) };
    }));
    allBars.push(...panelBars);

    // The one callout per panel, at the latest reported month: 2026 against
    // 2025 at the same point in the season, e.g. "Aug 251 vs 766".
    const latest = panel.latestMonthIndex >= 0 ? panel.pairs[panel.latestMonthIndex] : null;
    const callout = g.append("g").attr("opacity", 0);
    if (latest && latest.y2026 != null) {
      const bx = monthX(latest.month) + seriesX("y2026") + seriesX.bandwidth() / 2;
      const topY = y(latest.y2026);
      const label = latest.y2025 != null
        ? `${latest.month} ${latest.y2026.toLocaleString()} vs ${latest.y2025.toLocaleString()}`
        : `${latest.month} ${latest.y2026.toLocaleString()}`;
      const nearRight = bx > M.left + plotW * 0.6;
      callout.append("line")
        .attr("x1", bx).attr("y1", topY).attr("x2", bx).attr("y2", Math.max(plotTop, topY - 10))
        .attr("stroke", T.ink).attr("stroke-width", 1);
      callout.append("circle").attr("cx", bx).attr("cy", topY).attr("r", 3).attr("fill", T.ink);
      callout.append("text")
        .attr("x", nearRight ? bx - 5 : bx + 5)
        .attr("y", Math.max(plotTop + 9, topY - 13))
        .attr("text-anchor", nearRight ? "end" : "start")
        .style("font-family", T.serif).style("font-style", "italic")
        .attr("font-size", compact ? 10 : 11).attr("fill", T.ink)
        .style("paint-order", "stroke")
        .attr("stroke", T.paper).attr("stroke-width", 3).attr("stroke-linejoin", "round")
        .text(label);
    }
    allCallouts.push(callout);

    // Iwate's footer: the method change, so the bars next to it are read as
    // "different measurement," not "fewer bears."
    const footer = g.append("g").attr("opacity", 0);
    if (hasFooter) {
      const footerText = footer.append("text")
        .attr("x", M.left).attr("y", cellH - footerH + 8)
        .style("font-family", T.sans).style("font-style", "italic")
        .attr("font-size", 10).attr("fill", T.ink2);
      wrapText(footerText, "not comparable: counting method changed April 2026", plotW, 11);
    }
    allFooters.push(footer);
  });

  const note = svg.append("g").attr("opacity", 0);
  if (noteText) {
    const noteTextEl = note.append("text")
      .attr("x", 2).attr("y", H - NOTE_H + NOTE_LINE_H)
      .style("font-family", T.sans).attr("font-size", NOTE_FONT_SIZE).attr("fill", T.ink2);
    wrapText(noteTextEl, noteText, W - 4, NOTE_LINE_H);
  }

  function renderFrame(t) {
    barFractionState.t = t;
    allBars.forEach(b => {
      if (b.value == null) return;
      const f = summerBarFraction(t, b.i, MONTHS.length);
      b.rect.attr("y", b.y0 - f * (b.y0 - b.y1)).attr("height", f * (b.y0 - b.y1));
    });
    const op = summerCalloutOpacity(t);
    allCallouts.forEach(c => c.attr("opacity", op));
    allFooters.forEach(f => f.attr("opacity", op));
    note.attr("opacity", op);
  }

  function play() {
    stop();
    if (prefersReducedMotion()) {
      renderFrame(1);
      return;
    }
    const n = MONTHS.length;
    const duration = 1400;
    allBars.forEach(b => {
      if (b.value == null) return;
      b.rect.transition()
        .delay((b.i / n) * 0.85 * duration)
        .duration((0.85 * duration) / n + 200)
        .ease(d3.easeCubicOut)
        .attr("y", b.y1).attr("height", b.y0 - b.y1);
    });
    allCallouts.forEach(c => c.transition().delay(0.85 * duration).duration(0.15 * duration + 150).attr("opacity", 1));
    allFooters.forEach(f => f.transition().delay(0.85 * duration).duration(0.15 * duration + 150).attr("opacity", 1));
    note.transition().delay(0.85 * duration).duration(0.15 * duration + 150).attr("opacity", 1);
  }

  function setProgress(t) {
    stop();
    renderFrame(t);
  }

  function stop() {
    allBars.forEach(b => b.rect.interrupt());
    allCallouts.forEach(c => c.interrupt());
    allFooters.forEach(f => f.interrupt());
    note.interrupt();
  }

  return { play, setProgress, stop };
}
