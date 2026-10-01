import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Migration — do the 2D canvas controls actually reach the canvas?
 *
 * Every canvas in this tool is created by a ref callback guarded by a
 * `canvas._xxInit` flag. React hands the SAME <canvas> element back on every
 * render, the guard bails, and so `frame()` — plus any listener registered
 * beside it — keeps the FIRST render's closure for the life of the canvas.
 * Anything those callbacks read from render scope is therefore pinned to mount
 * time. The tool already carries a `_liveVals` ref for exactly this reason;
 * the bugs are the places that forgot to use it.
 *
 * This is the READ side of the class recorded against Moon Mission, where the
 * same frozen closure corrupted WRITES (each append rebuilt from a stale
 * snapshot). Reads fail more quietly: state updates, the React panels around
 * the canvas update, and only the picture is wrong — so it looks like a
 * rendering nicety rather than a dead control.
 *
 * Three shipped bugs this pins, all found by driving the real controls:
 *   1. Wind — arming "Mountain" and clicking the field placed NOTHING. The
 *      click listener closed over `placingObj` from the first render (null),
 *      so the tab's whole point was unreachable.
 *   2. Wind — the Lines/Dots toggle flipped state and left the canvas alone.
 *   3. Routes — picking a species set `selectedSpecies` and left consecutive
 *      canvas frames byte-identical: the bird never flew its route.
 *
 * jsdom cannot catch any of this (no canvas, no rAF) and a screenshot test
 * cannot either, because mounting WITH the state already set renders correctly.
 * The failure only appears when the control is operated after mount.
 *
 * PREMISE GUARDED. Run against the commit that shipped these bugs
 * (`MIG_TOOL_FILE=<old copy> npx playwright test ...`) this suite reports 3
 * failed / 1 passed: the three above fail, and the fourth — the coefficient
 * plot — passes because that one was fixed a day earlier and is already in
 * that copy. Its own failing state was demonstrated separately against a
 * pre-fix build. Every test here has been seen to fail where its bug lives.
 */

test.describe.configure({ timeout: 150_000 });

// MIG_TOOL_FILE lets this suite be pointed at an older copy of the tool to
// confirm it still FAILS there. A regression test that has never been seen to
// fail is not a regression test.
const TOOL_FILE = process.env.MIG_TOOL_FILE || 'stem_lab/stem_tool_migration.js';

const harness = new GlHarness({
  toolFile: TOOL_FILE,
  toolId: 'migration',
  width: 1100,
  height: 900,
  probes: `
// Perceptual-ish signature of the whole surface: two calls that differ prove the
// canvas repainted, two that match prove it did not.
window.__mgHash = function () {
  var cv = document.querySelector('#wrap canvas');
  if (!cv) return null;
  var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  var s = 0;
  for (var i = 0; i < d.length; i += 16) s = (s * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 2147483647;
  return s;
};
// Local edge energy. "Differs from a corner sample" saturates near 77% on this
// tab because the sky is a gradient, and cannot see stroke length at all;
// particle tails against a smooth gradient are the only sharp edges here, so
// longer tails raise this.
window.__mgEdges = function () {
  var cv = document.querySelector('#wrap canvas');
  var w = cv.width, h = cv.height;
  var d = cv.getContext('2d').getImageData(0, 0, w, h).data;
  var edges = 0, tot = 0;
  for (var y = 0; y < h; y += 3) {
    for (var x = 0; x < w - 4; x += 3) {
      var i = (y * w + x) * 4, j = (y * w + x + 4) * 4;
      tot++;
      if (Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]) > 24) edges++;
    }
  }
  return Math.round((edges / tot) * 10000) / 100;
};
// Signature of the right-hand coefficient plot only. The airfoil half is known
// to be live, so hashing the whole surface would prove nothing about the graph.
window.__mgPlotHash = function () {
  var cv = document.querySelector('#wrap canvas');
  var x = Math.round(cv.width * 0.70);
  var d = cv.getContext('2d').getImageData(x, 0, Math.round(cv.width * 0.25), cv.height).data;
  var s = 0;
  for (var i = 0; i < d.length; i += 4) s = (s * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 2147483647;
  return s;
};
window.__mgClick = function (needle) {
  var els = document.querySelectorAll('#wrap button');
  for (var i = 0; i < els.length; i++) {
    if ((els[i].textContent || '').indexOf(needle) >= 0) { els[i].click(); return true; }
  }
  return false;
};
window.__mgSetRange = function (max, v) {
  var els = document.querySelectorAll('#wrap input[type=range]');
  for (var i = 0; i < els.length; i++) {
    if (els[i].max === String(max)) {
      var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(els[i], String(v));
      els[i].dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
  }
  return false;
};
window.__mgCanvasBox = function () {
  var r = document.querySelector('#wrap canvas').getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
};
`,
});

