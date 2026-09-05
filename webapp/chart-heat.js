// Prefecture x month heatmap: FY2025 beside FY2024 on one colour scale, so
// the reader sees that October and November 2025 lit up a map that FY2024
// left almost dark. Rows are capped at 20 (the tail is 38 prefectures, most
// of them near zero) with Tohoku's six pulled to the top as a group, because
// that is where the autumn happened (claim 2).
//
// Colour uses a sqrt scale, not log: several cells are exactly zero, which a
// log scale can't place, and sqrt still compresses October's outliers enough
// that April's single-digit counts stay visible instead of vanishing to the
// same shade as zero.
//
// Assumes D3 v7 is loaded globally.

export const TOHOKU_PREFS = ["aomori", "iwate", "miyagi", "akita", "yamagata", "fukushima"];
const TOP_N = 20;

/** The capitalised display name for a prefecture key: looked up in
 * context.population's label list where available (it already carries the
 * correct capitalisation, e.g. "Hokkaido"), falling back to capitalising
 * the key's first letter for any prefecture missing from that list. */
export function prefLabel(ctx, pref) {
  const pop = (ctx && ctx.population) || [];
  const found = pop.find(p => p.pref === pref);
  if (found && found.label) return found.label;
  return pref.charAt(0).toUpperCase() + pref.slice(1);
}

/** National sightings for one fiscal year and month index (0=Apr..11=Mar),
 * read straight off monthly_national rather than summed from the prefecture
 * table, so it is exact even though only the top rows are drawn. */
export function nationalMonthTotal(ctx, fy, monthIndex) {
  const mn = ctx && ctx.monthly_national;
  if (!mn) return null;
  const values = (mn.sightings || {})[String(fy)] || [];
  const v = values[monthIndex];
  return v == null ? null : v;
}

/**
 * One fiscal year's prefecture x month matrix, ready to draw. `prefOrder`,
 * when given, pins the row order (and which rows are "shown") — used so the
 * FY2024 panel lines its rows up with FY2025's, not its own ranking.
 */
export function heatCells(ctx, fy, prefOrder) {
  const pm = ctx && ctx.prefecture_month;
  if (!pm) return { fy, months: [], rows: [], more: 0, order: [] };
  const months = pm.months || [];
  const yearSightings = (pm.sightings || {})[String(fy)] || {};
  const totals25 = (pm.totals || {})["2025"] || {};

  let order = prefOrder;
  if (!order) {
    const all = pm.prefectures || [];
    const byTotal = p => totals25[p] || 0;
    const tohoku = TOHOKU_PREFS.filter(p => all.includes(p)).sort((a, b) => byTotal(b) - byTotal(a));
    const rest = all.filter(p => !TOHOKU_PREFS.includes(p)).sort((a, b) => byTotal(b) - byTotal(a));
    order = [...tohoku, ...rest];
  }

  const shown = order.slice(0, TOP_N);
  const more = Math.max(0, order.length - TOP_N);
  const rows = shown.map(pref => {
    const raw = yearSightings[pref] || months.map(() => 0);
    return {
      pref,
      tohoku: TOHOKU_PREFS.includes(pref),
      values: months.map((_, i) => (raw[i] == null ? 0 : raw[i])),
    };
  });

  return { fy, months, rows, more, order };
}

/** The scale's shared domain max, across both years' shown cells, so one
 * colour ramp serves both heatmaps. */
export function sharedMax(heatA, heatB) {
  const all = [...heatA.rows, ...heatB.rows].flatMap(r => r.values);
  return d3.max(all) || 1;
}

/** Column i's opacity at progress t: columns fade in left to right, month by
 * month. Pure so play() and setProgress(t) draw the same frame. */
export function columnOpacityForProgress(t, col, nCols, growEnd = 0.92) {
  if (nCols <= 0) return 1;
  const start = (col / nCols) * growEnd;
  const end = ((col + 1) / nCols) * growEnd;
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
    paper: v("--paper", "#f6f1e7"),
    serif: v("--font-serif", "Georgia, 'Times New Roman', serif"),
    sans: v("--font-sans", "system-ui, sans-serif"),
    mono: v("--font-mono", "ui-monospace, monospace"),
  };
}

const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const PHONE_W = 420;
// Below this width there isn't room for the vertical Tohoku bracket beside
// a full-width label column without the two touching, so the bracket is
// dropped in favour of colouring the Tohoku rows' own labels.
const BRACKET_DROP_W = 500;

