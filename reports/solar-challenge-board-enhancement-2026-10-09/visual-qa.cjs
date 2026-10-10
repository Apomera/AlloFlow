const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { buildSync } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), bundle = path.join(__dirname, 'harness.cjs'); process.chdir(root);
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const complete = ['first_planet', 'visit_3', 'quiz_ace', 'compare'];
const fixtures = {
  completedChallenges: [...complete, 'first_planet', 'future_challenge'], researchPoints: 100, totalRP: 125,
  planetsVisited: ['Earth', 'Mars', 'Jupiter'], quiz: { score: 5, streak: 2 },
  missionLog: [{ text: 'Keep this observation.', kind: 'observation', world: 'Earth', time: 'Earlier' }],
  journalEntries: [{ planet: 'Earth', observation: 'Keep this observation.', timestamp: 1700000000000 }],
  journalDrafts: { Earth: { observation: 'Keep this draft.' } }, journalSynthesis: { claim: 'Keep this claim.' },
  vocabLookedUp: ['regolith'], mc_choice_Earth: false, mc_answered_Earth: true, compare1: 'Earth', compare2: 'Jupiter',
  learningPath: 'tour_guide', learningPathChecks: { tour_guide: [true, false, true, false, false] },
  activeAssignment: 'inner_planets', asn_done_inner_planets: [0, 2], assignmentRewarded: { full_survey: true }, orr_time: 0.7,
};
(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1400, appStyles: true, layout: 'document' });
  let browser, page; const results = [];
  try {
    await harness.start(); browser = await chromium.launch(); page = await browser.newPage({ deviceScaleFactor: 1 });
    page.setDefaultTimeout(60000); await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, dark] of [[1060, true], [1060, false], [320, true], [320, false]]) {
      const name = `challenge-board-${width}-${dark ? 'dark' : 'light'}`; console.log('Starting ' + name);
      await page.setViewportSize({ width, height: 1400 }); await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node, value) => node.style.width = value + 'px', width);
      await page.evaluate(({ dark, fixtures }) => {
        const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        window.__mount({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
          paused: true, selectedPlanet: 'Earth', viewTab: 'overview', showChallengeBoard: false, ...fixtures } });
        window.__ctx.isDark = dark; window.__ctx.t = (key, fallback) => worlds.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
        document.documentElement.classList.toggle('dark', dark); window.__rerender();
      }, { dark, fixtures });
      const board = page.locator('[data-solar-challenge-board]'), toggle = board.locator('[data-challenge-toggle]');
      const filter = board.locator('#solar-challenge-filter'), cards = board.locator('[data-challenge-id]');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(await board.locator('[data-challenge-count]').textContent(), '4 of 18 completed');
      assert.equal(await board.locator('[data-challenge-points]').textContent(), '100 RP');
      assert.equal(await board.locator('[role=progressbar]').getAttribute('aria-valuenow'), '4');
      await toggle.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-challenge-filter');
      assert.equal(await cards.count(), 18);
      for (const card of await cards.all()) {
        assert.ok((await card.locator('h5').textContent()).trim());
        assert.ok((await card.locator('[data-challenge-description]').textContent()).trim());
        assert.match(await card.locator('[data-challenge-reward]').textContent(), /\d+ RP (reward|earned)/);
        assert.doesNotMatch(await card.locator('.solar-challenge-icon').textContent(), /\\u/);
      }
      if (width === 1060) await board.screenshot({ path: path.join(__dirname, name + '-all.png'), animations: 'disabled' });
      await filter.selectOption('remaining');
      assert.equal(await cards.count(), 14); assert.equal(await board.locator('[data-challenge-status]').textContent(), 'Showing 14 of 18 challenges');
      assert.equal(await filter.evaluate(node => document.activeElement === node), true);
      await filter.selectOption('completed');
      assert.deepEqual(await cards.evaluateAll(nodes => nodes.map(node => node.dataset.challengeId)), complete);
      assert.deepEqual(await cards.locator('[data-challenge-state]').allTextContents(), complete.map(() => 'Completed'));
      await board.screenshot({ path: path.join(__dirname, name + '-completed.png'), animations: 'disabled' });
      const metrics = await board.evaluate(node => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        errors: window.__events.errors,
        minimumText: Math.min(...[...node.querySelectorAll('p,span,strong,button,label,h4,h5')].filter(n => n.getBoundingClientRect().height && [...n.childNodes].some(child => child.nodeType === 3 && child.textContent.trim()) && !n.closest('[aria-hidden="true"]')).map(n => parseFloat(getComputedStyle(n).fontSize))),
        minimumControlHeight: Math.min(...[...node.querySelectorAll('button,select')].map(n => n.getBoundingClientRect().height)),
        descriptionFont: parseFloat(getComputedStyle(node.querySelector('[data-challenge-description]')).fontSize),
        overflow: [...node.querySelectorAll('p,h4,h5,button,label,strong')].filter(n => n.getBoundingClientRect().height && n.scrollWidth > n.clientWidth + 1).map(n => n.textContent),
      }));
      assert.ok(metrics.scrollWidth <= width + 1, 'Page overflow ' + name); assert.deepEqual(metrics.errors, []);
      assert.deepEqual(metrics.overflow, []); assert.ok(metrics.minimumText >= 13); assert.ok(metrics.minimumControlHeight >= 43.5); assert.ok(metrics.descriptionFont >= 16);
      await toggle.click(); assert.equal(await page.locator('#solar-challenge-content').isHidden(), true);
      await toggle.click(); await page.waitForFunction(() => document.activeElement?.id === 'solar-challenge-filter');
      assert.equal(await filter.inputValue(), 'completed'); assert.equal(await cards.count(), 4);
      const final = await page.evaluate(() => window.__toolData.solarSystem);
      for (const key of Object.keys(fixtures)) assert.deepEqual(final[key], fixtures[key], key + ' preserved');
      // Full completion makes the remaining filter empty; reset leaves focus on results.
      await page.evaluate(() => {
        window.__toolData.solarSystem.completedChallenges = [...document.querySelectorAll('[data-solar-challenge-board] [data-challenge-id]')].map(node => node.dataset.challengeId);
      });
      await filter.selectOption('all');
      const allIds = await cards.evaluateAll(nodes => nodes.map(node => node.dataset.challengeId));
      await page.evaluate(ids => { window.__toolData.solarSystem.completedChallenges = ids; window.__toolData.solarSystem.challengeFilter = 'remaining'; window.__rerender(); }, allIds);
      assert.equal(await cards.count(), 0); assert.match(await board.locator('[data-challenge-empty]').textContent(), /Every challenge completed/);
      await board.locator('[data-challenge-reset]').focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-challenge-results-title');
      assert.equal(await filter.inputValue(), 'all'); assert.equal(await cards.count(), 18);
      await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
      assert.equal(await board.locator('[role=progressbar]>span').evaluate(node => getComputedStyle(node).forcedColorAdjust), 'none');
      await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' });
      results.push({ name, dark, ...metrics, nativeKeyboardControls: true, committedFocus: true, visibleRequirements: true,
        uniqueKnownCompletions: true, savedRecordsPreserved: true, persistentFilters: true, emptyRecovery: true, forcedColors: true });
      fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({ sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'), completed: results.length === 4, results }, null, 2));
      console.log('Checked ' + name); await harness.destroy(page);
    }
  } catch (error) {
    if (page && !page.isClosed()) console.error(JSON.stringify(await page.evaluate(() => ({ errors: window.__events?.errors, active: document.activeElement?.outerHTML })).catch(() => ({}))));
    throw error;
  } finally { if (page) await page.close(); if (browser) await browser.close(); await harness.stop(); if (fs.existsSync(bundle)) fs.unlinkSync(bundle); }
})().catch(error => { console.error(error); process.exitCode = 1; });
