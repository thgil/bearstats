// Bear estimates by prefecture: dumbbells from the earliest published survey
// to the latest.
//
// The MoE draft guideline table also carries multi-prefecture management
// units (Kitakinki, Chugoku, the Kii Peninsula, Shikoku) whose labels
// parenthesise the prefectures they overlap; those are regional rows, not
// prefectures, and are skipped so a reader cannot double-count a prefecture
// once on its own row and once inside a region.
//
// Assumes D3 v7 is loaded globally.

/** A regional/management-unit row, not a single prefecture (label carries a "("). */
function isRegional(row) {
  return typeof row.label === "string" && row.label.includes("(");
}

/**
 * {pref, label, from, fromYear, to, toYear}[], sorted by latest estimate
 * descending. `from` prefers the "early" (pre-2010-ish) column; where that
 * is missing but a "mid" column exists, `mid` is used instead. Rows with
 * neither an early nor a mid value, or no latest value, are dropped: there
 * is nothing to draw a line between.
 */
export function populationPairs(ctx) {
  const rows = ctx?.context?.population || [];
  return rows
    .filter(r => !isRegional(r))
    .map(r => {
      const hasEarly = r.early != null && r.early_year != null;
      const hasMid = r.mid != null && r.mid_year != null;
      const from = hasEarly ? r.early : hasMid ? r.mid : null;
      const fromYear = hasEarly ? r.early_year : hasMid ? r.mid_year : null;
      return {
        pref: r.pref,
        label: r.label,
        from,
        fromYear,
        to: r.latest ?? null,
        toYear: r.latest_year ?? null,
      };
    })
    .filter(r => r.from != null && r.to != null)
    .sort((a, b) => b.to - a.to);
}

