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

  // Support both the current native buttons and older role="button" cards.
  const card = page.getByRole('button', {
    name: mode === 'learning' ? /^Learning Tools\b/i : /^Full Platform\b/i,
  }).first();
  const launchPad = page.getByRole('region', { name: /Choose how to use AlloFlow/i });

  // A remembered mode can restore directly into the app, so accept either
  // valid boot state instead of waiting forever for a first-run picker that
  // will never appear.
  const sourceInput = page.getByRole('textbox', { name: /Source material input/i }).first();
  console.log('Waiting for the mode picker or the ready app...');
  const bootState = await Promise.race([
    card.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'picker' as const),
    sourceInput.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'app' as const),
  ]);
  // The app shell can become visible behind the modal a few milliseconds before
  // the launch card. Re-check it so pointer-based tests never start under it.
  const pickerVisible = bootState === 'picker'
    || await card.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
  if (pickerVisible) {
    console.log('Mode picker card is visible! Clicking it...');
    await page.waitForTimeout(1000); // Allow hydration
    // Click without force to ensure standard actionability (not covered, etc.)
    await card.click({ timeout: 15000 });
    await launchPad.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
  } else {
    console.log('AlloFlow restored directly into the ready app.');
  }

  // Full Platform proceeds to role selection; use the educator workspace for
  // shared app tests. Learning Tools currently selects its role directly.
  const roleDialog = page.getByRole('dialog', { name: /Welcome to AlloFlow/i });
  const teacherButton = roleDialog.getByRole('button', { name: /^Teacher\b/i });
  if (await teacherButton.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
    await teacherButton.click({ timeout: 15000 });
    await roleDialog.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  await expect(sourceInput).toBeVisible({ timeout: 30000 });

  // Dismiss tutorial overlays only inside dialogs. Unscoped text selectors can
  // otherwise click real controls such as Full Pack's own Dismiss button.
  for (const sel of [
    '[role="dialog"] button:has-text("Got it")',
    '[role="dialog"] button:has-text("Skip")',
    '[role="dialog"] button:has-text("Dismiss")',
    '[role="dialog"] button:has-text("Close")',
    '[role="dialog"] [role="button"]:has-text("Got it")',
    '[role="dialog"] button[aria-label*="close" i]:visible',
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
  const tile = page.getByRole('button', { name: /STEAM Lab/i }).first();
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
