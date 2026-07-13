// Render the two-column sample HTML to a real PDF via Playwright/Chromium, so it can be fed to AlloFlow's
// PDF remediation pipeline to exercise the multi-column reading-order path. (2026-06-23)
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const htmlPath = path.resolve(__dirname, 'multi-column-sample.html');
  const outPath = process.argv[2] || path.resolve(__dirname, 'multi-column-sample.pdf');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.pdf({ path: outPath, format: 'Letter', printBackground: true });
  await browser.close();
  console.log('WROTE ' + outPath);
})().catch((e) => { console.error(e && e.message ? e.message : e); process.exit(1); });
