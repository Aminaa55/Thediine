import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
const R = "/tmp/claude-0/-home-user-Thediine/1e928a3b-e60f-5602-bf72-ea4d25f36e22/scratchpad/reel";
const FPS = 30, DUR = 14, N = FPS * DUR;
rmSync(R + "/frames", { recursive: true, force: true });
mkdirSync(R + "/frames", { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--force-device-scale-factor=1","--font-render-hinting=none"] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("file://" + R + "/reel.html");
await p.waitForLoadState("networkidle");
await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 1 :
  new Promise(r => { i.onload = r; i.onerror = r; }))));
await p.waitForTimeout(1200);
const stage = p.locator("#stage");
for (let f = 0; f < N; f++) {
  await p.evaluate((t) => window.seek(t), f / FPS);
  await stage.screenshot({ path: R + "/frames/f" + String(f).padStart(4, "0") + ".png" });
  if (f % 60 === 0) console.log("  frame", f, "/", N);
}
console.log("frames done:", N, "errors:", errs);
await b.close();
