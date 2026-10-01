import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1700,
  appStyles: true,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});

type ToolWindow = Window & { __toolData: { petsLab: Record<string, any> } };
const readPets = (page: any) => page.evaluate(() => (window as unknown as ToolWindow).__toolData.petsLab);

async function answerAll(page: any, index: number) {
  const questions = page.locator('.petslab-cost-commit-q');
  const count = await questions.count();
  for (let i = 0; i < count; i += 1) {
    const options = questions.nth(i).getByRole('button');
    const n = await options.count();
    await options.nth(Math.min(index, n - 1)).click();
  }
  return count;
}

test.describe('Pets Cost Calc — the budget reckoning', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('states the stakes and asks three questions, none answered on arrival', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'cost' } }, undefined, { expectCanvas: false });

    const panel = page.locator('.petslab-cost-commit');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('most common reason animals are given up');
    await expect(panel).toContainText('no right answers');
    await expect(panel.locator('.petslab-cost-commit-progress')).toContainText('Answered 0 of 3');
    await expect(page.locator('.petslab-cost-commit-q')).toHaveCount(3);
    await expect(page.locator('.petslab-cost-commit-note')).toHaveCount(0);
    await expect(page.locator('.petslab-activity-completion-hint')).toBeVisible();
  });

  test('the honest "we could not" answer is welcomed, not scolded', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'cost' } }, undefined, { expectCanvas: false });

    const first = page.locator('.petslab-cost-commit-q').first();
    await first.getByRole('button').filter({ hasText: 'No. Not reliably' }).click();

    const note = first.locator('.petslab-cost-commit-note');
    await expect(note).toBeFocused();
    await expect(note).toContainText('learned it for free');
    await expect(note).toContainText('not a failure');
    // It must point somewhere real rather than just closing the door.
    await expect(note).toContainText(/fostering|waiting/i);
    await expect(page.locator('.petslab-cost-commit-progress')).toContainText('Answered 1 of 3');
  });

  test('answering all three completes the module even when every answer is "we could not"', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'cost' } }, undefined, { expectCanvas: false });

    // The honest option is last on questions 1 and 2, and last on question 3.
    const questions = page.locator('.petslab-cost-commit-q');
    await questions.nth(0).getByRole('button').filter({ hasText: 'No. Not reliably' }).click();
    await questions.nth(1).getByRole('button').filter({ hasText: 'could not' }).click();
    await questions.nth(2).getByRole('button').filter({ hasText: 'I do not think anyone' }).click();

    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');
    await expect(page.locator('.petslab-cost-commit-closing')).toContainText('All three answered');
    // The closing speaks to the honest path rather than treating it as a miss.
    await expect(page.locator('.petslab-cost-commit-closing')).toContainText('Deciding not to get an animal IS a decision');

    const state = await readPets(page);
    expect(state.modulesCompleted.cost.reason).toBe('Answered every budget question');
    const row = state.evidenceRecords.filter((r: any) => r.moduleId === 'cost').pop();
    expect(row.kind).toBe('activity');
    expect(row.details).toMatchObject({ answered: 3, total: 3 });
    // Scoring this would mark the most useful answer on the page as a failure.
    expect(row.details.criterionMet).toBeUndefined();
    expect(row.details.score).toBeUndefined();
  });

  test('a confident set of answers gets a different closing note', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'cost' } }, undefined, { expectCanvas: false });
    await answerAll(page, 0);
    await expect(page.locator('.petslab-cost-commit-closing')).toContainText('researched numbers');
    await expect(page.locator('.petslab-cost-commit-closing'))
      .not.toContainText('Deciding not to get an animal IS a decision');
  });

  test('an answer locks its question and cannot be double-counted', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'cost' } }, undefined, { expectCanvas: false });
    const first = page.locator('.petslab-cost-commit-q').first();
    await first.getByRole('button').first().click();

    const locked = await first.getByRole('button').evaluateAll((buttons) =>
      buttons.every((b) => (b as HTMLButtonElement).disabled));
    expect(locked).toBe(true);
    await expect(page.locator('.petslab-cost-commit-progress')).toContainText('Answered 1 of 3');
  });

  test('clearing reopens every question', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'cost' } }, undefined, { expectCanvas: false });
    await answerAll(page, 0);
    await page.locator('.petslab-cost-commit-reset').click();
    await expect(page.locator('.petslab-cost-commit-note')).toHaveCount(0);
    await expect(page.locator('.petslab-cost-commit-progress')).toContainText('Answered 0 of 3');
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.costCommit
    ))).toEqual({});
  });

  test('a corrupt restored answer heals instead of unlocking the module', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'cost',
        costCommit: { monthly: 'NOT_AN_OPTION', notAQuestion: 'tight', emergency: 'saved' },
      },
    }, undefined, { expectCanvas: false });

    await expect(page.locator('.petslab-cost-commit-progress')).toContainText('Answered 1 of 3');
    await expect(page.locator('.petslab-cost-commit-note')).toHaveCount(1);
    await expect(page.locator('.petslab-complete-status')).toHaveCount(0);
  });

  test('no axe violations before or after answering', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'cost' } }, undefined, { expectCanvas: false });
    const before = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(before.violations.map((v: any) => v.id)).toEqual([]);

    await page.locator('.petslab-cost-commit-q').first().getByRole('button').first().click();
    await expect(page.locator('.petslab-cost-commit-note')).toHaveCount(1);

    const after = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(after.violations.map((v: any) => v.id)).toEqual([]);
  });
});
