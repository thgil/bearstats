#!/usr/bin/env node
// Multi-viewport review screenshots for the bearstats scrolly page, with
// automated layout/contrast/overlap checks baked in so a human doesn't have
// to eyeball every frame for the boring failure modes.
//
// Usage: node review-shots.mjs [--port 8020] [--viewports 390x844,1280x800]
//                               [--only <substring>]
//
// Like render-video.mjs, this serves webapp/ over plain HTTP and drives
// Google Chrome via playwright-core's channel:"chrome" — never downloads a
// Chromium build. Unlike render-video.mjs it scrolls a real page instead of
// stepping a render clock, because what we're checking here is exactly the
// thing render.html bypasses: does scrollama's real trigger line land the
// right card, at the right size, without anything overlapping.
//
// The site is being rebuilt concurrently, so nothing here hardcodes a step
// id, chapter count, or inner class name. `.step[data-step]` is discovered
// from the live DOM in document order; chapters are `.chapter` elements
// found the same way; "chapter 4's inline charts" (design doc §8) are found
// structurally, as any svg/canvas inside a `.chapter` but outside a
// `.graphic` panel, so a renamed container class can't break the search.
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WEBAPP_DIR = path.join(ROOT, "webapp");
const REVIEW_DIR = path.join(ROOT, "media", "review");

const DEFAULT_VIEWPORTS = [
  [360, 660], [390, 844], [430, 932], [820, 1180], [1280, 800], [1920, 1080],
];
// Phones get deviceScaleFactor 2 (that's how these devices actually render,
// and it's where retina blur/rounding artefacts show up); everything at or
// above the same 800px breakpoint main.js uses for its own mobile layout
// gets 1.
const PHONE_MAX_WIDTH = 800;

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
};

function parseArgs(argv) {
  const opts = { port: 8020, viewports: DEFAULT_VIEWPORTS, only: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port") opts.port = Number(argv[++i]);
    else if (argv[i] === "--viewports") {
      opts.viewports = argv[++i].split(",").map(pair => pair.split("x").map(Number));
    } else if (argv[i] === "--only") opts.only = argv[++i];
  }
  return opts;
}

/** Start a static server on the exact requested port, or reuse whatever is
 * already listening there — handy when iterating: running this tool twice
 * in a row shouldn't fight over the port. We don't verify the existing
 * listener actually serves webapp/; if the port is taken by something else,
 * every navigation below just fails loudly instead. */
function startOrReuseServer(root, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split("?")[0]);
      const rel = urlPath === "/" ? "/index.html" : urlPath;
      const filePath = path.normalize(path.join(root, rel));
      if (!filePath.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end("not found"); return; }
        res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") { resolve({ server: null, reused: true }); return; }
      reject(err);
    });
    server.listen(port, "127.0.0.1", () => resolve({ server, reused: false }));
  });
}

const SAMPLE_SELECTORS = ["h1", "h2", ".answer", ".step.is-active p", ".step.is-active h3", ".g-caption", ".dateline", "nav a"];
const OVERLAP_EXTRA_SELECTORS = [".map-year", ".replay", ".legend", ".map-key"];

/** Scrolls the named step to main.js's own trigger line, then waits for
 * scrollama + any chart transition to settle. Runs in the page so it can
 * read the live innerWidth/innerHeight and the step's real position; the
 * offset formula is copied from main.js's stepOffset() by hand (there's no
 * good way to import app code into a page.evaluate callback, and it's four
 * lines) — keep the two in sync if that formula ever changes. */
function scrollStepToTrigger(stepId) {
  const target = document.querySelector(`.step[data-step="${CSS.escape(stepId)}"]`);
  if (!target) return false;
  const offset = window.innerWidth < 800
    ? Math.min(0.6, (0.46 * window.innerHeight + 52) / window.innerHeight)
    : 0.6;
  const rect = target.getBoundingClientRect();
  // Landing exactly on the trigger line is a no man's land: scrollama's
  // IntersectionObserver needs the step's top to actually cross the line,
  // and sitting precisely on it (measured) fires neither an enter nor an
  // exit. A couple of pixels past it lands solidly inside "entered" without
  // being a visibly different scroll position in the screenshot.
  window.scrollBy(0, rect.top - window.innerHeight * offset + 2);
  return true;
}

/** All the automated checks, run in-page as one evaluate() call so six
 * viewports x a dozen screenshots doesn't turn into sixty round trips.
 * Returns raw measurements; pass/fail thresholds are applied by the caller
 * so they stay easy to tune from one place (record() below). */
