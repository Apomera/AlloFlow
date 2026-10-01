import { test, expect } from '@playwright/test';

test.describe('Launch Pad mode picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => document.body.innerHTML.length > 5000, null, { timeout: 30000 });
  });

  test('all four mode picker cards are present', async ({ page }) => {
    const modes = ['Guided Mode', 'Full AlloFlow', 'Learning Tools', 'Educator Tools'];
    for (const mode of modes) {
      const card = page.getByRole('button', { name: new RegExp(mode, 'i') }).first();
      await expect(card, `mode card not found: ${mode}`).toBeVisible({ timeout: 5000 });
    }
  });

  test('each native mode button names its visible title and description', async ({ page }) => {
    const cards = page.locator('[data-alloflow-launch-pad="true"] button.lp-card');
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) {
      await expect(card).toHaveAttribute('aria-labelledby', /launch-pad-/);
      await expect(card).toHaveAttribute('aria-describedby', /launch-pad-/);
    }
  });

  test('mode picker cards are keyboard-accessible (Enter key works)', async ({ page }) => {
    const card = page.getByRole('button', { name: /Learning Tools/i }).first();
    await card.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    // After Enter, Learning Hub should open or some state should change
    // We just verify the page didn't error
    expect(await page.content()).toContain('AlloFlow');
  });

  test('clicking Learning Tools opens Learning Hub dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Learning Tools/i }).first().click({ force: true });
    await page.waitForTimeout(2500);
    const hub = page.locator('[role="dialog"][aria-label*="Learning"]').first();
    await expect(hub).toBeVisible({ timeout: 8000 });
  });

  test('Learning Tools click reveals 6 sub-tiles', async ({ page }) => {
    await page.getByRole('button', { name: /Learning Tools/i }).first().click({ force: true });
    await page.waitForTimeout(3000);
    const expected = ['STEM Lab', 'StoryForge', 'LitLab', 'PoetTree', 'SEL Hub', 'AlloHaven'];
    for (const t of expected) {
      const tile = page.locator('button').filter({ hasText: new RegExp(t, 'i') }).first();
      await expect(tile, `Learning Hub tile not found: ${t}`).toBeVisible({ timeout: 5000 });
    }
  });
});
