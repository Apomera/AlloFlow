import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Auto Repair Shop — under-hood tour, Repair Bay, tyre change. REAL WebGL smoke.
 *
 * The jsdom suites (autorepair_underhood_3d, autorepair_repair_bay,
 * autorepair_tyre_change) prove the content and the 2D fallbacks: every part,
 * case, step and hazard is a real button and survives a dead canvas. None of it
 * can see the 3D at all — renderToStaticMarkup never invokes a ref, so the
 * viewer's attach, its raycaster, its teardown and its rebuild paths are
 * completely invisible to those tests.
 *
 * This loads the REAL host module (stem_lab_module.js) rather than the
 * harness's stub registry, because the shared viewer shell now lives there as
 * window.StemLab.makeBayViewer. That matters more than convenience: when the
 * shell was moved out of the tool it left three references to a variable that
 * only existed in the tool's old closure, and EVERY repo gate passed — the
 * free-variable checker covers four *_source.jsx files and neither the host nor
 * any stem_tool_*.js. A browser was the only thing that caught it. Test 1 below
 * is the permanent guard for that class of bug.
 *
 * What this pins:
 *   1. The shell comes from the host and both scenes build a live GL context.
 *   2. Clicking the bay raycasts against real geometry and selects a part.
 *   3. A drag is not misread as a pick (rotating must not select).
 *   4. Leaving a module releases the context; re-entering rebuilds exactly one.
 *   5. Switching between the two viewer instances leaves exactly one canvas.
 *   6. The tyre scene actually changes as the procedure advances — the car has
 *      to visibly lift, which is the entire reason that module is 3D.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_autorepair.js',
  toolId: 'autoRepair',
  // The real host owns the shared viewer shell. It must load BEFORE the
  // harness's fallback registry, because the host installs its own behind
  // `if (!window.StemLab)` and skips entirely if a stub already exists.
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 900,
  height: 640,
  probes: `
    window.__hostShell = function () {
      return !!(window.StemLab && typeof window.StemLab.makeBayViewer === 'function');
    };
    // Sweep the canvas for a pick. Geometry positions are an implementation
    // detail, so hunt rather than hard-code a hit point that would rot.
    window.__sweepPick = function (readKey) {
      var el = document.querySelector('#wrap canvas');
      if (!el) return Promise.resolve(null);
      var r = el.getBoundingClientRect();
      var pts = [];
      for (var x = 0.15; x <= 0.85; x += 0.05) {
        for (var y = 0.2; y <= 0.85; y += 0.05) pts.push([x, y]);
      }
      var i = 0;
      return new Promise(function (done) {
        function step() {
          if (i >= pts.length) return done(null);
          var p = pts[i++];
          var cx = r.left + r.width * p[0], cy = r.top + r.height * p[1];
          el.dispatchEvent(new PointerEvent('pointerdown', { clientX: cx, clientY: cy, bubbles: true, pointerId: 7 }));
          el.dispatchEvent(new PointerEvent('pointerup',   { clientX: cx, clientY: cy, bubbles: true, pointerId: 7 }));
          setTimeout(function () {
            var v = (window.__toolData.autoRepair || {})[readKey];
            if (v) return done(v);
            step();
          }, 18);
        }
        step();
      });
    };
    window.__drag = function () {
      var el = document.querySelector('#wrap canvas');
      var r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 180, clientY: r.top + 150, bubbles: true, pointerId: 8 }));
      el.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + 320, clientY: r.top + 150, bubbles: true, pointerId: 8 }));
      el.dispatchEvent(new PointerEvent('pointerup',   { clientX: r.left + 320, clientY: r.top + 150, bubbles: true, pointerId: 8 }));
    };
    window.__canvasCount = function () { return document.querySelectorAll('#wrap canvas').length; };
  `,
});

// SwiftShader readback is slow and these specs take several screenshots.
test.describe.configure({ timeout: 150_000 });

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

