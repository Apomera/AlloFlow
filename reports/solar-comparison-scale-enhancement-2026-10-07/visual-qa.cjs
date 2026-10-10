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
    await harness.start();
    browser = await chromium.launch();
    page = await browser.newPage({ deviceScaleFactor: 1 });
    page.setDefaultTimeout(120000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, dark, first, second, mode] of [
      [1060, true, 'Earth', 'Jupiter', 'system'],
      [1060, false, 'Uranus', 'Neptune', 'system'],
      [320, true, 'Mercury', 'Mars', 'pair'],
      [320, false, 'Earth', 'Neptune', 'system'],
    ]) {
      const name = `comparison-${width}-${dark ? 'dark' : 'light'}-${first}-${second}`;
      console.log('Starting ' + name);
      await page.setViewportSize({ width, height: 1400 });
      await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node, value) => node.style.width = value + 'px', width);
      await page.evaluate(({ dark, first, second, mode }) => {
        const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        window.__mount({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
          sidebar: true, paused: true, selectedPlanet: first, viewTab: 'overview', compare1: first, compare2: second,
          compareScaleMode: mode, showVisualCompare: true, missionLog: [], journalEntries: [] } });
        window.__ctx.isDark = dark;
        window.__ctx.t = (key, fallback) => worlds.find(name => key === 'stem.solar_sys.' + name.toLowerCase()) || fallback || key;
        document.documentElement.classList.toggle('dark', dark);
        window.__rerender();
      }, { dark, first, second, mode });
      const panel = page.locator('#solar-visual-comparison');
      await panel.waitFor();
      const inspection = panel.locator('[data-solar-planet-comparison]');
      assert.equal(await inspection.getAttribute('data-comparison-scale'), mode);
      await inspection.screenshot({ path: path.join(__dirname, name + '.png'), animations: 'disabled' });
      await inspection.locator('#solar-compare-measurements').screenshot({ path: path.join(__dirname, name + '-charts.png'), animations: 'disabled' });
      const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, errors: window.__events.errors }));
      assert.ok(metrics.scrollWidth <= width + 1, 'Page overflow ' + name);
      assert.deepEqual(metrics.errors, []);
      metrics.minimumComparisonText = await inspection.evaluate(node => Math.min(...[...node.querySelectorAll('p,span,strong,button,dt,dd,a,th,td')]
        .filter(n => n.textContent.trim() && n.getBoundingClientRect().height && !n.closest('[aria-hidden="true"],.sr-only'))
        .map(n => parseFloat(getComputedStyle(n).fontSize))));
      assert.ok(metrics.minimumComparisonText >= 13, 'Comparison typography ' + name);
      metrics.minimumControlHeight = await panel.evaluate(node => Math.min(...[...node.querySelectorAll('button,select,a')]
        .filter(n => n.getBoundingClientRect().height).map(n => n.getBoundingClientRect().height)));
      assert.ok(metrics.minimumControlHeight >= 43.5, 'Comparison target size ' + name);
      await inspection.getByRole('button', { name: 'Fixed across worlds', exact: true }).click();
      const fixed = await inspection.locator('[data-compare-bars]').evaluateAll(charts => charts.map(chart => ({
        kind: chart.dataset.compareBars, ceilings: [...chart.querySelectorAll('[role="meter"]')].map(n => Number(n.getAttribute('aria-valuemax'))),
      })));
      for (const chart of fixed) assert.deepEqual(chart.ceilings, [chart.kind === 'diameter' ? 139822 : 2.53, chart.kind === 'diameter' ? 139822 : 2.53]);
      await panel.getByRole('button', { name: 'Explore ' + second, exact: true }).click();
      await page.waitForFunction(world => document.activeElement?.id === 'solar-world-detail-title' && document.activeElement.textContent === world, second);
      const heading = page.locator('#solar-world-detail-title');
      assert.equal(await heading.getAttribute('tabindex'), '-1');
      metrics.detailTitleLines = await heading.evaluate(node => node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight));
      assert.ok(metrics.detailTitleLines < 1.1, 'Planet title wraps ' + name);
      const detail = page.locator('[data-solarsystem-planet-detail]');
      if (width === 320) {
        const titleBox = await heading.boundingBox();
        const returnBox = await detail.getByRole('button', { name: 'Back to comparison', exact: true }).boundingBox();
        assert.ok(returnBox.y >= titleBox.y + titleBox.height, 'Return button crowds phone title ' + name);
      }
      metrics.minimumFactText = await detail.evaluate(node => Math.min(...[...node.querySelectorAll('.solar-detail-kind,.solar-detail-summary,[data-solarsystem-overview-metrics] dt,[data-solarsystem-overview-metrics] dd,[data-solarsystem-earth-comparisons] p,[data-solarsystem-earth-comparisons]>div>div:first-child span')]
        .filter(n => n.textContent.trim() && n.getBoundingClientRect().height).map(n => parseFloat(getComputedStyle(n).fontSize))));
      assert.ok(metrics.minimumFactText >= 13, 'Planet fact typography ' + name);
      await detail.locator('.solar-detail-heading').screenshot({ path: path.join(__dirname, name + '-heading.png'), animations: 'disabled' });
      await detail.locator('[data-solarsystem-overview-metrics]').screenshot({ path: path.join(__dirname, name + '-facts.png'), animations: 'disabled' });
      await detail.getByRole('button', { name: 'Back to comparison', exact: true }).click();
      await page.waitForFunction(world => document.activeElement?.dataset.compareExplore === world, second);
      metrics.exploreFocusPassed = true;
      metrics.returnFocusPassed = true;
      results.push({ name, dark, first, second, mode, fixed, ...metrics });
      fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({
        sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'),
        completed: results.length === 4, results,
      }, null, 2));
      console.log('Checked ' + name);
      await harness.destroy(page);
    }
    fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({
      sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'), completed: true, results,
    }, null, 2));
  } catch (error) {
    if (page && !page.isClosed()) {
      console.error(JSON.stringify(await page.evaluate(() => ({ errors: window.__events?.errors,
        selected: window.__ctx?.toolData?.solarSystem?.selectedPlanet,
        active: { id: document.activeElement?.id, text: document.activeElement?.textContent?.slice(0, 150) },
      })).catch(() => ({ diagnosticsUnavailable: true }))));
      if (typeof page.locator('#solar-visual-comparison').ariaSnapshot === 'function') console.error(await page.locator('#solar-visual-comparison').ariaSnapshot().catch(() => ''));
    }
    throw error;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    await harness.stop();
    if (fs.existsSync(bundle)) fs.unlinkSync(bundle);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
