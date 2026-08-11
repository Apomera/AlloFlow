import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Beehive — the 3D hive bay (Beekeeper) and the 3D forage map (Queen RTS).
 *
 * The jsdom suites prove the surrounding copy, the parts list and the
 * fallbacks, but renderToStaticMarkup never invokes a ref, so the viewer's
 * attach, its raycaster and its live data binding are completely invisible to
 * them. Everything below needs a real GL context.
 *
 * The host module is loaded as a preScript because the shared viewer shell
 * lives there as window.StemLab.makeBayViewer; without it the tool falls back
 * to the "needs a newer host" copy and no canvas is ever built.
 *
 * What this pins:
 *   1. Both bays build a live context off the host shell.
 *   2. Clicking a bay raycasts real geometry and selects a part (the shell's
 *      raycast is NON-recursive, so a scene that registers Groups instead of
 *      meshes builds fine and silently never picks — the failure this catches).
 *   3. Opening the hive actually moves geometry, so "Open hive" is a real
 *      exploded view rather than a label.
 *   4. Live colony data reaches the scene: a full super and an empty one must
 *      not rasterise identically.
 */


// Pixel diffs go through page.screenshot({ clip }) rather than an element
// screenshot. Playwright's element path waits for the element to be "stable",
// and these bays render a live WebGL animation every frame, so that wait can
// burn the whole timeout for no benefit — the clip path has no such wait.
// Scrolling first is not cosmetic. The viewer shell pauses its render loop
// through an IntersectionObserver when the bay is off-screen, so a bay that was
// never scrolled to is a FROZEN scene — before/after shots would match and the
// test would fail for a reason that has nothing to do with the code under test.
// (An element screenshot scrolls implicitly, which is why the clip rewrite that
// dropped the scroll broke three tests at once.) The clip is then taken against
// the full-page image so a bay below the fold still resolves.
async function shotBay(page: any, selector: string, path?: string): Promise<Buffer> {
  const canvas = page.locator(selector + ' canvas');
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas to screenshot for ' + selector);
  const opts: Record<string, unknown> = { clip: box, fullPage: true, timeout: 60_000 };
  if (path) opts.path = path;
  return page.screenshot(opts);
}

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js',
  toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 980,
  height: 760,
  probes: `
    window.__hostShell = function () {
      return !!(window.StemLab && typeof window.StemLab.makeBayViewer === 'function');
    };
    window.__bayCanvas = function () { return document.querySelector('[data-beehive-3d-bay] canvas'); };
    // Hunt for a pick rather than hard-coding a hit point: geometry positions
    // are an implementation detail and a pinned coordinate would rot.
    window.__sweepPick = function (readKey) {
      var el = window.__bayCanvas();
      if (!el) return Promise.resolve(null);
      var r = el.getBoundingClientRect();
      var pts = [];
      for (var x = 0.2; x <= 0.8; x += 0.05) {
        for (var y = 0.2; y <= 0.8; y += 0.05) pts.push([x, y]);
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
            var v = (window.__toolData.beehive || {})[readKey];
            if (v) return done(v);
            step();
          }, 18);
        }
        step();
      });
    };
    window.__bayCanvasCount = function () { return document.querySelectorAll('[data-beehive-3d-bay] canvas').length; };
  `,
});

// SwiftShader readback is slow and these tests take several screenshots.
test.describe.configure({ timeout: 180_000 });

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

const STRONG_COLONY = {
  viewMode: 'beekeeper',
  day: 45, workers: 42000, brood: 11000, honey: 58, varroaLevel: 22,
  show3dHive: true
};

