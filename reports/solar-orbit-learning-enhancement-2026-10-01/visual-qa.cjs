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
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1100, appStyles: true, layout: 'document' });
  await harness.start();
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const results = [];
  const readTextContrast = locator => locator.evaluateAll(panels => {
    const rgba = color => color.match(/[\d.]+/g).map(Number);
    const luminance = color => {
      const channels = color.slice(0, 3).map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    const samples = panels.flatMap(panel => [...panel.querySelectorAll('h3,h4,h5,figcaption,p,dt,dd,label,span,th,td,div')]).filter(node => node.textContent.trim() && node.getBoundingClientRect().height && !node.children.length);
    return Math.min(...samples.map(node => {
      const layers = [];
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
        const layer = rgba(getComputedStyle(ancestor).backgroundColor); layers.unshift(layer);
        if ((layer[3] ?? 1) >= 1) break;
      }
      let surface = [255, 255, 255];
      for (const layer of layers) { const alpha = layer[3] ?? 1; surface = surface.map((value, index) => layer[index] * alpha + value * (1 - alpha)); }
      const a = luminance(rgba(getComputedStyle(node).color)), b = luminance(surface);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    }));
  });
  try {
    const cases = before ? [[1060, true, 'mercury'], [320, false, 'mercury']] : [[1060, true, 'mercury'], [1060, false, 'mercury'], [736, true, 'earth'], [320, false, 'mercury'], [320, true, 'halley']];
    for (const [width, dark, world] of cases) {
      await page.setViewportSize({ width, height: 1100 });
      await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((el, w) => { el.style.width = w + 'px'; }, width);
      await page.evaluate(data => window.__mount({ solarSystem: data }), { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: true, orr_tab: 0, orr_sel: world, orr_paused: true, orr_time: 0, orr_zoom: 'inner', isDark: dark });
      const panel = page.locator('[data-orrery-rhythm]');
      const evidence = page.getByRole('region', { name: /A\/B orbital evidence for/ });
      await panel.waitFor();
      const name = `${before ? 'before' : 'after'}-${world}-${width}-${dark ? 'dark' : 'light'}`;
      await panel.screenshot({ path: path.join(dir, name + '-rhythm.png') });
      await evidence.getByRole('button', { name: /Save orbital snapshot A for/ }).click();
      await page.locator('#orrery-prediction-speed').selectOption('slower');
      await evidence.screenshot({ path: path.join(dir, name + '-evidence.png') });
      const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, errors: window.__events.errors }));
      assert.ok(metrics.scrollWidth <= width + 1, JSON.stringify(metrics));
      assert.deepEqual(metrics.errors, []);
      if (!before) {
        const targets = await page.locator('[data-orrery-rhythm] button,[data-orrery-rhythm] input,[data-orbit-rhythm-details] summary,.orr-evidence button,.orr-evidence select').evaluateAll(nodes => nodes.map(node => ({ name: node.getAttribute('aria-label') || node.textContent.trim() || node.id, height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width })));
        assert.ok(targets.length >= 9, 'Expected learning controls');
        assert.ok(targets.every(target => target.height >= 43.5), JSON.stringify(targets));
        metrics.minimumTargetHeight = Math.min(...targets.map(target => target.height));
        metrics.minimumTextContrast = await readTextContrast(page.locator('.orr-rhythm-panel,.orr-evidence'));
        assert.ok(metrics.minimumTextContrast >= 4.5, 'Learning text contrast: ' + metrics.minimumTextContrast);
        metrics.diagramSizes = await panel.locator('svg').evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
        metrics.minimumRenderedSvgLabelSize = await panel.locator('svg text').evaluateAll(nodes => Math.min(...nodes.map(node => { const matrix = node.getScreenCTM(); return parseFloat(getComputedStyle(node).fontSize) * Math.hypot(matrix.a, matrix.b); })));
        assert.ok(metrics.minimumRenderedSvgLabelSize >= 10, 'Rendered SVG labels: ' + metrics.minimumRenderedSvgLabelSize);
        assert.ok(metrics.diagramSizes.every(size => size.width >= 250), JSON.stringify(metrics.diagramSizes));
        assert.equal(await panel.locator('[data-rhythm-moment]').count(), 12);
        assert.equal(await panel.locator('[data-rhythm-sector]').count(), 2);
        assert.equal(await page.locator('#orrery-rhythm-reading').evaluate(node => node.children.length), 0);
        assert.equal(await page.locator('#orrery-speed-inspect-reading').evaluate(node => node.children.length), 0);
        assert.equal(await page.locator('#orrery-speed-marker').getAttribute('cx'), '44');
        await page.locator('#orrery-speed-inspect').fill('25');
        const reading = await page.locator('#orrery-rhythm-reading').textContent();
        await page.locator('#orrery-speed-match').click();
        assert.equal(await page.locator('#orrery-speed-inspect').inputValue(), '75');
        assert.equal(await page.locator('#orrery-rhythm-reading').textContent(), reading);
        const summary = panel.locator('[data-orbit-rhythm-details] summary');
        await summary.focus(); await page.keyboard.press('Enter');
        assert.equal(await summary.evaluate(node => node.parentElement.open), true);
        await page.keyboard.press('Enter');
        assert.equal(await summary.evaluate(node => node.parentElement.open), false);
        await page.locator('#orrery-timeline-jump-2').click();
        await evidence.getByRole('button', { name: /Save orbital snapshot B for/, exact: false }).click();
        assert.equal(await evidence.getByRole('table').count(), 1);
        assert.ok((await evidence.textContent()).includes('Prediction supported'));
        metrics.minimumFeedbackContrast = await readTextContrast(evidence.locator('.orr-evidence-result'));
        assert.ok(metrics.minimumFeedbackContrast >= 4.5, 'Feedback contrast: ' + metrics.minimumFeedbackContrast);
        await evidence.screenshot({ path: path.join(dir, name + '-completed-evidence.png') });
        assert.deepEqual(await page.evaluate(() => window.__events.errors), []);
      }
      results.push({ dark, world, ...metrics });
      console.log(`Checked orbit learning ${width}px ${dark ? 'dark' : 'light'} ${world}`);
      await harness.destroy(page);
    }
    fs.writeFileSync(path.join(dir, `${before ? 'before' : 'after'}-metrics.json`), JSON.stringify(results, null, 2));
  } finally {
    await page.close(); await browser.close(); await harness.stop();
    fs.unlinkSync(bundle);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