function pageChecks([sampleSelectors, extraOverlapSelectors, isPhone]) {
  // "Visible" means actually on screen: sized, not hidden by CSS, inside
  // the viewport rectangle (otherwise an element scrolled off the top or
  // bottom can still coincidentally share y-coordinates with something
  // that IS on screen, e.g. the hero's dateline and a sticky nav three
  // chapters later — a false "overlap" between things never seen together),
  // and not covered by the fixed/sticky chapter nav (content that scrolls
  // a few px under it is invisible there by design, not an overlap bug).
  let headerEl = null, headerBottom = 0;
  for (let n = document.querySelector("nav"); n && n !== document.body; n = n.parentElement) {
    const pos = getComputedStyle(n).position;
    if (pos === "fixed" || pos === "sticky") { headerEl = n; headerBottom = n.getBoundingClientRect().bottom; break; }
  }
  const visibleBox = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    if (r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= window.innerWidth) return null;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return null;
    const box = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    if (headerEl && !headerEl.contains(el) && box.top < headerBottom) {
      if (box.bottom <= headerBottom) return null;
      box.top = headerBottom;
    }
    return box;
  };
  // Walk up for the first ancestor with an actual (non-transparent)
  // background-color; a gradient/background-image ancestor is treated as
  // "no color here" and skipped, which is a known blind spot (see report).
  const backgroundOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== "transparent" && !/rgba?\([^)]*,\s*0\s*\)$/.test(c)) return c;
    }
    return "rgb(255, 255, 255)";
  };
  const toRgb = (str) => (str.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
  const relLuminance = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrastRatio = (c1, c2) => {
    const l1 = relLuminance(toRgb(c1)) + 0.05, l2 = relLuminance(toRgb(c2)) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
  };
  const overlaps = (a, b) => {
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return { hit: ox > 4 && oy > 4, ox, oy };
  };

  const hScrollOk = document.documentElement.scrollWidth <= window.innerWidth + 1;

  // Phone-only: the active step's visible card must not sit on top of the
  // (position: sticky) graphic panel pinned above it. `.step` itself is
  // usually a tall flex spacer (min-height, padding) with the actual
  // rendered card as its child — its own box can legitimately extend up
  // behind the panel even when nothing visible does. We don't know that
  // child's class name (it has already changed once during this rebuild),
  // so we use the union of the active step's direct-child boxes instead of
  // guessing a selector.
  let stepGraphicOverlap = null;
  const activeStep = document.querySelector(".step.is-active");
  if (isPhone && activeStep) {
    const chapter = activeStep.closest(".chapter");
    const graphic = chapter && chapter.querySelector(".graphic");
    const graphicBox = graphic && visibleBox(graphic);
    const childBoxes = Array.from(activeStep.children).map(visibleBox).filter(Boolean);
    const stepBox = childBoxes.length ? {
      left: Math.min(...childBoxes.map(b => b.left)), right: Math.max(...childBoxes.map(b => b.right)),
      top: Math.min(...childBoxes.map(b => b.top)), bottom: Math.max(...childBoxes.map(b => b.bottom)),
    } : visibleBox(activeStep);
    if (stepBox && graphicBox) {
      const o = overlaps(stepBox, graphicBox);
      stepGraphicOverlap = { ok: !o.hit, overlapW: o.ox, overlapH: o.oy };
    }
  }

  // Every currently-active graphic layer must be showing a real, sized mark
  // — never a bare axis with no bars/lines/points drawn yet.
  const gChecks = Array.from(document.querySelectorAll(".g.is-active")).map((g) => {
    const hasMark = Array.from(g.querySelectorAll("svg path, svg rect, canvas"))
      .some((m) => { const r = m.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const svg = g.querySelector("svg");
    let svgBoxOk = true;
    if (svg) { try { const bb = svg.getBBox(); svgBoxOk = bb.width > 0 && bb.height > 0; } catch { svgBoxOk = true; } }
    return { name: g.dataset.g || g.id || "(unnamed)", hasMark, svgBoxOk };
  });

  // Contrast + overlap share one sample: every visible element matching the
  // fixed selector list, plus the map chrome for overlap only.
  const contrastFailures = [];
  const overlapSample = [];
  sampleSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const box = visibleBox(el);
      if (!box || !el.textContent.trim()) return;
      overlapSample.push({ sel, el, box });
      const cs = getComputedStyle(el);
      const ratio = contrastRatio(cs.color, backgroundOf(el));
      const threshold = parseFloat(cs.fontSize) >= 24 ? 4.5 : 7;
      if (ratio < threshold) {
        contrastFailures.push({ sel, text: el.textContent.trim().slice(0, 40), ratio: Number(ratio.toFixed(2)), threshold });
      }
    });
  });
  extraOverlapSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const box = visibleBox(el);
      if (box) overlapSample.push({ sel, el, box });
    });
  });

  const overlapFailures = [];
  for (let i = 0; i < overlapSample.length; i++) {
    for (let j = i + 1; j < overlapSample.length; j++) {
      const a = overlapSample[i], b = overlapSample[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const o = overlaps(a.box, b.box);
      if (o.hit) {
        overlapFailures.push({
          a: a.sel, aText: a.el.textContent.trim().slice(0, 30),
          b: b.sel, bText: b.el.textContent.trim().slice(0, 30),
          overlapW: Math.round(o.ox), overlapH: Math.round(o.oy),
        });
      }
    }
  }

  return {
    hScrollOk, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
    stepGraphicOverlap, gChecks, contrastFailures, overlapFailures,
  };
}

