import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * WCAG 2.2.2 covers motion that plays on its own. In the powered descent EVERYTHING
 * that moves is either the graded simulation the student is flying (lander position and
 * tilt, terrain scroll, chase camera) or is gated on the student holding THRUST (the
 * exhaust plume and the blown regolith). The starfield deliberately rides the camera so
 * it never drifts. There is no autonomous decorative motion to suppress, which is why
 * this phase reads the reduced-motion flag for QUALITY tiering (antialias, pixel ratio,
 * star count, mesh segments, shadows, bloom) rather than to stop anything.
 *
 * That is a boundary, not a gap, so this pins the two claims it rests on:
 *   1. under prefers-reduced-motion the descent still flies — refusing to simulate
 *      would break the only graded task rather than help anyone;
 *   2. with the student's hands off the controls, thrust is not live — so the two
 *      thrust-gated effects (plume, blown regolith) have nothing driving them.
 *      NOTE: this checks the gate's input, not the rendered pixels. See the comment
 *      at that assertion for why the pixel version was dropped.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_moonmission.js',
  toolId: 'moonMission',
  width: 1280,
  height: 820
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

test('under reduced motion the descent still flies, and nothing idles', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { moonMission: { missionPhase: 5, descentStarted: true } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas[data-descent-canvas="true"]') as HTMLCanvasElement;
    return c && c.dataset.descent3d === 'on';
  }, null, { timeout: 25000 });

  // The tool must agree it is in reduced-motion, or the rest of this proves nothing
  // about the reduced-motion path.
  const reduced = await page.evaluate(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  expect(reduced, 'the page is not actually in reduced-motion').toBe(true);

  const alt = () => page.evaluate(() => Number(
    (document.querySelector('canvas[data-descent-canvas="true"]') as HTMLCanvasElement).dataset.descentAlt));

  // 1. The graded simulation still runs. Reduced motion must not freeze the one task
  //    the student is being assessed on.
  const a0 = await alt();
  await page.waitForTimeout(1200);
  const a1 = await alt();
  expect(a1, `the descent did not advance under reduced motion (${a0} -> ${a1})`).toBeLessThan(a0);

  // 2. Hands off the controls, thrust is not live.
  //
  //    This asserts the GATE'S INPUT, not the rendered effect, and that is a real
  //    limitation: `plumeGrp.visible = burning` and `burning && alt < 30` both read
  //    `thrust`, so a regression that renders those effects unconditionally would slip
  //    past this. I tried three pixel-based versions to close that hole and could not
  //    make any of them fail under mutation — the plume's every scale term is
  //    thrust-driven, so forcing it "visible" collapses it to a sliver that moves the
  //    luminance by less than run-to-run variation, and a whole-frame bright-pixel
  //    count just measures the 900-point white starfield. Rather than ship a
  //    pixel threshold I could not mutation-verify, this pins the cheap, reliable
  //    half and says plainly what it does not cover.
  const thrust = await page.evaluate(() => Number(
    (document.querySelector('canvas[data-descent-canvas="true"]') as HTMLCanvasElement).dataset.descentThrust));
  expect(thrust, 'thrust is live with nothing held down').toBeLessThan(0.05);

  expect(errors.filter((m) => !/ResizeObserver loop/.test(m)), 'page errors under reduced motion').toEqual([]);
});
