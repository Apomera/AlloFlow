import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1300,
  appStyles: true,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});

type ToolWindow = Window & { __toolData: { petsLab: Record<string, any> } };
const readPets = (page: any) => page.evaluate(() => (window as unknown as ToolWindow).__toolData.petsLab);

const TOPICS = ['spayNeuter', 'adoption', 'declawing', 'outdoorCats'];

async function decideCurrentTopic(page: any, index: number) {
  const card = page.locator('.petslab-welfare-apply');
  await card.getByRole('group', { name: 'Choose a response' })
    .getByRole('button').nth(index).click();
  await expect(card.locator('.petslab-welfare-apply-feedback')).toBeVisible();
}

test.describe('Pets Welfare & Ethics — apply the evidence', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('a weaker choice is named as such and shown the strongest answer', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'welfare' } }, undefined, { expectCanvas: false });

    const card = page.locator('.petslab-welfare-apply');
    await expect(card).toContainText('Use it in a real conversation');
    await expect(card.locator('.petslab-welfare-apply-progress')).toContainText('Decided 0 of 4');
    await expect(page.locator('.petslab-activity-completion-hint')).toBeVisible();

    // "They are right" on spay/neuter is the miss.
    await card.getByRole('group', { name: 'Choose a response' })
      .getByRole('button').filter({ hasText: 'if every kitten gets a home' }).click();

    const feedback = card.locator('.petslab-welfare-apply-feedback');
    await expect(feedback).toBeFocused();
    await expect(feedback).toContainText('The evidence does not support this');
    // The student must be able to see what the strongest answer was.
    await expect(feedback).toContainText('Strongest:');
    await expect(feedback).toContainText('Evidence:');

    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.welfareApply
    ))).toEqual({ spayNeuter: 'homes' });
    await expect(card.locator('.petslab-welfare-apply-progress')).toContainText('Decided 1 of 4');
  });

  test('the strongest choice is marked and does not repeat itself back', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'welfare', welfareSec: 'declawing' } }, undefined, { expectCanvas: false });
    const card = page.locator('.petslab-welfare-apply');
    await card.getByRole('group', { name: 'Choose a response' })
      .getByRole('button').filter({ hasText: 'amputates the last bone' }).click();

    const feedback = card.locator('.petslab-welfare-apply-feedback');
    await expect(feedback).toContainText('This is the strongest response');
    // No redundant "Strongest:" block when the student already picked it.
    await expect(feedback).not.toContainText('Strongest:');
  });

  test('deciding all four topics completes the module on decisions, not on being right', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'welfare' } }, undefined, { expectCanvas: false });

    // Pick the FIRST option on every topic. That is the weakest answer on
    // several of them, so completion must not depend on picking well.
    for (const topic of TOPICS) {
      await page.locator('#pets-welfare-tab-' + topic).click();
      await decideCurrentTopic(page, 0);
    }

    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');
    const state = await readPets(page);
    expect(state.modulesCompleted.welfare.reason).toBe('Decided all four welfare scenarios');
    expect(Object.keys(state.welfareApply).sort()).toEqual([...TOPICS].sort());

    // The Welfare-Aware badge used to be awarded for clicking all four tabs.
    // It now needs a decision on each topic.
    expect(state.badges.pets_welfare_aware).toBeTruthy();

    const row = state.evidenceRecords.filter((r: any) => r.moduleId === 'welfare').pop();
    expect(row.kind).toBe('activity');
    expect(row.details.total).toBe(4);
    expect(row.details.score).toBeLessThan(4);
    expect(row.details.criterionMet).toBe(false);
  });

  test('picking the strongest answer everywhere records a full score', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'welfare' } }, undefined, { expectCanvas: false });
    const best: Record<string, string> = {
      spayNeuter: 'prevents pyometra',
      adoption: 'breed-specific rescues exist',
      declawing: 'amputates the last bone',
      outdoorCats: 'unmet need rather than a need for outdoors',
    };
    for (const topic of TOPICS) {
      await page.locator('#pets-welfare-tab-' + topic).click();
      await page.locator('.petslab-welfare-apply')
        .getByRole('group', { name: 'Choose a response' })
        .getByRole('button').filter({ hasText: best[topic] }).click();
    }
    const row = (await readPets(page)).evidenceRecords.filter((r: any) => r.moduleId === 'welfare').pop();
    expect(row.details).toMatchObject({ score: 4, total: 4 });
    expect(row.details.criterionMet).toBe(true);
  });

  test('clear and decide again reopens the choice', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'welfare' } }, undefined, { expectCanvas: false });
    await decideCurrentTopic(page, 0);
    await page.locator('.petslab-welfare-apply-retry').click();
    await expect(page.locator('.petslab-welfare-apply-feedback')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (
      (window as unknown as ToolWindow).__toolData.petsLab.welfareApply
    ))).toEqual({});
  });

  test('a corrupt restored decision heals instead of unlocking the module', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'welfare',
        welfareApply: {
          spayNeuter: 'NOT_AN_OPTION',
          notATopic: 'cost',
          adoption: 'rescue',
          declawing: 'anatomy',
          outdoorCats: 'enrich',
        },
      },
    }, undefined, { expectCanvas: false });

    // Three valid decisions restore; the junk one does not, so the module is
    // not complete on the strength of a forged row.
    await expect(page.locator('.petslab-welfare-apply-progress')).toContainText('Decided 3 of 4');
    await expect(page.locator('.petslab-complete-status')).toHaveCount(0);
    await expect(page.locator('.petslab-welfare-apply-feedback')).toHaveCount(0);
  });

  test('visiting all four tabs no longer earns the badge on its own', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'welfare' } }, undefined, { expectCanvas: false });
    for (const topic of TOPICS) {
      await page.locator('#pets-welfare-tab-' + topic).click();
      await expect(page.locator('.petslab-welfare-apply')).toBeVisible();
    }
    // All four visited, none decided.
    await expect(page.locator('.petslab-welfare-apply-progress')).toContainText('Decided 0 of 4');
    const state = await readPets(page);
    expect(Object.keys(state.welfareVisited || {}).length).toBe(4);
    expect(state.badges?.pets_welfare_aware).toBeFalsy();
  });

  test('no axe violations before or after deciding', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'welfare' } }, undefined, { expectCanvas: false });
    const before = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(before.violations.map((v: any) => v.id)).toEqual([]);

    await decideCurrentTopic(page, 0);

    const after = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(after.violations.map((v: any) => v.id)).toEqual([]);
  });
});
