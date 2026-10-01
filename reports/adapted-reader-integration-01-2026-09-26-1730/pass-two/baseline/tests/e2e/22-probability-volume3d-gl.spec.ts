import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Probability Lab — 3D Monte Carlo volume mode. REAL WebGL smoke.
 *
 * The jsdom suite (probability_dice_and_shape_sample) proves the maths and the
 * markup: shapes sample to their exact volumes, the readout survives a missing
 * engine, the canvas carries a text equivalent. None of it can see whether the
 * scene actually DRAWS — jsdom has no WebGL, so `_v3Boot` never runs there and
 * every line of the renderer, the point-cloud rebuild and the teardown is
 * invisible to it.
 *
 * What this pins:
 *   1. The scene boots on a real GL context and the context is not lost.
 *   2. The canvas is display:block. Inline is a line box, and measuring an
 *      inline canvas to size the renderer grows its parent every frame — an
 *      unbounded resize loop that has taken down 3D tools in this repo.
 *   3. The renderer sizes itself to its PARENT, not to the arbitrary harness box.
 *   4. Throwing darts actually rebuilds the point cloud in the scene.
 *   5. Teardown releases the context instead of leaking a renderer per mount.
 *   6. No OrbitControls => still renders. The harness serves bare three.min.js
 *      with no controls, which is exactly what a student gets when the second
 *      CDN request is blocked but the first succeeds.
 *
 * Serves the working tree with React UMD + three r128 from vendor/, so no
 * network. Pattern follows tests/e2e/21-volume-gl.spec.ts.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_probability.js',
  toolId: 'probability',
  width: 900,
  height: 620,
  probes: `
    // Reach into the tool's module-scope 3D handle via the scene graph: the
    // renderer is the only WebGLRenderer on the page.
    window.__v3 = function () {
      var c = document.querySelector('#wrap canvas');
      if (!c) return null;
      var cs = window.getComputedStyle(c);
      var p = c.parentElement;
      return {
        display: cs.display,
        parentW: Math.round(p.getBoundingClientRect().width),
        canvasW: Math.round(c.getBoundingClientRect().width),
        canvasH: Math.round(c.getBoundingClientRect().height),
        attrW: c.width,
        attrH: c.height
      };
    };
    // Count drawn points by reading pixels: a cloud that never reaches the GPU
    // leaves the framebuffer flat.
    window.__nonBg = function () {
      var c = document.querySelector('#wrap canvas');
      if (!c) return -1;
      var gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return -1;
      var w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      var px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      var n = 0;
      for (var i = 0; i < px.length; i += 4) if (px[i + 3] > 8) n++;
      return n;
    };
  `
});

const READY = 'window.__glCanvas && window.__glCanvas()';

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
// ★ Scenes MUST be torn down between tests or the suite goes flaky and ~4x slow
// as leaked contexts pile up against the browser's live-context cap.
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const MOUNT = { probability: { mode: 'volume3d', v3Shape: 'sphere', _v3Engine: 'ready', v3Total: 0, v3Inside: 0 } };

test('boots a live GL context for the 3D volume mode', async ({ page }) => {
  await harness.mount(page, MOUNT, READY);
  const info = await page.evaluate(() => (window as any).__glLive());
  expect(info, 'no GL canvas at all').toBeTruthy();
  expect(info.lost, 'GL context came up lost').toBe(false);
  expect(info.canvasCount).toBe(1);
  const errs = await page.evaluate(() => (window as any).__events.errors);
  expect(errs, 'page errors while booting the scene').toEqual([]);
});

test('canvas is display:block and sizes to its own parent', async ({ page }) => {
  await harness.mount(page, MOUNT, READY);
  const v = await page.evaluate(() => (window as any).__v3());
  // The resize-loop guard. An inline canvas contributes descender space to its
  // parent's line box, so parent height grows every measure->setSize->measure.
  expect(v.display, 'canvas is not display:block — resize loop risk').toBe('block');
  expect(v.canvasW).toBeGreaterThan(100);
  expect(v.canvasH).toBeGreaterThan(100);
  // Width tracks the parent, not the 900px harness box.
  expect(Math.abs(v.canvasW - v.parentW), 'canvas width drifted from its parent').toBeLessThanOrEqual(4);
});

