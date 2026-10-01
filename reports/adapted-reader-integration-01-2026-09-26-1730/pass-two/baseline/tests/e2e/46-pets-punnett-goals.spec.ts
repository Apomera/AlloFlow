import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1600,
  appStyles: true,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});

type ToolWindow = Window & { __toolData: { petsLab: Record<string, any> } };
const readPets = (page: any) => page.evaluate(() => (window as unknown as ToolWindow).__toolData.petsLab);

async function setParents(page: any, p1: string, p2: string) {
  await page.locator('#pets-gene-p1').selectOption(p1);
  await page.locator('#pets-gene-p2').selectOption(p2);
}

test.describe('Pets Punnett challenges — the sandbox gets a question', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('challenges are offered and none is solved on arrival', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'genetics' } }, undefined, { expectCanvas: false });

    const panel = page.locator('.petslab-gene-goals');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.petslab-gene-goals-progress')).toContainText('Solved 0 of 4');
    await expect(page.locator('.petslab-gene-goal-pick')).toHaveCount(4);
    // Nothing opens until a challenge is picked.
    await expect(page.locator('.petslab-gene-goal-active')).toHaveCount(0);
    await expect(page.locator('.petslab-activity-completion-hint')).toBeVisible();
  });

  test('an unsolved cross reports the gap and hides the hint until asked', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'genetics' } }, undefined, { expectCanvas: false });

    // "Two black parents, a yellow puppy" — the default BbEe x BbEe already
    // satisfies it, so move to a cross that does not.
    await setParents(page, 'BBEE', 'BBEE');
    await page.locator('.petslab-gene-goal-pick').filter({ hasText: 'yellow puppy' }).click();

    const active = page.locator('.petslab-gene-goal-active');
    await expect(active).toContainText('Not there yet');
    await expect(active).toContainText('16 black, 0 chocolate, 0 yellow');
    // The hint is a choice, not a default.
    await expect(active).not.toContainText('Hint:');
    await page.locator('.petslab-gene-goal-hint').click();
    await expect(active).toContainText('Hint:');
    await expect(active).toContainText('E locus');
  });

  test('solving a challenge explains the epistasis and records only on confirm', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'genetics' } }, undefined, { expectCanvas: false });

    await page.locator('.petslab-gene-goal-pick').filter({ hasText: 'unlike either parent' }).click();
    await setParents(page, 'bbEE', 'BBee');

    const active = page.locator('.petslab-gene-goal-active');
    await expect(active).toContainText('This cross satisfies it');
    await expect(active).toContainText('16 black, 0 chocolate, 0 yellow');
    await expect(active).toContainText('neither parent has');

    // Satisfying it on screen does not record it.
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.geneGoals || []
    ))).toEqual([]);
    await expect(page.locator('.petslab-gene-goals-progress')).toContainText('Solved 0 of 4');

    await page.locator('.petslab-gene-goal-record').click();
    await expect(page.locator('.petslab-gene-goals-progress')).toContainText('Solved 1 of 4');
    await expect(active).toContainText('Already recorded');
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.geneGoals
    ))).toEqual(['neitherParent']);
  });

  test('solving all four completes the module', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'genetics' } }, undefined, { expectCanvas: false });

    const plan: Array<[string, string, string]> = [
      ['yellow puppy', 'BbEe', 'BbEe'],
      ['unlike either parent', 'bbEE', 'BBee'],
      ['breeds true', 'BBee', 'bbee'],
      ['textbook ratio', 'BbEe', 'BbEe'],
    ];
    for (const [label, p1, p2] of plan) {
      await page.locator('.petslab-gene-goal-pick').filter({ hasText: label }).click();
      await setParents(page, p1, p2);
      await expect(page.locator('.petslab-gene-goal-active')).toContainText('This cross satisfies it');
      await page.locator('.petslab-gene-goal-record').click();
    }

    await expect(page.locator('.petslab-gene-goals-progress')).toContainText('Solved 4 of 4');
    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');

    const state = await readPets(page);
    expect(state.modulesCompleted.genetics.reason).toBe('Solved every Punnett challenge');
    const row = state.evidenceRecords.filter((r: any) => r.moduleId === 'genetics').pop();
    expect(row.kind).toBe('activity');
    expect(row.details).toMatchObject({ score: 4, total: 4 });
    expect(row.details.criterionMet).toBe(true);
  });

  test('a solved goal stays solved when the cross changes', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'genetics' } }, undefined, { expectCanvas: false });
    await page.locator('.petslab-gene-goal-pick').filter({ hasText: 'textbook ratio' }).click();
    await setParents(page, 'BbEe', 'BbEe');
    await page.locator('.petslab-gene-goal-record').click();
    await expect(page.locator('.petslab-gene-goals-progress')).toContainText('Solved 1 of 4');

    // Move away from the solving cross; history must not be rewritten.
    await setParents(page, 'BBEE', 'BBEE');
    await expect(page.locator('.petslab-gene-goals-progress')).toContainText('Solved 1 of 4');
    await expect(page.locator('.petslab-gene-goal-active')).toContainText('Not there yet');
  });

  test('a corrupt restored goal list heals', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'genetics',
        geneGoals: ['nineThreeFour', 'nineThreeFour', 'notAGoal'],
        geneGoalActive: 'notAGoal',
      },
    }, undefined, { expectCanvas: false });

    await expect(page.locator('.petslab-gene-goals-progress')).toContainText('Solved 1 of 4');
    // An unknown active id must not render an empty panel.
    await expect(page.locator('.petslab-gene-goal-active')).toHaveCount(0);
    await expect(page.locator('.petslab-complete-status')).toHaveCount(0);
  });

  test('no axe violations before or after opening a challenge', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'genetics' } }, undefined, { expectCanvas: false });
    const before = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(before.violations.map((v: any) => v.id)).toEqual([]);

    await page.locator('.petslab-gene-goal-pick').first().click();
    await expect(page.locator('.petslab-gene-goal-active')).toBeVisible();

    const after = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(after.violations.map((v: any) => v.id)).toEqual([]);
  });
});
