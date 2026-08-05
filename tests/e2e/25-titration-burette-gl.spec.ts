import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Titration Lab — the burette parallax station. REAL WebGL smoke.
 *
 * The jsdom suite (titration_graded_unknown) pins the model: the mL of error a
 * given eye height causes, the seeded unknowns, the endpoint ladder, the grading.
 * It also pins the accessible side elevation, because jsdom has no WebGL and so
 * every one of those tests exercises the FALLBACK path.
 *
 * What none of that can see is whether the 3D station ever draws at all, or
 * whether the eye-height slider actually moves the geometry. That second one is
 * the assertion that matters most here: the whole point of the station is that
 * the sight line visibly crosses the scale away from the meniscus. If the scene
 * were built once and never rebuilt, every screenshot would still look like a
 * perfectly good burette — it would simply have stopped teaching anything, and
 * no snapshot, gate, or jsdom test in the repo would notice.
 *
 * Loads the real host for window.StemLab.makeOrbitViewer. Order matters: the host
 * installs its registry behind `if (!window.StemLab)`, so a tool stub defined
 * first wins permanently and the viewer factory silently goes missing. That is
 * what preScripts (not extraScripts) is for — see specs 23 and 24.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_titration.js',
  toolId: 'titrationLab',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1000,
  height: 760,
  probes: `
    window.__hostShell = function () {
      return !!(window.StemLab && typeof window.StemLab.makeOrbitViewer === 'function');
    };
    window.__gl = function () {
      return window.__alloBuretteGL ? window.__alloBuretteGL.debug() : null;
    };
    window.__setEye = function (cm) { window.__ctx.update('titrationLab', 'gEyeCm', cm); };
    window.__rot = function () {
      return (window.__toolData.titrationLab || {}).gRot3d || null;
    };
    window.__key = function (k) {
      var el = document.querySelector('#wrap [role="img"][tabindex="0"]');
      if (!el) return false;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      return true;
    };
  `,
});

test.describe.configure({ timeout: 150_000 });

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

// Past the mandatory safety walkthrough, in the graded mode, on a run whose
// unknown is fixed by its seed.
const seed = (extra: Record<string, unknown> = {}) => ({
  titrationLab: Object.assign(
    { safetyChecked: true, labTab: 'challenge', chMode: 'graded', gRun: 1, gVb: 10, gEyeCm: 0 },
    extra,
  ),
});

test.describe('Titration Lab — burette parallax station on real WebGL', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('the station builds a live GL context from the shared host shell', async ({ page }) => {
    await harness.mount(page, seed());

    expect(await page.evaluate(() => (window as any).__hostShell()),
      'host did not expose makeOrbitViewer — check preScripts ordering').toBe(true);

    const live = await page.evaluate(() => (window as any).__glLive());
    expect(live, 'no GL canvas in the burette station').not.toBeNull();
    expect(live.lost, 'GL context was lost').toBe(false);
    expect(live.box.w).toBeGreaterThan(100);

    const errors = await page.evaluate(() => (window as any).__events.errors);
    expect(errors, 'errors while building the burette').toEqual([]);
  });

  test('the scene reports the meniscus and the sight-line crossing', async ({ page }) => {
    await harness.mount(page, seed({ gEyeCm: 0 }));
    const level = await page.evaluate(() => (window as any).__gl());
    expect(level.state).toBe('ready');
    // Eye level: the sight line meets the scale exactly at the meniscus.
    expect(Math.abs(level.crossY - level.meniscusY)).toBeLessThan(1e-6);

    await page.evaluate(() => (window as any).__setEye(15));
    await page.waitForTimeout(900);
    const high = await page.evaluate(() => (window as any).__gl());
    // Eye above -> the crossing rides ABOVE the meniscus, which on a burette
    // (numbers increasing downward) is what makes the reading come out low.
    expect(high.crossY).toBeGreaterThan(high.meniscusY);
  });

  // THE assertion this spec exists for.
  test('moving the eye rebuilds the geometry, it is not a cosmetic slider', async ({ page }) => {
    await harness.mount(page, seed({ gEyeCm: 0 }));
    const level = await page.locator('#wrap canvas[data-titration-burette-gl]').screenshot();

    await page.evaluate(() => (window as any).__setEye(18));
    await page.waitForTimeout(1200);
    const high = await page.locator('#wrap canvas[data-titration-burette-gl]').screenshot();

    expect(Buffer.compare(level, high),
      'raising the eye did not change the picture — the station is decorative').not.toBe(0);

    await page.evaluate(() => (window as any).__setEye(-18));
    await page.waitForTimeout(1200);
    const low = await page.locator('#wrap canvas[data-titration-burette-gl]').screenshot();

    expect(Buffer.compare(high, low),
      'above and below the meniscus render identically — the sign is lost').not.toBe(0);
  });

  // The caption used to say "drag to orbit" while the camera was pushed as a
  // constant, so the diagram could not actually be walked around at all.
  test('the camera really orbits, by keyboard as well as by drag', async ({ page }) => {
    await harness.mount(page, seed({ gEyeCm: 12 }));
    const sel = '#wrap canvas[data-titration-burette-gl]';
    const home = await page.locator(sel).screenshot();

    // Keyboard first: a mouse-only camera is a dead control for anyone who cannot use one.
    expect(await page.evaluate(() => (window as any).__key('ArrowRight')), 'no focusable 3D container').toBe(true);
    for (let i = 0; i < 5; i++) await page.evaluate(() => (window as any).__key('ArrowRight'));
    await page.waitForTimeout(1000);
    const turned = await page.locator(sel).screenshot();
    expect(Buffer.compare(home, turned), 'arrow keys did not move the camera').not.toBe(0);
    expect((await page.evaluate(() => (window as any).__rot())).rotY).toBeGreaterThan(34);

    // Drag.
    const box = (await page.locator(sel).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(900);
    const dragged = await page.locator(sel).screenshot();
    expect(Buffer.compare(turned, dragged), 'dragging did not move the camera').not.toBe(0);

    // 0 returns to the home view.
    await page.evaluate(() => (window as any).__key('0'));
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => (window as any).__rot())).toEqual({ rotY: 34, rotX: 6 });
  });

  // Every eye-height step rebuilds the scene. disposeGroup() upstream frees geometry
  // and material but not material.map, so the scale numbers would leak one texture
  // set per tick of the slider without the explicit dispose in buildBuretteScene.
  test('rebuilding for a new eye height does not leak label textures', async ({ page }) => {
    await harness.mount(page, seed({ gEyeCm: 0 }));
    await page.waitForTimeout(700);
    const first = await page.evaluate(() => (window as any).__gl());
    expect(first.labelTextures, 'the scale is not numbered').toBeGreaterThan(3);

    for (let cm = 1; cm <= 16; cm++) {
      await page.evaluate((v) => (window as any).__setEye(v), cm);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => (window as any).__gl());
    expect(after.labelTextures,
      `label textures grew ${first.labelTextures} -> ${after.labelTextures} across 16 rebuilds`)
      .toBeLessThanOrEqual(first.labelTextures + 2);
    expect(after.objects).toBeLessThanOrEqual(first.objects + 2);
  });

  test('the canvas is hidden from assistive tech, and the numbers are not', async ({ page }) => {
    await harness.mount(page, seed({ gEyeCm: 10 }));
    const canvasHidden = await page.evaluate(() => {
      const c = document.querySelector('#wrap canvas[data-titration-burette-gl]');
      return c ? c.getAttribute('aria-hidden') : null;
    });
    expect(canvasHidden, 'the GL canvas should be aria-hidden').toBe('true');

    // The reading and its cause stay in the DOM regardless of what WebGL did.
    await expect(page.locator('#wrap')).toContainText('BURETTE READS');
    await expect(page.locator('#wrap')).toContainText('reads LOW by 0.167');
  });
});

