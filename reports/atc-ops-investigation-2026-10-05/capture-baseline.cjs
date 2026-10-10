const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtureServer, repo } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
async function main() {
  const sourcePath = path.join(repo, 'stem_lab/stem_tool_atctower.js');
  const source = fs.readFileSync(sourcePath);
  const hash = value => crypto.createHash('sha256').update(value).digest('hex');
  fs.writeFileSync(path.join(__dirname, 'baseline-source.js.txt'), source, { flag: 'wx' });
  fs.copyFileSync(path.join(repo, 'reports/atc-lesson-workbench-2026-10-05/verify.cjs'), path.join(__dirname, 'verify.cjs'));
  const result = { capturedAt: new Date().toISOString(), sourceSha256: hash(source), screenshots: [] };
  const fixture = await createFixtureServer(), browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1440, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      await page.goto(fixture.url); await page.locator('#stem-atctower-tab-ops').click();
      for (const state of ['initial', 'comparison']) {
        if (state === 'comparison') {
          await page.getByRole('button', { name: 'Log current ATC setup as evidence', exact: true }).click();
          const slider = page.getByRole('slider', { name: 'Wind speed', exact: true });
          await slider.focus(); for (let i = 0; i < 10; i++) await slider.press('ArrowRight');
          await page.getByRole('button', { name: 'Log current ATC setup as evidence', exact: true }).click();
        }
        const file = path.join(__dirname, 'before-' + state + '-' + width + '.png');
        await page.screenshot({ path: file, fullPage: true }); result.screenshots.push(file);
      }
      await page.close();
    }
  } finally { await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
  assert.equal(hash(fs.readFileSync(sourcePath)), result.sourceSha256);
  fs.writeFileSync(path.join(__dirname, 'baseline.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
