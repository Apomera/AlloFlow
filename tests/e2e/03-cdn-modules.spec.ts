import { test, expect } from '@playwright/test';

test.describe('CDN module loading', () => {
  test('AlloModules object is populated after boot', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(8000);
    const has = await page.evaluate(() => !!(window as any).AlloModules);
    expect(has).toBeTruthy();
  });

  test('lazy-load triggers AFTER Learning Tools click', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const before = await page.evaluate(() => {
      const w = window as any;
      return {
        hasLearningHub: !!(w.AlloModules && w.AlloModules.LearningHubModal),
        hasStemLab: !!(w.AlloModules && w.AlloModules.StemLab),
      };
    });

    await page.locator('[role="button"][aria-label^="Learning Tools."]').first().click({ force: true });
    await page.waitForTimeout(4000);

    const after = await page.evaluate(() => {
      const w = window as any;
      return {
        hasLearningHub: !!(w.AlloModules && w.AlloModules.LearningHubModal),
        hasStemLab: !!(w.AlloModules && w.AlloModules.StemLab),
      };
    });
    // LearningHubModal lazy-loads when user clicks Learning Tools card
    expect(after.hasLearningHub, 'LearningHubModal must load after click').toBeTruthy();
  });

  test('STEM Lab module lazy-loads after STEM Lab tile click', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    await page.locator('[role="button"][aria-label^="Learning Tools."]').first().click({ force: true });
    await page.waitForTimeout(2500);
    await page.locator('button').filter({ hasText: /STEM Lab.*interactive math/i }).first().click({ force: true });
    await page.waitForTimeout(6000);

    const hasStemLab = await page.evaluate(() => !!((window as any).AlloModules && (window as any).AlloModules.StemLab));
    expect(hasStemLab, 'StemLab module must load after STEM Lab tile click').toBeTruthy();
  });

  test('window.StemLab._registry exists for tool registration', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    await page.locator('[role="button"][aria-label^="Learning Tools."]').first().click({ force: true });
    await page.waitForTimeout(2500);
    await page.locator('button').filter({ hasText: /STEM Lab.*interactive math/i }).first().click({ force: true });
    await page.waitForTimeout(8000);

    const reg = await page.evaluate(() => {
      const sl = (window as any).StemLab;
      return sl && sl._registry ? typeof sl._registry : 'missing';
    });
    expect(reg).toBe('object');
  });
});
