'use strict';
// Run against the local visual preview: node watercycle_visual_system_qa.cjs --serve.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const out = path.join(process.cwd(), 'reports/watercycle-learning-polish');
const preview = process.env.WATER_VISUAL_URL || 'http://127.0.0.1:8770/';
const forcedOnly = process.argv.includes('--forced-only');
const report = { capturedAt: new Date().toISOString(), checks: [], audits: [], errors: [], failures: [] };
const check = (pass, label, detail) => {
  report.checks.push({ label, pass: !!pass, ...(detail ? { detail } : {}) });
  if (!pass) report.failures.push(label);
};
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.setDefaultTimeout(90000);
    page.on('pageerror', error => report.errors.push(String(error)));
    for (const theme of forcedOnly ? [] : ['light', 'dark', 'contrast']) {
      for (const width of [1280, 320]) {
        const id = theme + '-' + width;
        await page.setViewportSize({ width, height: 960 });
        await page.goto(preview + '?theme=' + theme, { waitUntil: 'domcontentloaded' });
        await page.locator('#wc-climate-temperature').waitFor();
        await page.addScriptTag({ url: new URL('desktop/web-app/node_modules/axe-core/axe.min.js', preview).href });
        const conditions = page.getByRole('region', { name: 'Change the conditions', exact: true });
        await conditions.scrollIntoViewIfNeeded();
        if (id === 'light-1280') await page.screenshot({ path: path.join(out, 'controls-desktop.png'), animations: 'disabled' });
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), id + ' controls fit the viewport');
        const temperature = page.locator('#wc-climate-temperature');
        const beforeTemp = Number(await temperature.inputValue());
        await temperature.focus();
        await page.keyboard.press('ArrowRight');
        check(Number(await temperature.inputValue()) === beforeTemp + 1, id + ' temperature responds to keyboard');
        check(await page.locator('.wc-climate-control.is-temperature output').innerText() === (beforeTemp + 1) + '°C', id + ' temperature readout matches control');
        await page.locator('.wc-compare-trigger').click();
        if (!await page.locator('.wc-land-lab').evaluate(node => node.open)) {
          await page.locator('.wc-land-lab > summary').click();
        }
        const cover = page.locator('.wc-land-control').filter({ has: page.locator('legend', { hasText: 'Land cover' }) });
        const urban = cover.getByRole('button', { name: /Urban/ });
        await urban.focus();
        await page.keyboard.press('Space');
        check(await urban.getAttribute('aria-pressed') === 'true', id + ' keyboard selects Urban cover');
        check(await cover.locator('button[aria-pressed=true]').count() === 1, id + ' one ground-cover choice is selected');
        const choices = page.locator('.wc-prediction-option');
        check(await choices.count() === 5, id + ' prediction offers five choices');
        const sizes = await choices.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
        check(sizes.every(height => height >= 44), id + ' prediction choices have 44px targets', sizes);
        await choices.first().focus();
        await page.keyboard.press('Enter');
        await page.locator('.wc-compare-bars').waitFor();
        const lanes = await page.locator('.wc-compare-bar-track').evaluateAll(nodes => nodes.map(node => {
          const base = node.querySelector('.wc-compare-bar-base').getBoundingClientRect();
          const current = node.querySelector('.wc-compare-bar-current').getBoundingClientRect();
          return base.bottom <= current.top && base.height > 0 && current.height > 0;
        }));
        check(lanes.length === 3 && lanes.every(Boolean), id + ' baseline and current bars are separately visible');
        await page.getByRole('button', { name: 'Save current observation to experiment trail', exact: true }).click();
        check(await page.locator('.wc-log-entry').count() === 1, id + ' saves the observation');
        const saved = await page.evaluate(() => JSON.stringify(window.waterReviewData.wcExperimentLog));
        await page.locator('.wc-section-tabs').getByRole('button', { name: /^What the data shows\./ }).click();
        await page.locator('.wc-section-tabs').getByRole('button', { name: /^Change the conditions\./ }).click();
        check(await page.evaluate(() => JSON.stringify(window.waterReviewData.wcExperimentLog)) === saved, id + ' section switching preserves saved evidence');
        if (!await page.locator('.wc-land-lab').evaluate(node => node.open)) {
          await page.locator('.wc-land-lab > summary').click();
        }
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), id + ' evidence fits the viewport');
        const violations = await page.evaluate(async () => {
          const result = await axe.run({ include: [['.wc-climate-lab'], ['.wc-land-lab'], ['.wc-prediction-strip'], ['.wc-compare-strip'], ['.wc-experiment-log']] }, { rules: { region: { enabled: false } } });
          return result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) }));
        });
        report.audits.push({ id, violations });
        if (violations.length) report.failures.push(id + ' accessibility violations');
        if (id === 'light-1280' || id === 'dark-320') {
          await page.locator('.wc-compare-strip').scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(out, 'evidence-' + id + '.png'), animations: 'disabled' });
        }
      }
    }
    if (forcedOnly) {
      await page.setViewportSize({ width: 320, height: 960 });
      await page.goto(preview + '?theme=contrast', { waitUntil: 'domcontentloaded' });
      await page.locator('#wc-climate-temperature').waitFor();
      await page.locator('.wc-compare-trigger').click();
      if (!await page.locator('.wc-land-lab').evaluate(node => node.open)) {
        await page.locator('.wc-land-lab > summary').click();
      }
    }
    await page.emulateMedia({ forcedColors: 'active' });
    if (!await page.locator('.wc-land-lab').evaluate(node => node.open)) {
      await page.locator('.wc-land-lab > summary').click();
    }
    await page.locator('.wc-land-segments button[aria-pressed=true]').first().focus();
    // Native Tab navigation makes this a keyboard focus check even after a pointer click.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    const selected = await page.locator('.wc-land-segments button[aria-pressed=true]').first().evaluate(node => {
      const s = getComputedStyle(node);
      return { foreground: s.color, background: s.backgroundColor, focus: node.matches(':focus-visible'), outline: s.outlineStyle, width: s.outlineWidth };
    });
    check(selected.foreground !== selected.background, 'forced-colors ground selection has distinct text and background', selected);
    check(selected.focus && selected.outline !== 'none' && parseFloat(selected.width) >= 2, 'forced-colors ground selection has visible keyboard focus');
    await page.locator('.wc-land-lab').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, 'controls-forced-colors-320.png'), animations: 'disabled' });
    await page.close();
  } catch (error) {
    report.failures.push(error.stack || String(error));
  } finally {
    fs.writeFileSync(path.join(out, forcedOnly ? 'forced-followup.json' : 'results.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({ checks: report.checks.length, audits: report.audits.length, failures: report.failures, errors: report.errors }, null, 2));
  assert.deepEqual(report.failures, []);
  assert.deepEqual(report.errors, []);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
