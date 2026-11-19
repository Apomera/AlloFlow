import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * SkySchool (flightSim) paints its 3D world on an aria-hidden WebGL layer under the
 * keyboard flight display (the role="application" canvas that carries every flight key).
 * It already had a fallback: failThree() switches to Canvas "simplified graphics" and a
 * role="status" banner with "Try 3D again", which remounts a fresh WebGL canvas. The frame
 * loop polled isContextLost, but nothing listened for `webglcontextlost`, so the loss was
 * never preventDefault-ed and a paused flight did not notice it.
 *
 * Now the event routes into failThree, the banner says "3D view paused", and Try 3D again
 * builds a NEW live context and returns focus to the flight display.
 *
 * The flight loop only starts from a real launch (flyingRef), so the spec presses Free
 * Flight in the menu, the way a student does.
 */
// layout 'document': the menu root is `container-type: inline-size`, whose intrinsic
// width is ZERO, so as an item of the harness's default flex-row #wrap it collapsed to
// 0px and #wrap itself took every click (harness trap; the app shell is block flow).
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_flightsim.js',
  toolId: 'flightSim',
  layout: 'document',
  width: 1280,
  height: 900,
  // The harness's setToolData copies the updater's result with Object.keys, which DROPS
  // Symbol keys. SkySchool stamps each route write with a Symbol proof (routeCommitKey)
  // and only launches once it reads that proof back, so under the stock harness the
  // departure never committed, flyingRef stayed false, and the checkpoint recovery
  // turned the new flight into an "interrupted" debrief at once. The app's host setter
  // is React state, which keeps the returned object whole. Same channel, own keys kept.
  probes: `
    var mountFlight = window.__mount;
    window.__mount = function (toolData) {
      var mounted = mountFlight(toolData);
      var data = window.__toolData;
      var apply = function (fnOrVal) {
        var next = typeof fnOrVal === 'function' ? fnOrVal(data) : fnOrVal;
        if (next && next !== data) Reflect.ownKeys(next).forEach(function (k) { data[k] = next[k]; });
        window.__rerender();
      };
      window.__ctx.setToolData = apply;
      window.__ctx.setLabToolData = apply;
      return mounted;
    };
  `
});

test.describe.configure({ timeout: 180000, retries: 0 });

const GL_LAYER = '#skyschool-flight-container canvas[aria-hidden="true"]';
const FLIGHT_DISPLAY = '#skyschool-flight-container canvas[role="application"]';

/** The WebGL layer's recorded context, read from the harness recorder (never creates one). */
async function glLayer(page: Page) {
  return page.evaluate((sel) => {
    const cv = document.querySelector(sel) as HTMLCanvasElement | null;
    const rec = cv && (window as any).__glRecord(cv);
    return rec ? { id: rec.id, live: !rec.ctx.isContextLost(), draws: rec.draws, byPage: rec.createdBy === 'page' } : null;
  }, GL_LAYER);
}

async function launch(page: Page) {
  await harness.mount(page, { flightSim: { view: 'menu' } }, undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Free Flight from Portland, ME', exact: true }).first().click();
  await expect(page.locator(FLIGHT_DISPLAY)).toBeVisible({ timeout: 30000 });
  await expect.poll(async () => {
    const c = await glLayer(page);
    return !!c && c.live && c.byPage && c.draws > 0;
  }, { timeout: 40000, message: 'the flight never drew on a LIVE WebGL context, so this proves nothing' }).toBe(true);
}

test.describe('SkySchool — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('a lost 3D layer says so, flying continues, and Try 3D again rebuilds a live context', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await launch(page);

    const before = await glLayer(page);
    await expect(page.locator('[data-flight-simple-graphics]')).toHaveCount(0);

    const killed = await page.evaluate((sel) => {
      const cv = document.querySelector(sel) as HTMLCanvasElement;
      const ext = (window as any).__glRecord(cv).ctx.getExtension('WEBGL_lose_context');
      if (!ext) return false;
      ext.loseContext();
      return true;
    }, GL_LAYER);
    expect(killed, 'could not force a context loss').toBe(true);

    const banner = page.locator('[data-flight-simple-graphics]');
    await expect(banner).toBeVisible({ timeout: 15000 });
    await expect(banner).toContainText(/3D view paused/i);
    await expect(banner.locator('[data-flight-webgl-lost]')).toHaveCount(1);
    const retry = page.locator('[data-flight-retry-3d]');
    await expect(retry).toBeVisible();

    await retry.click();
    await expect(banner).toHaveCount(0, { timeout: 15000 });
    await expect.poll(async () => {
      const c = await glLayer(page);
      return !!c && c.id !== before!.id && c.live && c.draws > 0;
    }, { timeout: 40000, message: 'Try 3D again did not build a NEW live context' }).toBe(true);

    // The flight display carries every flight key; after the retry it must hold focus.
    const display = page.locator(FLIGHT_DISPLAY);
    await expect(display, 'focus did not return to the flight display').toBeFocused();
    const focus = await display.evaluate((cv: HTMLCanvasElement) => { cv.blur(); cv.focus(); return { focused: document.activeElement === cv, tabIndex: cv.tabIndex }; });
    expect(focus.focused && focus.tabIndex === 0, 'the flight display cannot take focus').toBe(true);

    expect(errors.filter((m) => !/ResizeObserver loop/i.test(m)), 'page errors').toEqual([]);
  });

  test('ending the flight and flying again disposes the 3D layer without raising the banner', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await launch(page);
    const first = await glLayer(page);

    // End the flight the way a student does (Escape on the flight display). Leaving the
    // flying view runs the loop effect's cleanup (disposeThree), and StemLab.releaseGl then
    // force-loses the removed canvas a tick later. That is our teardown, not a loss.
    await page.locator(FLIGHT_DISPLAY).focus();
    await page.keyboard.press('Escape');
    await expect(page.locator(GL_LAYER)).toHaveCount(0, { timeout: 15000 });
    await page.waitForTimeout(800);

    // The debrief's Fly Again begins a fresh free flight, with a fresh WebGL layer.
    await page.getByRole('button', { name: /Fly Again/ }).first().click();
    await expect.poll(async () => {
      const c = await glLayer(page);
      return !!c && c.id !== first!.id && c.live && c.draws > 0;
    }, { timeout: 40000, message: 'the second flight did not come back in 3D' }).toBe(true);
    await expect(page.locator('[data-flight-simple-graphics]'), 'our own teardown raised the lost banner').toHaveCount(0);

    expect(errors.filter((m) => !/ResizeObserver loop/i.test(m)), 'page errors').toEqual([]);
  });
});
