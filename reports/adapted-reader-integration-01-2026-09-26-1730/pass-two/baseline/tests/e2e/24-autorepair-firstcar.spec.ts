import { test, expect } from '@playwright/test';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_autorepair.js',
  toolId: 'autoRepair',
  width: 1180,
  height: 1700,
});

function visualPath(name: string, fallback: (name: string) => string): string {
  return process.env.FIRSTCAR_VISUAL_OUTPUT
    ? join(process.env.FIRSTCAR_VISUAL_OUTPUT, name)
    : fallback(name);
}

test.describe('Auto Repair First Car ownership route in Chromium', () => {
  test.describe.configure({ mode: 'serial', timeout: 150_000 });

  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('renders and drives the four-station ownership route', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await harness.mount(page, {
      autoRepair: {
        view: 'firstcar',
        firstCarWeek: 2,
        firstCarDone: {
          'firstcar-title-transfer': true,
          'firstcar-insurance-active': true,
          'firstcar-owners-manual': true,
          'firstcar-exterior-lights': true,
          'firstcar-recall-check': true,
          stale: true,
        },
      },
    }, undefined, { expectCanvas: false });

    const shell = page.locator('main.ar-firstcar-shell[data-ar-firstcar-shell]');
    await expect(shell).toHaveAttribute('data-ar-firstcar-state', 'in-progress');
    await expect(shell).toHaveAttribute('data-ar-firstcar-count', '5');
    await expect(shell.locator('[data-ar-firstcar-progress]')).toHaveAttribute('aria-valuemax', '18');
    await expect(shell.locator('[data-ar-firstcar-week]')).toHaveCount(4);
    await expect(shell.locator('[data-ar-firstcar-task]')).toHaveCount(18);
    await expect(shell.locator('[data-ar-firstcar-before-drive]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    for (const object of ['road', 'vehicle', 'keys', 'fluids', 'tire', 'shield']) {
      await expect(shell.locator(`[data-ar-firstcar-object="${object}"]`)).toHaveCount(1);
    }

    const week3 = shell.locator('button[data-ar-firstcar-week="3"]');
    await week3.click();
    await expect(week3).toHaveAttribute('aria-pressed', 'true');
    await expect(shell.locator('[data-ar-firstcar-week-panel="3"]')).toBeVisible();

    const underbody = shell.locator('[data-ar-firstcar-task="underbody-inspection"]');
    await underbody.locator('.ar-firstcar-check').click();
    await expect(shell).toHaveAttribute('data-ar-firstcar-count', '6');
    await expect(underbody).toHaveAttribute('data-ar-firstcar-task-state', 'complete');

    const saved = await page.evaluate(() => (window as any).__toolData.autoRepair.firstCarDone);
    expect(saved['firstcar-underbody-inspection']).toBe(true);
    expect(saved.stale).toBe(true);

    const runtimeErrors = await page.evaluate(() => (window as any).__events.errors);
    expect(runtimeErrors).toEqual([]);
    await page.screenshot({ path: visualPath('autorepair-firstcar-desktop.png', testInfo.outputPath.bind(testInfo)), fullPage: true });
  });

  test('keeps controls contained at phone width and prints every week', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await harness.mount(page, {
      autoRepair: { view: 'firstcar', firstCarWeek: 3, firstCarDone: { 'w1-0': true } },
    }, undefined, { expectCanvas: false });
    await page.evaluate(() => {
      const wrap = document.getElementById('wrap');
      if (wrap) { wrap.style.width = '390px'; wrap.style.height = 'auto'; }
    });

    const shell = page.locator('main.ar-firstcar-shell');
    await expect(shell).toHaveAttribute('data-ar-firstcar-count', '1');
    await expect(shell.locator('[data-ar-firstcar-week-panel="3"]')).toBeVisible();
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      shellWidth: Math.ceil(document.querySelector('[data-ar-firstcar-shell]')!.getBoundingClientRect().width),
    }));
    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
    expect(overflow.shellWidth).toBeLessThanOrEqual(390);

    for (const selector of ['button[data-ar-firstcar-week]', '.ar-firstcar-check', '.ar-firstcar-action']) {
      for (const control of await shell.locator(selector).filter({ visible: true }).all()) {
        const box = await control.boundingBox();
        expect(box?.height || 0).toBeGreaterThanOrEqual(44);
      }
    }
    await page.screenshot({ path: visualPath('autorepair-firstcar-phone.png', testInfo.outputPath.bind(testInfo)), fullPage: true });

    await page.emulateMedia({ media: 'print' });
    const panelDisplays = await shell.locator('[data-ar-firstcar-week-panel]').evaluateAll((panels) => panels.map((panel) => getComputedStyle(panel).display));
    expect(panelDisplays).toEqual(['block', 'block', 'block', 'block']);

    const runtimeErrors = await page.evaluate(() => (window as any).__events.errors);
    expect(runtimeErrors).toEqual([]);
  });
});
