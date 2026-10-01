import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Titration Lab — the safety-drill countdown must not outlive the tool.
 *
 * The drill runs a window-level setInterval that is started and stopped from inside
 * render(). While the walkthrough keeps rendering that is fine. The moment it stops —
 * the student picks a different tool, or finishes the walkthrough — the stop branch
 * never runs again, and the interval keeps calling upd() five times a second for the
 * rest of the session, re-rendering the host over a tool nobody is looking at.
 *
 * This can only be tested in a real browser. The jsdom suites render through
 * renderToStaticMarkup, which never invokes a ref, so the teardown they would be
 * exercising does not exist there. It also cannot be caught by the render-smoke gate,
 * which renders once and never unmounts.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_titration.js',
  toolId: 'titrationLab',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 900,
  height: 900,
  probes: `
    window.__timer = function () { return window._titrationDrillTimer || null; };
    // Count how often the tool writes state, so a leaked interval is visible as
    // writes continuing after the tool is gone rather than merely as a live handle.
    window.__writes = 0;
    window.__watchWrites = function () {
      var inner = window.__ctx.update;
      window.__ctx.update = function () { window.__writes++; return inner.apply(this, arguments); };
    };
  `,
});

test.describe.configure({ timeout: 150_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

// The walkthrough gate has no 3D surface, so the canvas wait has to be switched off —
// mount({ expectCanvas: false }) exists for exactly this.
async function mountGate(page: any, extra: Record<string, unknown> = {}) {
  await harness.mount(page, {
    titrationLab: Object.assign({
      safetyChecked: false, safetyStation: 3,
      drillActive: true, drillStartTime: Date.now(), drillAnswer: null, drillResult: null,
    }, extra),
  }, undefined, { expectCanvas: false });
  await page.evaluate(() => (window as any).__watchWrites());
}

test.describe('safety drill countdown lifecycle', () => {
  test('a running drill holds exactly one interval', async ({ page }) => {
    await mountGate(page);
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => (window as any).__timer()),
      'the countdown never started').not.toBeNull();

    // It must not stack a new interval on every tick.
    const before = await page.evaluate(() => (window as any).__timer());
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => (window as any).__timer());
    expect(after, 'the interval id changed — a second timer was started').toBe(before);
  });

  // THE regression this spec exists for.
  test('unmounting the tool stops the countdown', async ({ page }) => {
    await mountGate(page);
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => (window as any).__timer())).not.toBeNull();

    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(300);

    expect(await page.evaluate(() => (window as any).__timer()),
      'the countdown survived unmount — it will keep firing for the rest of the session').toBeNull();

    // And prove it by watching for further writes.
    const settled = await page.evaluate(() => (window as any).__writes);
    await page.waitForTimeout(1200);
    const later = await page.evaluate(() => (window as any).__writes);
    expect(later, `${later - settled} state writes after unmount`).toBe(settled);
  });

  test('finishing the walkthrough also stops it', async ({ page }) => {
    await mountGate(page);
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => (window as any).__timer())).not.toBeNull();

    // Completing the gate swaps the whole subtree for the lab, which is an unmount.
    await page.evaluate(() => (window as any).__ctx.update('titrationLab', 'safetyChecked', true));
    await page.waitForTimeout(600);

    expect(await page.evaluate(() => (window as any).__timer()),
      'the countdown kept running after the student entered the lab').toBeNull();
  });
});

/**
 * The animated titration-curve canvas must survive a re-render.
 *
 * It was declared as an inline `ref: function (cvEl) {...}`, i.e. a new function
 * identity on every render, so React tore the animation down and set it up again on
 * every state change — resetting its clock and snapping the curve back to frame one
 * each time the volume slider moved, and rebuilding the canvas backing store, the
 * ResizeObserver and the visibilitychange listener along with it.
 *
 * Counted rather than eyeballed: the ref publishes its teardown on
 * window.__alloTitrationAnimCleanup, so assignments to that property count setups.
 */
test.describe('animated curve canvas lifecycle', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('re-rendering does not restart the animation', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__animSetups = 0;
      let v: any = null;
      Object.defineProperty(window, '__alloTitrationAnimCleanup', {
        get() { return v; },
        set(x) { if (x) (window as any).__animSetups++; v = x; },
        configurable: true,
      });
    });
    await harness.mount(page,
      { titrationLab: { safetyChecked: true, labTab: 'titrate', presetId: 'sa_sb', volumeAdded: 5 } },
      undefined, { expectCanvas: false });
    await page.waitForTimeout(900);
    const atMount = await page.evaluate(() => (window as any).__animSetups);
    expect(atMount, 'the animation never started').toBeGreaterThan(0);

    // Ten ordinary state changes — exactly what dragging the volume slider produces.
    for (let i = 0; i < 10; i++) {
      await page.evaluate((v) => (window as any).__ctx.update('titrationLab', 'volumeAdded', v), 6 + i);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => (window as any).__animSetups);

    expect(after - atMount,
      `the animation restarted ${after - atMount} times across 10 re-renders — the ref is not stable`)
      .toBe(0);
  });

  test('leaving the tool still tears the animation down', async ({ page }) => {
    await harness.mount(page,
      { titrationLab: { safetyChecked: true, labTab: 'titrate', presetId: 'sa_sb', volumeAdded: 5 } },
      undefined, { expectCanvas: false });
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => !!(window as any).__alloTitrationAnimCleanup)).toBe(true);

    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__alloTitrationAnimCleanup),
      'the animation kept running after the tool was unmounted').toBeNull();
  });
});
