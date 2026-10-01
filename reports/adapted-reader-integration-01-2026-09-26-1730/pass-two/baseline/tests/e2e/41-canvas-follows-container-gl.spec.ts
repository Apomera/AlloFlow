import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Does a 3-D tool's canvas still follow its container after three.js has sized it?
 *
 * WHY THIS EXISTS
 * `renderer.setSize(w, h)` leaves updateStyle at its default of true, so three.js
 * writes width/height in PIXELS onto the canvas's inline style. Where the canvas is
 * laid out at 100% and w/h were measured FROM that canvas, the element pins itself to
 * its first measurement and can never change size again — and a ResizeObserver
 * watching that same canvas therefore never fires either.
 *
 * Found 2026-08-16 in Galaxy Explorer, reported as "fullscreen does nothing". It was
 * not a fullscreen bug: the canvas stayed 618px tall inside a 796px container, in
 * fullscreen and on an ordinary window resize alike. Solar System had it in both its
 * orrery and its drone view. Neither is visible without real layout, which is why it
 * survived a jsdom suite, a static crash gate and a render golden.
 *
 * A screenshot cannot tell this apart from a fullscreen bug, so this measures the
 * CONTAINER and the CANVAS separately across a viewport change. Container moved and
 * canvas did not = pinned.
 */

interface Probe {
  id: string;
  file: string;
  toolId: string;
  toolData: Record<string, unknown>;
  /** Marker for the scene canvas — these tools also mount 2-D canvases. */
  selector: string;
}

const PROBES: Probe[] = [
  {
    id: 'galaxy',
    file: 'stem_lab/stem_tool_galaxy.js',
    toolId: 'galaxy',
    toolData: { galaxy: { simMode: 'galaxy', galaxyQuality: 'low' } },
    selector: 'canvas[data-galaxy-canvas="true"]',
  },
  {
    id: 'solarSystem',
    file: 'stem_lab/stem_tool_solarsystem.js',
    toolId: 'solarSystem',
    toolData: { solarSystem: { tutorialDismissed: true } },
    selector: 'canvas.solar3d-canvas',
  },
];

const WIDE = { width: 1280, height: 860 };
const NARROW = { width: 760, height: 860 };

const MEASURE = `
  // The harness mounts into a fixed-size #wrap, so changing the VIEWPORT leaves the
  // tool's container untouched and proves nothing. Drive the wrapper directly, the
  // way 20-solar-system-orrery-responsive does.
  window.__setWrapWidth = function (px) {
    var wrap = document.getElementById('wrap');
    if (!wrap) throw new Error('harness wrapper did not mount');
    wrap.style.width = px + 'px';
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    return Math.round(wrap.getBoundingClientRect().width);
  };
  window.__canvasBox = function (selector) {
    var c = document.querySelector(selector);
    if (!c) return null;
    var r = c.getBoundingClientRect();
    var p = c.parentElement ? c.parentElement.getBoundingClientRect() : r;
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      parentW: Math.round(p.width), parentH: Math.round(p.height),
      inlineW: c.style.width || '(none)', inlineH: c.style.height || '(none)',
      buffer: c.width + 'x' + c.height,
    };
  };
`;

test.describe.configure({ timeout: 150_000 });

for (const probe of PROBES) {
  test.describe(`${probe.id} — canvas follows its container`, () => {
    const harness = new GlHarness({
      toolFile: probe.file,
      toolId: probe.toolId,
      width: WIDE.width,
      height: WIDE.height,
      probes: MEASURE,
      // Required, not optional polish: Solar System sizes its canvas with the Tailwind
      // `w-full` class. Without the compiled stylesheet the canvas has no CSS width at
      // all and falls back to its width ATTRIBUTE, so it would look pinned here whether
      // the tool was fixed or not — the test would be measuring the harness.
      appStyles: true,
    });

    test.beforeAll(async () => { await harness.start(); });
    test.afterAll(async () => { await harness.stop(); });
    test.afterEach(async ({ page }) => { await harness.destroy(page); });

    test('narrowing the container resizes the scene canvas', async ({ page }) => {
      await page.setViewportSize(WIDE);
      await harness.mount(page, probe.toolData);

      const before = await page.evaluate((s) => (window as any).__canvasBox(s), probe.selector);
      expect(before, `${probe.id}: no scene canvas matched ${probe.selector}`).not.toBeNull();
      expect(before.w).toBeGreaterThan(0);

      await page.evaluate((px) => (window as any).__setWrapWidth(px), NARROW.width);
      // The tools debounce onto rAF, and SwiftShader is slow; give the observer room.
      await page.waitForTimeout(1500);
      const after = await page.evaluate((s) => (window as any).__canvasBox(s), probe.selector);

      // Guard the guard: if the container did not actually change there is nothing to
      // assert, and a pinned canvas would pass silently.
      expect(after.parentW,
        `${probe.id}: the container did not change, so this run proves nothing`)
        .toBeLessThan(before.parentW - 8);

      expect(after.w,
        `${probe.id}: canvas stayed ${before.w}px wide while its container went `
        + `${before.parentW} -> ${after.parentW} (inline width ${after.inlineW}). `
        + 'three.js writes px into the canvas style unless setSize is passed '
        + 'updateStyle=false, which pins the element and starves its ResizeObserver.')
        .toBeLessThan(before.w - 8);

      // The drawing buffer has to follow too, or the scene is merely stretched.
      expect(after.buffer, `${probe.id}: drawing buffer never re-allocated`).not.toBe(before.buffer);
    });
  });
}
