import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1100,
  appStyles: true,
});

async function ordinaryAnswerButtons(group: Locator, expectedCount: number): Promise<Locator> {
  await expect(group).toHaveAttribute('role', 'group');
  await expect(group.getByRole('radio')).toHaveCount(0);
  await expect(group.locator('[role="radio"]')).toHaveCount(0);

  const options = group.getByRole('button');
  await expect(options).toHaveCount(expectedCount);
  const semantics = await options.evaluateAll((buttons) => buttons.map((button) => ({
    tagName: button.tagName,
    explicitRole: button.getAttribute('role'),
  })));
  expect(semantics.every(({ tagName, explicitRole }) => (
    tagName === 'BUTTON' && explicitRole !== 'radio'
  ))).toBe(true);
  return options;
}

async function expectAnsweredOptionsAndAdvance(
  page: Page,
  options: Locator,
  feedback: Locator,
  advance: Locator,
  expectedCount: number,
): Promise<void> {
  await expect(feedback).toHaveAttribute('role', 'status');
  await expect(feedback).toHaveAttribute('aria-live', 'polite');
  await expect(feedback).toBeFocused();

  const lockedState = await options.evaluateAll((buttons) => buttons.map((button) => ({
    ariaDisabled: button.getAttribute('aria-disabled'),
    tabIndex: (button as HTMLButtonElement).tabIndex,
  })));
  expect(lockedState).toHaveLength(expectedCount);
  expect(lockedState.every(({ ariaDisabled, tabIndex }) => (
    ariaDisabled === 'true' && tabIndex === -1
  ))).toBe(true);

  await page.keyboard.press('Tab');
  await expect(advance).toBeFocused();
}

