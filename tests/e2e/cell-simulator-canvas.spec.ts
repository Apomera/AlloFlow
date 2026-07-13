import { test, expect } from '@playwright/test';
import path from 'node:path';
import { bootAlloFlow, openStemLab, openStemTool } from './helpers';

test.describe('Cell Simulator canvas stability', () => {
  test('selection, pause, and reset keep the live canvas attached', async ({ page }) => {
    test.setTimeout(120000);

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    await page.route(/.*stem_tool_cell\.js.*/, async (route) => {
      await route.fulfill({
        path: path.join(process.cwd(), 'stem_lab', 'stem_tool_cell.js'),
        contentType: 'application/javascript',
      });
    });

    await bootAlloFlow(page, 'learning');
    await openStemLab(page);
    await openStemTool(page, /Cell/i);

    const stage = page.locator('[data-cell-stage]').first();
    await expect(stage).toBeVisible({ timeout: 20000 });

    const canvas = page.locator('[data-cell-sim-canvas]').first();
    await expect(canvas).toBeVisible({ timeout: 20000 });
    const status = page.locator('#cell-sim-status');
    if (await status.count()) {
      await expect(status).toContainText(/Zoom/i);
    }

    const before = await canvas.evaluate((el: HTMLCanvasElement & { _cellSimInit?: boolean; _cellSimAlive?: boolean }) => ({
      init: !!el._cellSimInit,
      alive: !!el._cellSimAlive,
      width: el.width,
      height: el.height,
    }));

    expect(before.init).toBeTruthy();
    expect(before.alive).toBeTruthy();
    expect(before.width).toBeGreaterThan(0);
    expect(before.height).toBeGreaterThan(0);

    await page.getByRole('button', { name: /Pause simulation/i }).first().click();
    await expect(page.getByRole('button', { name: /Play simulation/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /Amoeba/i }).first().click();
    if (await status.count()) {
      await expect(status).toContainText(/selected/i);
    } else {
      await expect(stage.getByText(/Amoeba selected/i)).toBeVisible();
    }

    await page.getByRole('button', { name: /Reset microscope view/i }).first().click();

    const after = await canvas.evaluate((el: HTMLCanvasElement & { _cellSimInit?: boolean; _cellSimAlive?: boolean }) => ({
      init: !!el._cellSimInit,
      alive: !!el._cellSimAlive,
      width: el.width,
      height: el.height,
    }));

    expect(after.init).toBeTruthy();
    expect(after.alive).toBeTruthy();
    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);
    expect(pageErrors.filter((msg) => !/ResizeObserver loop/i.test(msg))).toEqual([]);
  });
});
