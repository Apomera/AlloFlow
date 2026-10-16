import { test, expect } from '@playwright/test';

test.describe('Launch Pad role picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => document.body.innerHTML.length > 5000, null, { timeout: 30000 });
  });

  test('all role choices and independent learning are visible', async ({ page }) => {
    for (const name of ['Teacher', 'Student', 'Family', 'Professional tools', 'Learn independently']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible({ timeout: 5000 });
    }
    await expect(page.getByRole('button', { name: 'Open the full workspace instead', exact: true })).toBeVisible();
  });

  test('each native mode button names its visible title and description', async ({ page }) => {
    const cards = page.locator('[data-alloflow-launch-pad="true"] button.lp-card');
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) {
      await expect(card).toHaveAttribute('aria-labelledby', /launch-pad-/);
      await expect(card).toHaveAttribute('aria-describedby', /launch-pad-/);
    }
  });

  test('Student opens from the keyboard and focuses the class-code input', async ({ page }) => {
    const card = page.getByRole('button', { name: 'Student', exact: true });
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(card).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#launch-pad-class-code')).toHaveAccessibleName('Class code');
    await expect(page.locator('#launch-pad-class-code')).toBeFocused();
    await expect(page.getByRole('button', { name: 'Explore on my own', exact: true })).toBeVisible();
  });

  test('class entry requires an exact code and an explicit Join action', async ({ page }) => {
    await page.getByRole('button', { name: 'Student', exact: true }).click();
    const input = page.locator('#launch-pad-class-code');
    const join = page.getByRole('button', { name: 'Join class', exact: true });
    for (const code of ['ABC1', 'ABC123', 'ABC!1']) {
      await input.fill(code);
      await expect(join).toBeDisabled();
    }
    await input.fill('ab-c12');
    await expect(join).toBeEnabled();
    await expect(page.locator('[data-alloflow-launch-pad="true"]')).toBeVisible();
  });

  test('Escape closes Student without changing roles', async ({ page }) => {
    const student = page.getByRole('button', { name: 'Student', exact: true });
    await student.click();
    await page.locator('#launch-pad-class-code').press('Escape');
    await expect(page.locator('#launch-pad-student-panel')).toHaveCount(0);
    await expect(student).toBeFocused();
    await expect(student).toHaveAttribute('aria-expanded', 'false');
  });
});
