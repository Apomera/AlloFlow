import { test, expect } from '@playwright/test';
import { hubTile, learningToolsCard } from './helpers/learning_hub';

test.describe('Learning Hub modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForTimeout(2500);
    await learningToolsCard(page).click({ force: true });
    await page.waitForTimeout(2500);
  });

  test('Learning Hub renders with title "Learning Tools"', async ({ page }) => {
    const hub = page.locator('[role="dialog"][aria-labelledby="learning-hub-title"]');
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
    const hub = page.locator('[role="dialog"][aria-labelledby="learning-hub-title"]');
    await expect(hub).toBeHidden({ timeout: 5000 });
  });

  test('Backdrop click dismisses Learning Hub', async ({ page }) => {
    // Click outside the dialog box (on backdrop) — top-left corner
    await page.mouse.click(20, 20);
    await page.waitForTimeout(1000);
    const hub = page.locator('[role="dialog"][aria-labelledby="learning-hub-title"]');
    await expect(hub).toBeHidden({ timeout: 5000 });
  });

  test('All 6 sub-tiles render with correct labels', async ({ page }) => {
    // Found by data-hub-id, then the visible label checked (the STEM tile is now "STEAM Lab").
    const tiles = [
      { hubId: 'stem-lab', text: /STEAM Lab/i },
      { hubId: 'storyforge', text: /StoryForge/i },
      { hubId: 'litlab', text: /LitLab/i },
      { hubId: 'poettree', text: /PoetTree/i },
      { hubId: 'sel-hub', text: /SEL Hub/i },
      { hubId: 'allohaven', text: /AlloHaven/i },
    ];
    for (const t of tiles) {
      const tile = hubTile(page, t.hubId);
      await expect(tile, `Tile not visible: ${t.hubId}`).toBeVisible();
      await expect(tile, `Tile label wrong: ${t.hubId}`).toContainText(t.text);
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
      // getByText takes the RegExp itself; 'text=' + re.source matched "rhyme.*meter" as literal text.
      const sub = page.getByText(re);
      await expect(sub.first(), `Subtitle not found: ${re}`).toBeVisible({ timeout: 3000 });
    }
  });
});
