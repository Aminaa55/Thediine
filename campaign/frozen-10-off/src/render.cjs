// Renders an HTML artboard to PNG at exact pixel size (1x) and at 2x.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [,, file, w, h, out] = process.argv;
  const b = await chromium.launch();
  for (const scale of [1, 2]) {
    const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: scale });
    await p.goto('file://' + path.resolve(file), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    const name = scale === 1 ? out : out.replace(/\.png$/, '@2x.png');
    await p.screenshot({ path: name, clip: { x: 0, y: 0, width: +w, height: +h } });
    console.log('wrote', name);
  }
  await b.close();
})();
