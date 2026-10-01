import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Nutrition Lab — "Nutrient Body Map (3D)". REAL WebGL smoke.
 *
 * The jsdom suite (stem_nutritionlab_integrity) pins the DATA: every nutrient
 * maps to real regions, every region is reachable, the 2D floor renders. What
 * jsdom cannot see is whether the glass figure ever DRAWS, whether clicking an
 * organ actually hits geometry, and whether picking a different nutrient
 * changes what the scene is animating — the shell's `levels` channel plus the
 * scene's own particle streams are the whole teaching mechanism here, and both
 * would "render fine" if they silently stopped being fed.
 *
 * TRAP recorded from the first version of this spec: a screenshot-differs
 * assertion after `__ctx.update('bm_nutrient', ...)` passed for the WRONG
 * reason. The view keeps that state locally (usePersistedState reads toolData
 * once, at mount) so the external write never reached it, and the two frames
 * differed only because the particles move. Drive the real chip instead, and
 * read the scene through the window.__testHooks snapshot frame() publishes.
 *
 * Loads the real host for window.StemLab.makeBayViewer (preScripts).
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_nutritionlab.js',
  toolId: 'nutritionLab',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1100,
  height: 900,
  probes: `
    window.__testHooks = window.__testHooks || {};
    window.__hostShell = function () {
      return !!(window.StemLab && typeof window.StemLab.makeBayViewer === 'function');
    };
    window.__lit = function () {
      var h = window.__testHooks.nutritionBodyMap;
      return h ? h.lit.slice().sort() : null;
    };
    // Magnitude the SCENE drew each lit region at, pulse excluded so a
    // 22%-vs-8% comparison cannot flake on which frame the test read.
    window.__mag = function () {
      var h = window.__testHooks.nutritionBodyMap;
      return h ? h.mag : null;
    };
    // Hunt for a pick over the figure rather than hard-coding a hit point:
    // organ positions are an implementation detail of the scene.
    window.__sweepPick = function () {
      var el = document.querySelector('[data-nutrition-bodymap] canvas');
      if (!el) return Promise.resolve(null);
      var r = el.getBoundingClientRect();
      var pts = [];
      for (var y = 0.12; y <= 0.9; y += 0.04) {
        for (var x = 0.3; x <= 0.7; x += 0.04) pts.push([x, y]);
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
            var v = (window.__toolData.nutritionLab || {}).bm_region;
            if (v) return done(v);
            step();
          }, 18);
        }
        step();
      });
    };
  `,
});

test.describe.configure({ timeout: 150_000 });

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

const seed = (extra: Record<string, unknown> = {}) => ({
  nutritionLab: Object.assign({ view: 'bodyMap' }, extra),
});

