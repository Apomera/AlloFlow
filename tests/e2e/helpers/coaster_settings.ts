import type { Page } from '@playwright/test';

/**
 * Coaster Lab (2026-11-23 round 2): the top bar keeps Test run, Ride & Solve,
 * Camera, Reset design and the guide in view; theme, FX, sound, motion, track
 * overlay, vectors, row, friction, scene focus and the Ride & Solve question
 * pickers live in ONE "Settings" drawer (#clab-settings, opened by
 * #clab-btnSettings). Open it before using one of those controls. Idempotent.
 * While scene focus is on, #clab-btnSceneFocus ("Restore panels") sits in the
 * bar itself, so it never needs the drawer.
 */
export async function openCoasterSettings(page: Page): Promise<void> {
  const toggle = page.locator('#clab-btnSettings');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}

/** Shut the drawer again (idempotent), e.g. before a layout-sensitive check. */
export async function closeCoasterSettings(page: Page): Promise<void> {
  const toggle = page.locator('#clab-btnSettings');
  if ((await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click();
}
