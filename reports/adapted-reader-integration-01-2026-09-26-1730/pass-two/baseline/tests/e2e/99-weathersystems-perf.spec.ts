import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Playing the forecast rebuilds the 3D scene every model hour. Each rebuild used to create
 * a new renderer and dispose every material first, so all 16 shader programs were relinked
 * every hour: profiled at 9.6 s of an 11.2 s hour change on a software GPU, and a visible
 * hitch per hour on a weak laptop GPU. The renderer is now carried from one rebuild to the
 * next and the old scene is retired only after the new one holds the compiled programs.
 *
 * This pins the three things that fix has to keep true: an hour change links no programs
 * and keeps the renderer; GPU memory stays bounded across many hours (the old scenes really
 * are freed, shadow maps and material textures included); and leaving the 3D view still
 * frees everything.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js',
  toolId: 'weatherSystems',
  width: 1600,
  height: 1100,
  appStyles: true
});

const gpu = (page: Page) => page.evaluate(() => {
  const r = (document.querySelector('[data-weather-immersive-canvas]') as any)?.__weatherRenderer;
  return r ? { geometries: r.info.memory.geometries, textures: r.info.memory.textures, programs: r.info.programs ? r.info.programs.length : -1 } : null;
});
const toHour = async (page: Page, hour: number) => {
  await page.getByRole('slider', { name: 'Forecast model hour' }).fill(String(hour));
  await expect.poll(() => page.evaluate(() =>
    Number((document.querySelector('[data-weather-forecast-hour]') as HTMLElement).getAttribute('data-weather-forecast-hour'))), { timeout: 60000 }).toBe(hour);
};

test.describe('Weather Systems — playback performance', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('hour changes reuse the renderer and its programs, and free the old scenes', async ({ page }) => {
    test.setTimeout(300000);
    await page.addInitScript(() => {
      const w = window as any;
      w.__links = 0;
      for (const proto of [w.WebGL2RenderingContext && w.WebGL2RenderingContext.prototype, w.WebGLRenderingContext && w.WebGLRenderingContext.prototype]) {
        if (!proto) continue;
        const link = proto.linkProgram;
        proto.linkProgram = function (p: any) { w.__links += 1; return link.call(this, p); };
      }
    });
    await harness.mount(page, { weatherSystems: { tab: 'immersive', scenario: 'coldFront', simHour: 2 } }, undefined, { expectCanvas: false });
    await page.waitForFunction(() => !!(document.querySelector('[data-weather-immersive-canvas]') as any)?.__weatherRenderer, null, { timeout: 120000 });
    // Let the first scene compile everything it will use.
    await page.waitForTimeout(5000);
    const start = await gpu(page);
    console.log('after the first build:', JSON.stringify(start));
    expect(start!.programs, 'the first scene compiled no programs, so this proves nothing').toBeGreaterThan(5);
    await page.evaluate(() => { (window as any).__links = 0; (window as any).__firstRenderer = (document.querySelector('[data-weather-immersive-canvas]') as any).__weatherRenderer; });

    // 1. One hour change: same renderer, no program linked.
    await toHour(page, 3);
    await page.waitForTimeout(4000);
    expect(await page.evaluate(() => (document.querySelector('[data-weather-immersive-canvas]') as any).__weatherRenderer === (window as any).__firstRenderer), 'a new renderer per hour').toBe(true);
    expect(await page.evaluate(() => (window as any).__links), 'shader programs relinked by an hour change').toBe(0);

    // 2. Many hour changes: the old scenes are freed, so GPU memory does not climb.
    for (const hour of [4, 5, 6, 7, 8]) { await toHour(page, hour); await page.waitForTimeout(1500); }
    await page.waitForTimeout(4000);
    const after = await gpu(page);
    console.log('after six hour changes:', JSON.stringify(after));
    expect(after!.textures, 'textures leaked across hour changes').toBeLessThanOrEqual(start!.textures + 2);
    expect(after!.geometries, 'geometries leaked across hour changes').toBeLessThanOrEqual(start!.geometries + 6);

    // 3. Leaving the 3D view frees the carried renderer's scene too.
    const renderer = await page.evaluateHandle(() => (document.querySelector('[data-weather-immersive-canvas]') as any).__weatherRenderer);
    // The tab's text is its icon and label, so match the label as a suffix.
    await page.getByText(/Cause & Effect Lab$/).first().click();
    // At most 1 remains: the renderer's own full-screen quad for soft (VSM) shadows, which is
    // not part of any scene (with shadows off this reaches exactly 0).
    await expect.poll(() => renderer.evaluate((r: any) => r.info.memory.geometries + r.info.memory.textures), { timeout: 30000, message: 'the 3D scene was not freed after leaving the view' }).toBeLessThanOrEqual(1);
    // And the context is released, as it was before the renderer was carried.
    await expect.poll(() => renderer.evaluate((r: any) => r.getContext().isContextLost()), { timeout: 30000, message: 'the WebGL context was kept after leaving the view' }).toBe(true);
  });
});
