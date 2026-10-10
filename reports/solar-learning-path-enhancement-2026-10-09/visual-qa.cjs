const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { buildSync } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), bundle = path.join(__dirname, 'harness.cjs'); process.chdir(root);
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const fixtures = { journalEntries: [{ planet: 'Earth', observation: 'Keep this observation.', timestamp: 1700000000000 }],
  journalDrafts: { Earth: { observation: 'Keep this draft.' } }, journalSynthesis: { claim: 'Keep this claim.' },
  vocabLookedUp: ['regolith'], vocabSelected: 'regolith', vocabQuery: 'moon', vocabFilter: 'viewed',
  mc_choice_Earth: false, mc_answered_Earth: true, compare1: 'Earth', compare2: 'Jupiter',
  compareReasoningDrafts: { 'Earth:Jupiter': 'Keep this comparison.' }, orr_time: 0.7 };
(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1400, appStyles: true, layout: 'document' });
  let browser, page; const results = [];
  try {
    await harness.start(); browser = await chromium.launch(); page = await browser.newPage({ deviceScaleFactor: 1 });
    page.setDefaultTimeout(60000); await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, dark] of [[1060, true], [1060, false], [320, true], [320, false]]) {
      const name = `learning-path-${width}-${dark ? 'dark' : 'light'}`; console.log('Starting ' + name);
      await page.setViewportSize({ width, height: 1400 }); await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node, value) => node.style.width = value + 'px', width);
      await page.evaluate(({ dark, fixtures }) => {
        const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        window.__mount({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
          sidebar: true, paused: true, selectedPlanet: 'Earth', viewTab: 'overview', ...fixtures } });
        window.__ctx.isDark = dark; window.__ctx.t = (key, fallback) => worlds.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
        document.documentElement.classList.toggle('dark', dark); window.__rerender();
      }, { dark, fixtures });
      const workspace = page.locator('[data-solar-learning-path]'), free = workspace.locator('[data-path-free]');
      const checks = workspace.locator('[data-path-check]'), resume = workspace.locator('[data-path-resume]');
      async function choose(id) { await workspace.locator('[data-path-option="' + id + '"]').focus(); await page.keyboard.press('Enter'); await page.waitForFunction(() => document.activeElement?.id === 'solar-learning-path-guide-title'); }
      async function check(index) { await checks.nth(index).focus(); await page.keyboard.press('Space'); }
      assert.equal(await workspace.locator('[data-path-current]').textContent(), 'Free Explore'); assert.equal(await free.isDisabled(), true);
      assert.equal(await workspace.locator('[data-path-guide]').count(), 0);
      assert.equal(await workspace.locator('.solar-path-options').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), width > 640 ? 3 : 1);
      await choose('tour_guide'); assert.equal(await checks.count(), 5);
      assert.deepEqual(await workspace.locator('[data-path-explore]').evaluateAll(nodes => nodes.map(node => node.dataset.pathExplore)), ['Earth', 'Mars', 'Jupiter', 'Saturn', 'Pluto']);
      await check(0); await check(2);
      assert.equal(await workspace.locator('[data-path-progress]').textContent(), '2 of 5 steps checked');
      assert.equal(await workspace.getByRole('progressbar').getAttribute('aria-valuenow'), '2');
      const beforeResume = await page.evaluate(() => window.__toolData.solarSystem);
      await resume.click(); await page.waitForFunction(() => document.activeElement?.dataset.pathCheck === '1');
      assert.deepEqual(await page.evaluate(() => window.__toolData.solarSystem), beforeResume);
      await page.keyboard.press('Space'); assert.equal(await workspace.locator('[data-path-progress]').textContent(), '3 of 5 steps checked');
      await workspace.screenshot({ path: path.join(__dirname, name + '-tour.png'), animations: 'disabled' });
      const history = await page.evaluate(() => window.__toolData.solarSystem.learningPathChecks);
      const explore = workspace.locator('[data-path-explore="Saturn"]');
      await explore.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-world-detail-title' && document.activeElement.textContent === 'Saturn');
      assert.equal(await page.evaluate(() => window.__toolData.solarSystem.viewTab), 'overview');
      assert.deepEqual(await page.evaluate(() => window.__toolData.solarSystem.learningPathChecks), history);
      await page.locator('[data-learning-path-return]').click();
      await page.waitForFunction(() => document.activeElement?.dataset.pathExplore === 'Saturn');
      await choose('explorer'); assert.deepEqual(await checks.evaluateAll(nodes => nodes.map(node => node.checked)), [false, false, false, false, false]);
      assert.equal(await workspace.locator('[data-path-explore]').count(), 0); await check(2);
      await free.click(); assert.equal(await workspace.locator('[data-path-guide]').count(), 0);
      assert.equal(await workspace.locator('[data-path-current]').textContent(), 'Free Explore');
      assert.equal(await workspace.locator('[data-path-option][aria-pressed="true"]').count(), 0);
      await choose('researcher'); for (let index = 0; index < 5; index++) await check(index);
      assert.equal(await resume.isDisabled(), true); assert.equal(await resume.textContent(), 'All steps checked');
      assert.equal(await workspace.getByRole('progressbar').getAttribute('aria-valuenow'), '5');
      await workspace.screenshot({ path: path.join(__dirname, name + '-researcher.png'), animations: 'disabled' });
      await check(4); await resume.click(); await page.waitForFunction(() => document.activeElement?.dataset.pathCheck === '4');
      await choose('tour_guide'); assert.deepEqual(await checks.evaluateAll(nodes => nodes.map(node => node.checked)), [true, true, true, false, false]);
      await workspace.locator('[data-path-option="tour_guide"]').click(); assert.equal(await workspace.locator('[data-path-guide]').count(), 0);
      await choose('tour_guide');
      const final = await page.evaluate(() => window.__toolData.solarSystem);
      assert.deepEqual(final.learningPathChecks, { tour_guide: [true, true, true, false, false], explorer: [false, false, true, false, false], researcher: [true, true, true, true, false] });
      for (const key of Object.keys(fixtures)) assert.deepEqual(final[key], fixtures[key]);
      const metrics = await workspace.evaluate(node => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        errors: window.__events.errors,
        minimumText: Math.min(...[...node.querySelectorAll('p,span,label,button,strong,h4,h5')].filter(n => n.getBoundingClientRect().height && [...n.childNodes].some(child => child.nodeType === 3 && child.textContent.trim()) && !n.closest('[aria-hidden="true"]')).map(n => parseFloat(getComputedStyle(n).fontSize))),
        minimumButtonHeight: Math.min(...[...node.querySelectorAll('button')].map(n => n.getBoundingClientRect().height)),
        minimumCheckboxTargetHeight: Math.min(...[...node.querySelectorAll('.solar-path-step-label')].map(n => n.getBoundingClientRect().height)),
        stepFont: parseFloat(getComputedStyle(node.querySelector('.solar-path-step-copy')).fontSize),
        overflow: [...node.querySelectorAll('p,h4,h5,button,label')].filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent),
      }));
      assert.ok(metrics.scrollWidth <= width + 1, 'Page overflow ' + name); assert.deepEqual(metrics.errors, []);
      assert.deepEqual(metrics.overflow, []); assert.ok(metrics.minimumText >= 13); assert.ok(metrics.minimumButtonHeight >= 43.5);
      assert.ok(metrics.minimumCheckboxTargetHeight >= 43.5); assert.ok(metrics.stepFont >= 16);
      results.push({ name, dark, ...metrics, separateSavedChecklists: true, reversibleChecks: true, explicitFreeExplore: true, nativeKeyboardChecklist: true,
        resumeWithoutStateChanges: true, worldLaunchWithoutCheckmarks: true, committedWorldFocus: true, connectedReturnFocus: true, preservedOtherLearning: true });
      fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({ sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'), completed: results.length === 4, results }, null, 2));
      console.log('Checked ' + name); await harness.destroy(page);
    }
  } catch (error) {
    if (page && !page.isClosed()) console.error(JSON.stringify(await page.evaluate(() => ({ errors: window.__events?.errors, active: document.activeElement?.outerHTML })).catch(() => ({}))));
    throw error;
  } finally { if (page) await page.close(); if (browser) await browser.close(); await harness.stop(); if (fs.existsSync(bundle)) fs.unlinkSync(bundle); }
})().catch(error => { console.error(error); process.exitCode = 1; });
