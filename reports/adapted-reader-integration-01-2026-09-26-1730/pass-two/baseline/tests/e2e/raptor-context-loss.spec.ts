import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Raptor Hunt's flight view had no `webglcontextlost` handler, so a context lost after
 * init left it black with no error state and no way back. Context loss is ordinary: a
 * GPU driver reset, a tab restored on a low-memory device, or another page claiming
 * contexts (browsers cap simultaneous contexts and evict the oldest).
 *
 * Creation failure was already handled — setWebglError(true) renders a panel with a
 * "Retry 3D engine" control — so the fix routes loss into that same affordance.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  toolId: 'raptorHunt',
  width: 880,
  height: 620,
  appStyles: true
});

const HUNT = {
  raptorHunt: {
    activeSection: 'hunt',
    selectedSpecies: 'peregrine',
    activeMission: 'open',
    flightSession: { speciesId: 'peregrine', missionId: 'open' },
    huntTutorialDismissed: true,
    graphicsQuality: 'low'
  }
};

test.describe('Raptor Hunt — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('a lost flight context raises Retry instead of going black', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, HUNT, "document.querySelector('[data-raptor-canvas]')");

    await page.waitForFunction(() => {
      const c = document.querySelector('[data-raptor-canvas]') as HTMLCanvasElement | null;
      const g: any = c && (c.getContext('webgl2') || c.getContext('webgl'));
      return !!g && !g.isContextLost();
    }, null, { timeout: 40000 });

    const killed = await page.evaluate(() => {
      const c = document.querySelector('[data-raptor-canvas]') as HTMLCanvasElement;
      const g: any = c.getContext('webgl2') || c.getContext('webgl');
      const ext = g && !g.isContextLost() && g.getExtension('WEBGL_lose_context');
      if (!ext) return false;
      ext.loseContext();
      return true;
    });
    expect(killed, 'could not force a context loss').toBe(true);

    // The student must land on something they can act from.
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button'))
      .some((b) => /retry 3d/i.test(b.textContent || '') && (b as HTMLElement).offsetParent !== null),
      null, { timeout: 15000 });

    const after = await page.evaluate(() => ({
      retry: Array.from(document.querySelectorAll('button'))
        .filter((b) => /retry 3d/i.test(b.textContent || '') && (b as HTMLElement).offsetParent !== null)
        .map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim())
    }));
    console.log('after context loss:', JSON.stringify(after));
    expect(after.retry.length, 'the flight view went black with no way back').toBeGreaterThan(0);

    expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)),
      'page errors during the context-loss cycle').toEqual([]);
  });
});
