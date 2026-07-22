import { test, expect, Page } from '@playwright/test';

async function enterGuidedAnalysis(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('allo_guided_progress', JSON.stringify({
      version: 1,
      guidedStep: 1,
      selectedIds: null,
      completedSteps: [],
      skippedSteps: [],
      createdHistoryIds: [],
    }));
  });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => document.body.innerHTML.length > 5000, null, { timeout: 30000 });

  const guidedCard = page.locator('[role="button"][aria-label^="Guided Mode."]').first();
  await expect(guidedCard).toBeVisible({ timeout: 30000 });
  await guidedCard.click();

  const roleDialog = page.getByRole('dialog', { name: /How.*use|Welcome|role/i }).first();
  await expect(roleDialog).toBeVisible({ timeout: 15000 });
  await roleDialog.locator('[data-help-key="role_teacher"]').click();

  const wizardSkip = page.locator('[data-help-key="wizard_skip_btn"]').first();
  if (await wizardSkip.isVisible({ timeout: 5000 }).catch(() => false)) await wizardSkip.click();

  await expect(page.locator('.allo-guided-banner')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.allo-guided-target')).toHaveCount(1);
  await expect(page.locator('.allo-guided-banner')).toContainText(/Analyze/i);
}

async function openWorkedLesson(page: Page) {
  const banner = page.locator('.allo-guided-banner');
  await banner.getByRole('button', { name: /Worked example/i }).click();
  const opener = banner.getByRole('button', { name: /View the full worked lesson/i });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: /full worked lesson/i });
  await expect(dialog).toBeVisible();
  return { dialog, opener };
}

test.describe('Guided Mode modal stacking and keyboard journey', () => {
  test.beforeEach(async ({ page }) => enterGuidedAnalysis(page));

  test('keeps the target-bound highlight underneath the worked-lesson modal', async ({ page }) => {
    const { dialog } = await openWorkedLesson(page);
    const stacking = await page.evaluate(() => {
      const target = document.querySelector('.allo-guided-target') as HTMLElement | null;
      const modal = document.querySelector('.allo-guided-dialog') as HTMLElement | null;
      const backdrop = modal?.parentElement as HTMLElement | null;
      const topAtCenter = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      const numberOrZero = (value: string) => Number.isFinite(Number(value)) ? Number(value) : 0;
      return {
        targetZ: target ? numberOrZero(getComputedStyle(target).zIndex) : -1,
        modalZ: backdrop ? numberOrZero(getComputedStyle(backdrop).zIndex) : -1,
        centerIsModal: !!(backdrop && topAtCenter && backdrop.contains(topAtCenter)),
        targetAnimationState: target ? getComputedStyle(target).animationPlayState : '',
        targetBoxShadow: target ? getComputedStyle(target).boxShadow : '',
      };
    });
    expect(stacking.modalZ).toBeGreaterThan(stacking.targetZ);
    expect(stacking.centerIsModal).toBeTruthy();
    expect(stacking.targetAnimationState).toBe('paused');
    expect(stacking.targetBoxShadow).toBe('none');
    await expect(dialog).toBeVisible();
  });

  test('traps keyboard focus, closes with Escape, and restores focus to the opener', async ({ page }) => {
    const { dialog, opener } = await openWorkedLesson(page);
    await expect(dialog).toContainText(/Photosynthesis/i);
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBeTruthy();
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBeTruthy();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('stays usable at phone width and supports a persistent compact state', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 760 });
    const banner = page.locator('.allo-guided-banner');
    const fits = await banner.evaluate((node) => node.scrollWidth <= node.clientWidth + 1);
    expect(fits).toBeTruthy();
    const jump = banner.locator('#guided-step-jump');
    await expect(jump).toBeVisible();
    await jump.selectOption('0');
    await expect(banner).toContainText(/Source Material/i);
    const shortestControl = await banner.locator('button, select').evaluateAll((nodes) => Math.min(...nodes.filter((node) => !(node as HTMLButtonElement).disabled).map((node) => node.getBoundingClientRect().height)));
    expect(shortestControl).toBeGreaterThanOrEqual(39);
    const collapse = banner.getByRole('button', { name: /Collapse Guided Mode/i });
    await collapse.click();
    await expect(banner.locator('#guided-banner-details')).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('allo_guided_ui_state') || '{}').collapsed)).toBe(true);
    await banner.getByRole('button', { name: /Expand Guided Mode/i }).click();
    await expect(banner.locator('#guided-banner-details')).toBeVisible();
  });

  test('Resume later closes Guided Mode while keeping its saved step', async ({ page }) => {
    await page.locator('.allo-guided-banner').getByRole('button', { name: /Resume later/i }).click();
    await expect(page.locator('.allo-guided-banner')).toBeHidden();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('allo_guided_progress') || '{}'));
    expect(saved.guidedStep).toBe(1);
  });
});