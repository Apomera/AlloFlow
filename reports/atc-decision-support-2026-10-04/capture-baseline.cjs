const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createFixtureServer } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');

(async () => {
  const fixture = await createFixtureServer();
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const data = { pages: [], errors: [] };
  try {
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      page.on('pageerror', e => data.errors.push(e.message));
      await page.goto(fixture.url);
      await page.locator('#stem-atctower-tab-practice').click();
      await page.locator('[data-atctower-practice-start="first_landing"]').click();
      await page.locator('[data-atctower-playing]').waitFor();
      await page.locator('[data-atctower-aircraft="101"]').click();
      await page.screenshot({ path: path.join(__dirname, 'before-playing-' + width + '.png'), fullPage: true });
      const controls = page.locator('#atc-aircraft-controls-title').locator('..');
      await controls.screenshot({ path: path.join(__dirname, 'before-controls-' + width + '.png') });
      data.pages.push(await page.evaluate(width => {
        const el = document.querySelector('#atc-aircraft-controls-title').closest('section');
        const rect = el.getBoundingClientRect(), radar = document.querySelector('canvas').getBoundingClientRect();
        return { width, scrollWidth: document.documentElement.scrollWidth, totalHeight: document.documentElement.scrollHeight, controlTop: rect.top + scrollY, controlHeight: rect.height, radarTop: radar.top + scrollY, radarHeight: radar.height, selectedText: el.innerText, buttons: [...el.querySelectorAll('button')].map(b => ({ text: b.innerText, width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height })) };
      }, width));
      await page.locator('[data-atctower-command="h"]').click();
      await page.locator('[data-atctower-command-entry="heading"]').waitFor();
      await controls.screenshot({ path: path.join(__dirname, 'before-heading-' + width + '.png') });
      data.pages[data.pages.length - 1].entry = await controls.innerText();
      data.pages[data.pages.length - 1].focus = await page.evaluate(() => document.activeElement.id);
      await page.close();
    }
  } finally { await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
  fs.writeFileSync(path.join(__dirname, 'baseline-metrics.json'), JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
})();
