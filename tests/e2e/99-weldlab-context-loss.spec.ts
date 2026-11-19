import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * WeldLab's 3D bead scene had no `webglcontextlost` handler, so a context lost after
 * init left the bench black for the rest of the session. Context loss is ordinary: a
 * GPU driver reset, a tab restored on a low-memory Chromebook, or the browser evicting
 * the oldest of its limited contexts.
 *
 * Creation failure was already handled (status 'error' renders a role="alert" panel
 * with "Retry 3D Mode"), so the fix routes a loss into that same panel. Retry now keys
 * a FRESH canvas: the old one would hand its dead context to the next renderer.
 *
 * The scene's own dispose calls renderer.forceContextLoss(), which fires the same
 * event, so leaving the 3D view must not raise the panel (the teardown trap).
 */
const harness = new GlHarness({
  toolId: 'weldLab',
  toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  appStyles: true,
  layout: 'document',
  width: 1280,
  height: 900
});

const CANVAS = 'canvas[aria-label^="3D welding scene"]';
const STATE = { weldLab: { view: 'beadLab', bl_view: '3d' } };

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

test.describe('WeldLab — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('a lost bench context raises Retry, and Retry rebuilds a live scene', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, STATE, undefined, { expectCanvas: false });
    await page.waitForSelector(CANVAS, { timeout: 30000 });
    await waitLive(page);
    const before = await liveIds(page);
    expect(before.length, 'the bench never took a live WebGL context, so this proves nothing').toBeGreaterThan(0);
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
    const retry = page.getByRole('button', { name: /Retry 3D Mode/i });
    await expect(retry, 'the bench went black with no way back').toBeVisible();
    await expect(retry, 'focus did not move to the way back').toBeFocused();

    await retry.click();
    await waitLive(page, before);
    expect(await panelUp(page), 'Retry did not clear the panel').toBe(false);

    // The canvas carries the arrow-key camera, so the rebuilt one must take focus.
    const focused = await page.evaluate((sel) => {
      const cv = document.querySelector(sel) as HTMLCanvasElement;
      cv.focus();
      return document.activeElement === cv;
    }, CANVAS);
    expect(focused, 'the rebuilt canvas cannot take focus, so its keys are dead').toBe(true);

    expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)),
      'page errors during the context-loss cycle').toEqual([]);
  });

  test('leaving the 3D view and coming back does not raise the panel', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, STATE, undefined, { expectCanvas: false });
    await page.waitForSelector(CANVAS, { timeout: 30000 });
    await waitLive(page);
    const before = await liveIds(page);

    // Top-down unmounts the scene, whose dispose force-loses the context.
    await page.locator('[data-weld-tabset="bead-view"]').getByRole('tab', { name: /Top-down/i }).click();
    await page.waitForTimeout(1500);
    const gone = await page.evaluate((ids: number[]) => {
      const all = (window as any).__glContexts() || [];
      return ids.every((id) => { const c = all.find((x: any) => x.id === id); return !c || c.lost || !c.connected; });
    }, before);
    expect(gone, 'leaving the 3D view did not tear the scene down, so this proves nothing').toBe(true);

    await page.locator('[data-weld-tabset="bead-view"]').getByRole('tab', { name: /3D Scene/i }).click();
    await waitLive(page, before);
    await page.waitForTimeout(1000);
    expect(await panelUp(page), 'a normal view switch was reported as a lost context').toBe(false);
    expect(await page.getByRole('button', { name: /Retry 3D Mode/i }).count(),
      'a normal view switch raised the Retry panel').toBe(0);

    expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)),
      'page errors during the view switch').toEqual([]);
  });
});
