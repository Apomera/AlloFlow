import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('reports/avian-simulations-round9-2026-10-18/final');
test.use({ video: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });
for (const surface of ['breathing', 'hearing', 'flight-leg']) {
  test.describe(surface + ' visual review', () => {
    const bird = surface === 'breathing';
    const harness = new GlHarness({ toolId: bird ? 'birdLab' : 'raptorHunt', toolFile: `stem_lab/stem_tool_${bird ? 'birdlab' : 'raptorhunt'}.js`,
      preScripts: bird ? ['stem_lab/stem_lab_module.js'] : [], appStyles: true, layout: 'document', width: 1280, height: 960,
      probes: `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){if(!window.round9VisualSkip)return render(scene,camera);};return renderer;};})();` });
    test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
    test.afterAll(async () => harness.stop());
    test.afterEach(async ({ page }) => harness.destroy(page));
    for (const width of [1280, 390]) test(`${surface} at ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && /shader|WebGL|GL_INVALID/i.test(message.text())) errors.push(message.text()); });
      await page.setViewportSize({ width, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
      if (surface === 'flight-leg') await page.addInitScript(() => {
        let now = 1000, id = 0, seed = 731;
        const frames = new Map<number, FrameRequestCallback>();
        Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        performance.now = () => now;
        requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
        cancelAnimationFrame = handle => { frames.delete(handle); };
        (window as any).round9VisualStep = (ms: number) => { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); };
      });
      const state = bird ? { birdLab: { view: 'physiology' } } : { raptorHunt: surface === 'hearing' ? { activeSection: 'hearing' } : {
        activeSection: 'hunt', selectedSpecies: 'redTail', activeMission: 'open', flightSession: { speciesId: 'redTail', missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: 'low' } };
      await harness.mount(page, state, undefined, { expectCanvas: false });
      await page.locator('#wrap').evaluate((element: HTMLElement, size) => { element.style.width = size + 'px'; element.style.maxWidth = '100%'; element.style.height = 'auto'; element.style.padding = '0'; element.setAttribute('data-stem-tool-shell', 'true'); }, width);
      let selector = '';
      if (surface === 'flight-leg') {
        await page.waitForFunction("!!document.querySelector('[data-raptor-canvas]')?._rhSnapshot", null, { polling: 50, timeout: 60_000 });
        await page.locator('[data-raptor-canvas]').evaluate((canvas: any) => {
          const w = window as any, step = (count: number) => { for (let i = 0; i < count; i++) w.round9VisualStep(25); };
          const hold = (key: string, pressed: boolean) => canvas._rhCommand('hold', { key, pressed });
          canvas._rhCommand('environment', { windSpeed: 0, dayPhase: .44, cloudCover: .15 });
          try {
            w.round9VisualSkip = true;
            step(80); hold('d', true); step(32); hold('d', false); step(88);
            hold(' ', true); step(40); hold(' ', false); hold('a', true); step(24); hold('a', false); step(136);
          } finally { w.round9VisualSkip = false; }
          w.round9VisualStep(25); canvas._rhCommand('flightPath');
          canvas._rhCommand('pathSample', 10); canvas._rhCommand('pathPin'); canvas._rhCommand('pathSample', 38);
        });
        await page.locator('[data-raptor-flight-path]').screenshot({ path: resolve(output, `flight-leg-controls-${width}.png`), timeout: 90_000 });
        selector = '[data-raptor-flight-stage]';
      } else if (bird) {
        selector = '[data-birdlab-breath-study]';
        await page.locator('[data-breath-preset="2"]').click(); await page.locator('[data-breath-focus="lung"]').click();
        await page.locator('[data-breath-answer="mixing"]').click();
      } else {
        selector = '[data-raptor-sound-study]';
        await page.locator('[data-sound-pin]').click(); await page.locator('#rh-sound-head').fill('25'); await page.locator('#rh-sound-phase').fill('220');
      }
      await expect(page.locator(selector)).toBeVisible();
      await page.locator(selector).screenshot({ path: resolve(output, `${surface}-${width}.png`), timeout: 90_000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const gl = surface === 'flight-leg' ? await harness.glScene(page) : null;
      if (surface === 'flight-leg') { expect(gl).not.toBeNull(); expect(gl!.draws).toBeGreaterThan(0); }
      writeFileSync(resolve(output, `${surface}-${width}.json`), JSON.stringify({ surface, width, overflow, errors, gl }, null, 2));
      expect(overflow).toBeLessThanOrEqual(1); expect(errors).toEqual([]);
    });
  });
}
