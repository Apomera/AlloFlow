import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe('Raptor Lab discovery and responsive navigation', () => {
  test.describe.configure({ mode: 'serial' });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1280, height: 900, appStyles: true });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });
  test.beforeEach(async ({ page }) => {
    await harness.mount(page, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block;padding:16px}' });
  });

  test('finds activities by collection and supports Enter, Escape, clear, and destination focus', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search sections' });
    await search.fill('  physics  ');
    await expect(page.locator('.rh-search-result').filter({ hasText: 'Owl Hearing Lab' })).toBeVisible();
    await search.fill('owl');
    await search.press('Enter');
    await expect(page.locator('[data-raptorhunt-root]')).toHaveAttribute('data-raptor-active-section', 'hearing');
    await expect(page.locator('#rh-active-section-title')).toBeFocused();
    await expect(search).toHaveValue('');
    await search.fill('no-such-activity-xyz');
    await expect(page.locator('.rh-search-summary')).toHaveText('0 activities found');
    await expect(page.locator('.rh-search-empty')).toBeVisible();
    await search.press('Escape');
    await expect(search).toHaveValue('');
    await expect(search).toBeFocused();
    await search.fill('flight');
    await page.getByRole('button', { name: 'Clear search', exact: true }).click();
    await expect(search).toHaveValue('');
    await expect(search).toBeFocused();
    await expect(page.locator('[data-raptor-section-switcher] optgroup')).toHaveCount(9);
  });

  test('preserves the collection while searching and returning to its directory', async ({ page }) => {
    await page.locator('.rh-category-card').filter({ hasText: 'Labs & Physics' }).click();
    await expect(page.locator('.rh-collection-title')).toContainText('Labs & Physics');
    const search = page.getByRole('searchbox', { name: 'Search sections' });
    await search.fill('owl');
    await search.press('Escape');
    await expect(page.locator('.rh-collection-title')).toContainText('Labs & Physics');
    await search.fill('owl');
    await page.locator('.rh-search-result').click();
    await expect(page.locator('#rh-active-section-title')).toBeFocused();
    await page.getByRole('button', { name: 'Open Labs & Physics collection', exact: true }).click();
    await expect(page.locator('.rh-collection-title')).toContainText('Labs & Physics');
  });

  test('counts only valid activities in both progress summaries', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__toolData.raptorHunt.visited = { hub: 1, obsolete: 4, hunt: 2, roster: 1 };
      (window as any).__rerender();
    });
    await expect(page.locator('.rh-stat-card').last()).toContainText('2/99');
    await expect(page.locator('.rh-hub-progress')).toContainText('2 / 99 sections (2%)');
  });

  test('adapts inside a narrow desktop panel and retains visible system-color controls', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.addStyleTag({ content: '#wrap{width:420px}' });
    await expect(page.locator('.rh-category-grid')).toHaveCSS('display', 'grid');
    const bounds = await page.locator('.rh-category-card').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().right));
    expect(Math.max(...bounds)).toBeLessThanOrEqual(420);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await expect(page.locator('.rh-hero-action-primary')).toBeVisible();
    const colors = await page.locator('.rh-hero-action-primary').evaluate(el => ({ foreground: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
    expect(colors.foreground).not.toBe(colors.background);
    await page.screenshot({ path: 'scratch/raptor-ui-forced-colors.png' });
  });

  for (const width of [1280, 768, 390]) {
    test(`keeps discovery controls inside a ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.locator('.rh-category-card')).toHaveCount(9);
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
      const search = page.getByRole('searchbox', { name: 'Search sections' });
      expect((await search.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await search.fill('physics');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow).toBe(false);
      await page.screenshot({ path: `scratch/raptor-ui-search-${width}.png` });
      await search.press('Escape');
      await page.screenshot({ path: `scratch/raptor-ui-final-${width}.png` });
      if (width === 1280) expect((await page.locator('.rh-command-deck').boundingBox())!.height).toBeLessThan(450);
      expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    });
  }
});
