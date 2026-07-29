import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Pets Lab — "Through Their Eyes" sensory perspective. REAL WebGL smoke.
 *
 * The jsdom suite (pets_sensory_perspective) proves the written comparison,
 * the opt-in loader, the disclosure copy and the dichromat maths. It cannot
 * see the 3D at all: renderToStaticMarkup never invokes a ref, so attach(),
 * the RAF loop, the per-species material re-tint, the CSS acuity filter and
 * the teardown path are all invisible to it.
 *
 * The division of labour here is deliberate. The colour transform is verified
 * NUMERICALLY in vitest; this spec verifies it actually reaches the
 * framebuffer. A previous STEM colour effort was disproven by screenshots
 * after passing every code-level check, so "the code path runs" is not
 * accepted here as evidence that anything appears on screen.
 *
 * What this pins:
 *   1. The sensory view builds a live GL context sized to its box.
 *   2. Each species rasterises a DIFFERENT image — the re-tint is real.
 *   3. Acuity rides on a CSS filter: sharp for the human, blurred for animals.
 *   4. Dusk visibly changes the room.
 *   5. The dog's scent layer animates; the other views hold still.
 *   6. Walking moves the camera.
 *   7. Leaving the room releases the WebGL context instead of leaking it.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 620,
  probes: `
    window.__filter = function () {
      var c = document.querySelector('#wrap canvas');
      return c ? (c.style.filter || 'none') : null;
    };
    window.__canvasCount = function () {
      return document.querySelectorAll('#wrap canvas').length;
    };
    // Press and release a movement key through the window listeners the tool
    // installs, so this exercises the real keyboard path rather than a method.
    window.__walk = function (code, ms) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: code, bubbles: true }));
      return new Promise(function (done) {
        setTimeout(function () {
          window.dispatchEvent(new KeyboardEvent('keyup', { code: code, bubbles: true }));
          done(true);
        }, ms || 400);
      });
    };
  `,
});

function seed(extra: Record<string, unknown> = {}) {
  return { petsLab: Object.assign({ view: 'sensory', sensoryActive: true, _threeLoaded: true }, extra) };
}

