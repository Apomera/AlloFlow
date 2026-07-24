import { test, expect, Page } from '@playwright/test';

test.describe.configure({ timeout: 90000 });

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
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerHTML.length > 5000, null, { timeout: 30000 });

  const guidedCard = page.getByRole('button', { name: 'Guided Mode', exact: true }).first();
  const setupMenuButton = page.locator('[data-help-key="header_rerun_wizard"]').first();
  const waitForGuidedEntry = async (timeout: number) => expect.poll(async () =>
    (await guidedCard.count()) > 0 || (await setupMenuButton.count()) > 0,
  { timeout }).toBe(true);
  try {
    await waitForGuidedEntry(30000);
  } catch (firstStartupError) {
    // Dev/static module startup can occasionally stall while the large bundle is compiling.
    // One bounded reload keeps the journey test resilient without bypassing the real UI.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.innerHTML.length > 5000, null, { timeout: 45000 });
    try { await waitForGuidedEntry(45000); } catch (_) { throw firstStartupError; }
  }
  if ((await guidedCard.count()) > 0) {
    await guidedCard.evaluate((node: HTMLElement) => node.click());
  } else {
    await setupMenuButton.evaluate((node: HTMLElement) => node.click());
    const guidedMenuButton = page.locator('[data-help-key="header_guided_mode_start"]').first();
    await expect(guidedMenuButton).toBeVisible();
    await guidedMenuButton.evaluate((node: HTMLElement) => node.click());
  }

  const banner = page.locator('.allo-guided-banner');
  const roleChoice = page.locator('[data-help-key="role_teacher"]').first();
  const quickStartSkip = page.getByRole('dialog', { name: /Quick Start/i })
    .getByRole('button', { name: 'Skip', exact: true });
  await expect.poll(async () => {
    if (await roleChoice.isVisible().catch(() => false)) {
      await roleChoice.evaluate((node: HTMLElement) => node.click());
    }
    if (await quickStartSkip.isVisible().catch(() => false)) {
      await quickStartSkip.evaluate((node: HTMLElement) => node.click());
    }
    return banner.isVisible().catch(() => false);
  }, { timeout: 30000 }).toBe(true);

  // The static harness can lack the optional role module, leaving its launch shell orphaned.
  await page.locator('[data-alloflow-launch-pad="true"]').evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
  await page.evaluate(() => document.body.classList.remove('alloflow-launchpad-active'));
  await expect(page.locator('[data-allo-guided-target="true"]')).toHaveCount(1, { timeout: 20000 });
  await expect(banner).toContainText(/Analyze/i);
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
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    await enterGuidedAnalysis(page);
  });

  test('keeps the target-bound highlight underneath the worked-lesson modal', async ({ page }) => {
    const { dialog } = await openWorkedLesson(page);
    const stacking = await page.evaluate(() => {
      const target = document.querySelector('[data-allo-guided-target="true"]') as HTMLElement | null;
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

  test('teaches all delivery families while keeping one highlighted left-panel target', async ({ page }) => {
    const banner = page.locator('.allo-guided-banner');
    const jump = banner.locator('#guided-step-jump');
    const deliveryOption = jump.locator('option').filter({ hasText: 'Preview, Package & Deliver' });
    const deliveryValue = await deliveryOption.getAttribute('value');
    expect(deliveryValue).not.toBeNull();
    await jump.selectOption(deliveryValue!);
    const jumpConfirm = banner.getByRole('button', { name: /Jump and mark skipped/i });
    if (await jumpConfirm.isVisible().catch(() => false)) await jumpConfirm.click();

    await expect(banner).toContainText('Preview, Package & Deliver');
    await expect(banner.getByRole('region', { name: /Choose delivery by purpose/i })).toBeVisible();
    for (const label of ['Print & editable documents', 'Web, reading & accessibility', 'LMS & interactive packages', 'Assign & share', 'Resource-specific exports']) {
      await expect(banner).toContainText(label);
    }
    for (const action of ['Document Builder', 'Homework QR', 'Live session', 'Test student link']) {
      await expect(banner.getByRole('button', { name: action, exact: true })).toBeVisible();
    }
    await expect(page.locator('[data-allo-guided-target="true"]')).toHaveCount(1);
    await expect(page.locator('#tour-tool-fullpack')).toHaveAttribute('data-allo-guided-target', 'true');
    await expect(page.locator('#tour-tool-directions')).toBeHidden();
    await expect(page.locator('#tour-tool-alignment')).toBeHidden();
    await expect(page.locator('#tour-tool-lesson-plan')).toBeHidden();
  });
  test('Resume later closes Guided Mode while keeping its saved step', async ({ page }) => {
    await page.locator('.allo-guided-banner').getByRole('button', { name: /Resume later/i }).click();
    await expect(page.locator('.allo-guided-banner')).toBeHidden();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('allo_guided_progress') || '{}'));
    expect(saved.guidedStep).toBe(1);
  });
});