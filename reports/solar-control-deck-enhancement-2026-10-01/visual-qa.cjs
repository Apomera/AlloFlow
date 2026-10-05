const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { chromium } = require('playwright');
const dir = __dirname, before = process.argv.includes('--before');
const bundle = path.join(dir, 'harness.cjs');
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');

(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1200, appStyles: true, layout: 'document' });
  await harness.start();
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const results = [];
  const measureContrast = locator => locator.evaluateAll(panels => {
    const rgba = color => color.match(/[\d.]+/g).map(Number);
    const luminance = color => { const c = color.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return c[0] * .2126 + c[1] * .7152 + c[2] * .0722; };
    const samples = panels.flatMap(panel => [...panel.querySelectorAll('h3,h4,p,label,span,div,button')]).filter(node => node.textContent.trim() && !node.children.length && node.getBoundingClientRect().height && !node.disabled && !node.closest('[aria-hidden="true"]'));
    return Math.min(...samples.map(node => {
      const layers = [];
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) { const layer = rgba(getComputedStyle(ancestor).backgroundColor); layers.unshift(layer); if ((layer[3] ?? 1) >= 1) break; }
      let bg = [255, 255, 255];
      for (const layer of layers) { const alpha = layer[3] ?? 1; bg = bg.map((v, i) => layer[i] * alpha + v * (1 - alpha)); }
      const a = luminance(rgba(getComputedStyle(node).color)), b = luminance(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    }));
  });
  try {
    const cases = before ? [[1060, true, 1], [320, false, 1]] : [[1060, true, 1], [1060, false, 1], [736, true, 0], [320, false, 1], [320, true, 2]];
    for (const [width, dark, mission] of cases) {
      await page.setViewportSize({ width, height: 1200 });
      await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((el, w) => { el.style.width = w + 'px'; }, width);
      const world = ['earth', 'mercury', 'mars'][mission];
      await page.evaluate(data => window.__mount({ solarSystem: data }), { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: true, orr_tab: 0, orr_sel: world, orr_mission_idx: mission, orr_paused: true, orr_time: 0, orr_zoom: 'inner', isDark: dark });
      await page.waitForFunction(() => document.getElementById('orrery-guided-objective') || window.__events.errors.length, null, { timeout: 10000 }).catch(async error => {
        throw new Error('Mission did not mount: ' + JSON.stringify(await page.evaluate(() => ({ errors: window.__events.errors, text: document.getElementById('wrap').innerText.slice(0, 2000) }))) + '\n' + error.message);
      });
      assert.deepEqual(await page.evaluate(() => window.__events.errors), []);
      const guide = page.locator('#orrery-guided-objective').locator('xpath=..');
      const deck = page.locator('.orr-control-deck'), display = page.locator('#orrery-display-options');
      const name = `${before ? 'before' : 'after'}-${world}-${width}-${dark ? 'dark' : 'light'}`;
      await guide.screenshot({ path: path.join(dir, name + '-mission.png') });
      await deck.screenshot({ path: path.join(dir, name + '-controls.png') });
      await display.screenshot({ path: path.join(dir, name + '-display.png') });
      const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, errors: window.__events.errors }));
      assert.ok(metrics.scrollWidth <= width + 1, JSON.stringify(metrics));
      assert.deepEqual(metrics.errors, []);
      if (!before) {
        metrics.minimumContrast = await measureContrast(page.locator('.orr-control-deck,#orrery-display-options,#orrery-guided-mission'));
        assert.ok(metrics.minimumContrast >= 4.5, 'Control/mission contrast: ' + metrics.minimumContrast);
        const targets = await page.locator('.orr-control-deck button,.orr-control-deck input,#orrery-display-options button,#orrery-guided-mission button').evaluateAll(nodes => nodes.map(node => ({ name: node.textContent || node.id, height: node.getBoundingClientRect().height })));
        metrics.minimumTargetHeight = Math.min(...targets.map(target => target.height));
        assert.ok(metrics.minimumTargetHeight >= 43.5, JSON.stringify(targets));
        assert.equal(await page.locator('[data-orrery-timeline-jump]').count(), 5);
        assert.equal(await page.locator('#orrery-live-timeline-phase').evaluate(node => node.children.length), 0);
        assert.equal(await page.locator('#orrery-live-timeline-value').evaluate(node => node.children.length), 0);
        assert.equal(await page.locator('#orrery-playback-context').evaluate(node => node.children.length), 0);
        await page.locator('#orrery-timeline-jump-4').click();
        assert.equal(await page.locator('#orrery-timeline-jump-4').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('#orrery-timeline-jump-0').getAttribute('aria-pressed'), 'false');
        await page.locator('#orrery-timeline-jump-0').click();
        await guide.getByRole('button', { name: /^Focus .* and pause$/ }).click();
        const correct = mission === 0 ? 'Closer than 1 AU for Earth live orbit' : mission === 1 ? 'Near perihelion for Mercury speed zone' : 'Mars for Longer year';
        await guide.getByRole('button', { name: correct, exact: true }).click();
        assert.ok((await guide.textContent()).includes('Mission complete'));
        metrics.completedMissionContrast = await measureContrast(guide);
        assert.ok(metrics.completedMissionContrast >= 4.5, 'Completed mission contrast: ' + metrics.completedMissionContrast);
        await guide.screenshot({ path: path.join(dir, name + '-completed-mission.png') });
        const summary = display.locator('summary'); await summary.focus(); await page.keyboard.press('Enter');
        assert.equal(await display.evaluate(node => node.open), false);
        await page.keyboard.press('Enter'); assert.equal(await display.evaluate(node => node.open), true);
        assert.deepEqual(await page.evaluate(() => window.__events.errors), []);
      }
      results.push({ dark, world, ...metrics });
      console.log(`Checked control deck ${width}px ${dark ? 'dark' : 'light'} ${world}`);
      await harness.destroy(page);
    }
    fs.writeFileSync(path.join(dir, `${before ? 'before' : 'after'}-metrics.json`), JSON.stringify(results, null, 2));
  } finally { await page.close(); await browser.close(); await harness.stop(); fs.unlinkSync(bundle); }
})().catch(error => { console.error(error); process.exitCode = 1; });
