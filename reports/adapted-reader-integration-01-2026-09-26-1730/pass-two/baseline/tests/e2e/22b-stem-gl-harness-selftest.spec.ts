import { test, expect, Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

/**
 * The GL harness's own gates, proven able to FAIL.
 *
 * Every 3D lane verifies with tests/e2e/helpers/stem_gl_harness.ts, so a gate in it
 * that cannot fail makes every spec built on it vacuous. The audit of 2026-09-22 found
 * three: __glCanvas CREATED the context it then reported as live, the "non-blank"
 * screenshot photographed DOM overlays, and "releases on unmount" counted canvases
 * React had already removed. Each test below mounts a fixture tool
 * (helpers/stem_gl_fixture_tool.js) with a KNOWN behaviour and pins the verdict, so a
 * regression in the harness turns this file red instead of silently passing tools.
 *
 * Where the old logic is quoted (LEGACY_GL_CANVAS), it is to show on the same page
 * that it would have passed what the new gate fails.
 *
 * Run:  npx playwright test tests/e2e/22b-stem-gl-harness-selftest.spec.ts --workers=1
 * Judge by the EXIT CODE, not by piped or truncated output.
 */

test.describe.configure({ timeout: 120_000, retries: 0 });

const harness = new GlHarness({
  toolFile: 'tests/e2e/helpers/stem_gl_fixture_tool.js', toolId: 'glFixture', width: 640, height: 400,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

/** The pre-2026-09-22 __glCanvas, verbatim in effect: getContext on every canvas. */
const LEGACY_GL_CANVAS = () => {
  const cs = document.querySelectorAll('#wrap canvas');
  for (let i = 0; i < cs.length; i += 1) {
    try {
      const g = (cs[i] as HTMLCanvasElement).getContext('webgl2') || (cs[i] as HTMLCanvasElement).getContext('webgl');
      if (g) return { live: !(g as WebGLRenderingContext).isContextLost() };
    } catch { /* 2D canvas */ }
  }
  return null;
};

async function mountFixture(page: Page, mode: string, extra: Record<string, unknown> = {}, expectCanvas = true) {
  await harness.mount(page, { glFixture: { mode, ...extra } }, undefined, { expectCanvas });
  if (!expectCanvas) await page.waitForSelector('#wrap canvas', { state: 'attached' });
}

test('a canvas the tool never set up is NOT reported as a live GL context', async ({ page }) => {
  await mountFixture(page, 'noRenderer', {}, false);
  expect(await page.evaluate(() => (window as any).__glCanvas()), 'harness invented a GL canvas').toBeNull();
  expect(await harness.glContexts(page)).toEqual([]);
  expect(await harness.glPixels(page)).toBeNull();

  // The old probe, on the same page, reports a live context: it made one.
  expect(await page.evaluate(LEGACY_GL_CANVAS)).toEqual({ live: true });
  // ...and the recorder attributes it to the test, not the page.
  const after = await harness.glContexts(page);
  expect(after.map((c) => c.createdBy)).toEqual(['test']);
});

test('a real scene: page-created context, draws, meshes counted, pixels non-blank, released', async ({ page }) => {
  await mountFixture(page, 'scene');
  const mount = await harness.currentMount(page);
  const ctxs = await harness.glContexts(page, mount);
  expect(ctxs).toHaveLength(1);
  expect(ctxs[0].createdBy).toBe('page');
  expect(ctxs[0].creator.join('\n')).toContain('stem_gl_fixture_tool.js');
  expect(ctxs[0].draws).toBeGreaterThan(0);

  const scene = await harness.glScene(page);
  expect(scene).toMatchObject({ hasScene: true, meshes: 5, visibleMeshes: 5 });
  expect(scene!.renders).toBeGreaterThan(0);

  const px = await harness.glPixels(page);
  expect(px, 'no GL canvas to photograph').not.toBeNull();
  expect(looksBlank(px!), `scene judged blank: ${JSON.stringify({ ...px, png: undefined })}`).toBe(false);
  // Five box colours plus the clear colour survive the 5-bit bucketing.
  expect(px!.significantColors).toBeGreaterThanOrEqual(6);

  // The fixture asked ensureThree for orbit; the stub does not load it, and says so.
  const notes = await page.evaluate(() => (window as any).__harnessNotes.ensureThree);
  expect(notes).toEqual([{ orbit: true, orbitRequired: false, orbitPresent: false }]);

  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  const released = await harness.glContexts(page, mount);
  expect(released[0]).toMatchObject({ lost: true, lostBy: 'page', connected: false });
});

test('a tool that only dispose()s is caught leaking its context', async ({ page }) => {
  await mountFixture(page, 'leak');
  const mount = await harness.currentMount(page);
  await harness.unmount(page);
  const leaked = await harness.leakedAfterUnmount(page, 1500);
  expect(leaked, 'leak went unnoticed').toHaveLength(1);
  expect(leaked[0].creator.join('\n')).toContain('stem_gl_fixture_tool.js');
  // The old check: no canvas left in #wrap. It passes on exactly this leak.
  expect(await page.evaluate(() => document.querySelectorAll('#wrap canvas').length)).toBe(0);

  // destroy() still cleans up, and the record says it was the harness, not the tool.
  await harness.destroy(page);
  const after = await harness.glContexts(page, mount);
  expect(after[0]).toMatchObject({ lost: true, lostBy: 'harness' });
});

test('a context made BEFORE the mount, then left live, is caught leaking too', async ({ page }) => {
  // Mount 1 makes a renderer the way a shared viewer built at module load would;
  // mount 2 adopts its canvas into #wrap and unmounts without releasing it.
  await mountFixture(page, 'noRenderer', {}, false);
  await page.evaluate(() => (window as any).__fixtureMakeEarly());
  await page.evaluate(() => { (window as any).__unmount(); (window as any).__mount({ glFixture: { mode: 'adoptEarly' } }); });
  await page.waitForFunction(() => !!(window as any).__glCanvas());
  const current = await harness.currentMount(page);
  // Nothing was created during this mount, so a current-mount-only check sees nothing.
  expect(await harness.glContexts(page, current)).toEqual([]);

  await harness.unmount(page);
  const leaked = await harness.leakedAfterUnmount(page, 1500);
  expect(leaked, 'a pre-mount context left live went unnoticed').toHaveLength(1);
  expect(leaked[0].mount).toBeLessThan(current);
  expect(leaked[0].creator.join('\n')).toContain('stem_gl_fixture_tool.js');
});

test('a context that only clears draws nothing and reads as blank', async ({ page }) => {
  await mountFixture(page, 'clearOnly');
  const [ctx] = await harness.glContexts(page);
  expect(ctx.createdBy).toBe('page');
  expect(ctx.draws).toBe(0);
  const px = await harness.glPixels(page);
  expect(looksBlank(px!), JSON.stringify({ ...px, png: undefined })).toBe(true);
});

test('a busy overlay over a dead canvas: the old byte-size check passes, glPixels does not', async ({ page }) => {
  await mountFixture(page, 'overlay');
  await page.evaluate(() => document.querySelector('#wrap canvas')!.setAttribute('data-legacy-shot', '1'));
  const legacyShot = await page.locator('[data-legacy-shot]').screenshot();
  // The legacy "renders something" floor.
  expect(legacyShot.length, 'fixture overlay too plain to demonstrate the trap').toBeGreaterThan(8000);
  const px = await harness.glPixels(page);
  expect(looksBlank(px!), JSON.stringify({ ...px, png: undefined })).toBe(true);
});

test('probing never steals a canvas the tool draws 2D on later', async ({ page }) => {
  await mountFixture(page, 'late2d', {}, false);
  // mount() polls __glCanvas while waiting; do the same across the tool's delay.
  for (let i = 0; i < 5; i += 1) {
    expect(await page.evaluate(() => (window as any).__glCanvas())).toBeNull();
    await page.waitForTimeout(100);
  }
  await page.waitForFunction(() => (window as any).__fixture2d !== undefined, null, { timeout: 5000 });
  expect(await page.evaluate(() => (window as any).__fixture2d), 'the 2D context was stolen').toBe(true);

  // The legacy probe on a fresh mount, before the tool's 2D effect runs: it steals it.
  await mountFixture(page, 'late2d', {}, false);
  expect(await page.evaluate(LEGACY_GL_CANVAS)).toEqual({ live: true });
  await page.waitForFunction(() => (window as any).__fixture2d !== undefined, null, { timeout: 5000 });
  expect(await page.evaluate(() => (window as any).__fixture2d)).toBe(false);
});

test('calibration: the same still scene twice gives the same verdict and near-equal stats', async ({ page }) => {
  await mountFixture(page, 'scene', { spin: false });
  const a = await harness.glPixels(page);
  await page.waitForTimeout(300);
  const b = await harness.glPixels(page);
  // Recorded, not asserted: whether SwiftShader reproduced the bytes exactly.
  test.info().annotations.push({ type: 'same-input-bytes-identical', description: String(a!.png.equals(b!.png)) });
  expect(looksBlank(a!)).toBe(false);
  expect(looksBlank(b!)).toBe(false);
  expect(Math.abs(a!.dominantShare - b!.dominantShare)).toBeLessThan(0.01);
  expect(Math.abs(a!.significantColors - b!.significantColors)).toBeLessThanOrEqual(1);
});
