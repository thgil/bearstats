#!/usr/bin/env node
// Headless frame-by-frame renderer for the five bearstats X videos.
//
// Usage: node render-video.mjs [scene ...]     (default: all five scenes)
//
// For each scene this serves webapp/ over plain HTTP, opens
// render.html?scene=...&frame=0 in Chrome via playwright-core (channel:
// "chrome" — the point is to use the user's installed Google Chrome, never
// to download a Chromium build), then reuses that one page for every frame
// by calling the page-side window.__renderFrame(n) exposed by render.js.
// One navigation per scene instead of one per frame is the only reason a
// 15s/450-frame video renders in a reasonable time.
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WEBAPP_DIR = path.join(ROOT, "webapp");
const MEDIA_DIR = path.join(ROOT, "media");
const FRAMES_DIR = path.join(MEDIA_DIR, "frames");
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const FFPROBE = "/opt/homebrew/bin/ffprobe";

const FPS = 30;
const DURATIONS = { record: 8, heat: 10, mast: 10, forecast: 8, replay: 15 };
const ALL_SCENES = ["record", "heat", "mast", "forecast", "replay"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function startServer(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split("?")[0]);
      const rel = urlPath === "/" ? "/render.html" : urlPath;
      const filePath = path.normalize(path.join(root, rel));
      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

/** Poll for the frame the page just drew, or surface whatever error it hit
 * instead of timing out silently. */
async function waitReady(page, scene, frame) {
  try {
    await page.waitForFunction(
      () => window.__frameReady === true || Boolean(window.__frameError),
      { timeout: 20000 }
    );
  } catch (err) {
    throw new Error(`[${scene}] frame ${frame} never became ready (timed out): ${err.message}`);
  }
  const frameError = await page.evaluate(() => window.__frameError || null);
  if (frameError) {
    throw new Error(`[${scene}] frame ${frame} reported an error:\n${frameError}`);
  }
}

async function renderScene(browser, baseUrl, scene) {
  const dur = DURATIONS[scene];
  const total = Math.round(FPS * dur);
  const outDir = path.join(FRAMES_DIR, scene);
  await fsp.rm(outDir, { recursive: true, force: true });
  await fsp.mkdir(outDir, { recursive: true });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error(`[${scene}] console error: ${msg.text()}`);
  });

  const url = `${baseUrl}/render.html?scene=${scene}&frame=0&fps=${FPS}&dur=${dur}`;
  await page.goto(url, { waitUntil: "load" });
  await waitReady(page, scene, 0);
  await page.screenshot({ path: path.join(outDir, "00000.png") });

  for (let frame = 1; frame < total; frame++) {
    // window.__renderFrame is async and resolves only once __frameReady (or
    // __frameError) is set, so awaiting it here already blocks until the
    // frame is drawn; waitReady below is a cheap belt-and-suspenders check.
    await page.evaluate((n) => window.__renderFrame(n), frame);
    await waitReady(page, scene, frame);
    await page.screenshot({ path: path.join(outDir, `${String(frame).padStart(5, "0")}.png`) });
  }

  await page.close();

  const written = (await fsp.readdir(outDir)).filter(f => f.endsWith(".png")).length;
  if (written !== total) {
    throw new Error(`[${scene}] expected ${total} frames, found ${written} in ${outDir}`);
  }
  console.log(`[${scene}] rendered ${total} frames (${FPS}fps x ${dur}s) -> ${outDir}`);
  return { total, outDir };
}

async function encode(scene) {
  const outDir = path.join(FRAMES_DIR, scene);
  const outFile = path.join(MEDIA_DIR, `${scene}.mp4`);
  await execFileP(FFMPEG, [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(outDir, "%05d.png"),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "18",
    "-preset", "slow",
    "-movflags", "+faststart",
    outFile,
  ]);
  return outFile;
}

/** Decoded frame count (via -count_frames), plus container duration/size, so
 * the report reflects what actually got muxed rather than trusting the
 * screenshot loop alone. */
async function probe(file) {
  const { stdout: fmtOut } = await execFileP(FFPROBE, [
    "-v", "error",
    "-show_entries", "format=duration,size",
    "-of", "default=noprint_wrappers=1",
    file,
  ]);
  const { stdout: frameOut } = await execFileP(FFPROBE, [
    "-v", "error",
    "-count_frames",
    "-select_streams", "v:0",
    "-show_entries", "stream=nb_read_frames",
    "-of", "default=nokey=1:noprint_wrappers=1",
    file,
  ]);
  const fmt = Object.fromEntries(
    fmtOut.trim().split("\n").map(line => line.split("="))
  );
  return {
    durationSec: Number(fmt.duration),
    sizeBytes: Number(fmt.size),
    frames: Number(frameOut.trim()),
  };
}

async function main() {
  const requested = process.argv.slice(2);
  const scenes = requested.length ? requested : ALL_SCENES;
  for (const s of scenes) {
    if (!ALL_SCENES.includes(s)) {
      throw new Error(`unknown scene "${s}"; expected one of ${ALL_SCENES.join(", ")}`);
    }
  }

  await fsp.mkdir(MEDIA_DIR, { recursive: true });
  const server = await startServer(WEBAPP_DIR);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch (err) {
    server.close();
    console.error(
      "Failed to launch Google Chrome via playwright-core's channel:\"chrome\".\n" +
      "This tool deliberately does not fall back to downloading Chromium — " +
      "install Google Chrome, or fix whatever is blocking the channel, and retry."
    );
    throw err;
  }

  try {
    for (const scene of scenes) {
      await renderScene(browser, baseUrl, scene);
      const outFile = await encode(scene);
      const info = await probe(outFile);
      const expectedFrames = Math.round(FPS * DURATIONS[scene]);
      const sizeMb = (info.sizeBytes / (1024 * 1024)).toFixed(2);
      const frameNote = info.frames === expectedFrames ? "OK" : `MISMATCH (expected ${expectedFrames})`;
      console.log(
        `[${scene}] ${outFile}\n` +
        `  duration=${info.durationSec.toFixed(2)}s size=${sizeMb}MB frames=${info.frames} (${frameNote})`
      );
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
