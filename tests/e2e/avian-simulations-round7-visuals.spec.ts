import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const phase = process.env.AVIAN_SIM_PHASE || 'final';
const output = resolve('reports/avian-simulations-round7-2026-10-18', phase);
test.use({ video: 'off' });
test.describe.configure({ timeout: 180_000, retries: 0 });
for (const surface of ['lift', 'spiral', 'route'] as const) {
  test.describe(surface + ' visual review', () => {
    const bird = surface === 'lift';
    const harness = new GlHarness({ toolId: bird ? 'birdLab' : 'raptorHunt',
      toolFile: 'stem_lab/stem_tool_' + (bird ? 'birdlab' : 'raptorhunt') + '.js',
      preScripts: bird ? ['stem_lab/stem_lab_module.js'] : [],
      width: 1280, height: 960, appStyles: true, layout: 'document',
      probes: `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round7Scene=scene;window.round7Camera=camera;window.round7Renderer=renderer;if(!window.round7SkipRender)return render(scene,camera);};return renderer;};})();`,
    });
    test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
    test.afterAll(async () => harness.stop());
    test.afterEach(async ({ page }) => harness.destroy(page));
    for (const width of [1280, 390]) test(surface + ' at ' + width + 'px', async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      if (surface === 'route') await page.addInitScript(() => {
        let now = 1000, id = 0, seed = 731;
        const frames = new Map<number, FrameRequestCallback>();
        Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        performance.now = () => now;
        requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
        cancelAnimationFrame = handle => { frames.delete(handle); };
        (window as any).round7Step = (ms: number) => { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); };
      });
      const state = bird ? { birdLab: { view: 'wingHunt' } } : { raptorHunt: surface === 'spiral'
        ? { activeSection: 'spiral', spiral: phase === 'baseline' ? { startAlt: 600, preySpeed: 5, headTilt: 40, paused: true, playhead: 1.68 } : { version: 2, bearing: 40, progress: 420 } }
        : { activeSection: 'hunt', selectedSpecies: 'redTail', activeMission: 'open', flightSession: { speciesId: 'redTail', missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: 'low' } };
      // This test owns RAF, so readiness polling must use wall-clock timers.
      await harness.mount(page, state, undefined, { expectCanvas: false });
      if (surface === 'route') {
        await page.waitForFunction("!!document.querySelector('[data-raptor-canvas]')?._rhSnapshot", null, { polling: 50, timeout: 60_000 });
        await expect(page.locator('[data-raptor-canvas]')).toBeVisible();
      }
      await page.addStyleTag({ content: `#wrap{width:${width}px;max-width:100%;height:auto;display:block;padding:0}` });
      await page.locator('#wrap').evaluate(element => element.setAttribute('data-stem-tool-shell', 'true'));
      if (surface === 'route') {
        await page.locator('[data-raptor-canvas]').evaluate((canvas: any) => {
          const w = window as any;
          canvas._rhCommand('environment', { windSpeed: 0, dayPhase: .44, cloudCover: .15 });
          w.round7SkipRender = true;
          const step = (count: number) => { for (let index = 0; index < count; index++) w.round7Step(25); };
          const hold = (key: string, pressed: boolean) => canvas._rhCommand('hold', { key, pressed });
          step(80); hold('d', true); step(32); hold('d', false); step(88);
          hold(' ', true); step(40); hold(' ', false); hold('a', true); step(24); hold('a', false); step(136);
          w.round7SkipRender = false; w.round7Step(25);
          canvas._rhCommand('pause');
        });
      }
      if (phase !== 'baseline') {
        if (surface === 'route') {
          await page.getByRole('button', { name: 'Inspect flight path', exact: true }).click();
          await page.locator('[data-flight-path-sample]').focus();
          await page.keyboard.press('Home');
          for (let index = 0; index < 25; index++) await page.keyboard.press('ArrowRight');
          await page.locator('[data-raptor-flight-path]').screenshot({ path: resolve(output, `route-controls-${width}.png`), timeout: 90_000 });
        } else if (surface === 'lift') {
          await page.locator('[data-lift-pin]').click();
          await page.locator('[data-wl-bird="mallard"]').click();
          await page.locator('[data-lift-speed-preset="1"]').click();
        } else await page.getByRole('button', { name: 'Show angle fan', exact: true }).click();
      }
      const selector = surface === 'route' ? '[data-raptor-flight-stage]' : phase === 'baseline' ? '#wrap' : surface === 'lift' ? '[data-birdlab-lift-explorer]' : '[data-raptor-spiral-study]';
      await expect(page.locator(selector)).toBeVisible();
      await page.locator(selector).screenshot({ path: resolve(output, `${surface}-${width}.png`), timeout: 90_000 });
      const errors = await page.evaluate(() => (window as any).__events.errors);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const gl = surface === 'route' ? await harness.glScene(page) : null;
      if (surface === 'route') expect(gl!.draws).toBeGreaterThan(0);
      writeFileSync(resolve(output, `${surface}-${width}.json`), JSON.stringify({ surface, width, overflow, errors, gl }, null, 2));
      expect(errors).toEqual([]); expect(overflow).toBeLessThanOrEqual(1);
    });
  });
}
