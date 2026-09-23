import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * The immersive 3D stage must be the size of its canvas, not the size of the control rail.
 *
 * At xl widths the stage and the 380px control rail share one grid row, and grid items
 * stretch to the tallest item by default. The rail is thousands of pixels tall, so the
 * stage became a ~4000px dark slab with the scene in its top ~700px — and everything
 * positioned inside the stage by percentage (the projected "Scene feature" callout, the
 * vignette) was measured against the slab, landing far below the scene.
 *
 * At the same width the stage should stay in view while the student scrolls the rail,
 * so a control changed in the rail can be watched taking effect in the scene.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js',
  toolId: 'weatherSystems',
  width: 1600,
  height: 1000,
  appStyles: true
});

test.describe('Weather Systems — immersive stage layout', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('the stage is as tall as its canvas and stays in view beside a long rail', async ({ page }) => {
    test.setTimeout(180000);
    await harness.mount(page, { weatherSystems: { tab: 'immersive', scenario: 'coldFront' } }, undefined, { expectCanvas: false });
    await page.waitForFunction(() => {
      const c = document.querySelector('[data-weather-immersive-canvas]') as HTMLCanvasElement | null;
      return !!c && c.clientHeight > 300;
    }, null, { timeout: 60000 });

    const box = await page.evaluate(() => {
      const stage = document.querySelector('[data-weather-immersive-stage]') as HTMLElement;
      const canvas = document.querySelector('[data-weather-immersive-canvas]') as HTMLElement;
      const layout = document.querySelector('[data-weather-immersive-layout]') as HTMLElement;
      const s = stage.getBoundingClientRect(), c = canvas.getBoundingClientRect(), l = layout.getBoundingClientRect();
      return { stageH: Math.round(s.height), canvasH: Math.round(c.height), layoutH: Math.round(l.height),
               position: getComputedStyle(stage).position, twoColumns: getComputedStyle(layout).gridTemplateColumns.split(' ').length };
    });
    console.log('layout:', JSON.stringify(box));

    // Only meaningful where the rail sits beside the stage.
    expect(box.twoColumns, 'expected the two-column (xl) layout at 1600px').toBe(2);
    expect(box.layoutH, 'the rail should be much taller than the scene, or this proves nothing').toBeGreaterThan(box.canvasH * 1.5);
    expect(box.stageH, `the stage stretched to the rail: ${box.stageH}px around a ${box.canvasH}px canvas`)
      .toBeLessThanOrEqual(box.canvasH + 4);
    expect(box.position, 'the stage should stay in view while the rail scrolls').toBe('sticky');
  });

  // The projected "Scene feature" callout follows its object and sits at z-20, above the
  // overlay rows. Clamped to a fixed 8-92% of the stage, it covered the Visual Spotlight
  // badge once the top row wrapped (winter storm, T+0), and nothing but the anchor's
  // projection kept it off the prediction card.
  test('the scene-feature callout stays between the overlay rows', async ({ page }) => {
    test.setTimeout(180000);
    await harness.mount(page, { weatherSystems: { tab: 'immersive', scenario: 'winterStorm', simHour: 0 } }, undefined, { expectCanvas: false });
    await page.waitForFunction(() => !!document.querySelector('[data-weather-feature-callout]') && !!document.querySelector('[data-weather-prediction]'), null, { timeout: 60000 });

    const overlaps = () => page.evaluate(() => {
      const callout = document.querySelector('[data-weather-feature-callout]') as HTMLElement;
      const c = callout.getBoundingClientRect();
      const hit = (el: Element | null) => {
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        const w = Math.min(c.right, r.right) - Math.max(c.left, r.left);
        const h = Math.min(c.bottom, r.bottom) - Math.max(c.top, r.top);
        return w > 0 && h > 0 ? Math.round(w * h) : 0;
      };
      return {
        visible: getComputedStyle(callout).visibility !== 'hidden',
        spotlight: hit(document.querySelector('[data-weather-focus-spotlight-badge]')),
        topRows: hit(document.querySelector('[data-weather-stage-overlays="conceptual"]')),
        prediction: hit(document.querySelector('[data-weather-prediction]')),
        bottomRow: hit(document.querySelector('[data-weather-stage-overlays="conceptual-bottom"]'))
      };
    });
    const clear = { visible: true, spotlight: 0, topRows: 0, prediction: 0, bottomRow: 0 };

    // Open question at T+0: the top row is three lines deep here.
    await expect.poll(overlaps, { timeout: 20000, message: 'callout over an overlay row at T+0' }).toEqual(clear);

    // Revealed: the prediction card grows, raising the bottom row.
    await page.locator('[data-weather-predict-choice="colder"]').click();
    await page.getByRole('slider', { name: 'Forecast model hour' }).fill('12');
    await expect(page.locator('[data-weather-prediction]')).toHaveAttribute('data-weather-prediction', 'revealed');
    await expect.poll(overlaps, { timeout: 20000, message: 'callout over an overlay row once revealed' }).toEqual(clear);
    console.log('callout clear:', JSON.stringify(await overlaps()));
  });
});
