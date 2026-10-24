import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const phase = process.env.AVIAN_SIM_PHASE || 'final';
const output = resolve('reports/avian-simulations-round8-2026-10-18', phase);
test.use({ video: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });
for (const surface of ['section', 'feathers', 'wingtip']) {
  test.describe(surface + ' visual review', () => {
    const bird = surface !== 'feathers';
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
      const state = surface === 'feathers' ? { raptorHunt: { activeSection: 'silent' } } : { birdLab: { view: surface === 'section' ? 'wingTypes' : 'observatory3d', wingSel: 'soaring' } };
      await harness.mount(page, state, undefined, { expectCanvas: false });
      await page.locator('#wrap').evaluate((element: HTMLElement, size) => { element.style.width = size + 'px'; element.style.maxWidth = '100%'; element.style.height = 'auto'; element.style.padding = '0'; }, width);
      let selector = '#wrap';
      if (surface === 'wingtip') {
        await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d", null, { polling: 50, timeout: 60000 });
        await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => { canvas._birdlab3d.seek(4.2); canvas._birdlab3d.inspectWingbeat(); canvas._birdlab3d.seekWingbeat(.21); });
        if (phase !== 'baseline') await page.locator('[data-birdlab-wingtip-toggle]').click();
        await page.locator('[data-birdlab-wingbeat-study]').screenshot({ path: resolve(output, `wingtip-controls-${width}.png`), timeout: 90000 });
        selector = '.birdlab-3d-stage';
      } else if (phase !== 'baseline' && surface === 'section') {
        selector = '[data-birdlab-section-study]';
        await page.locator('[data-section-pin]').click();
        await page.locator('[data-section-preset="Tilt the air"]').click();
      } else if (phase !== 'baseline') {
        selector = '[data-raptor-feather-lab]';
        await page.locator('[data-feather-feature="velvet"]').click();
        await page.locator('#rh-feather-phase').fill('650');
      }
      await expect(page.locator(selector)).toBeVisible();
      await page.locator(selector).screenshot({ path: resolve(output, `${surface === 'wingtip' ? 'wingtip-scene' : surface}-${width}.png`), timeout: 90000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const gl = surface === 'wingtip' ? await harness.glScene(page) : null;
      if (gl) expect(gl.draws).toBeGreaterThan(0);
      if (surface === 'wingtip') expect(gl).not.toBeNull();
      writeFileSync(resolve(output, `${surface}-${width}.json`), JSON.stringify({ surface, width, overflow, errors, gl }, null, 2));
      expect(overflow).toBeLessThanOrEqual(1); expect(errors).toEqual([]);
    });
  });
}
