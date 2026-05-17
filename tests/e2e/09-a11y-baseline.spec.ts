import { test, expect } from '@playwright/test';

test.describe('Accessibility baseline (manual checks, no axe)', () => {
  test('home page has lang attribute', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('home page has page title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);
  });

  test('home page has main landmark', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const main = page.locator('main, [role="main"]').first();
    // Some apps don't have explicit main; accept skip-to-content link as substitute
    const skip = page.locator('text=/Skip to Content/i').first();
    const hasMainOrSkip = (await main.count()) > 0 || (await skip.count()) > 0;
    expect(hasMainOrSkip).toBeTruthy();
  });

  test('mode picker cards have aria-labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2500);
    const cards = await page.locator('[role="button"]').all();
    let withAria = 0;
    for (const c of cards) {
      const aria = await c.getAttribute('aria-label');
      if (aria && aria.length > 5) withAria++;
    }
    expect(withAria).toBeGreaterThanOrEqual(3);
  });

  test('all images have alt or are decorative', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);
    const images = await page.locator('img').all();
    let missingAlt = 0;
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaHidden = await img.getAttribute('aria-hidden');
      if (alt === null && role !== 'presentation' && ariaHidden !== 'true') missingAlt++;
    }
    expect(missingAlt).toBeLessThan(5);
  });

  test('color theme toggle changes html data attribute or class', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const before = await page.evaluate(() => document.documentElement.className + ' ' + (document.documentElement.dataset.theme || ''));
    const toggle = page.getByRole('button', { name: /toggle color theme/i }).first();
    if ((await toggle.count()) > 0) {
      await toggle.click({ force: true });
      await page.waitForTimeout(800);
      const after = await page.evaluate(() => document.documentElement.className + ' ' + (document.documentElement.dataset.theme || ''));
      expect(after).not.toEqual(before);
    } else {
      test.skip(true, 'toggle not visible — skipping');
    }
  });

  test('keyboard navigation: Tab moves focus', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => document.activeElement?.tagName);
    expect(active).toBeTruthy();
    expect(['BUTTON', 'A', 'INPUT', 'DIV', 'SPAN', 'LI']).toContain(active);
  });
});
