import { test, expect } from '@playwright/test';

test.describe('App boot + initial state', () => {
  test('main page loads with expected title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AlloFlow/);
  });

  test('main app root mounts within 30s', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => document.body.innerHTML.length > 5000, null, { timeout: 30000 });
    expect((await page.content()).length).toBeGreaterThan(5000);
  });

  test('boot completes without critical pageerrors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto('/');
    await page.waitForTimeout(5000);
    expect(pageErrors).toHaveLength(0);
  });

  test('console errors stay below threshold (filtered)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text();
      // Known noise: third-party CDNs, Firestore offline, deprecated APIs
      if (/firestore|firebase|workbox|favicon|googletagmanager|tracking|GA_|chrome-extension|error_reporter_module|cdn\.jsdelivr.*403/i.test(t)) return;
      errors.push(t.slice(0, 200));
    });
    await page.goto('/');
    await page.waitForTimeout(5000);
    expect(errors.length, `Console errors:\n${errors.slice(0, 5).join('\n')}`).toBeLessThan(8);
  });

  test('Skip to Content link exists (a11y)', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('text=/Skip to Content/i').first();
    await expect(skipLink).toBeVisible({ timeout: 10000 });
  });

  test('service worker is registered', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const swActive = await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.controller !== null);
    // SW activates on second visit; first visit registers
    // So we only check that the registration code ran
    const swRegistered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    });
    expect(swRegistered).toBeTruthy();
  });
});
