import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('reports/avian-simulations-round12-2026-10-20/final');
test.use({ video: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });
for (const surface of ['sound', 'tracking', 'course']) {
  test.describe(surface + ' visual review', () => {
    const bird = surface !== 'tracking';
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
      if (surface === 'course') await page.addInitScript(() => {
        let time = 1000, next = 1, seed = 731;
        const callbacks = new Map<number, FrameRequestCallback>();
        Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        window.requestAnimationFrame = callback => { const id = next++; callbacks.set(id, callback); return id; };
        window.cancelAnimationFrame = id => { callbacks.delete(id); };
        (window as any).round12VisualStep = () => { time += 25; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(time)); };
      });
      const state = surface === 'tracking' ? { raptorHunt: { activeSection: 'tracking' } } : { birdLab: { view: surface === 'sound' ? 'vocalDeep' : 'observatory3d' } };
      await harness.mount(page, state, undefined, { expectCanvas: false });
      await page.locator('#wrap').evaluate((element: HTMLElement, size) => { element.style.width = size + 'px'; element.style.maxWidth = '100%'; element.style.height = 'auto'; element.style.padding = '0'; element.setAttribute('data-stem-tool-shell', 'true'); }, width);
      let selector = '';
      if (surface === 'course') {
        await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d", null, { polling: 50, timeout: 60_000 });
        await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => {
          const controller = canvas._birdlab3d;
          controller.seek(7.375); controller.setCourseLens(true); controller.pinCourseStation(); controller.seek(24.625);
          for (let i = 0; i < 4; i++) (window as any).round12VisualStep();
        });
        await expect(page.locator('[data-birdlab-course-study]')).toBeVisible();
        await page.locator('[data-birdlab-course-study]').screenshot({ path: resolve(output, `course-controls-${width}.png`), timeout: 90_000 });
        selector = '.birdlab-3d-stage';
      } else if (surface === 'sound') {
        selector = '[data-birdlab-sound-study]';
        await page.locator('[data-sound-preset="same"]').click(); await page.locator('#birdlab-sound-time').fill('3.75');
        await page.locator('[data-sound-pin]').click(); await page.locator('[data-sound-preset="near"]').click();
        await page.locator('#birdlab-sound-phase').fill('75'); await page.locator('[data-sound-answer="airflow"]').click();
      } else {
        selector = '[data-raptor-tracking-study]';
        await page.locator('[data-tracking-pin]').click(); await page.locator('#rh-tracking-interval').selectOption('20');
        await page.locator('[data-tracking-gap-toggle]').click(); await page.locator('[data-tracking-last]').click();
        await page.locator('[data-tracking-answer="lower"]').click();
      }
      await expect(page.locator(selector)).toBeVisible();
      await page.locator(selector).screenshot({ path: resolve(output, `${surface}-${width}.png`), timeout: 90_000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const gl = surface === 'course' ? await harness.glScene(page) : null;
      if (surface === 'course') { expect(gl).not.toBeNull(); expect(gl!.draws).toBeGreaterThan(0); }
      writeFileSync(resolve(output, `${surface}-${width}.json`), JSON.stringify({ surface, width, overflow, errors, gl }, null, 2));
      expect(overflow).toBeLessThanOrEqual(1); expect(errors).toEqual([]);
    });
  });
}
