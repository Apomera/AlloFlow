import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Solar System — the orrery must stop rendering once it is scrolled out of view.
 *
 * WHY THIS EXISTS
 * Browsers throttle requestAnimationFrame for a hidden TAB — which this tool already
 * handled — but never for an element that has merely been scrolled past. With a planet
 * selected and its panels open the tool's page is ~17,600px tall, so "scrolled past"
 * is how a student reads almost all of it. Measured 2026-08-16 with the canvas fully
 * off-screen: 355 renders/s, against 390 in view. No reduction at all, for a scene
 * nobody could see. After the fix: 0.
 *
 * Resuming is asserted as strictly as pausing. A guard that pauses and never comes
 * back is worse than no guard: the student scrolls up to a frozen model and the tool
 * looks broken rather than merely wasteful.
 *
 * MEASUREMENT TRAPS, both of which reported a confident zero first:
 *   - three r128 assigns render() as an OWN property inside the constructor, so
 *     patching WebGLRenderer.prototype does nothing. A prototype patch reports zero
 *     renders, which is indistinguishable from the guard already working.
 *   - The harness mounts into a fixed-size #wrap, so the document never grows tall
 *     enough to scroll and the canvas never actually leaves the viewport. The wrapper
 *     has to become the scroller — which is also what the STEM shell does.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js',
  toolId: 'solarSystem',
  width: 1100,
  height: 800,
  appStyles: true,
  probes: `
    window.__orreryRenders = 0;
    window.__droneRenders = 0;
    window.__patched = false;
    (function install() {
      if (!window.THREE || !window.THREE.WebGLRenderer) { setTimeout(install, 50); return; }
      var Real = window.THREE.WebGLRenderer;
      function Wrapped(opts) {
        var inst = new Real(opts);
        var realRender = inst.render.bind(inst);
        // Attributed per canvas: the tool builds several renderers and a total would
        // not say whether the ORRERY paused.
        inst.render = function () {
          var el = inst.domElement;
          if (el && el.classList && el.classList.contains('solar3d-canvas')) window.__orreryRenders++;
          else if (el && el.getAttribute && el.getAttribute('data-drone-canvas')) window.__droneRenders++;
          return realRender.apply(null, arguments);
        };
        return inst;
      }
      Wrapped.prototype = Real.prototype;
      window.THREE.WebGLRenderer = Wrapped;
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
    window.__offScreen = function (selector) {
      var c = document.querySelector(selector || 'canvas.solar3d-canvas');
      var w = document.getElementById('wrap');
      if (!c || !w) return null;
      var r = c.getBoundingClientRect(), wr = w.getBoundingClientRect();
      return r.bottom < wr.top || r.top > wr.bottom;
    };
  `,
});

// Panels are opened so the page is genuinely tall enough to scroll the model away.
const SEED = {
  tutorialDismissed: true,
  selectedPlanet: 'stem.solar_sys.venus',
  showMoons: true, showWhatIf: true, showScale: true, showOrbital: true,
  showTimeline: true, showEscape: true, showLog: true,
};

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 200_000 });

test('the orrery pauses off-screen and resumes when scrolled back', async ({ page }) => {
  await harness.mount(page, { solarSystem: SEED });
  const scrollHeight = await page.evaluate(() => (window as any).__makeScrollable(700));
  await page.waitForTimeout(1200);

  expect(await page.evaluate(() => (window as any).__patched),
    'the probe never wrapped THREE.WebGLRenderer, so every count below would be a '
    + 'meaningless zero').toBe(true);
  expect(scrollHeight,
    'the tool did not render tall enough to scroll the model out of view').toBeGreaterThan(3000);

  const sample = async () => {
    await page.evaluate(() => { (window as any).__orreryRenders = 0; });
    await page.waitForTimeout(2500);
    return page.evaluate(() => (window as any).__orreryRenders);
  };

  const inView = await sample();
  expect(inView, 'the orrery never rendered while in view — nothing was measured').toBeGreaterThan(30);

  await page.evaluate(() => (window as any).__scrollWrap(4000));
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as any).__offScreen()),
    'the scroll did not actually move the canvas out of view').toBe(true);

  const away = await sample();
  expect(away,
    `the orrery kept rendering while scrolled out of view: ${away} frames in 2.5s `
    + `(${inView} while visible). requestAnimationFrame is throttled for a hidden tab, `
    + 'never for an off-screen element — it needs the IntersectionObserver guard.')
    .toBeLessThanOrEqual(2);

  await page.evaluate(() => (window as any).__scrollWrap(0));
  await page.waitForTimeout(1000);
  const back = await sample();
  expect(back,
    'the orrery did not resume after scrolling back: a guard that pauses and never '
    + 'returns leaves the student looking at a frozen model').toBeGreaterThan(30);
});

test('the rover scene pauses off-screen and resumes when scrolled back', async ({ page }) => {
  // Measured 2026-08-16 before the guard: 24 renders/s visible, 198/s once scrolled
  // away — it ran FASTER unseen, because Chromium stops compositing and rAF is no
  // longer paced by the display.
  await harness.mount(page, {
    solarSystem: { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.mars', viewTab: 'drone' },
  }, 'document.querySelector(\'canvas[data-drone-canvas]\')');
  await page.evaluate(() => (window as any).__makeScrollable(700));
  // The deployment shot owns the first seconds and drives the camera itself.
  await page.waitForFunction(() => !document.getElementById('descent-status'), null, { timeout: 40000 })
    .catch(() => { /* fall through: the samples below still tell the truth */ });

  const droneOff = () => page.evaluate(() => (window as any).__offScreen('canvas[data-drone-canvas]'));
  const sample = async () => {
    await page.evaluate(() => { (window as any).__droneRenders = 0; });
    await page.waitForTimeout(2500);
    return page.evaluate(() => (window as any).__droneRenders);
  };

  // The drone canvas mounts BELOW the fold, so scrollTop 0 is already off-screen and a
  // baseline taken there would compare two off-screen states and prove nothing.
  await page.evaluate(() => (window as any).__scrollWrap(1100));
  await page.waitForTimeout(1200);
  expect(await droneOff(), 'the rover canvas was not brought into view for the baseline').toBe(false);

  const inView = await sample();
  expect(inView, 'the rover never rendered while in view — nothing was measured').toBeGreaterThan(20);

  await page.evaluate(() => (window as any).__scrollWrap(6000));
  await page.waitForTimeout(1200);
  expect(await droneOff(), 'the scroll did not move the rover canvas out of view').toBe(true);

  const away = await sample();
  expect(away,
    `the rover kept rendering while scrolled out of view: ${away} frames in 2.5s `
    + `(${inView} while visible)`).toBeLessThanOrEqual(2);

  await page.evaluate(() => (window as any).__scrollWrap(1100));
  await page.waitForTimeout(1200);
  const back = await sample();
  expect(back, 'the rover did not resume after scrolling back').toBeGreaterThan(20);
});
