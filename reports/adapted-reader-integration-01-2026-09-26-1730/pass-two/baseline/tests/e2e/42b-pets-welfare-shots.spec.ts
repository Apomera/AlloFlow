import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1400,
  appStyles: true,
});

// Screenshot-only; assertions live in 42-pets-welfare-apply.spec.ts.
test.describe('Pets welfare apply — visual review', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('captures undecided, weak pick and strong pick', async ({ page }, testInfo) => {
    await harness.mount(page, { petsLab: { view: 'welfare', welfareSec: 'declawing' } }, undefined, { expectCanvas: false });
    const card = page.locator('.petslab-welfare-apply');
    await expect(card).toBeVisible();
    await card.screenshot({ path: testInfo.outputPath('01-undecided.png') });

    // Weakest answer: "say nothing".
    await card.getByRole('group', { name: 'Choose a response' })
      .getByRole('button').filter({ hasText: 'Say nothing' }).click();
    await expect(card.locator('.petslab-welfare-apply-feedback')).toBeVisible();
    await card.screenshot({ path: testInfo.outputPath('02-weak-pick.png') });

    // Strongest answer on another topic.
    await harness.destroy(page);
    await harness.mount(page, { petsLab: { view: 'welfare', welfareSec: 'outdoorCats' } }, undefined, { expectCanvas: false });
    const card2 = page.locator('.petslab-welfare-apply');
    await card2.getByRole('group', { name: 'Choose a response' })
      .getByRole('button').filter({ hasText: 'unmet need' }).click();
    await expect(card2.locator('.petslab-welfare-apply-feedback')).toBeVisible();
    await card2.screenshot({ path: testInfo.outputPath('03-strong-pick.png') });
  });
});
