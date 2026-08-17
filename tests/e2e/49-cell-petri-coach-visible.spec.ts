import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Cell petri dish — the first-run coach mark must be where a student can read it.
 *
 * WHY THIS EXISTS
 * The canvas draws "👆 Click any organism to explore its anatomy" as a fading coach
 * mark for its first ~8 seconds. It was drawn at y=14px, inside the DOM header strip
 * that sits at `top-3` and is ~60px tall — so it was occluded for its entire life. The
 * student never read it, and because that header carries `backdrop-filter: blur(8px)`,
 * the hidden pill was smeared into a grey blob that appeared in every screenshot of the
 * tool's default view.
 *
 * What makes "is it hidden?" measurable is that the canvas BITMAP can be read directly,
 * with getImageData, while the header is a separate DOM element painted over it. So the
 * pill's position in the bitmap can be compared against the header's real height from
 * the DOM. (An element screenshot would NOT work here: Playwright captures the page
 * region an element occupies, overlapping siblings included, so the header would be in
 * the image.)
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cell.js',
  toolId: 'cell',
  width: 1200,
  height: 900,
  appStyles: true,
  probes: `
    window.__headerBox = function () {
      var stage = document.querySelector('[data-cell-stage]');
      var header = stage && stage.querySelector('.z-20');
      var canvas = document.querySelector('[data-cell-sim-canvas]');
      if (!stage || !header || !canvas) return null;
      var h = header.getBoundingClientRect(), c = canvas.getBoundingClientRect();
      return {
        // Header bottom, in CSS pixels measured from the top of the CANVAS.
        bottomFromCanvasTop: Math.round(h.bottom - c.top),
        canvasCssHeight: Math.round(c.height),
        backdrop: getComputedStyle(header).backdropFilter,
      };
    };
    // The pill is the only WIDE dark mark on a pale mint dish. Scanned in-page via
    // getImageData rather than by decoding a screenshot: this is a 2-D context, so the
    // pixels are readable directly and the test needs no image library.
    //
    // Threshold measured, not guessed: the pill fill is rgba(15,23,42,0.92) drawn at
    // globalAlpha 0.85, which composites over the dish to about (53,71,80). A tighter
    // cutoff found nothing at all. The RUN LENGTH is what separates it from organisms —
    // the darkest outlines and the plant vacuole are tens of pixels wide, never 8% of
    // the canvas.
    window.__firstDarkRowCss = function () {
      var c = document.querySelector('[data-cell-sim-canvas]');
      if (!c) return null;
      var ctx = c.getContext('2d');
      if (!ctx) return null;
      var scale = c.height / c.getBoundingClientRect().height;
      var from = Math.floor(c.width * 0.3), to = Math.floor(c.width * 0.7);
      var need = c.width * 0.08;
      for (var y = 0; y < c.height; y++) {
        var row = ctx.getImageData(from, y, to - from, 1).data;
        var run = 0;
        for (var i = 0; i < row.length; i += 4) {
          var dark = row[i] < 120 && row[i + 1] < 150 && row[i + 2] < 170;
          run = dark ? run + 1 : 0;
          if (run > need) return y / scale;
        }
      }
      return -1;
    };
  `,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 200_000 });

test('the coach mark is drawn clear of the header that overlays the canvas', async ({ page }) => {
  await harness.mount(page, { cell: {} }, undefined, { expectCanvas: false });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { document.querySelector('[data-cell-stage]')!.scrollIntoView({ block: 'start' }); });
  await page.waitForTimeout(400);

  const header = await page.evaluate(() => (window as any).__headerBox());
  expect(header, 'the stage header was not found').not.toBeNull();
  expect(header.backdrop,
    'the header no longer blurs its backdrop — if that changed deliberately this spec '
    + 'still holds, but the smear it was written for is gone').toContain('blur');

  const pillTopCss: number = await page.evaluate(() => (window as any).__firstDarkRowCss());

  expect(pillTopCss,
    'no dark pill found on the canvas — the coach mark may have been removed, in which '
    + 'case delete this spec rather than loosening it').toBeGreaterThan(-1);

  expect(pillTopCss,
    `the coach mark starts ${Math.round(pillTopCss)}px down the canvas but the header `
    + `covers the first ${header.bottomFromCanvasTop}px — it is hidden behind the header, `
    + 'and the header\'s backdrop blur turns it into a grey smear')
    .toBeGreaterThanOrEqual(header.bottomFromCanvasTop);
});
