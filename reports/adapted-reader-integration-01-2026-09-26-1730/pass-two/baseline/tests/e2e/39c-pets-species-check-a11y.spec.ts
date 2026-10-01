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

test.describe('Pets species check accessibility', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('no axe violations before or after the reveal', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'dogs' } }, undefined, { expectCanvas: false });
    await expect(page.locator('.petslab-species-check')).toBeVisible();

    const before = await page.evaluate(async () => (
      (window as any).axe.run('#wrap', { resultTypes: ['violations'] })
    ));
    expect(before.violations.map((v: any) => v.id)).toEqual([]);

    await page.locator('.petslab-species-check-reveal').click();
    await expect(page.locator('.petslab-species-check [role="status"]')).toBeVisible();

    const after = await page.evaluate(async () => (
      (window as any).axe.run('#wrap', { resultTypes: ['violations'] })
    ));
    expect(after.violations.map((v: any) => v.id)).toEqual([]);
  });

  test('is fully operable from the keyboard', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'cats' } }, undefined, { expectCanvas: false });
    const check = page.locator('.petslab-species-check');
    const options = check.getByRole('group', { name: /Prediction check/ }).getByRole('button');

    // Reach and select an option with the keyboard alone.
    await options.nth(2).focus();
    await page.keyboard.press('Enter');
    await expect(options.nth(2)).toHaveAttribute('aria-pressed', 'true');

    await check.locator('.petslab-species-check-reveal').focus();
    await page.keyboard.press('Enter');

    // Focus lands on the explanation so a screen-reader user hears the result.
    const feedback = check.locator('[role="status"]');
    await expect(feedback).toBeFocused();

    // Locked options are not silently clickable after the reveal.
    const disabled = await options.evaluateAll((buttons) =>
      buttons.every((b) => (b as HTMLButtonElement).disabled));
    expect(disabled).toBe(true);
  });

  test('announces the outcome in the live region', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'birds' } }, undefined, { expectCanvas: false });
    const check = page.locator('.petslab-species-check');
    await check.getByRole('group', { name: /Prediction check/ })
      .getByRole('button').filter({ hasText: 'kill a bird' }).click();
    await check.locator('.petslab-species-check-reveal').click();

    await expect.poll(async () => page.evaluate(() => {
      const region = document.querySelector('[data-pets-live-region], #petslab-live, [aria-live]');
      return region ? region.textContent : '';
    }), { timeout: 5000 }).toContain('Prediction correct');
  });
});
