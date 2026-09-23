import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { opticsSetupKey } from '../helpers/optics_prediction.js';

/**
 * Optics Lab, the six TOPIC tabs — the solved answer waits for a prediction.
 *
 * Each topic panel runs a Predict -> Explore -> Explain loop and says so
 * plainly ("Predict whether the image will be real or virtual BEFORE you
 * look"), but the Live calculation panel sat directly under the prediction
 * notebook with d_i, the magnification and the image type already solved. The
 * rational move was to read the answer off and type it back in. The Inquiry
 * tab was given a commit-then-reveal gate on 2026-09-15; these pin the same
 * contract for the six shared topic panels, which that pass did not reach.
 *
 * What these pin is the SPLIT, not the pixels:
 *   - the derived outcome is withheld before a prediction exists,
 *   - the governing equation, the student's OWN inputs and the diagram
 *     caveats stay visible, because those help form a prediction rather than
 *     hand it over,
 *   - the reveal is keyed to the SETUP, so moving a control asks again.
 *
 * The masked cells carry `data-op-masked`, so these assert on the gate rather
 * than on a copy string that could be reworded out from under them.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_optics.js',
  toolId: 'opticsLab',
  width: 1100,
  height: 1600,
  appStyles: true,
});

// The lenses default (converging, f=12, d_o=25) forms a real image, so every
// outcome row has a value to hide.
const LENS_SETUP = { lensType: 'converging', lensFocal: 12, lensDo: 25, lensObjH: 6, lensScreenCm: 15, lensShow3D: false };

/**
 * The setup key the tool computes for the lens tab. Built by the shared helper,
 * which reads OPTICS_PREDICTION_KEYS out of the tool source, so this spec cannot
 * hold its own stale copy of which controls count. (It used to: a hand-copied
 * field list here still included object height and screen distance after the
 * tool stopped keying on them.)
 */
function lensKey(over: Record<string, unknown> = {}) {
  return opticsSetupKey('lenses', { ...LENS_SETUP, ...over });
}

async function mountLenses(page: any, extra: Record<string, unknown> = {}) {
  await harness.mount(page, { opticsLab: { mode: 'lenses', ...LENS_SETUP, ...extra } },
    undefined, { expectCanvas: false });
  await page.waitForSelector('.opticslab-topic-page', { timeout: 15000 });
}

const maskedCount = (page: any) => page.locator('[data-op-masked="true"]').count();