test.describe('Pets Lab sensory perspective — WebGL', () => {
  test.describe.configure({ timeout: 150_000 });

  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => {
    // Chromium caps live GL contexts per process and silently kills the
    // oldest; releasing explicitly keeps multi-suite runs deterministic.
    await page.evaluate(() => (window as any).__destroy()).catch(() => {});
  });

  test('builds a live GL context in the room', async ({ page }) => {
    await harness.mount(page, seed());
    const gl = await page.evaluate(() => (window as any).__glCanvas('#wrap'));
    expect(gl, 'no WebGL canvas in the sensory view').toBeTruthy();
    const errors = await page.evaluate(() => (window as any).__events.errors);
    expect(errors, 'page errors while mounting the room').toEqual([]);
  });

  test('each species rasterises a different image', async ({ page }) => {
    await harness.mount(page, seed({ sensorySpecies: 'human' }));
    const canvas = page.locator('#wrap canvas').first();
    const human = await canvas.screenshot({ timeout: 60000 });

    // Re-seed rather than clicking, so this measures the render and not the UI.
    await page.evaluate(() => {
      (window as any).__ctx.update('petsLab', 'sensorySpecies', 'dog');
    });
    await page.waitForTimeout(700);
    const dog = await canvas.screenshot({ timeout: 60000 });

    await page.evaluate(() => {
      (window as any).__ctx.update('petsLab', 'sensorySpecies', 'cat');
    });
    await page.waitForTimeout(700);
    const cat = await canvas.screenshot({ timeout: 60000 });

    expect(human.length).toBeGreaterThan(1000);
    expect(Buffer.compare(human, dog), 'dog view is identical to human — dichromat re-tint never reached the framebuffer').not.toBe(0);
    expect(Buffer.compare(human, cat), 'cat view is identical to human').not.toBe(0);
    // Dog and cat share a colour space but differ in eye height and FOV.
    expect(Buffer.compare(dog, cat), 'dog and cat views are identical — eye height/FOV not applied').not.toBe(0);
  });

  test('acuity rides on a CSS filter, sharp only for the human', async ({ page }) => {
    await harness.mount(page, seed({ sensorySpecies: 'human' }));
    expect(await page.evaluate(() => (window as any).__filter())).toBe('none');

    await page.evaluate(() => (window as any).__ctx.update('petsLab', 'sensorySpecies', 'dog'));
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__filter())).toContain('blur');

    await page.evaluate(() => (window as any).__ctx.update('petsLab', 'sensorySpecies', 'cat'));
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__filter())).toContain('blur');
  });

  test('dusk visibly changes the room', async ({ page }) => {
    await harness.mount(page, seed({ sensorySpecies: 'human' }));
    const canvas = page.locator('#wrap canvas').first();
    const day = await canvas.screenshot({ timeout: 60000 });

    await page.evaluate(() => (window as any).__ctx.update('petsLab', 'sensoryDusk', true));
    await page.waitForTimeout(700);
    const night = await canvas.screenshot({ timeout: 60000 });

    expect(Buffer.compare(day, night), 'dusk did not change the render').not.toBe(0);
  });

  test('the scent layer animates for the dog and not for the human', async ({ page }) => {
    await harness.mount(page, seed({ sensorySpecies: 'dog' }));
    const canvas = page.locator('#wrap canvas').first();
    const a = await canvas.screenshot({ timeout: 60000 });
    await page.waitForTimeout(1100);
    const b = await canvas.screenshot({ timeout: 60000 });
    expect(Buffer.compare(a, b), 'dog scent motes are not animating').not.toBe(0);

    // The human view has no moving parts, so a still camera must stay still.
    await page.evaluate(() => (window as any).__ctx.update('petsLab', 'sensorySpecies', 'human'));
    await page.waitForTimeout(700);
    const c = await canvas.screenshot({ timeout: 60000 });
    await page.waitForTimeout(1100);
    const dd = await canvas.screenshot({ timeout: 60000 });
    expect(Buffer.compare(c, dd), 'human view is animating — scent layer leaked out of dog view').toBe(0);
  });

  test('reduced motion actually stops the scene drifting', async ({ page }) => {
    // The tool's reduced-motion CSS freezes keyframes and transitions and does
    // nothing at all to a WebGL RAF loop, so this has to be measured on the
    // framebuffer rather than inferred from a stylesheet.
    await harness.mount(page, seed({ sensorySpecies: 'dog', sensoryReduceMotion: true }));
    const canvas = page.locator('#wrap canvas').first();
    const a = await canvas.screenshot({ timeout: 60000 });
    await page.waitForTimeout(1300);
    const b = await canvas.screenshot({ timeout: 60000 });
    expect(
      Buffer.compare(a, b),
      'scene still animating with reduced motion on — the scent drift is not gated',
    ).toBe(0);

    // ...but the student can still move, so it is reduced, not frozen out.
    await page.evaluate(() => (window as any).__walk('ArrowUp', 500));
    await page.waitForTimeout(400);
    const c = await canvas.screenshot({ timeout: 60000 });
    expect(Buffer.compare(a, c), 'reduced motion also disabled walking').not.toBe(0);
  });

  test('turning motion back on resumes the drift', async ({ page }) => {
    await harness.mount(page, seed({ sensorySpecies: 'dog', sensoryReduceMotion: true }));
    const canvas = page.locator('#wrap canvas').first();
    await page.evaluate(() => (window as any).__ctx.update('petsLab', 'sensoryReduceMotion', false));
    await page.waitForTimeout(600);
    const a = await canvas.screenshot({ timeout: 60000 });
    await page.waitForTimeout(1200);
    const b = await canvas.screenshot({ timeout: 60000 });
    expect(Buffer.compare(a, b), 'motion did not resume when re-enabled').not.toBe(0);
  });

  test('keyboard walking moves the camera', async ({ page }) => {
    await harness.mount(page, seed({ sensorySpecies: 'human' }));
    const canvas = page.locator('#wrap canvas').first();
    const before = await canvas.screenshot({ timeout: 60000 });
    await page.evaluate(() => (window as any).__walk('ArrowUp', 600));
    await page.waitForTimeout(400);
    const after = await canvas.screenshot({ timeout: 60000 });
    expect(Buffer.compare(before, after), 'walking forward did not change the view').not.toBe(0);
  });

  test('leaving the room releases the GL context', async ({ page }) => {
    await harness.mount(page, seed());
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);

    await page.evaluate(() => (window as any).__ctx.update('petsLab', 'sensoryActive', false));
    await page.waitForTimeout(700);
    expect(
      await page.evaluate(() => (window as any).__canvasCount()),
      'canvas survived leaving the room — the RAF loop and GL context are leaking',
    ).toBe(0);
  });

  test('re-entering rebuilds exactly one canvas', async ({ page }) => {
    await harness.mount(page, seed());
    await page.evaluate(() => (window as any).__ctx.update('petsLab', 'sensoryActive', false));
    await page.waitForTimeout(500);
    await page.evaluate(() => (window as any).__ctx.update('petsLab', 'sensoryActive', true));
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
  });
});
