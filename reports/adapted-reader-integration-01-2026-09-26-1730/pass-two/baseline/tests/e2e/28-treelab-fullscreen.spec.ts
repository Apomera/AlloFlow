/**
 * Tree Life Lab: the full-screen stage, and the cost of the scene that fills it.
 *
 * Two things here can only be checked in a browser:
 *
 *  1. FULL SCREEN IS A STYLE CHANGE, NOT A REPARENT. The canvas div stays in the same
 *     place in the React tree and only its style changes, because moving it between
 *     parents would make React unmount and remount it — a complete WebGL teardown and
 *     scene rebuild every time a student toggles. The test proves the SAME element
 *     survives, and that the renderer actually resized: the shell listens on window
 *     `resize` and has no ResizeObserver on its node, so a CSS-only size change is
 *     invisible to it unless the toggle dispatches one.
 *
 *  2. THE CANOPY IS ~1000 INSTANCED CARDS whose matrices are recomposed every frame
 *     for wind. That is cheap in principle and easy to get wrong, and no unit test can
 *     see it. This measures real rAF deltas under SwiftShader, which has no GPU at all
 *     and is therefore a hard lower bound on what a school Chromebook will manage.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000 });

test.describe('Tree Life Lab full screen', () => {
  const harness = new GlHarness({
    toolFile: 'stem_lab/stem_tool_treelab.js',
    toolId: 'treeLab',
    preScripts: ['stem_lab/stem_lab_module.js'],
    width: 1000,
    height: 800,
  });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  async function mount(page: import('@playwright/test').Page) {
    await page.goto(`${(harness as any).base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.treeLab, null, { timeout: 30000 });
    await page.evaluate(() => {
      const E = (window as any).__alloTreeLabEngine;
      const sp = E.speciesById('oak');
      let t = E.newTree('oak');
      for (let i = 0; i < 90 && t.alive; i++) {
        t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 },
          { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 });
      }
      (window as any).__mount({ treeLab: { view: 'grow', speciesId: 'oak', tree: t } });
    });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(2500);
  }

  const fsButton = (page: import('@playwright/test').Page) =>
    page.locator('button[aria-label="Full screen"], button[aria-label="Exit full screen"]');

  test('toggling keeps the same canvas element and resizes the renderer', async ({ page }) => {
    await mount(page);

    // Tag the live canvas. If React reparents, the tagged node is discarded and the
    // WebGL context with it — the tag is how we catch that.
    await page.evaluate(() => {
      const c = document.querySelector('canvas') as any;
      c.dataset.alloTag = 'original';
      (window as any).__ctxLost = false;
      c.addEventListener('webglcontextlost', () => { (window as any).__ctxLost = true; });
    });
    const before = await page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement;
      return { w: c.clientWidth, h: c.clientHeight };
    });

    await fsButton(page).click();
    await page.waitForTimeout(900);

    const after = await page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement;
      const stage = c.parentElement!.parentElement as HTMLElement;
      return {
        tag: (c as any).dataset.alloTag, w: c.clientWidth, h: c.clientHeight,
        lost: (window as any).__ctxLost,
        position: getComputedStyle(stage).position,
        covers: stage.getBoundingClientRect().height >= window.innerHeight - 4,
      };
    });

    expect(after.tag, 'the canvas was reparented, which tears down WebGL').toBe('original');
    expect(after.lost, 'the WebGL context was lost on toggle').toBe(false);
    expect(after.position).toBe('fixed');
    expect(after.covers, 'the stage does not fill the viewport').toBe(true);
    expect(after.h, 'the renderer never resized — no window resize was dispatched')
      .toBeGreaterThan(before.h + 100);
  });

  test('Escape leaves full screen', async ({ page }) => {
    await mount(page);
    await fsButton(page).click();
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => !!(window as any).__toolData?.treeLab?.viewerFull)).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => !!(window as any).__toolData?.treeLab?.viewerFull),
      'Escape did not leave full screen').toBe(false);
    const h = await page.evaluate(() => (document.querySelector('canvas') as HTMLCanvasElement).clientHeight);
    expect(h, 'the canvas did not shrink back').toBeLessThan(600);
  });

  test('per-frame wind costs almost nothing next to the render', async ({ page }) => {
    // Measuring TOTAL frame time here would be measuring SwiftShader, not this tool:
    // a first version of this test asserted <120ms and failed at 149ms, of which the
    // wind loop turned out to be 0.5ms. What is worth guarding is the DELTA — the work
    // this file does every frame — because that is the part a regression can blow up
    // (a geometry rebuilt per tick, an allocation inside the card loop) and the part
    // that costs the same on a Chromebook as it does here.
    const sample = () => page.evaluate(() => new Promise<number>((resolve) => {
      const d: number[] = []; let last = performance.now(); let n = 0;
      (function step() {
        const now = performance.now(); d.push(now - last); last = now;
        if (++n < 110) requestAnimationFrame(step);
        else { const u = d.slice(20); resolve(u.reduce((s, v) => s + v, 0) / u.length); }
      })();
    }));

    await mount(page);
    const animated = await sample();

    // Reduced motion makes the shell skip contentFrame altogether, so this is the same
    // scene rendered with the wind loop switched off.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(1500);
    const still = await sample();

    expect(animated).toBeGreaterThan(0);
    expect(animated - still,
      `wind adds ${(animated - still).toFixed(1)}ms/frame (animated ${animated.toFixed(0)}, still ${still.toFixed(0)}) — ` +
      'the canopy is ~1000 instanced cards and recomposing their matrices should be under a millisecond')
      .toBeLessThan(25);
  });
});