test.describe('Optics topic panels — the solved rows wait for a prediction', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('hides the derived outcome before any prediction is saved', async ({ page }) => {
    await mountLenses(page);

    // Something is actually masked — a gate that never fires would pass every
    // other assertion here by doing nothing.
    expect(await maskedCount(page), 'no row was masked, so the gate never fired').toBeGreaterThan(0);

    const body = await page.locator('body').innerText();
    // The answer: solved image position, size and kind.
    expect(body, 'd_i was readable before committing').not.toMatch(/23\.08|d_i\s*\n?\s*\d/);
    expect(body).not.toMatch(/✓ Real \(light converges/);
  });

  test('keeps the equation, the student inputs and the caveats visible', async ({ page }) => {
    await mountLenses(page);
    const body = await page.locator('body').innerText();

    // Teaching content: hiding this would make the prediction HARDER, not
    // more honest. An earlier attempt hid the whole panel and did exactly that.
    expect(body, 'the governing equation should help form the prediction').toMatch(/1\/f = 1\/d_o \+ 1\/d_i/);
    expect(body, 'the sign rules are how a student reasons to an answer').toMatch(/f > 0 for converging/);
    // The student chose these; they are not the answer.
    expect(body).toMatch(/12\.00 cm/); // f
    expect(body).toMatch(/25\.00 cm/); // d_o
  });

  test('a prediction for THIS setup reveals the outcome', async ({ page }) => {
    await mountLenses(page, {
      opPredictionNotes: { lenses: 'Real, inverted and smaller than the object.' },
      opPredictionSetups: { lenses: lensKey() },
    });

    expect(await maskedCount(page), 'the outcome stayed hidden after a valid prediction').toBe(0);
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/✓ Real \(light converges/);
  });

  test('moving a control asks again rather than staying unlocked', async ({ page }) => {
    // The saved prediction was about d_o = 25; this panel is showing d_o = 40.
    // A different configuration is a different question.
    await mountLenses(page, {
      lensDo: 40,
      opPredictionNotes: { lenses: 'Real, inverted and smaller than the object.' },
      opPredictionSetups: { lenses: lensKey() },
    });

    expect(await maskedCount(page), 'one prediction unlocked a setup it was not made for').toBeGreaterThan(0);
    // The note is not thrown away — the copy explains why it re-locked.
    await expect(page.locator('.opticslab-topic-page')).toContainText(/You changed the setup/i);
  });

  test('a prediction with no recorded setup does not unlock anything', async ({ page }) => {
    // A project saved before this gate existed carries notes but no setup map.
    await mountLenses(page, { opPredictionNotes: { lenses: 'Something will happen.' } });
    expect(await maskedCount(page), 'a note with no setup key unlocked the answer').toBeGreaterThan(0);
  });

  test('survives a hostile saved project instead of blanking the tab', async ({ page }) => {
    // A saved file is INPUT: it can be hand-edited or carried across versions.
    for (const bad of [
      { opPredictionNotes: 'not-an-object' },
      { opPredictionSetups: ['not', 'an', 'object'] },
      { opPredictionNotes: { lenses: 'x' }, opPredictionSetups: 'nope' },
      { opPredictionNotes: null, opPredictionSetups: null },
    ]) {
      await mountLenses(page, bad as Record<string, unknown>);
      // The tab still renders, and a malformed unlock never counts as one.
      await expect(page.locator('.opticslab-topic-page')).toBeVisible();
      expect(await maskedCount(page), `hostile state unlocked the answer: ${JSON.stringify(bad)}`).toBeGreaterThan(0);
      await harness.destroy(page);
    }
  });

  test('switching to the 3-D view does NOT re-lock an answered prediction', async ({ page }) => {
    // A student who predicts and then switches to the 3-D view to LOOK at the
    // same setup was being asked to predict again — the view toggles were in
    // the setup key even though they only choose how the setup is DRAWN
    // (showLens3D / showMirror3D / showRefraction3D / showWindow) and reach no
    // calculator. That punishes exactly the behaviour the panel encourages.
    //
    // The key is built from the tool's OWN control-key list rather than a copy
    // here, so this cannot keep passing if that list changes shape.
    const setupKey = lensKey();

    await mountLenses(page, {
      opPredictionNotes: { lenses: 'Real, inverted and smaller than the object.' },
      opPredictionSetups: { lenses: setupKey },
    });
    const revealed = await maskedCount(page);
    expect(revealed, 'the prediction did not unlock the outcome to begin with — test proves nothing')
      .toBe(0);

    // Same physics, different picture.
    await mountLenses(page, {
      lensShow3D: true,
      opPredictionNotes: { lenses: 'Real, inverted and smaller than the object.' },
      opPredictionSetups: { lenses: setupKey },
    });
    expect(await maskedCount(page),
      'switching to the 3-D view re-locked the answer for unchanged physics')
      .toBe(0);
  });

  test('the refraction window view does not re-lock, and does not change the answer', async ({ page }) => {
    // refrShowWindow is the least obviously "view-only" of the four toggles
    // that left the setup key: it swaps a single interface for a glass-slab
    // window, which LOOKS like a different experiment. It is not — the window
    // panel renders a scene built from n1, n2 and theta_c, all already fixed
    // by the refraction controls, and none of the five gated outcome rows
    // (theta2 / Result / Bending / Transmitted power / Reflected power) read
    // it. This asserts both halves of that claim.
    const REFR = { refrN1: 1.333, refrN2: 1.000, refrTheta1: 30 };
    const refrKey = opticsSetupKey('refraction', REFR);
    const answered = {
      opPredictionNotes: { refraction: 'Bends away from the normal; no TIR at 30 degrees.' },
      opPredictionSetups: { refraction: refrKey },
    };

    const mountRefraction = async (extra: Record<string, unknown>) => {
      await harness.mount(page, { opticsLab: { mode: 'refraction', ...REFR, ...extra } },
        undefined, { expectCanvas: false });
      await page.waitForSelector('.opticslab-topic-page', { timeout: 15000 });
    };
    // Read the gated rows as text so we can compare the ANSWER either way.
    // The calc rows are grid DIVs, not table rows — each holds a label span
    // and a value span, and only the value span carries data-op-masked.
    const outcomeText = () => page.evaluate(() => {
      const labels = ['θ₂', 'Result', 'Bending', 'Transmitted power', 'Reflected power'];
      const out: string[] = [];
      document.querySelectorAll('.opticslab-topic-page span').forEach((el) => {
        const label = (el.textContent || '').trim();
        if (!labels.some((l) => label.startsWith(l))) return;
        const value = (el.nextElementSibling && el.nextElementSibling.textContent || '').trim();
        if (value) out.push(label + '=' + value);
      });
      return out.join(' || ');
    });

    await mountRefraction(answered);
    const flat = await maskedCount(page);
    expect(flat, 'the prediction did not unlock refraction to begin with — test proves nothing')
      .toBe(0);
    const flatAnswer = await outcomeText();
    expect(flatAnswer, 'no refraction outcome rows were rendered').not.toBe('');

    await mountRefraction({ ...answered, refrShowWindow: true });
    expect(await maskedCount(page),
      'turning on the window view re-locked the answer for unchanged physics').toBe(0);
    expect(await outcomeText(),
      'the window view changed the refraction answer — it is not view-only after all')
      .toBe(flatAnswer);
  });

  test('a non-string saved prediction renders instead of blanking the tab', async ({ page }) => {
    // A saved project is INPUT. opPredictionNotes[tab] is type-checked at the
    // CONTAINER but not at the value, so a project carrying a number (or an
    // object) reaches the render path. The panel coerces with String(...), so
    // this should render, not throw — an unguarded throw here would blank the
    // whole lab, since the shell's error boundary is unkeyed.
    const hostile: Array<[string, unknown]> = [
      ['number', 42],
      ['object', { nested: true }],
      ['array', ['a', 'b']],
      ['boolean', true],
    ];
    for (const [label, value] of hostile) {
      const errors: string[] = [];
      page.on('pageerror', (e: Error) => errors.push(String(e)));
      await harness.mount(page, {
        opticsLab: {
          mode: 'lenses', ...LENS_SETUP,
          opPredictionNotes: { lenses: value },
          opPredictionSetups: { lenses: lensKey() },
        },
      }, undefined, { expectCanvas: false });
      await page.waitForSelector('.opticslab-topic-page', { timeout: 15000 });
      const rows = await page.locator('.opticslab-topic-page').count();
      expect(rows, `a ${label} prediction blanked the topic panel`).toBeGreaterThan(0);
      expect(errors.filter((e) => !/ResizeObserver loop/.test(e)),
        `a ${label} prediction threw`).toEqual([]);
      await harness.destroy(page);
    }
  });

  test('the gate applies across the topic tabs, not just lenses', async ({ page }) => {
    for (const mode of ['reflection', 'refraction', 'interference', 'diffraction', 'polarization']) {
      await harness.mount(page, { opticsLab: { mode } }, undefined, { expectCanvas: false });
      await page.waitForSelector('.opticslab-topic-page', { timeout: 15000 });
      expect(await maskedCount(page), `${mode} masked nothing`).toBeGreaterThan(0);
      await harness.destroy(page);
    }
  });
});
