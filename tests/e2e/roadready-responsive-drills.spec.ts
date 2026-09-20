import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 780, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'], probes: "window.__testHooks={};document.documentElement.classList.add('theme-dark');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

for (const [view, title, worldWidth] of [['threePoint', '3-point turn', 650], ['backingDrill', 'Straight backing', 600]] as const) {
  test(view + ' keeps the full scene visible at 320px and preserves position when resized', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await harness.mount(page, { roadReady: { view, reducedMotion: true } }, undefined, { expectCanvas: false });
    await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
    await page.waitForFunction(() => document.querySelector<HTMLCanvasElement>('#wrap canvas')?.height === 480);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    const progress = page.getByRole('status', { name: 'Practice progress' });
    await expect(progress).toContainText('Score 100/100');
    const geometry = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('#wrap canvas')!;
      const rect = canvas.getBoundingClientRect();
      const c = (window as any).__testHooks.maneuverDrill.carRef.current;
      return { width: canvas.width, height: canvas.height, ratio: rect.width / rect.height, x: c.x, y: c.y, overflow: document.documentElement.scrollWidth };
    });
    expect(geometry.width).toBe(worldWidth);
    expect(geometry.ratio).toBeCloseTo(worldWidth / 480, 2);
    expect(geometry.x - 30).toBeGreaterThan(0); expect(geometry.x + 30).toBeLessThan(worldWidth);
    expect(geometry.overflow).toBeLessThanOrEqual(320);
    await page.screenshot({ path: `reports/roadready-review/${view}-responsive-320.png`, fullPage: true, scale: 'css' });
    await page.setViewportSize({ width: 1140, height: 950 });
    await expect.poll(() => page.evaluate(() => document.querySelector('#wrap canvas')!.getBoundingClientRect().width)).toBeGreaterThan(600);
    expect(await page.evaluate(() => { const c = (window as any).__testHooks.maneuverDrill.carRef.current; return { x: c.x, y: c.y }; })).toEqual({ x: geometry.x, y: geometry.y });
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(() => (window as any).__testHooks.maneuverDrill.carRef.current.speed)).toBeGreaterThan(2);
    await page.keyboard.up('w');
    await page.getByRole('button', { name: 'Reset practice', exact: true }).click();
    expect(await page.evaluate(() => { const c = (window as any).__testHooks.maneuverDrill.carRef.current; return { x: c.x, y: c.y, speed: c.speed }; })).toEqual({ x: geometry.x, y: geometry.y, speed: 0 });
    await page.screenshot({ path: `reports/roadready-review/${view}-responsive-desktop.png`, fullPage: true, scale: 'css' });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
}
