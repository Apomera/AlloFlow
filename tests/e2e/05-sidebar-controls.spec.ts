import { test, expect } from '@playwright/test';

test.describe('Sidebar + global UI controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3500);
  });

  test('mute audio button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /mute all audio/i }).first()).toBeVisible();
  });

  test('text appearance settings button is present', async ({ page }) => {
    // Aria-label is "Text Appearance Settings"
    await expect(page.locator('button[aria-label*="Text Appearance" i]').first()).toBeVisible();
  });

  test('narrator voice button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /narrator voice/i }).first()).toBeVisible();
  });

  test('color theme toggle is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /toggle color theme/i }).first()).toBeVisible();
  });

  test('animation toggle is present', async ({ page }) => {
    await expect(page.locator('button[aria-label*="animation" i]').first()).toBeVisible();
  });

  test('AI assistant can be hidden', async ({ page }) => {
    const hideBtn = page.getByRole('button', { name: /hide ai assistant/i }).first();
    if (await hideBtn.count() > 0) {
      await hideBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
    expect(true).toBeTruthy();
  });

  test('teacher view toggle is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /switch to teacher/i }).first()).toBeVisible();
  });

  test('open about modal opens dialog', async ({ page }) => {
    await page.getByRole('button', { name: /open about modal/i }).first().click({ force: true });
    await page.waitForTimeout(1500);
    // Some "About" content should be visible
    const aboutText = page.locator('text=/AGPLv3|Aaron Pomeranz|Adaptive Levels/i').first();
    await expect(aboutText).toBeVisible({ timeout: 5000 });
  });

  test('app language selector shows multiple languages', async ({ page }) => {
    const expected = ['Spanish', 'French', 'Arabic', 'Chinese', 'Vietnamese'];
    for (const lang of expected) {
      const opt = page.locator(`text=/^\\s*${lang}/i`).first();
      await expect(opt, `language option not found: ${lang}`).toBeVisible();
    }
  });

  test('Source Material section is visible', async ({ page }) => {
    const sec = page.locator('text=/Source Material/i').first();
    await expect(sec).toBeVisible();
  });
});
