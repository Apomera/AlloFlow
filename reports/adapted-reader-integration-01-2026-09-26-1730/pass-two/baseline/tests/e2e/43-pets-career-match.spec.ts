import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1400,
  appStyles: true,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});

type ToolWindow = Window & { __toolData: { petsLab: Record<string, any> } };
const readPets = (page: any) => page.evaluate(() => (window as unknown as ToolWindow).__toolData.petsLab);

// Answer every question by option index.
async function answerAll(page: any, index: number) {
  const questions = page.locator('.petslab-career-question');
  const count = await questions.count();
  for (let i = 0; i < count; i += 1) {
    const options = questions.nth(i).getByRole('button');
    const n = await options.count();
    await options.nth(Math.min(index, n - 1)).click();
  }
  return count;
}

test.describe('Pets Career Pathways — self-inventory', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('no shortlist appears until every question is answered', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'careers' } }, undefined, { expectCanvas: false });

    const panel = page.locator('.petslab-career-fit');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('it is not a recommendation');
    await expect(panel.locator('.petslab-career-fit-progress')).toContainText('Answered 0 of 5');
    await expect(page.locator('.petslab-career-result')).toHaveCount(0);
    await expect(page.locator('.petslab-activity-completion-hint')).toBeVisible();

    // One answer is not enough.
    await page.locator('.petslab-career-question').first().getByRole('button').first().click();
    await expect(panel.locator('.petslab-career-fit-progress')).toContainText('Answered 1 of 5');
    await expect(page.locator('.petslab-career-result')).toHaveCount(0);
    await expect(page.locator('.petslab-complete-status')).toHaveCount(0);
  });

  test('completing the inventory shows a ranked shortlist with its reasoning', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'careers' } }, undefined, { expectCanvas: false });
    const count = await answerAll(page, 0);
    expect(count).toBe(5);

    const result = page.locator('.petslab-career-result');
    await expect(result).toBeFocused();
    await expect(result).toContainText('Worth looking at first');
    // Three ranked rows, each naming its catch.
    await expect(result.locator('.petslab-career-result-row')).toHaveCount(3);
    await expect(result).toContainText('The catch:');
    // The arithmetic is shown, not hidden.
    await expect(result.locator('.petslab-career-why').first()).toBeVisible();
    await expect(result).toContainText('talking to somebody doing the work');

    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');
    const state = await readPets(page);
    expect(state.modulesCompleted.careers.reason).toBe('Completed the career self-inventory');
    expect(Object.keys(state.careerMatch)).toHaveLength(5);
  });

  test('records that it was completed but never a score or a verdict', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'careers' } }, undefined, { expectCanvas: false });
    await answerAll(page, 0);

    const row = (await readPets(page)).evidenceRecords.filter((r: any) => r.moduleId === 'careers').pop();
    expect(row.kind).toBe('activity');
    expect(row.details).toMatchObject({ answered: 5, total: 5 });
    // There is no right answer to what someone should be.
    expect(row.details.criterionMet).toBeUndefined();
    expect(row.details.score).toBeUndefined();
    expect(row.details.scorePct).toBeUndefined();
  });

  test('different answers produce a different shortlist', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'careers' } }, undefined, { expectCanvas: false });
    await answerAll(page, 0);
    const firstTop = await page.locator('.petslab-career-result-row').first().innerText();

    await page.locator('.petslab-career-reset').click();
    await expect(page.locator('.petslab-career-result')).toHaveCount(0);
    await answerAll(page, 3);
    const secondTop = await page.locator('.petslab-career-result-row').first().innerText();

    expect(secondTop, 'the inventory should respond to the answers').not.toBe(firstTop);
  });

  test('clearing removes the shortlist and the stored answers', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'careers' } }, undefined, { expectCanvas: false });
    await answerAll(page, 1);
    await expect(page.locator('.petslab-career-result')).toBeVisible();

    await page.locator('.petslab-career-reset').click();
    await expect(page.locator('.petslab-career-result')).toHaveCount(0);
    await expect(page.locator('.petslab-career-fit-progress')).toContainText('Answered 0 of 5');
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.careerMatch
    ))).toEqual({});
  });

  test('a corrupt restored answer heals instead of unlocking the module', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'careers',
        careerMatch: {
          school: 'NOT_AN_OPTION',
          notAQuestion: 'grad',
          setting: 'clinic',
        },
      },
    }, undefined, { expectCanvas: false });

    await expect(page.locator('.petslab-career-fit-progress')).toContainText('Answered 1 of 5');
    await expect(page.locator('.petslab-career-result')).toHaveCount(0);
    await expect(page.locator('.petslab-complete-status')).toHaveCount(0);
  });

  test('no axe violations before or after the shortlist appears', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'careers' } }, undefined, { expectCanvas: false });
    const before = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(before.violations.map((v: any) => v.id)).toEqual([]);

    await answerAll(page, 0);
    await expect(page.locator('.petslab-career-result')).toBeVisible();

    const after = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(after.violations.map((v: any) => v.id)).toEqual([]);
  });
});