// These tabs are 2D, so the harness must not wait for a WebGL context.
const MOUNT = { expectCanvas: false } as const;

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('wind: arming a feature and clicking the field places it', async ({ page }) => {
  await harness.mount(page, { migration: { tab: 'wind' } }, undefined, MOUNT);
  await page.waitForTimeout(1200);

  const armed = await page.evaluate(() => (window as any).__mgClick('Mountain'));
  expect(armed, 'no Mountain button found').toBe(true);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__toolData.migration.placingObj)).toBe('mountain');

  const box = await page.evaluate(() => (window as any).__mgCanvasBox());
  await page.mouse.click(box.x + box.w * 0.4, box.y + box.h * 0.4);
  await page.waitForTimeout(600);

  const objects = await page.evaluate(() => (window as any).__toolData.migration.windObjects || []);
  expect(objects.length, 'clicking the wind field placed nothing').toBeGreaterThan(0);
  expect(objects[0].type).toBe('mountain');
});

test('wind: the Lines/Dots toggle changes what is drawn', async ({ page }) => {
  await harness.mount(page, {
    migration: { tab: 'wind', windObjects: [{ type: 'mountain', x: 200, y: 240 }] },
  }, undefined, MOUNT);
  await page.waitForTimeout(1800);

  const dots = await page.evaluate(() => (window as any).__mgEdges());
  // The button is labelled for the mode it switches TO: it reads "Dots" while
  // streamlines are off. Searching for "Lines" here matches nothing, clicks no
  // button, and reads exactly like a dead toggle.
  expect(await page.evaluate(() => (window as any).__mgClick('Dots'))).toBe(true);
  await page.waitForTimeout(1800);

  expect(await page.evaluate(() => (window as any).__toolData.migration.showStreamlines)).toBeTruthy();
  const lines = await page.evaluate(() => (window as any).__mgEdges());
  expect(Math.abs(lines - dots), `toggle did not reach the canvas (dots ${dots}% vs lines ${lines}%)`)
    .toBeGreaterThan(0.35);
});

test('routes: picking a species animates its route', async ({ page }) => {
  await harness.mount(page, { migration: { tab: 'routes' } }, undefined, MOUNT);
  await page.waitForTimeout(1400);

  expect(await page.evaluate(() => (window as any).__mgClick('Snow Goose'))).toBe(true);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as any).__toolData.migration.selectedSpecies)).toBe('snow_goose');

  // With no species the map is deliberately painted once and then idles, so a
  // frozen selection shows up as two identical frames.
  const a = await page.evaluate(() => (window as any).__mgHash());
  await page.waitForTimeout(1000);
  const b = await page.evaluate(() => (window as any).__mgHash());
  expect(b, 'map never repainted after a species was selected').not.toBe(a);
});

test('aerodynamics: the coefficient plot follows the angle-of-attack slider', async ({ page }) => {
  await harness.mount(page, {
    migration: { tab: 'aero', aoa: 4, selectedWing: 'soaring' },
  }, undefined, MOUNT);
  await page.waitForTimeout(1400);

  const before = await page.evaluate(() => (window as any).__mgPlotHash());
  // 4 -> 12 degrees, both below the soaring wing's 16 degree stall: past it the
  // pulsing full-canvas stall overlay repaints the plot region on its own and a
  // frozen graph passes anyway.
  expect(await page.evaluate(() => (window as any).__mgSetRange(20, 12))).toBe(true);
  await page.waitForTimeout(1400);

  const after = await page.evaluate(() => (window as any).__mgPlotHash());
  expect(after, 'plot region is pinned to the angle it mounted with').not.toBe(before);
});