test.describe('Beehive 3D hive bay', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('builds a live context off the host shell and renders the hive', async ({ page }, testInfo) => {
    await harness.mount(page, { beehive: STRONG_COLONY });

    expect(await page.evaluate(() => (window as any).__hostShell())).toBe(true);
    // Poll rather than sample once: the shell tears the scene down and rebuilds
    // it when the theme baked at build time does not match the theme the React
    // effect syncs a moment later, so a single read can land mid-swap on 0 or 2.
    await page.waitForFunction(() => (window as any).__bayCanvasCount() === 1, null, { timeout: 20_000 });

    const live = await page.evaluate(() => (window as any).__glLive('[data-beehive-3d-bay]'));
    expect(live, 'no GL canvas in the hive bay').not.toBeNull();
    expect(live.lost, 'GL context was lost').toBe(false);
    expect(live.box.w).toBeGreaterThan(200);
    expect(live.box.h).toBeGreaterThan(150);

    await shotBay(page, '[data-beehive-3d-bay="hive"]', testInfo.outputPath('beehive-hive-3d.png'));

    const errors = await page.evaluate(() => (window as any).__events.errors);
    expect(errors, 'errors while building the hive bay').toEqual([]);
  });

  test('clicking the bay picks a real hive part', async ({ page }) => {
    await harness.mount(page, { beehive: STRONG_COLONY });
    const hit = await page.evaluate(() => (window as any).__sweepPick('hive3dPart'));
    expect(hit, 'clicking the hive never selected a part — raycaster not wired to geometry').toBeTruthy();
  });

  test('opening the hive moves the boxes apart', async ({ page }, testInfo) => {
    await harness.mount(page, { beehive: STRONG_COLONY });
    const closed = await shotBay(page, '[data-beehive-3d-bay="hive"]');

    await page.getByRole('button', { name: /Open hive: lift the boxes apart/i }).click();
    await page.waitForTimeout(1600);
    await shotBay(page, '[data-beehive-3d-bay="hive"]', testInfo.outputPath('beehive-hive-3d-exploded.png'));
    const opened = await shotBay(page, '[data-beehive-3d-bay="hive"]');

    expect(Buffer.compare(closed, opened), 'the exploded view did not change a single pixel').not.toBe(0);
  });

  test('finding the queen draws the front frame out of the box', async ({ page }, testInfo) => {
    await harness.mount(page, { beehive: STRONG_COLONY });
    const seated = await shotBay(page, '[data-beehive-3d-bay="hive"]');

    await page.getByRole('button', { name: /Find the queen/i }).click();
    await page.waitForTimeout(1800);
    await shotBay(page, '[data-beehive-3d-bay="hive"]', testInfo.outputPath('beehive-hive-3d-queen.png'));
    const pulled = await shotBay(page, '[data-beehive-3d-bay="hive"]');

    expect(await page.evaluate(() => (window as any).__toolData.beehive.hive3dPart)).toBe('queen');
    expect(Buffer.compare(seated, pulled), 'the frame never left the box').not.toBe(0);
  });

  // The headline teaching claim of the frame view: a failing queen leaves gaps.
  test('a failing queen repaints the comb with a spotty pattern', async ({ page }) => {
    await harness.mount(page, { beehive: Object.assign({}, STRONG_COLONY, { queenHealth: 100, hive3dPart: 'queen' }) });
    await page.waitForTimeout(1600);
    const solid = await shotBay(page, '[data-beehive-3d-bay="hive"]');

    await page.evaluate(() => (window as any).__ctx.updateMulti('beehive', { queenHealth: 30 }));
    await page.waitForTimeout(1600);
    const spotty = await shotBay(page, '[data-beehive-3d-bay="hive"]');

    expect(Buffer.compare(solid, spotty), 'queen health did not change the brood pattern').not.toBe(0);
  });

  // Adding a super is a real move in the simulation (it raises comb capacity
  // and lowers swarm pressure). If it does not change the hive on screen, the
  // 3D view is decoration rather than a model of this colony.
  test('adding supers grows the stack', async ({ page }, testInfo) => {
    await harness.mount(page, { beehive: Object.assign({}, STRONG_COLONY, { capacity: 80 }) });
    await page.waitForTimeout(1600);
    const oneSuper = await shotBay(page, '[data-beehive-3d-bay="hive"]');

    await page.evaluate(() => (window as any).__ctx.updateMulti('beehive', { capacity: 160 }));
    await page.waitForTimeout(2200);
    await shotBay(page, '[data-beehive-3d-bay="hive"]', testInfo.outputPath('beehive-hive-3d-three-supers.png'));
    const threeSupers = await shotBay(page, '[data-beehive-3d-bay="hive"]');

    expect(Buffer.compare(oneSuper, threeSupers), 'adding two supers did not change the hive').not.toBe(0);
  });

  test('the season changes the apiary, not just a label', async ({ page }, testInfo) => {
    // day 45 is summer, day 105 is winter on this simulation's 120-day cycle.
    await harness.mount(page, { beehive: Object.assign({}, STRONG_COLONY, { day: 45 }) });
    await page.waitForTimeout(1600);
    const summer = await shotBay(page, '[data-beehive-3d-bay="hive"]');

    await page.evaluate(() => (window as any).__ctx.updateMulti('beehive', { day: 105 }));
    await page.waitForTimeout(2200);
    await shotBay(page, '[data-beehive-3d-bay="hive"]', testInfo.outputPath('beehive-hive-3d-winter.png'));
    const winter = await shotBay(page, '[data-beehive-3d-bay="hive"]');

    expect(Buffer.compare(summer, winter), 'winter looked identical to summer').not.toBe(0);
    // Winter puts the colony in a cluster, so the "find the queen" affordance
    // has to go with it rather than pointing at a bee that is not on show.
    await expect(page.getByRole('button', { name: /Queen in cluster/i })).toBeDisabled();
  });

  test('colony state reaches the geometry — a full super differs from an empty one', async ({ page }) => {
    await harness.mount(page, { beehive: Object.assign({}, STRONG_COLONY, { honey: 0, brood: 0, varroaLevel: 0, workers: 0 }) });
    const empty = await shotBay(page, '[data-beehive-3d-bay="hive"]');

    await page.evaluate(() => (window as any).__ctx.updateMulti('beehive', { honey: 58, brood: 11000, varroaLevel: 40, workers: 42000 }));
    await page.waitForTimeout(1600);
    const full = await shotBay(page, '[data-beehive-3d-bay="hive"]');

    expect(Buffer.compare(empty, full), 'an empty hive and a full one rasterised identically — live data is not reaching the scene').not.toBe(0);
  });
});

