const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createFixtureServer } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
(async () => {
  const fixture = await createFixtureServer(), browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 1100 }, forcedColors: 'active', reducedMotion: 'reduce' });
    await page.goto(fixture.url); await page.locator('#stem-atctower-tab-practice').click();
    await page.locator('[data-atctower-practice-start="crossing_priority"]').click();
    await page.locator('[data-atctower-playing]').waitFor();
    await page.waitForTimeout(200); await page.screenshot({ path: path.join(__dirname, 'forced-colors-inspection.png'), fullPage: true });
    await page.addScriptTag({ url: new URL('axe.js', fixture.url).href });
    const output = await page.evaluate(async () => {
      const selectors = ['.atc-model-notes > summary', '.atc-objective-meter > span', '.atc-radar-legend > span:nth-child(1)', '.atc-radar-legend > span:nth-child(2)', '.atc-radar-legend > span:nth-child(3)', 'select'];
      const colors = selectors.map(selector => { const element = document.querySelector(selector), style = getComputedStyle(element); return { selector, text: element.innerText, color: style.color, background: style.backgroundColor, forcedColorAdjust: style.forcedColorAdjust, ancestors: [element.parentElement, element.parentElement.parentElement].map(node => ({ tag: node.tagName, classes: node.className, background: getComputedStyle(node).backgroundColor, color: getComputedStyle(node).color })) }; });
      return { colors, violations: (await axe.run(document.querySelector('main'))).violations };
    });
    fs.writeFileSync(path.join(__dirname, 'forced-colors-inspection.json'), JSON.stringify(output, null, 2) + '\n');
    console.log(JSON.stringify(output.colors, null, 2));
    console.log(JSON.stringify(output.violations.map(item => ({ id: item.id, impact: item.impact, details: item.nodes.map(node => ({ target: node.target, failureSummary: node.failureSummary })) })), null, 2));
  } finally { await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
