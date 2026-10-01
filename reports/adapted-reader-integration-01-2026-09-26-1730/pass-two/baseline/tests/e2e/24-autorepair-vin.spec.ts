import { test, expect } from '@playwright/test';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_autorepair.js',
  toolId: 'autoRepair',
  width: 1180,
  height: 1500,
});

function visualPath(name: string, fallback: (name: string) => string): string {
  return process.env.VIN_VISUAL_OUTPUT
    ? join(process.env.VIN_VISUAL_OUTPUT, name)
    : fallback(name);
}

test.describe('Auto Repair VIN identity bench in Chromium', () => {
  test.describe.configure({ mode: 'serial', timeout: 150_000 });

  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('renders the complete stamped-plate workflow and checksum states', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await harness.mount(page, { autoRepair: { view: 'vin' } }, undefined, { expectCanvas: false });

    const shell = page.locator('main.ar-vin-shell[data-ar-vin-shell]');
    await expect(shell).toHaveAttribute('data-ar-vin-state', 'empty');
    await expect(shell.locator('[data-ar-vin-cell]')).toHaveCount(17);
    await expect(shell.locator('button[data-ar-vin-segment]')).toHaveCount(6);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    await page.getByRole('button', { name: 'Load sample' }).click();
    await expect(shell).toHaveAttribute('data-ar-vin-state', 'decoded');
    await expect(shell.locator('[data-ar-vin-confidence="matched"]')).toContainText('Structure + checksum consistent');
    await expect(shell.locator('[data-ar-vin-field="check"]')).toContainText('Matches · 3');
    await expect(shell.locator('[data-ar-vin-field="maker"]')).toContainText('Honda');
    await expect(shell.locator('[data-ar-vin-lookups] a')).toHaveCount(4);

    await shell.locator('button[data-ar-vin-segment="year"]').click();
    await expect(shell.locator('[data-ar-vin-detail="year"]')).toContainText('Model-year code');
    await expect(shell.locator('[data-ar-vin-detail="year"] .ar-vin-detail-value')).toHaveText('3');

    const cells = await shell.locator('[data-ar-vin-cell]').allTextContents();
    expect(cells.join('')).toBe('1HGCM82633A004352');

    await shell.locator('[data-ar-vin-input]').fill('1HGCM82633A123456');
    await expect(shell).toHaveAttribute('data-ar-vin-state', 'warning');
    await expect(shell.locator('[data-ar-vin-field="check"]')).toContainText('expected 7');
    await expect(shell.locator('[data-ar-vin-status]')).toContainText('does not match');

    const runtimeErrors = await page.evaluate(() => (window as any).__events.errors);
    expect(runtimeErrors).toEqual([]);
    await page.screenshot({ path: visualPath('autorepair-vin-desktop.png', testInfo.outputPath.bind(testInfo)), fullPage: true });
  });

  test('keeps the full identity bench contained and usable at phone width', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await harness.mount(page, {
      autoRepair: { view: 'vin', vinInput: '1HGCM82633A004352', vinGroup: 'check' }
    }, undefined, { expectCanvas: false });
    await page.evaluate(() => {
      const wrap = document.getElementById('wrap');
      if (wrap) { wrap.style.width = '390px'; wrap.style.height = 'auto'; }
    });

    const shell = page.locator('main.ar-vin-shell[data-ar-vin-state="decoded"]');
    await expect(shell).toBeVisible();
    await expect(shell.locator('[data-ar-vin-cell]')).toHaveCount(17);
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      shellWidth: Math.ceil(document.querySelector('[data-ar-vin-shell]')!.getBoundingClientRect().width),
    }));
    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
    expect(overflow.shellWidth).toBeLessThanOrEqual(390);

    for (const button of await shell.locator('button[data-ar-vin-segment]').all()) {
      const box = await button.boundingBox();
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }
    await expect(shell.locator('.ar-vin-result-grid')).toHaveCSS('grid-template-columns', /[0-9.]+px/);

    const runtimeErrors = await page.evaluate(() => (window as any).__events.errors);
    expect(runtimeErrors).toEqual([]);
    await page.screenshot({ path: visualPath('autorepair-vin-phone.png', testInfo.outputPath.bind(testInfo)), fullPage: true });
  });
});
