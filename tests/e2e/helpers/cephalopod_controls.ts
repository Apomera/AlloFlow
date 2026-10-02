import { expect, Page } from '@playwright/test';

// The same real secondary buttons move into Tools in compact layouts.
// Follow the visible UI without changing viewport, game state or keyboard rules.
export async function clickCephalopodControl(page: Page, name: 'Inspect' | 'Help / settings' | 'Observe') {
  const stage = page.locator('.cl-hunt-stage');
  const label = name === 'Inspect' ? /^Inspect(?: \[F\])?$/ : name;
  const button = stage.getByRole('button', { name: label, exact: true });
  if (!await button.isVisible()) {
    const tools = stage.getByRole('button', { name: 'Tools', exact: true });
    await expect(tools).toBeVisible();
    await tools.click();
  }
  await expect(button).toBeVisible();
  await button.click();
}
