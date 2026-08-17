import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Cell Biology Simulator — the petri simulation must stop while scrolled out of view.
 *
 * WHY THIS EXISTS
 * The tool already stops for a hidden TAB, which is the case people think of. Browsers
 * never throttle requestAnimationFrame for an element that has merely been scrolled
 * past — and this canvas sits BELOW THE FOLD on first paint, so the simulation ran
 * unseen from the moment the tool opened until the student scrolled down to it.
 * Measured 2026-08-16 with the canvas fully off-screen: 325 paint calls per 2.5s
 * against 360 while visible. After the fix: 0.
 *
 * WHY IT COUNTS PAINTS RATHER THAN RENDERER CALLS
 * This tool draws on a 2-D context, so the THREE.WebGLRenderer wrapper used for the
 * 3-D tools has nothing to hook. Wrapping clearRect/fillRect on
 * CanvasRenderingContext2D.prototype and attributing each call to its own canvas is
 * the equivalent signal, and unlike a raw rAF count it cannot be confused by another
 * loop on the page.
 *
 * ★ The baseline has to be taken with the canvas scrolled INTO view. Sampling at
 *   scrollTop 0 compares two off-screen states and reports no difference, which is
 *   exactly the wrong answer for the right reason.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cell.js',
  toolId: 'cell',
  width: 1100,
  height: 800,
  appStyles: true,
  probes: `
    window.__paints = 0;
    window.__patched = false;
    (function () {
      var proto = window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype;
      if (!proto) return;
      // Counted across every 2-D context, not just the canvas carrying
      // data-cell-sim-canvas: the renderer paints into a detached buffer canvas and
      // blits, so filtering on the DOM element's attribute counts zero and reads as
      // "already fixed". In the default mode this simulation is the only 2-D animation
      // on the page, so the total is attributable.
      ['clearRect', 'fillRect'].forEach(function (name) {
        var real = proto[name];
        proto[name] = function () {
          window.__paints++;
          return real.apply(this, arguments);
        };
      });
      window.__patched = true;
    })();
    window.__makeScrollable = function (h) {
      var w = document.getElementById('wrap');
      w.style.height = h + 'px';
      w.style.overflow = 'auto';
      return w.scrollHeight;
    };
    window.__scrollWrap = function (y) {
      var w = document.getElementById('wrap');
      w.scrollTop = y;
      return w.scrollTop;
    };
    window.__canvasBox = function (selector) {
      var c = document.querySelector(selector);
      var w = document.getElementById('wrap');
      if (!c || !w) return null;
      var r = c.getBoundingClientRect(), wr = w.getBoundingClientRect();
      return { top: Math.round(r.top - wr.top), off: r.bottom < wr.top || r.top > wr.bottom };
    };
    window.__simOffScreen = function () {
      var c = document.querySelector('canvas[data-cell-sim-canvas]');
      var w = document.getElementById('wrap');
      if (!c || !w) return null;
      var r = c.getBoundingClientRect(), wr = w.getBoundingClientRect();
      return r.bottom < wr.top || r.top > wr.bottom;
    };
  `,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 200_000 });

test('the petri simulation pauses off-screen and resumes when scrolled back', async ({ page }) => {
  await harness.mount(page, { cell: {} }, undefined, { expectCanvas: false });
  // A short viewport, so a canvas nearly 700px tall can leave it completely.
  await page.evaluate(() => (window as any).__makeScrollable(320));
  await page.waitForTimeout(2000);

  expect(await page.evaluate(() => (window as any).__patched),
    'the 2-D context was never wrapped, so every count below would be a meaningless zero')
    .toBe(true);
  expect(await page.evaluate(() => (window as any).__simOffScreen()),
    'the simulation canvas is expected to mount below the fold — if that changed, the '
    + 'scroll positions in this spec need revisiting').toBe(true);

  const sample = async () => {
    await page.evaluate(() => { (window as any).__paints = 0; });
    await page.waitForTimeout(2500);
    return page.evaluate(() => (window as any).__paints);
  };

  await page.evaluate(() => (window as any).__scrollWrap(820));
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => (window as any).__simOffScreen()),
    'the canvas was not brought into view for the baseline').toBe(false);

  const inView = await sample();
  expect(inView, 'the simulation never painted while in view — nothing was measured')
    .toBeGreaterThan(30);

  await page.evaluate(() => (window as any).__scrollWrap(0));
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => (window as any).__simOffScreen()),
    'the scroll did not move the canvas out of view').toBe(true);

  const away = await sample();
  expect(away,
    `the simulation kept painting while scrolled out of view: ${away} calls in 2.5s `
    + `(${inView} while visible). rAF is throttled for a hidden tab, never for an `
    + 'off-screen element.').toBeLessThanOrEqual(2);

  await page.evaluate(() => (window as any).__scrollWrap(820));
  await page.waitForTimeout(1200);
  const back = await sample();
  expect(back,
    'the simulation did not resume after scrolling back: a guard that pauses and never '
    + 'returns leaves a frozen dish, which reads as broken rather than efficient')
    .toBeGreaterThan(30);
});

// The other two animated modes have their own rAF loops, each guarded only on
// document.hidden before this, and each mounting BELOW the fold like the petri canvas.
// Measured off-screen 2026-08-16: interior 755 paints/2.5s (715 in view),
// microdissection 1386 (1341 in view) — no reduction at all. After the fix: 0.
const MODES: [string, string][] = [
  ['interior', 'canvas[data-cell-interior-canvas]'],
  ['microdissection', 'canvas[data-cell-microdissection-canvas]'],
];

for (const [mode, selector] of MODES) {
  test(`the ${mode} canvas pauses off-screen and resumes when scrolled back`, async ({ page }) => {
    await harness.mount(page, { cell: { mode } }, undefined, { expectCanvas: false });
    await page.evaluate(() => (window as any).__makeScrollable(320));
    await page.waitForTimeout(2000);

    const box = async () => page.evaluate((s) => (window as any).__canvasBox(s), selector);
    const sample = async () => {
      await page.evaluate(() => { (window as any).__paints = 0; });
      await page.waitForTimeout(2500);
      return page.evaluate(() => (window as any).__paints);
    };

    const start = await box();
    expect(start, `no ${mode} canvas matched ${selector}`).not.toBeNull();

    // Scroll it to the top of the viewport rather than guessing an offset: these
    // canvases differ in height and position, and a fixed number would silently
    // measure the wrong state as the layout changes.
    await page.evaluate((y) => (window as any).__scrollWrap(y), Math.max(0, start.top - 40));
    await page.waitForTimeout(1200);
    expect((await box()).off, `the ${mode} canvas was not brought into view`).toBe(false);

    const inView = await sample();
    expect(inView, `the ${mode} canvas never painted while in view — nothing was measured`)
      .toBeGreaterThan(30);

    await page.evaluate(() => (window as any).__scrollWrap(0));
    await page.waitForTimeout(1200);
    expect((await box()).off, `the ${mode} canvas did not leave the viewport`).toBe(true);

    const away = await sample();
    expect(away,
      `the ${mode} canvas kept painting while scrolled out of view: ${away} calls in `
      + `2.5s (${inView} while visible)`).toBeLessThanOrEqual(2);

    await page.evaluate((y) => (window as any).__scrollWrap(y), Math.max(0, start.top - 40));
    await page.waitForTimeout(1200);
    expect(await sample(), `the ${mode} canvas did not resume after scrolling back`)
      .toBeGreaterThan(30);
  });
}
