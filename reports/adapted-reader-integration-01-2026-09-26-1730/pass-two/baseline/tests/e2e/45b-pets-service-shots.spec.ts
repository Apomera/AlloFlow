import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1600,
  appStyles: true,
});

// Screenshot-only; assertions live in 45-pets-service-cases.spec.ts.
test.describe('Pets service cases - visual review', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('captures an unlawful call and a lawful one', async ({ page }, testInfo) => {
    await harness.mount(page, { petsLab: { view: 'service' } }, undefined, { expectCanvas: false });
    const first = page.locator('.petslab-service-case').first();
    await expect(first).toBeVisible();
    await first.screenshot({ path: testInfo.outputPath('01-undecided.png') });

    await first.getByRole('button').filter({ hasText: 'certification or registration' }).click();
    await expect(first.locator('.petslab-service-feedback')).toBeVisible();
    await first.screenshot({ path: testInfo.outputPath('02-wrong-call.png') });

    const second = page.locator('.petslab-service-case').nth(1);
    await second.getByRole('button').filter({ hasText: 'animal be removed' }).click();
    await expect(second.locator('.petslab-service-feedback')).toBeVisible();
    await second.screenshot({ path: testInfo.outputPath('03-right-call.png') });
  });
});
