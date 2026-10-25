import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test.use({ video: 'off' });
test('Local preview serves the reader and contrast repairs', async ({ page }) => {
  test.skip(!process.env.WELDLAB_PREVIEW_URL, 'Local preview is opt-in.');
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(process.env.WELDLAB_PREVIEW_URL!);
  await page.waitForFunction(() => Boolean((document.getElementById('preview-app-css') as HTMLLinkElement)?.sheet));
  const pin = page.locator('[data-cons-code-pin]');
  await pin.focus(); await page.keyboard.press('Enter');
  await page.locator('#tech2-dec-input').fill('ER70S-6');
  await expect(page.locator('[data-cons-code-row="position"] summary')).toHaveAccessibleName(/Current:\s*Not present in this decoded example\.[\s\S]*Pinned:\s*1/);
  await page.locator('[data-cons-code-clear]').focus(); await page.keyboard.press('Enter');
  await expect(pin).toBeFocused();
  await page.getByRole('button', { name: 'Readable code badges', exact: true }).click();
  await page.getByRole('button', { name: 'High contrast', exact: true }).click();
  const colors = await page.locator('[data-code-reader-number]').evaluate(el => ({ color: getComputedStyle(el).color, ground: getComputedStyle(el).backgroundColor }));
  expect(colors).toEqual({ color: 'rgb(255, 255, 0)', ground: 'rgb(0, 0, 0)' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('[data-code-reader-reading]').screenshot({ path: resolve('reports/weldlab-reader-contrast/preview-code-badge-320-contrast.png') });
});
