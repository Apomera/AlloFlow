import { test, expect } from '@playwright/test';

/**
 * STEM Lab modal opens via Learning Tools → STEM Lab tile.
 * The modal's deep content lazy-loads asynchronously, so these tests
 * verify the open / state-change / module-load contract.
 */
test.describe('STEM Lab modal lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    await page.locator('[role="button"][aria-label^="Learning Tools."]').first().click({ force: true });
    await page.waitForTimeout(2500);
    await page.locator('button').filter({ hasText: /STEM Lab.*interactive math/i }).first().click({ force: true });
    await page.waitForTimeout(6000);
  });

  test('window.AlloModules.StemLab is loaded', async ({ page }) => {
    const has = await page.evaluate(() => !!(window as any).AlloModules?.StemLab);
    expect(has, 'AlloModules.StemLab should be present').toBeTruthy();
  });

  test('window.StemLab is exposed (tool-registration namespace)', async ({ page }) => {
    const has = await page.evaluate(() => !!(window as any).StemLab);
    expect(has).toBeTruthy();
  });

  test('window.StemLab.registerTool is a function', async ({ page }) => {
    const t = await page.evaluate(() => typeof (window as any).StemLab?.registerTool);
    expect(t).toBe('function');
  });

  test('window.StemLab._registry is an object', async ({ page }) => {
    const t = await page.evaluate(() => {
      const sl = (window as any).StemLab;
      return sl && typeof sl._registry;
    });
    expect(t).toBe('object');
  });

  test('STEM Lab CDN URL did not 404', async ({ page }) => {
    // Verify by checking the script was successfully evaluated
    const verified = await page.evaluate(() => !!(window as any).AlloModules?.StemLab);
    expect(verified).toBeTruthy();
  });
});
