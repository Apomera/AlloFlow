import type { Page } from '@playwright/test';

/** Existing feature regressions exercise the explicitly available all-tools
 * workspace. The focused navigation and linked flow have their own browser spec. */
export async function showScaleExplorerTools(page: Page) {
  const button = page.getByRole('button', { name: 'Show all tools', exact: true });
  if (await button.count()) await button.click();
}
