import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test.use({ video: 'off' });
test('Local preview exposes the latest Pipe and prediction keyboard fixes', async ({ page }) => {
  test.skip(!process.env.WELDLAB_PREVIEW_URL, 'Local preview is opt-in.');
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(process.env.WELDLAB_PREVIEW_URL!);
  await page.waitForFunction(() => Boolean((document.getElementById('preview-app-css') as HTMLLinkElement)?.sheet));
  await page.locator('[data-pipe-check-start]').focus();
  await page.keyboard.press('Enter');
  const clock = page.locator('[data-pipe-clock]');
  await expect(clock.getByRole('radio', { name: "1 o'clock", exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(clock.getByRole('radio', { name: "2 o'clock", exact: true })).toBeFocused();
  await expect(page.locator('#pipe2-check-prompt')).toContainText('OVERHEAD');
  await page.getByRole('button', { name: 'Prediction controls', exact: true }).click();
  const choices = page.getByRole('radiogroup', { name: 'Your CE band prediction' }).getByRole('radio');
  await choices.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(choices.nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator(':focus')).toContainText('You predicted');
  await page.getByRole('button', { name: 'High contrast', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('[data-weld-view]').screenshot({ path: resolve('reports/weldlab-wcag-coverage/preview-ce-320-contrast.png') });
});
