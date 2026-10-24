import { test, expect } from '@playwright/test';

// Fresh contexts deliberately have no saved onboarding flags. Never dismiss a
// wizard here: the linked lesson's successful import must finish the handoff.
for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
  test(`lesson link opens Class & Materials after explicit Load at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(150000);
    await page.setViewportSize(viewport);
    await page.goto('./?lesson=academic-discourse-reading-space-grade6', { waitUntil: 'domcontentloaded' });
    const load = page.getByRole('button', { name: 'Load in AlloFlow', exact: true });
    await expect(load).toBeVisible({ timeout: 90000 });
    await expect(page.getByRole('button', { name: 'Close Wizard', exact: true })).toHaveCount(0);
    await load.click();
    await expect(load).toHaveCount(0, { timeout: 60000 });
    await expect(page.getByRole('tab', { name: 'Class & Materials', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-help-key="history_panel"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close Wizard', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Open: Words for Thinking Together', exact: true }).click();
    await expect(page.locator('[data-glossary-word-list] tr[data-glossary-entry-key]')).toHaveCount(6);
    await expect(page.getByRole('button', { name: 'Close Wizard', exact: true })).toHaveCount(0);
  });
}
