import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * RoadReady's drive view had no `webglcontextlost` handler, so a context lost
 * mid-drive (GPU reset, low-memory Chromebook, browser evicting old contexts) left a
 * black road with no message. Creation failure was already handled: `webglError`
 * swaps the 3D canvas for a panel whose Retry re-runs the drive effect on a fresh
 * canvas. A loss is routed into that same state as 'lost', worded as a pause.
 *
 * The drive's own teardown calls renderer.forceContextLoss(), which fires the same
 * event; the second test proves ending and restarting a drive does not raise the panel.
 */
test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ trace: 'off', video: 'off' });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 780,
  preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const DRIVE = '[data-rr-view="driving"]';

async function startDrive(page: any) {
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('residential', 'sedan'));
  await page.waitForSelector(DRIVE, { timeout: 30_000 });
}

async function waitLive(page: any, timeout = 90_000) {
  await page.waitForFunction((sel: string) => {
    const hit = (window as any).__glCanvas(sel);
    return !!hit && hit.el.isConnected && !hit.gl.isContextLost() && hit.rec.renders > 0;
  }, DRIVE, { timeout, polling: 200 });
}

async function mountBriefing(page: any) {
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'residential', scenario: 'residential',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
}

test('a lost drive context shows the paused panel and Restart brings back a live, drivable view', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await mountBriefing(page);
  await startDrive(page);
  await waitLive(page);

  const before = await page.evaluate((sel) => {
    const hit = (window as any).__glCanvas(sel);
    return { live: !!hit && !hit.gl.isContextLost(), id: hit && hit.rec.id,
      panel: !!document.querySelector('[data-rr-gl-panel]') };
  }, DRIVE);
  expect(before.live, 'the drive never took a live WebGL context, so this proves nothing').toBe(true);
  expect(before.panel, 'the WebGL panel was already up before the loss').toBe(false);

  const killed = await page.evaluate((sel) => {
    const hit = (window as any).__glCanvas(sel);
    const ext = hit && hit.gl.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    ext.loseContext();
    return true;
  }, DRIVE);
  expect(killed, 'could not force a context loss').toBe(true);

  const panel = page.locator('[data-rr-gl-panel="lost"][role="alert"]');
  await expect(panel, 'the road went black with no explanation').toBeVisible({ timeout: 15_000 });
  await expect(panel).toContainText('3D view paused');
  await expect(panel).toContainText('This device ran low on graphics memory');
  const restart = page.getByRole('button', { name: 'Restart 3D view', exact: true });
  await expect(restart).toBeVisible();
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('data-rr-gl-retry')),
    { message: 'focus did not move to the Restart button' }).toBe('true');

  // Keyboard activation, so a keyboard-only student is not stuck behind the panel.
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-rr-gl-panel]')).toHaveCount(0, { timeout: 15_000 });
  await waitLive(page);
  const after = await page.evaluate((sel) => {
    const hit = (window as any).__glCanvas(sel);
    return { live: !!hit && !hit.gl.isContextLost(), id: hit && hit.rec.id };
  }, DRIVE);
  expect(after.live, 'Restart did not bring back a live context').toBe(true);
  expect(after.id, 'Restart reused the dead context instead of making a new one').not.toBe(before.id);

  // The drive keys live on the HUD canvas (the drive surface): it must take focus again.
  const usable = await page.evaluate(() => {
    const hud = document.querySelector('[data-rr-view="driving"] canvas[role="application"]') as HTMLCanvasElement | null;
    if (!hud) return { found: false, focused: false };
    hud.focus();
    return { found: true, focused: document.activeElement === hud };
  });
  expect(usable.found, 'no HUD drive surface after Restart').toBe(true);
  expect(usable.focused, 'the drive surface cannot take focus after Restart, so keys are dead').toBe(true);

  expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)), 'page errors').toEqual([]);
});

test('ending and restarting a drive (its own forceContextLoss) does not raise the panel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await mountBriefing(page);
  await startDrive(page);
  await waitLive(page);
  const firstId = await page.evaluate((sel) => (window as any).__glCanvas(sel).rec.id, DRIVE);

  // Escape is the advertised end-drive shortcut; the drive effect's cleanup disposes
  // the renderer and force-loses its context.
  await page.evaluate(() => {
    const hud = document.querySelector('[data-rr-view="driving"] canvas[role="application"]') as HTMLElement | null;
    if (hud) hud.focus();
  });
  await page.keyboard.press('Escape');
  await expect(page.locator(DRIVE)).toHaveCount(0, { timeout: 15_000 });
  await page.waitForTimeout(500);

  await startDrive(page);
  await waitLive(page);
  const second = await page.evaluate((sel) => (window as any).__glCanvas(sel).rec.id, DRIVE);
  expect(second, 'the restarted drive did not make a new context').not.toBe(firstId);
  await page.waitForTimeout(1500);
  expect(await page.locator('[data-rr-gl-panel]').count(),
    'the tool\'s own teardown raised a WebGL panel').toBe(0);

  expect(errors.filter((m) => !/ResizeObserver loop/.test(m)), 'page errors').toEqual([]);
});
