import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1100,
  appStyles: true,
});

type ToolWindow = Window & {
  __toolData: { petsLab: Record<string, any> };
};

test.describe('Pets Lab species prediction checks', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('a wrong prediction still completes the module and explains the miss', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'dogs' } }, undefined, { expectCanvas: false });

    const check = page.locator('.petslab-species-check');
    await expect(check).toContainText('Predict first');

    // The species view is activity-gated now: no self-attest button before the
    // activity is done.
    await expect(page.locator('.petslab-complete-button')).toHaveCount(0);
    await expect(page.locator('.petslab-activity-completion-hint')).toBeVisible();

    const options = check.getByRole('group', { name: /Prediction check/ }).getByRole('button');
    await expect(options).toHaveCount(3);

    // Deliberately wrong: the between-species intuition.
    await options.filter({ hasText: 'Great Dane' }).click();
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.speciesChecks
    ))).toEqual({ dogs: { pick: 'bigger', revealed: false } });

    await check.locator('.petslab-species-check-reveal').click();

    const feedback = check.locator('[role="status"]');
    await expect(feedback).toBeFocused();
    await expect(feedback).toContainText('Not what happens');
    await expect(feedback).toContainText('REVERSES');
    // The miss note only renders on a wrong prediction.
    await expect(feedback).toContainText('meant to catch people out');

    // Being wrong does not block completion.
    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');

    const state = await page.evaluate(() => (window as unknown as ToolWindow).__toolData.petsLab);
    expect(state.speciesChecks).toEqual({ dogs: { pick: 'bigger', revealed: true } });
    expect(state.modulesCompleted.dogs.reason).toBe('Prediction check completed');

    const evidence = state.evidenceRecords.filter((row: any) => row.moduleId === 'dogs');
    expect(evidence).toHaveLength(1);
    expect(evidence[0].kind).toBe('activity');
    expect(evidence[0].details.predicted).toBe('answered');
    expect(evidence[0].details.criterionMet).toBe(false);
  });

  test('a correct prediction is marked, and the answer is always shown', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'reptiles' } }, undefined, { expectCanvas: false });

    const check = page.locator('.petslab-species-check');
    const options = check.getByRole('group', { name: /Prediction check/ }).getByRole('button');
    await options.filter({ hasText: 'UVB output fades' }).click();
    await check.locator('.petslab-species-check-reveal').click();

    const feedback = check.locator('[role="status"]');
    await expect(feedback).toContainText('Your prediction was right');
    await expect(feedback).toContainText('lose their UVB output');
    // No miss note when the prediction was right.
    await expect(feedback).not.toContainText('Date the bulb when you install it');

    const details = await page.evaluate(() => {
      const rows = (window as unknown as ToolWindow).__toolData.petsLab.evidenceRecords;
      return rows.filter((row: any) => row.moduleId === 'reptiles')[0].details;
    });
    expect(details.criterionMet).toBe(true);

    // Clearing returns to an unanswered prediction without losing completion.
    await check.locator('.petslab-species-check-retry').click();
    await expect(check.locator('.petslab-species-check-reveal')).toBeVisible();
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.speciesChecks
    ))).toEqual({});
    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');
  });

  test('skipping the prediction is recorded honestly and never claims a correct guess', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'birds' } }, undefined, { expectCanvas: false });

    const check = page.locator('.petslab-species-check');
    const reveal = check.locator('.petslab-species-check-reveal');
    await expect(reveal).toContainText('Skip the prediction');
    await reveal.click();

    const feedback = check.locator('[role="status"]');
    await expect(feedback).toContainText('You skipped the prediction');
    await expect(feedback).toContainText('PTFE');

    const details = await page.evaluate(() => {
      const rows = (window as unknown as ToolWindow).__toolData.petsLab.evidenceRecords;
      return rows.filter((row: any) => row.moduleId === 'birds')[0].details;
    });
    expect(details.predicted).toBe('skipped');
    expect(details.criterionMet).toBeUndefined();
    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');
  });

  test('a corrupt restored check heals instead of rendering an unknown pick', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'cats',
        speciesChecks: {
          cats: { pick: 'NOT_AN_OPTION', revealed: true },
          notASpecies: { pick: 'smaller', revealed: true },
        },
      },
    }, undefined, { expectCanvas: false });

    const check = page.locator('.petslab-species-check');
    // The reveal survives, the unknown pick does not, and no option is marked
    // as the student's.
    await expect(check.locator('[role="status"]')).toContainText('obligate carnivores');
    const pressed = await check
      .getByRole('group', { name: /Prediction check/ })
      .getByRole('button')
      .evaluateAll((buttons) => buttons.map((b) => b.getAttribute('aria-pressed')));
    expect(pressed.every((value) => value === 'false')).toBe(true);
  });
});
