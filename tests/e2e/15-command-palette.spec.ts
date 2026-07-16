import { test, expect } from '@playwright/test';
import { bootAlloFlow } from './helpers';

test.describe('AlloFlow command palette', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await bootAlloFlow(page, 'learning');
  });

  test('supports keyboard discovery, execution, recents, and focus containment', async ({ page }) => {
    const previousFocus = page.getByRole('button', { name: 'Text Appearance Settings' }).first();
    await previousFocus.focus();

    await page.keyboard.press('Control+K');
    const dialog = page.getByRole('dialog', { name: 'AlloFlow command palette' });
    const search = page.getByRole('combobox', { name: 'Search commands' });
    const close = page.getByRole('button', { name: 'Close command palette' });
    const listbox = page.getByRole('listbox', { name: 'Matching commands' });

    await expect(dialog).toBeVisible();
    await expect(listbox).toBeVisible();
    await expect(search).toBeFocused();

    await search.fill('bigger text');
    const biggerText = page.getByRole('option', { name: /Make the text bigger/i });
    await expect(biggerText).toBeVisible();
    await expect(biggerText).toHaveAttribute('aria-selected', 'true');
    await search.press('Enter');

    await expect(dialog).toBeHidden();
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('allo_command_recents_v1') || '[]'))).toContain('font_bigger');

    await page.keyboard.press('Control+K');
    await expect(dialog).toBeVisible();
    await expect(search).toBeFocused();
    await expect(dialog.getByText('Recent', { exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: /Make the text bigger/i })).toBeVisible();

    await search.press('Shift+Tab');
    await expect(close).toBeFocused();
    await close.press('Tab');
    await expect(search).toBeFocused();

    await search.fill('no such command qwerty zebra');
    await expect(page.getByText('No matching command.', { exact: false })).toBeVisible();
    await expect(listbox.getByRole('option')).toHaveCount(0);

    await search.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(previousFocus).toBeFocused();

    await page.keyboard.press('Control+Shift+P');
    await expect(dialog).toBeVisible();
    await expect(search).toBeFocused();
    await search.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
