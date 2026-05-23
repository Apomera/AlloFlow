import { test, expect } from '@playwright/test';
import { bootAlloFlow, openStemLab, openStemTool } from './helpers';

test.describe('Beehive tool live tabs interaction', () => {
  test('opens beehive tool and switches tabs without throwing', async ({ page }) => {
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

    console.log('Booting AlloFlow...');
    await bootAlloFlow(page, 'learning');

    console.log('Opening STEM Lab...');
    await openStemLab(page);

    console.log('Opening Beehive tool...');
    await openStemTool(page, /beehive/i);

    // Wait for the tool view to render
    await page.waitForTimeout(3000);

    // Take screenshot of default tab (Beekeeper)
    console.log('Taking screenshot of Beekeeper mode...');
    await page.screenshot({ path: 'test-results/beehive-beekeeper.png' });

    // Look for tabs. Let's find buttons with role='tab' or text 'Queen RTS' and 'Drone Flight'
    const queenTab = page.getByRole('tab', { name: /Queen RTS/i }).first();
    const droneTab = page.getByRole('tab', { name: /Drone Flight/i }).first();
    const beekeeperTab = page.getByRole('tab', { name: /Beekeeper/i }).first();

    console.log('Clicking Queen RTS tab...');
    await queenTab.click({ force: true });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/beehive-queen.png' });

    console.log('Clicking Drone Flight tab...');
    await droneTab.click({ force: true });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/beehive-drone.png' });

    console.log('Clicking Beekeeper tab again...');
    await beekeeperTab.click({ force: true });
    await page.waitForTimeout(2000);

    console.log('E2E execution logs:');
    console.log(consoleLogs.join('\n'));

    expect(pageErrors).toHaveLength(0);
    // There shouldn't be new critical errors. Let's filter out standard firebase/analytics noise.
    const criticalConsoleErrors = consoleErrors.filter(e => !/firebase|firestore|workbox|GA_/i.test(e));
    expect(criticalConsoleErrors).toHaveLength(0);
  });
});
