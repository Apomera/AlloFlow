import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const phase = process.env.AVIAN_SIM_PHASE || 'final';
const output = resolve('reports/avian-simulations-round5-2026-10-18', phase);
test.use({ video: 'off' });
test.describe.configure({ timeout: 180000, retries: 0, mode: 'default' });

for (const tool of ['bird', 'raptor'] as const) {
  test.describe(`${tool} simulation review`, () => {
    const harness = new GlHarness({
      toolId: tool === 'bird' ? 'birdLab' : 'raptorHunt',
      toolFile: `stem_lab/stem_tool_${tool === 'bird' ? 'birdlab' : 'raptorhunt'}.js`,
      preScripts: tool === 'bird' ? ['stem_lab/stem_lab_module.js'] : [],
      appStyles: true, layout: 'document', width: 1280, height: 960,
      probes: 'window.AlloPostFXEnabled = false;',
    });
    test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
    test.afterAll(async () => { await harness.stop(); });
    test.afterEach(async ({ page }) => { await harness.destroy(page); });
    for (const view of tool === 'bird' ? ['ispy', 'observatory3d'] : ['hunt', 'stoop']) {
      for (const width of [1280, 390]) {
        test(`${view} at ${width}px`, async ({ page }) => {
          const errors: string[] = [];
          page.on('pageerror', e => errors.push(e.message));
          page.on('console', e => { if (e.type() === 'error' && /shader|WebGL|GL_INVALID/i.test(e.text())) errors.push(e.text()); });
          await page.setViewportSize({ width, height: 960 });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          if (view === 'hunt') await page.addInitScript(() => {
            let clock = 1000, next = 1, seed = 731;
            const callbacks = new Map<number, FrameRequestCallback>();
            Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
            performance.now = () => clock;
            window.requestAnimationFrame = cb => { const id = next++; callbacks.set(id, cb); return id; };
            window.cancelAnimationFrame = id => { callbacks.delete(id); };
            (window as any).advanceSim = (ms: number) => { clock += ms; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(cb => cb(clock)); };
          });
          const state = tool === 'bird'
            ? { birdLab: { view, activeHabitat: 'forest', blSceneMotion: false, blLifeList: {}, blBadges: {}, blXp: 0 } }
            : { raptorHunt: { activeSection: view, selectedSpecies: 'peregrine', activeMission: 'freeFlight', flightSession: { speciesId: 'peregrine', missionId: 'freeFlight' }, huntTutorialDismissed: true, graphicsQuality: 'low' } };
          const ready = view === 'observatory3d' ? 'document.querySelector("[data-birdlab-3d-canvas]")?._birdlab3d' : view === 'hunt' ? 'document.querySelector("[data-raptor-canvas]")?._rhSnapshot' : undefined;
          if (view === 'hunt') {
            // This scene uses a manually advanced RAF clock. Poll startup on a
            // timer so the browser waiter cannot stall on that paused clock.
            await page.goto(`${(harness as any).base}/__harness`);
            await page.waitForFunction(() => !!(window as any).StemLab?._registry?.raptorHunt, null, { polling: 100 });
            await page.evaluate(({ state, width }) => {
              (document.querySelector('#wrap') as HTMLElement).style.width = width + 'px';
              (window as any).__mount(state);
            }, { state, width });
            await page.waitForFunction(() => !!(document.querySelector('[data-raptor-canvas]') as any)?._rhSnapshot, null, { polling: 100, timeout: 30000 });
          } else {
            await harness.mount(page, state, ready, { expectCanvas: view === 'observatory3d' });
          }
          await page.addStyleTag({ content: `#wrap{width:${width}px;max-width:100%;height:auto;display:block;padding:0}` });
          if (view === 'observatory3d') await page.locator('[data-birdlab-3d-canvas]').evaluate((c: any) => { c._birdlab3d.setPaused(true); c._birdlab3d.seek(9); });
          if (view === 'hunt') await page.locator('[data-raptor-canvas]').evaluate((c: any) => { c._rhCommand('environment', { dayPhase: .44, windSpeed: 5, cloudCover: .3 }); for (let i = 0; i < 3; i++) (window as any).advanceSim(25); });
          const selector = view === 'ispy' ? '[data-birdlab-scene-shell]' : view === 'observatory3d' ? '[data-birdlab-3d-shell]' : view === 'hunt' ? '[data-raptor-flight-stage]' : '[data-raptorhunt-root]';
          const panel = page.locator(selector);
          await expect(panel).toBeVisible();
          await panel.screenshot({ path: resolve(output, `${tool}-${view}-${width}.png`), timeout: 90000 });
          if (phase !== 'baseline' && view === 'observatory3d') {
            await page.getByRole('button', { name: 'Flight study overlay', exact: true }).click();
            await page.getByRole('button', { name: 'See whole route', exact: true }).click();
            await page.locator('[data-birdlab-3d-shell]').screenshot({ path: resolve(output, `bird-flight-study-${width}.png`), timeout: 90000 });
          }
          if (phase !== 'baseline' && view === 'ispy') {
            await page.locator('[data-birdlab-habitat-navigator]').screenshot({ path: resolve(output, `bird-habitat-navigator-${width}.png`) });
          }
          if (phase !== 'baseline' && view === 'hunt') {
            await page.getByRole('button', { name: 'Show horizontal motion lens', exact: true }).click();
            await page.evaluate(() => (window as any).advanceSim(25));
            await panel.screenshot({ path: resolve(output, `raptor-motion-scene-${width}.png`), timeout: 90000 });
            await page.locator('[data-raptor-motion-lens]').screenshot({ path: resolve(output, `raptor-motion-map-${width}.png`) });
          }
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          const gl = view === 'ispy' || view === 'stoop' ? null : await harness.glScene(page);
          if (gl) expect(gl.draws).toBeGreaterThan(0);
          writeFileSync(resolve(output, `${tool}-${view}-${width}.json`), JSON.stringify({ tool, view, width, overflow, errors, gl }, null, 2));
          expect(errors).toEqual([]);
          expect(overflow).toBeLessThanOrEqual(1);
        });
      }
    }
  });
}