test('height stays put across repeated resize observations', async ({ page }) => {
  await harness.mount(page, MOUNT, READY);
  const first = await page.evaluate(() => (window as any).__v3().canvasH);
  // Nudge the container a few times; a feedback loop shows up as monotonic growth.
  for (const w of [820, 760, 880]) {
    await page.evaluate((px) => { (document.getElementById('wrap') as HTMLElement).style.width = px + 'px'; }, w);
    await page.waitForTimeout(220);
  }
  await page.evaluate(() => { (document.getElementById('wrap') as HTMLElement).style.width = '900px'; });
  await page.waitForTimeout(400);
  const back = await page.evaluate(() => (window as any).__v3().canvasH);
  expect(Math.abs(back - first), 'canvas height ratcheted: ' + first + ' -> ' + back).toBeLessThanOrEqual(6);
});

test('throwing darts changes what is actually drawn', async ({ page }) => {
  // readPixels cannot be used here: the renderer leaves preserveDrawingBuffer
  // at its default false, so the buffer is empty by the time a probe outside
  // the render loop can read it — and turning it on would cost every student a
  // slower renderer purely to satisfy a test. Screenshot the composited canvas
  // instead, with motion reduced so the idle spin cannot masquerade as a change.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, MOUNT, READY);
  const canvas = page.locator('#wrap canvas');
  const before = await canvas.screenshot();
  await page.getByRole('button', { name: /\+1,000 darts/ }).click();
  await page.waitForTimeout(900);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after) !== 0, 'dart cloud never reached the screen').toBe(true);
  await expect(page.getByText(/Estimated volume/)).toBeVisible();
});

test('idle spin is off when the student asked for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, MOUNT, READY);
  const canvas = page.locator('#wrap canvas');
  const a = await canvas.screenshot();
  await page.waitForTimeout(1200);
  const b = await canvas.screenshot();
  expect(Buffer.compare(a, b), 'scene kept rotating under prefers-reduced-motion').toBe(0);
});

test('arrow keys actually turn the view', async ({ page }) => {
  // OrbitControls is pointer-only, so this is the only way a keyboard user can
  // rotate. Motion reduced so the idle spin cannot supply the difference.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { probability: { mode: 'volume3d', v3Shape: 'sphere', _v3Engine: 'ready', v3Total: 3000, v3Inside: 1571 } }, READY);
  const canvas = page.locator('#wrap canvas');
  await canvas.focus();
  expect(await page.evaluate(() => document.activeElement?.tagName), 'canvas cannot take focus').toBe('CANVAS');
  const before = await canvas.screenshot();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(500);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after) !== 0, 'arrow keys did not move the camera').toBe(true);
});

test('arrow keys do not scroll the page out from under the view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, MOUNT, READY);
  // Must come AFTER mount: mount navigates, which discards injected styles.
  await page.addStyleTag({ content: 'body { min-height: 3000px; }' });
  await page.locator('#wrap canvas').focus();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('CANVAS');
  await page.evaluate(() => window.scrollTo(0, 0));
  const y0 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(250);
  const y1 = await page.evaluate(() => window.scrollY);
  expect(y1, 'page scrolled while steering the 3D view').toBe(y0);
});

test('renders without OrbitControls (second CDN blocked)', async ({ page }) => {
  // The harness serves bare three.min.js — no OrbitControls — which is the
  // partial-failure case ensureThree deliberately tolerates.
  await harness.mount(page, MOUNT, READY);
  const hasControls = await page.evaluate(() => !!(window as any).THREE?.OrbitControls);
  expect(hasControls, 'harness unexpectedly has OrbitControls; this test proves nothing').toBe(false);
  const info = await page.evaluate(() => (window as any).__glLive());
  expect(info.lost).toBe(false);
  const errs = await page.evaluate(() => (window as any).__events.errors);
  expect(errs).toEqual([]);
});

test('switching shape keeps one context, not one per shape', async ({ page }) => {
  await harness.mount(page, MOUNT, READY);
  for (const name of [/^Cone/, /^Pyramid/, /^Potato/, /^Sphere/]) {
    await page.getByRole('button', { name }).click();
    await page.waitForTimeout(350);
  }
  const info = await page.evaluate(() => (window as any).__glLive());
  expect(info.canvasCount, 'a canvas leaked per shape switch').toBe(1);
  expect(info.lost, 'context lost after switching shapes').toBe(false);
  const errs = await page.evaluate(() => (window as any).__events.errors);
  expect(errs).toEqual([]);
});

test('teardown releases the canvas', async ({ page }) => {
  await harness.mount(page, MOUNT, READY);
  await harness.destroy(page);
  await page.waitForTimeout(300);
  const remaining = await page.evaluate(() => document.querySelectorAll('#wrap canvas').length);
  expect(remaining, 'canvas survived unmount — renderer is leaking').toBe(0);
});
