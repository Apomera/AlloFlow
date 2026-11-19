import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * DNA Lab's 3D helix (opt-in, d.showHelix3d) had no `webglcontextlost` handler, so a
 * context lost after init left a blank helix. Its existing fallback is the 2D ladder:
 * DnaGL.fail() calls onFail, which turns showHelix3d off (the flat ladder is always
 * rendered underneath) and toasts. The view toggle is the retry: turning 3D back on mounts
 * a FRESH GL canvas, and DnaGL.mount accepts a 'failed' engine.
 *
 * The loss now routes into that same path with its own message ("3D view paused"), and
 * focus moves to the view toggle. The GL canvas carries no key handlers, so there is no
 * canvas-focus assertion.
 *
 * The helix backbone comes from StemLab.makeVoxelBatch, so the real host is loaded first
 * (as 24-dna-helix-gl does).
 */
// appStyles: the helix stage is `className: "relative"` and the GL canvas is absolute
// inset 0. Unstyled, nothing is positioned, so the canvas spanned all of #wrap (900x2600)
// and swallowed clicks on the view toggle. The app's Tailwind bundle positions the stage.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_dna.js',
  toolId: 'dnaLab',
  preScripts: ['stem_lab/stem_lab_module.js'],
  appStyles: true,
  layout: 'document',
  width: 900,
  height: 900
});

test.describe.configure({ timeout: 150000, retries: 0 });

/** The GL helix canvas's recorded context (harness recorder; never creates one). */
async function helixContext(page: Page) {
  return page.evaluate(() => {
    const cv = document.querySelector('canvas[data-dna-gl]') as HTMLCanvasElement | null;
    const rec = cv && (window as any).__glRecord(cv);
    return rec ? { id: rec.id, live: !rec.ctx.isContextLost(), draws: rec.draws, byPage: rec.createdBy === 'page' } : null;
  });
}

async function mountHelix(page: Page) {
  await harness.mount(page, { dnaLab: { tab: 'build', showHelix3d: true } });
  await expect.poll(async () => {
    const c = await helixContext(page);
    const ready = await page.evaluate(() => !!(window as any).__alloDnaGL?.isReady());
    return !!c && c.live && c.byPage && c.draws > 0 && ready;
  }, { timeout: 30000, message: 'the helix never drew on a LIVE context, so this proves nothing' }).toBe(true);
}

test.describe('DNA Lab — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('a lost helix context falls back to the ladder with a message, and the toggle rebuilds it', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await mountHelix(page);
    const before = await helixContext(page);

    const killed = await page.evaluate(() => {
      const cv = document.querySelector('canvas[data-dna-gl]') as HTMLCanvasElement;
      const ext = (window as any).__glRecord(cv).ctx.getExtension('WEBGL_lose_context');
      if (!ext) return false;
      ext.loseContext();
      return true;
    });
    expect(killed, 'could not force a context loss').toBe(true);

    // The existing fallback: 3D off, the flat ladder visible, and the student told why.
    await expect(page.locator('canvas[data-dna-gl]')).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator('[data-dna-view="2d"]')).toBeVisible();
    const told = await page.evaluate(() => ({
      toasts: (window as any).__events.toasts.map((t: any) => t.message),
      showHelix3d: (window as any).__toolData.dnaLab.showHelix3d,
      ladderVisible: (() => {
        const c = document.querySelector('canvas[role="img"]:not([data-dna-gl])') as HTMLElement | null;
        return !!c && getComputedStyle(c).visibility === 'visible';
      })()
    }));
    expect(told.showHelix3d).toBe(false);
    expect(told.ladderVisible, 'the flat ladder did not take over').toBe(true);
    expect(told.toasts.some((m: string) => /3D view paused/.test(m) && /Your work is saved/.test(m)),
      'the student was not told the 3D view stopped').toBe(true);
    await expect(page.locator('[data-dna-view]'), 'focus did not move to the view toggle').toBeFocused();

    // The way back: turning 3D on again must build a NEW live context.
    await page.locator('[data-dna-view]').click();
    await expect.poll(async () => {
      const c = await helixContext(page);
      const ready = await page.evaluate(() => !!(window as any).__alloDnaGL?.isReady());
      return !!c && c.id !== before!.id && c.live && c.draws > 0 && ready;
    }, { timeout: 30000, message: 'the toggle did not build a NEW live context' }).toBe(true);

    expect(errors.filter((m) => !/ResizeObserver loop/i.test(m)), 'page errors').toEqual([]);
  });

  test('switching to the flat ladder and back does not raise the lost message', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await mountHelix(page);
    const first = await helixContext(page);
    await page.evaluate(() => {
      const cv = document.querySelector('canvas[data-dna-gl]') as HTMLCanvasElement;
      (window as any).__oldHelixGl = (window as any).__glRecord(cv).ctx;
    });

    await page.locator('[data-dna-view="3d"]').click();
    await expect(page.locator('canvas[data-dna-gl]')).toHaveCount(0, { timeout: 15000 });
    // Leaving 3D must free the old context, not hold it until the browser evicts one.
    await expect.poll(() => page.evaluate(() => (window as any).__oldHelixGl.isContextLost()),
      { timeout: 5000, message: 'leaving 3D kept the old GL context alive' }).toBe(true);
    await page.waitForTimeout(800);
    await page.locator('[data-dna-view="2d"]').click();
    await expect.poll(async () => {
      const c = await helixContext(page);
      return !!c && c.id !== first!.id && c.live && c.draws > 0;
    }, { timeout: 30000, message: 'the helix did not come back live' }).toBe(true);
    const toasts: string[] = await page.evaluate(() => (window as any).__events.toasts.map((t: any) => t.message));
    expect(toasts.some((m) => /3D view paused/.test(m)), 'our own teardown raised the lost message').toBe(false);

    expect(errors.filter((m) => !/ResizeObserver loop/i.test(m)), 'page errors').toEqual([]);
  });
});
