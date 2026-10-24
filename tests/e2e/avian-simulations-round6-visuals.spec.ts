import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const phase = process.env.AVIAN_SIM_PHASE || 'final';
const output = resolve('reports/avian-simulations-round6-2026-10-18', phase);
test.use({ video: 'off' });
test.describe.configure({ timeout: 180_000, retries: 0, mode: 'default' });

for (const tool of ['bird', 'raptor'] as const) {
  test.describe(`${tool} deeper simulation review`, () => {
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
    for (const view of tool === 'bird' ? ['observatory3d', 'flightPatterns'] : ['stoop']) {
      for (const width of [1280, 390]) {
        test(`${view} at ${width}px`, async ({ page }) => {
          const errors: string[] = [];
          page.on('pageerror', error => errors.push(error.message));
          page.on('console', message => { if (message.type() === 'error' && /shader|WebGL|GL_INVALID/i.test(message.text())) errors.push(message.text()); });
          await page.setViewportSize({ width, height: 960 });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          const state = tool === 'bird'
            ? { birdLab: { view, blXp: 0, blLifeList: {}, blBadges: {} } }
            : { raptorHunt: { activeSection: 'stoop', selectedSpecies: 'peregrine' } };
          const ready = view === 'observatory3d' ? 'document.querySelector("[data-birdlab-3d-canvas]")?._birdlab3d' : undefined;
          await harness.mount(page, state, ready, { expectCanvas: view === 'observatory3d' });
          await page.addStyleTag({ content: `#wrap{width:${width}px;max-width:100%;height:auto;display:block;padding:0}` });
          if (view === 'observatory3d') {
            await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => { canvas._birdlab3d.setPaused(true); canvas._birdlab3d.seek(9); });
            if (phase !== 'baseline') {
              await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => canvas._birdlab3d.seek(4.2));
              await page.getByRole('button', { name: 'Inspect one wingbeat', exact: true }).click();
              await page.locator('[data-birdlab-wingbeat-preset="0.42"]').click();
              await page.locator('[data-birdlab-wingbeat-study]').screenshot({ path: resolve(output, `bird-wingbeat-controls-${width}.png`) });
              await page.locator('.birdlab-3d-stage').screenshot({ path: resolve(output, `bird-wingbeat-scene-${width}.png`), timeout: 90_000 });
            }
          }
          if (phase !== 'baseline' && view === 'flightPatterns') {
            await page.getByRole('button', { name: 'Compare two styles', exact: true }).click();
            await page.getByRole('combobox', { name: 'Comparison flight style', exact: true }).selectOption('glide');
            await page.locator('#birdlab-flight-phase').focus();
            await page.keyboard.press('Home');
            for (let index = 0; index < 4; index++) await page.keyboard.press('PageUp');
          }
          if (phase !== 'baseline' && view === 'stoop') {
            await page.getByRole('button', { name: 'Pin current model', exact: true }).click();
            await page.locator('[data-stoop-compare-factor="area"]').click();
            await page.locator('[data-stoop-compare-time]').focus();
            await page.keyboard.press('End');
            await page.locator('[data-raptor-stoop-comparison]').screenshot({ path: resolve(output, `raptor-stoop-comparison-${width}.png`), timeout: 90_000 });
          }
          const selector = view === 'observatory3d' ? '[data-birdlab-3d-shell]' : view === 'flightPatterns' ? '[data-birdlab-flight-workbench]' : '[data-raptorhunt-root]';
          await expect(page.locator(selector)).toBeVisible();
          await page.locator(selector).screenshot({ path: resolve(output, `${tool}-${view}-${width}.png`), timeout: 90_000 });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          const gl = view === 'observatory3d' ? await harness.glScene(page) : null;
          if (view === 'observatory3d') { expect(gl).not.toBeNull(); expect(gl!.draws).toBeGreaterThan(0); }
          writeFileSync(resolve(output, `${tool}-${view}-${width}.json`), JSON.stringify({ tool, view, width, overflow, errors, gl }, null, 2));
          expect(errors).toEqual([]);
          expect(overflow).toBeLessThanOrEqual(1);
        });
      }
    }
  });
}
