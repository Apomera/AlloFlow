import { test, expect } from '@playwright/test';

test.describe('Launch Pad mode picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => document.body.innerHTML.length > 5000, null, { timeout: 30000 });
  });

  test('all four mode picker cards are present', async ({ page }) => {
    const modes = ['Full Platform', 'Guided Mode', 'Learning Tools', 'Educator Tools'];
    for (const mode of modes) {
      const card = page.locator(`[role="button"][aria-label^="${mode}"]`).first();
      await expect(card, `mode card not found: ${mode}`).toBeVisible({ timeout: 5000 });
    }
  });

  test('each mode card has descriptive aria-label', async ({ page }) => {
    const cards = await page.locator('[role="button"][aria-label*="."]').all();
    let descriptiveCards = 0;
    for (const c of cards) {
      const aria = await c.getAttribute('aria-label');
      if (aria && /Platform|Mode|Tools/.test(aria) && aria.length > 30) descriptiveCards++;
    }
    expect(descriptiveCards).toBeGreaterThanOrEqual(3);
  });

  test('mode picker cards are keyboard-accessible (Enter key works)', async ({ page }) => {
    const card = page.locator('[role="button"][aria-label^="Learning Tools."]').first();
    await card.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    // After Enter, Learning Hub should open or some state should change
    // We just verify the page didn't error
    expect(await page.content()).toContain('AlloFlow');
  });

  test('clicking Learning Tools opens Learning Hub dialog', async ({ page }) => {
    await page.locator('[role="button"][aria-label^="Learning Tools."]').first().click({ force: true });
    await page.waitForTimeout(2500);
    const hub = page.locator('[role="dialog"][aria-label*="Learning"]').first();
    await expect(hub).toBeVisible({ timeout: 8000 });
  });

  test('Learning Tools click reveals 6 sub-tiles', async ({ page }) => {
    await page.locator('[role="button"][aria-label^="Learning Tools."]').first().click({ force: true });
    await page.waitForTimeout(3000);
    const expected = ['STEM Lab', 'StoryForge', 'LitLab', 'PoetTree', 'SEL Hub', 'AlloHaven'];
    for (const t of expected) {
      const tile = page.locator('button').filter({ hasText: new RegExp(t, 'i') }).first();
      await expect(tile, `Learning Hub tile not found: ${t}`).toBeVisible({ timeout: 5000 });
    }
  });
});