function cssVar(name, fallback) {
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const TOKENS = () => ({
  ink: cssVar("--ink", "#2b2620"),
  ink2: cssVar("--ink-2", "#4d453d"),
  rule: cssVar("--rule", "#d8cdb8"),
  serif: cssVar("--font-serif", "Newsreader, Georgia, serif"),
  sans: cssVar("--font-sans", "Public Sans, system-ui, sans-serif"),
  mono: cssVar("--font-mono", "JetBrains Mono, ui-monospace, monospace"),
});

/** X-axis tick label: "5k" rather than "5,000", so the axis stays compact. */
function formatK(v) {
  return v === 0 ? "0" : `${Math.round(v / 1000)}k`;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const MAX_ROWS_WIDE = 16;
const MAX_ROWS_NARROW = 8;
const NARROW_BREAKPOINT = 380;
// Each row stacks a "from" label above its line and a "to" label below; this
// is the least row height that keeps those clear of the next row's "from"
// label (see the label offsets below). Below this, rows are dropped (and
// the caption says so) rather than left to collide.
const MIN_ROW_H = 29;

export function mountPopulation(container, data) {
  container.innerHTML = "";
  const all = populationPairs(data);
  if (!all.length) return { play() {}, setProgress() {}, stop() {} };

  const T = TOKENS();
  const { width: W, height: H } = container.getBoundingClientRect();
  const narrow = W < NARROW_BREAKPOINT;
  const subtitleH = 14;
  const xAxisGap = 4, tickH = 12, xAxisTitleH = 13;
  const axisH = xAxisGap + tickH + 2 + xAxisTitleH;
  const M = { top: 10 + subtitleH, right: 56, bottom: 8 + axisH, left: 78 };

  let cap = Math.min(narrow ? MAX_ROWS_NARROW : MAX_ROWS_WIDE, all.length);
  let captionH = cap < all.length ? 16 : 0;
  const heightCap = Math.max(3, Math.floor((H - M.top - M.bottom - captionH) / MIN_ROW_H));
  cap = Math.min(cap, heightCap);
  captionH = cap < all.length ? 16 : 0;

  const rows = all.slice(0, cap);
  const omitted = all.length - rows.length;
  const rowH = (H - M.top - M.bottom - captionH) / rows.length;
  const rowsBottom = M.top + rows.length * rowH;

  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%").style("height", "100%");

  // ---- subtitle: what one mark is, and the window ----------------------------
  svg.append("text")
    .attr("x", 2).attr("y", 10 + 9)
    .attr("font-family", T.sans).attr("font-size", 12).attr("fill", T.ink2)
    .text("Earliest published estimate to latest, survey year in brackets");

  const plotW = W - M.left - M.right;
  const x = d3.scaleLinear().domain([0, d3.max(rows, d => Math.max(d.from, d.to))]).nice().range([0, plotW]);

  // ---- x-axis: hairline + k-formatted ticks + title, below every row --------
  svg.append("line")
    .attr("x1", M.left).attr("x2", M.left + plotW)
    .attr("y1", rowsBottom).attr("y2", rowsBottom)
    .attr("stroke", T.rule);
  svg.append("g").selectAll("text").data(x.ticks(narrow ? 3 : 5)).join("text")
    .attr("x", d => M.left + x(d)).attr("y", rowsBottom + xAxisGap + tickH - 2)
    .attr("text-anchor", "middle")
    .attr("font-family", T.sans).attr("font-size", 9.5).attr("fill", T.ink2)
    .text(d => formatK(d));
  svg.append("text")
    .attr("x", M.left + plotW / 2).attr("y", rowsBottom + xAxisGap + tickH + xAxisTitleH)
    .attr("text-anchor", "middle")
    .attr("font-family", T.sans).attr("font-size", 10.5).attr("fill", T.ink2)
    .text("Estimated bears");

  const groups = svg.append("g").selectAll("g").data(rows).join("g")
    .attr("transform", (d, i) => `translate(${M.left},${M.top + i * rowH + rowH / 2})`);

  groups.append("text")
    .attr("x", -8).attr("y", 3)
    .attr("text-anchor", "end")
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 12)
    .attr("fill", T.ink)
    .text(d => d.label);

  const lines = groups.append("line")
    .attr("x1", d => x(d.from)).attr("x2", d => x(d.from))
    .attr("y1", 0).attr("y2", 0)
    .attr("stroke", T.rule).attr("stroke-width", 2);

  const dotsFrom = groups.append("circle")
    .attr("cx", d => x(d.from)).attr("cy", 0).attr("r", 3.5)
    .attr("fill", T.ink2).attr("opacity", 0);

  const dotsTo = groups.append("circle")
    .attr("cx", d => x(d.from)).attr("cy", 0).attr("r", 3.5)
    .attr("fill", T.ink).attr("opacity", 0);

  // The two ends often sit close together on the x-axis (e.g. Niigata,
  // 1,080 to 1,118), so the "from" and "to" labels are stacked above and
  // below the line rather than side by side, where they would overlap
  // whenever the two estimates are close. The anchor is chosen from the
  // label's own (measured) width, not a fixed edge margin, because a narrow
  // plot (340px) puts several small values close enough to x=0 that a fixed
  // percentage still runs the label into the prefecture name at the left.
  // Offsets are deliberately tight (chosen with MIN_ROW_H above) so a label
  // never reaches the next row's label even when rows are packed 16-deep.
  const labelFontSize = 8.5;
  const fromY = -6, toY = 9;
  const estWidth = text => text.length * labelFontSize * 0.62;
  const anchorFor = (px, text) => {
    const half = estWidth(text) / 2;
    if (px - half < 2) return "start";
    if (px + half > plotW - 2) return "end";
    return "middle";
  };

  const labelsFrom = groups.append("text")
    .attr("x", d => x(d.from)).attr("y", fromY)
    .attr("text-anchor", d => anchorFor(x(d.from), `${d.from.toLocaleString()} (${d.fromYear})`))
    .attr("font-family", T.mono).attr("font-size", labelFontSize).attr("fill", T.ink2)
    .attr("opacity", 0)
    .text(d => `${d.from.toLocaleString()} (${d.fromYear})`);

  const labelsTo = groups.append("text")
    .attr("x", d => x(d.from)).attr("y", toY)
    .attr("text-anchor", d => anchorFor(x(d.from), `${d.to.toLocaleString()} (${d.toYear})`))
    .attr("font-family", T.mono).attr("font-size", labelFontSize).attr("fill", T.ink)
    .attr("opacity", 0)
    .text(d => `${d.to.toLocaleString()} (${d.toYear})`);

  const caption = svg.append("text")
    .attr("x", M.left).attr("y", H - 4)
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 10.5)
    .attr("fill", T.ink2)
    .attr("opacity", 0)
    .text(omitted > 0 ? `${omitted} more prefecture${omitted === 1 ? "" : "s"} not shown at this size.` : "");

  function play() {
    // "Played once, on scroll" (chapter 4 has no director driving
    // setProgress) means nothing else guarantees this ever finishes before
    // it's looked at — a quick screenshot or a fast scroll can land mid-reveal
    // and never see the far ("to") end of any row. Reduced motion jumps
    // straight to the end state instead of racing a per-row stagger that can
    // take over a second to finish for 16 rows.
    if (prefersReducedMotion()) {
      lines.interrupt().attr("x2", d => x(d.to));
      dotsFrom.interrupt().attr("opacity", 1);
      labelsFrom.interrupt().attr("opacity", 1);
      dotsTo.interrupt().attr("cx", d => x(d.to)).attr("opacity", 1);
      labelsTo.interrupt()
        .attr("x", d => x(d.to))
        .attr("text-anchor", d => anchorFor(x(d.to), `${d.to.toLocaleString()} (${d.toYear})`))
        .attr("opacity", 1);
      caption.interrupt().attr("opacity", 1);
      return;
    }
    lines.interrupt().transition().delay((_, i) => i * 55).duration(500).ease(d3.easeCubicOut)
      .attr("x2", d => x(d.to));
    dotsFrom.interrupt().transition().delay((_, i) => i * 55).duration(1).attr("opacity", 1);
    labelsFrom.interrupt().transition().delay((_, i) => i * 55).duration(1).attr("opacity", 1);
    dotsTo.interrupt().transition().delay((_, i) => i * 55 + 480).duration(1)
      .attr("cx", d => x(d.to)).attr("opacity", 1);
    labelsTo.interrupt().transition().delay((_, i) => i * 55 + 480).duration(1)
      .attr("x", d => x(d.to)).attr("text-anchor", d => anchorFor(x(d.to), `${d.to.toLocaleString()} (${d.toYear})`)).attr("opacity", 1);
    caption.interrupt().transition().delay(rows.length * 55 + 550).duration(250).attr("opacity", 1);
  }

  function setProgress(t) {
    const cutoff = t * rows.length;
    lines.interrupt().attr("x2", (d, i) => x(d.from) + Math.min(1, Math.max(0, cutoff - i)) * (x(d.to) - x(d.from)));
    dotsFrom.interrupt().attr("opacity", (_, i) => (i < cutoff ? 1 : 0));
    labelsFrom.interrupt().attr("opacity", (_, i) => (i < cutoff ? 1 : 0));
    dotsTo.interrupt()
      .attr("cx", (d, i) => x(d.from) + Math.min(1, Math.max(0, cutoff - i)) * (x(d.to) - x(d.from)))
      .attr("opacity", (_, i) => (i < cutoff ? 1 : 0));
    labelsTo.interrupt()
      .attr("x", (d, i) => x(d.from) + Math.min(1, Math.max(0, cutoff - i)) * (x(d.to) - x(d.from)))
      .attr("text-anchor", d => anchorFor(x(d.to), `${d.to.toLocaleString()} (${d.toYear})`))
      .attr("opacity", (_, i) => (i < cutoff ? 1 : 0));
    caption.interrupt().attr("opacity", t >= 0.95 ? 1 : 0);
  }

  function stop() {
    lines.interrupt(); dotsFrom.interrupt(); dotsTo.interrupt();
    labelsFrom.interrupt(); labelsTo.interrupt(); caption.interrupt();
  }

  return { play, setProgress, stop };
}
