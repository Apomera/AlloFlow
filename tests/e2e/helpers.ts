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

  // Function to wait for loading screen to be detached
  const waitLoader = async () => {
    const loader = page.locator('div[role="status"]').filter({ hasText: /AlloFlow/i }).first();
    if (await loader.count() > 0) {
      console.log('Waiting for AlloFlow loading screen to disappear...');
      await loader.waitFor({ state: 'detached', timeout: 180000 }).catch(() => {});
      console.log('AlloFlow loading screen disappeared/detached!');
    }
  };

  await waitLoader();

  // Mode picker is divs with role="button" + aria-label starting with "Full Platform"/"Learning Tools"/etc
  const target = mode === 'learning' ? /Learning Tools/i : /Full Platform/i;
  const card = page.getByRole('button', { name: target }).first();

  console.log('Waiting for mode picker card to be visible...');
  await card.waitFor({ state: 'visible', timeout: 30000 });
  console.log('Mode picker card is visible! Clicking it...');
  await page.waitForTimeout(1000); // Allow hydration
  // Click without force to ensure standard actionability (not covered, etc.)
  await card.click({ timeout: 15000 });
  await page.waitForTimeout(2000);

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
      const ariaLabel = (await btn.getAttribute('aria-label').catch(() => '')) || '';
      if (ariaLabel.toLowerCase().includes('learning hub') || ariaLabel.toLowerCase().includes('learning tools')) {
        console.log(`Skipping dismiss for learning hub close button: ${ariaLabel}`);
        continue;
      }
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
