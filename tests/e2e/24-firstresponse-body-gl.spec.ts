import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * First Response — "Body position in 3D". REAL WebGL smoke.
 *
 * The jsdom suite (firstresponse_body_3d) pins the clinical content: the
 * breathing gate, the age depths, the AED pad verdicts, the recovery sequence,
 * and that every target survives a dead canvas as a button. What it cannot see
 * is whether the body ever DRAWS, whether clicking a chest actually hits
 * geometry, or whether the figure changes when it is supposed to — jsdom has no
 * WebGL and renderToStaticMarkup never invokes the ref that mounts the scene.
 *
 * Two of the assertions here exist because the scene is REBUILT rather than
 * merely restyled, which is easy to break silently:
 *   - the figure rescales by age, so an infant is visibly not a small adult
 *   - the body rolls as the recovery sequence advances
 * Both would still "render fine" if the rebuild trigger were lost; they would
 * simply stop teaching anything, which no snapshot would notice.
 *
 * Loads the real host for window.StemLab.makeBayViewer — see the note on
 * preScripts in the harness, and spec 23 for why that ordering matters.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js',
  toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 900,
  height: 640,
  probes: `
    window.__hostShell = function () {
      return !!(window.StemLab && typeof window.StemLab.makeBayViewer === 'function');
    };
    window.__canvasCount = function () { return document.querySelectorAll('#wrap canvas').length; };
    // Hunt for a pick rather than hard-coding a hit point: patch positions are
    // an implementation detail and would rot the moment the figure changes.
    window.__sweepPick = function (readKey) {
      var el = document.querySelector('#wrap canvas');
      if (!el) return Promise.resolve(null);
      var r = el.getBoundingClientRect();
      var pts = [];
      for (var x = 0.2; x <= 0.8; x += 0.05) {
        for (var y = 0.2; y <= 0.85; y += 0.05) pts.push([x, y]);
      }
      var i = 0;
      return new Promise(function (done) {
        function step() {
          if (i >= pts.length) return done(null);
          var p = pts[i++];
          var cx = r.left + r.width * p[0], cy = r.top + r.height * p[1];
          el.dispatchEvent(new PointerEvent('pointerdown', { clientX: cx, clientY: cy, bubbles: true, pointerId: 5 }));
          el.dispatchEvent(new PointerEvent('pointerup',   { clientX: cx, clientY: cy, bubbles: true, pointerId: 5 }));
          setTimeout(function () {
            var v = (window.__toolData.firstResponse || {})[readKey];
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

// Every mount needs the consent gate already accepted, or the tool renders its
// consent screen instead of any module.
const seed = (extra: Record<string, unknown> = {}) => ({
  firstResponse: Object.assign({ view: 'body3d', consentAccepted: true }, extra),
});

test.describe('First Response — body position on real WebGL', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('the body builds a live GL context from the shared host shell', async ({ page }) => {
    await harness.mount(page, seed({ b3dTab: 'place' }));

    expect(await page.evaluate(() => (window as any).__hostShell())).toBe(true);

    const live = await page.evaluate(() => (window as any).__glLive());
    expect(live, 'no GL canvas in the body module').not.toBeNull();
    expect(live.lost, 'GL context was lost').toBe(false);
    expect(live.box.w).toBeGreaterThan(100);

    const errors = await page.evaluate(() => (window as any).__events.errors);
    expect(errors, 'errors while building the body').toEqual([]);
  });

  test('clicking the chest selects a compression zone', async ({ page }) => {
    await harness.mount(page, seed({ b3dTab: 'place' }));
    const hit = await page.evaluate(() => (window as any).__sweepPick('b3dPlaced'));
    expect(hit, 'clicking the chest never selected a zone — raycaster not wired').toBeTruthy();
  });

  test('the AED tab offers pad targets, not compression zones', async ({ page }) => {
    await harness.mount(page, seed({ b3dTab: 'aed' }));
    const hit = await page.evaluate(() => (window as any).__sweepPick('b3dPad'));
    expect(hit, 'clicking the chest on the AED tab never selected a pad').toBeTruthy();
    expect(String(hit).startsWith('pad'), 'AED tab returned a compression zone: ' + hit).toBe(true);

    // ...and the compression zones must not be pickable here.
    const stray = await page.evaluate(() => (window as any).__toolData.firstResponse.b3dPlaced ?? null);
    expect(stray, 'compression zones are still live on the AED tab').toBeNull();
  });

  test('the figure rescales by age — an infant is not a small adult', async ({ page }) => {
    await harness.mount(page, seed({ b3dTab: 'place', b3dAge: 'adult' }));
    const adult = await page.locator('#wrap canvas').screenshot();

    await page.evaluate(() => (window as any).__ctx.update('firstResponse', 'b3dAge', 'infant'));
    await page.waitForTimeout(1200);
    const infant = await page.locator('#wrap canvas').screenshot();

    expect(Buffer.compare(adult, infant),
      'switching to infant did not rebuild the figure — the age selector is cosmetic').not.toBe(0);
  });

  test('the body rolls as the recovery sequence advances', async ({ page }) => {
    await harness.mount(page, seed({ b3dTab: 'recovery', b3dRec: [] }));
    const flat = await page.locator('#wrap canvas').screenshot();

    await page.evaluate(() => (window as any).__ctx.update(
      'firstResponse', 'b3dRec', ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch']));
    await page.waitForTimeout(1200);
    const rolled = await page.locator('#wrap canvas').screenshot();

    expect(Buffer.compare(flat, rolled),
      'the body never rolled — the recovery position is the one thing this view exists to show').not.toBe(0);
  });

  test('leaving the module releases the context', async ({ page }) => {
    await harness.mount(page, seed({ b3dTab: 'place' }));
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);

    await page.evaluate(() => (window as any).__ctx.update('firstResponse', 'view', 'menu'));
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => (window as any).__canvasCount()),
      'canvas leaked after leaving the module').toBe(0);
  });
});
