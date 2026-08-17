import { test, expect, Page } from '@playwright/test';

/**
 * X1 (wave 3): the deep-link visitor journey, end to end against the live shell.
 *
 * Why this suite exists: the visitor banner shipped on 2026-08-16 rendering
 * UNDERNEATH the STEM overlay (z-40 vs z-[9999]) and every unit assertion was
 * green — only a screenshot taken for documentation caught it. The hit-test in
 * this spec (document.elementFromPoint at the banner's centre must resolve to
 * the banner) is the regression pin for that exact class of miss: "renders in
 * the DOM" and "a visitor can actually see and click it" are different claims.
 *
 * Deep links live at the ORIGIN root (/_redirects: /water-cycle -> /app/?tool=...),
 * so navigation here uses absolute paths, not the /app/ base. Cold boot of the
 * live shell plus the deep-link apply can take 15-75s headless; every wait is
 * condition-based with a generous ceiling.
 */

test.describe.configure({ timeout: 180000 });

async function gotoDeepLink(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body && document.body.innerHTML.length > 5000, null, { timeout: 90000 });
}

const BANNER = 'div[role="complementary"][aria-label="About this tool"]';

test('/water-cycle opens the tool with a visible, clickable visitor banner', async ({ page }) => {
  await gotoDeepLink(page, '/water-cycle');

  // The tool actually opened: STEM overlay content mentions the Water Cycle.
  await expect(page.locator('body')).toContainText(/water cycle/i, { timeout: 120000 });

  const banner = page.locator(BANNER);
  await expect(banner).toBeVisible({ timeout: 60000 });
  await expect(banner).toContainText('One tool from AlloFlow');

  // The z-order pin: the topmost element at the banner's centre must be the
  // banner (or a child of it). At z-40 this returned the STEM overlay.
  const hitIsBanner = await banner.evaluate((node: HTMLElement) => {
    const r = node.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (hit === node || node.contains(hit));
  });
  expect(hitIsBanner, 'elementFromPoint at banner centre must resolve inside the banner (z-order regression)').toBe(true);

  // The call to action goes to the full app.
  const href = await banner.locator('a', { hasText: 'Explore the full app' }).getAttribute('href');
  expect(href).toBe('/app/');

  // Dismiss actually removes it (real click, not element.click() — the
  // clickability claim is the point).
  await banner.getByRole('button', { name: 'Dismiss this note' }).click();
  await expect(banner).toHaveCount(0, { timeout: 10000 });
});

test('/tree-lab resolves to its tool too (the map generalises past waterCycle)', async ({ page }) => {
  await gotoDeepLink(page, '/tree-lab');
  await expect(page.locator('body')).toContainText(/tree/i, { timeout: 120000 });
  await expect(page.locator(BANNER)).toBeVisible({ timeout: 60000 });
});

test('an unknown ?tool= shows the normal app with no banner', async ({ page }) => {
  await page.goto('./?tool=notARealToolSlug', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body && document.body.innerHTML.length > 5000, null, { timeout: 90000 });
  // Give the shell time to have applied a deep link if it wrongly resolved one,
  // then assert the banner never appeared. Condition: app chrome is interactive.
  await page.waitForFunction(() => document.querySelectorAll('button').length > 3, null, { timeout: 60000 });
  await expect(page.locator(BANNER)).toHaveCount(0);
});
