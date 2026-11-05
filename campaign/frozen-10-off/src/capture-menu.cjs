// Captures the REAL frozen menu page of the site, at a phone's width, for slide 2.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await p.goto('http://localhost:3000/menu/frozen-ready-to-cook', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: 'nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important }' });
  await p.waitForTimeout(500);
  await p.screenshot({ path: __dirname + '/menu-phone.png', fullPage: true });
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  console.log('captured, page height', h);
  await b.close();
})();
