import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Solar System — the 3-D orrery must be steerable from the keyboard.
 *
 * WHY THIS EXISTS
 * The canvas carries tabIndex 0, so a keyboard user lands on the tool's main view, and
 * measured 2026-08-16 it did nothing there: a pointer drag moved the camera while
 * ArrowLeft/Right, +/-, PageUp/Down, [/] and WASD moved nothing at all. The arrows did
 * scroll the page, because no handler was calling preventDefault. Planet selection had
 * a keyboard route through the buttons above the canvas; orbit and zoom had none.
 *
 * WHY IT READS NUMBERS INSTEAD OF PIXELS
 * The first version of this spec diffed screenshots of a paused scene. That cannot
 * work here: the camera distance EASES asymptotically toward its target and never
 * lands exactly, so frames keep changing by a hair indefinitely. Waiting for two
 * identical frames timed out, and NOT waiting attributed the tail of one input to the
 * next — which reported unbound keys ([/], WASD) as working. The canvas now publishes
 * `data-camera` beside the `data-speed` / `data-paused` / `data-selected` it already
 * exposed, and this reads that.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js',
  toolId: 'solarSystem',
  width: 1000,
  height: 800,
  appStyles: true,
  probes: `
    window.__focusCanvas = function () {
      var c = document.querySelector('canvas.solar3d-canvas');
      if (!c) return false;
      c.focus();
      return document.activeElement === c;
    };
    window.__cam = function () {
      var c = document.querySelector('canvas.solar3d-canvas');
      if (!c || !c.dataset.camera) return null;
      var p = c.dataset.camera.split(',').map(Number);
      return { theta: p[0], phi: p[1], dist: p[2] };
    };
    window.__canvasA11y = function () {
      var c = document.querySelector('canvas.solar3d-canvas');
      if (!c) return null;
      var id = c.getAttribute('aria-describedby');
      var el = id && document.getElementById(id);
      return {
        role: c.getAttribute('role'),
        tabIndex: c.tabIndex,
        keyshortcuts: c.getAttribute('aria-keyshortcuts') || '',
        describedText: el ? el.textContent.trim() : null,
      };
    };
    window.__blur = function () {
      var c = document.querySelector('canvas.solar3d-canvas');
      if (c) c.blur();
      document.body.focus();
    };
    window.__onCanvas = function () {
      var a = document.activeElement;
      return !!(a && a.classList && a.classList.contains('solar3d-canvas'));
    };
    window.__outline = function () {
      var c = document.querySelector('canvas.solar3d-canvas');
      if (!c) return null;
      var cs = getComputedStyle(c);
      return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) || 0, color: cs.outlineColor };
    };
  `,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 200_000 });

