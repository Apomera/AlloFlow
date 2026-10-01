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

async function callAll(page: any, index: number) {
  const cases = page.locator('.petslab-service-case');
  const count = await cases.count();
  for (let i = 0; i < count; i += 1) {
    const options = cases.nth(i).getByRole('button');
    const n = await options.count();
    await options.nth(Math.min(index, n - 1)).click();
  }
  return count;
}

test.describe('Pets Service Animals — access calls', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('states its legal scope and hides the rule until a call is made', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'service' } }, undefined, { expectCanvas: false });

    const panel = page.locator('.petslab-service-cases');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('not legal advice');
    await expect(panel).toContainText('28 CFR');
    await expect(panel.locator('.petslab-service-progress')).toContainText('Called 0 of 5');
    await expect(page.locator('.petslab-service-feedback')).toHaveCount(0);
    await expect(page.locator('.petslab-activity-completion-hint')).toBeVisible();
    await expect(page.locator('.petslab-service-case')).toHaveCount(5);
  });

  test('demanding papers is marked unlawful and shows the two-question rule', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'service' } }, undefined, { expectCanvas: false });

    const first = page.locator('.petslab-service-case').first();
    await first.getByRole('button').filter({ hasText: 'certification or registration' }).click();

    const feedback = first.locator('.petslab-service-feedback');
    await expect(feedback).toBeFocused();
    await expect(feedback).toContainText('Not what the law allows');
    await expect(feedback).toContainText('two questions');
    // The lawful call is shown to someone who got it wrong.
    await expect(feedback).toContainText('The call:');
    await expect(feedback).toContainText('no federal certification or registration');
  });

  test('an out-of-control animal may lawfully be excluded, but not the person', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'service' } }, undefined, { expectCanvas: false });

    const second = page.locator('.petslab-service-case').nth(1);
    await second.getByRole('button').filter({ hasText: 'animal be removed' }).click();

    const feedback = second.locator('.petslab-service-feedback');
    await expect(feedback).toContainText('That is the lawful call');
    await expect(feedback).toContainText('28 CFR 36.302(c)(2)');
    await expect(feedback).toContainText('exclude the ANIMAL, not the person');
    // No redundant restatement when the student already picked it.
    await expect(feedback).not.toContainText('The call:');
  });

  test('calling every case completes the module even when every call is wrong', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'service' } }, undefined, { expectCanvas: false });
    const count = await callAll(page, 0);
    expect(count).toBe(5);

    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');
    await expect(page.locator('.petslab-service-closing')).toContainText('All five called');

    const state = await readPets(page);
    expect(state.modulesCompleted.service.reason).toBe('Ruled on every access case');
    const row = state.evidenceRecords.filter((r: any) => r.moduleId === 'service').pop();
    expect(row.kind).toBe('activity');
    expect(row.details.total).toBe(5);
    // Option 0 is the lawful call only in the first case.
    expect(row.details.score).toBeLessThan(5);
    expect(row.details.criterionMet).toBe(false);
  });

  test('clearing reopens every call', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'service' } }, undefined, { expectCanvas: false });
    await callAll(page, 0);
    await page.locator('.petslab-service-reset').click();
    await expect(page.locator('.petslab-service-feedback')).toHaveCount(0);
    await expect(page.locator('.petslab-service-progress')).toContainText('Called 0 of 5');
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.serviceCalls
    ))).toEqual({});
  });

  test('a corrupt restored call heals instead of unlocking the module', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'service',
        serviceCalls: {
          noVest: 'NOT_AN_OPTION',
          notACase: 'ask2',
          outOfControl: 'remove',
        },
      },
    }, undefined, { expectCanvas: false });

    await expect(page.locator('.petslab-service-progress')).toContainText('Called 1 of 5');
    await expect(page.locator('.petslab-service-feedback')).toHaveCount(1);
    await expect(page.locator('.petslab-complete-status')).toHaveCount(0);
  });

  test('no axe violations before or after a call', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'service' } }, undefined, { expectCanvas: false });
    const before = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(before.violations.map((v: any) => v.id)).toEqual([]);

    await page.locator('.petslab-service-case').first().getByRole('button').first().click();
    await expect(page.locator('.petslab-service-feedback')).toHaveCount(1);

    const after = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(after.violations.map((v: any) => v.id)).toEqual([]);
  });
});
