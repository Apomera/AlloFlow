const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { buildSync } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), bundle = path.join(__dirname, 'harness.cjs'); process.chdir(root);
const source = fs.readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
const bank = new Function('__alloT', source.slice(source.indexOf('var solarShuffledOpts = function'), source.indexOf('var VOCAB')) + '\nreturn QUIZ_BANK;')((key, fallback) => fallback);
const seedQuestion = bank.find(q => q.concept === 'habitable zone');
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const fixtures = { journalEntries: [{ planet: 'Earth', observation: 'Keep this observation.', timestamp: 1700000000000 }],
  journalDrafts: { Earth: { observation: 'Keep this draft.' } }, journalSynthesis: { claim: 'Keep this claim.' },
  vocabLookedUp: ['regolith'], mc_choice_Earth: false, mc_answered_Earth: true, compare1: 'Earth', compare2: 'Jupiter',
  learningPath: 'tour_guide', learningPathChecks: { tour_guide: [true, false, true, false, false] },
  activeAssignment: 'inner_planets', asn_done_inner_planets: [0, 2], assignmentRewarded: { full_survey: true }, orr_time: 0.7 };
(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1400, appStyles: true, layout: 'document' });
  let browser, page; const results = [];
  try {
    await harness.start(); browser = await chromium.launch(); page = await browser.newPage({ deviceScaleFactor: 1 });
    page.setDefaultTimeout(60000); await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, dark] of [[1060, true], [1060, false], [320, true], [320, false]]) {
      const name = `quiz-${width}-${dark ? 'dark' : 'light'}`; console.log('Starting ' + name);
      await page.setViewportSize({ width, height: 1400 }); await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node, value) => node.style.width = value + 'px', width);
      await page.evaluate(({ dark, fixtures, seedQuestion }) => {
        const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        window.__mount({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
          paused: true, selectedPlanet: 'Earth', viewTab: 'overview',
          quiz: { ...seedQuestion, answered: false, chosen: null, correct: null, score: 1, streak: 2 },
          quizAsked: ['Which planet has the longest year?', seedQuestion.q, seedQuestion.q, 'unknown', null], ...fixtures } });
        window.__quizToasts = [];
        window.__ctx.addToast = (...args) => window.__quizToasts.push(args);
        window.StemLab.audioContext = () => null;
        window.__ctx.isDark = dark; window.__ctx.t = (key, fallback) => worlds.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
        document.documentElement.classList.toggle('dark', dark); window.__rerender();
      }, { dark, fixtures, seedQuestion });
      const quiz = page.locator('[data-solar-quiz]'), draw = quiz.locator('[data-quiz-draw]'), choices = quiz.locator('[data-quiz-option]');
      async function advance() {
        await draw.focus(); await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.activeElement?.id === 'solar-quiz-question-title');
      }
      async function answer(correct) {
        const index = await page.evaluate(correct => window.__toolData.solarSystem.quiz.opts.findIndex(opt => correct ? opt === window.__toolData.solarSystem.quiz.a : opt !== window.__toolData.solarSystem.quiz.a), correct);
        await choices.nth(index).focus(); await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.activeElement?.id === 'solar-quiz-feedback-title');
      }
      assert.equal(await draw.textContent(), 'Skip question');
      assert.equal(await quiz.locator('[data-quiz-score]').textContent(), '1');
      assert.equal(await quiz.locator('[data-quiz-streak]').textContent(), '2');
      assert.equal(await quiz.locator('[data-quiz-round-count]').textContent(), '2 of 15 questions drawn');
      assert.equal(await quiz.locator('.solar-quiz-answers').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), width > 640 ? 2 : 1);
      const initialOptions = await choices.allTextContents(); await page.evaluate(() => window.__rerender());
      assert.deepEqual(await choices.allTextContents(), initialOptions);
      await quiz.screenshot({ path: path.join(__dirname, name + '-question.png'), animations: 'disabled' });
      await answer(false);
      assert.equal(await quiz.locator('[data-quiz-score]').textContent(), '1');
      assert.equal(await quiz.locator('[data-quiz-streak]').textContent(), '0');
      assert.equal(await draw.textContent(), 'Next question');
      assert.equal(await choices.evaluateAll(nodes => nodes.every(node => node.disabled)), true);
      assert.ok((await quiz.locator('[data-quiz-feedback]').textContent()).includes(seedQuestion.wrongFeedback[seedQuestion.opts[0]]));
      assert.ok((await quiz.locator('[data-quiz-option-state="correct"]').textContent()).includes('Correct answer'));
      assert.ok((await quiz.locator('[data-quiz-option-state="review"]').textContent()).includes('Your answer'));
      await quiz.screenshot({ path: path.join(__dirname, name + '-review.png'), animations: 'disabled' });
      const metrics = await quiz.evaluate(node => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        errors: window.__events.errors,
        minimumText: Math.min(...[...node.querySelectorAll('p,span,button,strong,h4,h5,h6,summary')].filter(n => n.getBoundingClientRect().height && [...n.childNodes].some(child => child.nodeType === 3 && child.textContent.trim()) && !n.closest('[aria-hidden="true"]')).map(n => parseFloat(getComputedStyle(n).fontSize))),
        minimumButtonHeight: Math.min(...[...node.querySelectorAll('button')].map(n => n.getBoundingClientRect().height)),
        choiceFont: parseFloat(getComputedStyle(node.querySelector('.solar-quiz-answer-copy')).fontSize),
        feedbackFont: parseFloat(getComputedStyle(node.querySelector('#solar-quiz-feedback-copy p')).fontSize),
        overflow: [...node.querySelectorAll('p,h4,h5,h6,button,summary')].filter(n => n.getBoundingClientRect().height && n.scrollWidth > n.clientWidth + 1).map(n => n.textContent),
      }));
      assert.ok(metrics.scrollWidth <= width + 1, 'Page overflow ' + name); assert.deepEqual(metrics.errors, []);
      assert.deepEqual(metrics.overflow, []); assert.ok(metrics.minimumText >= 13); assert.ok(metrics.minimumButtonHeight >= 43.5);
      assert.ok(metrics.choiceFont >= 16); assert.ok(metrics.feedbackFont >= 16);
      await quiz.locator('[data-quiz-continue]').click();
      await page.waitForFunction(() => document.activeElement?.id === 'solar-quiz-question-title');
      await answer(true); assert.equal(await quiz.locator('[data-quiz-score]').textContent(), '2');
      assert.equal(await quiz.locator('[data-quiz-streak]').textContent(), '1');
      assert.ok((await quiz.locator('[data-quiz-option-state="correct"]').textContent()).includes('Your answer · Correct'));
      await quiz.screenshot({ path: path.join(__dirname, name + '-correct.png'), animations: 'disabled' });
      const roundQuestions = ['Which of these worlds has the longest year?', seedQuestion.q, await page.evaluate(() => window.__toolData.solarSystem.quiz.q)];
      while (roundQuestions.length < 15) {
        await advance(); const current = await page.evaluate(() => window.__toolData.solarSystem.quiz);
        assert.equal(roundQuestions.includes(current.q), false); roundQuestions.push(current.q);
        assert.equal(current.score, 2); assert.equal(current.streak, 1);
      }
      assert.equal(await draw.textContent(), 'Skip to next round');
      await answer(true); assert.equal(await draw.textContent(), 'Start next round');
      assert.equal(await quiz.getByRole('progressbar').getAttribute('aria-valuenow'), '15');
      await advance();
      assert.equal(await quiz.locator('[data-quiz-round-count]').textContent(), '1 of 15 questions drawn');
      const final = await page.evaluate(() => window.__toolData.solarSystem);
      assert.equal(final.quiz.score, 3); assert.equal(final.quiz.streak, 2); assert.equal(final.quizAsked.length, 1);
      assert.equal(final.quiz.answered, false);
      for (const key of Object.keys(fixtures)) assert.deepEqual(final[key], fixtures[key]);
      assert.equal(await page.evaluate(() => window.__quizToasts.filter(args => args[0].startsWith('Correct!')).length), 2);
      results.push({ name, dark, ...metrics, nativeKeyboardChoices: true, committedQuestionAndFeedbackFocus: true,
        explicitAnswerStatus: true, persistentExplanation: true, cumulativeScore: true, wrongAnswerResetsStreak: true,
        shuffledOptionsStable: true, noRepeatRound: true, legacyHistoryMapped: true, fullRoundReset: true, preservedOtherLearning: true });
      fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({ sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'), completed: results.length === 4, results }, null, 2));
      console.log('Checked ' + name); await harness.destroy(page);
    }
  } catch (error) {
    if (page && !page.isClosed()) console.error(JSON.stringify(await page.evaluate(() => ({ errors: window.__events?.errors, active: document.activeElement?.outerHTML })).catch(() => ({}))));
    throw error;
  } finally { if (page) await page.close(); if (browser) await browser.close(); await harness.stop(); if (fs.existsSync(bundle)) fs.unlinkSync(bundle); }
})().catch(error => { console.error(error); process.exitCode = 1; });
