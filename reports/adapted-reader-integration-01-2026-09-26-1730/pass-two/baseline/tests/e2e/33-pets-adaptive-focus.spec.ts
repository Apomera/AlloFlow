import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1000,
  appStyles: true,
});

const completedAt = '2026-08-26T12:00:00.000Z';

const fiveUnrelatedCompletions = {
  training: { completed: completedAt, reason: 'Finished training practice' },
  bodyLang: { completed: completedAt, reason: 'Finished decoder practice' },
  picker: { completed: completedAt, reason: 'Reviewed pet matches' },
  cost: { completed: completedAt, reason: 'Reviewed lifetime costs' },
  welfare: { completed: completedAt, reason: 'Reviewed welfare topics' },
};

test.describe('Pets Lab adaptive navigation and focus', () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('Body Language moves focus through feedback, each next question, and visible results', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'bodyLang',
        blMode: 'quiz',
      },
    }, undefined, { expectCanvas: false });

    const panel = page.locator('#pets-body-panel-quiz');
    await panel.getByRole('button', { name: /Random 10/ }).click();

    const questionHeading = panel.locator('.petslab-body-question-heading');
    await expect(questionHeading).toBeFocused();

    for (let questionIndex = 0; questionIndex < 10; questionIndex += 1) {
      const question = await page.evaluate(() => {
        const quiz = (window as any).__toolData.petsLab.blQuiz;
        const current = quiz.qs[quiz.idx];
        return {
          idx: quiz.idx,
          correct: current.correct,
          choiceCount: current.choices.length,
        };
      });

      expect(question.idx).toBe(questionIndex);
      expect(question.choiceCount).toBeGreaterThan(1);

      const answerGroup = panel.getByRole('group', { name: 'Choose the most likely meaning' });
      const choices = answerGroup.getByRole('button');
      await expect(choices).toHaveCount(question.choiceCount);

      // Keep one miss in the result strip, then answer the remaining canonical
      // questions correctly. Reading the generated quiz avoids duplicating its schema.
      const answerIndex = questionIndex === 0
        ? (question.correct + 1) % question.choiceCount
        : question.correct;
      await choices.nth(answerIndex).click();

      const feedback = panel.locator('.petslab-body-answer-feedback');
      await expect(feedback).toBeFocused();
      await expect(feedback).toHaveAttribute('role', 'status');
      await expect(feedback).toHaveAttribute('aria-live', 'polite');
      await expect(panel.locator('[role="status"]')).toHaveCount(1);
      await expect(panel.locator('[aria-live="polite"]')).toHaveCount(1);

      const lockedChoiceState = await choices.evaluateAll((buttons) => buttons.map((button) => ({
        tabIndex: (button as HTMLButtonElement).tabIndex,
        ariaDisabled: button.getAttribute('aria-disabled'),
      })));
      expect(lockedChoiceState).toHaveLength(question.choiceCount);
      expect(lockedChoiceState.every((choice) => (
        choice.tabIndex === -1 && choice.ariaDisabled === 'true'
      ))).toBe(true);

      await page.keyboard.press('Tab');
      const advance = panel.getByRole('button', {
        name: questionIndex < 9 ? /Next signal/ : /See score/,
      });
      await expect(advance).toBeFocused();
      await advance.click();

      if (questionIndex < 9) {
        await expect(questionHeading).toBeFocused();
        await expect.poll(async () => page.evaluate(
          () => (window as any).__toolData.petsLab.blQuiz.idx,
        )).toBe(questionIndex + 1);
      }
    }

    const resultsHeading = panel.locator('.petslab-body-result-heading');
    await expect(resultsHeading).toBeFocused();

    const expectedResults = Array.from(
      { length: 10 },
      (_, index) => `Q${index + 1} ${index === 0 ? '\u00d7' : '\u2713'}`,
    );
    const resultItems = panel
      .getByRole('list', { name: 'Question results' })
      .getByRole('listitem');
    await expect(resultItems).toHaveText(expectedResults);
  });

  test('five unrelated completions do not advance the guided route past foundations', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'menu',
        modulesCompleted: fiveUnrelatedCompletions,
      },
    }, undefined, { expectCanvas: false });

    const card = page.getByRole('region', { name: 'Recommended path through the lab' });
    await expect(card.locator('.petslab-route-progress')).toHaveText(/Pet-science foundations.*0 \/ 5/);
    const nextButton = card.locator('[data-pets-next-module-id]');
    await expect(nextButton).toHaveAttribute('data-pets-next-module-id', 'dogs');
    await expect(nextButton).toHaveText('Start next: Dogs');
  });

  test('resuming unfinished work outside the current route hides the route meter', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'menu',
        lastView: 'careSim',
        modulesVisited: { careSim: completedAt },
        modulesCompleted: fiveUnrelatedCompletions,
      },
    }, undefined, { expectCanvas: false });

    const card = page.getByRole('region', { name: 'Recommended path through the lab' });
    await expect(card.locator('.petslab-route-progress')).toHaveCount(0);
    await expect(card).toContainText('Best next move: finish what you started');
    const resumeButton = card.locator('[data-pets-next-module-id]');
    await expect(resumeButton).toHaveAttribute('data-pets-next-module-id', 'careSim');
    await expect(resumeButton).toHaveText('Continue: Pet-Care Week (sim)');
  });
});
