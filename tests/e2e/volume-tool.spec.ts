import { test, expect } from '@playwright/test';
import { bootAlloFlow } from './helpers';

// Smoke test for the 3D Volume Explorer.
// Covers v4 additions: viewport, mode switching, shape selector,
// undo, save/load, units, fractional toggle, cross-section, library.
test.describe('3D Volume Explorer', () => {
  test('opens, renders, and exercises core v4 features without errors', async ({ page }) => {
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
        if (!/firebase|firestore|workbox|GA_/i.test(text)) {
          consoleErrors.push(text);
        }
      }
    });

    // Disable service worker to prevent reloads during the test
    await page.addInitScript(() => {
      try { delete (window.Navigator.prototype as any).serviceWorker; } catch (e) {}
    });

    await bootAlloFlow(page, 'learning');

    // Open STEM Lab
    const stemLabBtn = page.locator('button').filter({ hasText: /STEM Lab.*interactive math/i }).first();
    await stemLabBtn.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(2000);
    await stemLabBtn.click({ force: true });

    // Wait for registry
    await page.waitForFunction(() => !!(window as any).StemLab?._registry, null, { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Open Volume Explorer
    const volBtn = page.locator('button').filter({ hasText: /3D Volume Explorer/i }).first();
    await volBtn.waitFor({ state: 'visible', timeout: 30000 });
    await volBtn.click({ force: true });

    // Verify viewport renders with the new accessibility attributes
    const viewport = page.locator('[role="application"][aria-label*="Interactive 3D viewport"]');
    await viewport.waitFor({ state: 'visible', timeout: 15000 });
    await expect(viewport).toBeVisible();

    // Verify Tools Row is present
    await expect(page.locator('text=📏 Display as:')).toBeVisible();

    // Switch unit selector to cubic feet
    const unitSelect = page.locator('select[aria-label="Real-world unit selector"]');
    await unitSelect.selectOption('ft');
    await expect(page.locator('text=/In real-world units/')).toBeVisible();

    // Open shape selector and switch to cylinder
    const cylBtn = page.locator('button[role="radio"]').filter({ hasText: /Cylinder/ });
    await cylBtn.click({ force: true });
    await expect(page.locator('text=V = π·r²·h')).toBeVisible();

    // Switch back to prism
    const prismBtn = page.locator('button[role="radio"]').filter({ hasText: /Rectangular prism/ });
    await prismBtn.click({ force: true });

    // Enable fractional dimensions
    const fractCheck = page.locator('input[type="checkbox"][aria-label="Allow fractional dimensions"]');
    await fractCheck.check();
    await expect(fractCheck).toBeChecked();
    await fractCheck.uncheck();

    // Cross-section toggle
    const crossBtn = page.locator('button').filter({ hasText: /Cross-section slice/ });
    await crossBtn.click({ force: true });
    await expect(page.locator('text=/Cut at layer/')).toBeVisible();

    // Switch to freeform mode and test undo
    const freeformBtn = page.locator('button').filter({ hasText: /Freeform/ }).first();
    await freeformBtn.click({ force: true });
    await page.waitForTimeout(500);

    // Undo button should be disabled when stack is empty
    const undoBtn = page.locator('button[aria-label*="Undo last placement"]');
    await expect(undoBtn).toBeVisible();
    await expect(undoBtn).toBeDisabled();

    // Open library
    const libBtn = page.locator('button').filter({ hasText: /📚 Library/ });
    await libBtn.click({ force: true });
    await expect(page.locator('text=Buildable challenges')).toBeVisible();

    // Pick a library challenge
    const staircaseBtn = page.locator('button').filter({ hasText: /Staircase/ });
    await staircaseBtn.click({ force: true });
    await expect(page.locator('text=/Building:/')).toBeVisible();

    // Verify no critical page errors
    expect(pageErrors).toHaveLength(0);
    expect(consoleErrors.filter(e => !e.includes('Failed to load resource'))).toHaveLength(0);
  });

  test('keyboard rotation works on viewport', async ({ page }) => {
    test.setTimeout(120000);
    await page.addInitScript(() => {
      try { delete (window.Navigator.prototype as any).serviceWorker; } catch (e) {}
    });
    await bootAlloFlow(page, 'learning');

    const stemLabBtn = page.locator('button').filter({ hasText: /STEM Lab.*interactive math/i }).first();
    await stemLabBtn.waitFor({ state: 'visible', timeout: 30000 });
    await stemLabBtn.click({ force: true });
    await page.waitForFunction(() => !!(window as any).StemLab?._registry, null, { timeout: 30000 });
    await page.waitForTimeout(2000);

    const volBtn = page.locator('button').filter({ hasText: /3D Volume Explorer/i }).first();
    await volBtn.click({ force: true });

    const viewport = page.locator('[role="application"][aria-label*="Interactive 3D viewport"]');
    await viewport.waitFor({ state: 'visible', timeout: 15000 });

    // Focus viewport and press arrow keys — should not throw
    await viewport.focus();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('R'); // Reset view

    // Verify the viewport still renders
    await expect(viewport).toBeVisible();
  });
});
