import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Optics Lab, Inquiry sandbox — predict before the answer shows.
 *
 * The tab is billed as "Snell's law sandbox — predict TIR + dispersion", but
 * the refracted angle, the critical angle and the TIR verdict were all on
 * screen while the copy asked the student to "record a hypothesis". A
 * hypothesis formed with the answer visible is not a prediction.
 *
 * These pin the gate, not the pixels: nothing that reveals the outcome renders
 * until a call is made, the call is keyed to the SETUP so a new n1/n2/angle
 * asks again, and sweeping the wavelength afterwards does NOT re-lock (that is
 * the dispersion exploration the tab exists for).
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_optics.js',
  toolId: 'opticsLab',
  width: 1100,
  height: 1400,
  appStyles: true,
});

type ToolWindow = Window & { __toolData: { opticsLab: Record<string, any> } };
const readOptics = (page: any) =>
  page.evaluate(() => (window as unknown as ToolWindow).__toolData.opticsLab);

// n1 > n2 and a steep angle => total internal reflection.
const TIR_SETUP = { n1: 1.5, n2: 1.0, angle: 60, wavelength: 550 };
// Into the denser medium => always refracts, no critical angle exists.
const REFRACT_SETUP = { n1: 1.0, n2: 1.5, angle: 30, wavelength: 550 };

async function mountInquiry(page: any, snellInquiry: Record<string, unknown>) {
  await harness.mount(page, { opticsLab: { mode: 'inquiry', snellInquiry } },
    undefined, { expectCanvas: false });
  // The harness returns on a fixed wait; the inquiry panel mounts a beat later.
  await page.waitForSelector('.opticslab-dark-inquiry', { timeout: 15000 });
}

test.describe('Optics Inquiry — the answer is hidden until the call', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('hides every readout that would give the outcome away', async ({ page }) => {
    await mountInquiry(page, TIR_SETUP);

    await expect(page.locator('.opticslab-inquiry-predict')).toBeVisible();
    await expect(page.locator('.opticslab-inquiry-verdict')).toHaveCount(0);

    // None of the three measurements, and no state badge.
    const body = await page.locator('body').innerText();
    expect(body, 'the critical angle was visible before the call').not.toMatch(/Critical angle/i);
    expect(body, 'the refracted angle was visible before the call').not.toMatch(/θ₂ \(refracted\)/);
    // The outgoing ray is the answer at a glance; a placeholder stands in.
    expect(body).toMatch(/call it first/i);
  });

  test('a correct TIR call reveals the measurements and explains why', async ({ page }) => {
    await mountInquiry(page, TIR_SETUP);

    await page.locator('[data-op-inquiry-predict="tir"]').click();

    const verdict = page.locator('.opticslab-inquiry-verdict');
    await expect(verdict).toContainText('Your call was right');
    await expect(verdict).toContainText(/sinθ₂ would exceed 1|trapped/i);

    // The gated readouts are now present.
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Critical angle/i);
    await expect(page.locator('.opticslab-inquiry-predict')).toHaveCount(0);

    const state = await readOptics(page);
    expect(state.snellInquiry.predictedOutcome).toBe('tir');
  });

  test('a wrong call is framed as the useful case, not a failure', async ({ page }) => {
    await mountInquiry(page, TIR_SETUP);

    // Say it refracts when it actually traps.
    await page.locator('[data-op-inquiry-predict="refract"]').click();

    const verdict = page.locator('.opticslab-inquiry-verdict');
    await expect(verdict).toContainText('which is the useful case');
    // Being wrong still reveals the measurements — the correction is the point.
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Critical angle/i);
  });

  test('explains correctly when no critical angle exists at all', async ({ page }) => {
    await mountInquiry(page, REFRACT_SETUP);

    await page.locator('[data-op-inquiry-predict="refract"]').click();
    const verdict = page.locator('.opticslab-inquiry-verdict');
    await expect(verdict).toContainText('Your call was right');
    // n1 <= n2, so the "raise the angle and it flips" line would be WRONG here.
    await expect(verdict).toContainText(/no critical angle here/i);
    await expect(verdict).not.toContainText(/Raise the angle/i);
  });

  // The two re-ask cases below are driven by re-seeding the mount rather than
  // by moving a slider: the inquiry controls live outside this block, and the
  // contract under test is the SETUP KEY, not the slider wiring.
  test('changing the setup asks again', async ({ page }) => {
    await mountInquiry(page, { ...TIR_SETUP, predictedFor: '1.500|1.000|60', predictedOutcome: 'tir' });
    await expect(page.locator('.opticslab-inquiry-verdict')).toBeVisible();

    // A different angle is a different question, so the stored key no longer
    // matches and the call is asked again.
    await harness.destroy(page);
    await mountInquiry(page, { ...TIR_SETUP, angle: 20, predictedFor: '1.500|1.000|60', predictedOutcome: 'tir' });
    await expect(page.locator('.opticslab-inquiry-predict')).toBeVisible();
    await expect(page.locator('.opticslab-inquiry-verdict')).toHaveCount(0);
  });

  test('sweeping the wavelength does NOT re-lock the answer', async ({ page }) => {
    // Watching dispersion is the follow-up this tab exists for; re-locking on
    // every nudge would punish exactly the right move. Wavelength is therefore
    // deliberately absent from the setup key.
    await mountInquiry(page, { ...TIR_SETUP, wavelength: 450, predictedFor: '1.500|1.000|60', predictedOutcome: 'tir' });
    await expect(page.locator('.opticslab-inquiry-verdict')).toBeVisible();
    await expect(page.locator('.opticslab-inquiry-predict')).toHaveCount(0);
  });

  test('a corrupt restored prediction asks again rather than unlocking', async ({ page }) => {
    await mountInquiry(page, { ...TIR_SETUP, predictedFor: 'not-this-setup', predictedOutcome: 'tir' });

    await expect(page.locator('.opticslab-inquiry-predict')).toBeVisible();
    await expect(page.locator('.opticslab-inquiry-verdict')).toHaveCount(0);
  });
});