test.describe('Pets Lab one-shot answer focus contracts', () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('Trainer roves modes, labels its panel, and focuses feedback then the next round', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'training',
        trMode: 'read',
        trSim: {
          idx: 0,
          choices: [],
          prob: 0.2,
          trust: 1,
          done: false,
          log: [],
        },
      },
    }, undefined, { expectCanvas: false });

    const tablist = page.getByRole('tablist', { name: 'Training mode' });
    const readingTab = tablist.getByRole('tab', { name: /Reading mode/ });
    const simulatorTab = tablist.getByRole('tab', { name: /Simulator mode/ });
    await expect(readingTab).toHaveAttribute('aria-selected', 'true');
    await expect(readingTab).toHaveAttribute('tabindex', '0');
    await expect(simulatorTab).toHaveAttribute('aria-selected', 'false');
    await expect(simulatorTab).toHaveAttribute('tabindex', '-1');

    await readingTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(simulatorTab).toBeFocused();
    await expect(simulatorTab).toHaveAttribute('aria-selected', 'true');
    await expect(simulatorTab).toHaveAttribute('tabindex', '0');
    await expect(readingTab).toHaveAttribute('aria-selected', 'false');
    await expect(readingTab).toHaveAttribute('tabindex', '-1');

    const simulatorPanel = page.locator('#pets-training-panel-sim');
    await expect(simulatorPanel).toHaveAttribute('role', 'tabpanel');
    await expect(simulatorPanel).toHaveAttribute('aria-labelledby', 'pets-training-tab-sim');
    await expect(simulatorPanel).toHaveAccessibleName(/Simulator mode/);

    const group = simulatorPanel.getByRole('group', { name: 'Choose your response' });
    const options = await ordinaryAnswerButtons(group, 4);
    await options.first().click();

    const feedback = simulatorPanel.getByRole('status').filter({ hasText: 'Result' });
    const advance = simulatorPanel.getByRole('button', { name: /Next round/ });
    await expectAnsweredOptionsAndAdvance(page, options, feedback, advance, 4);
    await advance.click();

    const nextPrompt = simulatorPanel.getByText(
      'Your puppy is sniffing the corner of the rug, ignoring you.',
      { exact: true },
    );
    await expect(nextPrompt).toBeFocused();
    await expect.poll(async () => page.evaluate(
      () => (window as any).__toolData.petsLab.trSim.idx,
    )).toBe(1);
  });

  test('Household Hazard Sleuth focuses coaching then the next vignette', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'nutrition',
        tfsOpen: true,
        tfsIdx: 0,
        tfsSeed: 1,
        tfsAns: false,
        tfsPick: null,
        tfsScore: 0,
        tfsRounds: 0,
        tfsStreak: 0,
        tfsBest: 0,
        tfsShown: [0],
      },
    }, undefined, { expectCanvas: false });

    const game = page.getByRole('region', { name: 'Household Hazard Sleuth quiz game' });
    const group = game.getByRole('group', { name: 'Choose the best hazard pattern' });
    const options = await ordinaryAnswerButtons(group, 5);
    await options.first().click();

    const feedback = game.getByRole('status');
    const advance = game.getByRole('button', { name: /Next vignette/ });
    await expectAnsweredOptionsAndAdvance(page, options, feedback, advance, 5);
    await advance.click();

    const nextPrompt = game.getByText('A handful of macadamia nuts', { exact: true });
    await expect(nextPrompt).toBeFocused();
    await expect.poll(async () => page.evaluate(
      () => (window as any).__toolData.petsLab.tfsIdx,
    )).toBe(7);
  });

  test('Lifespan Match focuses coaching then the next species', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'lifespan',
        lsIdx: 0,
        lsSeed: 1,
        lsAns: false,
        lsPick: null,
        lsScore: 0,
        lsRounds: 0,
        lsStreak: 0,
        lsBest: 0,
        lsShown: [0],
      },
    }, undefined, { expectCanvas: false });

    const view = page.locator('.petslab-life-view');
    const group = view.getByRole('group', { name: 'Pick the lifespan range' });
    const options = await ordinaryAnswerButtons(group, 5);
    await options.first().click();

    const feedback = view.getByRole('status');
    const advance = view.getByRole('button', { name: /Next species/ });
    await expectAnsweredOptionsAndAdvance(page, options, feedback, advance, 5);
    await advance.click();

    const nextPrompt = view.getByText('Guinea pig', { exact: true });
    await expect(nextPrompt).toBeFocused();
    await expect.poll(async () => page.evaluate(
      () => (window as any).__toolData.petsLab.lsIdx,
    )).toBe(7);
  });

  test('Care Sim focuses consequences then the next day prompt', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'careSim',
        careSim: {
          species: 'dog',
          day: 0,
          choices: [],
          phys: 50,
          ment: 50,
          soc: 50,
          env: 50,
          en: 100,
          money: 800,
          startMoney: 800,
          lowMoney: false,
          tiredCare: 0,
          done: false,
          dailyInteractions: {},
        },
      },
    }, undefined, { expectCanvas: false });

    const group = page.getByRole('group', { name: 'Choose your action' });
    const options = await ordinaryAnswerButtons(group, 3);
    await options.first().click();

    const feedback = page.getByRole('status').filter({ hasText: 'What happens' });
    const advance = page.getByRole('button', { name: /Next day/ });
    await expectAnsweredOptionsAndAdvance(page, options, feedback, advance, 3);
    await advance.click();

    const nextPrompt = page.getByText(
      'A friend invites you to a movie that starts at your usual evening walk time. Walks are 45 min for your high-energy dog.',
      { exact: true },
    );
    await expect(nextPrompt).toBeFocused();
    await expect.poll(async () => page.evaluate(
      () => (window as any).__toolData.petsLab.careSim.day,
    )).toBe(1);
  });

  test('Knowledge Quiz focuses its explanation then the next question', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'quiz',
        quizState: {
          idx: 0,
          score: 0,
          answered: false,
          lastChoice: null,
          missedIds: [],
          reviewIds: [],
          mode: 'all',
          bestPct: 0,
        },
      },
    }, undefined, { expectCanvas: false });

    const group = page.getByRole('group', { name: 'Choose the best answer' });
    const options = await ordinaryAnswerButtons(group, 4);
    await options.first().click();

    const feedback = page.locator('.petslab-quiz-feedback');
    const advance = page.getByRole('button', { name: /Next question/ });
    await expectAnsweredOptionsAndAdvance(page, options, feedback, advance, 4);
    await advance.click();

    const nextPrompt = page.locator('.petslab-quiz-question-heading');
    await expect(nextPrompt).toBeFocused();
    await expect(nextPrompt).toContainText('Why do cats need taurine');
    await expect.poll(async () => page.evaluate(
      () => (window as any).__toolData.petsLab.quizState.idx,
    )).toBe(1);
  });
});