test.describe('Beehive 3D forage map', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  const QUEEN_RUN = {
    viewMode: 'queen',
    show3dQueen: true,
    queen: { active: true, day: 6, hiveHealth: 88, territory: 62, paused: true }
  };

  test('builds a live context and renders the contested meadow', async ({ page }, testInfo) => {
    await harness.mount(page, { beehive: QUEEN_RUN }, undefined, { expectCanvas: false });
    await page.waitForSelector('[data-beehive-3d-bay="queen"] canvas', { timeout: 30_000 });
    await page.waitForTimeout(1200);

    const live = await page.evaluate(() => (window as any).__glLive('[data-beehive-3d-bay]'));
    expect(live, 'no GL canvas in the forage map').not.toBeNull();
    expect(live.lost, 'GL context was lost').toBe(false);

    await shotBay(page, '[data-beehive-3d-bay="queen"]', testInfo.outputPath('beehive-forage-3d.png'));

    const errors = await page.evaluate(() => (window as any).__events.errors);
    expect(errors, 'errors while building the forage map').toEqual([]);
  });

  test('the frontline moves the meadow, not just a number', async ({ page }) => {
    await harness.mount(page, { beehive: QUEEN_RUN }, undefined, { expectCanvas: false });
    await page.waitForSelector('[data-beehive-3d-bay="queen"] canvas', { timeout: 30_000 });
    await page.waitForTimeout(1200);
    const before = await shotBay(page, '[data-beehive-3d-bay="queen"]');

    await page.evaluate(() => {
      const d: any = (window as any).__toolData.beehive;
      (window as any).__ctx.updateMulti('beehive', { queen: Object.assign({}, d.queen, { territory: 12 }) });
    });
    await page.waitForTimeout(1800);
    const after = await shotBay(page, '[data-beehive-3d-bay="queen"]');

    expect(Buffer.compare(before, after), 'the forage frontline did not change the meadow').not.toBe(0);
  });
});
