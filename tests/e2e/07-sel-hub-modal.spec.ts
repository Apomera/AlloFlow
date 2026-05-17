import { test, expect } from '@playwright/test';

test.describe('SEL Hub modal lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    await page.locator('[role="button"][aria-label^="Learning Tools."]').first().click({ force: true });
    await page.waitForTimeout(2500);
    await page.locator('button').filter({ hasText: /SEL Hub.*self-awareness/i }).first().click({ force: true });
    await page.waitForTimeout(6000);
  });

  test('SEL Hub module loads', async ({ page }) => {
    const has = await page.evaluate(() => !!(window as any).AlloModules?.SelHub);
    expect(has).toBeTruthy();
  });

  test('window.SelHub registry is exposed', async ({ page }) => {
    const has = await page.evaluate(() => !!(window as any).SelHub);
    expect(has).toBeTruthy();
  });

  test('window.SelHub.registerTool is a function', async ({ page }) => {
    const t = await page.evaluate(() => typeof (window as any).SelHub?.registerTool);
    expect(t).toBe('function');
  });
});

test.describe('StoryForge module', () => {
  test('StoryForge module loads when tile clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    await page.locator('[role="button"][aria-label^="Learning Tools."]').first().click({ force: true });
    await page.waitForTimeout(2500);
    await page.locator('button').filter({ hasText: /StoryForge/i }).first().click({ force: true });
    await page.waitForTimeout(6000);

    const has = await page.evaluate(() => !!(window as any).AlloModules?.StoryForge);
    expect(has).toBeTruthy();
  });
});

test.describe('AlloHaven module', () => {
  test('AlloHaven module loads when tile clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    await page.locator('[role="button"][aria-label^="Learning Tools."]').first().click({ force: true });
    await page.waitForTimeout(2500);
    await page.locator('button').filter({ hasText: /AlloHaven.*focusing/i }).first().click({ force: true });
    await page.waitForTimeout(6000);

    const has = await page.evaluate(() => !!(window as any).AlloModules?.AlloHaven);
    expect(has).toBeTruthy();
  });
});