let measureCanvas = null;
/** Pixel width of `text` set in `fontPx`px of `fontFamily` — used to size
 * the row-label gutter to whatever prefecture names are actually shown,
 * rather than guessing a fixed width that full capitalised names (Fukushima,
 * Kagoshima, ...) can overflow. */
function measureTextWidth(text, fontPx, fontFamily) {
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  const c2d = measureCanvas.getContext("2d");
  c2d.font = `${fontPx}px ${fontFamily}`;
  return c2d.measureText(text).width;
}

export function mountHeat(container, data) {
  container.innerHTML = "";
  const ctx = data && data.context;
  const heatA = heatCells(ctx, 2025); // defines the shared row order
  const heatB = heatCells(ctx, 2024, heatA.order);
  if (!heatA.rows.length) return { play() {}, setProgress() {}, stop() {} };

  const T = readTokens();
  const maxV = sharedMax(heatA, heatB);
  const color = v => {
    const s = Math.sqrt(v) / Math.sqrt(maxV || 1);
    return d3.interpolateRgbBasis([T.paper, T.sight, T.ink])(Math.min(1, s));
  };

  const { width: W, height: H } = container.getBoundingClientRect();
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");

  const phone = W < PHONE_W;
  const dropBracket = W < BRACKET_DROP_W;
  const panels = phone ? [{ heat: heatA, label: "FY2025" }] : [
    { heat: heatA, label: "FY2025" },
    { heat: heatB, label: "FY2024" },
  ];

  const bracketW = 4;
  // The bracket's own budget: the stroke, a gap, and the rotated "Tohoku"
  // text's thickness — entirely separate from (to the left of) wherever the
  // row-label column ends up, so the two can never overlap.
  const bracketGutter = dropBracket ? 0 : 22;
  const MARGIN = { top: 64, right: 6, bottom: phone ? 18 : 0, left: 8 + bracketGutter };
  const gap = phone ? 0 : 18;
  const panelW = phone ? W - MARGIN.left - MARGIN.right : (W - MARGIN.left - MARGIN.right - gap) / 2;
  const rows = heatA.rows;
  const nRows = rows.length;

  // Subtitle: what one mark is, top-left, above both panels.
  svg.append("text")
    .attr("x", MARGIN.left).attr("y", 14)
    .style("font-family", T.sans).attr("font-size", 12).attr("fill", T.ink2)
    .text(W < 400 ? "One cell = one prefecture-month" : "One cell = one prefecture in one month, all Japan");

  // Colour scale legend: three swatches (0, mid, max) on the same ramp the
  // cells use. On its own row below the subtitle, right-aligned, so it never
  // has to share horizontal space with the subtitle at any panel width.
  const legendY = 30;
  const legendStops = [0, maxV / 2, maxV];
  const legendSwatch = 11;
  const legendGap = 3;
  const legendFmt = v => (v >= 1000 ? d3.format("~s")(v) : Math.round(v).toLocaleString());
  const legendLabels = legendStops.map(legendFmt);
  const gColorLegend = svg.append("g");
  // Measure each label so the swatches sit flush right regardless of digit
  // count ("0" vs a 5-digit max).
  const labelWidths = legendLabels.map(l => {
    const t = gColorLegend.append("text")
      .style("font-family", T.mono).attr("font-size", 10).text(l);
    const w = t.node().getComputedTextLength();
    t.remove();
    return w;
  });
  let cx = W - MARGIN.right;
  for (let i = legendStops.length - 1; i >= 0; i--) {
    cx -= labelWidths[i];
    gColorLegend.append("text")
      .attr("x", cx).attr("y", legendY)
      .style("font-family", T.mono).attr("font-size", 10).attr("fill", T.ink2)
      .text(legendLabels[i]);
    cx -= legendGap + legendSwatch;
    gColorLegend.append("rect")
      .attr("x", cx).attr("y", legendY - legendSwatch + 2)
      .attr("width", legendSwatch).attr("height", legendSwatch)
      .attr("fill", color(legendStops[i]))
      .attr("stroke", T.rule).attr("stroke-width", 0.5);
    cx -= 9;
  }
  const wordLabel = gColorLegend.append("text")
    .style("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
    .text("Sightings:");
  cx -= wordLabel.node().getComputedTextLength() + 5;
  wordLabel.attr("x", cx).attr("y", legendY);

  // Row-label font size and gutter width are both fixed across rows (every
  // row shares the same cellH), so compute them once: the gutter is sized to
  // whatever the longest visible prefecture name actually measures, so a
  // full "Fukushima" or "Kagoshima" can never spill left into the bracket.
  const noteBandH = 14;
  const availH = H - MARGIN.top - MARGIN.bottom - noteBandH;
  const cellH = availH / nRows;
  const rowLabelPx = Math.min(9, Math.max(6, cellH * 0.8));
  const rowLabels = rows.map(r => prefLabel(ctx, r.pref));
  const maxLabelW = rowLabels.length
    ? Math.max(...rowLabels.map(l => measureTextWidth(l, rowLabelPx, T.sans)))
    : 0;
  const rowLabelSpace = Math.ceil(maxLabelW) + 10;

  const groups = [];
  const allCells = [];
  const columns = [[], []]; // cells by month index, per panel index
  let calloutGroup = null; // the Akita/Oct callout, faded with October's column

  panels.forEach((p, pi) => {
    const x0 = MARGIN.left + rowLabelSpace + pi * (panelW - rowLabelSpace + gap);
    const cellW = (panelW - rowLabelSpace) / 12;
    const plotTop = MARGIN.top;

    const g = svg.append("g");
    groups.push(g);

    // Panel label (FY2025 / FY2024), serif italic, series-label convention —
    // on its own line above the month header row so the two never collide,
    // however narrow the panel gets.
    g.append("text")
      .attr("x", x0).attr("y", plotTop - 18)
      .style("font-family", T.serif).style("font-style", "italic")
      .attr("font-size", 12).attr("fill", T.ink)
      .text(p.label);

    // Month column labels, thinned by the cell's own width — a "middle"
    // three-letter label needs about 16px of clearance either side of it
    // before it touches its neighbour.
    const monthEvery = cellW < 16 ? 2 : 1;
    MONTH_LABELS.forEach((m, i) => {
      if (i % monthEvery !== 0) return;
      g.append("text")
        .attr("x", x0 + i * cellW + cellW / 2)
        .attr("y", plotTop - 5)
        .attr("text-anchor", "middle")
        .style("font-family", T.sans).attr("font-size", 9).attr("fill", T.ink2)
        .text(m);
    });

    // Row (prefecture) labels, full capitalised names — the gutter above is
    // already sized to the longest one, so nothing here needs truncating.
    // Below the bracket-drop width the Tohoku/non-Tohoku split is carried by
    // colour instead of the bracket (see below).
    rows.forEach((r, ri) => {
      if (pi !== 0) return; // only the left-most panel carries row labels
      if (cellH < 5) return; // too tight to label individually
      g.append("text")
        .attr("x", MARGIN.left + rowLabelSpace - 6)
        .attr("y", plotTop + ri * cellH + cellH / 2 + rowLabelPx * 0.32)
        .attr("text-anchor", "end")
        .style("font-family", T.sans).attr("font-size", rowLabelPx)
        .attr("fill", dropBracket && r.tohoku ? T.ink : T.ink2)
        .text(prefLabel(ctx, r.pref));
    });

    // Tohoku bracket, left-most panel only, and only once there is a
    // dedicated gutter (bracketGutter) for it to sit in — entirely left of
    // the label column, never sharing space with it.
    if (pi === 0 && !dropBracket) {
      const tohokuRows = rows.filter(r => r.tohoku);
      if (tohokuRows.length) {
        const first = rows.indexOf(tohokuRows[0]);
        const last = rows.lastIndexOf(tohokuRows[tohokuRows.length - 1]);
        const by0 = plotTop + first * cellH;
        const by1 = plotTop + (last + 1) * cellH;
        const bracketX = MARGIN.left - bracketGutter + bracketW + 2;
        g.append("path")
          .attr("d", `M${bracketX},${by0} h${bracketW} v${by1 - by0} h${-bracketW}`)
          .attr("fill", "none").attr("stroke", T.ink2).attr("stroke-width", 1);
        g.append("text")
          .attr("x", bracketX - 3)
          .attr("y", (by0 + by1) / 2)
          .attr("text-anchor", "end")
          .attr("dominant-baseline", "middle")
          .style("font-family", T.serif).style("font-style", "italic")
          .attr("font-size", 10).attr("fill", T.ink2)
          .attr("transform", `rotate(-90 ${bracketX - 3} ${(by0 + by1) / 2})`)
          .text("Tohoku");
      }
    }

    // Below the bracket-drop width, a small heading over the label column
    // (in the same row as the month header, so it can't collide with any
    // row's own label) says what the ink-coloured rows below it are.
    if (pi === 0 && dropBracket && rows.some(r => r.tohoku)) {
      g.append("text")
        .attr("x", MARGIN.left + rowLabelSpace - 6)
        .attr("y", plotTop - 5)
        .attr("text-anchor", "end")
        .style("font-family", T.serif).style("font-style", "italic")
        .attr("font-size", 9).attr("fill", T.ink2)
        .text("Tohoku");
    }

    // Cells.
    const cellSel = g.append("g").selectAll("rect")
      .data(rows.flatMap((r, ri) => r.values.map((v, ci) => ({ pref: r.pref, ri, ci, v }))))
      .join("rect")
      .attr("x", d => x0 + d.ci * cellW)
      .attr("y", d => plotTop + d.ri * cellH)
      .attr("width", Math.max(0, cellW - 1))
      .attr("height", Math.max(0, cellH - 1))
      .attr("fill", d => color(d.v))
      .attr("opacity", 1);
    columns[pi] = cellSel;
    allCells.push(cellSel);

    // Frame.
    g.append("rect")
      .attr("x", x0).attr("y", plotTop)
      .attr("width", panelW - rowLabelSpace).attr("height", nRows * cellH)
      .attr("fill", "none").attr("stroke", T.rule).attr("stroke-width", 1);

    // "+N more" note.
    if (p.heat.more > 0) {
      g.append("text")
        .attr("x", x0).attr("y", plotTop + nRows * cellH + 11)
        .style("font-family", T.sans).attr("font-size", 9).attr("fill", T.ink2)
        .text(`+${p.heat.more} more`);
    }

    // The one callout: October 2025's Akita cell (left panel, FY2025 only).
    // Akita is always near the top of the row order (it has the highest
    // FY2025 total), so the label runs horizontally along its own row, into
    // the pale Dec-Mar cells to the right — above collides with the month
    // header, below collides with the next row.
    if (pi === 0) {
      const akitaRow = rows.findIndex(r => r.pref === "akita");
      const octIdx = 6;
      if (akitaRow >= 0) {
        const v = rows[akitaRow].values[octIdx];
        const cx = x0 + octIdx * cellW + cellW / 2;
        const cy = plotTop + akitaRow * cellH + cellH / 2;
        // The row and column axes already say "Akita" and "Oct" — the
        // callout only needs to add the value, so it always fits beside the
        // cell even when the panel is narrow (two heatmaps side by side).
        const g2 = svg.append("g").attr("class", "heat-callout");
        const textWidth = 40;
        const decX = x0 + 8 * cellW + 4;
        const labelX = Math.min(Math.max(cx + 14, decX), x0 + panelW - rowLabelSpace - textWidth);
        g2.append("line")
          .attr("x1", cx).attr("y1", cy).attr("x2", labelX).attr("y2", cy)
          .attr("stroke", T.ink).attr("stroke-width", 1);
        g2.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 4).attr("fill", T.ink);
        g2.append("text")
          .attr("x", labelX + 4).attr("y", cy + 4)
          .style("font-family", T.serif).style("font-style", "italic")
          .attr("font-size", 11).attr("fill", T.ink)
          .text(v.toLocaleString());
        groups.push(g2);
        calloutGroup = g2;
      }
    }
  });

  if (phone) {
    svg.append("text")
      .attr("x", MARGIN.left + rowLabelSpace).attr("y", H - 4)
      .style("font-family", T.sans).attr("font-size", 9).attr("fill", T.ink2)
      .text("FY2024 shown at wider sizes, same colour scale.");
  }

  function renderFrame(t) {
    columns.forEach(cellSel => {
      if (!cellSel || !cellSel.attr) return;
      cellSel.attr("opacity", d => columnOpacityForProgress(t, d.ci, 12));
    });
    if (calloutGroup) calloutGroup.attr("opacity", columnOpacityForProgress(t, 6, 12));
  }

  function play() {
    columns.forEach(cellSel => {
      if (!cellSel || !cellSel.transition) return;
      cellSel.interrupt()
        .transition()
        .delay(d => (d.ci / 12) * 0.92 * 1400)
        .duration(180)
        .attr("opacity", 1);
    });
    if (calloutGroup) {
      calloutGroup.interrupt()
        .transition()
        .delay((6 / 12) * 0.92 * 1400)
        .duration(180)
        .attr("opacity", 1);
    }
  }

  function setProgress(t) {
    columns.forEach(cellSel => cellSel && cellSel.interrupt && cellSel.interrupt());
    if (calloutGroup) calloutGroup.interrupt();
    renderFrame(t);
  }

  function stop() {
    columns.forEach(cellSel => cellSel && cellSel.interrupt && cellSel.interrupt());
    if (calloutGroup) calloutGroup.interrupt();
  }

  // Start hidden so play()/setProgress(0) is the correct initial frame.
  setProgress(0);

  return { play, setProgress, stop };
}
