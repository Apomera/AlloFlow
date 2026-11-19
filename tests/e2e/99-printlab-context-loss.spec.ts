import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Print Lab's 3D preview had no `webglcontextlost` handler, so a context lost after
 * init left the preview black with no way back. Context loss is ordinary: a GPU driver
 * reset, a tab restored on a low-memory Chromebook, or the browser evicting the oldest
 * of its limited contexts.
 *
 * Creation failure already set status 'failed' (a subtitle pointing at the text
 * preflight) but offered no way back, so a loss now routes into that state AND swaps the
 * canvas for a role="alert" "3D view paused" panel with "Restart 3D view".
 *
 * The preview's own teardown calls renderer.forceContextLoss() on every rebuild, which
 * fires the same event, so an ordinary rescale must not raise the panel. It also used to
 * rebuild on the SAME canvas, whose context that teardown had just killed; every rebuild
 * now keys a fresh canvas, so the second test asserts the rebuilt preview is live too.
 */
const harness = new GlHarness({
  toolId: 'printLab',
  toolFile: 'stem_lab/stem_tool_printlab.js',
  extraScripts: ['prim3d_module.js', 'printable_model_module.js'],
  layout: 'document',
  width: 1280,
  height: 900
});

const RECIPE = {
  version: 'p3d/1',
  name: 'Test token',
  scale: 1,
  parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0.5, 0], rotation: [0, 0, 0], color: '#22d3ee' }]
};
const STATE = { printLab: { activeTab: 'Design', printStage: 'Design', recipe: RECIPE, unitMm: 20 } };
const CANVAS = 'canvas[aria-describedby="printlab-preview-desc"]';

// The harness records every context the PAGE created and drew with; reading that
// avoids a spec probe calling getContext and creating a live context itself.
const liveIds = (page: Page) => page.evaluate(() => ((window as any).__glContexts() || [])
  .filter((c: any) => c.createdBy === 'page' && !c.lost && c.connected && c.draws > 0).map((c: any) => c.id));

async function waitLive(page: Page, exclude: number[] = []) {
  await page.waitForFunction((ex) => ((window as any).__glContexts() || []).some((c: any) =>
    c.createdBy === 'page' && !c.lost && c.connected && c.draws > 0 && ex.indexOf(c.id) === -1),
  exclude, { timeout: 40000 });
}

const panelUp = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('[role="alert"]'))
  .some((n) => /3D view paused/i.test(n.textContent || '')));

test.describe('Print Lab — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('a lost preview context offers Restart, and Restart rebuilds a live preview', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, STATE, undefined, { expectCanvas: false });
    await page.waitForSelector(CANVAS, { timeout: 30000 });
    await waitLive(page);
    const before = await liveIds(page);
    expect(before.length, 'the preview never took a live WebGL context, so this proves nothing').toBeGreaterThan(0);
    expect(await panelUp(page), 'the panel was already showing before the loss').toBe(false);

    const killed = await page.evaluate((sel) => {
      const cv = document.querySelector(sel) as HTMLCanvasElement | null;
      const g: any = cv && (cv.getContext('webgl2') || cv.getContext('webgl'));
      const ext = g && !g.isContextLost() && g.getExtension('WEBGL_lose_context');
      if (!ext) return false;
      ext.loseContext();
      return true;
    }, CANVAS);
    expect(killed, 'could not force a context loss').toBe(true);

    await page.waitForFunction(() => Array.from(document.querySelectorAll('[role="alert"]'))
      .some((n) => /3D view paused/i.test(n.textContent || '')), null, { timeout: 15000 });
    const restart = page.getByRole('button', { name: /Restart 3D view/i });
    await expect(restart, 'the preview went black with no way back').toBeVisible();
    await expect(restart, 'focus did not move to the way back').toBeFocused();

    await restart.click();
    await page.waitForSelector(CANVAS, { timeout: 30000 });
    await waitLive(page, before);
    expect(await panelUp(page), 'Restart did not clear the panel').toBe(false);
    expect(await page.evaluate(() => /3D preview unavailable/i.test(document.body.textContent || '')),
      'Restart left the preview marked unavailable').toBe(false);

    expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)),
      'page errors during the context-loss cycle').toEqual([]);
  });

  test('an ordinary rescale rebuilds the preview without raising the panel', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, STATE, undefined, { expectCanvas: false });
    await page.waitForSelector(CANVAS, { timeout: 30000 });
    await waitLive(page);
    const before = await liveIds(page);

    // A new scale changes the preview signature: teardown force-loses the old context.
    await page.locator('#print-lab-scale-input').fill('25');
    await page.locator('[data-print-scale-editor]').getByRole('button', { name: /Apply scale/i }).click();
    await page.waitForTimeout(1500);
    const replaced = await page.evaluate((ids: number[]) => {
      const all = (window as any).__glContexts() || [];
      return ids.every((id) => { const c = all.find((x: any) => x.id === id); return !c || c.lost || !c.connected; });
    }, before);
    expect(replaced, 'the rescale did not rebuild the preview, so this proves nothing').toBe(true);

    await waitLive(page, before);
    await page.waitForTimeout(1000);
    expect(await panelUp(page), 'an ordinary rescale was reported as a lost context').toBe(false);
    expect(await page.evaluate(() => /3D preview unavailable/i.test(document.body.textContent || '')),
      'the rebuilt preview failed (a rebuild on the dead canvas)').toBe(false);

    expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)),
      'page errors during the rescale').toEqual([]);
  });
});
