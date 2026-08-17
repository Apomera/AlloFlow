import { test, expect, Page } from '@playwright/test';

/**
 * X1 (wave 3): the smaller shell journeys that shipped this week.
 *  - Toasts render top-centre (the 08-16 reposition) and expired toasts land
 *    in the header lightbulb's Messages list.
 *  - The Universal Settings Translations control hides for English-out,
 *    appears for a non-English output, and its hint interpolates cleanly.
 *  - Guided Mode -> History: the click is not swallowed and the "still
 *    running" strip leads back to the guided step.
 */

test.describe.configure({ timeout: 180000 });

async function bootShell(page: Page): Promise<void> {
  await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (_) {} });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body && document.body.innerHTML.length > 5000, null, { timeout: 90000 });
  // Land in the teacher workspace: the launch pad's teacher card if present.
  const teacherCard = page.locator('[data-help-key="role_teacher"]').first();
  try {
    await teacherCard.waitFor({ state: 'visible', timeout: 20000 });
    await teacherCard.evaluate((node: HTMLElement) => node.click());
  } catch (_) { /* older boot state may skip the role screen */ }
  const quickStartSkip = page.getByRole('dialog', { name: /Quick Start/i })
    .getByRole('button', { name: 'Skip', exact: true });
  try {
    await quickStartSkip.waitFor({ state: 'visible', timeout: 10000 });
    await quickStartSkip.evaluate((node: HTMLElement) => node.click());
  } catch (_) { /* no quick start on this boot */ }
  await page.waitForFunction(() => typeof (window as any).__alloAddToast === 'function', null, { timeout: 60000 });
}

test('toasts appear top-centre and expire into the Messages list', async ({ page }) => {
  await bootShell(page);

  const marker = 'E2E toast probe 4471';
  await page.evaluate((text) => (window as any).__alloAddToast(text, 'info'), marker);

  const toast = page.locator('[role="status"]', { hasText: marker }).first();
  await expect(toast).toBeVisible({ timeout: 10000 });

  const geometry = await toast.evaluate((node: HTMLElement) => {
    const card = node.getBoundingClientRect();
    const header = document.querySelector('header');
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    return {
      centerX: card.left + card.width / 2,
      top: card.top,
      viewportW: window.innerWidth,
      headerBottom,
    };
  });
  // Top-centre: horizontally centred within a tolerance, below the header band.
  expect(Math.abs(geometry.centerX - geometry.viewportW / 2)).toBeLessThan(40);
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.headerBottom - 4);
  expect(geometry.top).toBeLessThan(300);

  // Let it expire, then find it in the header lightbulb's Messages list
  // (title: "Hints, ideas, and past messages").
  await expect(toast).toHaveCount(0, { timeout: 30000 });
  // The header boots collapsed (08-16); the lightbulb lives in the expanded
  // header, so expand it first when the toggle is present.
  const expandToggle = page.locator('button[aria-label="Expand"], button[aria-label="Expand header"]').first();
  if (await expandToggle.count()) {
    await expandToggle.evaluate((node: HTMLElement) => node.click());
  }
  const lightbulb = page.locator('[data-help-key="hints_recall"]').first();
  await expect(lightbulb).toBeVisible({ timeout: 15000 });
  await lightbulb.evaluate((node: HTMLElement) => node.click());
  await expect(page.locator('body')).toContainText(marker, { timeout: 15000 });
});

test('Translations control hides for English output and appears with a real target', async ({ page }) => {
  await bootShell(page);

  // Open Universal Settings inside the sidebar's Create tab.
  const universalToggle = page.locator('#tour-universal-settings button', { hasText: /Universal Settings/i }).first();
  await expect(universalToggle).toBeVisible({ timeout: 30000 });
  await universalToggle.evaluate((node: HTMLElement) => node.click());

  // English output (default): no Translations control at all.
  const translationsSelect = page.locator('#universal-translations-select');
  await expect(page.getByLabel('Target language input')).toBeVisible({ timeout: 15000 });
  await expect(translationsSelect).toHaveCount(0);

  // Add Spanish as a translation language, then set output to Spanish — the
  // output list is built from the teacher's own languages.
  await page.getByLabel('Target language input').fill('Spanish');
  await page.getByRole('button', { name: 'Add', exact: true }).first().evaluate((node: HTMLElement) => node.click());
  const outputSelect = page.locator('select[data-help-key="simplified_language"]').first();
  await expect(outputSelect).toBeVisible({ timeout: 15000 });
  await expect(outputSelect.locator('option', { hasText: 'Spanish' })).toHaveCount(1, { timeout: 10000 });
  await outputSelect.selectOption('Spanish');

  await expect(translationsSelect).toBeVisible({ timeout: 15000 });
  const hint = page.locator('[data-help-key="universal_translations"] p').first();
  const hintText = (await hint.textContent()) || '';
  expect(hintText).not.toContain('{output}');
  expect(hintText).not.toContain('{target}');
});

test('Guided Mode -> History renders History plus the still-running strip, and Back returns', async ({ page }) => {
  await bootShell(page);

  const guidedCard = page.getByRole('button', { name: 'Guided Mode', exact: true }).first();
  const setupMenuButton = page.locator('[data-help-key="header_rerun_wizard"]').first();
  if (await guidedCard.count()) {
    await guidedCard.evaluate((node: HTMLElement) => node.click());
  } else {
    await setupMenuButton.evaluate((node: HTMLElement) => node.click());
    const guidedMenuButton = page.locator('[data-help-key="header_guided_mode_start"]').first();
    await expect(guidedMenuButton).toBeVisible({ timeout: 15000 });
    await guidedMenuButton.evaluate((node: HTMLElement) => node.click());
  }
  await expect(page.locator('.allo-guided-banner')).toBeVisible({ timeout: 30000 });

  const historyButton = page.locator('[data-help-key="header_history"], button[aria-label*="History"], button[title*="History"]').first();
  await expect(historyButton).toBeVisible({ timeout: 15000 });
  await historyButton.evaluate((node: HTMLElement) => node.click());

  await expect(page.locator('body')).toContainText(/Guided Mode is still running/i, { timeout: 20000 });

  const backButton = page.getByRole('button', { name: 'Back to my step' }).first();
  await expect(backButton).toBeVisible({ timeout: 15000 });
  await backButton.evaluate((node: HTMLElement) => node.click());
  await expect(page.locator('.allo-guided-banner')).toBeVisible({ timeout: 20000 });
});
