import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Art Studio's Sculpt 3D preview had no `webglcontextlost` handler, so a context lost
 * after init left the preview black with no message and no way back. Context loss is
 * ordinary: a GPU driver reset, a tab restored on a low-memory Chromebook, or the
 * browser evicting the oldest of its limited contexts.
 *
 * There was no creation-failure panel to reuse, so the fix swaps the preview for a
 * role="alert" "3D view paused" panel whose "Restart 3D view" button keys a FRESH
 * canvas (a lost canvas hands its dead context to the next renderer).
 *
 * The preview's own teardown (leaving the tab) calls renderer.forceContextLoss(), which
 * fires the same event, so a tab switch must not raise the panel (the teardown trap).
 */
const harness = new GlHarness({
  toolId: 'artStudio',
  toolFile: 'stem_lab/stem_tool_artstudio.js',
  extraScripts: ['prim3d_module.js'],
  layout: 'document',
  width: 1280,
  height: 900
});

const CANVAS = '#sculptCanvas';
const STATE = { artStudio: { tab: 'sculpt3d', studioStarted: true, studioHome: false, sculptAuto: false } };

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

async function setTab(page: Page, tab: string) {
  await page.evaluate((t) => (window as any).__ctx.setToolData((d: any) =>
    Object.assign({}, d, { artStudio: Object.assign({}, d.artStudio, { tab: t }) })), tab);
}

test.describe('Art Studio Sculpt 3D — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('a lost preview context offers Restart, and Restart rebuilds a live preview', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, STATE, undefined, { expectCanvas: false });
    await page.waitForSelector(CANVAS, { timeout: 30000 });
    await page.locator(CANVAS).scrollIntoViewIfNeeded();
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
    await page.locator(CANVAS).scrollIntoViewIfNeeded();
    await waitLive(page, before);
    expect(await panelUp(page), 'Restart did not clear the panel').toBe(false);

    // The canvas carries the orbit/transform keys, so the rebuilt one must take focus.
    const focused = await page.evaluate((sel) => {
      const cv = document.querySelector(sel) as HTMLCanvasElement;
      cv.focus();
      return document.activeElement === cv;
    }, CANVAS);
    expect(focused, 'the rebuilt canvas cannot take focus, so its keys are dead').toBe(true);

    expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)),
      'page errors during the context-loss cycle').toEqual([]);
  });

  test('leaving the Sculpt tab and coming back does not raise the panel', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, STATE, undefined, { expectCanvas: false });
    await page.waitForSelector(CANVAS, { timeout: 30000 });
    await waitLive(page);
    const before = await liveIds(page);

    // Leaving the tab removes the canvas; the loop's teardown force-loses the context.
    await setTab(page, 'colorWheel');
    await page.waitForTimeout(1500);
    const gone = await page.evaluate((ids: number[]) => {
      const all = (window as any).__glContexts() || [];
      return ids.every((id) => { const c = all.find((x: any) => x.id === id); return !c || c.lost || !c.connected; });
    }, before);
    expect(gone, 'leaving the tab did not tear the preview down, so this proves nothing').toBe(true);

    await setTab(page, 'sculpt3d');
    await page.waitForSelector(CANVAS, { timeout: 30000 });
    await waitLive(page, before);
    await page.waitForTimeout(1000);
    expect(await panelUp(page), 'a normal tab switch was reported as a lost context').toBe(false);

    expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)),
      'page errors during the tab switch').toEqual([]);
  });
});
