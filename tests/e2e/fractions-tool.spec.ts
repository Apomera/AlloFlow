import { test, expect } from '@playwright/test';
import { bootAlloFlow } from './helpers';

test.describe('Fraction Lab v3 — deep edition', () => {
  test('opens, navigates modes, and renders tabs without errors', async ({ page }) => {
    test.setTimeout(240000);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (e) => { pageErrors.push(e.message); });
    page.on('console', (m) => {
      if (m.type() === 'error') {
        const text = m.text();
        if (!/firebase|firestore|workbox|GA_/i.test(text)) consoleErrors.push(text);
      }
    });
    await page.addInitScript(() => {
      try { delete (window.Navigator.prototype as any).serviceWorker; } catch (e) {}
    });

    await bootAlloFlow(page, 'learning');

    const stemLabBtn = page.locator('button').filter({ hasText: /STEM Lab.*interactive math/i }).first();
    await stemLabBtn.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(2000);
    await stemLabBtn.click({ force: true });

    await page.waitForFunction(() => !!(window as any).StemLab?._registry, null, { timeout: 30000 });
    await page.waitForTimeout(2000);

    const fracBtn = page.locator('button').filter({ hasText: /Fraction Lab/i }).first();
    await fracBtn.waitFor({ state: 'visible', timeout: 30000 });
    await fracBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Verify mode tabs are visible
    await expect(page.locator('button[role="tab"]').filter({ hasText: /Learn/i }).first()).toBeVisible();
    await expect(page.locator('button[role="tab"]').filter({ hasText: /Practice/i }).first()).toBeVisible();
    await expect(page.locator('button[role="tab"]').filter({ hasText: /Apply/i }).first()).toBeVisible();
    await expect(page.locator('button[role="tab"]').filter({ hasText: /Teacher/i }).first()).toBeVisible();

    // Switch to Practice mode
    await page.locator('button[role="tab"]').filter({ hasText: /Practice/i }).first().click({ force: true });
    await page.waitForTimeout(500);

    // Switch to Apply mode
    await page.locator('button[role="tab"]').filter({ hasText: /Apply/i }).first().click({ force: true });
    await page.waitForTimeout(500);
    await expect(page.locator('text=/Word problems|Games/').first()).toBeVisible();

    // Switch to Teacher mode
    await page.locator('button[role="tab"]').filter({ hasText: /Teacher/i }).first().click({ force: true });
    await page.waitForTimeout(500);

    // Should NOT have critical page errors
    expect(pageErrors).toHaveLength(0);
  });
});
