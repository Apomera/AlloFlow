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
  'dog-child-rest': 1,
  'cat-tail': 1,
  'rabbit-pain': 2,
};

const zoonosisKeys: Record<string, number> = {
  'bat-bedroom': 1,
  'litter-pregnancy': 2,
  'turtle-kitchen': 0,
  'bird-cage-dust': 3,
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
    const safety = page.locator('[data-pets-interaction-safety="pause-space-support"]');
    await expect(safety).toHaveAttribute('aria-labelledby', 'pets-interaction-safety-heading');
    await expect(safety.getByRole('heading', { name: /Pause · Space · Support/ })).toBeVisible();
    await expect(safety.locator('[data-pets-interaction-step]')).toHaveCount(3);
    await expect(safety.locator('[data-pets-child-supervision="active-adult"]')).toContainText(
      'familiar or family pet',
    );
    await expect(safety).toContainText('not a clearance test or a bite countdown');
    await expect(safety.getByRole('link')).toHaveCount(2);
    await expect(safety.getByRole('link', { name: /CDC/ })).toHaveAttribute(
      'href',
      'https://www.cdc.gov/healthy-pets/about/dogs.html',
    );
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

  test('Exposure Pathway Check gates completion, traces four routes, and focuses missed-case retry', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'zoonoses',
        zoonPractice: null,
      },
    }, undefined, { expectCanvas: false });

    const start = page.locator('[data-pets-zoon-practice="start"]');
    await expect(start.getByRole('heading', { name: /Exposure Pathway Check/ })).toBeVisible();
    await expect(start.locator('[data-pets-pathway-model="four-links"] li')).toHaveCount(4);
    await expect(start).toContainText('not medical diagnosis');
    await expect(page.locator('.petslab-activity-completion-hint')).toHaveText('Activity completion required');
    await expect(page.locator('.petslab-complete-button')).toHaveCount(0);
    expect(await page.evaluate(() => ({
      completion: (window as any).__toolData.petsLab.modulesCompleted?.zoonoses,
      evidence: ((window as any).__toolData.petsLab.evidenceRecords || []).filter((row: any) => row.moduleId === 'zoonoses'),
    }))).toEqual({ completion: undefined, evidence: [] });
    await start.getByRole('button', { name: 'Start 4-case Exposure Pathway Check' }).click();

    const question = page.locator('.petslab-zoon-question-heading');
    const feedback = page.locator('.petslab-zoon-feedback');
    await expect(question).toBeFocused();

    for (let index = 0; index < 4; index += 1) {
      const current = await page.evaluate(() => {
        const state = (window as any).__toolData.petsLab.zoonPractice;
        return { id: ['bat-bedroom', 'litter-pregnancy', 'turtle-kitchen', 'bird-cage-dust'][state.idx], idx: state.idx };
      });
      expect(current.idx).toBe(index);
      const correct = zoonosisKeys[current.id];
      const active = page.locator('[data-pets-zoon-practice="active"]');
      const optionGroup = active.getByRole('group');
      const options = optionGroup.getByRole('button');
      await expect(active.getByRole('progressbar')).toHaveAttribute('aria-valuetext', new RegExp(`Case ${index + 1} of 4`));
      await expect(optionGroup).toHaveAttribute('aria-labelledby', /-prompt$/);
      await expect(active.locator('[role="status"]')).toHaveCount(0);
      await options.nth(index === 0 ? (correct + 1) % 4 : correct).click();
      await expect(feedback).toBeFocused();
      await expect(feedback).toHaveAttribute('role', 'region');
      await expect(feedback).toContainText(index === 0 ? 'leaves part of the pathway open' : 'Safest response');
      await expect(page.locator('[data-pets-pathway-chain] [data-pets-pathway-part]')).toHaveCount(4);
      const sourceLink = active.getByRole('link');
      await expect(sourceLink).toHaveAttribute('href', /^https:\/\/www\.cdc\.gov\//);
      await expect(sourceLink).toHaveAttribute('aria-label', /opens in a new tab/);
      await expect(sourceLink).toHaveCSS('text-decoration-line', 'underline');
      await expect(sourceLink).toHaveCSS('min-height', '44px');
      const locked = await options.evaluateAll((buttons) => buttons.map((button) => ({
        disabled: button.getAttribute('aria-disabled'),
        tabIndex: (button as HTMLButtonElement).tabIndex,
      })));
      expect(locked.every((item) => item.disabled === 'true' && item.tabIndex === -1)).toBe(true);
      await page.getByRole('button', {
        name: index < 3 ? /Next pathway case/ : /See pathway result/,
      }).click();
      if (index < 3) await expect(question).toBeFocused();
    }

    const result = page.locator('.petslab-zoon-result-heading');
    await expect(result).toBeFocused();
    await expect(result).toHaveText('3 / 4 pathways interrupted');
    await expect(page.locator('[data-pets-zoon-practice="results"] [role="status"]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      const rows = pets.evidenceRecords || [];
      return {
        practice: pets.zoonPractice,
        evidence: rows[rows.length - 1],
        completion: pets.modulesCompleted?.zoonoses,
      };
    })).toEqual({
      practice: {
        idx: 4,
        answers: [2, 2, 0, 3],
        score: 3,
        done: true,
        bestPct: 75,
      },
      evidence: expect.objectContaining({
        moduleId: 'zoonoses',
        kind: 'activity',
        details: {
          score: 3,
          total: 4,
          scorePct: 75,
          bestPct: 75,
          needsPractice: 1,
          criterionMet: true,
        },
      }),
      completion: expect.objectContaining({
        reason: 'Finished all 4 Exposure Pathway decisions',
      }),
    });
    expect(JSON.stringify(await page.evaluate(() => (
      (window as any).__toolData.petsLab.zoonPractice
    )))).not.toContain('sleeping person');

    await page.getByRole('button', { name: 'Retry 1 missed pathway' }).click();
    await expect(question).toBeFocused();
    const focused = page.locator('[data-pets-zoon-retry="active"]');
    await expect(focused).toHaveAttribute('data-pets-zoon-case', 'bat-bedroom');
    await expect(focused.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '0 of 1 missed pathways cleared; 1 still in rotation',
    );

    const retryOptions = focused.getByRole('group').getByRole('button');
    await retryOptions.nth(0).click();
    await expect(feedback).toBeFocused();
    await expect(feedback).toContainText('leaves part of the pathway open');
    await page.getByRole('button', { name: 'Keep this pathway in rotation' }).click();
    await expect(question).toBeFocused();
    await expect.poll(() => page.evaluate(() => (
      (window as any).__toolData.petsLab.zoonPractice
    ))).toEqual({
      mode: 'focused', idx: 0, answers: [], score: 0, done: false,
      bestPct: 75, retryQueue: [0], retryTotal: 1,
    });

    await focused.getByRole('group').getByRole('button').nth(zoonosisKeys['bat-bedroom']).click();
    await expect(feedback).toBeFocused();
    await page.getByRole('button', { name: 'Finish focused retry' }).click();
    const focusedComplete = page.getByRole('heading', { name: 'Focused pathway retry complete' });
    await expect(focusedComplete).toBeFocused();
    await expect(page.locator('[data-pets-zoon-retry="complete"]')).toContainText(
      'does not replace the original four-case result',
    );
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        practice: pets.zoonPractice,
        evidenceCount: (pets.evidenceRecords || []).filter((row: any) => row.moduleId === 'zoonoses').length,
        completionReason: pets.modulesCompleted?.zoonoses?.reason,
      };
    })).toEqual({
      practice: {
        mode: 'focused', idx: 0, answers: [], score: 1, done: true,
        bestPct: 75, retryQueue: [], retryTotal: 1,
      },
      evidenceCount: 1,
      completionReason: 'Finished all 4 Exposure Pathway decisions',
    });

    await page.getByRole('button', { name: 'Try all 4 cases for a new target result' }).click();
    await expect(question).toBeFocused();
    await expect.poll(() => page.evaluate(() => (
      (window as any).__toolData.petsLab.zoonPractice
    ))).toEqual({ idx: 0, answers: [], score: 0, done: false, bestPct: 75 });
  });

  test('a hostile mid-session pathway update heals without forging completion or retaining raw text', async ({ page }) => {
    await harness.mount(page, {
      petsLab: { view: 'zoonoses', zoonPractice: null },
    }, undefined, { expectCanvas: false });
    await page.evaluate(() => localStorage.clear());

    const privateText = 'PRIVATE RAW EXPOSURE SHOULD NOT PERSIST';
    await page.evaluate((rawScenario) => {
      (window as any).__ctx.update('petsLab', 'zoonPractice', {
        idx: 3,
        answers: [1, 99, 0, 3],
        score: 4,
        done: true,
        bestPct: -10,
        rawScenario,
      });
    }, privateText);

    await expect(page.locator('.petslab-zoon-question-heading')).toContainText('Pregnancy and litter care');
    await expect(page.locator('.petslab-zoon-result-heading')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        practice: pets.zoonPractice,
        completion: pets.modulesCompleted?.zoonoses,
        evidence: (pets.evidenceRecords || []).filter((row: any) => row.moduleId === 'zoonoses'),
      };
    })).toEqual({
      practice: { idx: 1, answers: [1], score: 1, done: false, bestPct: 0 },
      completion: undefined,
      evidence: [],
    });

    await page.waitForTimeout(220);
    const persisted = await page.evaluate(() => {
      const storage: Record<string, string | null> = {};
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)!;
        storage[key] = localStorage.getItem(key);
      }
      return JSON.stringify({
        toolData: (window as any).__toolData.petsLab,
        windowSnapshot: (window as any).__alloflowPetsLab,
        storage,
      });
    });
    expect(persisted).not.toContain(privateText);
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
      'Keep the cat',
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
