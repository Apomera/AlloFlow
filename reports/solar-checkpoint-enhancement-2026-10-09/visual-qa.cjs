const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { buildSync } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), bundle = path.join(__dirname, 'harness.cjs'); process.chdir(root);
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const fixtures = { journalEntries: [{ planet: 'Earth', observation: 'Keep this observation.', timestamp: 1700000000000 }],
  journalDrafts: { Earth: { observation: 'Keep this draft.' } }, journalSynthesis: { claim: 'Keep this claim.' },
  vocabLookedUp: ['regolith'], vocabSelected: 'regolith', vocabQuery: 'moon', vocabFilter: 'viewed' };
(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1400, appStyles: true, layout: 'document' });
  let browser, page; const results = [];
  try {
    await harness.start(); browser = await chromium.launch(); page = await browser.newPage({ deviceScaleFactor: 1 });
    page.setDefaultTimeout(60000); await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, dark] of [[1060, true], [1060, false], [320, true], [320, false]]) {
      const name = `checkpoint-${width}-${dark ? 'dark' : 'light'}`; console.log('Starting ' + name);
      await page.setViewportSize({ width, height: 1400 }); await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node, value) => node.style.width = value + 'px', width);
      await page.evaluate(({ dark, fixtures }) => {
        const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        window.__mount({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
          sidebar: true, paused: true, selectedPlanet: 'Earth', viewTab: 'overview', misconceptionsSeen: ['unknown', 'unknown', null], ...fixtures } });
        window.__spoken = []; window.__ctx.callTTS = text => window.__spoken.push(text);
        window.__ctx.isDark = dark; window.__ctx.t = (key, fallback) => worlds.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
        document.documentElement.classList.toggle('dark', dark); window.__rerender();
      }, { dark, fixtures });
      const workspace = page.locator('[data-solar-checkpoint]'), select = workspace.getByLabel('Choose a checkpoint', { exact: true });
      const title = workspace.locator('#solar-checkpoint-feedback-title'), copy = workspace.locator('[data-checkpoint-explanation-copy]');
      const mark = workspace.getByRole('button', { name: 'Mark explanation reviewed', exact: true });
      const review = workspace.locator('[data-checkpoint-review]');
      const progress = workspace.locator('[data-checkpoint-progress]');
      async function chooseTopic(value) { await select.selectOption(value); await page.waitForFunction(() => document.activeElement?.id === 'solar-checkpoint-statement'); }
      async function answer(value) { await workspace.locator('[data-checkpoint-choice="' + value + '"]').focus(); await page.keyboard.press('Enter'); await page.waitForFunction(() => document.activeElement?.id === 'solar-checkpoint-feedback-title'); }
      async function acknowledge() { await mark.focus(); await page.keyboard.press('Enter'); await page.waitForFunction(() => document.activeElement?.id === 'solar-checkpoint-complete'); }
      assert.equal(await workspace.getAttribute('data-solar-checkpoint'), 'Earth');
      assert.equal(await select.locator('option').count(), 8); assert.equal(await progress.textContent(), '0 of 8 explanations reviewed');
      await answer('false');
      assert.match(await title.textContent(), /^Correct/); assert.match(await workspace.locator('[data-checkpoint-answer]').textContent(), /Your answer: False/);
      assert.equal(await workspace.locator('[data-checkpoint-choice="false"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await workspace.locator('[data-checkpoint-choice="true"]').isDisabled(), true);
      assert.equal(await progress.textContent(), '0 of 8 explanations reviewed');
      assert.deepEqual(await page.evaluate(() => window.__toolData.solarSystem.misconceptionsSeen), ['unknown', 'unknown', null]);
      assert.deepEqual(await page.evaluate(() => window.__spoken), []);
      const explanation = await copy.textContent(), statement = await workspace.locator('#solar-checkpoint-statement').textContent();
      await workspace.getByRole('button', { name: 'Read explanation aloud', exact: true }).click();
      assert.deepEqual(await page.evaluate(() => window.__spoken), [statement + ' ' + explanation]);
      await workspace.screenshot({ path: path.join(__dirname, name + '-correct.png'), animations: 'disabled' });
      await acknowledge();
      assert.equal(await progress.textContent(), '1 of 8 explanations reviewed'); assert.equal(await review.getAttribute('aria-expanded'), 'false');
      assert.deepEqual(await page.evaluate(() => window.__toolData.solarSystem.misconceptionsSeen), [statement]);
      assert.equal(await page.evaluate(() => window.__toolData.solarSystem.mc_answered_Earth), true);
      await review.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-checkpoint-feedback-title');
      assert.equal(await copy.textContent(), explanation); assert.equal(await mark.count(), 0);
      await review.click(); assert.equal(await copy.count(), 0); assert.equal(await progress.textContent(), '1 of 8 explanations reviewed');
      await chooseTopic('Mercury'); await answer('true');
      assert.match(await title.textContent(), /^Not quite/); assert.match(await workspace.locator('[data-checkpoint-answer]').textContent(), /Your answer: True/);
      await workspace.screenshot({ path: path.join(__dirname, name + '-explanation.png'), animations: 'disabled' });
      await chooseTopic('Pluto'); await answer('false'); await acknowledge();
      await chooseTopic('Mercury'); assert.match(await title.textContent(), /^Not quite/); await acknowledge();
      for (const topic of ['descent_gas', 'gravity', 'comparison', 'overview', 'moons']) { await chooseTopic(topic); await answer('false'); await acknowledge(); }
      assert.equal(await progress.textContent(), '8 of 8 explanations reviewed');
      assert.equal(await page.evaluate(() => window.StemLab._registry.solarSystem.questHooks.find(item => item.id === 'misconception_5').check(window.__toolData.solarSystem)), true);
      const final = await page.evaluate(() => window.__toolData.solarSystem);
      assert.equal(new Set(final.misconceptionsSeen).size, 8); assert.equal(final.mc_choice_Mercury, true); assert.equal(final.mc_choice_Earth, false);
      for (const key of Object.keys(fixtures)) assert.deepEqual(final[key], fixtures[key]);
      await workspace.screenshot({ path: path.join(__dirname, name + '-reviewed.png'), animations: 'disabled' });
      await page.evaluate(() => { window.__toolData.solarSystem.selectedPlanet = 'Pluto'; window.__rerender(); });
      assert.equal(await select.inputValue(), 'Pluto');
      await page.evaluate(() => { window.__toolData.solarSystem.selectedPlanet = 'Earth'; window.__rerender(); });
      assert.equal(await select.inputValue(), 'moons'); assert.equal(await progress.textContent(), '8 of 8 explanations reviewed');
      await review.click();
      assert.equal((await page.evaluate(() => window.__spoken)).length, 1);
      const metrics = await workspace.evaluate(node => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        errors: window.__events.errors,
        minimumText: Math.min(...[...node.querySelectorAll('p,label,button,h4,h5')].filter(n => n.getBoundingClientRect().height).map(n => parseFloat(getComputedStyle(n).fontSize))),
        minimumControlHeight: Math.min(...[...node.querySelectorAll('button,select')].filter(n => n.getBoundingClientRect().height).map(n => n.getBoundingClientRect().height)),
        selectFont: parseFloat(getComputedStyle(node.querySelector('select')).fontSize),
        overflow: [...node.querySelectorAll('p,h4,h5,button')].filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent),
      }));
      assert.ok(metrics.scrollWidth <= width + 1, 'Page overflow ' + name); assert.deepEqual(metrics.errors, []);
      assert.deepEqual(metrics.overflow, []); assert.ok(metrics.minimumText >= 13); assert.ok(metrics.minimumControlHeight >= 43.5); assert.ok(metrics.selectFont >= 16);
      results.push({ name, dark, ...metrics, bothAnswerPaths: true, explicitUniqueReview: true, allEightReachable: true, preservedFirstAnswers: true, reviewWithoutCredit: true, optInSpeech: true, committedKeyboardFocus: true, preservedOtherLearning: true });
      fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({ sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'), completed: results.length === 4, results }, null, 2));
      console.log('Checked ' + name); await harness.destroy(page);
    }
  } catch (error) {
    if (page && !page.isClosed()) console.error(JSON.stringify(await page.evaluate(() => ({ errors: window.__events?.errors, active: document.activeElement?.outerHTML })).catch(() => ({}))));
    throw error;
  } finally { if (page) await page.close(); if (browser) await browser.close(); await harness.stop(); if (fs.existsSync(bundle)) fs.unlinkSync(bundle); }
})().catch(error => { console.error(error); process.exitCode = 1; });
