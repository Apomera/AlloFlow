const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { buildSync } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), bundle = path.join(__dirname, 'harness.cjs'); process.chdir(root);
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const fixtures = [
  { planet: 'Earth + Jupiter', observation: 'Jupiter has a larger diameter; its listed gravity is 2.53 g.\n\n' + 'Size and gravitational effects describe different properties. I need measurements from both models to connect the observations. '.repeat(3), investigation: { id: 'compare', explanation: 'Size and gravity are different quantities.' } },
  { planet: 'Mars + Mercury', observation: 'The worlds have different diameters but the same rounded 0.38 g.', investigation: { id: 'compare', explanation: '' } },
  { planet: 'Mars', observation: 'At the same height, the drop takes longer on Mars than on Earth.\nThe model omits atmospheric drag.', investigation: { id: 'gravity', explanation: '' } },
  { planet: 'Earth', observation: 'At 45 degrees north the modeled June daylight is 15.4 hours.', investigation: { id: 'seasons', explanation: '' } },
].map((entry, index) => ({ ...entry, timestamp: 1700000000000 + index }));
const updated = 'Revised comparison observation.\n\n' + 'AnUnbrokenObservationToken'.repeat(8);
(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1400, appStyles: true, layout: 'document' });
  let browser, page; const results = [];
  try {
    await harness.start(); browser = await chromium.launch(); page = await browser.newPage({ deviceScaleFactor: 1 });
    page.setDefaultTimeout(120000); await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, dark] of [[1060, true], [1060, false], [320, true], [320, false]]) {
      const name = `synthesis-${width}-${dark ? 'dark' : 'light'}`; console.log('Starting ' + name);
      await page.setViewportSize({ width, height: 1400 }); await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node, value) => node.style.width = value + 'px', width);
      await page.evaluate(({ dark, fixtures }) => {
        const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        window.__mount({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
          sidebar: true, paused: true, selectedPlanet: 'Earth', viewTab: 'overview', showJournal: true,
          journalEntries: fixtures, missionLog: [], journalDrafts: { Earth: { observation: 'Keep my independent Earth note.' } },
          journalSynthesis: { sourceA: '0', sourceB: '2', claim: 'Keep my connecting claim.' } } });
        window.__ctx.isDark = dark; window.__ctx.t = (key, fallback) => worlds.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
        document.documentElement.classList.toggle('dark', dark); window.__rerender();
      }, { dark, fixtures });
      const workspace = page.locator('[data-journal-synthesis]');
      await workspace.getByRole('button', { name: 'Open evidence synthesis', exact: true }).focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-synthesis-title');
      assert.equal(await workspace.locator('[data-synthesis-preview]').count(), 2);
      assert.equal(await workspace.locator('[data-synthesis-source]').count(), 0);
      assert.equal(await workspace.locator('[data-synthesis-full-observation="A"]').textContent(), fixtures[0].observation);
      const before = await page.evaluate(() => window.__toolData.solarSystem);
      assert.equal(before.journalSynthesis.sources, undefined); assert.deepEqual(before.journalEntries, fixtures);
      const columns = await workspace.locator('.solar-synthesis-source-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
      assert.equal(columns, width > 640 ? 2 : 1);
      const fullReadingGap = await workspace.locator('.solar-synthesis-full-reading').first().evaluate(node => node.querySelector('summary').getBoundingClientRect().top - node.previousElementSibling.getBoundingClientRect().bottom);
      assert.ok(fullReadingGap >= 7.5, 'Full-reading focus outline must clear the excerpt');
      await workspace.locator('.solar-synthesis-source-grid').screenshot({ path: path.join(__dirname, name + '-previews.png'), animations: 'disabled' });
      const a = workspace.getByLabel('Evidence A', { exact: true }), b = workspace.getByLabel('Evidence B', { exact: true });
      const capture = workspace.getByRole('button', { name: 'Capture selected evidence', exact: true });
      await b.selectOption('1'); assert.equal(await capture.isDisabled(), true);
      assert.match(await workspace.locator('[data-synthesis-selection-status]').textContent(), /two different investigations/);
      await b.selectOption('2'); await capture.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-synthesis-reasoning-title');
      const captured = await page.evaluate(() => window.__toolData.solarSystem.journalSynthesis.sources);
      assert.equal(captured[0].observation, fixtures[0].observation); assert.equal(captured[1].labId, 'gravity');
      assert.equal(await workspace.locator('[data-synthesis-preview]').count(), 0);
      assert.equal(await workspace.locator('[data-synthesis-source]').count(), 2);
      assert.equal(await workspace.getByLabel('My connecting claim').inputValue(), 'Keep my connecting claim.');
      await page.evaluate(value => {
        window.__toolData.solarSystem.journalEntries[0] = { ...window.__toolData.solarSystem.journalEntries[0], observation: value, timestamp: 1800000000000 };
        window.__rerender();
      }, updated);
      const changed = workspace.locator('[data-synthesis-original-changed="A"]');
      await changed.waitFor();
      assert.deepEqual(await page.evaluate(() => window.__toolData.solarSystem.journalSynthesis.sources), captured);
      assert.equal(await workspace.locator('[data-synthesis-source="A"] [data-synthesis-full-observation="A"]').textContent(), fixtures[0].observation);
      await changed.getByText('Compare latest journal version A', { exact: true }).focus(); await page.keyboard.press('Enter');
      assert.equal(await changed.locator('[data-synthesis-observation="A"]').textContent(), updated);
      assert.equal(await changed.locator('time').getAttribute('datetime'), new Date(1800000000000).toISOString());
      const comparisonGap = await changed.locator('details').evaluate(node => node.querySelector('summary').getBoundingClientRect().top - node.previousElementSibling.getBoundingClientRect().bottom);
      assert.ok(comparisonGap >= 7.5, 'Comparison focus outline must clear the change notice');
      await workspace.locator('[data-synthesis-evidence-card="A"]').screenshot({ path: path.join(__dirname, name + '-changed-original.png'), animations: 'disabled' });
      await b.selectOption('3');
      assert.equal(await workspace.locator('[data-synthesis-source]').count(), 0);
      assert.equal(await workspace.locator('[data-synthesis-preview]').count(), 2);
      assert.equal(await workspace.locator('[data-synthesis-preview="A"] [data-synthesis-observation]').textContent(), updated);
      assert.deepEqual(await page.evaluate(() => window.__toolData.solarSystem.journalSynthesis.sources), captured);
      await capture.click();
      const recaptured = await page.evaluate(() => window.__toolData.solarSystem.journalSynthesis.sources);
      assert.equal(recaptured[0].observation, updated); assert.equal(recaptured[1].labId, 'seasons');
      assert.equal(await workspace.getByLabel('My connecting claim').inputValue(), 'Keep my connecting claim.');
      // Unlinking the source never destroys the captured copy or writing.
      await page.evaluate(() => { window.__toolData.solarSystem.journalEntries[0].investigation.id = ''; window.__rerender(); });
      assert.match(await a.locator('option:checked').textContent(), /^Captured:/);
      assert.equal(await workspace.locator('[data-synthesis-source-unavailable="A"]').count(), 1);
      assert.equal(await capture.isDisabled(), true);
      await workspace.getByLabel('How evidence A and B support my claim').fill('A compares properties of worlds. B changes the illumination geometry. Both require naming the measured quantity.');
      await workspace.getByLabel('Where this comparison stops').fill('The models measure different effects and use different simplifying assumptions.');
      const prior = await page.evaluate(() => window.__toolData.solarSystem.journalEntries);
      await workspace.getByRole('button', { name: 'Save cross-lab explanation', exact: true }).click();
      assert.equal(await workspace.getByRole('button', { name: 'Cross-lab explanation saved ✓', exact: true }).isDisabled(), true);
      const final = await page.evaluate(() => window.__toolData.solarSystem);
      assert.deepEqual(final.journalEntries.slice(0, 4), prior); assert.equal(final.journalEntries.length, 5);
      assert.deepEqual(final.journalEntries[4].synthesis.sources, recaptured);
      assert.equal(final.journalDrafts.Earth.observation, 'Keep my independent Earth note.');
      const saved = page.locator('[data-solar-journal-entry]').first();
      assert.deepEqual(await saved.locator('dt').allTextContents(), ['Claim', 'Evidence A + B', 'Reasoning', 'Model boundary']);
      await workspace.getByRole('button', { name: 'Close evidence synthesis', exact: true }).click();
      await workspace.getByRole('button', { name: 'Open evidence synthesis', exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.id === 'solar-synthesis-title');
      assert.equal(await workspace.getByLabel('My connecting claim').inputValue(), 'Keep my connecting claim.');
      const metrics = await workspace.evaluate(node => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        errors: window.__events.errors,
        minimumText: Math.min(...[...node.querySelectorAll('p,span,label,button,select,div,time,summary,h4,h5,h6')].filter(n => n.getBoundingClientRect().height && [...n.childNodes].some(child => child.nodeType === 3 && child.textContent.trim()) && !n.closest('[aria-hidden="true"],.sr-only')).map(n => parseFloat(getComputedStyle(n).fontSize))),
        minimumControlHeight: Math.min(...[...node.querySelectorAll('button,select,summary')].filter(n => n.getBoundingClientRect().height).map(n => n.getBoundingClientRect().height)),
        minimumTextareaFont: Math.min(...[...node.querySelectorAll('textarea')].map(n => parseFloat(getComputedStyle(n).fontSize))),
      }));
      assert.ok(metrics.scrollWidth <= width + 1, 'Page overflow ' + name); assert.deepEqual(metrics.errors, []);
      assert.ok(metrics.minimumText >= 13, 'Small text: ' + metrics.minimumText); assert.ok(metrics.minimumControlHeight >= 43.5);
      assert.ok(metrics.minimumTextareaFont >= 16);
      results.push({ name, dark, ...metrics, fullReadingGap, comparisonGap, livePreviews: true, fullObservation: true, preservedCopies: true, changedOriginalComparison: true, orphanRetention: true, committedFocus: true, draftsPreserved: true });
      fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({ sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'), completed: results.length === 4, results }, null, 2));
      console.log('Checked ' + name); await harness.destroy(page);
    }
  } catch (error) {
    if (page && !page.isClosed()) console.error(JSON.stringify(await page.evaluate(() => ({ errors: window.__events?.errors, active: document.activeElement?.outerHTML })).catch(() => ({}))));
    throw error;
  } finally { if (page) await page.close(); if (browser) await browser.close(); await harness.stop(); if (fs.existsSync(bundle)) fs.unlinkSync(bundle); }
})().catch(error => { console.error(error); process.exitCode = 1; });
