import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1500,
  appStyles: true,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});

type ToolWindow = Window & { __toolData: { petsLab: Record<string, any> } };
const readPets = (page: any) => page.evaluate(() => (window as unknown as ToolWindow).__toolData.petsLab);

test.describe('Pets Take Action — commitment plan', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('an empty plan explains the cap and completes nothing', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'action' } }, undefined, { expectCanvas: false });

    const panel = page.locator('.petslab-action-plan');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('The cap is the point');
    await expect(panel.locator('.petslab-action-plan-count')).toContainText('0 of 3');
    await expect(page.locator('.petslab-action-plan-list')).toHaveCount(0);
    await expect(page.locator('.petslab-activity-completion-hint')).toBeVisible();
    // Every action offers a commitment.
    await expect(page.locator('.petslab-action-commit')).toHaveCount(10);
  });

  test('committing to one action completes the module and lists it', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'action' } }, undefined, { expectCanvas: false });

    const first = page.locator('.petslab-action-commit').first();
    await expect(first).toContainText('I will do this');
    await first.click();
    await expect(first).toContainText('In my plan');
    await expect(first).toHaveAttribute('aria-pressed', 'true');

    await expect(page.locator('.petslab-action-plan-count')).toContainText('1 of 3');
    await expect(page.locator('.petslab-action-plan-list li')).toHaveCount(1);
    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');

    const state = await readPets(page);
    expect(state.modulesCompleted.action.reason).toBe('Committed to a next action');
    expect(state.actionPlan).toHaveLength(1);
  });

  test('the cap blocks a fourth choice instead of silently dropping it', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'action' } }, undefined, { expectCanvas: false });
    const buttons = page.locator('.petslab-action-commit');

    for (let i = 0; i < 3; i += 1) await buttons.nth(i).click();
    await expect(page.locator('.petslab-action-plan-count')).toContainText('3 of 3');

    // The remaining buttons say so rather than failing quietly.
    const fourth = buttons.nth(3);
    await expect(fourth).toContainText('Plan is full');
    await expect(fourth).toBeDisabled();
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.actionPlan.length
    ))).toBe(3);

    // Removing one frees a slot again.
    await buttons.nth(0).click();
    await expect(page.locator('.petslab-action-plan-count')).toContainText('2 of 3');
    await expect(buttons.nth(3)).toBeEnabled();
  });

  test('records the plan shape but never a score', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'action' } }, undefined, { expectCanvas: false });
    // One home action and one civic action: two different scales.
    await page.locator('.petslab-action-commit').first().click();
    await page.locator('.petslab-action-commit').last().click();

    await expect(page.locator('.petslab-action-plan')).toContainText('span 2 different scales');

    const row = (await readPets(page)).evidenceRecords.filter((r: any) => r.moduleId === 'action').pop();
    expect(row.kind).toBe('activity');
    expect(row.details).toMatchObject({ chosen: 2, scales: 2 });
    expect(row.details.criterionMet).toBeUndefined();
    expect(row.details.score).toBeUndefined();
  });

  test('a single-scale plan is encouraged, not scolded', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'action' } }, undefined, { expectCanvas: false });
    await page.locator('.petslab-action-commit').first().click();
    await expect(page.locator('.petslab-action-plan')).toContainText('a fine place to start');
  });

  test('clearing empties the plan without un-completing the module', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'action' } }, undefined, { expectCanvas: false });
    await page.locator('.petslab-action-commit').first().click();
    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');

    await page.locator('.petslab-action-clear').click();
    await expect(page.locator('.petslab-action-plan-list')).toHaveCount(0);
    await expect(page.locator('.petslab-action-plan-count')).toContainText('0 of 3');
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.actionPlan
    ))).toEqual([]);
    // Completion is a record of something that happened; clearing a plan does
    // not un-happen it.
    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');
  });

  test('a corrupt restored plan heals', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'action',
        actionPlan: ['enrichment', 'enrichment', 'notAnAction', 'firstAid', 'tickPrevention', 'foster'],
      },
    }, undefined, { expectCanvas: false });

    // Duplicates and unknown ids dropped, and the cap still applies.
    await expect(page.locator('.petslab-action-plan-count')).toContainText('3 of 3');
    await expect(page.locator('.petslab-action-plan-list li')).toHaveCount(3);
  });

  test('no axe violations before or after committing', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'action' } }, undefined, { expectCanvas: false });
    const before = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(before.violations.map((v: any) => v.id)).toEqual([]);

    await page.locator('.petslab-action-commit').first().click();
    await expect(page.locator('.petslab-action-plan-list')).toBeVisible();

    const after = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(after.violations.map((v: any) => v.id)).toEqual([]);
  });
});
