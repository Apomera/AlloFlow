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

  test('renders a responsive 360-degree vision-field compass for every species', async ({ page }) => {
    await harness.mount(page, seed({ sensorySpecies: 'human', sensoryReduceMotion: true }));

    const compass = page.locator('.petslab-sensory-field');
    const diagram = compass.locator('svg[data-compass-size="live"]');
    const comparison = page.getByRole('region', {
      name: 'Locked viewpoint comparison for human, dog, and cat vision',
    });
    await expect(compass).toHaveCount(1);
    await expect(diagram).toHaveCount(1);
    await expect(compass.getByText(/^Visible field/)).toBeVisible();
    await expect(compass.getByText(/^Both eyes \/ depth zone/)).toBeVisible();
    await expect(compass.getByText(/^Rear blind zone/).first()).toBeVisible();
    await expect(compass.getByText('Forward', { exact: true })).toBeVisible();

    // Capture only geometric SVG attributes. This proves species switches
    // reshape the sectors rather than merely replacing a numeric caption.
    const geometry = () => diagram.evaluate((svg) => {
      const attrs = ['d', 'points', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y',
        'x1', 'y1', 'x2', 'y2', 'width', 'height', 'transform',
        'stroke-dasharray', 'stroke-dashoffset'];
      return Array.from(svg.querySelectorAll('*')).map((node) => attrs
        .filter((name) => node.hasAttribute(name))
        .map((name) => name + '=' + node.getAttribute(name))
        .join(';')).filter(Boolean).join('|');
    });

    await expect(diagram).toHaveAccessibleName(/Human.*190.*120/i);
    await expect(diagram).toHaveAttribute('data-total-field', '190');
    await expect(diagram).toHaveAttribute('data-binocular-field', '120');
    const humanGeometry = await geometry();

    await page.getByRole('radio', { name: /^Dog / }).click();
    await expect(diagram).toHaveAccessibleName(/Dog.*240.*65/i);
    await expect(diagram).toHaveAttribute('data-total-field', '240');
    await expect(diagram).toHaveAttribute('data-binocular-field', '65');
    const dogGeometry = await geometry();

    await page.getByRole('radio', { name: /^Cat / }).click();
    await expect(diagram).toHaveAccessibleName(/Cat.*200.*100/i);
    await expect(diagram).toHaveAttribute('data-total-field', '200');
    await expect(diagram).toHaveAttribute('data-binocular-field', '100');
    const catGeometry = await geometry();

    expect(humanGeometry.length, 'human compass has no SVG geometry').toBeGreaterThan(100);
    expect(new Set([humanGeometry, dogGeometry, catGeometry]).size,
      'species labels changed but the compass sectors did not').toBe(3);

    // Comparison cards use lightweight mini geometry, not extra renderers.
    await expect(comparison.locator('.petslab-field-mini')).toHaveCount(3);
    for (const species of ['human', 'dog', 'cat']) {
      const mini = comparison.locator('[data-species="' + species + '"] .petslab-field-mini');
      await expect(mini).toHaveCount(1);
      await expect(mini.locator('svg[data-compass-size="comparison"]')).toHaveAttribute('data-vision-field', species);
    }
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
    await expect(page.locator('.petslab-sensory-field canvas, .petslab-field-mini canvas')).toHaveCount(0);

    // Check the complete page, not only the new figure, at the minimum width.
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.locator('#wrap').evaluate((el) => { (el as HTMLElement).style.width = '320px'; });
    await page.waitForTimeout(180);
    const mobile = await page.evaluate(() => {
      const wrap = document.getElementById('wrap');
      const figure = document.querySelector('.petslab-sensory-field');
      const box = figure && figure.getBoundingClientRect();
      return {
        pageWidth: document.documentElement.scrollWidth,
        wrapWidth: wrap ? wrap.scrollWidth : 0,
        compassWidth: figure ? figure.scrollWidth : 0,
        compassClientWidth: figure ? figure.clientWidth : 0,
        compassLeft: box ? box.left : -1,
        compassRight: box ? box.right : 321,
      };
    });
    expect(mobile.pageWidth).toBeLessThanOrEqual(320);
    expect(mobile.wrapWidth).toBeLessThanOrEqual(320);
    expect(mobile.compassWidth).toBeLessThanOrEqual(mobile.compassClientWidth);
    expect(mobile.compassLeft).toBeGreaterThanOrEqual(0);
    expect(mobile.compassRight).toBeLessThanOrEqual(320);
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
  });
  test('captures a locked three-species comparison with one WebGL canvas', async ({ page }) => {
    test.setTimeout(240_000);
    await harness.mount(page, seed({ sensorySpecies: 'human', sensoryReduceMotion: true }));

    const region = page.getByRole('region', {
      name: 'Locked viewpoint comparison for human, dog, and cat vision',
    });
    await expect(region.locator('figure')).toHaveCount(3);
    await expect(region.locator('.petslab-sensory-compare-empty')).toHaveCount(3);
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);

    const canvas = page.locator('#wrap canvas').first();
    const captureHuman = page.getByRole('button', { name: 'Capture Human comparison frame' });
    await expect(captureHuman).toBeEnabled();
    await captureHuman.focus();
    await captureHuman.press('Enter');
    await expect(region.locator('img')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Replace Human comparison frame' })).toBeFocused();

    // Navigation is genuinely locked, including the global arrow-key path.
    await expect(page.getByRole('button', { name: /Walk forward/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Reset/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Balls/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Lighting locked/ })).toBeDisabled();
    const lockedBefore = await canvas.screenshot({ timeout: 60000 });
    const arrowPrevented = await page.evaluate(() => {
      const down = new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true, cancelable: true });
      window.dispatchEvent(down);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowDown', bubbles: true }));
      return down.defaultPrevented;
    });
    expect(arrowPrevented, 'locked comparison swallowed an arrow key needed for page scrolling').toBe(false);
    await page.evaluate(() => (window as any).__walk('ArrowUp', 450));
    await page.waitForTimeout(350);
    const lockedAfter = await canvas.screenshot({ timeout: 60000 });
    expect(Buffer.compare(lockedBefore, lockedAfter), 'camera moved after comparison lock').toBe(0);

    await page.getByRole('radio', { name: /^Dog / }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Capture Dog comparison frame' }).click();
    await expect(region.locator('img')).toHaveCount(2);

    await page.getByRole('radio', { name: /^Cat / }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Capture Cat comparison frame' }).click();
    await expect(region.locator('img')).toHaveCount(3);
    await expect(region.getByText(/Comparison complete/)).toBeVisible();

    const captures = await region.locator('img').evaluateAll((images) => images.map((img) => {
      const el = img as HTMLImageElement;
      return { src: el.src, alt: el.alt, width: el.naturalWidth, height: el.naturalHeight };
    }));
    expect(new Set(captures.map((c) => c.src)).size).toBe(3);
    expect(new Set(captures.map((c) => c.width + 'x' + c.height)).size).toBe(1);
    expect(captures.reduce((sum, c) => sum + c.src.length, 0)).toBeLessThan(1_200_000);
    for (const [index, species] of ['Human', 'Dog', 'Cat'].entries()) {
      expect(captures[index].src).toMatch(/^data:image\/jpeg/);
      expect(captures[index].width).toBeGreaterThan(200);
      expect(captures[index].width).toBeLessThanOrEqual(520);
      expect(captures[index].alt).toContain(species + ' comparison frame');
      expect(captures[index].alt).toContain('acuity');
      expect(captures[index].alt).toContain('Illustrative approximation');
    }
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
    expect(await region.locator('canvas').count()).toBe(0);
    const persisted = await page.evaluate(() =>
      JSON.stringify((window as any).__toolData) + '|' + (localStorage.getItem('petsLab.state.v1') || ''));
    expect(persisted).not.toContain('data:image');

    // The complete page, not just the tray, now reflows to phone width.
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.locator('#wrap').evaluate((el) => { (el as HTMLElement).style.width = '320px'; });
    await page.waitForTimeout(180);
    const mobile = await page.evaluate(() => {
      const grid = document.querySelector('.petslab-sensory-compare-grid')!;
      return {
        pageWidth: document.documentElement.scrollWidth,
        wrapWidth: document.getElementById('wrap')?.scrollWidth || 0,
        columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      };
    });
    expect(mobile.pageWidth).toBeLessThanOrEqual(320);
    expect(mobile.wrapWidth).toBeLessThanOrEqual(320);
    expect(mobile.columns).toBe(1);

    await page.getByRole('button', { name: 'Clear comparison' }).click();
    await expect(region.locator('img')).toHaveCount(0);
    await expect(region.locator('.petslab-sensory-compare-empty')).toHaveCount(3);
    await expect(page.getByRole('button', { name: /Reset/ })).toBeEnabled();
    await expect(page.getByRole('button', { name: /Walk forward/ })).toBeEnabled();

    // Captures are ephemeral: closing and reopening the room starts clean.
    await page.getByRole('radio', { name: /^Human / }).click();
    await page.getByRole('button', { name: 'Capture Human comparison frame' }).click();
    await expect(region.locator('img')).toHaveCount(1);
    await page.getByRole('button', { name: /Leave the room/ }).click();
    await page.getByRole('button', { name: /Step into the room/ }).click();
    await expect(page.locator('#wrap canvas')).toHaveCount(1);
    await expect(region.locator('img')).toHaveCount(0);
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
