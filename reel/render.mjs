import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";

/**
 * Render the film to an image sequence.
 *
 *   node render.mjs            final  -- 1080x1920, 30fps, PNG   (~4 min)
 *   node render.mjs --draft    draft  --  360x 640, 12fps, JPEG  (~20 s)
 *
 * Both walk the SAME seek() timeline, so a draft is the real choreography at
 * a ninth of the pixels and a third of the frames. Review the cut on a draft;
 * spend the four minutes only once the creative is settled.
 *
 * Why the final is slower: each frame is a 2.07-megapixel lossless PNG
 * composited and written to disk, against 230k pixels of JPEG for a draft.
 * Roughly 570 ms a frame against 70 ms, over 420 frames instead of 168.
 */
const DRAFT = process.argv.includes("--draft");
const HERE = new URL(".", import.meta.url).pathname;
const FPS = DRAFT ? 12 : 30;
const DUR = 14;
const N = FPS * DUR;
const SCALE = DRAFT ? 1 / 3 : 1;
const DIR = HERE + (DRAFT ? "draft" : "frames");
const W = Math.round(1080 * SCALE), H = Math.round(1920 * SCALE);

rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });

const t0 = Date.now();
const b = await chromium.launch({
  executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--force-device-scale-factor=1", "--font-render-hinting=none"],
});
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("file://" + HERE + "reel.html");
await p.waitForLoadState("networkidle");
await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => Promise.all([...document.images].map((i) =>
  i.complete ? 1 : new Promise((r) => { i.onload = r; i.onerror = r; }))));
if (SCALE !== 1) {
  // shrink the fixed 1080x1920 stage into the small viewport
  await p.evaluate((s) => {
    const st = document.getElementById("stage");
    st.style.transformOrigin = "top left";
    st.style.transform = `scale(${s})`;
    document.body.style.margin = "0";
    document.documentElement.style.overflow = "hidden";
  }, SCALE);
}
await p.waitForTimeout(DRAFT ? 600 : 1200);

const shot = DRAFT
  ? (f) => p.screenshot({ path: `${DIR}/d${String(f).padStart(4, "0")}.jpg`,
                          type: "jpeg", quality: 72 })
  : (f) => p.locator("#stage").screenshot({ path: `${DIR}/f${String(f).padStart(4, "0")}.png` });

for (let f = 0; f < N; f++) {
  await p.evaluate((t) => window.seek(t), f / FPS);
  await shot(f);
  if (!DRAFT && f % 60 === 0) console.log("  frame", f, "/", N);
}
console.log(`${DRAFT ? "draft" : "final"}: ${N} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
            errs.length ? `| errors: ${errs}` : "");
await b.close();