/**
 * The Equipment tab's glassware bench. Same host shell, different scene.
 *
 * The claim this scene makes is quantitative — one millilitre stands 10.5 mm tall in a
 * burette bore and 0.3 mm in a beaker — so the assertions check that the six vessels
 * are actually built and that selecting a different one rebuilds the picture, rather
 * than that it merely looks like glassware.
 */
test.describe('Titration Lab — glassware bench on real WebGL', () => {
  const bench = (extra: Record<string, unknown> = {}) => ({
    titrationLab: Object.assign({ safetyChecked: true, labTab: 'equipment', benchSel: 'burette' }, extra),
  });
  const SEL = '#wrap canvas[data-titration-bench-gl]';

  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('builds all six vessels in a live context', async ({ page }) => {
    await harness.mount(page, bench());
    await page.waitForTimeout(900);
    const dbg = await page.evaluate(() => (window as any).__alloBenchGL.debug());
    expect(dbg.state).toBe('ready');
    expect(dbg.contextLost).toBe(false);
    expect(dbg.vessels, 'not every vessel reached the bench').toBe(6);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('choosing a different vessel rebuilds the bench', async ({ page }) => {
    await harness.mount(page, bench({ benchSel: 'burette' }));
    await page.waitForTimeout(900);
    const burette = await page.locator(SEL).screenshot();

    await page.evaluate(() => (window as any).__ctx.update('titrationLab', 'benchSel', 'beaker'));
    await page.waitForTimeout(1100);
    const beaker = await page.locator(SEL).screenshot();

    expect(Buffer.compare(burette, beaker),
      'selecting a different vessel changed nothing — the selector is cosmetic').not.toBe(0);
  });

  test('does not leak label textures as the selection changes', async ({ page }) => {
    await harness.mount(page, bench());
    await page.waitForTimeout(800);
    const first = (await page.evaluate(() => (window as any).__alloBenchGL.debug())).labelTextures;
    expect(first).toBeGreaterThan(4);
    for (const id of ['pipette', 'volflask', 'cylinder', 'conical', 'beaker', 'burette',
                      'pipette', 'volflask', 'cylinder', 'conical']) {
      await page.evaluate((v) => (window as any).__ctx.update('titrationLab', 'benchSel', v), id);
      await page.waitForTimeout(70);
    }
    await page.waitForTimeout(900);
    const after = (await page.evaluate(() => (window as any).__alloBenchGL.debug())).labelTextures;
    expect(after, `label textures grew ${first} -> ${after} across 10 rebuilds`)
      .toBeLessThanOrEqual(first + 2);
  });

  test('the bench is keyboard-orbitable and describes itself', async ({ page }) => {
    await harness.mount(page, bench());
    await page.waitForTimeout(900);
    const home = await page.locator(SEL).screenshot();

    const label = await page.evaluate(() => {
      const el = document.querySelector('#wrap div[role="img"][tabindex="0"]');
      return el ? el.getAttribute('aria-label') : null;
    });
    expect(label, 'bench container is not focusable or not labelled').toBeTruthy();
    expect(label).toContain('one millilitre stands 10.5 millimetres tall');
    expect(label).toContain('one millilitre stands 0.3 millimetres tall');

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        const el = document.querySelector('#wrap div[role="img"][tabindex="0"]')!;
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      });
    }
    await page.waitForTimeout(1000);
    const turned = await page.locator(SEL).screenshot();
    expect(Buffer.compare(home, turned), 'arrow keys did not orbit the bench').not.toBe(0);
  });
});
