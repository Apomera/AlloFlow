import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Math Manipulatives' solid base-ten blocks (B10GL, canvas[data-b10-gl]) had no
 * `webglcontextlost` handler, so a context lost after init left a black stage.
 * Creation failure was already handled: onFail drops to the flat blocks
 * (b10Solid false). A loss now fails as 'lost' into that same state, and also
 * shows a role="alert" "3D view paused" panel whose Restart turns the solid view
 * back on, which mounts a fresh canvas and renderer.
 *
 * B10GL never force-loses its own context, so the flat/solid toggle test is a guard
 * against a future dispose() that does. The blocks need the real host
 * (StemLab.makeVoxelBatch), hence preScripts.
 */
test.describe.configure({ timeout: 150_000, retries: 0 });
test.use({ trace: 'off', video: 'off' });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_manipulatives.js',
  toolId: 'base10',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1100,
  height: 900,
  layout: 'document',
  // The GL canvas is `absolute inset-0` in a Tailwind `relative` 16:9 stage. Without
  // the app CSS the stage is not positioned and the canvas covers the toggle.
  appStyles: true,
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const CANVAS = 'canvas[data-b10-gl="true"]';
const SOLID = { _manipulatives: { mode: 'blocks', b10Solid: true, b10: { thousands: 1, hundreds: 2, tens: 3, ones: 4 } } };

async function liveId(page: any): Promise<number | null> {
  return page.evaluate((s: string) => {
    const cv = document.querySelector(s) as HTMLCanvasElement | null;
    const rec = cv && (window as any).__glRecord(cv);
    return rec && cv!.isConnected && !rec.ctx.isContextLost() ? rec.id : null;
  }, CANVAS);
}
async function waitLive(page: any) {
  await page.waitForFunction((s: string) => {
    const cv = document.querySelector(s) as HTMLCanvasElement | null;
    const rec = cv && (window as any).__glRecord(cv);
    return !!rec && cv!.isConnected && !rec.ctx.isContextLost() && rec.renders > 0;
  }, CANVAS, { timeout: 40_000, polling: 200 });
}

test('a lost solid-blocks context shows the paused panel and Restart rebuilds it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await harness.mount(page, SOLID, undefined, { expectCanvas: false });
  await waitLive(page);

  const before = await liveId(page);
  expect(before, 'the solid blocks never took a live WebGL context, so this proves nothing').not.toBeNull();
  expect(await page.locator('[data-b10-gl-lost]').count(), 'panel up before the loss').toBe(0);

  const killed = await page.evaluate((s: string) => {
    const cv = document.querySelector(s) as HTMLCanvasElement | null;
    const rec = cv && (window as any).__glRecord(cv);
    const ext = rec && rec.ctx.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    ext.loseContext();
    return true;
  }, CANVAS);
  expect(killed, 'could not force a context loss').toBe(true);

  const panel = page.locator('[data-b10-gl-lost][role="alert"]');
  await expect(panel, 'the stage went black with no explanation').toBeVisible({ timeout: 15_000 });
  await expect(panel).toContainText('3D view paused');
  await expect(panel).toContainText('flat blocks');
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.hasAttribute('data-b10-gl-restart')),
    { message: 'focus did not move to the Restart button' }).toBe(true);
  // The student's blocks survived the loss.
  expect(await page.evaluate(() => (window as any).__toolData._manipulatives.b10))
    .toEqual({ thousands: 1, hundreds: 2, tens: 3, ones: 4 });

  await page.keyboard.press('Enter');
  await expect(page.locator('[data-b10-gl-lost]')).toHaveCount(0, { timeout: 15_000 });
  await waitLive(page);
  const after = await liveId(page);
  expect(after, 'Restart did not bring back a live context').not.toBeNull();
  expect(after, 'Restart reused the dead context').not.toBe(before);

  expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)), 'page errors').toEqual([]);
});

test('switching to flat blocks and back (dispose and rebuild) does not raise the panel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await harness.mount(page, SOLID, undefined, { expectCanvas: false });
  await waitLive(page);
  const first = await liveId(page);
  const toggle = page.locator('button[data-b10-view]').first();
  await toggle.click();
  await expect(page.locator(CANVAS)).toHaveCount(0, { timeout: 10_000 });
  await page.waitForTimeout(500);
  await toggle.click();
  await waitLive(page);
  expect(await liveId(page), 'the solid view did not rebuild').not.toBe(first);
  await page.waitForTimeout(1000);
  expect(await page.locator('[data-b10-gl-lost]').count(), 'a normal view switch raised the paused panel').toBe(0);
  expect(errors.filter((m) => !/ResizeObserver loop/.test(m)), 'page errors').toEqual([]);
});
