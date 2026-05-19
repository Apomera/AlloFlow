import { test, expect } from '@playwright/test';

test.describe('Learning Hub modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2500);
    await page.locator('[role="button"][aria-label^="Learning Tools."]').first().click({ force: true });
    await page.waitForTimeout(2500);
  });

  test('Learning Hub renders with title "Learning Tools"', async ({ page }) => {
    const hub = page.locator('[role="dialog"][aria-label*="Learning"]');
    await expect(hub).toBeVisible();
    const heading = page.locator('h2').filter({ hasText: /Learning Tools/i }).first();
    await expect(heading).toBeVisible();
  });

  test('Learning Hub has close button (X)', async ({ page }) => {
    const closeBtn = page.locator('button[aria-label*="Close learning" i]').first();
    await expect(closeBtn).toBeVisible();
  });

  test('Close button dismisses Learning Hub', async ({ page }) => {
    await page.locator('button[aria-label*="Close learning" i]').first().click({ force: true });
    await page.waitForTimeout(1000);
    const hub = page.locator('[role="dialog"][aria-label*="Learning"]');
    await expect(hub).toBeHidden({ timeout: 5000 });
  });

  test('Backdrop click dismisses Learning Hub', async ({ page }) => {
    // Click outside the dialog box (on backdrop) — top-left corner
    await page.mouse.click(20, 20);
    await page.waitForTimeout(1000);
    const hub = page.locator('[role="dialog"][aria-label*="Learning"]');
    await expect(hub).toBeHidden({ timeout: 5000 });
  });

  test('All 6 sub-tiles render with correct labels', async ({ page }) => {
    const tiles = [
      { text: /STEM Lab/i, icon: '🔬' },
      { text: /StoryForge/i, icon: '📖' },
      { text: /LitLab/i, icon: '🎭' },
      { text: /PoetTree/i, icon: '🌳' },
      { text: /SEL Hub/i, icon: '💖' },
      { text: /AlloHaven/i, icon: '🌿' },
    ];
    for (const t of tiles) {
      const tile = page.locator('button').filter({ hasText: t.text }).first();
      await expect(tile, `Tile not visible: ${t.text}`).toBeVisible();
    }
  });

  test('All 6 tiles have non-empty descriptions', async ({ page }) => {
    const subtitles = [
      /interactive math/i,
      /illustrated stories/i,
      /character voices/i,
      /rhyme.*meter/i,
      /self-awareness/i,
      /focusing.*reflecting/i,
    ];
    for (const re of subtitles) {
      const sub = page.locator('text=' + re.source);
      await expect(sub.first(), `Subtitle not found: ${re}`).toBeVisible({ timeout: 3000 });
    }
  });
});
