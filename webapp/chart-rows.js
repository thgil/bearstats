// Same-months comparison as horizontal bar rows.
//
// Used for the metrics that have no monthly series for the running year — the
// ministry publishes FY2026 injuries and deaths as one to-date total — so the
// only honest figure is each year cut to that same window.

/** Rows for one metric's year-to-date series, newest year last. */
export function ytdRows(timeline, metric, limit = 6) {
  const s = (timeline.ytd || {})[metric];
  if (!s || !s.years.length) return null;
  const start = Math.max(0, s.years.length - limit);
  const years = s.years.slice(start);
  const values = s.values.slice(start);
  const max = Math.max(...values);
  const currentYear = years[years.length - 1];
  return {
    label: s.label,
    rows: years.map((year, i) => ({
      year,
      value: values[i],
      pct: max > 0 ? (values[i] / max) * 100 : 0,
      current: year === currentYear,
    })),
  };
}

const TITLES = {
  injuries: "People injured",
  deaths: "People killed",
};

export function mountRows(container, timeline, metric) {
  const data = ytdRows(timeline, metric);
  if (!data) return;

  const current = data.rows[data.rows.length - 1];
  const prior = data.rows[data.rows.length - 2];

  const rowsHtml = data.rows.map(r => `
    <div class="cmp-row${r.current ? " is-current" : ""}">
      <span class="cmp-year">FY${r.year}</span>
      <span class="cmp-track"><span class="cmp-bar" style="width:${r.pct.toFixed(1)}%"></span></span>
      <span class="cmp-value">${r.value.toLocaleString()}</span>
    </div>`).join("");

  container.innerHTML = `
    <div class="cmp-head">
      <h3>${TITLES[metric] || metric}</h3>
      <p>${data.label} of each fiscal year</p>
    </div>
    <div class="cmp-rows">${rowsHtml}</div>
    <p class="cmp-read">${readout(current, prior, fullYearTotals(timeline, metric))}</p>
  `;
}

/** Closed fiscal years and their full-year totals for a metric. */
export function fullYearTotals(timeline, metric) {
  const years = timeline.years_injuries || [];
  const values = (timeline.metrics || {})[metric] || [];
  const partial = new Set(timeline.partial_years || []);
  return years
    .map((year, i) => ({ year, value: values[i] }))
    .filter(d => !partial.has(d.year) && Number.isFinite(d.value));
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * The closed year whose WHOLE total the running year has already reached.
 *
 * Worth saying on small counts because it needs no extrapolation — it is a fact
 * about what has happened, not a forecast. But only when the year matched is a
 * meaningful one: matching the weakest year in the series is arithmetic, not
 * news, and reads as cherry-picking. So a match at or below the median of
 * closed years is suppressed.
 */
export function matchedFullYear(total, closedYears) {
  const reached = closedYears.filter(d => d.value <= total && d.value > 0);
  if (!reached.length) return null;
  const best = Math.max(...reached.map(d => d.value));
  if (best < median(closedYears.map(d => d.value))) return null;
  const years = reached.filter(d => d.value === best).map(d => d.year);
  return { year: Math.max(...years), value: best, exact: best === total };
}

/**
 * Say what the bars show without inflating it.
 *
 * These are small counts — a gap of one or two between years is noise, and
 * "running ahead of the record year" claims more than six-versus-four carries.
 */
function readout(current, prior, closedYears) {
  if (!prior) return "";
  const diff = current.value - prior.value;

  const gap = Math.abs(diff) <= 2
    ? `${diff === 0 ? "Level with" : diff > 0 ? `${diff} above` : `${Math.abs(diff)} below`} FY${prior.year} at the same point — a gap this small tells us little on its own.`
    : `${Math.abs(diff)} ${diff > 0 ? "above" : "below"} FY${prior.year} at the same point.`;

  const matched = matchedFullYear(current.value, closedYears);
  if (matched && matched.exact) {
    return `${gap} But ${current.value} part-way through FY${current.year} already equals FY${matched.year}&rsquo;s entire year.`;
  }
  return gap;
}
