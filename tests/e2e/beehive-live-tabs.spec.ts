import { test, expect } from '@playwright/test';
import { bootAlloFlow, openStemLab, openStemTool } from './helpers';

test.describe('Beehive tool live tabs interaction', () => {
  test('opens beehive tool and switches tabs without throwing', async ({ page }) => {
    test.setTimeout(240000);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const consoleLogs: string[] = [];

    page.on('pageerror', (e) => {
      console.log('🚨 PageError:', e.message);
      pageErrors.push(e.message);
    });

    page.on('console', (m) => {
      const text = m.text();
      consoleLogs.push(`[${m.type()}] ${text}`);
      if (m.type() === 'error') {
        console.log('🚨 Console Error:', text);
        consoleErrors.push(text);
      }
    });

    try {
      console.log('Disabling service worker to prevent page reload during test...');
      await page.addInitScript(() => {
        try {
          delete (window.Navigator.prototype as any).serviceWorker;
        } catch (e) {
          console.error('Failed to delete serviceWorker from Navigator prototype', e);
        }
      });

      console.log('Booting AlloFlow...');
      await bootAlloFlow(page, 'learning');

      console.log('Opening STEM Lab...');
      const stemLabBtn = page.locator('button').filter({ hasText: /STEM Lab.*interactive math/i }).first();
      await stemLabBtn.waitFor({ state: 'visible', timeout: 30000 });
      await page.waitForTimeout(3000); // Wait for React hydration
      await stemLabBtn.click({ force: true });

      console.log('Waiting for STEM Lab catalog/module to hydrate...');
      await page.waitForFunction(() => !!(window as any).StemLab?._registry, null, { timeout: 30000 });
      await page.waitForTimeout(3000);

      console.log('Opening Beehive tool...');
      const beehiveBtn = page.locator('button').filter({ hasText: /Beehive Colony/i }).first();
      await beehiveBtn.waitFor({ state: 'visible', timeout: 30000 });
      await page.waitForTimeout(3000); // Wait for React hydration
      await beehiveBtn.click({ force: true });

      // Wait for the tool view to render (up to 60s for script download/register)
      console.log('Waiting for beehive canvas wrapper to be visible...');
      const canvasWrap = page.locator('#beehive-canvas-wrap');
      await canvasWrap.waitFor({ state: 'visible', timeout: 60000 }).catch(async (err) => {
        console.log('🔴 Timeout waiting for canvasWrap. Printing DOM info:');
        const debugInfo = await page.evaluate(() => {
          return {
            html: document.body.innerHTML.slice(0, 1000),
            isRegistered: !!(window as any).StemLab?.isRegistered('beehive'),
            registryKeys: Object.keys((window as any).StemLab?._registry || {})
          };
        });
        console.log('Debug Info:', JSON.stringify(debugInfo, null, 2));
        throw err;
      });
      console.log('Beehive canvas wrapper is visible!');

      // Take screenshot of default tab (Beekeeper)
      console.log('Taking screenshot of Beekeeper mode...');
      await page.screenshot({ path: 'test-results/beehive-beekeeper.png' });

      // Look for tabs. Let's find buttons with role='tab' or text 'Queen RTS' and 'Drone Flight'
      const queenTab = page.locator('button, [role="tab"]').filter({ hasText: /Queen RTS/i }).first();
      const droneTab = page.locator('button, [role="tab"]').filter({ hasText: /Drone Flight/i }).first();
      const beekeeperTab = page.locator('button, [role="tab"]').filter({ hasText: /Beekeeper/i }).first();

      console.log('Clicking Queen RTS tab...');
      await queenTab.waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(2000);
      await queenTab.click({ force: true });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/beehive-queen.png' });

      console.log('Clicking Drone Flight tab...');
      await droneTab.waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(2000);
      await droneTab.click({ force: true });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/beehive-drone.png' });

      console.log('Clicking Beekeeper tab again...');
      await beekeeperTab.waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(2000);
      await beekeeperTab.click({ force: true });
      await page.waitForTimeout(2000);
    } finally {
      console.log('E2E execution logs:');
      console.log(consoleLogs.join('\n'));
    }

    expect(pageErrors).toHaveLength(0);
    // There shouldn't be new critical errors. Let's filter out standard firebase/analytics noise.
    const criticalConsoleErrors = consoleErrors.filter(e => !/firebase|firestore|workbox|GA_/i.test(e));
    expect(criticalConsoleErrors).toHaveLength(0);
  });
});
