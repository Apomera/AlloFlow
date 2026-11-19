import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Probability Lab's 3D Monte Carlo volume mode had no `webglcontextlost` handler, so a
 * context lost after boot froze a blank view. Its creation-failure state ('webgl-failed')
 * is a text-only notice with no retry, so the loss gets its own state, 'webgl-lost': a
 * role="alert" "3D view paused" panel that points at the numbers (which work without the
 * picture) and a "Restart 3D view" button. Restart sets the engine back to 'ready', which
 * mounts a FRESH canvas, and hands it focus: the canvas carries the arrow-key orbit
 * controls, so a keyboard-only student must land on it.
 *
 * Mounted like 22-probability-volume3d-gl (same state).
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_probability.js',
  toolId: 'probability',
  width: 900,
  height: 620
});

test.describe.configure({ timeout: 150000, retries: 0 });

const MOUNT = { probability: { mode: 'volume3d', v3Shape: 'sphere', _v3Engine: 'ready', v3Total: 0, v3Inside: 0 } };

/** The volume canvas's recorded context (harness recorder; never creates one). */
async function volumeContext(page: Page) {
  return page.evaluate(() => {
    const hit = (window as any).__glCanvas();
    return hit ? { id: hit.rec.id, live: !hit.gl.isContextLost(), draws: hit.rec.draws, byPage: hit.rec.createdBy === 'page' } : null;
  });
}

async function mountVolume(page: Page) {
  await harness.mount(page, MOUNT, 'window.__glCanvas && window.__glCanvas()');
  await expect.poll(async () => {
    const c = await volumeContext(page);
    return !!c && c.live && c.byPage && c.draws > 0;
  }, { timeout: 30000, message: 'the volume view never drew on a LIVE context, so this proves nothing' }).toBe(true);
}

test.describe('Probability Lab volume3d — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('a lost context shows the restart panel, and Restart builds a new live, focusable canvas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await mountVolume(page);
    const before = await volumeContext(page);
    await expect(page.locator('[data-probability-webgl-lost]')).toHaveCount(0);

    const killed = await page.evaluate(() => {
      const ext = (window as any).__glCanvas().gl.getExtension('WEBGL_lose_context');
      if (!ext) return false;
      ext.loseContext();
      return true;
    });
    expect(killed, 'could not force a context loss').toBe(true);

    const panel = page.locator('[data-probability-webgl-lost]');
    await expect(panel).toBeVisible({ timeout: 15000 });
    await expect(panel).toHaveAttribute('role', 'alert');
    await expect(panel).toContainText('3D view paused');
    await expect(panel).toContainText('Your work is saved');
    const restart = page.getByRole('button', { name: 'Restart 3D view', exact: true });
    await expect(restart, 'focus did not move to the Restart button').toBeFocused();

    await restart.click();
    await expect(panel).toHaveCount(0, { timeout: 15000 });
    await expect.poll(async () => {
      const c = await volumeContext(page);
      return !!c && c.id !== before!.id && c.live && c.draws > 0;
    }, { timeout: 30000, message: 'Restart did not build a NEW live context' }).toBe(true);

    // The canvas carries the arrow-key controls: Restart hands it focus, and it can take it.
    const canvas = page.locator('#wrap canvas[aria-keyshortcuts]');
    await expect(canvas, 'focus did not land on the rebuilt canvas').toBeFocused();
    const focus = await canvas.evaluate((cv: HTMLCanvasElement) => { cv.blur(); cv.focus(); return { focused: document.activeElement === cv, tabIndex: cv.tabIndex }; });
    expect(focus.focused && focus.tabIndex === 0, 'the rebuilt canvas cannot take focus').toBe(true);

    expect(errors.filter((m) => !/ResizeObserver loop/i.test(m)), 'page errors').toEqual([]);
  });

  test('leaving volume mode and coming back does not raise the panel', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await mountVolume(page);
    const first = await volumeContext(page);

    const setMode = (m: string) => page.evaluate((mode) => (window as any).__ctx.setToolData((p: any) =>
      Object.assign({}, p, { probability: Object.assign({}, p.probability, { mode }) })), m);
    // Unmounting the canvas runs _v3Teardown; the harness's __destroy is not involved.
    await page.evaluate(() => { (window as any).__oldVolumeGl = (window as any).__glCanvas().gl; });
    await setMode('coin');
    await expect(page.locator('#wrap canvas[aria-keyshortcuts]')).toHaveCount(0, { timeout: 15000 });
    // Leaving volume mode must free the old context, not hold it until the browser evicts one.
    await expect.poll(() => page.evaluate(() => (window as any).__oldVolumeGl.isContextLost()),
      { timeout: 5000, message: 'leaving volume mode kept the old GL context alive' }).toBe(true);
    await page.waitForTimeout(800);
    await setMode('volume3d');
    await expect.poll(async () => {
      const c = await volumeContext(page);
      return !!c && c.id !== first!.id && c.live && c.draws > 0;
    }, { timeout: 30000, message: 'the volume view did not come back live' }).toBe(true);
    await expect(page.locator('[data-probability-webgl-lost]'), 'our own teardown raised the panel').toHaveCount(0);

    expect(errors.filter((m) => !/ResizeObserver loop/i.test(m)), 'page errors').toEqual([]);
  });
});
