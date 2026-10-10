const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { buildSync } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), bundle = path.join(__dirname, 'harness.cjs'); process.chdir(root);
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const fixtures = { journalEntries: [{ planet: 'Earth', observation: 'Keep this observation.', timestamp: 1700000000000 }],
  journalDrafts: { Earth: { observation: 'Keep this draft.' } }, journalSynthesis: { claim: 'Keep this claim.' },
  vocabLookedUp: ['regolith'], mc_choice_Earth: false, mc_answered_Earth: true, compare1: 'Earth', compare2: 'Jupiter',
  learningPath: 'tour_guide', learningPathChecks: { tour_guide: [true, false, true, false, false] }, orr_time: 0.7 };
(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1400, appStyles: true, layout: 'document' });
  let browser, page; const results = [];
  try {
    await harness.start(); browser = await chromium.launch(); page = await browser.newPage({ deviceScaleFactor: 1 });
    page.setDefaultTimeout(60000); await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, dark] of [[1060, true], [1060, false], [320, true], [320, false]]) {
      const name = `assignments-${width}-${dark ? 'dark' : 'light'}`; console.log('Starting ' + name);
      await page.setViewportSize({ width, height: 1400 }); await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node, value) => node.style.width = value + 'px', width);
      await page.evaluate(({ dark, fixtures }) => {
        const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        window.__mount({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
          sidebar: true, paused: true, selectedPlanet: 'Earth', viewTab: 'overview', showAssignments: false,
          asn_done_inner_planets: [0, 0, 2, '1', 88], ...fixtures } });
        window.__assignmentAwards = [];
        window.__ctx.awardXP = (...args) => window.__assignmentAwards.push(args);
        window.__ctx.isDark = dark; window.__ctx.t = (key, fallback) => worlds.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
        document.documentElement.classList.toggle('dark', dark); window.__rerender();
      }, { dark, fixtures });
      const workspace = page.locator('[data-solar-assignments]'), toggle = workspace.locator('[data-assignment-toggle]');
      const checks = workspace.locator('[data-assignment-check]'), resume = workspace.locator('[data-assignment-resume]');
      const count = id => workspace.locator('[data-assignment-count="' + id + '"]');
      async function choose(id) { await workspace.locator('[data-assignment-option="' + id + '"]').focus(); await page.keyboard.press('Enter'); await page.waitForFunction(() => document.activeElement?.id === 'solar-assignment-guide-title'); }
      async function check(index) { await checks.nth(index).focus(); await page.keyboard.press('Space'); }
      const awardCount = () => page.evaluate(() => window.__assignmentAwards.length);
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      await toggle.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-assignment-choices-title');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert.equal(await count('inner_planets').textContent(), '2 of 4 tasks checked');
      assert.equal(await workspace.locator('[data-assignment-guide]').count(), 0);
      assert.equal(await workspace.locator('.solar-assignment-options').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), width > 640 ? 2 : 1);
      await choose('inner_planets'); assert.equal(await checks.count(), 4);
      assert.deepEqual(await checks.evaluateAll(nodes => nodes.map(node => node.checked)), [true, false, true, false]);
      const beforeResume = await page.evaluate(() => window.__toolData.solarSystem);
      await resume.click(); await page.waitForFunction(() => document.activeElement?.dataset.assignmentCheck === '1');
      assert.deepEqual(await page.evaluate(() => window.__toolData.solarSystem), beforeResume);
      await page.keyboard.press('Space');
      assert.equal(await count('inner_planets').textContent(), '3 of 4 tasks checked');
      assert.equal(await workspace.getByRole('progressbar').getAttribute('aria-valuenow'), '3');
      await workspace.screenshot({ path: path.join(__dirname, name + '-progress.png'), animations: 'disabled' });
      await check(3); await page.waitForFunction(() => window.__assignmentAwards.length === 1);
      assert.equal(await resume.isDisabled(), true); assert.equal(await workspace.locator('[data-assignment-finish]').count(), 1);
      await check(3); await check(3); assert.equal(await awardCount(), 1);
      await choose('gas_giants'); await check(2);
      await workspace.locator('[data-assignment-pause]').click();
      await page.waitForFunction(() => document.activeElement?.dataset.assignmentOption === 'gas_giants');
      assert.equal(await workspace.locator('[data-assignment-guide]').count(), 0);
      assert.equal(await count('inner_planets').textContent(), '4 of 4 tasks checked');
      assert.equal(await count('gas_giants').textContent(), '1 of 4 tasks checked');
      assert.equal(await page.evaluate(() => window.StemLab._registry.solarSystem.questHooks.find(hook => hook.id === 'assignment_complete').check(window.__toolData.solarSystem)), true);
      await toggle.click(); assert.equal(await page.locator('#solar-assignment-content').isHidden(), true);
      await toggle.click(); await page.waitForFunction(() => document.activeElement?.id === 'solar-assignment-choices-title');
      await choose('habitability'); await check(1); await check(3);
      await choose('full_survey'); assert.equal(await checks.count(), 5);
      for (let index = 0; index < 5; index++) await check(index);
      await page.waitForFunction(() => window.__assignmentAwards.length === 2);
      assert.equal(await resume.isDisabled(), true); assert.equal(await workspace.getByRole('progressbar').getAttribute('aria-valuenow'), '5');
      await workspace.screenshot({ path: path.join(__dirname, name + '-complete.png'), animations: 'disabled' });
      await check(4); await resume.click(); await page.waitForFunction(() => document.activeElement?.dataset.assignmentCheck === '4');
      await choose('inner_planets'); await choose('inner_planets'); assert.equal(await workspace.locator('[data-assignment-guide]').count(), 1);
      await toggle.click(); await toggle.click(); await page.waitForFunction(() => document.activeElement?.id === 'solar-assignment-guide-title');
      assert.deepEqual(await checks.evaluateAll(nodes => nodes.map(node => node.checked)), [true, true, true, true]);
      const final = await page.evaluate(() => window.__toolData.solarSystem);
      assert.deepEqual(final.asn_done_inner_planets, [0, 1, 2, 3]); assert.deepEqual(final.asn_done_gas_giants, [2]);
      assert.deepEqual(final.asn_done_habitability, [1, 3]); assert.deepEqual(final.asn_done_full_survey, [0, 1, 2, 3]);
      for (const key of Object.keys(fixtures)) assert.deepEqual(final[key], fixtures[key]);
      assert.deepEqual(await page.evaluate(() => window.__assignmentAwards), [['solarSystem', 25], ['solarSystem', 25]]);
      const metrics = await workspace.evaluate(node => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        errors: window.__events.errors,
        minimumText: Math.min(...[...node.querySelectorAll('p,span,label,button,strong,h4,h5')].filter(n => n.getBoundingClientRect().height && [...n.childNodes].some(child => child.nodeType === 3 && child.textContent.trim()) && !n.closest('[aria-hidden="true"]')).map(n => parseFloat(getComputedStyle(n).fontSize))),
        minimumButtonHeight: Math.min(...[...node.querySelectorAll('button')].map(n => n.getBoundingClientRect().height)),
        minimumCheckboxTargetHeight: Math.min(...[...node.querySelectorAll('.solar-assignment-task-label')].map(n => n.getBoundingClientRect().height)),
        taskFont: parseFloat(getComputedStyle(node.querySelector('.solar-assignment-task-copy')).fontSize),
        overflow: [...node.querySelectorAll('p,h4,h5,button,label')].filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent),
      }));
      assert.ok(metrics.scrollWidth <= width + 1, 'Page overflow ' + name); assert.deepEqual(metrics.errors, []);
      assert.deepEqual(metrics.overflow, []); assert.ok(metrics.minimumText >= 13); assert.ok(metrics.minimumButtonHeight >= 43.5);
      assert.ok(metrics.minimumCheckboxTargetHeight >= 43.5); assert.ok(metrics.taskFont >= 16);
      results.push({ name, dark, ...metrics, separateSavedChecklists: true, reversibleChecks: true, explicitPause: true, nativeKeyboardChecklist: true,
        resumeWithoutStateChanges: true, committedChecklistFocus: true, pauseReturnsFocus: true, awardsOncePerAssignment: true, pausedQuestCompletion: true, preservedOtherLearning: true });
      fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({ sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'), completed: results.length === 4, results }, null, 2));
      console.log('Checked ' + name); await harness.destroy(page);
    }
  } catch (error) {
    if (page && !page.isClosed()) console.error(JSON.stringify(await page.evaluate(() => ({ errors: window.__events?.errors, active: document.activeElement?.outerHTML })).catch(() => ({}))));
    throw error;
  } finally { if (page) await page.close(); if (browser) await browser.close(); await harness.stop(); if (fs.existsSync(bundle)) fs.unlinkSync(bundle); }
})().catch(error => { console.error(error); process.exitCode = 1; });
