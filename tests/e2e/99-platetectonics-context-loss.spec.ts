import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Plate Tectonics has TWO WebGL surfaces, and neither listened for
 * `webglcontextlost`: a context lost after init (GPU reset, low-memory Chromebook,
 * browser evicting old contexts) left a black box with no message.
 *
 *  - TectGL, the 3D boundary block inside the simulator shelf
 *    (canvas[data-tect-gl]). Its creation failure already dropped to the 2D
 *    cross-section via onFail; a loss now fails as 'lost', which also raises a
 *    role="alert" "3D view paused" panel with a Restart that remounts the block.
 *  - VentGL, the 3D volcano cutaway (canvas[data-pt-vent-gl]). Its creation
 *    failure is sticky (hasFailed() refuses 3D for the session), so a loss gets its
 *    own path: the 2D eruption shows, plus the panel, and Restart bumps the canvas
 *    key so React mounts a fresh canvas and renderer.
 *
 * Neither module force-loses its own context, so the mode-switch test is a guard
 * against a future dispose() that does.
 */
test.describe.configure({ timeout: 180_000, retries: 0 });
test.use({ trace: 'off', video: 'off' });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_platetectonics.js',
  toolId: 'plateTectonics',
  width: 1280,
  height: 900,
  layout: 'document',
  // The block's quake foci come from the host's StemLab.makeVoxelBatch, which the
  // harness stub lacks; without the real host TectGL fails its first frame.
  preScripts: ['stem_lab/stem_lab_module.js'],
  // The block canvas is `absolute inset-0` inside a Tailwind `relative` frame. With
  // no app CSS the frame is not positioned and the canvas covers the whole page.
  appStyles: true,
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
// A module that falls back (TectGL fail('frame')) only says why on the console.
let consoleErrors: string[] = [];
test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 400)); });
});

const SIM = { plateTectonics: { simTab: 'sim', _ptPicked: true, _ptCategory: 'sim_quiz' } };

/** Live-context id of the first recorded GL canvas matching sel, or null. */
async function liveId(page: any, sel: string): Promise<number | null> {
  return page.evaluate((s: string) => {
    const cv = document.querySelector(s) as HTMLCanvasElement | null;
    const rec = cv && (window as any).__glRecord(cv);
    return rec && cv!.isConnected && !rec.ctx.isContextLost() ? rec.id : null;
  }, sel);
}
async function waitLive(page: any, sel: string) {
  try {
    await page.waitForFunction((s: string) => {
      const cv = document.querySelector(s) as HTMLCanvasElement | null;
      const rec = cv && (window as any).__glRecord(cv);
      return !!rec && cv!.isConnected && !rec.ctx.isContextLost() && rec.renders > 0;
    }, sel, { timeout: 40_000, polling: 200 });
  } catch (err) {
    // Say WHY: no canvas, no context, a lost one, or one that never drew.
    const seen = await page.evaluate((s: string) => {
      const w = window as any;
      const cvs = Array.from(document.querySelectorAll(s)) as HTMLCanvasElement[];
      return {
        canvases: cvs.map((cv) => { const r = w.__glRecord(cv); const b = cv.getBoundingClientRect();
          return { box: Math.round(b.width) + 'x' + Math.round(b.height), rec: r ? { lost: r.ctx.isContextLost(), renders: r.renders, draws: r.draws } : null }; }),
        tect: w.__alloTectGL ? w.__alloTectGL.debug() && w.__alloTectGL.debug().state : null,
        vent: w.__alloVentGL ? w.__alloVentGL.debug && (function () { try { return w.__alloVentGL.debug().state; } catch (e) { return 'n/a'; } })() : null,
        errors: w.__events && w.__events.errors,
      };
    }, sel).catch(() => null);
    throw new Error(`${sel} never drew on a live context: ${JSON.stringify(seen)}\nconsole errors: ${JSON.stringify(consoleErrors.slice(-5))}\n${(err as Error).message}`);
  }
}
async function loseContext(page: any, sel: string): Promise<boolean> {
  return page.evaluate((s: string) => {
    const cv = document.querySelector(s) as HTMLCanvasElement | null;
    const rec = cv && (window as any).__glRecord(cv);
    const ext = rec && rec.ctx.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    ext.loseContext();
    return true;
  }, sel);
}
async function canFocus(page: any, sel: string) {
  return page.evaluate((s: string) => {
    const cv = document.querySelector(s) as HTMLCanvasElement | null;
    if (!cv) return { found: false, focused: false, tabIndex: null as number | null };
    cv.focus();
    return { found: true, focused: document.activeElement === cv, tabIndex: cv.tabIndex };
  }, sel);
}

