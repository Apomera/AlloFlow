const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { buildSync } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), bundle = path.join(__dirname, 'harness.cjs'); process.chdir(root);
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1400, appStyles: true, layout: 'document' });
  let browser, page; const results = [];
  try {
    await harness.start(); browser = await chromium.launch(); page = await browser.newPage({ deviceScaleFactor: 1 });
    page.setDefaultTimeout(120000); await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, dark, length, launcherName] of [[1060, true, 100, 'Build a scale walk'], [1060, false, 1000, 'Open scale walk planner'], [320, true, 10, 'Build a scale walk'], [320, false, 100, 'Open scale walk planner']]) {
      const name = `walk-${width}-${dark ? 'dark' : 'light'}-${length}m`; console.log('Starting ' + name);
      await page.setViewportSize({ width, height: 1400 }); await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node, value) => node.style.width = value + 'px', width);
      await page.evaluate(({ dark, length }) => {
        const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        window.__mount({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
          sidebar: true, paused: true, selectedPlanet: 'Earth', viewTab: 'overview', scaleWalkLength: length,
          journalEntries: [], missionLog: [], compareReasoningDrafts: { 'Earth:Jupiter': 'Keep my comparison.' } } });
        window.__ctx.isDark = dark; window.__ctx.t = (key, fallback) => worlds.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
        document.documentElement.classList.toggle('dark', dark); window.__rerender();
      }, { dark, length });
      const opener = page.getByRole('button', { name: launcherName, exact: true }); await opener.focus(); await page.keyboard.press('Enter');
      const planner = page.locator('#solar-scale-walk'); await planner.waitFor();
      await page.waitForFunction(() => document.activeElement?.id === 'solar-scale-walk-title');
      assert.equal(await planner.locator('[data-scale-walk-world]').count(), 9);
      const position = async key => Number(await planner.locator('[data-scale-map-marker="' + key + '"]').getAttribute('cx'));
      assert.ok(Math.abs(((await position('Neptune')) - await position('Sun')) / ((await position('Earth')) - await position('Sun')) - 30.07) < 1e-8);
      const select = planner.getByLabel('Current stop', { exact: true });
      await select.selectOption('Earth');
      await planner.getByRole('button', { name: 'Inner planets', exact: true }).click();
      assert.equal(await planner.locator('[data-scale-map-marker]').count(), 5);
      assert.equal(await planner.locator('[data-scale-map-view]').getAttribute('data-scale-map-view'), 'inner');
      assert.equal(await planner.locator('[data-scale-walk-world][aria-current="step"]').getAttribute('data-scale-walk-world'), 'Earth');
      const gap = Number(await planner.locator('[data-scale-stop-reading="gap"]').getAttribute('data-value'));
      assert.ok(Math.abs(gap - length * (1 - .723) / 30.07) < 1e-8);
      await planner.locator('.solar-walk-navigator').screenshot({ path: path.join(__dirname, name + '-stop.png'), animations: 'disabled' });
      await planner.locator('.solar-walk-map svg').screenshot({ path: path.join(__dirname, name + '-inner-map.png'), animations: 'disabled' });
      await planner.locator('table').screenshot({ path: path.join(__dirname, name + '-table.png'), animations: 'disabled' });
      const metrics = await planner.evaluate(node => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        errors: window.__events.errors,
        minimumText: Math.min(...[...node.querySelectorAll('p,span,label,button,select,div,td,th,dt,dd,a')].filter(n => n.getBoundingClientRect().height && [...n.childNodes].some(child => child.nodeType === 3 && child.textContent.trim()) && !n.closest('[aria-hidden="true"],.sr-only')).map(n => parseFloat(getComputedStyle(n).fontSize))),
        minimumControlHeight: Math.min(...[...node.querySelectorAll('button,input,select')].filter(n => n.getBoundingClientRect().height).map(n => n.getBoundingClientRect().height)),
      }));
      assert.ok(metrics.scrollWidth <= width + 1, 'Page overflow ' + name); assert.deepEqual(metrics.errors, []);
      assert.ok(metrics.minimumText >= 13, 'Small text: ' + metrics.minimumText); assert.ok(metrics.minimumControlHeight >= 43.5);
      if (width === 1060) assert.equal(await planner.locator('.solar-walk-map').evaluate(node => node.scrollWidth <= node.clientWidth + 1), true, 'Desktop map should fit');
      if (width === 320) {
        const map = planner.getByRole('region', { name: 'Scrollable scale walk distance map' });
        await map.evaluate(node => node.scrollLeft = node.scrollWidth); assert.ok(await map.evaluate(node => node.scrollLeft) > 0);
      }
      await planner.getByRole('button', { name: 'Next stop', exact: true }).focus(); await page.keyboard.press('Enter');
      assert.equal(await select.inputValue(), 'Mars'); await page.keyboard.press('Enter');
      assert.equal(await select.inputValue(), 'Jupiter'); assert.equal(await planner.locator('[data-scale-map-view]').getAttribute('data-scale-map-view'), 'full');
      await planner.getByRole('button', { name: 'Inner planets', exact: true }).click();
      await planner.getByRole('button', { name: 'Show Jupiter on whole map', exact: true }).click();
      assert.equal(await planner.locator('[data-scale-map-view]').getAttribute('data-scale-map-view'), 'full');
      await planner.getByLabel('My scale explanation (optional)').fill('Every model length uses one conversion factor.');
      await planner.getByRole('button', { name: 'Save scale plan to journal', exact: true }).click();
      const saved = await page.evaluate(() => window.__toolData.solarSystem.journalEntries);
      await select.selectOption('Neptune'); await planner.getByRole('button', { name: 'Inner planets', exact: true }).click();
      assert.equal(await planner.getByRole('button', { name: 'Scale plan saved ✓', exact: true }).isDisabled(), true);
      assert.equal(await planner.getByRole('button', { name: 'Next stop', exact: true }).isDisabled(), true);
      await planner.getByRole('button', { name: 'Close scale walk', exact: true }).click();
      assert.equal(await planner.count(), 0);
      assert.equal(await opener.evaluate(node => node === document.activeElement), true);
      await page.keyboard.press('Enter'); await planner.waitFor();
      assert.equal(await select.inputValue(), 'Neptune');
      await planner.getByRole('button', { name: length === 1000 ? '10 m' : '1000 m', exact: true }).click();
      assert.equal(await planner.getByRole('button', { name: 'Save scale plan to journal', exact: true }).isDisabled(), false);
      const final = await page.evaluate(() => window.__toolData.solarSystem);
      assert.deepEqual(final.journalEntries, saved); assert.equal(final.compareReasoningDrafts['Earth:Jupiter'], 'Keep my comparison.');
      results.push({ name, length, dark, ...metrics, linearMap: true, innerZoom: true, exactGap: true, keyboardStops: true, preservedJournal: true, openCloseFocus: true });
      fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({ sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'), completed: results.length === 4, results }, null, 2));
      console.log('Checked ' + name); await harness.destroy(page);
    }
  } catch (error) {
    if (page && !page.isClosed()) console.error(JSON.stringify(await page.evaluate(() => ({ errors: window.__events?.errors, active: document.activeElement?.outerHTML })).catch(() => ({}))));
    throw error;
  } finally { if (page) await page.close(); if (browser) await browser.close(); await harness.stop(); if (fs.existsSync(bundle)) fs.unlinkSync(bundle); }
})().catch(error => { console.error(error); process.exitCode = 1; });
