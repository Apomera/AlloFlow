import { Page, expect } from '@playwright/test';

/**
 * Wait for AlloFlow to load + dismiss the mode-picker modal.
 * Default: picks "Learning Tools" which exposes STEM Lab / SEL Hub tiles.
 * The mode picker uses <div role="button"> so we use getByRole or aria-label.
 */
export async function bootAlloFlow(page: Page, mode: 'learning' | 'full' = 'learning'): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => document.body.innerHTML.length > 5000, null, { timeout: 30000 });

  // Mode picker is divs with role="button" + aria-label starting with "Full Platform"/"Learning Tools"/etc
  const target = mode === 'learning' ? /Learning Tools/i : /Full Platform/i;
  const card = page.getByRole('button', { name: target }).first();
  // Wait briefly for it to appear
  await card.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  if (await card.count() > 0) {
    await card.click({ force: true }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  // Dismiss tutorial overlays
  for (const sel of [
    'button:has-text("Got it")',
    'button:has-text("Skip")',
    'button:has-text("Dismiss")',
    'button:has-text("Close")',
    '[role="button"]:has-text("Got it")',
    'button[aria-label*="close" i]:visible',
  ]) {
    const btn = page.locator(sel).first();
    if (await btn.count() > 0 && await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

/** Click STEM Lab tile from the Learning Tools landing. Returns when modal is open. */
export async function openStemLab(page: Page): Promise<void> {
  // STEM Lab tile in Learning Tools landing
  const tile = page.getByRole('button', { name: /STEM Lab/i }).first();
  await tile.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  await tile.click({ force: true });
  await page.waitForTimeout(2500);
}

/** Click SEL Hub tile. */
export async function openSelHub(page: Page): Promise<void> {
  const tile = page.getByRole('button', { name: /SEL Hub/i }).first();
  await tile.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  await tile.click({ force: true });
  await page.waitForTimeout(2500);
}

/** Open a specific STEM Lab tool by display name (e.g. "Optics", "Solar System"). */
export async function openStemTool(page: Page, toolName: string | RegExp): Promise<void> {
  const pattern = typeof toolName === 'string' ? new RegExp(toolName, 'i') : toolName;
  // Tool tiles in the STEM Lab catalog
  const tile = page.getByRole('button', { name: pattern }).first();
  await tile.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  await tile.click({ force: true });
  await page.waitForTimeout(2500);
}
