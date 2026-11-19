import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Bike Lab's Parts Inspector 3D model had no `webglcontextlost` handler, so a
 * context lost after start (GPU reset, low-memory Chromebook, browser evicting old
 * contexts) left a black box with no message. Its creation-failure panel
 * (threeStatus 'error') only offers "Back to the diagram", so a loss gets its own
 * 'lost' status: the existing cleanup runs once, a role="alert" "3D view paused"
 * panel appears, and Restart bumps glGen so the effect builds a fresh canvas and
 * renderer.
 *
 * The model's own cleanup calls renderer.forceContextLoss() while the canvas is
 * still in the page, which fires the same event; the second test proves leaving
 * and re-entering 3D does not raise the panel. The canvas has no key handlers
 * (every camera move has a button), so there is no canvas focus check.
 */
test.describe.configure({ timeout: 150_000, retries: 0 });
test.use({ trace: 'off', video: 'off' });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_bikelab.js',
  toolId: 'bikeLab',
  width: 1280,
  height: 900,
  layout: 'document',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const CANVAS = '[data-bikelab-3d] canvas';

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
async function open3d(page: any) {
  await harness.mount(page, { bikeLab: { view: 'parts' } }, undefined, { expectCanvas: false });
  await page.locator('button[data-bikelab-parts-view="3d"]').click();
  await expect(page.locator('[data-bikelab-3d="ready"]')).toBeVisible({ timeout: 30_000 });
  // The model draws on demand; a turn guarantees at least one render.
  await page.getByRole('button', { name: 'Turn the bike left', exact: true }).click();
  await waitLive(page);
}

test('a lost 3D bike shows the paused panel and Restart rebuilds it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await open3d(page);

  const before = await liveId(page);
  expect(before, 'the 3D bike never took a live WebGL context, so this proves nothing').not.toBeNull();
  expect(await page.locator('[data-bikelab-gl-lost]').count(), 'panel up before the loss').toBe(0);

  const killed = await page.evaluate((s: string) => {
    const cv = document.querySelector(s) as HTMLCanvasElement | null;
    const rec = cv && (window as any).__glRecord(cv);
    const ext = rec && rec.ctx.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    ext.loseContext();
    return true;
  }, CANVAS);
  expect(killed, 'could not force a context loss').toBe(true);

  const panel = page.locator('[data-bikelab-gl-lost][role="alert"]');
  await expect(panel, 'the 3D view went black with no explanation').toBeVisible({ timeout: 15_000 });
  await expect(panel).toContainText('3D view paused');
  await expect(panel).toContainText('The diagram shows the same parts');
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.hasAttribute('data-bikelab-gl-restart')),
    { message: 'focus did not move to the Restart button' }).toBe(true);
  // The dead canvas was removed by the existing cleanup, not left black.
  expect(await page.locator(CANVAS).count(), 'the dead canvas is still in the page').toBe(0);

  await page.keyboard.press('Enter');
  await expect(page.locator('[data-bikelab-3d="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-bikelab-gl-lost]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Turn the bike left', exact: true }).click();
  await waitLive(page);
  const after = await liveId(page);
  expect(after, 'Restart did not bring back a live context').not.toBeNull();
  expect(after, 'Restart reused the dead context').not.toBe(before);

  expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)), 'page errors').toEqual([]);
});

test('leaving 3D and coming back (its own forceContextLoss) does not raise the panel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await open3d(page);
  const first = await liveId(page);

  await page.locator('button[data-bikelab-parts-view="2d"]').click();
  await expect(page.locator('[data-bikelab-3d]')).toHaveCount(0, { timeout: 10_000 });
  await page.waitForTimeout(500);
  await page.locator('button[data-bikelab-parts-view="3d"]').click();
  await expect(page.locator('[data-bikelab-3d="ready"]')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Turn the bike left', exact: true }).click();
  await waitLive(page);
  expect(await liveId(page), 'the 3D bike did not rebuild').not.toBe(first);
  await page.waitForTimeout(1000);
  expect(await page.locator('[data-bikelab-gl-lost]').count(), 'the tool\'s own teardown raised the paused panel').toBe(0);
  expect(errors.filter((m) => !/ResizeObserver loop/.test(m)), 'page errors').toEqual([]);
});
