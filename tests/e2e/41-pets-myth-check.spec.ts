import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1200,
  appStyles: true,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});

type ToolWindow = Window & { __toolData: { petsLab: Record<string, any> } };

const readPets = (page: any) => page.evaluate(() => (window as unknown as ToolWindow).__toolData.petsLab);

test.describe('Pets Myths Busted — commit before the correction', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('the correction is hidden until the student commits', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'myths' } }, undefined, { expectCanvas: false });

    const cards = page.locator('.petslab-myth');
    await expect(cards).toHaveCount(11);
    // Nothing is revealed up front: that is the whole point of the view.
    await expect(page.locator('.petslab-myth-answer')).toHaveCount(0);
    await expect(page.locator('.petslab-myth-check')).toHaveCount(11);
    await expect(page.locator('.petslab-activity-completion-hint')).toBeVisible();
    await expect(page.locator('.petslab-complete-button')).toHaveCount(0);

    // Answer the first claim (a myth) as "True" = believing it.
    await cards.first().locator('.petslab-myth-true').click();
    const answer = cards.first().locator('.petslab-myth-answer');
    await expect(answer).toBeFocused();
    await expect(answer).toContainText('You believed this one');
    await expect(answer).toContainText('Mech');
    await expect(cards.first().locator('.petslab-myth-check')).toHaveCount(0);

    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.mythChecks.m0
    ))).toEqual({ said: true, revealed: true });
    await expect(page.locator('.petslab-myth-progress')).toContainText('Judged 1 of 11');
  });

  test('completing every claim records the count of myths believed', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'myths' } }, undefined, { expectCanvas: false });
    const cards = page.locator('.petslab-myth');

    // Answer everything "False": correct for the 7 myths, wrong for the 4
    // true claims. Believed must be 0 — calling a true claim false is a wrong
    // answer, not a misconception this view targets.
    for (let i = 0; i < 11; i += 1) {
      await cards.nth(i).locator('.petslab-myth-false').click();
    }

    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');
    await expect(page.locator('.petslab-myth-progress')).toContainText('Correct 7/11');
    await expect(page.locator('.petslab-myth-progress')).toContainText('No myths believed');
    await expect(page.locator('.petslab-myth-closing')).toContainText('All 11 judged');

    const state = await readPets(page);
    expect(state.modulesCompleted.myths.reason).toBe('Judged every myth claim');
    const row = state.evidenceRecords.filter((r: any) => r.moduleId === 'myths').pop();
    expect(row.kind).toBe('activity');
    expect(row.details).toMatchObject({ score: 7, total: 11, believed: 0 });
    // criterionMet is "believed nothing false", not "scored well".
    expect(row.details.criterionMet).toBe(true);
  });

  test('believing myths is reported honestly and still completes', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'myths' } }, undefined, { expectCanvas: false });
    const cards = page.locator('.petslab-myth');

    // Answer everything "True": every myth believed, every true claim right.
    for (let i = 0; i < 11; i += 1) {
      await cards.nth(i).locator('.petslab-myth-true').click();
    }

    await expect(page.locator('.petslab-myth-progress')).toContainText('7 myths you had believed');
    await expect(page.locator('.petslab-myth-closing')).toContainText('You had believed 7 of the 7 myths');
    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');

    const row = (await readPets(page)).evidenceRecords.filter((r: any) => r.moduleId === 'myths').pop();
    expect(row.details).toMatchObject({ score: 4, total: 11, believed: 7 });
    expect(row.details.criterionMet).toBe(false);
  });

  test('start over clears the answers without forging completion', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'myths' } }, undefined, { expectCanvas: false });
    const cards = page.locator('.petslab-myth');
    await cards.first().locator('.petslab-myth-false').click();
    await cards.nth(1).locator('.petslab-myth-true').click();
    await expect(page.locator('.petslab-myth-progress')).toContainText('Judged 2 of 11');

    await page.locator('.petslab-myth-reset').click();
    await expect(page.locator('.petslab-myth-answer')).toHaveCount(0);
    await expect(page.locator('.petslab-myth-check')).toHaveCount(11);
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.mythChecks
    ))).toEqual({});
  });

  test('a corrupt restored answer heals instead of unlocking the module', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'myths',
        mythChecks: {
          m0: { said: 'yes', revealed: true },
          m999: { said: false, revealed: true },
          notAKey: { said: true, revealed: true },
        },
      },
    }, undefined, { expectCanvas: false });

    // The reveal survives, the unusable answer does not, and the module is not
    // complete on the strength of a forged row. Raw __toolData still holds what
    // was seeded -- normalization happens on read -- so assert what RENDERED.
    await expect(page.locator('.petslab-myth-answer')).toHaveCount(1);
    await expect(page.locator('.petslab-complete-status')).toHaveCount(0);
    await expect(page.locator('.petslab-myth-progress')).toContainText('Judged 0 of 11');
    // The unresolvable keys contribute no card of their own.
    await expect(page.locator('.petslab-myth')).toHaveCount(11);
    await expect(page.locator('.petslab-myth-check')).toHaveCount(10);

    // A fresh answer rewrites the slot through the normalizer, dropping the junk.
    await page.locator('.petslab-myth').nth(1).locator('.petslab-myth-false').click();
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.mythChecks
    ))).toEqual({ m0: { said: null, revealed: true }, t0: { said: false, revealed: true } });
  });

  test('no axe violations before or after answering', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'myths' } }, undefined, { expectCanvas: false });
    const before = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(before.violations.map((v: any) => v.id)).toEqual([]);

    await page.locator('.petslab-myth').first().locator('.petslab-myth-true').click();
    await expect(page.locator('.petslab-myth-answer')).toHaveCount(1);

    const after = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(after.violations.map((v: any) => v.id)).toEqual([]);
  });
});
