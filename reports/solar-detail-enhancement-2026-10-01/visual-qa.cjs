const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { chromium } = require('playwright');
const dir = __dirname;
const before = process.argv.includes('--before');
const bundle = path.join(dir, 'harness.cjs');
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');

(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1180, height: 1100, appStyles: true, layout: 'document' });
  await harness.start();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1180, height: 1100 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const results = [];
  try {
    const cases = before ? [[1180, true, 'mercury'], [320, false, 'mercury']] : [[1180, true, 'mercury'], [1180, false, 'mercury'], [736, true, 'saturn'], [320, false, 'mercury'], [320, true, 'halley']];
    for (const [width, dark, world] of cases) {
      await page.setViewportSize({ width, height: 1100 });
      await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((el, w) => { el.style.width = w + 'px'; }, width);
      await page.evaluate(d => window.__mount(d), { solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 0, orr_sel: world, orr_paused: true, orr_time: 0, orr_zoom: 'inner', isDark: dark } });
      await page.waitForFunction(() => document.querySelector('canvas[data-responsive-canvas="true"]')?.__canvasPanelState);
      const card = page.getByRole('button', { name: 'Clear selected world', exact: true }).locator('xpath=../..');
      const navigator = page.locator('.orr-body-navigator');
      const scrollTo = async locator => {
        await locator.evaluate(el => el.scrollIntoView({ block: 'start' }));
        await page.waitForTimeout(180);
        await locator.evaluate(el => el.scrollIntoView({ block: 'start' }));
      };
      const name = `${before ? 'before' : 'after'}-${world}-${width}-${dark ? 'dark' : 'light'}`;
      await scrollTo(navigator);
      await page.screenshot({ path: path.join(dir, name + '-map.png') });
      await scrollTo(card);
      await page.screenshot({ path: path.join(dir, name + '-detail.png') });
      const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, errors: window.__events.errors }));
      assert.ok(metrics.scrollWidth <= width + 1, JSON.stringify(metrics));
      assert.deepEqual(metrics.errors, []);
      if (!before) {
        assert.equal(await card.getAttribute('data-orrery-world-detail'), world);
        assert.equal(await card.locator('dl').count(), 2);
        assert.ok(await card.locator('dt').count() >= 9);
        assert.equal(await page.locator('#orrery-compare-body').count(), 1);
        assert.equal(await navigator.locator('#orrery-compare-body').count(), 1);
        const display = page.locator('#orrery-display-options');
        await display.locator('summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await display.evaluate(el => el.open), false);
        await page.keyboard.press('Enter');
        assert.equal(await display.evaluate(el => el.open), true);
        metrics.minimumDetailValueSize = await card.locator('.orr-detail-stat dd').evaluateAll(els => Math.min(...els.map(el => parseFloat(getComputedStyle(el).fontSize))));
        metrics.detailFonts = await card.evaluate(el => [el, el.querySelector('h3'), el.querySelector('dt'), el.querySelector('dd')].map(node => ({ tag: node.tagName, fontFamily: getComputedStyle(node).fontFamily })));
        assert.ok(metrics.minimumDetailValueSize >= 15);
        const live = await page.evaluate(() => ({
          distance: document.getElementById('orrery-live-distance').textContent,
          speed: document.getElementById('orrery-live-speed').textContent,
          phase: document.getElementById('orrery-live-phase').textContent,
          summary: document.getElementById('orrery-live-selected-summary').textContent
        }));
        assert.ok(live.summary.includes(live.distance) && live.summary.includes(live.speed) && live.summary.includes(live.phase));
        const follow = navigator.getByRole('button', { name: /with the camera/ });
        assert.equal(await follow.count(), 1);
        await follow.click();
        await page.waitForFunction(() => document.querySelector('button[aria-label^="Release camera follow for"]')?.getAttribute('aria-pressed') === 'true');
        await navigator.getByRole('button', { name: /Release camera follow for/ }).click();
        await navigator.locator('#orrery-compare-body').selectOption(world === 'saturn' ? 'neptune' : 'mars');
        await page.waitForFunction(() => !!document.getElementById('orrery-compare-interpretation'));
        const layout = await page.locator('canvas[data-responsive-canvas="true"]').evaluate(el => el._orreryLabelLayout);
        assert.ok(layout.rendered.some(label => label.id === world && label.selected), 'Selected label retained');
        assert.ok(layout.rendered.some(label => label.compared), 'Comparison label retained');
        metrics.labelCount = layout.rendered.length;
        metrics.reserved = layout.reserved.map(box => box.id);
        metrics.minimumDetailContrast = await card.evaluate(el => {
          const luminance = color => {
            const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
              const channel = value / 255;
              return channel <= .04045 ? channel / 12.92 : Math.pow((channel + .055) / 1.055, 2.4);
            });
            return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
          };
          return Math.min(...[...el.querySelectorAll('.orr-detail-type,.orr-detail-stat dt,.orr-detail-stat dd,.orr-detail-description,.orr-detail-table th,.orr-detail-table td')].map(node => {
            let ancestor = node;
            while (ancestor && parseFloat(getComputedStyle(ancestor).backgroundColor.match(/[\d.]+/g)[3] || '1') < 1) ancestor = ancestor.parentElement;
            const surface = luminance(getComputedStyle(ancestor).backgroundColor);
            const foreground = luminance(getComputedStyle(node).color);
            return (Math.max(surface, foreground) + .05) / (Math.min(surface, foreground) + .05);
          }));
        });
        assert.ok(metrics.minimumDetailContrast >= 4.5, 'Detail contrast: ' + metrics.minimumDetailContrast);
        await page.getByRole('button', { name: new RegExp('Save orbital snapshot A for') }).click();
        await page.waitForFunction(() => !!document.getElementById('orrery-prediction-speed'));
        assert.deepEqual(await page.evaluate(() => window.__events.errors), []);
      }
      results.push({ dark, world, ...metrics });
      console.log('Checked detail/map ' + width + 'px ' + (dark ? 'dark' : 'light') + ' ' + world);
      await harness.destroy(page);
    }
    fs.writeFileSync(path.join(dir, `${before ? 'before' : 'after'}-metrics.json`), JSON.stringify(results, null, 2));
  } finally {
    await page.close(); await browser.close(); await harness.stop();
    fs.unlinkSync(bundle);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
