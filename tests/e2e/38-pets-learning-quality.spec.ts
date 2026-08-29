import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1100,
  appStyles: true,
});

const contextKeys: Record<string, number> = {
  'cat-pupils': 1,
  'bird-eye-pin': 2,
  'dog-belly': 2,
  'dog-wag': 2,
  'cat-tail': 1,
  'rabbit-pain': 2,
};

test.describe('Pets Lab learning-quality enhancements', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('corrupt quiz state heals and a selected misconception gets specific coaching', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'quiz',
        quizState: {
          idx: 999,
          score: 999,
          answered: true,
          lastChoice: 999,
          mode: 'removed-mode',
          missedIds: ['q2', 'q2', 'removed'],
          reviewIds: ['removed'],
          bestPct: 999,
          history: { q1: { choice: 3, answeredAt: 'PRIVATE TIMESTAMP' } },
          responses: { q1: true, removed: true },
        },
      },
    }, undefined, { expectCanvas: false });

    const question = page.locator('.petslab-quiz-question-heading');
    await expect(question).toContainText('Roughly how long ago');
    await expect(page.locator('.petslab-quiz-result-heading')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (
      (window as any).__toolData.petsLab.quizState
    ))).toEqual({
      idx: 0,
      score: 0,
      answered: false,
      lastChoice: null,
      missedIds: ['q2'],
      reviewIds: [],
      mode: 'all',
      bestPct: 100,
      responses: { q1: true },
    });
    expect(await page.evaluate(() => (window as any).__toolData.petsLab.badges)).toBeUndefined();

    const group = page.getByRole('group', { name: 'Choose the best answer' });
    await group.getByRole('button', { name: /~500 years/ }).click();

    const feedback = page.locator('.petslab-quiz-feedback');
    await expect(feedback).toBeFocused();
    await expect(feedback).toContainText('Why this choice misses');
    await expect(feedback.locator('.petslab-quiz-choice-coaching')).toContainText(
      'modern breed records',
    );
    await expect(feedback).toContainText('Evidence-based model');
    await expect(feedback).toContainText('15,000 and 40,000 years ago');

    const choices = group.getByRole('button');
    const locked = await choices.evaluateAll((buttons) => buttons.map((button) => ({
      disabled: button.getAttribute('aria-disabled'),
      tabIndex: (button as HTMLButtonElement).tabIndex,
    })));
    expect(locked.every((item) => item.disabled === 'true' && item.tabIndex === -1)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /Next question/ })).toBeFocused();

    const persisted = JSON.stringify(await page.evaluate(() => (
      (window as any).__toolData.petsLab.quizState
    )));
    expect(persisted).not.toContain('PRIVATE TIMESTAMP');
    expect(persisted).not.toContain('modern breed records');
  });

  test('context transfer has one-shot focus and records aggregate formative evidence only', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'bodyLang',
        blMode: 'context',
        blSeenKeys: [],
        blMissedKeys: [],
        decoderMastery: {},
      },
    }, undefined, { expectCanvas: false });

    const panel = page.locator('#pets-body-panel-context');
    await panel.getByRole('button', { name: 'Start 4-case context challenge' }).click();
    const question = panel.locator('.petslab-body-context-question-heading');
    await expect(question).toBeFocused();

    const firstCorrect = await page.evaluate((keys) => {
      const state = (window as any).__toolData.petsLab.blTransfer;
      return keys[state.ids[state.idx]];
    }, contextKeys);
    let options = panel.getByRole('group', { name: 'Choose the safest next step' })
      .getByRole('button');
    await options.nth((firstCorrect + 1) % 4).click();

    const feedback = panel.locator('.petslab-body-context-feedback');
    await expect(feedback).toBeFocused();
    await expect(feedback).toContainText('Pause and repair this decision');
    await expect(feedback).toContainText('Why:');
    const firstLocked = await options.evaluateAll((buttons) => buttons.map((button) => ({
      disabled: button.getAttribute('aria-disabled'),
      tabIndex: (button as HTMLButtonElement).tabIndex,
    })));
    expect(firstLocked.every((item) => item.disabled === 'true' && item.tabIndex === -1)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(panel.getByRole('button', { name: /Next context case/ })).toBeFocused();

    for (let index = 0; index < 4; index += 1) {
      if (index > 0) {
        const correct = await page.evaluate((keys) => {
          const state = (window as any).__toolData.petsLab.blTransfer;
          return keys[state.ids[state.idx]];
        }, contextKeys);
        options = panel.getByRole('group', { name: 'Choose the safest next step' })
          .getByRole('button');
        await options.nth(correct).click();
        await expect(feedback).toBeFocused();
      }
      await panel.getByRole('button', {
        name: index < 3 ? /Next context case/ : /See context result/,
      }).click();
      if (index < 3) await expect(question).toBeFocused();
    }

    await expect(panel.locator('.petslab-body-context-result-heading')).toBeFocused();
    await expect(panel.locator('.petslab-body-context-result-heading')).toHaveText(
      '3 / 4 safest responses',
    );
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      const rows = pets.evidenceRecords || [];
      return {
        evidence: rows[rows.length - 1],
        mastery: pets.decoderMastery,
        seen: pets.blSeenKeys,
        missed: pets.blMissedKeys,
        badge: pets.badges?.pets_body_lang,
        completion: pets.modulesCompleted?.bodyLang,
      };
    })).toEqual({
      evidence: expect.objectContaining({
        moduleId: 'bodyLang',
        kind: 'activity',
        details: {
          score: 3,
          total: 4,
          scorePct: 75,
          practiceMode: 'context',
        },
      }),
      mastery: {},
      seen: [],
      missed: [],
      badge: undefined,
      completion: undefined,
    });
  });

  test('a valid full-quiz transition earns badges and strand-aware evidence', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'quiz',
        quizState: {
          idx: 0, score: 0, answered: false, lastChoice: null,
          missedIds: [], reviewIds: [], mode: 'all', bestPct: 0, responses: {},
        },
      },
    }, undefined, { expectCanvas: false });

    const correctChoiceFragments = [
      '15,000–40,000 years',
      'lost the metabolic ability to synthesize taurine',
      'Discredited — wild wolf packs are families',
      'Strictly solitary',
      'one-way air sacs',
      'Husbandry — temperature gradient',
      'task-trained for a disability',
      'Chocolate',
      'Indoor cats fed only commercial food',
      'Concentrated genetic disorders',
      'Indoor cats live substantially longer',
      'adult primary caregiver',
      'trying to defuse the social tension',
      'commonly carry and can shed Salmonella',
      'active any day above ~40°F',
    ];

    for (let index = 0; index < correctChoiceFragments.length; index += 1) {
      const group = page.getByRole('group', { name: 'Choose the best answer' });
      await group.getByRole('button').filter({
        hasText: correctChoiceFragments[index],
      }).click();
      await page.getByRole('button', {
        name: index < correctChoiceFragments.length - 1 ? /Next question/ : /See results/,
      }).click();
    }

    await expect(page.locator('.petslab-quiz-result-heading')).toBeFocused();
    await expect(page.locator('.petslab-quiz-target-status')).toContainText(
      'Full-quiz target met',
    );
    await expect(page.locator('.petslab-quiz-strands').getByRole('listitem')).toHaveCount(4);
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      const rows = pets.evidenceRecords || [];
      return {
        details: rows[rows.length - 1]?.details,
        badges: Object.keys(pets.badges || {}).sort(),
        responseCount: Object.keys(pets.quizState.responses || {}).length,
      };
    })).toEqual({
      details: {
        score: 15,
        total: 15,
        scorePct: 100,
        bestPct: 100,
        strandsMet: 4,
        strandsTotal: 4,
        biologyCorrect: 3,
        biologyTotal: 3,
        behaviorCorrect: 3,
        behaviorTotal: 3,
        healthCorrect: 6,
        healthTotal: 6,
        welfareCorrect: 3,
        welfareTotal: 3,
        criterionMet: true,
      },
      badges: ['pets_quiz_ace', 'pets_quiz_pass'],
      responseCount: 15,
    });
  });

  test('teacher priorities surface hidden needs without exposing raw work', async ({ page }) => {
    const privateDraft = 'PRIVATE LEARNER DRAFT MUST STAY OUT OF THE SUMMARY';
    await harness.mount(page, {
      petsLab: {
        view: 'teacher',
        aiDrafts: { 'family-pick': privateDraft },
        evidenceRecords: [
          {
            moduleId: 'quiz',
            kind: 'activity',
            recordedAt: '2026-08-26T12:00:00.000Z',
            details: {
              score: 9, total: 15, scorePct: 60, bestPct: 60,
              strandsMet: 2, strandsTotal: 4, criterionMet: false,
            },
          },
          {
            moduleId: 'aiPractice',
            kind: 'activity',
            recordedAt: '2026-08-26T12:01:00.000Z',
            details: {
              scenarioId: 'family-pick', draftChars: privateDraft.length,
              feedbackSource: 'local', reviewStatus: 'teacher-review',
            },
          },
          {
            moduleId: 'bodyLang',
            kind: 'activity',
            recordedAt: '2026-08-26T12:02:00.000Z',
            details: {
              score: 3, total: 4, scorePct: 75, practiceMode: 'context',
            },
          },
        ],
      },
    }, undefined, { expectCanvas: false });

    const priorities = page.locator('.petslab-teaching-priorities');
    await expect(priorities.getByRole('listitem')).toHaveCount(3);
    await expect(priorities).toContainText('2 of 4 concept strands are ready');
    await expect(priorities).toContainText('ready for teacher review');
    await expect(priorities).toContainText(
      'Context transfer practice is recorded, but the random 8/10 recognition target has not been checked',
    );
    await expect(page.locator('#wrap')).not.toContainText(privateDraft);

    await priorities.locator('[data-pets-teacher-module-id="bodyLang"]').click();
    await expect(page.locator('#pets-body-panel-quiz')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Signal practice mode' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
