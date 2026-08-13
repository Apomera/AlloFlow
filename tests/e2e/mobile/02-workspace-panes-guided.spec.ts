import { expect, Page, test } from '@playwright/test';
import { routeCdnToWorkingTree, settle } from './mobile-helpers';

test.describe.configure({ timeout: 180000 });

async function enterGuidedAnalysis(page: Page): Promise<void> {
  await routeCdnToWorkingTree(page);
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
  await page.waitForFunction(
    () => !!document.body && document.body.innerHTML.length > 5000,
    null,
    { timeout: 90000 },
  );

  const guidedCard = page.getByRole('button', { name: 'Guided Mode', exact: true }).first();
  const setupButton = page.locator('[data-help-key="header_rerun_wizard"]').first();
  await expect.poll(async () => (await guidedCard.count()) > 0 || (await setupButton.count()) > 0, {
    timeout: 60000,
  }).toBe(true);
  if (await guidedCard.count()) {
    await guidedCard.evaluate((node: HTMLElement) => node.click());
  } else {
    await setupButton.evaluate((node: HTMLElement) => node.click());
    await page.locator('[data-help-key="header_guided_mode_start"]').first()
      .evaluate((node: HTMLElement) => node.click());
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
  }, { timeout: 60000 }).toBe(true);

  await page.locator('[data-alloflow-launch-pad="true"]')
    .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
  await page.evaluate(() => document.body.classList.remove('alloflow-launchpad-active'));
  await expect(page.locator('[data-allo-guided-target="true"]')).toHaveCount(1, { timeout: 30000 });
  await expect(page.locator('[data-allo-guided-target="true"]')).toBeVisible();
}

test('keeps Guided work reachable across the 1100px workspace breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1099, height: 900 });
  await enterGuidedAnalysis(page);

  const workspaceNav = page.getByRole('navigation', { name: 'Workspace views' });
  const createTab = page.locator('#workspace-tab-create');
  const previewTab = page.locator('#workspace-tab-preview');
  const historyTab = page.locator('#workspace-tab-history');
  const target = page.locator('[data-allo-guided-target="true"]');

  await expect(workspaceNav).toBeVisible();
  await expect(createTab).toHaveAttribute('aria-selected', 'true');
  await expect(historyTab).toBeDisabled();
  await expect(target).toBeVisible();

  await previewTab.click();
  await expect(previewTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#workspace-preview-pane')).toBeVisible();
  await expect(page.locator('#workspace-sidebar-pane')).toBeHidden();

  await createTab.click();
  await expect(page.locator('#workspace-sidebar-pane')).toBeVisible();
  await expect(target).toBeVisible();
  await page.locator('.allo-guided-banner').getByRole('button', { name: /Focus highlighted tool/i }).click();
  expect(await page.evaluate(() => {
    const current = document.querySelector('[data-allo-guided-target="true"]');
    return !!current && !!document.activeElement && current.contains(document.activeElement);
  })).toBe(true);

  await page.setViewportSize({ width: 1100, height: 900 });
  await settle(page, 500);
  await expect(workspaceNav).toHaveCount(0);
  await expect(page.locator('#workspace-sidebar-pane')).toBeVisible();
  await expect(page.locator('#workspace-preview-pane')).toBeVisible();
  await expect(target).toBeVisible();

  const splitter = page.getByRole('separator', { name: 'Resize Create and Preview panes' });
  await expect(splitter).toBeVisible();
  const before = Number(await splitter.getAttribute('aria-valuenow'));
  await splitter.focus();
  await page.keyboard.press('ArrowRight');
  await expect(splitter).toHaveAttribute('aria-valuenow', String(Math.min(70, before + 2)));

  await page.setViewportSize({ width: 1099, height: 900 });
  await settle(page, 500);
  await expect(workspaceNav).toBeVisible();
  await page.locator('.allo-guided-banner').getByRole('button', { name: /Resume later/i }).click();
  await expect(page.locator('.allo-guided-banner')).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('allo_guided_progress') || '{}'));
  expect(saved.guidedStep).toBe(1);
  await expect(page.locator('#webpack-dev-server-client-overlay')).toHaveCount(0);
});
