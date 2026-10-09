/* Capture the real pages this reel needs, from the app running locally, at a
   phone's own width so the film shows the site the way a customer meets it.
   Everything the film shows of the website comes from here. */
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://127.0.0.1:3100";
const DIR = "/home/user/Thediine/reel4/shots";
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--hide-scrollbars", "--force-color-profile=srgb"],
});
const p = await b.newPage({ viewport: { width: 430, height: 932 },
                            deviceScaleFactor: 3, isMobile: true,
                            hasTouch: true, timezoneId: "Africa/Cairo" });
const settle = async () => {
  await p.waitForLoadState("networkidle").catch(() => {});
  await p.evaluate(async () => { await document.fonts.ready; });
  await p.waitForTimeout(500);
};
const shot = async (name) => {
  await p.screenshot({ path: `${DIR}/${name}.png` });
  console.log("shot", name);
};
const tall = async (name) => {              /* the whole page, for scrolling */
  await p.screenshot({ path: `${DIR}/${name}.png`, fullPage: true });
  console.log("tall", name);
};

await p.goto(`${BASE}/menu/desserts`); await settle();
await shot("desserts"); await tall("desserts-full");

await p.goto(`${BASE}/product/tiramisu`); await settle();
await shot("tiramisu"); await tall("tiramisu-full");

/* the dish's own heading block, at full resolution, so it can be blown up */
const head = p.locator("h1").first();
if (await head.count()) {
  await head.locator("xpath=ancestor::*[self::div or self::section][1]")
    .screenshot({ path: `${DIR}/tiramisu-head.png` }).catch(() => {});
}

const btn = p.getByRole("button", { name: /add to cart|add to your event/i }).first();
if (await btn.count()) {
  await btn.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await shot("tiramisu-button");
  const box = await btn.boundingBox();
  console.log("button box", JSON.stringify(box));
  await btn.click(); await p.waitForTimeout(800);
  await shot("tiramisu-added");
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  await shot("tiramisu-added-top");
} else { console.log("NO ADD BUTTON FOUND"); }

await p.goto(`${BASE}/cart`); await settle(); await shot("cart");
await p.goto(`${BASE}/`); await settle(); await shot("home"); await tall("home-full");
await p.goto(`${BASE}/menu`); await settle(); await shot("menu");
await p.goto(`${BASE}/our-work`); await settle(); await tall("our-work-full");
await b.close();