test.describe('Auto Repair Shop — 3D modules on real WebGL', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('the viewer shell comes from the host and the bay builds a live context', async ({ page }) => {
    await harness.mount(page, { autoRepair: { view: 'underhood' } });

    // The regression guard for the free-variable class described above: if the
    // shell throws while building, no canvas ever appears and this fails.
    expect(await page.evaluate(() => (window as any).__hostShell())).toBe(true);

    const live = await page.evaluate(() => (window as any).__glLive());
    expect(live, 'no GL canvas in the under-hood tour').not.toBeNull();
    expect(live.lost, 'GL context was lost').toBe(false);
    expect(live.box.w).toBeGreaterThan(100);
    expect(live.box.h).toBeGreaterThan(100);

    const errors = await page.evaluate(() => (window as any).__events.errors);
    expect(errors, 'errors while building the bay').toEqual([]);
  });

  test('clicking the bay picks a real part, and dragging does not', async ({ page }) => {
    await harness.mount(page, { autoRepair: { view: 'underhood' } });

    // Rotating must never be read as a selection.
    await page.evaluate(() => (window as any).__drag());
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).__toolData.autoRepair.uhSel ?? null),
      'a drag was misread as a part pick').toBeNull();

    const hit = await page.evaluate(() => (window as any).__sweepPick('uhSel'));
    expect(hit, 'clicking the bay never selected a part — raycaster not wired to geometry').toBeTruthy();
  });

  test('leaving a module releases the context and re-entering rebuilds exactly one', async ({ page }) => {
    await harness.mount(page, { autoRepair: { view: 'underhood' } });
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);

    await page.evaluate(() => (window as any).__ctx.update('autoRepair', 'view', 'menu'));
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => (window as any).__canvasCount()),
      'canvas leaked after navigating away').toBe(0);

    await page.evaluate(() => (window as any).__ctx.update('autoRepair', 'view', 'underhood'));
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => (window as any).__canvasCount()),
      're-entry did not rebuild exactly one scene').toBe(1);
    expect(await page.evaluate(() => (window as any).__glLive()?.lost)).toBe(false);
  });

  test('switching between the two viewer instances leaves exactly one canvas', async ({ page }) => {
    // UH3D and TIRE3D are separate instances of the same shell. Only one module
    // mounts at a time, so they must never both hold a context.
    await harness.mount(page, { autoRepair: { view: 'underhood' } });
    await page.evaluate(() => (window as any).__ctx.update('autoRepair', 'view', 'tyre'));
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);

    await page.evaluate(() => (window as any).__ctx.update('autoRepair', 'view', 'underhood'));
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);

    const errors = await page.evaluate(() => (window as any).__events.errors);
    expect(errors, 'errors while swapping viewers').toEqual([]);
  });

  test('the tyre scene changes as the procedure advances', async ({ page }) => {
    // Geometry is baked at build time, so an advancing procedure has to trigger
    // a rebuild or the car never lifts — which is the whole point of the module.
    await harness.mount(page, { autoRepair: { view: 'tyre', tcDone: [] } });
    const before = await page.locator('#wrap canvas').screenshot();

    await page.evaluate(() => (window as any).__ctx.update(
      'autoRepair', 'tcDone', ['safe', 'brake', 'chock', 'tools', 'loosen', 'place', 'raise']));
    await page.waitForTimeout(1200);
    const after = await page.locator('#wrap canvas').screenshot();

    expect(Buffer.compare(before, after),
      'the car did not visibly change after being jacked up').not.toBe(0);
  });

  test('the Repair Bay marks inspected parts in the scene', async ({ page }) => {
    await harness.mount(page, { autoRepair: { view: 'repairbay', rbCase: 'charging' } });
    const clean = await page.locator('#wrap canvas').screenshot();

    await page.evaluate(() => (window as any).__ctx.update(
      'autoRepair', 'rbFound', { 'p:battery': true, 'p:belt': true }));
    await page.waitForTimeout(900);
    const marked = await page.locator('#wrap canvas').screenshot();

    expect(Buffer.compare(clean, marked),
      'inspected parts are not visibly marked in the 3D bay').not.toBe(0);
  });

  test('a running engine visibly animates the mechanical scene', async ({ page }) => {
    await harness.mount(page, {
      autoRepair: { view: 'repairbay', rbCase: 'charging', rbEngine: 'running' }
    });
    const canvas = page.locator('#wrap canvas');
    const before = await canvas.screenshot();
    await page.waitForTimeout(420);
    const after = await canvas.screenshot();

    expect(Buffer.compare(before, after),
      'running the engine did not animate the fan, belt or pulleys').not.toBe(0);
  });

  test('reduced motion freezes engine animation without removing the scene', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await harness.mount(page, {
      autoRepair: { view: 'repairbay', rbCase: 'charging', rbEngine: 'running' }
    });
    const canvas = page.locator('#wrap canvas');
    const before = await canvas.screenshot();
    await page.waitForTimeout(420);
    const after = await canvas.screenshot();

    expect(Buffer.compare(before, after),
      'reduced-motion mode still animated the engine scene').toBe(0);
    expect(await page.evaluate(() => (window as any).__glLive()?.lost)).toBe(false);
  });
});
