// Beech crop vs autumn sightings, FY2012-2025: tiles over bars.
//
// The top row is the Tohoku Regional Forest Office's five-prefecture mean
// beech index (145 fixed points, five prefectures) for each fiscal year's
// autumn survey. The bottom row is the same fiscal year's national October
// sightings. The point the chart has to make in one glance: every tall bar
// sits under a dark tile. FY2012 has an index but no MoE monthly table, so
// its bar is simply absent rather than zero.
//
// Assumes D3 v7 is loaded globally.

const PREFS = ["aomori", "iwate", "miyagi", "akita", "yamagata"];

/** Office thresholds (index_definition in context.json): 3.5 全 / 2.0 並 / 1.0 凶. */
export function categoryForIndex(index) {
  if (index >= 3.5) return "豊作";
  if (index >= 2.0) return "並作";
  if (index >= 1.0) return "凶作";
  return "大凶作";
}

/** Spearman rank correlation (average ranks for ties), no p-value. */
export function spearman(xs, ys) {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  const rank = vals => {
    const order = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
    const r = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && vals[order[j + 1]] === vals[order[i]]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[order[k]] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(xs), ry = rank(ys);
  const mx = rx.reduce((a, b) => a + b, 0) / n, my = ry.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - mx, dy = ry[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/**
 * Per fiscal year 2012-2025: the five-prefecture mean beech index and its
 * category, plus that year's national October and October+November
 * sightings (null for FY2012, which predates the MoE monthly table).
 */
export function mastStrip(ctx) {
  const mast = ctx?.context?.mast;
  const tho = mast?.tohoku_office || [];
  const byFy = new Map();
  for (const r of tho) {
    if (r.index == null) continue; // FY2026 rows are forecast-only
    if (!byFy.has(r.fy)) byFy.set(r.fy, {});
    byFy.get(r.fy)[r.pref] = r.index;
  }

  const monthly = ctx?.context?.monthly_national;
  const months = monthly?.months || [];
  const octIdx = months.indexOf(10);
  const novIdx = months.indexOf(11);
  const octOf = fy => {
    const row = monthly?.sightings?.[String(fy)];
    return row && octIdx >= 0 ? row[octIdx] : null;
  };
  const octNovOf = fy => {
    const row = monthly?.sightings?.[String(fy)];
    return row && octIdx >= 0 && novIdx >= 0 ? row[octIdx] + row[novIdx] : null;
  };

  const years = [...byFy.keys()].sort((a, b) => a - b).filter(fy => PREFS.every(p => byFy.get(fy)[p] != null));

  const rows = years.map(fy => {
    const vals = PREFS.map(p => byFy.get(fy)[p]);
    const meanIndex = vals.reduce((a, b) => a + b, 0) / vals.length;
    return {
      fy,
      meanIndex,
      category: categoryForIndex(meanIndex),
      octSightings: octOf(fy),
      octNovSightings: octNovOf(fy),
    };
  });

  const corrRows = rows.filter(r => r.octSightings != null);
  const rho = spearman(corrRows.map(r => r.meanIndex), corrRows.map(r => r.octSightings));

  return { years: rows, rho, n: corrRows.length };
}

function cssVar(name, fallback) {
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const TOKENS = () => ({
  paper: cssVar("--paper", "#f6f1e7"),
  ink: cssVar("--ink", "#2b2620"),
  ink2: cssVar("--ink-2", "#4d453d"),
  rule: cssVar("--rule", "#d8cdb8"),
  sight: cssVar("--sight", "#4a6741"),
  mast: [0, 1, 2, 3, 4, 5].map(i => cssVar(`--mast-${i}`, ["#2b2620", "#4b4237", "#6d604f", "#958468", "#c2b48e", "#efe6d2"][i])),
  serif: cssVar("--font-serif", "Newsreader, Georgia, serif"),
  sans: cssVar("--font-sans", "Public Sans, system-ui, sans-serif"),
  mono: cssVar("--font-mono", "JetBrains Mono, ui-monospace, monospace"),
});

/**
 * Relative luminance of a CSS colour, used to choose paper-on-dark vs
 * ink-on-pale text. Accepts anything d3.color understands — in particular
 * "rgb(r, g, b)", which is what d3.scaleLinear's colour interpolation
 * actually returns (not the "#rrggbb" hex the colour started from), so a
 * naive hex-only regex here silently fails on every interpolated tile and
 * always falls back to dark ink text, even over the darkest tiles.
 */
function luminance(color) {
  const c = typeof d3 !== "undefined" && d3.color ? d3.color(color) : null;
  if (!c) return 1;
  const { r, g, b } = c.rgb();
  return 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
}

/** Paper text over dark tiles, ink over pale ones — luminance < 0.4 is dark. */
function textOn(fill, dark, light) {
  return luminance(fill) < 0.4 ? dark : light;
}

/** i's reveal fraction at progress t, left to right, one slot per year. */
export function revealFraction(t, i, n, growEnd = 0.92) {
  if (n <= 0) return 0;
  const start = (i / n) * growEnd;
  const end = ((i + 1) / n) * growEnd;
  const span = end - start;
  const local = span <= 0 ? (t >= end ? 1 : 0) : (t - start) / span;
  return Math.min(1, Math.max(0, local));
}

export function mountMast(container, data) {
  container.innerHTML = "";
  const { years: rows } = mastStrip(data);
  if (!rows.length) return { play() {}, setProgress() {}, stop() {} };

  const T = TOKENS();
  const { width: W, height: H } = container.getBoundingClientRect();
  const M = { top: 8, right: 10, bottom: 22, left: 30 };

  /** Greedy word-wrap that never truncates — used to keep the subtitle and
   * the closing note inside the canvas at any width instead of running off
   * the right edge and getting clipped. */
  function wrapToLines(text, maxWidth, fontSize) {
    const charW = fontSize * 0.56;
    const maxChars = Math.max(8, Math.floor(maxWidth / charW));
    if (text.length <= maxChars) return [text];
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > maxChars && line) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    return lines;
  }

  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%").style("height", "100%");

  const plotW = W - M.left - M.right;
  const x = d3.scaleBand().domain(rows.map(d => d.fy)).range([M.left, M.left + plotW]).padding(0.14);

  // ---- top label: what the tile row is, plus a 3-swatch ramp legend --------
  const colorScale = d3.scaleLinear()
    .domain([0, 1, 2, 3, 4, 5])
    .range(T.mast)
    .clamp(true);

  // Below ~420px the full sentence runs off the canvas; the shorter form
  // keeps the 0-5 scale and the prefectures it covers, dropping only the
  // "no nuts / full crop" gloss that the legend swatches already carry.
  const subtitleText = W < 420
    ? "Beech index, 0-5, five Tohoku prefectures"
    : "Beech index, 0 = no nuts, 5 = full crop, five Tohoku prefectures";
  const topLabel = svg.append("g");
  topLabel.append("text")
    .attr("x", M.left).attr("y", M.top + 9)
    .attr("font-family", T.sans).attr("font-size", 12).attr("fill", T.ink2)
    .text(subtitleText);
  const legendY = M.top + 24;
  const legendStops = [0, 2.5, 5];
  const legendSwatch = 9;
  legendStops.forEach((v, i) => {
    const lx = M.left + i * 46;
    topLabel.append("rect")
      .attr("x", lx).attr("y", legendY - legendSwatch + 2).attr("width", legendSwatch).attr("height", legendSwatch)
      .attr("fill", colorScale(v)).attr("stroke", T.rule);
    topLabel.append("text")
      .attr("x", lx + legendSwatch + 3).attr("y", legendY)
      .attr("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
      .text(v);
  });

  // The note is two sentences; each wraps independently to however many
  // lines the canvas actually needs, rather than a fixed two-line budget
  // that runs the text off the right edge on a narrow panel.
  const noteFontSize = 11;
  const noteMaxW = W - M.left - 4;
  const noteLine1 = wrapToLines("Every October above 2,235 followed a poor crop (index under 2).", noteMaxW, noteFontSize);
  const noteLine2 = wrapToLines("The index does not set the size: 2023 and 2025 had the same index.", noteMaxW, noteFontSize);
  const noteLines = [...noteLine1, ...noteLine2];
  const noteLineH = 13;
  const noteH = noteLines.length * noteLineH + 2;
  const tickH = 16;
  const xAxisTitleH = 13;
  const yAxisTitleH = 13;
  const topLabelH = 24 + 14; // subtitle line + legend row
  const tileTop = M.top + topLabelH;
  const tileH = Math.max(30, Math.min(58, H * 0.16));
  const catH = 12;
  const gap = 8;
  const barsTop = tileTop + tileH + catH + gap + yAxisTitleH;
  const barsBottom = H - M.bottom - tickH - xAxisTitleH - noteH;
  const barsH = Math.max(20, barsBottom - barsTop);

  const maxOct = d3.max(rows, d => d.octSightings || 0) || 1;
  const y = d3.scaleLinear().domain([0, maxOct]).range([0, barsH]);

  // ---- y-axis: horizontal title above, hairline + k-formatted ticks --------
  svg.append("text")
    .attr("x", M.left).attr("y", barsTop - 2)
    .attr("font-family", T.sans).attr("font-size", 10.5).attr("fill", T.ink2)
    .text("October sightings, all Japan");

  const yTicks = [0, 5000, 10000, 15000].filter(v => v <= maxOct + 1500);
  svg.append("g").selectAll("text").data(yTicks).join("text")
    .attr("x", M.left - 4).attr("y", d => barsTop + barsH - y(d) + 3)
    .attr("text-anchor", "end")
    .attr("font-family", T.sans).attr("font-size", 9.5).attr("fill", T.ink2)
    .text(d => (d === 0 ? "0" : `${d / 1000}k`));
  svg.append("line")
    .attr("x1", M.left).attr("x2", M.left)
    .attr("y1", barsTop).attr("y2", barsTop + barsH)
    .attr("stroke", T.rule);

  // ---- top row: index tiles -------------------------------------------------
  // At narrow widths (e.g. 340px / 14 tiles) a tile is too small for both an
  // 11px number and a 9px category label, so both shrink with the tile and
  // the category drops out first — the colour alone still carries the class.
  const bw = x.bandwidth();
  // Below ~32px a tile cannot hold a four-character "x.xx" at a legible size,
  // so it drops to one decimal place ("x.x") instead of shrinking the font
  // past readability — the colour still carries the precise value.
  const decimals = bw >= 32 ? 2 : 1;
  const numFontSize = Math.max(7.5, Math.min(11, (bw * 0.82) / ((decimals === 2 ? 4 : 3) * 0.6)));
  const showCategory = bw >= 30;

  const tile = svg.append("g").selectAll("g").data(rows).join("g")
    .attr("transform", d => `translate(${x(d.fy)},${tileTop})`)
    .attr("opacity", 0);

  tile.append("rect")
    .attr("width", bw).attr("height", tileH)
    .attr("fill", d => colorScale(d.meanIndex));

  tile.append("text")
    .attr("x", bw / 2).attr("y", tileH / 2 - (showCategory ? 4 : 0))
    .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
    .attr("font-family", T.mono).attr("font-size", numFontSize).attr("font-variant-numeric", "tabular-nums")
    .attr("fill", d => textOn(colorScale(d.meanIndex), T.paper, T.ink))
    .text(d => d.meanIndex.toFixed(decimals));

  if (showCategory) {
    tile.append("text")
      .attr("x", bw / 2).attr("y", tileH - 6)
      .attr("text-anchor", "middle")
      .attr("font-family", T.sans).attr("font-size", 9)
      .attr("fill", d => textOn(colorScale(d.meanIndex), T.paper, T.ink2))
      .attr("opacity", 0.85)
      .text(d => d.category);
  }

  // ---- bottom row: October sightings bars ------------------------------------
  const barRows = rows.filter(d => d.octSightings != null);
  const baseline = barsTop + barsH;
  svg.append("line")
    .attr("x1", M.left).attr("x2", M.left + plotW)
    .attr("y1", baseline).attr("y2", baseline)
    .attr("stroke", T.rule);

  const RECORD_FY = d3.max(barRows, d => d.fy);
  const bars = svg.append("g").selectAll("rect").data(barRows).join("rect")
    .attr("x", d => x(d.fy)).attr("width", x.bandwidth())
    .attr("y", baseline).attr("height", 0)
    .attr("fill", d => (d.fy === RECORD_FY ? T.ink : T.sight));

  // Year ticks: thin out on narrow viewports so labels never collide.
  const step = x.bandwidth() < 26 ? 2 : 1;
  svg.append("g").selectAll("text").data(rows.filter((_, i) => i % step === 0))
    .join("text")
    .attr("x", d => x(d.fy) + x.bandwidth() / 2)
    .attr("y", baseline + tickH - 2)
    .attr("text-anchor", "middle")
    .attr("font-family", T.sans).attr("font-size", 10).attr("fill", T.ink2)
    .text(d => `'${String(d.fy).slice(2)}`);

  svg.append("text")
    .attr("x", M.left + plotW / 2).attr("y", baseline + tickH + xAxisTitleH - 3)
    .attr("text-anchor", "middle")
    .attr("font-family", T.sans).attr("font-size", 10.5).attr("fill", T.ink2)
    .text("Fiscal year");

  // ---- callouts: the two record-setting years, both at the same index ---------
  // makeCallout draws a leader + dot + label above a given bar; used for both
  // the FY2025 record and the FY2023 callout that makes the amplitude point.
  function makeCallout(row, text, lift) {
    const g = svg.append("g").attr("opacity", 0);
    if (!row) return g;
    const cx = x(row.fy) + x.bandwidth() / 2;
    const topY = baseline - y(row.octSightings);
    g.append("line")
      .attr("x1", cx).attr("x2", cx)
      .attr("y1", Math.max(barsTop, topY - lift)).attr("y2", topY - 4)
      .attr("stroke", T.ink).attr("stroke-width", 1);
    g.append("circle")
      .attr("cx", cx).attr("cy", topY - 4).attr("r", 2)
      .attr("fill", T.ink);
    g.append("text")
      .attr("x", cx).attr("y", Math.max(barsTop, topY - lift - 4))
      .attr("text-anchor", cx > M.left + plotW * 0.75 ? "end" : cx < M.left + plotW * 0.25 ? "start" : "middle")
      .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", 11.5)
      .attr("fill", T.ink)
      .text(text);
    return g;
  }

  const recordRow = barRows.find(d => d.fy === RECORD_FY);
  const priorRow = barRows.find(d => d.fy === 2023);
  const callout = makeCallout(recordRow, recordRow ? recordRow.octSightings.toLocaleString() : "", 22);
  const callout2 = makeCallout(priorRow, priorRow ? `${priorRow.octSightings.toLocaleString()} at index ${priorRow.meanIndex.toFixed(2)}` : "", 18);

  // ---- note: the amplitude point, not the correlation coefficient --------------
  const note = svg.append("g").attr("opacity", 0);
  note.selectAll("text").data(noteLines).join("text")
    .attr("x", M.left).attr("y", (d, i) => H - noteH + noteLineH + i * noteLineH)
    .attr("font-family", T.serif).attr("font-style", "italic").attr("font-size", noteFontSize)
    .attr("fill", T.ink2)
    .text(d => d);

  function play() {
    tile.interrupt().transition().delay((_, i) => i * 40).duration(1)
      .attr("opacity", 1);
    bars.interrupt().transition().delay((_, i) => i * 40 + 120).duration(420).ease(d3.easeCubicOut)
      .attr("y", d => baseline - y(d.octSightings))
      .attr("height", d => Math.max(0, y(d.octSightings)));
    callout.interrupt().transition().delay(rows.length * 40 + 300).duration(300).attr("opacity", 1);
    callout2.interrupt().transition().delay(rows.length * 40 + 300).duration(300).attr("opacity", 1);
    note.interrupt().transition().delay(rows.length * 40 + 400).duration(300).attr("opacity", 1);
  }

  function setProgress(t) {
    tile.interrupt().attr("opacity", (d, i) => (revealFraction(t, i, rows.length) > 0 ? 1 : 0));
    bars.interrupt()
      .attr("y", (d, i) => baseline - revealFraction(t, i, barRows.length) * y(d.octSightings))
      .attr("height", (d, i) => Math.max(0, revealFraction(t, i, barRows.length) * y(d.octSightings)));
    callout.interrupt().attr("opacity", t >= 0.92 ? 1 : 0);
    callout2.interrupt().attr("opacity", t >= 0.92 ? 1 : 0);
    note.interrupt().attr("opacity", t >= 0.92 ? 1 : 0);
  }

  function stop() {
    tile.interrupt(); bars.interrupt(); callout.interrupt(); callout2.interrupt(); note.interrupt();
  }

  return { play, setProgress, stop };
}
