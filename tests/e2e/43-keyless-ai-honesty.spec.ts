import { test, expect, Page } from '@playwright/test';

/**
 * X1 (wave 3): keyless AI honesty, end to end.
 *
 * The 2026-08-16 decision: on a keyless shell the STEM header shows an
 * "AI extras: off" pill; clicking it opens AI Backend Settings, where the
 * Canvas-first card ("Use AlloFlow inside Gemini Canvas") leads. When a
 * backend is configured, capability-gated UI re-derives from the
 * alloflow:ai-config-changed event WITHOUT a reload.
 *
 * Unit tests pin the resolver and the wiring; this spec pins what a visitor
 * actually experiences on the deployed shell.
 */

test.describe.configure({ timeout: 180000 });

async function openKeylessWaterCycle(page: Page): Promise<void> {
  await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (_) {} });
  await page.goto('/water-cycle', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body && document.body.innerHTML.length > 5000, null, { timeout: 90000 });
  await expect(page.locator('body')).toContainText(/water cycle/i, { timeout: 120000 });
}

test('keyless shell: pill present, doorway opens with the Canvas card leading', async ({ page }) => {
  await openKeylessWaterCycle(page);

  const pill = page.getByRole('button', { name: /AI extras are off/i }).first();
  await expect(pill).toBeVisible({ timeout: 60000 });
  await expect(pill).toContainText('AI extras: off');

  await pill.click();
  const canvasCard = page.getByRole('button', { name: /Use AlloFlow inside Gemini Canvas/i }).first();
  await expect(canvasCard).toBeVisible({ timeout: 30000 });

  // The card's link lives in a window.open closure, not in the DOM (first
  // version of this spec asserted innerHTML and failed for that reason).
  // Stub window.open and click the real card to verify where it goes.
  await page.evaluate(() => {
    (window as any).__e2eOpened = [];
    (window as any).open = (url: string) => { (window as any).__e2eOpened.push(String(url)); return null; };
  });
  await canvasCard.click();
  const opened = await page.evaluate(() => (window as any).__e2eOpened);
  expect(opened.some((u: string) => u.includes('share.gemini.google')),
    'clicking the Canvas card must open the share.gemini.google link').toBe(true);
});

test('configuring a backend removes the pill without a reload', async ({ page }) => {
  await openKeylessWaterCycle(page);

  const pill = page.getByRole('button', { name: /AI extras are off/i }).first();
  await expect(pill).toBeVisible({ timeout: 60000 });

  // Simulate what writeAIBackendConfig does: store a gemini config and fire
  // the change event. (A fake key is fine — capability is about configuration,
  // not call success; the resolver documents it must never gate the call path.)
  await page.evaluate(() => {
    localStorage.setItem('alloflow_ai_config', JSON.stringify({ backend: 'gemini', apiKey: 'e2e-fake-key' }));
    window.dispatchEvent(new Event('alloflow:ai-config-changed'));
  });

  await expect(pill).toHaveCount(0, { timeout: 30000 });
});
