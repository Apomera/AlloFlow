const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { chromium } = require('playwright');
const dir = __dirname;
const before = process.argv.includes('--before');
const snapshot = path.join(dir, 'baseline-tool.js');
if (before) { fs.copyFileSync('stem_lab/stem_tool_solarsystem.js', snapshot); process.env.STEM_GL_SUBSTITUTE = 'stem_lab/stem_tool_solarsystem.js=' + snapshot; }
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: path.join(dir, 'harness.cjs'), bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const results = [];

(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1180, height: 1000, appStyles: true, layout: 'document' });
  await harness.start();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1180, height: 1000 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  try {
    for (const [width, dark] of before ? [[1180, true], [320, false]] : [[1180, true], [1180, false], [736, true], [320, false]]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((el, w) => { el.style.width = w + 'px'; }, width);
      await page.evaluate(d => window.__mount(d), { solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 0, orr_sel: 'mercury', orr_paused: true, orr_time: 0, orr_zoom: 'inner', isDark: dark } });
      await page.waitForFunction(() => document.querySelector('canvas[data-responsive-canvas="true"]')?.__canvasPanelState);
      const navigator = page.locator('.orr-body-navigator');
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await navigator.evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(200);
      await navigator.evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: path.join(dir, `${before ? 'before' : 'after'}-${width}-${dark ? 'dark' : 'light'}.png`) });
      const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, navigatorWidth: document.querySelector('.orr-body-navigator').getBoundingClientRect().width, readoutWidth: document.getElementById('orrery-stage-readout').getBoundingClientRect().width, errors: window.__events.errors }));
      assert.ok(metrics.scrollWidth <= width + 1, JSON.stringify(metrics));
      assert.deepEqual(metrics.errors, []);
      if (!before) {
        const selector = page.locator('#orrery-body-navigator');
        assert.ok((await selector.boundingBox()).height >= 44);
        const readout = page.locator('#orrery-stage-readout');
        assert.equal(await readout.getAttribute('aria-live'), 'polite');
        assert.equal(await page.locator('[data-orrery-selected-portrait="Mercury"]').count(), 1);
        const checkValues = async () => {
          const legacy = await page.locator('#orrery-stage-readout-values').textContent();
          assert.ok(legacy.includes('Distance ' + await page.locator('#orrery-stage-distance-value').textContent() + ' AU'));
          assert.ok(legacy.includes('speed ' + await page.locator('#orrery-stage-speed-value').textContent() + ' km/s'));
          assert.ok(legacy.includes(await page.locator('#orrery-stage-phase-value').textContent()));
        };
        await checkValues();
        await page.getByRole('button', { name: 'Jump to aphelion for Mercury', exact: true }).click();
        await page.waitForFunction(() => document.getElementById('orrery-stage-distance-value').textContent === '0.467');
        await checkValues();
        await selector.selectOption('saturn');
        await page.waitForFunction(() => document.querySelector('[data-orrery-selected-portrait="Saturn"]'));
        assert.equal(await page.locator('[data-orrery-period]').textContent(), '29.46 Earth years');
        await selector.selectOption('halley');
        await page.waitForFunction(() => document.querySelector('[data-orrery-selected-badge="comet"]'));
        assert.equal(await page.locator('[data-orrery-period]').textContent(), '75.30 Earth years');
        await selector.selectOption('ceres');
        await page.waitForFunction(() => document.querySelector('[data-orrery-selected-badge="dwarf"]'));
        await selector.selectOption('');
        await page.waitForFunction(() => !document.getElementById('orrery-stage-readout'));
        assert.equal(await page.locator('[data-orrery-period]').count(), 0);
        await selector.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.getElementById('orrery-stage-readout'));
        await checkValues();
        metrics.minimumReadoutValueSize = await page.locator('.orr-stage-metric-value').evaluateAll(els => Math.min(...els.map(el => parseFloat(getComputedStyle(el).fontSize))));
        assert.ok(metrics.minimumReadoutValueSize >= 17);
        metrics.modelNoteContrast = await page.locator('#orrery-model-scale-note').evaluate(el => {
          const style = getComputedStyle(el);
          const luminance = color => {
            const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
              const channel = value / 255;
              return channel <= .04045 ? channel / 12.92 : Math.pow((channel + .055) / 1.055, 2.4);
            });
            return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
          };
          const text = luminance(style.color);
          const surface = luminance(style.backgroundColor);
          return (Math.max(text, surface) + .05) / (Math.min(text, surface) + .05);
        });
        assert.ok(metrics.modelNoteContrast >= 4.5, 'Scale note contrast: ' + metrics.modelNoteContrast);
        assert.deepEqual(await page.evaluate(() => window.__events.errors), []);
      }
      results.push({ dark, ...metrics });
      console.log('Checked Orrery ' + width + 'px ' + (dark ? 'dark' : 'light'));
      await harness.destroy(page);
    }
    fs.writeFileSync(path.join(dir, `${before ? 'before' : 'after'}-metrics.json`), JSON.stringify(results, null, 2));
  } finally {
    await page.close(); await browser.close(); await harness.stop();
    if (before && fs.existsSync(snapshot)) fs.unlinkSync(snapshot);
    fs.unlinkSync(path.join(dir, 'harness.cjs'));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
