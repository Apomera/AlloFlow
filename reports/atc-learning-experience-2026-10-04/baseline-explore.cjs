const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createFixtureServer } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');

async function main() {
  const fixture = await createFixtureServer();
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const output = { started: new Date().toISOString(), devices: [], errors: [] };
  try {
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      page.on('pageerror', err => output.errors.push(err.message));
      await page.goto(fixture.url);
      const item = { width, states: [] };
      async function capture(state) {
        await page.screenshot({ path: path.join(__dirname, 'before-' + state + '-' + width + '.png'), fullPage: true });
        item.states.push(await page.evaluate(state => ({ state, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, headings: [...document.querySelectorAll('h2,h3,h4')].map(el => ({ text: el.textContent, top: Math.round(el.getBoundingClientRect().top + scrollY) })), controls: [...document.querySelectorAll('main button,main textarea,main select,main [role=tab]')].map(el => ({ text: el.textContent || el.id, name: el.getAttribute('aria-label'), top: Math.round(el.getBoundingClientRect().top + scrollY), height: Math.round(el.getBoundingClientRect().height), width: Math.round(el.getBoundingClientRect().width) })) }), state));
      }
      await capture('menu');
      await page.locator('#stem-atctower-tab-practice').click();
      await capture('practice');
      await page.locator('[data-atctower-practice-start="first_landing"]').click();
      await page.locator('[data-atctower-playing]').waitFor();
      await page.locator('[data-atctower-command="r"]').click();
      await page.locator('[data-atctower-command="c"]').click();
      await page.getByRole('button', { name: 'End shift', exact: true }).click();
      await page.locator('[data-atctower-debrief]').waitFor();
      await capture('debrief');
      await page.locator('#atc-shift-reflection').fill('Assign the runway earlier next time.');
      await page.getByRole('button', { name: 'Practice pathway', exact: true }).click();
      await page.locator('[data-atctower-pathway]').waitFor();
      await capture('return-pathway');
      output.devices.push(item);
      await page.close();
      console.log('Baseline captured ' + width);
    }
  } finally { await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
  output.completed = new Date().toISOString();
  fs.writeFileSync(path.join(__dirname, 'baseline-metrics.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify({ devices: output.devices.length, errors: output.errors }));
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
