import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Echo Trainer's 3D navigator had no `webglcontextlost` handler, so a context lost
 * after init left it black with no error state and no way back. Context loss is
 * ordinary: a GPU driver reset, a tab restored on a low-memory device, or another page
 * claiming contexts (browsers cap simultaneous contexts and evict the oldest).
 *
 * Creation failure was already handled — upd('webglError', true) renders a panel with a
 * "Retry 3D Mode" button — so the fix routes loss into that same affordance.
 *
 * The tool renders TWO canvases (the 3D navigator plus a 2D one), so everything here
 * selects the canvas that actually holds a live GL context rather than the first match.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_echotrainer.js',
  toolId: 'echoTrainer',
  width: 1280,
  height: 900
});

test.describe('Echo Trainer — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('a lost navigator context raises Retry instead of going black', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, { echoTrainer: {} }, undefined, { expectCanvas: false });

    await page.waitForFunction(() => Array.from(document.querySelectorAll('canvas')).some((cv: any) => {
      const g = cv.getContext('webgl2') || cv.getContext('webgl');
      return g && !g.isContextLost();
    }), null, { timeout: 40000 });

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

    // The student must be told, and offered a way back.
    await page.waitForFunction(() => /3D Mode Unresolved/i.test(document.body.textContent || ''),
      null, { timeout: 15000 });

    const after = await page.evaluate(() => ({
      warned: /3D Mode Unresolved/i.test(document.body.textContent || ''),
      retry: Array.from(document.querySelectorAll('button'))
        .filter((b) => /retry 3d mode/i.test(b.textContent || '') && (b as HTMLElement).offsetParent !== null).length
    }));
    console.log('after context loss:', JSON.stringify(after));
    expect(after.warned, 'the navigator went black with no explanation').toBe(true);
    expect(after.retry, 'no way back from the dead navigator').toBeGreaterThan(0);

    // An unrecoverable panel is barely better than a black canvas: prove Retry rebuilds
    // a LIVE context, not just hides the panel.
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button'))
        .find((x) => /retry 3d mode/i.test(x.textContent || '') && (x as HTMLElement).offsetParent !== null);
      (b as HTMLElement).click();
    });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('canvas')).some((cv: any) => {
      const g = cv.getContext('webgl2') || cv.getContext('webgl');
      return g && !g.isContextLost();
    }), null, { timeout: 40000 });

    const recovered = await page.evaluate(() => ({
      stillWarned: /3D Mode Unresolved/i.test(document.body.textContent || ''),
      live: Array.from(document.querySelectorAll('canvas')).filter((cv: any) => {
        const g = cv.getContext('webgl2') || cv.getContext('webgl');
        return g && !g.isContextLost();
      }).length
    }));
    console.log('after retry:', JSON.stringify(recovered));
    expect(recovered.stillWarned, 'Retry did not clear the error').toBe(false);
    expect(recovered.live, 'Retry left no live 3D context').toBeGreaterThan(0);

    expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)),
      'page errors during the context-loss cycle').toEqual([]);
  });

  // StemLab.releaseGl force-loses the old canvas one tick after a restart removes it,
  // which fires the same event. A handler that cannot tell that apart from a real loss
  // turns every New Layout into "3D Mode Unresolved" and switches the 3D view off.
  test('a normal restart does not raise the context-loss panel', async ({ page }) => {
    test.setTimeout(150000);
    await harness.mount(page, { echoTrainer: {} }, undefined, { expectCanvas: false });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('canvas')).some((cv: any) => {
      const g = cv.getContext('webgl2') || cv.getContext('webgl');
      return g && !g.isContextLost();
    }), null, { timeout: 40000 });

    const before = await page.evaluate(() => document.querySelectorAll('canvas').length);
    await page.getByRole('button', { name: /generate new random layout/i }).click();
    // Give the deferred release (setTimeout 0) and any handler time to land.
    await page.waitForTimeout(1500);

    const state = await page.evaluate(() => ({
      warned: /3D Mode Unresolved/i.test(document.body.textContent || ''),
      live: Array.from(document.querySelectorAll('canvas')).filter((cv: any) => {
        const g = cv.getContext('webgl2') || cv.getContext('webgl');
        return g && !g.isContextLost();
      }).length
    }));
    console.log('after restart:', JSON.stringify({ before, ...state }));
    expect(state.warned, 'a restart was reported as a lost context').toBe(false);
    expect(state.live, 'the rebuilt navigator has no live context').toBeGreaterThan(0);
  });
});
