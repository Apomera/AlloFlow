import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('reports/avian-simulations-round10-2026-10-18/final');
test.use({ video: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });
for (const surface of ['vane', 'visual-angle', 'wingtip-projections']) {
  test.describe(surface + ' visual review', () => {
    const bird = surface !== 'visual-angle';
    const harness = new GlHarness({ toolId: bird ? 'birdLab' : 'raptorHunt', toolFile: `stem_lab/stem_tool_${bird ? 'birdlab' : 'raptorhunt'}.js`,
      preScripts: bird ? ['stem_lab/stem_lab_module.js'] : [], appStyles: true, layout: 'document', width: 1280, height: 960 });
    test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
    test.afterAll(async () => harness.stop());
    test.afterEach(async ({ page }) => harness.destroy(page));
    for (const width of [1280, 390]) test(`${surface} at ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && /shader|WebGL|GL_INVALID/i.test(message.text())) errors.push(message.text()); });
      await page.setViewportSize({ width, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
      const state = bird ? { birdLab: { view: surface === 'vane' ? 'featherAnatomy' : 'observatory3d' } } : { raptorHunt: { activeSection: 'acuity' } };
      await harness.mount(page, state, undefined, { expectCanvas: false });
      await page.locator('#wrap').evaluate((element: HTMLElement, size) => { element.style.width = size + 'px'; element.style.maxWidth = '100%'; element.style.height = 'auto'; element.style.padding = '0'; element.setAttribute('data-stem-tool-shell', 'true'); }, width);
      let selector = '';
      if (surface === 'wingtip-projections') {
        await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d", null, { polling: 50, timeout: 60_000 });
        await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => {
          const controller = canvas._birdlab3d;
          controller.seek(4.2); controller.inspectWingbeat(); controller.seekWingbeat(.21); controller.pinWingtipPose();
          controller.seekWingbeat(.71); controller.setWingtipPaths(true); controller.setWingbeatView('front');
        });
        await page.locator('.birdlab-3d-stage').screenshot({ path: resolve(output, `wingtip-scene-${width}.png`), timeout: 90_000 });
        selector = '[data-birdlab-wingtip-projections]';
      } else if (surface === 'vane') {
        selector = '[data-birdlab-vane-study]';
        await page.locator('#birdlab-vane-opening').fill('70'); await page.locator('#birdlab-vane-stroke').fill('50');
        await page.locator('[data-vane-pin]').click(); await page.locator('#birdlab-vane-stroke').fill('70');
        await page.locator('#birdlab-vane-junction').fill('8'); await page.locator('[data-vane-lens="barbules"]').click();
        await page.locator('[data-vane-answer="reconnect"]').click();
      } else {
        selector = '[data-raptor-angle-study]';
        await page.locator('[data-angle-preset="meadow"]').click(); await page.locator('[data-angle-pin]').click();
        await page.locator('[data-angle-experiment="both"]').click(); await page.locator('#rh-angle-opacity').fill('35');
      }
      await expect(page.locator(selector)).toBeVisible();
      await page.locator(selector).screenshot({ path: resolve(output, `${surface}-${width}.png`), timeout: 90_000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const gl = surface === 'wingtip-projections' ? await harness.glScene(page) : null;
      if (surface === 'wingtip-projections') { expect(gl).not.toBeNull(); expect(gl!.draws).toBeGreaterThan(0); }
      writeFileSync(resolve(output, `${surface}-${width}.json`), JSON.stringify({ surface, width, overflow, errors, gl }, null, 2));
      expect(overflow).toBeLessThanOrEqual(1); expect(errors).toEqual([]);
    });
  });
}