test('the orrery camera answers to the keyboard', async ({ page }) => {
  await harness.mount(page, { solarSystem: { tutorialDismissed: true, paused: true } });
  await page.waitForTimeout(1500);

  const a11y = await page.evaluate(() => (window as any).__canvasA11y());
  expect(a11y.role,
    'a canvas that handles its own keys must not be role="img" — a screen reader in '
    + 'browse mode claims the arrow keys before the orbit handler sees them').toBe('application');
  expect(a11y.tabIndex, 'the canvas must stay reachable by Tab').toBe(0);
  expect(a11y.keyshortcuts,
    'shortcuts have to be announced, not only implemented').toContain('ArrowLeft');
  expect(a11y.describedText,
    'a keyboard user landing on the canvas needs to be told what it answers to').toBeTruthy();

  expect(await page.evaluate(() => (window as any).__focusCanvas()),
    'the canvas could not take focus').toBe(true);
  expect(await page.evaluate(() => (window as any).__cam()),
    'the canvas never published data-camera, so nothing below is measurable').not.toBeNull();

  const cam = () => page.evaluate(() => (window as any).__cam());

  const press = async (keys: string[], settleMs = 900) => {
    await page.evaluate(() => (window as any).__focusCanvas());
    await page.waitForTimeout(settleMs);          // let any easing from the last input land
    const before = await cam();
    for (const key of keys) for (let i = 0; i < 5; i++) await page.keyboard.press(key);
    await page.waitForTimeout(settleMs);
    const after = await cam();
    return { before, after };
  };

  const orbitLeft = await press(['ArrowLeft']);
  expect(orbitLeft.after.theta,
    `ArrowLeft did not orbit: theta stayed ${orbitLeft.before.theta}`).not.toBeCloseTo(orbitLeft.before.theta, 3);

  const orbitRight = await press(['ArrowRight']);
  expect(orbitRight.after.theta, 'ArrowRight did not orbit').not.toBeCloseTo(orbitRight.before.theta, 3);

  const up = await press(['ArrowUp']);
  expect(up.after.phi, 'ArrowUp did not change the elevation').toBeLessThan(up.before.phi);
  expect(up.after.phi, 'the polar angle escaped its clamp').toBeGreaterThanOrEqual(0.15);

  const down = await press(['ArrowDown']);
  expect(down.after.phi, 'ArrowDown did not change the elevation').toBeGreaterThan(down.before.phi);
  expect(down.after.phi, 'the polar angle escaped its clamp').toBeLessThanOrEqual(Math.PI - 0.15);

  const zoomIn = await press(['+']);
  expect(zoomIn.after.dist, 'plus did not zoom in').toBeLessThan(zoomIn.before.dist);

  const zoomOut = await press(['-']);
  expect(zoomOut.after.dist, 'minus did not zoom out').toBeGreaterThan(zoomOut.before.dist);

  const pageZoom = await press(['PageUp']);
  expect(pageZoom.after.dist, 'PageUp did not zoom in').toBeLessThan(pageZoom.before.dist);

  // Negative control: if unbound keys also move the camera, this spec is measuring
  // drift rather than input and every assertion above is worthless.
  const unbound = await press(['q', 'z', 'j']);
  expect(unbound.after.theta, 'an unbound key changed theta').toBeCloseTo(unbound.before.theta, 3);
  expect(unbound.after.phi, 'an unbound key changed phi').toBeCloseTo(unbound.before.phi, 3);
  // Distance gets a tolerance rather than an equality: it eases asymptotically toward
  // its target, so a little residual motion from the PageUp above is still arriving.
  // Measured drift across this window is ~0.24 against a 4-unit key step, so 1.0
  // separates "still settling" from "a key moved it" with room to spare.
  expect(Math.abs(unbound.after.dist - unbound.before.dist),
    'an unbound key moved the camera distance').toBeLessThan(1.0);
});

test('the focused canvas shows a focus indicator a student can see', async ({ page }) => {
  // Chrome's default here is `outline: auto 1px rgb(16,16,16)` — a near-black hairline
  // on a deep-space canvas, which is no indicator at all. It only started to matter
  // once the canvas became genuinely operable by keyboard: before that, landing on it
  // invisibly and being unable to do anything were the same bug.
  await harness.mount(page, { solarSystem: { tutorialDismissed: true, paused: true } });
  await page.waitForTimeout(1500);
  const el = (await page.$('canvas.solar3d-canvas'))!;

  await page.evaluate(() => (window as any).__blur());
  await page.waitForTimeout(400);
  const blurred = await el.screenshot({ timeout: 20000 });

  // Tab in rather than calling focus(): :focus-visible only applies to keyboard focus,
  // and a programmatic focus would test a state the student never reaches this way.
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => (window as any).__onCanvas())) break;
    await page.keyboard.press('Tab');
  }
  expect(await page.evaluate(() => (window as any).__onCanvas()),
    'the canvas is not reachable by Tab').toBe(true);

  const outline = await page.evaluate(() => (window as any).__outline());
  expect(outline.style, 'the focused canvas has no outline style of its own').not.toBe('none');
  expect(outline.width,
    `a ${outline.width}px ring is the browser default hairline, not an indicator`).toBeGreaterThanOrEqual(3);

  await page.waitForTimeout(400);
  const focused = await el.screenshot({ timeout: 20000 });
  expect(Buffer.compare(blurred, focused),
    'the focus indicator did not change a single pixel of the canvas, so whatever the '
    + 'computed style claims, nothing is drawn').not.toBe(0);
});
