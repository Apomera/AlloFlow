const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createFixtureServer, repo } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
async function main() {
  const source = fs.readFileSync(path.join(repo, 'stem_lab/stem_tool_atctower.js'));
  fs.writeFileSync(path.join(__dirname, 'baseline-source.js.txt'), source);
  fs.copyFileSync(path.join(repo, 'reports/atc-arrival-board-2026-10-04/verify.cjs'), path.join(__dirname, 'verify.cjs'));
  const result = { capturedAt: new Date().toISOString(), sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), screenshots: [] };
  const fixture = await createFixtureServer(), browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1440, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      await page.goto(fixture.url); await page.locator('#stem-atctower-tab-lessons').click();
      for (const name of ['index', 'sequencing']) {
        if (name !== 'index') await page.locator('[data-atctower-lesson="sequencing"]').click();
        const file = path.join(__dirname, 'before-' + name + '-' + width + '.png');
        await page.screenshot({ path: file, fullPage: true }); result.screenshots.push(file);
      }
      await page.close();
    }
  } finally { await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
  fs.writeFileSync(path.join(__dirname, 'baseline.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
