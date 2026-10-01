import { expect, test, type Locator } from '@playwright/test';
import {
  bootMobile,
  closeOpenHub,
  collectConsoleErrors,
  realErrors,
  settle,
} from './mobile-helpers';

type ThemeSnapshot = {
  theme: string | null;
  backgroundColor: string;
  backgroundImage: string;
  color: string;
  borderColor: string;
};

async function snapshotTheme(panel: Locator): Promise<ThemeSnapshot> {
  return panel.evaluate((element: HTMLElement) => {
    const style = getComputedStyle(element);
    return {
      theme: element.getAttribute('data-history-theme'),
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      color: style.color,
      borderColor: style.borderColor,
    };
  });
}

test.describe('Resource Pack theme continuity', () => {
  test('follows light, dark, and high-contrast themes without resetting open actions', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await bootMobile(page, 'learning');
    await closeOpenHub(page);

    const workspaceHistory = page.locator('#workspace-tab-history');
    if (await workspaceHistory.isVisible().catch(() => false)) {
      await workspaceHistory.click();
    } else {
      await page.locator('#tab-history').click();
    }

    const panel = page.locator('#tour-history-panel');
    await expect(panel).toBeVisible({ timeout: 20000 });
    const light = await snapshotTheme(panel);
    expect(light.theme).toBe('light');
    expect(light.backgroundImage).toContain('linear-gradient');

    const more = panel.locator('[aria-controls="history-more-actions-menu"]');
    await more.click();
    await expect(panel.locator('#history-more-actions-menu')).toBeVisible();

    await page.evaluate(() => (window as any).AlloToggleTheme());
    await expect(panel).toHaveAttribute('data-history-theme', 'dark');
    await expect(panel.locator('#history-more-actions-menu')).toBeVisible();
    const dark = await snapshotTheme(panel);
    expect(dark.backgroundColor).not.toBe(light.backgroundColor);
    expect(dark.color).not.toBe(light.color);

    await page.evaluate(() => (window as any).AlloToggleTheme());
    await expect(panel).toHaveAttribute('data-history-theme', 'contrast');
    await expect(panel.locator('#history-more-actions-menu')).toBeVisible();
    const contrast = await snapshotTheme(panel);
    expect(contrast.backgroundImage).toBe('none');
    expect(contrast.backgroundColor).toBe('rgb(0, 0, 0)');
    expect(contrast.borderColor).not.toBe(dark.borderColor);

    const dismissLayer = panel.locator('.rp-dismiss-layer');
    await expect(dismissLayer).toBeAttached();
    expect(await dismissLayer.evaluate((element) => getComputedStyle(element).backgroundColor))
      .toBe('rgba(0, 0, 0, 0)');

    await settle(page);
    expect(realErrors(consoleErrors)).toEqual([]);
  });
});
