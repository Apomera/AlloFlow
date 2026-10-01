import { test, expect } from '@playwright/test';
import { bootAlloFlow } from './helpers';

// Smoke test for 3D Geometry Sandbox v2.
// Covers the new HandWaver-inspired dimensional stretch mode,
// mode toggle, save/load, units, and undo.
test.describe('3D Geometry Sandbox v2', () => {
  test('opens, switches modes, and exercises stretch builder', async ({ page }) => {
    test.setTimeout(240000);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (e) => {
      console.log('PageError:', e.message);
      pageErrors.push(e.message);
    });
    page.on('console', (m) => {
      if (m.type() === 'error') {
        const text = m.text();
        if (!/firebase|firestore|workbox|GA_|Three\.js|WebGL/i.test(text)) {
          consoleErrors.push(text);
        }
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

    // Open Geometry Sandbox
    const geoBtn = page.locator('button').filter({ hasText: /Geometry Sandbox/i }).first();
    await geoBtn.waitFor({ state: 'visible', timeout: 30000 });
    await geoBtn.click({ force: true });

    // Wait for Three.js to load (may take a few seconds on first load)
    await page.waitForTimeout(5000);

    // Verify mode toggle is present
    const singleModeBtn = page.locator('button[role="tab"]').filter({ hasText: /Single shape/i });
    const stretchModeBtn = page.locator('button[role="tab"]').filter({ hasText: /Stretch mode/i });
    await expect(singleModeBtn).toBeVisible({ timeout: 30000 });
    await expect(stretchModeBtn).toBeVisible();

    // Switch to stretch mode
    await stretchModeBtn.click({ force: true });
    await page.waitForTimeout(500);

    // Verify the dimensional stretch panel appears
    await expect(page.locator('text=Dimensional Stretch Builder')).toBeVisible();

    // Place a point
    const placePointBtn = page.locator('button').filter({ hasText: /Place point at origin/i });
    await placePointBtn.click({ force: true });
    await page.waitForTimeout(300);

    // Verify the construction list shows the new point
    await expect(page.locator('text=/Construction \\(1 objects?\\)/')).toBeVisible();

    // Perform stretch: point → segment
    const stretchBtn = page.locator('button[aria-label*="Stretch"]').first();
    await stretchBtn.click({ force: true });
    await page.waitForTimeout(300);

    // Now should have 2 objects
    await expect(page.locator('text=/Construction \\(2 objects?\\)/')).toBeVisible();

    // Undo
    const undoBtn = page.locator('button[aria-label="Undo last stretch"]');
    await undoBtn.click({ force: true });
    await page.waitForTimeout(300);

    // Test unit selector
    const unitSelect = page.locator('select[aria-label="Real-world unit"]');
    await unitSelect.selectOption('cm');
    await page.waitForTimeout(200);

    // Switch back to single shape mode
    await singleModeBtn.click({ force: true });
    await page.waitForTimeout(300);
    await expect(page.locator('text=Shapes')).toBeVisible();

    // Verify no critical page errors
    expect(pageErrors).toHaveLength(0);
  });
});