function record(results, viewport, label, check, ok, details) {
  results.push({ viewport, label, check, status: ok ? "pass" : "fail", details: details ?? "" });
}

async function runChecksAndRecord(page, results, viewportLabel, label, isPhone) {
  const r = await page.evaluate(pageChecks, [SAMPLE_SELECTORS, OVERLAP_EXTRA_SELECTORS, isPhone]);
  record(results, viewportLabel, label, "no-horizontal-scroll", r.hScrollOk, `scrollWidth=${r.scrollWidth} innerWidth=${r.innerWidth}`);
  if (r.stepGraphicOverlap) {
    record(results, viewportLabel, label, "step-vs-graphic-overlap", r.stepGraphicOverlap.ok,
      `overlap ${Math.round(r.stepGraphicOverlap.overlapW)}x${Math.round(r.stepGraphicOverlap.overlapH)}px`);
  }
  r.gChecks.forEach((g) => {
    record(results, viewportLabel, label, `active-g[${g.name}]-has-mark`, g.hasMark, g.hasMark ? "" : "no sized svg path/rect/canvas");
    record(results, viewportLabel, label, `active-g[${g.name}]-svg-bbox`, g.svgBoxOk, g.svgBoxOk ? "" : "svg getBBox() is empty");
  });
  record(results, viewportLabel, label, "contrast", r.contrastFailures.length === 0,
    r.contrastFailures.map(f => `${f.sel} "${f.text}" ${f.ratio}:1 (need ${f.threshold}:1)`).join("; "));
  record(results, viewportLabel, label, "overlap", r.overlapFailures.length === 0,
    r.overlapFailures.map(f => `${f.a} x ${f.b} overlap ${f.overlapW}x${f.overlapH}px`).join("; "));
}

async function shootElement(page, selector, outDir, n, name, results, viewportLabel) {
  const el = await page.$(selector);
  if (!el) { record(results, viewportLabel, name, "element-found", false, `selector "${selector}" not found`); return; }
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: path.join(outDir, `${String(n).padStart(2, "0")}-${name}.png`) });
}