test.describe('Nutrition Lab — body map on real WebGL', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('the figure builds a live GL context from the shared host shell and clears its loading overlay', async ({ page }) => {
    await harness.mount(page, seed({ bm_nutrient: 'iron' }));
    expect(await page.evaluate(() => (window as any).__hostShell())).toBe(true);

    const live = await page.evaluate(() => (window as any).__glLive('[data-nutrition-bodymap]'));
    expect(live, 'no GL canvas in the body map').not.toBeNull();
    expect(live.lost, 'GL context was lost').toBe(false);
    expect(live.box.w).toBeGreaterThan(100);

    const errors = await page.evaluate(() => (window as any).__events.errors);
    expect(errors, 'errors while building the figure').toEqual([]);

    // The ref attaches (and reaches 'ready') before the effect that registers
    // onStatus; the view must reconcile or this overlay sits on a live scene.
    await expect(page.getByText('Loading the 3D figure')).toHaveCount(0);
    // The 2D floor is present alongside the scene.
    await expect(page.getByRole('button', { name: /Blood \(red cells\)/ }).first()).toBeVisible();
  });

  test('renders something rather than a blank surface', async ({ page }) => {
    await harness.mount(page, seed({ bm_nutrient: 'iron' }));
    await page.waitForTimeout(900);
    const shot = await page.locator('[data-nutrition-bodymap] canvas').screenshot({ timeout: 60000 });
    expect(shot.length, 'canvas looks blank').toBeGreaterThan(8000);
  });

  test('clicking an organ selects a region (raycast wired to picks)', async ({ page }) => {
    await harness.mount(page, seed({ bm_nutrient: 'iron', bm_region: null }));
    await page.waitForTimeout(600);
    const hit = await page.evaluate(() => (window as any).__sweepPick());
    expect(hit, 'clicking the figure never selected a region').toBeTruthy();
    // The region card follows the pick.
    await expect(page.getByRole('button', { name: 'Clear region selection' })).toBeVisible();
  });

  test('picking a different nutrient re-routes the streams (levels channel live)', async ({ page }) => {
    await harness.mount(page, seed({ bm_nutrient: 'iron' }));
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => (window as any).__lit()),
      'iron should stream to blood, brain, immune and muscles').toEqual(['blood', 'brain', 'immune', 'muscles']);

    await page.getByRole('radio', { name: /^Vitamin A/ }).click();
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.bm_nutrient),
      'the chip did not persist the pick').toBe('vitA');
    expect(await page.evaluate(() => (window as any).__lit()),
      'vitamin A should stream to eyes, immune and skin').toEqual(['eyes', 'immune', 'skin']);
    await expect(page.getByText(/Vitamin A → 3 regions/)).toBeVisible();
  });

  test('label-all mode places a chip for every region', async ({ page }) => {
    await harness.mount(page, seed({ bm_nutrient: 'calcium', bm_labels: true }));
    await page.waitForTimeout(900);
    const chips = await page.evaluate(() => {
      const wrap = document.querySelector('[data-nutrition-bodymap]');
      if (!wrap) return -1;
      // Label chips are absolutely-positioned aria-hidden divs owned by the shell.
      return Array.from(wrap.querySelectorAll('div[aria-hidden="true"]'))
        .filter((el) => (el as HTMLElement).style.opacity !== '0' && (el as HTMLElement).style.opacity !== '').length;
    });
    expect(chips, 'no label chips visible in label-all mode').toBeGreaterThanOrEqual(6);
  });

  test('keyboard drives the camera from the focusable group', async ({ page }) => {
    await harness.mount(page, seed({ bm_nutrient: 'iodine' }));
    await page.waitForTimeout(900);
    const before = await page.locator('[data-nutrition-bodymap] canvas').screenshot();
    await page.locator('[data-nutrition-bodymap]').focus();
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);
    const after = await page.locator('[data-nutrition-bodymap] canvas').screenshot();
    expect(Buffer.compare(before, after), 'arrow keys did not rotate the figure').not.toBe(0);
  });

  test('a prediction reveals the answer set and lights the figure for that nutrient', async ({ page }) => {
    await harness.mount(page, seed({ bm_nutrient: 'water', bm_quiz: { i: 0, pick: null, done: 0 } }));
    await page.waitForTimeout(600);
    // Bank entry 0 is iron; Bones is not one of its addresses.
    await page.locator('[data-nutrition-bm-predict]').getByRole('button', { name: /^Bones & teeth/ }).click();
    await page.waitForTimeout(800);
    await expect(page.getByText('Not a main address for this one')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__lit())).toEqual(['blood', 'brain', 'immune', 'muscles']);
    await expect(page.getByRole('button', { name: /Blood \(red cells\) — yes, a main address/ })).toBeVisible();
  });

  test('resting-energy mode grades the figure by organ share, not by nutrient', async ({ page }) => {
    await harness.mount(page, seed({ bm_mode: 'energy' }));
    await page.waitForTimeout(900);

    // Exactly the five organs the shares name — not the twelve nutrient regions.
    expect(await page.evaluate(() => (window as any).__lit()))
      .toEqual(['brain', 'heart', 'kidneys', 'liver', 'muscles']);

    // The level channel carries the SHARE, so a 22% organ must outweigh an 8% one.
    // Reading it off the scene rather than the DOM is the point: a panel can be
    // right while the figure it describes is flat.
    const scale = await page.evaluate(() => (window as any).__mag());
    expect(scale, 'no scene magnitude probe').not.toBeNull();
    expect(scale.muscles, 'muscles (22%) should outscale kidneys (8%)').toBeGreaterThan(scale.kidneys);

    await expect(page.getByText('Where your resting energy goes')).toBeVisible();
  });

  test('compare mode burns shared regions brighter than single-nutrient ones', async ({ page }) => {
    await harness.mount(page, seed({ bm_mode: 'compare', bm_nutrient: 'iron', bm_compare: 'vitC' }));
    await page.waitForTimeout(900);

    // iron ∪ vitC — every region either of them serves is lit at some level.
    expect(await page.evaluate(() => (window as any).__lit()))
      .toEqual(['blood', 'bones', 'brain', 'immune', 'muscles', 'skin']);

    const scale = await page.evaluate(() => (window as any).__mag());
    // blood and immune are shared; bones is vitamin C only.
    expect(scale.blood, 'shared region should outscale a single-nutrient one').toBeGreaterThan(scale.bones);

    await expect(page.getByText('Shared addresses')).toBeVisible();
    await expect(page.getByText(/Vitamin C makes plant iron far easier to absorb/)).toBeVisible();
  });

  test('switching the compare partner re-computes the overlap', async ({ page }) => {
    await harness.mount(page, seed({ bm_mode: 'compare', bm_nutrient: 'calcium', bm_compare: 'vitC' }));
    await page.waitForTimeout(700);
    await page.locator('#nutrition-bm-compare-b').selectOption('vitD');
    await page.waitForTimeout(800);

    expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.bm_compare)).toBe('vitD');
    // calcium ∪ vitamin D
    expect(await page.evaluate(() => (window as any).__lit()))
      .toEqual(['bones', 'brain', 'heart', 'immune', 'muscles']);
    await expect(page.getByText(/Vitamin D is what lets calcium cross/)).toBeVisible();
  });

  test('a prediction pulls the view out of energy mode so the reveal is visible', async ({ page }) => {
    // Landing a prediction while the figure is showing resting energy would
    // "reveal" an answer against a body lit for something else entirely.
    await harness.mount(page, seed({ bm_mode: 'energy', bm_quiz: { i: 0, pick: null, done: 0 } }));
    await page.waitForTimeout(700);
    await page.locator('[data-nutrition-bm-predict]').getByRole('button', { name: /^Blood \(red cells\)/ }).click();
    await page.waitForTimeout(800);

    expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.bm_mode)).toBe('nutrient');
    expect(await page.evaluate(() => (window as any).__lit())).toEqual(['blood', 'brain', 'immune', 'muscles']);
  });
});
