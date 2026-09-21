import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

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

/** The setup key the tool computes: sorted `key=value` pairs for that tab. */
function lensKey(over: Record<string, unknown> = {}) {
  const s: Record<string, unknown> = { ...LENS_SETUP, ...over };
  return Object.keys(s).sort().map((k) => `${k}=${s[k]}`).join('|');
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

  test('the gate applies across the topic tabs, not just lenses', async ({ page }) => {
    for (const mode of ['reflection', 'refraction', 'interference', 'diffraction', 'polarization']) {
      await harness.mount(page, { opticsLab: { mode } }, undefined, { expectCanvas: false });
      await page.waitForSelector('.opticslab-topic-page', { timeout: 15000 });
      expect(await maskedCount(page), `${mode} masked nothing`).toBeGreaterThan(0);
      await harness.destroy(page);
    }
  });
});