test('3D boundary block: a lost context shows the paused panel and Restart rebuilds it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await harness.mount(page, SIM, undefined, { expectCanvas: false });
  const BLOCK = 'canvas[data-tect-gl="true"]';
  await page.locator('button[data-tect-view="3d"]').first().click();
  await waitLive(page, BLOCK);

  const before = await liveId(page, BLOCK);
  expect(before, 'the block never took a live WebGL context, so this proves nothing').not.toBeNull();
  expect(await page.locator('[data-tect-gl-lost]').count(), 'panel up before the loss').toBe(0);

  expect(await loseContext(page, BLOCK), 'could not force a context loss').toBe(true);

  const panel = page.locator('[data-tect-gl-lost][role="alert"]');
  await expect(panel, 'the block went black with no explanation').toBeVisible({ timeout: 15_000 });
  await expect(panel).toContainText('3D view paused');
  await expect(panel).toContainText('2D cross-section');
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.hasAttribute('data-tect-gl-restart')),
    { message: 'focus did not move to the Restart button' }).toBe(true);

  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tect-gl-lost]')).toHaveCount(0, { timeout: 15_000 });
  await waitLive(page, BLOCK);
  const after = await liveId(page, BLOCK);
  expect(after, 'Restart did not bring back a live context').not.toBeNull();
  expect(after, 'Restart reused the dead context').not.toBe(before);

  // Arrow keys turn the block, so the rebuilt canvas must take focus.
  const f = await canFocus(page, BLOCK);
  expect(f.focused, 'the rebuilt block cannot take focus, so its keys are dead').toBe(true);

  expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)), 'page errors').toEqual([]);
});

test('3D volcano cutaway: a lost context shows the paused panel and Restart rebuilds it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await harness.mount(page, SIM, undefined, { expectCanvas: false });
  const VENT = 'canvas[data-pt-vent-gl="true"]';
  await page.locator('button[data-pt-vent-view="3d"]').first().click();
  await waitLive(page, VENT);

  const before = await liveId(page, VENT);
  expect(before, 'the cutaway never took a live WebGL context, so this proves nothing').not.toBeNull();
  expect(await page.locator('[data-pt-vent-gl-lost]').count(), 'panel up before the loss').toBe(0);

  expect(await loseContext(page, VENT), 'could not force a context loss').toBe(true);

  const panel = page.locator('[data-pt-vent-gl-lost][role="alert"]');
  await expect(panel, 'the cutaway went black with no explanation').toBeVisible({ timeout: 15_000 });
  await expect(panel).toContainText('3D view paused');
  await expect(panel).toContainText('2D eruption');
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.hasAttribute('data-pt-vent-gl-restart')),
    { message: 'focus did not move to the Restart button' }).toBe(true);

  await page.keyboard.press('Enter');
  await expect(page.locator('[data-pt-vent-gl-lost]')).toHaveCount(0, { timeout: 15_000 });
  await waitLive(page, VENT);
  const after = await liveId(page, VENT);
  expect(after, 'Restart did not bring back a live context').not.toBeNull();
  expect(after, 'Restart reused the dead context').not.toBe(before);
  expect(await page.locator('button[data-pt-vent-view="3d"]').first().getAttribute('aria-pressed')).toBe('true');

  const f = await canFocus(page, VENT);
  expect(f.focused, 'the rebuilt cutaway cannot take focus, so its keys are dead').toBe(true);

  expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)), 'page errors').toEqual([]);
});

test('switching the block to 2D and back (dispose and rebuild) does not raise the panel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await harness.mount(page, SIM, undefined, { expectCanvas: false });
  const BLOCK = 'canvas[data-tect-gl="true"]';
  const toggle3d = page.locator('button[data-tect-view="3d"]').first();
  const toggle2d = page.locator('button[data-tect-view="2d"]').first();
  await toggle3d.click();
  await waitLive(page, BLOCK);
  const first = await liveId(page, BLOCK);
  await toggle2d.click();
  await expect(page.locator(BLOCK)).toHaveCount(0, { timeout: 10_000 });
  await page.waitForTimeout(500);
  await toggle3d.click();
  await waitLive(page, BLOCK);
  expect(await liveId(page, BLOCK), 'the block did not rebuild').not.toBe(first);
  await page.waitForTimeout(1000);
  expect(await page.locator('[data-tect-gl-lost], [data-pt-vent-gl-lost]').count(),
    'a normal view switch raised the paused panel').toBe(0);
  expect(errors.filter((m) => !/ResizeObserver loop/.test(m)), 'page errors').toEqual([]);
});
