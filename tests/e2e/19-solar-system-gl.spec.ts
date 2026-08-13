import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Solar System — REAL WebGL smoke.
 *
 * The flagship 3D tool, and its engine has never been verified by anything but eye:
 * every other test around it runs in jsdom, which has no WebGL and no layout.
 *
 * First spec written on the shared harness (helpers/stem_gl_harness.ts), so it is
 * ~90 lines rather than the ~380 the Geometry World one needed.
 *
 * What it pins is deliberately the bug classes that were REAL in Geometry World and
 * that only a browser can see:
 *   - a canvas that grows without bound because a ResizeObserver feeds its own
 *     output back in (there, +8px every 220ms, forever)
 *   - a context that mounts already lost
 *   - a scene that never actually rasterises
 *   - a teardown that leaks the GL context
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js',
  toolId: 'solarSystem',
  // Generous: several of these tools lay out to a minimum width, and squeezing them
  // into an arbitrary box makes the canvas overflow — which is the harness's fault,
  // not the tool's.
  width: 1280,
  height: 800,
  probes: `
    window.__canvasBox = function () {
      var c = document.querySelector('#wrap canvas');
      if (!c) return null;
      var r = c.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), attrW: c.width, attrH: c.height };
    };
    window.__wrapBox = function () {
      var w = document.getElementById('wrap').getBoundingClientRect();
      return { w: Math.round(w.width), h: Math.round(w.height) };
    };
  `,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

// SwiftShader is a software rasteriser; pixel readback is slow.
test.describe.configure({ timeout: 150_000 });

test.describe('Solar System — real WebGL', () => {
  // Chromium caps live WebGL contexts per process and silently kills the oldest.
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('mounts a live, un-lost GL context', async ({ page }) => {
    await harness.mount(page);
    const gl = await page.evaluate(() => (window as any).__glLive());

    expect(gl, 'no canvas mounted').not.toBeNull();
    expect(gl.lost, 'context was lost at mount').toBe(false);
    expect(gl.w).toBeGreaterThan(100);
    expect(gl.h).toBeGreaterThan(100);
  });

  test('does not grow without bound', async ({ page }) => {
    // The Geometry World bug: a canvas is display:inline by default, leaving a ~4px
    // baseline gap; the container grew to fit, a ResizeObserver fed that height back
    // into renderer.setSize, and round it went — reallocating buffers every tick.
    await harness.mount(page);

    const samples: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      samples.push(JSON.stringify(await page.evaluate(() => (window as any).__canvasBox())));
      await page.waitForTimeout(220);
    }
    const distinct = [...new Set(samples)];
    expect(distinct.length, 'canvas size is unstable across frames:\n' + distinct.join('\n')).toBe(1);

    // And it must fit its OWN parent. Measuring against the harness box would just
    // be measuring an arbitrary number I picked.
    const gl = await page.evaluate(() => (window as any).__glLive());
    expect(gl.box.w).toBeLessThanOrEqual(gl.parentBox.w + 1);
    expect(gl.box.h).toBeLessThanOrEqual(gl.parentBox.h + 1);
  });

  test('actually rasterises a moving scene', async ({ page }) => {
    // Two screenshots at different times must differ: proves the scene reaches the
    // framebuffer AND the animation loop is running, in one assertion. gl.readPixels
    // is unreliable here since the renderer does not set preserveDrawingBuffer.
    await harness.mount(page);
    const canvas = page.locator('#wrap canvas').first();

    const a = await canvas.screenshot({ timeout: 60000 });
    await page.waitForTimeout(1200);
    const b = await canvas.screenshot({ timeout: 60000 });

    expect(a.length).toBeGreaterThan(1000);
    expect(Buffer.compare(a, b), 'scene is static — animation loop not running').not.toBe(0);
  });

  test('mounts without throwing', async ({ page }) => {
    await harness.mount(page);
    const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
      .filter((m: string) => !/ResizeObserver loop/.test(m));
    expect(errs).toEqual([]);
  });

  test('the rocky rover accelerates and exposes its damped chase view', async ({ page }) => {
    await harness.mount(page, {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'stem.solar_sys.mars',
        viewTab: 'drone',
      },
    }, 'document.querySelector(\'canvas[data-drone-vehicle-mode="surface-rover"]\')');

    const canvas = page.locator('canvas[data-drone-vehicle-mode="surface-rover"]');
    await canvas.focus();
    // The deployment shot owns the first few seconds and intentionally ignores
    // drive input. Wait for its DOM status to leave before measuring traction.
    await page.waitForFunction(() => !document.getElementById('descent-status'), null, { timeout: 35000 });

    const soundToggle = page.locator('[data-rover-sound-toggle=true]');
    await expect(soundToggle).toBeVisible();
    await expect(soundToggle).toHaveAttribute('aria-keyshortcuts', 'B');
    await expect(soundToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(canvas).toHaveAttribute('data-rover-sound', 'off');
    await soundToggle.click();
    await expect(soundToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas).toHaveAttribute('data-rover-sound', 'on');
    await soundToggle.click();
    await expect(soundToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(canvas).toHaveAttribute('data-rover-sound', 'off');
    await expect(canvas).toBeFocused();

    await page.keyboard.down('KeyW');
    const moving = await page.waitForFunction(() => {
      const el = document.getElementById('hud-spd');
      const speed = el ? Number.parseFloat(String(el.textContent)) : 0;
      return speed > 0.05 ? String(el!.textContent) : false;
    }, null, { timeout: 8000 }).catch(() => null);
    await page.keyboard.up('KeyW');
    expect(moving, 'the rover never accelerated from keyboard input').not.toBeNull();

    await page.keyboard.press('KeyV');
    await expect(page.locator('#hud-mode')).toContainText('3RD PERSON');

    const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
      .filter((m: string) => !/ResizeObserver loop/.test(m));
    expect(errs).toEqual([]);
  });

  test('releases the GL canvas on unmount', async ({ page }) => {
    await harness.mount(page);
    expect(await page.evaluate(() => document.querySelectorAll('#wrap canvas').length)).toBeGreaterThan(0);

    await harness.destroy(page);
    await page.waitForTimeout(500);

    // A canvas left behind after unmount is half of how the Geometry World viewport
    // went blank: the dead one stacked over the live one.
    expect(await page.evaluate(() => document.querySelectorAll('#wrap canvas').length)).toBe(0);
  });
});
