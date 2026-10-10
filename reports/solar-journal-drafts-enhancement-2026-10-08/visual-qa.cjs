const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { buildSync } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), bundle = path.join(__dirname, 'harness.cjs'); process.chdir(root);
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const fixtures = [
  { planet: 'Earth + Jupiter', observation: 'Jupiter has a larger diameter; its listed gravity is 2.53 g.', investigation: { id: 'compare', explanation: 'Size and gravity are different quantities.' } },
  { planet: 'Mars', observation: 'At the same height, the drop takes longer on Mars than on Earth.', investigation: { id: 'gravity', explanation: '' } },
].map((entry, index) => ({ ...entry, timestamp: 1700000000000 + index }));
const notes = { prediction: 'I thought similar worlds would have similar gravity.', observation: 'I compared Earth and Mars.\n\nThe model gives me evidence to test my prediction.', surprise: 'Size alone did not explain everything.', question: 'How would an atmosphere change the drop?' };
(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1400, appStyles: true, layout: 'document' });
  let browser, page; const results = [];
  try {
    await harness.start(); browser = await chromium.launch(); page = await browser.newPage({ deviceScaleFactor: 1 });
    page.setDefaultTimeout(120000); await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, dark] of [[1060, true], [1060, false], [320, true], [320, false]]) {
      const name = `journal-${width}-${dark ? 'dark' : 'light'}`; console.log('Starting ' + name);
      await page.setViewportSize({ width, height: 1400 }); await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node, value) => node.style.width = value + 'px', width);
      await page.evaluate(({ dark, fixtures }) => {
        const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        window.__mount({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
          sidebar: true, paused: true, selectedPlanet: 'Earth', viewTab: 'overview', showJournal: true,
          journalEntries: fixtures, missionLog: [], journalExplanationDrafts: { 1: 'Keep my drop explanation draft.' },
          compareReasoningDrafts: { 'Earth:Jupiter': 'Keep my comparison.' } } });
        window.__ctx.isDark = dark; window.__ctx.t = (key, fallback) => worlds.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
        document.documentElement.classList.toggle('dark', dark); window.__rerender();
      }, { dark, fixtures });
      const journal = page.locator('[data-solar-field-journal]'), composer = journal.locator('[data-journal-composer]');
      const save = composer.locator('[data-journal-save-manual]');
      const ids = { prediction: '#journal-predict', observation: '#journal-observe', surprise: '#journal-surprise', question: '#journal-question' };
      await composer.waitFor(); assert.equal(await save.isDisabled(), true);
      await composer.locator(ids.observation).fill('  \n '); assert.equal(await save.isDisabled(), true);
      for (const [field, value] of Object.entries(notes)) await composer.locator(ids[field]).fill(value);
      const earthKey = await composer.getAttribute('data-journal-composer');
      assert.equal(await save.isEnabled(), true);
      await journal.getByRole('button', { name: 'Close Journal', exact: true }).click(); assert.equal(await composer.count(), 0);
      await journal.getByRole('button', { name: 'Write about Earth', exact: true }).click();
      for (const [field, value] of Object.entries(notes)) assert.equal(await composer.locator(ids[field]).inputValue(), value);
      await page.getByRole('button', { name: 'Select Mars from mission control', exact: true }).click();
      for (const id of Object.values(ids)) assert.equal(await composer.locator(id).inputValue(), '');
      const marsKey = await composer.getAttribute('data-journal-composer');
      await composer.locator(ids.observation).fill('Keep this independent Mars observation.');
      await page.getByRole('button', { name: 'Select Earth from mission control', exact: true }).click();
      for (const [field, value] of Object.entries(notes)) assert.equal(await composer.locator(ids[field]).inputValue(), value);
      const columns = await composer.locator('.solar-journal-composer-fields').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
      assert.equal(columns, width > 640 ? 2 : 1, 'Balanced writing prompt layout');
      await composer.screenshot({ path: path.join(__dirname, name + '-composer.png'), animations: 'disabled' });
      await journal.getByLabel('Filter journal by investigation', { exact: true }).selectOption('gravity');
      await save.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-journal-composer-status');
      assert.equal(await save.isDisabled(), true);
      assert.match(await composer.locator('[role="status"]').textContent(), /Entry saved for Earth/);
      assert.equal(await journal.getByLabel('Filter journal by investigation', { exact: true }).inputValue(), 'all');
      const state = await page.evaluate(() => window.__toolData.solarSystem);
      assert.equal(state.journalEntries.length, 3); assert.deepEqual(state.journalEntries.slice(0, 2), fixtures);
      const entry = state.journalEntries[2]; assert.equal(entry.planet, 'Earth');
      for (const [field, value] of Object.entries(notes)) assert.equal(entry[field], value);
      assert.equal(state.journalDrafts[earthKey], undefined);
      assert.equal(state.journalDrafts[marsKey].observation, 'Keep this independent Mars observation.');
      assert.equal(state.journalExplanationDrafts[1], 'Keep my drop explanation draft.');
      assert.equal(state.compareReasoningDrafts['Earth:Jupiter'], 'Keep my comparison.');
      const saved = journal.locator('[data-solar-journal-entry]').first();
      assert.equal(await saved.getAttribute('data-journal-index'), '2');
      assert.match(await saved.locator('[data-journal-entry-context]').textContent(), /Independent field note/);
      assert.equal(await saved.locator('[data-journal-field="evidence"] dd').evaluate(node => getComputedStyle(node).whiteSpace), 'pre-wrap');
      await saved.screenshot({ path: path.join(__dirname, name + '-saved.png'), animations: 'disabled' });
      await journal.locator('[data-journal-index="1"]').screenshot({ path: path.join(__dirname, name + '-linked.png'), animations: 'disabled' });
      // Existing cross-lab review remains usable alongside the manual composer.
      const synthesis = journal.locator('[data-journal-synthesis]');
      await synthesis.getByRole('button', { name: 'Open evidence synthesis', exact: true }).click();
      await synthesis.getByLabel('Evidence A', { exact: true }).selectOption('0');
      await synthesis.getByLabel('Evidence B', { exact: true }).selectOption('1');
      await synthesis.getByRole('button', { name: 'Capture selected evidence', exact: true }).click();
      await synthesis.getByLabel('My connecting claim').fill('Diameter and gravitational acceleration describe different properties.');
      await synthesis.getByLabel('How evidence A and B support my claim').fill('The comparison lists size and gravity; the drop compares falling time at a fixed height.');
      await synthesis.getByLabel('Where this comparison stops').fill('The drop model omits atmospheric drag.');
      await synthesis.getByRole('button', { name: 'Save cross-lab explanation', exact: true }).click();
      const synthesisEntry = journal.locator('[data-solar-journal-entry]').first();
      assert.deepEqual(await synthesisEntry.locator('dt').allTextContents(), ['Claim', 'Evidence A + B', 'Reasoning', 'Model boundary']);
      assert.match(await synthesisEntry.locator('[data-journal-entry-context]').textContent(), /Source snapshots preserved/);
      const afterSynthesis = await page.evaluate(() => window.__toolData.solarSystem);
      assert.deepEqual(afterSynthesis.journalEntries.slice(0, 3), state.journalEntries);
      assert.deepEqual(afterSynthesis.journalDrafts, state.journalDrafts);
      assert.equal(afterSynthesis.journalEntries[3].synthesis.sources[0].observation, fixtures[0].observation);
      const metrics = await journal.evaluate(node => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        errors: window.__events.errors,
        minimumText: Math.min(...[...node.querySelectorAll('p,span,label,button,select,div,dt,dd,time')].filter(n => n.getBoundingClientRect().height && [...n.childNodes].some(child => child.nodeType === 3 && child.textContent.trim()) && !n.closest('[aria-hidden="true"],.sr-only')).map(n => parseFloat(getComputedStyle(n).fontSize))),
        minimumControlHeight: Math.min(...[...node.querySelectorAll('button,input,select')].filter(n => n.getBoundingClientRect().height).map(n => n.getBoundingClientRect().height)),
        minimumTextareaFont: Math.min(...[...node.querySelectorAll('textarea')].map(n => parseFloat(getComputedStyle(n).fontSize))),
      }));
      assert.ok(metrics.scrollWidth <= width + 1, 'Page overflow ' + name); assert.deepEqual(metrics.errors, []);
      assert.ok(metrics.minimumText >= 13, 'Small text: ' + metrics.minimumText); assert.ok(metrics.minimumControlHeight >= 43.5);
      assert.ok(metrics.minimumTextareaFont >= 16);
      await page.getByRole('button', { name: 'Select Mars from mission control', exact: true }).click();
      assert.equal(await composer.locator(ids.observation).inputValue(), 'Keep this independent Mars observation.');
      results.push({ name, dark, ...metrics, restoredDrafts: true, worldIsolation: true, savedParagraphs: true, savedFocus: true, preservedEntries: true, synthesisRegression: true });
      fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({ sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'), completed: results.length === 4, results }, null, 2));
      console.log('Checked ' + name); await harness.destroy(page);
    }
  } catch (error) {
    if (page && !page.isClosed()) console.error(JSON.stringify(await page.evaluate(() => ({ errors: window.__events?.errors, active: document.activeElement?.outerHTML })).catch(() => ({}))));
    throw error;
  } finally { if (page) await page.close(); if (browser) await browser.close(); await harness.stop(); if (fs.existsSync(bundle)) fs.unlinkSync(bundle); }
})().catch(error => { console.error(error); process.exitCode = 1; });
