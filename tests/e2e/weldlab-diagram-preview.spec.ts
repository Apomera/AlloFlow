import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test.use({ video: 'off' });
test('Local preview serves the current diagram and reader improvements', async ({ page }) => {
  test.skip(!process.env.WELDLAB_PREVIEW_URL, 'Local preview is opt-in.');
  await page.setViewportSize({ width: 320, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(process.env.WELDLAB_PREVIEW_URL!);
  await page.waitForFunction(() => Boolean((document.getElementById('preview-app-css') as HTMLLinkElement)?.sheet));
  const angle = page.locator('[data-bevel-angle]');
  await angle.focus(); await page.keyboard.press('End');
  await expect(angle).toHaveValue('60');
  await expect(angle).toHaveAccessibleDescription(/Bevel face[\s\S]*1\.000 in[\s\S]*Horizontal run[\s\S]*0\.866 in/);
  await expect(page.locator('#math9-bevel-readings')).toHaveAttribute('aria-live', 'polite');
  await page.getByRole('button', { name: 'Robot focus flow', exact: true }).click();
  const next = page.locator('[data-robot-inspect-next]');
  await next.focus(); for (let i = 0; i < 3; i++) await page.keyboard.press('Enter');
  await expect(page.locator('[data-robot-inspect-select]')).toBeFocused();
  await expect(page.locator('[data-robot-inspect-select]')).toHaveValue('3');
  await page.getByRole('button', { name: 'Pipe pass contrast', exact: true }).click();
  await page.locator('[data-pipe-pass-node="0"]').click();
  await expect(page.locator('[data-pipe-groove-pass-number]')).toHaveCount(3);
  await page.getByRole('button', { name: 'High contrast', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('[data-pipe-groove]').screenshot({ path: resolve('reports/weldlab-diagram-accessibility/preview-pipe-labels-320-contrast.png') });
});
