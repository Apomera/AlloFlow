import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const labs = [
  { id: 'heatLab', label: 'Heat & Thermodynamics Lab', marker: '[data-heat-lab]', file: 'stem_lab/stem_tool_heatlab.js' },
  { id: 'nuclearLab', label: 'Nuclear & Radiation Lab', marker: '[data-nuclear-lab]', file: 'stem_lab/stem_tool_nuclearlab.js' },
];

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
];

for (const viewport of viewports) {
  for (const lab of labs) {
    test(lab.label + ' opens, recovers, and renders in the local app on ' + viewport.name, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
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

      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const pathwayChooser = page.getByRole('region', { name: 'Choose how to use AlloFlow' });
      await expect(pathwayChooser).toBeVisible({ timeout: 120000 });
      const learningTools = pathwayChooser.getByRole('button', { name: 'Learning Tools', exact: true });
      await expect(learningTools).toBeVisible();
      await learningTools.evaluate((element) => {
        window.setTimeout(() => (element as HTMLElement).click(), 0);
      });
      await expect(pathwayChooser).toBeHidden({ timeout: 60000 });
      const learningHub = page.getByRole('dialog', { name: 'Learning Tools' });
      await expect(learningHub).toBeVisible({ timeout: 30000 });
      const stemTile = learningHub.locator('[data-hub-id="stem-lab"] [data-hub-launch="true"]');
      await expect(stemTile).toBeVisible({ timeout: 30000 });
      await stemTile.evaluate((element) => {
        window.setTimeout(() => (element as HTMLElement).click(), 0);
      });
      await expect(learningHub).toBeHidden({ timeout: 60000 });

      const stemDialog = page.locator('[data-stem-lab="true"]');
      await expect(stemDialog).toBeVisible({ timeout: 30000 });
      await expect(pathwayChooser).toBeHidden();
      const toolTile = stemDialog.locator('[data-stem-tool-id="' + lab.id + '"]');
      await expect(toolTile).toBeVisible({ timeout: 30000 });
      await toolTile.evaluate((element) => {
        window.setTimeout(() => (element as HTMLElement).click(), 0);
      });

      const retry = page.getByRole('button', { name: 'Retry loading ' + lab.label });
      await expect(retry).toBeVisible({ timeout: 30000 });
      await retry.focus();
      await expect(retry).toBeFocused();
      await retry.click();
      const labRoot = page.locator(lab.marker);
      await expect(labRoot).toBeVisible({ timeout: 30000 });
      await expect(labRoot.getByRole('heading').filter({ hasText: lab.label }).first()).toBeVisible();

      const dialog = stemDialog;
      const shell = dialog.locator('.stem-lab-modal-shell');
      const scrollRegion = dialog.locator('[data-stem-scroll-region="true"]');
      await expect(dialog).toBeVisible();
      await expect(scrollRegion).toHaveCount(1);
      await expect(scrollRegion).toHaveAttribute('role', 'region');
      await expect(scrollRegion).toHaveAttribute('tabindex', '0');
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

      const bounds = await shell.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(-1);
      expect(bounds!.y).toBeGreaterThanOrEqual(-1);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);

      const slider = labRoot.getByRole('slider').first();
      await expect(slider).toBeVisible();
      await expect(slider).toHaveAccessibleName(/.+/);
      const before = await slider.inputValue();
      const maximum = Number(await slider.getAttribute('max'));
      await slider.press(Number(before) >= maximum ? 'ArrowLeft' : 'ArrowRight');
      await expect.poll(() => slider.inputValue()).not.toBe(before);

      await dialog.focus();
      await expect(dialog).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect.poll(() => page.evaluate(() => {
        const root = document.querySelector('[data-stem-lab="true"]');
        return !!root && root.contains(document.activeElement);
      })).toBe(true);

      await page.getByRole('button', { name: 'Close STEAM Lab' }).click();
      await expect(dialog).toHaveCount(0);
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
      expect(failedOnce).toBeTruthy();
    });
  }
}
