const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createFixtureServer } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
(async () => {
  const fixture = await createFixtureServer(), browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    await page.goto(fixture.url); await page.locator('[data-atctower-quick-practice="first_landing"]').click();
    await page.locator('[data-atctower-playing]').waitFor();
    await page.getByRole('button', { name: 'Assign runway', exact: true }).click();
    await page.getByRole('button', { name: 'Clear approach', exact: true }).click();
    await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
    await page.waitForFunction(() => window.__atcGameRef.current.practice.completed === true, null, { timeout: 40000 });
    await page.locator('[data-atctower-save-debrief]').click(); await page.locator('[data-atctower-debrief]').waitFor();
    const data = await page.evaluate(() => JSON.parse(JSON.stringify(window.__atcToolData.atcTower)));
    fs.writeFileSync(path.join(__dirname, 'learning-inspection.json'), JSON.stringify(data, null, 2) + '\n');
    console.log(JSON.stringify({ practice: data.lastShift.practice, exerciseResult: data.lastShift.exerciseResult, practiceLearning: data.practiceLearning, shiftHistory: data.shiftHistory, next: await page.locator('[data-atctower-next-practice]').getAttribute('data-atctower-next-practice') }, null, 2));
  } finally { await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
