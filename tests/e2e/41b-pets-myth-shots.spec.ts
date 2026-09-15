import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1400,
  appStyles: true,
});

// Screenshot-only pass; assertions live in 41-pets-myth-check.spec.ts.
test.describe('Pets myth check — visual review', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('captures unanswered, believed-myth and closing states', async ({ page }, testInfo) => {
    await harness.mount(page, { petsLab: { view: 'myths' } }, undefined, { expectCanvas: false });
    const cards = page.locator('.petslab-myth');
    await expect(cards.first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('01-unanswered-top.png') });

    // Believed a myth.
    await cards.first().locator('.petslab-myth-true').click();
    await expect(cards.first().locator('.petslab-myth-answer')).toBeVisible();
    await cards.first().screenshot({ path: testInfo.outputPath('02-believed-myth.png') });

    // A true claim answered correctly.
    await cards.nth(1).locator('.petslab-myth-true').click();
    await cards.nth(1).screenshot({ path: testInfo.outputPath('03-true-claim-right.png') });

    // Finish the set to see the closing card.
    for (let i = 2; i < 11; i += 1) {
      await cards.nth(i).locator('.petslab-myth-false').click();
    }
    await expect(page.locator('.petslab-myth-closing')).toBeVisible();
    await page.locator('.petslab-myth-progress').screenshot({ path: testInfo.outputPath('04-progress.png') });
    await page.locator('.petslab-myth-closing').screenshot({ path: testInfo.outputPath('05-closing.png') });
  });
});