async function reviewViewport(browser, baseUrl, [w, h], opts) {
  const viewportLabel = `${w}x${h}`;
  const isPhone = w < PHONE_MAX_WIDTH;
  const outDir = path.join(REVIEW_DIR, viewportLabel);
  await fsp.rm(outDir, { recursive: true, force: true });
  await fsp.mkdir(outDir, { recursive: true });

  const results = [];
  const consoleErrors = [];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: isPhone ? 2 : 1 });
  // styles.css sets `html { scroll-behavior: smooth }`, so an un-emulated
  // window.scrollBy() animates over time instead of jumping — the next
  // measurement then lands mid-animation at an unpredictable offset. The
  // site already has a prefers-reduced-motion path that turns scrolling and
  // transitions instant; asking for it here makes every scroll and screenshot
  // land exactly where we computed it, which is what "wait for it to settle"
  // is supposed to guarantee anyway.
  await page.emulateMedia({ reducedMotion: "reduce" });
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await page.goto(baseUrl, { waitUntil: "load" });
  const booted = await page.waitForFunction(() => window.__bearstats__, { timeout: 5000 }).catch(() => null);
  if (!booted) console.warn(`[${viewportLabel}] window.__bearstats__ never appeared after 5s; continuing anyway`);

  const wanted = (name) => !opts.only || name.includes(opts.only);
  let n = 0;

  if (wanted("hero")) {
    await shootElement(page, "#hero", outDir, n++, "hero", results, viewportLabel);
    await runChecksAndRecord(page, results, viewportLabel, "hero", isPhone);
  }

  const stepIds = await page.$$eval(".step[data-step]", els => els.map(e => e.dataset.step));
  for (const stepId of stepIds) {
    if (!wanted(stepId)) continue;
    const found = await page.evaluate(scrollStepToTrigger, stepId);
    if (!found) continue;
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(outDir, `${String(n).padStart(2, "0")}-${stepId}.png`) });
    n++;
    await runChecksAndRecord(page, results, viewportLabel, stepId, isPhone);
  }

  if (wanted("chapter")) {
    const chapterIds = await page.$$eval(".chapter", els => els.map((e, i) => e.id || `chapter-${i + 1}`));
    for (const chId of chapterIds) {
      await shootElement(page, `#${chId} .chapter-head`, outDir, n, `${chId}-head`, results, viewportLabel);
      n++;
      await runChecksAndRecord(page, results, viewportLabel, `${chId}-head`, isPhone);
    }
    // Inline charts embedded directly in chapter prose, outside any sticky
    // .graphic panel — see the file header re: "chapter 4's inline charts".
    // Found structurally (an svg/canvas inside a .chapter but not inside a
    // .graphic) rather than by class name, since the container class for
    // these has already been renamed once mid-rebuild (.viz -> figures with
    // a .chart-canvas mount div). Matches get a throwaway marker attribute
    // so they can be screenshotted without needing a stable selector.
    const inlineNames = await page.evaluate(() => {
      const hosts = new Set();
      document.querySelectorAll(".chapter svg, .chapter canvas").forEach((mark) => {
        if (mark.closest(".graphic")) return;
        hosts.add(mark.closest("figure") || mark.closest("[id]") || mark.parentElement);
      });
      return Array.from(hosts).map((host, i) => {
        const name = host.id || `inline-${i + 1}`;
        host.setAttribute("data-review-inline", name);
        return name;
      });
    });
    for (const name of inlineNames) {
      await shootElement(page, `[data-review-inline="${name}"]`, outDir, n, `inline-${name}`, results, viewportLabel);
      n++;
      await runChecksAndRecord(page, results, viewportLabel, `inline-${name}`, isPhone);
    }
  }

  if (wanted("methods")) {
    await shootElement(page, "#methods", outDir, n, "methods", results, viewportLabel);
    n++;
    await runChecksAndRecord(page, results, viewportLabel, "methods", isPhone);
  }

  record(results, viewportLabel, "*", "console-errors", consoleErrors.length === 0, consoleErrors.join(" | "));

  await page.close();
  return results;
}

function printSummary(allResults) {
  const failures = allResults.filter(r => r.status === "fail");
  const rows = failures.length ? failures : allResults.slice(0, 10);
  console.log(`\n${failures.length ? "FAILURES" : "Sample of checks (all passed)"}:`);
  console.table(rows.map(({ viewport, label, check, status, details }) => ({ viewport, label, check, status, details: details.slice(0, 60) })));
  console.log(`\n${allResults.length} checks run, ${failures.length} failed, across ${new Set(allResults.map(r => r.viewport)).size} viewport(s).`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  await fsp.mkdir(REVIEW_DIR, { recursive: true });

  const { server, reused } = await startOrReuseServer(WEBAPP_DIR, opts.port);
  if (reused) console.log(`[review-shots] port ${opts.port} already in use — reusing whatever is serving there`);
  const baseUrl = `http://127.0.0.1:${opts.port}/index.html`;

  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch (err) {
    if (server) server.close();
    console.error(
      "Failed to launch Google Chrome via playwright-core's channel:\"chrome\".\n" +
      "This tool deliberately does not fall back to downloading Chromium — install Google Chrome and retry."
    );
    throw err;
  }

  const allResults = [];
  try {
    for (const vp of opts.viewports) {
      console.log(`[review-shots] ${vp[0]}x${vp[1]} ...`);
      allResults.push(...await reviewViewport(browser, baseUrl, vp, opts));
    }
  } finally {
    await browser.close();
    if (server) server.close();
  }

  await fsp.writeFile(path.join(REVIEW_DIR, "report.json"), JSON.stringify(allResults, null, 2));
  printSummary(allResults);

  process.exitCode = allResults.some(r => r.status === "fail") ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
