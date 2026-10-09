/* Draft 2 renderer. Default is the FAST PREVIEW: 360x640 at 12fps.
   --final switches to 1080x1920 at 30fps and is only run on request. */
import { chromium } from "playwright";
import { mkdirSync, rmSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";

const FINAL = process.argv.includes("--final");
const DIR   = path.resolve("/home/user/Thediine/reel4");
const OUT   = path.join(DIR, FINAL ? "frames-final" : "frames-draft");
const FPS   = FINAL ? 30 : 12;
const SCALE = FINAL ? 1 : 1 / 3;
const W = Math.round(1080 * SCALE), H = Math.round(1920 * SCALE);
const FF = "/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2";

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });

const t0 = Date.now();
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--force-color-profile=srgb", "--font-render-hinting=none",
         "--disable-lcd-text", "--hide-scrollbars"],
});
const page = await browser.newPage({ viewport: { width: W, height: H },
                                     deviceScaleFactor: 1 });
await page.goto("file://" + path.join(DIR, "reel4.html"));
await page.evaluate(async () => { await document.fonts.ready; });
await page.evaluate((s) => {
  const st = document.getElementById("stage");
  st.style.zoom = String(s);
  document.body.style.width = document.body.style.height = "0";
}, SCALE);
/* wait for every real photograph and screenshot to decode */
await page.evaluate(async () => {
  await Promise.all([...document.images].map(i =>
    i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
});

const DUR = await page.evaluate(() => window.DUR);
const N = Math.round(DUR * FPS);
for (let i = 0; i <= N; i++) {
  await page.evaluate((t) => window.seek(t), i / FPS);
  await page.screenshot({
    path: path.join(OUT, "f" + String(i).padStart(4, "0") + (FINAL ? ".png" : ".jpg")),
    type: FINAL ? "png" : "jpeg", ...(FINAL ? {} : { quality: 82 }),
  });
  if (i % 24 === 0) process.stdout.write(i + "/" + N + " ");
}
await browser.close();
console.log("\nframes in", ((Date.now() - t0) / 1000).toFixed(1) + "s");

const mp4 = path.join(DIR, FINAL ? "thediine-reel.mp4" : "thediine-reel-draft.mp4");
const r = spawnSync(FF, ["-y", "-framerate", String(FPS),
  "-i", path.join(OUT, "f%04d." + (FINAL ? "png" : "jpg")),
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", FINAL ? "slow" : "veryfast",
  "-crf", FINAL ? "17" : "22", "-movflags", "+faststart", mp4], { encoding: "utf8" });
console.log(r.status === 0 ? "wrote " + mp4 : r.stderr.slice(-1500));
