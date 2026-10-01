import { test, expect } from '@playwright/test';
import { hubTile, learningToolsCard } from './helpers/learning_hub';

test.describe('SEL Hub modal lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForTimeout(3000);
    await learningToolsCard(page).click({ force: true });
    await page.waitForTimeout(2500);
    await hubTile(page, 'sel-hub').click({ force: true });
    await page.waitForFunction(() => !!((window as any).AlloModules?.SelHub && (window as any).SelHub?.registerTool), null, { timeout: 60000 }).catch(() => {}); // the assertions below report a miss
  });

  test('SEL Hub module loads', async ({ page }) => {
    const has = await page.evaluate(() => !!(window as any).AlloModules?.SelHub);
    expect(has).toBeTruthy();
  });

  test('window.SelHub registry is exposed', async ({ page }) => {
    const has = await page.evaluate(() => !!(window as any).SelHub);
    expect(has).toBeTruthy();
  });

  test('window.SelHub.registerTool is a function', async ({ page }) => {
    const t = await page.evaluate(() => typeof (window as any).SelHub?.registerTool);
    expect(t).toBe('function');
  });
});

test.describe('StoryForge module', () => {
  test('StoryForge module loads when tile clicked', async ({ page }) => {
    await page.goto('./');
    await page.waitForTimeout(3000);
    await learningToolsCard(page).click({ force: true });
    await page.waitForTimeout(2500);
    await hubTile(page, 'storyforge').click({ force: true });
    await page.waitForTimeout(6000);

    const has = await page.evaluate(() => !!(window as any).AlloModules?.StoryForge);
    expect(has).toBeTruthy();
  });
});

test.describe('AlloHaven module', () => {
  test('AlloHaven module loads when tile clicked', async ({ page }) => {
    await page.goto('./');
    await page.waitForTimeout(3000);
    await learningToolsCard(page).click({ force: true });
    await page.waitForTimeout(2500);
    await hubTile(page, 'allohaven').click({ force: true });
    await page.waitForTimeout(6000);

    const has = await page.evaluate(() => !!(window as any).AlloModules?.AlloHaven);
    expect(has).toBeTruthy();
  });
});
