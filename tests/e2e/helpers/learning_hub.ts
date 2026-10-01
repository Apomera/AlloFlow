import type { Locator, Page } from '@playwright/test';

/**
 * Stable selectors for the launch pad -> Learning Tools -> tile path, shared by the
 * deployed-demo specs (03, 04, 06, 07, 11).
 *
 * The launch pad's Learning Tools card is <button data-pathway="learning"
 * aria-labelledby="launch-pad-learning-title"> (view_launch_pad_source.jsx). The old
 * [role="button"][aria-label^="Learning Tools."] form no longer exists, so every spec
 * that used it timed out before testing anything.
 *
 * Learning Hub tiles are found by data-hub-id (view_learning_hub_modal_source.jsx), not by
 * their visible text: the STEM tile now reads "STEAM Lab", and ui_strings can override
 * every label and description.
 */
export const LEARNING_TOOLS_CARD = '[data-pathway="learning"]';

export function learningToolsCard(page: Page): Locator {
  return page.locator(LEARNING_TOOLS_CARD).first();
}

export function hubTile(page: Page, hubId: string): Locator {
  return page.locator(`[data-hub-id="${hubId}"] [data-hub-launch]`).first();
}
