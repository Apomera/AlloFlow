import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1900,
  appStyles: true,
});

// Screenshot-only; assertions live in 47-pets-cost-commit.spec.ts.
test.describe('Pets cost reckoning - visual review', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('captures unanswered, honest answer and closing', async ({ page }, testInfo) => {
    await harness.mount(page, { petsLab: { view: 'cost' } }, undefined, { expectCanvas: false });
    const panel = page.locator('.petslab-cost-commit');
    await expect(panel).toBeVisible();
    await panel.screenshot({ path: testInfo.outputPath('01-unanswered.png') });

    const questions = page.locator('.petslab-cost-commit-q');
    await questions.nth(0).getByRole('button').filter({ hasText: 'No. Not reliably' }).click();
    await expect(questions.nth(0).locator('.petslab-cost-commit-note')).toBeVisible();
    await questions.nth(0).screenshot({ path: testInfo.outputPath('02-honest.png') });

    await questions.nth(1).getByRole('button').filter({ hasText: 'credit card' }).click();
    await questions.nth(1).screenshot({ path: testInfo.outputPath('03-strain.png') });

    await questions.nth(2).getByRole('button').filter({ hasText: 'I do not think anyone' }).click();
    await expect(page.locator('.petslab-cost-commit-closing')).toBeVisible();
    await page.locator('.petslab-cost-commit-closing').screenshot({ path: testInfo.outputPath('04-closing.png') });
  });
});
