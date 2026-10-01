import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1000,
  appStyles: true,
  extraScripts: ['node_modules/axe-core/axe.min.js'],
});

const dogSignal = 'Loose body + soft eyes + open mouth + wagging mid-height tail';
const catSignal = 'Slow blink toward you';
const dogKey = `🐕 Dogs|${dogSignal}`;
const catKey = `🐈 Cats|${catSignal}`;

test.describe('Pets Lab adaptive practice and evidence', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('Body Language offers unseen and needs-practice queues with cue-based focused retry', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'bodyLang',
        blMode: 'read',
        blMissedKeys: [catKey, 'legacy|removed-signal'],
        decoderMastery: {
          [dogKey]: {
            species: '🐕 Dogs',
            signal: dogSignal,
            correctCount: 1,
            firstCorrectAt: '2026-08-26T12:00:00.000Z',
          },
        },
      },
    }, undefined, { expectCanvas: false });

    const tabs = page.getByRole('tablist', { name: 'Body language mode' });
    const referenceTab = tabs.getByRole('tab', { name: 'Reference reading mode' });
    const quizTab = tabs.getByRole('tab', { name: 'Signal practice mode' });
    await referenceTab.focus();
    await referenceTab.press('ArrowRight');
    await expect(quizTab).toBeFocused();
    await expect(quizTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveAttribute('id', 'pets-body-panel-quiz');

    const counts = page.locator('.petslab-body-practice-counts');
    await expect(counts).toContainText('1 / 27 logged once');
    await expect(counts).toContainText('25 unseen');
    await expect(counts).toContainText('1 need practice');
    await page.getByRole('button', { name: '🧠 Needs practice (up to 10 of 1)' }).click();

    await expect.poll(() => page.evaluate(() => {
      const quiz = (window as any).__toolData.petsLab.blQuiz;
      return { length: quiz.qs.length, key: quiz.qs[0].key, mode: quiz.mode };
    })).toEqual({ length: 1, key: catKey, mode: 'missed' });

    const answerGroup = page.getByRole('group', { name: 'Choose the most likely meaning' });
    await expect(answerGroup.getByRole('radio')).toHaveCount(0);
    const choices = answerGroup.getByRole('button');
    const choiceTexts = await choices.allTextContents();
    const wrongIndex = choiceTexts.findIndex((text) => !text.includes('Cat kiss'));
    expect(wrongIndex).toBeGreaterThanOrEqual(0);
    const wrongChoice = choices.nth(wrongIndex);
    await wrongChoice.click();
    await expect(wrongChoice).toHaveAttribute('aria-pressed', 'true');
    await expect(wrongChoice).toHaveAttribute('aria-disabled', 'true');
    const feedback = page.locator('.petslab-body-answer-feedback');
    await expect(feedback).toBeFocused();
    await expect(feedback).toContainText('Not quite — connect the cues');
    await expect(feedback).toContainText('Cue 1: Eyes half closed');

    await page.getByRole('button', { name: 'See score ✓' }).click();
    const review = page.locator('.petslab-body-review');
    await expect(review).toContainText(catSignal);
    await expect(review).toContainText('Eyes half closed · Body stays loose · Tail rests softly');
    await page.getByRole('button', { name: '🧠 Practice these 1 signal' }).click();

    await page.getByRole('group', { name: 'Choose the most likely meaning' })
      .getByRole('button', { name: /Cat kiss/ })
      .click();
    await expect(page.locator('.petslab-body-answer-feedback')).toContainText('Correct — connect the cues');
    await expect.poll(() => page.evaluate((key) => {
      const pets = (window as any).__toolData.petsLab;
      return {
        seen: (pets.blSeenKeys || []).includes(key),
        needsPractice: (pets.blMissedKeys || []).includes(key),
        mastered: !!pets.decoderMastery?.[key],
      };
    }, catKey)).toEqual({ seen: true, needsPractice: false, mastered: true });

    await page.getByRole('button', { name: 'See score ✓' }).click();
    await expect(page.locator('.petslab-body-review')).toHaveCount(0);
    const latestEvidence = await page.evaluate(() => {
      const rows = (window as any).__toolData.petsLab.evidenceRecords || [];
      return rows[rows.length - 1];
    });
    expect(latestEvidence).toMatchObject({
      moduleId: 'bodyLang',
      kind: 'activity',
      details: { score: 1, total: 1, scorePct: 100, practiceMode: 'missed' },
    });
    expect(latestEvidence.details.criterionMet).toBeUndefined();
  });

  test('recommended next move resumes unfinished work, then skips it once complete', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'menu',
        lastView: 'training',
        trMode: 'sim',
        trSim: {
          idx: 9,
          choices: Array.from({ length: 10 }, (_, index) => index === 9
            ? { rxn: 'treat3s', dProb: 0.1, dTrust: 0, verdict: 'Reinforced the requested behavior.' }
            : null),
          prob: 0.82,
          trust: 0.94,
          done: false,
          log: Array.from({ length: 10 }, (_, index) => ({
            rd: index + 1,
            prob: 0.28 + (index * 0.06),
            trust: 0.94,
            dProb: 0.06,
          })),
        },
        modulesVisited: {
          cats: '2026-08-26T12:00:00.000Z',
          training: '2026-08-26T12:05:00.000Z',
        },
        modulesCompleted: {
          cats: { completed: '2026-08-26T12:02:00.000Z', reason: 'Reviewed by learner' },
        },
      },
    }, undefined, { expectCanvas: false });

    const nextButton = page.locator('[data-pets-next-module-id]');
    await expect(nextButton).toHaveAttribute('data-pets-next-module-id', 'training');
    await expect(nextButton).toHaveText('Continue: Pet Training (applied)');
    await nextButton.click();
    await page.getByRole('button', { name: /See results/ }).click();
    await page.getByRole('button', { name: 'Back to Pets Lab menu' }).click();

    await expect(nextButton).toHaveAttribute('data-pets-next-module-id', 'dogs');
    await expect(nextButton).toHaveText('Start next: Dogs');
  });

  test('recommended route separates completion from an unmet learning target', async ({ page }) => {
    const completed = {
      dogs: { completed: '2026-08-26T11:00:00.000Z', reason: 'Reviewed by learner' },
      cats: { completed: '2026-08-26T11:01:00.000Z', reason: 'Reviewed by learner' },
      zoonoses: { completed: '2026-08-26T11:02:00.000Z', reason: 'Reviewed by learner' },
      service: { completed: '2026-08-26T11:03:00.000Z', reason: 'Reviewed by learner' },
      quiz: { completed: '2026-08-26T11:04:00.000Z', reason: 'Finished all quiz questions' },
    };
    await harness.mount(page, {
      petsLab: {
        view: 'menu',
        modulesCompleted: completed,
        modulesVisited: Object.fromEntries(Object.keys(completed).map((id) => [id, '2026-08-26T10:00:00.000Z'])),
        evidenceRecords: [
          {
            moduleId: 'quiz', kind: 'activity', recordedAt: '2026-08-26T11:30:00.000Z',
            details: {
              score: 12, total: 15, scorePct: 80, bestPct: 80,
              biologyCorrect: 3, biologyTotal: 3,
              behaviorCorrect: 2, behaviorTotal: 3,
              healthCorrect: 5, healthTotal: 6,
              welfareCorrect: 2, welfareTotal: 3,
              strandsMet: 4, strandsTotal: 4, criterionMet: true,
            },
          },
          {
            moduleId: 'quiz', kind: 'activity', recordedAt: '2026-08-26T12:00:00.000Z',
            details: {
              score: 8, total: 15, scorePct: 53, bestPct: 80,
              biologyCorrect: 1, biologyTotal: 3,
              behaviorCorrect: 2, behaviorTotal: 3,
              healthCorrect: 3, healthTotal: 6,
              welfareCorrect: 2, welfareTotal: 3,
              strandsMet: 3, strandsTotal: 4, criterionMet: false,
            },
          },
        ],
      },
    }, undefined, { expectCanvas: false });

    const recommendation = page.locator('.petslab-start-card');
    await expect(recommendation).toContainText('strengthen a learning target');
    const nextButton = recommendation.locator('[data-pets-next-module-id]');
    await expect(nextButton).toHaveAttribute('data-pets-next-module-id', 'quiz');
    await expect(nextButton).toHaveText('Practice target: 15-question quiz');

    const quizTile = page.locator('[data-pets-module-id="quiz"]');
    await expect(quizTile).toHaveAccessibleName(/completed; learning target needs practice/);
    await expect(quizTile.locator('.petslab-menu-tile-progress')).toHaveText('↻ Target needs practice');

    await page.getByRole('button', { name: 'Needs practice', exact: true }).click();
    const matching = page.locator('.petslab-filtered-grid [data-pets-module-id]');
    await expect(matching).toHaveCount(1);
    await expect(matching).toHaveAttribute('data-pets-module-id', 'quiz');

    await page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      (window as any).__ctx.update('petsLab', 'evidenceRecords', pets.evidenceRecords.concat([{
        moduleId: 'quiz',
        kind: 'activity',
        recordedAt: '2026-08-26T12:30:00.000Z',
        details: {
          score: 13, total: 15, scorePct: 87, bestPct: 87,
          biologyCorrect: 3, biologyTotal: 3,
          behaviorCorrect: 3, behaviorTotal: 3,
          healthCorrect: 5, healthTotal: 6,
          welfareCorrect: 2, welfareTotal: 3,
          strandsMet: 4, strandsTotal: 4, criterionMet: true,
        },
      }]));
    });
    await page.getByRole('button', { name: 'All modules', exact: true }).click();
    await expect(nextButton).toHaveAttribute('data-pets-next-module-id', 'training');
    await expect(nextButton).toHaveText('Start next: Pet Training (applied)');
  });

  test('quiz evidence separates the current attempt from the historical best', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'quiz',
        quizState: {
          idx: 14,
          score: 6,
          answered: true,
          lastChoice: 0,
          missedIds: ['q2'],
          reviewIds: [],
          mode: 'all',
          bestPct: 90,
        },
      },
    }, undefined, { expectCanvas: false });

    await page.getByRole('button', { name: /See results/ }).click();
    const evidence = await expect.poll(() => page.evaluate(() => {
      const rows = (window as any).__toolData.petsLab.evidenceRecords || [];
      return rows[rows.length - 1];
    })).toMatchObject({
      moduleId: 'quiz',
      kind: 'activity',
      details: {
        score: 6,
        total: 15,
        scorePct: 40,
        bestPct: 90,
        criterionMet: false,
      },
    });
    void evidence;

    await page.getByRole('button', { name: /Try full quiz/ }).click();
    await expect.poll(() => page.evaluate(() => {
      const quiz = (window as any).__toolData.petsLab.quizState;
      return { idx: quiz.idx, mode: quiz.mode, missedIds: quiz.missedIds };
    })).toEqual({ idx: 0, mode: 'all', missedIds: ['q2'] });
  });

  test('Teacher Guide reports formative outcomes without exposing raw learner writing', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1000 });
    await harness.mount(page, {
      petsLab: {
        view: 'teacher',
        evidenceRecords: [
          {
            id: 'training:1',
            moduleId: 'training',
            moduleLabel: 'Pet Training (applied)',
            kind: 'activity',
            summary: 'Finished the trainer',
            recordedAt: '2026-08-26T12:00:00.000Z',
            details: { rounds: 10, behaviorPct: 76, trustPct: 84, criterionMet: true },
          },
          {
            id: 'aiPractice:1',
            moduleId: 'aiPractice',
            moduleLabel: 'AI Practice',
            kind: 'activity',
            summary: 'Wrote and checked a response',
            recordedAt: '2026-08-26T12:05:00.000Z',
            details: { scenarioId: 'family-pick', draftChars: 412, feedbackSource: 'local', reviewStatus: 'teacher-review' },
          },
          {
            id: 'bodyLang:random',
            moduleId: 'bodyLang',
            moduleLabel: 'Body Language Decoder',
            kind: 'activity',
            summary: 'Random target',
            recordedAt: '2026-08-26T12:05:30.000Z',
            details: { score: 8, total: 10, scorePct: 80, practiceMode: 'random', needsPractice: 2, criterionMet: true },
          },
          {
            id: 'bodyLang:focused',
            moduleId: 'bodyLang',
            moduleLabel: 'Body Language Decoder',
            kind: 'activity',
            summary: 'Focused practice',
            recordedAt: '2026-08-26T12:05:45.000Z',
            details: { score: 2, total: 2, scorePct: 100, practiceMode: 'missed', needsPractice: 0 },
          },
          {
            id: 'careSim:1',
            moduleId: 'careSim',
            moduleLabel: 'Pet-Care Week (sim)',
            kind: 'activity',
            summary: 'Completed care week',
            recordedAt: '2026-08-26T12:05:50.000Z',
            details: {
              species: 'dog', days: 7,
              physical: 82, mental: 76, social: 79, environmental: 74,
              weakestDomain: 'Environmental', weakestPct: 74,
              moneyLeft: 118, stayedInBudget: true,
              energyLeft: 46, caregiverSustainable: true, criterionMet: true,
            },
          },
          {
            id: 'dogs:1',
            moduleId: 'dogs',
            moduleLabel: 'Dogs',
            kind: 'self-review',
            summary: 'Reviewed by learner',
            recordedAt: '2026-08-26T12:06:00.000Z',
            details: {},
          },
        ],
        modulesCompleted: {
          cost: { completed: '2026-08-25T12:00:00.000Z', reason: 'Finished in an earlier project' },
        },
        aiDrafts: { 'family-pick': 'SECRET RAW LEARNER DRAFT' },
        aiCritiques: {
          'family-pick': {
            text: 'SECRET RAW CRITIQUE',
            source: 'local',
            draftSnapshot: 'SECRET RAW LEARNER DRAFT',
            createdAt: '2026-08-26T12:05:00.000Z',
          },
        },
      },
    }, undefined, { expectCanvas: false });
    await page.locator('#wrap').evaluate((el) => { (el as HTMLElement).style.width = '320px'; });

    const report = page.locator('.petslab-evidence-report');
    await expect(report).toContainText('Evidence saved with this Pets Lab project');
    await expect(report).toContainText('Formative activity results are not grades');
    await expect(report).toContainText('does not collect a learner name');
    const cards = report.locator('.petslab-evidence-grid').getByRole('listitem');
    await expect(cards.filter({ hasText: 'Pet Training (applied)' })).toContainText('Activity target met');
    await expect(cards.filter({ hasText: 'Pet Training (applied)' })).toContainText('Behavior 76% · Trust 84% · 10 rounds');
    await expect(cards.filter({ hasText: 'Pet Training (applied)' })).toContainText('1 attempt');
    await expect(cards.filter({ hasText: 'AI Practice' })).toContainText('Evidence collected — teacher review needed');
    await expect(cards.filter({ hasText: 'Body Language Decoder' })).toContainText('Random 8/10 target met — focused signal practice recorded');
    await expect(cards.filter({ hasText: 'Body Language Decoder' })).toContainText('2 / 2 (100%) · missed set · 0 signals still need practice');
    await expect(cards.filter({ hasText: 'Body Language Decoder' })).toContainText('Random target record: 8 / 10 (80%)');
    await expect(cards.filter({ hasText: 'Body Language Decoder' })).toContainText('2 attempts');
    await expect(cards.filter({ hasText: 'Pet-Care Week (sim)' })).toContainText('Budget sustainable ($118 left)');
    await expect(cards.filter({ hasText: 'Pet-Care Week (sim)' })).toContainText('Caregiver energy 46% (sustainable)');
    await expect(cards.filter({ hasText: 'Dogs' })).toContainText('Learner reviewed — no activity criterion recorded');
    await expect(cards.filter({ hasText: 'Dogs' })).toContainText('review record');
    await expect(cards.filter({ hasText: 'Lifetime Cost Calc' })).toContainText('earlier save');
    await expect(cards.filter({ hasText: 'Lifetime Cost Calc' })).toContainText('Earlier completion — criterion result unavailable');
    await expect(page.locator('#wrap')).not.toContainText('SECRET RAW LEARNER DRAFT');
    await expect(page.locator('#wrap')).not.toContainText('SECRET RAW CRITIQUE');

    const result = await page.evaluate(async () => {
      const wrap = document.getElementById('wrap')!;
      const axeResult = await (window as any).axe.run(wrap, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      });
      return {
        width: Math.max(document.documentElement.scrollWidth, wrap.scrollWidth),
        serious: axeResult.violations
          .filter((v: any) => v.impact === 'critical' || v.impact === 'serious')
          .map((v: any) => v.id),
      };
    });
    expect(result.width).toBeLessThanOrEqual(320);
    expect(result.serious).toEqual([]);
  });
});
