import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Echolocation's 3D cave had no `webglcontextlost` handler, so a context lost after
 * init left the cave black with no error state and no way back. Context loss is
 * ordinary: a GPU driver reset, a tab restored on a low-memory device, or another page
 * claiming contexts (browsers cap simultaneous contexts and evict the oldest).
 *
 * Creation failure was already handled — setWebglError(true) renders a panel whose
 * Retry clears the flag, drops the engine ref and bumps a retry nonce to force a
 * rebuild — so the fix routes loss into that same affordance.
 *
 * Unlike the other tools in this sweep, the cave tab is plain toolData (`d.tab`), so the
 * harness can seed straight to it; no click-path is needed.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_echolocation.js',
  toolId: 'echolocation',
  width: 1280,
  height: 900
});

test.describe('Echolocation — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('a lost context in the 3D cave raises Retry, and Retry rebuilds it', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, { echolocation: { tab: 'cave3d' } }, undefined, { expectCanvas: false });

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

    // The student must be told what happened and offered a way back.
    await page.waitForFunction(() => /failed to initialize/i.test(document.body.textContent || ''),
      null, { timeout: 15000 });

    const after = await page.evaluate(() => ({
      warned: /failed to initialize/i.test(document.body.textContent || ''),
      explained: /WebGL is required/i.test(document.body.textContent || ''),
      retry: Array.from(document.querySelectorAll('button'))
        .filter((b) => /^retry$/i.test((b.textContent || '').trim()) && (b as HTMLElement).offsetParent !== null).length
    }));
    console.log('after context loss:', JSON.stringify(after));
    expect(after.warned, 'the cave went black with no explanation').toBe(true);
    expect(after.explained, 'nothing told the student WHY the 3D stopped').toBe(true);
    expect(after.retry, 'no way back from the dead cave').toBeGreaterThan(0);

    // An unrecoverable panel is barely better than a black canvas: prove Retry rebuilds
    // a LIVE context, not just hides the panel.
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button'))
        .find((x) => /^retry$/i.test((x.textContent || '').trim()) && (x as HTMLElement).offsetParent !== null);
      (b as HTMLElement).click();
    });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('canvas')).some((cv: any) => {
      const g = cv.getContext('webgl2') || cv.getContext('webgl');
      return g && !g.isContextLost();
    }), null, { timeout: 40000 });

    const recovered = await page.evaluate(() => ({
      stillWarned: /failed to initialize/i.test(document.body.textContent || ''),
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
});
