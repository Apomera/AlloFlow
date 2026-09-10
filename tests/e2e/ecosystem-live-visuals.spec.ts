import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
test('valid live samples, pause, responsive canvas and theme visuals', async ({ page }) => {
  await page.setViewportSize({ width: 1140, height: 940 });
  await harness.mount(page, { ecosystem: { tutorialDismissed: true, tab: 'explore' } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white';
  });
  await page.screenshot({ path: 'reports/ecosystem-enhancement/after-overview.png' });
  const canvas = page.locator('[data-eco-canvas]');
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => (window as any).__toolData.ecosystem.livePopHistory?.length >= 12);
  // An opaque background must cover the valleys between the sky and rolling ground.
  expect(await canvas.evaluate((el: HTMLCanvasElement) => {
    const pixels = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data;
    let transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) transparent++;
    return transparent;
  })).toBe(0);
  const samples = await page.evaluate(() => (window as any).__toolData.ecosystem.livePopHistory);
  expect(samples.every((p: any) => Number.isFinite(p.prey) && Number.isFinite(p.pred) && Number.isFinite(p.vegHealth) && Number.isFinite(p.dayPhase))).toBe(true);
  await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
  const pausedHistory = await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.livePopHistory));
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.livePopHistory))).toBe(pausedHistory);
  const chart = page.locator('[data-eco-live-chart]');
  await expect(chart).toBeAttached();
  const points = await chart.locator('polyline').evaluateAll(els => els.map(e => e.getAttribute('points')));
  expect(points.join(' ')).not.toMatch(/NaN|undefined|Infinity/);
  await expect(chart.locator('polyline[stroke-dasharray]')).toHaveCount(1);
  await expect(chart.locator('rect')).toHaveCount(1);
  await page.getByRole('button', { name: 'Resume simulation', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'reports/ecosystem-enhancement/after-simulation.png' });
  for (const theme of ['dark', 'contrast']) {
    await page.evaluate(t => {
      document.body.className = 'theme-' + t + (t === 'dark' ? ' dark' : '');
      document.getElementById('wrap')!.style.background = t === 'dark' ? '#0f172a' : '#000';
      const w = window as any; w.__ctx.isDark = t === 'dark'; w.__ctx.isContrast = t === 'contrast'; w.__ctx.theme = t; w.__rerender();
    }, theme);
    await page.screenshot({ path: `reports/ecosystem-enhancement/after-${theme}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.body.className = 'theme-default'; document.getElementById('wrap')!.style.background = 'white';
    const w = window as any; w.__ctx.isDark = false; w.__ctx.isContrast = false; w.__ctx.theme = 'default'; w.__rerender();
  });
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => canvas.evaluate((el: HTMLCanvasElement) => Math.abs(el.width - Math.round(el.clientWidth * Math.min(2, devicePixelRatio))))).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'reports/ecosystem-enhancement/after-mobile.png' });
  await page.locator('[data-eco-scenario-id="kelp"]').click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-scenario', 'kelp');
  await page.screenshot({ path: 'reports/ecosystem-enhancement/after-kelp-mobile.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
