import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Aquaculture's Boat Mission 3D had no `webglcontextlost` handler, so a context lost
 * after the sim launched left a black canvas with no error state and no way back.
 * Context loss is ordinary: a GPU driver reset, a tab restored on a low-memory device,
 * or another page claiming contexts (browsers cap simultaneous contexts and evict the
 * oldest).
 *
 * Reaching the 3D here is the whole difficulty, and is why an earlier attempt at this
 * fix was abandoned unverified. The sim is gated on LOCAL `useState` (`sim.active`),
 * not on toolData, so the harness cannot seed it — the test has to click the path a
 * student takes. The launch button's label also depends on whether three.js is already
 * present: "Load 3D engine + launch <scenario>" when it must fetch, but the harness
 * preloads three, so it reads "Cast off in <scenario>" instead. Matching only the first
 * wording finds nothing and looks like the tool is broken.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_aquaculture.js',
  toolId: 'aquacultureLab',
  width: 1280,
  height: 900
});

test.describe('Aquaculture — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  /** Click a visible control by its label, the way a student would. */
  async function clickByText(page: import('@playwright/test').Page, re: RegExp, what: string) {
    const hit = await page.evaluate((src) => {
      const r = new RegExp(src, 'i');
      const b = Array.from(document.querySelectorAll('button, [role="tab"]'))
        .find((x) => r.test((x.textContent || '').trim()) && (x as HTMLElement).offsetParent !== null);
      if (!b) return null;
      (b as HTMLElement).click();
      return (b.textContent || '').replace(/\s+/g, ' ').trim();
    }, re.source);
    expect(hit, `could not find the ${what} control`).not.toBeNull();
    return hit;
  }

  test('a lost context during the boat mission leaves the student a way back', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, { aquacultureLab: {} }, undefined, { expectCanvas: false });
    await page.waitForTimeout(1000);

    await clickByText(page, /Boat Mission/, 'Boat Mission tab');
    await page.waitForTimeout(1200);
    // Either wording, so this keeps working whether or not three is preloaded.
    await clickByText(page, /Cast off|Load 3D engine/, 'launch');

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

    // The student must be told, and offered the guided 2D mission that still works.
    await page.waitForFunction(() => /WebGL failed to load or initialize/i.test(document.body.textContent || ''),
      null, { timeout: 15000 });

    const after = await page.evaluate(() => ({
      warned: /WebGL failed to load or initialize/i.test(document.body.textContent || ''),
      pointsAt2D: /Guided 2D/i.test(document.body.textContent || ''),
      retry: Array.from(document.querySelectorAll('button'))
        .filter((b) => /retry/i.test(b.textContent || '') && (b as HTMLElement).offsetParent !== null).length
    }));
    console.log('after context loss:', JSON.stringify(after));
    expect(after.warned, 'the boat mission went black with no explanation').toBe(true);
    expect(after.pointsAt2D, 'nothing pointed the student at the 2D mission that still works').toBe(true);
    expect(after.retry, 'no way to try the 3D again').toBeGreaterThan(0);

    // An unrecoverable panel is barely better than a black canvas: prove retry relaunches.
    await clickByText(page, /retry/, 'retry');
    await page.waitForFunction(() => Array.from(document.querySelectorAll('canvas')).some((cv: any) => {
      const g = cv.getContext('webgl2') || cv.getContext('webgl');
      return g && !g.isContextLost();
    }), null, { timeout: 40000 });

    const recovered = await page.evaluate(() => ({
      stillWarned: /WebGL failed to load or initialize/i.test(document.body.textContent || ''),
      live: Array.from(document.querySelectorAll('canvas')).filter((cv: any) => {
        const g = cv.getContext('webgl2') || cv.getContext('webgl');
        return g && !g.isContextLost();
      }).length
    }));
    console.log('after retry:', JSON.stringify(recovered));
    expect(recovered.stillWarned, 'retry did not clear the error').toBe(false);
    expect(recovered.live, 'retry left no live 3D context').toBeGreaterThan(0);

    expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)),
      'page errors during the context-loss cycle').toEqual([]);
  });
});
