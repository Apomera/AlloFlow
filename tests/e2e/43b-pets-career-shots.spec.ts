import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1500,
  appStyles: true,
});

// Screenshot-only; assertions live in 43-pets-career-match.spec.ts.
test.describe('Pets career fit - visual review', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('captures the questions and the shortlist', async ({ page }, testInfo) => {
    await harness.mount(page, { petsLab: { view: 'careers' } }, undefined, { expectCanvas: false });
    const panel = page.locator('.petslab-career-fit');
    await expect(panel).toBeVisible();
    await panel.screenshot({ path: testInfo.outputPath('01-questions.png') });

    const questions = page.locator('.petslab-career-question');
    const count = await questions.count();
    for (let i = 0; i < count; i += 1) {
      await questions.nth(i).getByRole('button').first().click();
    }
    const result = page.locator('.petslab-career-result');
    await expect(result).toBeVisible();
    await result.screenshot({ path: testInfo.outputPath('02-shortlist.png') });
  });
});
