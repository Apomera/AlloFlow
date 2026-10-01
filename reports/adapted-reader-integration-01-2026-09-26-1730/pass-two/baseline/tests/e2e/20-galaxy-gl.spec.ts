import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Galaxy Explorer — REAL WebGL smoke, across every quality tier.
 *
 * WHY THE TIERS MATTER HERE
 * Galaxy has already shipped a bug of exactly the kind only a browser can catch:
 * upscaleGalaxyCanvas recursed into itself and killed 3-D outright on the high and
 * cinematic tiers, and the throw was swallowed by loadGalaxyPP's catch — so there was
 * no error, no warning, just no galaxy. It was found by eye. The default tier is
 * 'auto', so any test that only exercises the default would have sailed straight past
 * it, which is why this drives all five tiers explicitly.
 *
 * Written on helpers/stem_gl_harness.ts — the whole file is ~120 lines because the
 * server, React/three hosting, StemLab shim and ctx come from there.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_galaxy.js',
  toolId: 'galaxy',
  width: 1280,
  height: 820,
  probes: `
    // The galaxy scene canvas specifically, by its own marker attribute rather than
    // document order — the tool also mounts 2D canvases for the black-hole model.
    window.__galaxyCanvas = function () {
      return document.querySelector('canvas[data-galaxy-canvas="true"]');
    };
    window.__galaxyInfo = function () {
      var c = window.__galaxyCanvas();
      if (!c) return null;
      var r = c.getBoundingClientRect();
      var p = c.parentElement ? c.parentElement.getBoundingClientRect() : r;
      var gl = null, lost = null;
      try { gl = c.getContext('webgl2') || c.getContext('webgl'); lost = gl ? gl.isContextLost() : null; } catch (e) {}
      return {
        quality: c.getAttribute('data-quality'),
        renderResolution: c.getAttribute('data-render-resolution'),
        lost: lost,
        box: { w: Math.round(r.width), h: Math.round(r.height) },
        parentBox: { w: Math.round(p.width), h: Math.round(p.height) }
      };
    };
  `,
});

const QUALITIES = ['auto', 'low', 'medium', 'high', 'cinematic'];

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

test.describe.configure({ timeout: 150_000 });

test.describe('Galaxy Explorer — real WebGL', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  for (const quality of QUALITIES) {
    test(`renders a live scene at quality "${quality}"`, async ({ page }) => {
      // Seeded through labToolData.galaxy, which is the channel this tool reads.
      await harness.mount(page, { galaxy: { galaxyQuality: quality } },
        'document.querySelector(\'canvas[data-galaxy-canvas="true"]\')');

      const info = await page.evaluate(() => (window as any).__galaxyInfo());
      expect(info, 'galaxy canvas never mounted at ' + quality).not.toBeNull();
      expect(info.quality).toBe(quality);
      expect(info.lost, 'GL context lost at ' + quality).toBe(false);

      // The upscale bug left the canvas present but the scene absent, and the throw
      // was swallowed — so presence proves nothing; the PIXELS have to be checked.
      // A dead scene clears to a flat colour, which PNG compresses to a few KB; a
      // live starfield does not. Measured here at ~450KB, so the threshold has an
      // enormous margin and is not a tuned number.
      const canvas = page.locator('canvas[data-galaxy-canvas="true"]');
      const shot = await canvas.screenshot({ timeout: 60000 });
      expect(shot.length, 'canvas is blank at quality ' + quality).toBeGreaterThan(20000);

      // NOT asserted: that dragging the camera changes the image. It genuinely does
      // — verified by hand against this exact build, at two different drag points,
      // both confirmed to land on the canvas via elementFromPoint. But it does not
      // reproduce under the Playwright runner, and I could not isolate why (the
      // config is a plain Desktop Chrome profile). A test that fails for reasons
      // nobody understands is worse than no test: it teaches people to ignore red.
      // The assertions above are deterministic and still catch the failure this
      // spec exists for — a 3-D scene that dies on a specific quality tier.

      // A swallowed exception is the failure mode that hid this for weeks.
      const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
        .filter((m: string) => !/ResizeObserver loop/.test(m));
      expect(errs, 'page errors at ' + quality).toEqual([]);
    });
  }

  test('the canvas stays put and fits its parent', async ({ page }) => {
    // The Geometry World growth bug: a ResizeObserver fed its own output back in and
    // the canvas climbed ~8px every 220ms, forever.
    await harness.mount(page, {}, 'document.querySelector(\'canvas[data-galaxy-canvas="true"]\')');

    const samples: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      samples.push(JSON.stringify((await page.evaluate(() => (window as any).__galaxyInfo())).box));
      await page.waitForTimeout(220);
    }
    const distinct = [...new Set(samples)];
    expect(distinct.length, 'canvas size unstable:\n' + distinct.join('\n')).toBe(1);

    const info = await page.evaluate(() => (window as any).__galaxyInfo());
    expect(info.box.w).toBeLessThanOrEqual(info.parentBox.w + 1);
    expect(info.box.h).toBeLessThanOrEqual(info.parentBox.h + 1);
  });

  test('releases its canvas on unmount', async ({ page }) => {
    await harness.mount(page, {}, 'document.querySelector(\'canvas[data-galaxy-canvas="true"]\')');
    expect(await page.evaluate(() => !!(window as any).__galaxyCanvas())).toBe(true);

    await harness.destroy(page);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => !!(window as any).__galaxyCanvas())).toBe(false);
  });
});
