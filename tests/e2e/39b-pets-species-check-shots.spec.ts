import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1200,
  appStyles: true,
});

// Screenshot-only pass: the assertions live in 39-pets-species-checks.spec.ts.
// This exists so the card can be reviewed by eye in all three states.
test.describe('Pets species check — visual review', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('captures unanswered, wrong-reveal and right-reveal states', async ({ page }, testInfo) => {
    await harness.mount(page, { petsLab: { view: 'dogs' } }, undefined, { expectCanvas: false });
    const check = page.locator('.petslab-species-check');
    await expect(check).toBeVisible();
    await check.screenshot({ path: testInfo.outputPath('01-unanswered.png') });

    const options = check.getByRole('group', { name: /Prediction check/ }).getByRole('button');
    await options.filter({ hasText: 'Great Dane' }).click();
    await check.screenshot({ path: testInfo.outputPath('02-picked.png') });

    await check.locator('.petslab-species-check-reveal').click();
    await expect(check.locator('[role="status"]')).toBeVisible();
    await check.screenshot({ path: testInfo.outputPath('03-wrong-reveal.png') });

    // Right-answer state on another species.
    await harness.destroy(page);
    await harness.mount(page, { petsLab: { view: 'smallMammals' } }, undefined, { expectCanvas: false });
    const check2 = page.locator('.petslab-species-check');
    await check2.getByRole('group', { name: /Prediction check/ })
      .getByRole('button').filter({ hasText: 'herd animal' }).click();
    await check2.locator('.petslab-species-check-reveal').click();
    await expect(check2.locator('[role="status"]')).toBeVisible();
    await check2.screenshot({ path: testInfo.outputPath('04-right-reveal.png') });

    // Full-page context: the check must read as part of the view, not bolted on.
    await page.screenshot({ path: testInfo.outputPath('05-full-view.png'), fullPage: false });
  });
});
