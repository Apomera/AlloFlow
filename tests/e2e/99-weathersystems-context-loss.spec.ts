import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Weather Systems' immersive 3D view had no `webglcontextlost` handler, so a context
 * lost after init left it black with no message. Context loss is ordinary: a GPU driver
 * reset, a tab restored on a low-memory device, or another page claiming contexts
 * (browsers cap simultaneous contexts and evict the oldest).
 *
 * Creation failure was already handled — the catch sets `immersiveRenderError`, which
 * renders a full-overlay role="alert" panel headed "3D view unavailable" that points at
 * the Canvas 2D map — so the fix routes loss into that same state.
 *
 * The recovery is deliberately NOT a retry: the Canvas 2D map carries the lesson, so
 * the honest move is to say the 3D stopped and point there.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js',
  toolId: 'weatherSystems',
  width: 1280,
  height: 900
});

test.describe('Weather Systems — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('a lost immersive context says so and points at the 2D map', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, { weatherSystems: { tab: 'immersive' } }, undefined, { expectCanvas: false });

    await page.waitForFunction(() => Array.from(document.querySelectorAll('canvas')).some((cv: any) => {
      const g = cv.getContext('webgl2') || cv.getContext('webgl');
      return g && !g.isContextLost();
    }), null, { timeout: 40000 });

    // Nothing should be complaining before the loss, or the assertion below is vacuous.
    const before = await page.evaluate(() => /3D view unavailable/i.test(document.body.textContent || ''));
    expect(before, 'the panel was already showing before the loss').toBe(false);

    const killed = await page.evaluate(() => {
      for (const cv of Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[]) {
        const g: any = cv.getContext('webgl2') || cv.getContext('webgl');
        if (g && !g.isContextLost()) {
          const ext = g.getExtension('WEBGL_lose_context');
          if (ext) { ext.loseContext(); return true; }
        }
      }
      return false;
    });
    expect(killed, 'could not force a context loss').toBe(true);

    // The student must be told, and pointed at the view that still works.
    await page.waitForFunction(() => /3D view unavailable/i.test(document.body.textContent || ''),
      null, { timeout: 15000 });

    const after = await page.evaluate(() => ({
      told: /3D view unavailable/i.test(document.body.textContent || ''),
      pointsAt2D: /Canvas 2D map remains available/i.test(document.body.textContent || ''),
      alertRole: !!document.querySelector('[role="alert"]')
    }));
    console.log('after context loss:', JSON.stringify(after));
    expect(after.told, 'the immersive view went black with no explanation').toBe(true);
    expect(after.pointsAt2D, 'nothing pointed the student at the view that still works').toBe(true);
    expect(after.alertRole, 'the failure was not announced to a screen reader').toBe(true);

    expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)),
      'page errors during the context-loss cycle').toEqual([]);
  });
});
