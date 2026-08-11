import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const labs = [
  { id: 'heatLab', label: 'Heat & Thermodynamics Lab', marker: '[data-heat-lab]', file: 'stem_lab/stem_tool_heatlab.js' },
  { id: 'nuclearLab', label: 'Nuclear & Radiation Lab', marker: '[data-nuclear-lab]', file: 'stem_lab/stem_tool_nuclearlab.js' },
];

for (const lab of labs) {
  test(lab.label + ' opens, recovers, and renders in the local app', async ({ page }) => {
    let failedOnce = false;
    const source = fs.readFileSync(path.join(process.cwd(), lab.file), 'utf8');
    await page.route('**/' + lab.file + '*', async (route) => {
      if (!failedOnce) {
        failedOnce = true;
        await route.abort('failed');
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: source });
    });

    await page.goto('/');
    const quote = String.fromCharCode(34);
    const learningTools = page.locator('[role=' + quote + 'button' + quote + '][aria-label^=' + quote + 'Learning Tools.' + quote + ']').first();
    await expect(learningTools).toBeVisible({ timeout: 60000 });
    await learningTools.click({ force: true });
    const stemTile = page.locator('button').filter({ hasText: /STEM Lab.*interactive math/i }).first();
    await expect(stemTile).toBeVisible({ timeout: 30000 });
    await stemTile.click({ force: true });

    const toolTile = page.getByRole('button', { name: new RegExp(lab.label, 'i') }).first();
    await expect(toolTile).toBeVisible({ timeout: 30000 });
    await toolTile.click();

    const retry = page.getByRole('button', { name: 'Retry loading ' + lab.label });
    await expect(retry).toBeVisible({ timeout: 30000 });
    await retry.focus();
    await expect(retry).toBeFocused();
    await retry.click();
    await expect(page.locator(lab.marker)).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('heading', { name: lab.label })).toBeVisible();
    expect(failedOnce).toBeTruthy();
  });
}
