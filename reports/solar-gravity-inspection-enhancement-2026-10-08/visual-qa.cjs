const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { buildSync } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), bundle = path.join(__dirname, 'harness.cjs');
process.chdir(root);
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1400, appStyles: true, layout: 'document' });
  let browser, page;
  const results = [];
  try {
    await harness.start(); browser = await chromium.launch();
    page = await browser.newPage({ deviceScaleFactor: 1 }); page.setDefaultTimeout(120000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, dark, target, height] of [[1060, true, 'Mars', 10], [1060, false, 'Jupiter', 1], [320, true, 'Pluto', 100], [320, false, 'Jupiter', 10]]) {
      const name = `gravity-${width}-${dark ? 'dark' : 'light'}-${target}`;
      console.log('Starting ' + name);
      await page.setViewportSize({ width, height: 1400 });
      await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node, value) => node.style.width = value + 'px', width);
      await page.evaluate(({ dark, target, height }) => {
        const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        window.__mount({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
          sidebar: true, paused: true, selectedPlanet: target, viewTab: 'overview', showGravityLab: true,
          gravMass: 70, gravHeight: height, missionLog: [], journalEntries: [], compareReasoningDrafts: { 'Earth:Jupiter': 'Keep this draft.' } } });
        window.__ctx.isDark = dark;
        window.__ctx.t = (key, fallback) => worlds.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
        document.documentElement.classList.toggle('dark', dark); window.__rerender();
      }, { dark, target, height });
      const lab = page.locator('#solar-gravity-lab'); await lab.waitFor();
      const run = lab.getByRole('button', { name: /Run synchronized vacuum drop/ });
      assert.equal(await run.isDisabled(), true);
      assert.equal(await lab.locator('[data-gravity-distance-chart]').count(), 0);
      assert.deepEqual(await lab.locator('.solar-drop-ball').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).top)), ['12px', '12px']);
      await lab.screenshot({ path: path.join(__dirname, name + '-setup.png'), animations: 'disabled' });
      await lab.getByRole('group', { name: 'Gravity drop prediction', exact: true }).getByRole('button', { name: 'Earth', exact: true }).click();
      await run.click();
      const inspector = lab.locator('[data-gravity-time-inspector]');
      await inspector.locator('[data-gravity-checkpoint="half"]').focus(); await page.keyboard.press('Enter');
      const cursor = inspector.locator('[data-gravity-time-cursor]');
      assert.ok(Math.abs(Number(await cursor.getAttribute('x1')) - 240) < 0.001);
      const plotLayout = await inspector.locator('[data-gravity-distance-chart]').evaluate(node => {
        const plot = node.querySelector('.solar-gravity-plot').getBoundingClientRect();
        return {
          markers: [...node.querySelectorAll('[data-gravity-chart-point]')].map(point => ({ width: point.getBoundingClientRect().width, height: point.getBoundingClientRect().height })),
          tickOffsets: [...node.querySelectorAll('.solar-gravity-chart-y span')].map((tick, index) => { const box = tick.getBoundingClientRect(); return box.y + box.height / 2 - (plot.y + plot.height * index / 2); }),
        };
      });
      assert.ok(plotLayout.markers.every(marker => marker.width === 12 && marker.height === 12));
      assert.ok(plotLayout.tickOffsets.every(offset => Math.abs(offset) < 1));
      await inspector.screenshot({ path: path.join(__dirname, name + '-inspection.png'), animations: 'disabled' });
      await inspector.locator('[data-gravity-distance-chart]').screenshot({ path: path.join(__dirname, name + '-chart.png'), animations: 'disabled' });
      const metrics = await lab.evaluate(node => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, errors: window.__events.errors,
        minimumText: Math.min(...[...node.querySelectorAll('p,span,label,button,div,figcaption,output')].filter(n => n.getBoundingClientRect().height && [...n.childNodes].some(child => child.nodeType === 3 && child.textContent.trim()) && !n.closest('[aria-hidden="true"],.sr-only')).map(n => parseFloat(getComputedStyle(n).fontSize))),
        minimumControlHeight: Math.min(...[...node.querySelectorAll('button,input')].filter(n => n.getBoundingClientRect().height).map(n => n.getBoundingClientRect().height)),
      }));
      assert.ok(metrics.scrollWidth <= width + 1, 'Page overflow ' + name);
      assert.deepEqual(metrics.errors, []);
      assert.ok(metrics.minimumText >= 13, 'Small text ' + name + ': ' + metrics.minimumText);
      assert.ok(metrics.minimumControlHeight >= 43.5, 'Small control ' + name);
      await inspector.getByRole('slider').focus(); await page.keyboard.press('ArrowRight');
      assert.ok(Number(await cursor.getAttribute('x1')) > 240);
      await inspector.locator('[data-gravity-checkpoint="end"]').click();
      const distances = await lab.locator('[data-gravity-inspected-distance]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.gravityInspectedDistance)));
      assert.ok(distances.every(distance => Math.abs(distance - height) < 1e-8));
      await lab.getByRole('button', { name: /Save comparison to journal/ }).click();
      assert.equal(await lab.getByRole('button', { name: /Gravity evidence saved/ }).isDisabled(), true);
      const saved = await page.evaluate(() => window.__toolData.solarSystem.journalEntries);
      await run.click();
      assert.equal(await lab.getByRole('button', { name: /Save comparison to journal/ }).isDisabled(), false);
      assert.equal(await inspector.locator('[data-gravity-time-cursor]').count(), 0);
      await lab.getByRole('button', { name: 'Try another prediction', exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.textContent === 'Earth' && document.activeElement?.closest('[aria-label="Gravity drop prediction"]'));
      assert.equal(await run.isDisabled(), true);
      assert.equal(await lab.locator('[data-gravity-distance-chart]').count(), 0);
      assert.deepEqual(await lab.locator('.solar-drop-ball').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).top)), ['12px', '12px']);
      const reset = await page.evaluate(() => window.__toolData.solarSystem);
      assert.deepEqual(reset.journalEntries, saved); assert.equal(reset.gravMass, 70); assert.equal(reset.gravHeight, height);
      assert.equal(reset.compareReasoningDrafts['Earth:Jupiter'], 'Keep this draft.');
      results.push({ name, target, height, dark, ...metrics, keyboardInspector: true, cappedDistances: true, replaySave: true, retryFocusAndPreservation: true, reducedMotionSetup: true });
      fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({ sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'), completed: results.length === 4, results }, null, 2));
      console.log('Checked ' + name); await harness.destroy(page);
    }
  } catch (error) {
    if (page && !page.isClosed()) console.error(JSON.stringify(await page.evaluate(() => ({ errors: window.__events?.errors, active: document.activeElement?.outerHTML, state: window.__toolData?.solarSystem?.gravityInspection })).catch(() => ({}))));
    throw error;
  } finally {
    if (page) await page.close(); if (browser) await browser.close(); await harness.stop();
    if (fs.existsSync(bundle)) fs.unlinkSync(bundle);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
