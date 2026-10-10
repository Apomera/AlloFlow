const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { buildSync } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), bundle = path.join(__dirname, 'harness.cjs'); process.chdir(root);
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const fixtures = { journalEntries: [{ planet: 'Earth', observation: 'Keep this observation.', timestamp: 1700000000000 }],
  journalDrafts: { Earth: { observation: 'Keep my independent Earth note.' } },
  journalSynthesis: { sourceA: '0', claim: 'Keep my connecting claim.' } };
(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1400, appStyles: true, layout: 'document' });
  let browser, page; const results = [];
  try {
    await harness.start(); browser = await chromium.launch(); page = await browser.newPage({ deviceScaleFactor: 1 });
    page.setDefaultTimeout(60000); await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, dark] of [[1060, true], [1060, false], [320, true], [320, false]]) {
      const name = `vocabulary-${width}-${dark ? 'dark' : 'light'}`; console.log('Starting ' + name);
      await page.setViewportSize({ width, height: 1400 }); await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node, value) => node.style.width = value + 'px', width);
      await page.evaluate(({ dark, fixtures }) => {
        const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        window.__mount({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
          sidebar: true, paused: true, selectedPlanet: 'Earth', viewTab: 'overview', showVocab: false,
          vocabLookedUp: ['regolith', 'regolith', 'unknown', null], ...fixtures } });
        window.__spoken = []; window.__ctx.callTTS = text => window.__spoken.push(text);
        window.__ctx.isDark = dark; window.__ctx.t = (key, fallback) => worlds.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
        document.documentElement.classList.toggle('dark', dark); window.__rerender();
      }, { dark, fixtures });
      const workspace = page.locator('[data-solar-vocabulary]'), toggle = workspace.locator('[data-vocab-toggle]');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(await workspace.locator('[data-vocab-progress]').textContent(), '1 of 17 terms viewed');
      await toggle.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-vocabulary-search');
      const search = workspace.getByLabel('Search vocabulary', { exact: true }), filter = workspace.getByLabel('Show terms', { exact: true });
      const terms = workspace.locator('[data-vocab-term]');
      assert.equal(await terms.count(), 17);
      assert.equal(await workspace.locator('.solar-vocabulary-term-list').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), width <= 380 ? 1 : 2);
      assert.deepEqual((await terms.evaluateAll(nodes => nodes.map(node => node.dataset.vocabTerm))).slice(0, 3), ['albedo', 'AU (astronomical unit)', 'axial tilt']);
      assert.deepEqual(await page.evaluate(() => window.__toolData.solarSystem.vocabLookedUp), ['regolith', 'regolith', 'unknown', null]);
      const columns = await workspace.locator('.solar-vocabulary-layout').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
      assert.equal(columns, width > 640 ? 2 : 1);
      await search.fill('  CO2 ATMOSPHERE  ');
      assert.equal(await terms.count(), 1); assert.equal(await terms.first().getAttribute('data-vocab-term'), 'greenhouse effect');
      await terms.first().focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-vocabulary-definition-title');
      const definition = await workspace.locator('[data-vocab-definition-copy]').textContent();
      assert.equal(await workspace.locator('[data-vocab-definition]').getAttribute('data-vocab-definition'), 'greenhouse effect');
      assert.deepEqual(await page.evaluate(() => window.__toolData.solarSystem.vocabLookedUp), ['regolith', 'greenhouse effect']);
      assert.deepEqual(await page.evaluate(() => window.__spoken), []);
      await workspace.getByRole('button', { name: 'Read definition aloud', exact: true }).click();
      assert.deepEqual(await page.evaluate(() => window.__spoken), ['greenhouse effect. ' + definition]);
      await workspace.getByRole('button', { name: 'Back to matching terms', exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.dataset.vocabTerm === 'greenhouse effect');
      await filter.selectOption('new'); await search.fill('');
      assert.equal(await terms.count(), 15);
      await workspace.getByRole('button', { name: 'Read density', exact: true }).focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-vocabulary-definition-title');
      assert.equal(await terms.count(), 14); assert.equal(await workspace.locator('[data-vocab-outside-results]').count(), 1);
      await workspace.getByRole('button', { name: 'Back to matching terms', exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.id === 'solar-vocabulary-results-title');
      await search.fill('no-matching-term');
      assert.equal(await workspace.locator('[data-vocab-empty]').count(), 1);
      assert.equal(await workspace.locator('[data-vocab-definition]').getAttribute('data-vocab-definition'), 'density');
      await workspace.screenshot({ path: path.join(__dirname, name + '-empty.png'), animations: 'disabled' });
      await workspace.getByRole('button', { name: 'Show selected term', exact: true }).focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.dataset.vocabTerm === 'density');
      assert.equal(await search.inputValue(), ''); assert.equal(await filter.inputValue(), 'all');
      assert.equal(await terms.count(), 17);
      await workspace.screenshot({ path: path.join(__dirname, name + '-reader.png'), animations: 'disabled' });
      // Focus the final row to check that the bounded list scrolls naturally with the keyboard destination.
      await workspace.getByRole('button', { name: 'Read tidal locking', exact: true }).focus();
      assert.ok(await workspace.locator('.solar-vocabulary-term-list').evaluate(node => node.scrollTop > 0));
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-vocabulary-definition-title');
      await search.fill('tidal'); await filter.selectOption('viewed');
      await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      await toggle.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-vocabulary-search');
      assert.equal(await search.inputValue(), 'tidal'); assert.equal(await filter.inputValue(), 'viewed');
      assert.equal(await terms.count(), 1); assert.equal(await terms.first().getAttribute('aria-pressed'), 'true');
      assert.equal(await workspace.locator('[data-vocab-definition]').getAttribute('data-vocab-definition'), 'tidal locking');
      assert.equal((await page.evaluate(() => window.__spoken)).length, 1);
      await workspace.getByRole('button', { name: 'Clear filters', exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.id === 'solar-vocabulary-results-title');
      const final = await page.evaluate(() => window.__toolData.solarSystem);
      assert.deepEqual(final.vocabLookedUp, ['regolith', 'greenhouse effect', 'density', 'tidal locking']);
      for (const key of Object.keys(fixtures)) assert.deepEqual(final[key], fixtures[key]);
      const metrics = await workspace.evaluate(node => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        errors: window.__events.errors,
        minimumText: Math.min(...[...node.querySelectorAll('p,span,label,button,select,div,strong,h4,h5')].filter(n => n.getBoundingClientRect().height && [...n.childNodes].some(child => child.nodeType === 3 && child.textContent.trim()) && !n.closest('[aria-hidden="true"],.sr-only')).map(n => parseFloat(getComputedStyle(n).fontSize))),
        minimumControlHeight: Math.min(...[...node.querySelectorAll('button,select,input')].filter(n => n.getBoundingClientRect().height).map(n => n.getBoundingClientRect().height)),
        minimumInputFont: Math.min(...[...node.querySelectorAll('input,select')].map(n => parseFloat(getComputedStyle(n).fontSize))),
        termOverflow: [...node.querySelectorAll('[data-vocab-term]')].filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.dataset.vocabTerm),
        wrappedMetadata: [...node.querySelectorAll('[data-vocab-term] span')].filter(n => n.getBoundingClientRect().height > parseFloat(getComputedStyle(n).lineHeight) + 1).map(n => n.textContent),
      }));
      assert.ok(metrics.scrollWidth <= width + 1, 'Page overflow ' + name); assert.deepEqual(metrics.errors, []);
      assert.deepEqual(metrics.termOverflow, []); assert.ok(metrics.minimumText >= 13, 'Small text: ' + metrics.minimumText);
      assert.deepEqual(metrics.wrappedMetadata, []);
      assert.ok(metrics.minimumControlHeight >= 43.5); assert.ok(metrics.minimumInputFont >= 16);
      results.push({ name, dark, ...metrics, searchDefinitions: true, normalizedSearch: true, viewedFilters: true, readerRetention: true, committedFocus: true, readerBackNavigation: true, statePreserved: true, speechOnRequestOnly: true });
      fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({ sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'), completed: results.length === 4, results }, null, 2));
      console.log('Checked ' + name); await harness.destroy(page);
    }
  } catch (error) {
    if (page && !page.isClosed()) console.error(JSON.stringify(await page.evaluate(() => ({ errors: window.__events?.errors, active: document.activeElement?.outerHTML })).catch(() => ({}))));
    throw error;
  } finally { if (page) await page.close(); if (browser) await browser.close(); await harness.stop(); if (fs.existsSync(bundle)) fs.unlinkSync(bundle); }
})().catch(error => { console.error(error); process.exitCode = 1; });
