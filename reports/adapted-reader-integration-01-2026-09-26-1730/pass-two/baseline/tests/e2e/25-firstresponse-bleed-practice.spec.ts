import { expect, test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js',
  toolId: 'firstResponse',
  width: 900,
  height: 720,
});

test.describe.configure({ timeout: 90_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const seed = (extra: Record<string, unknown> = {}) => ({
  firstResponse: Object.assign({ view: 'bleed', consentAccepted: true, bleedView: 'practice' }, extra),
});

async function holdPressure(page: any, name: string) {
  const button = page.getByRole('button', { name });
  await button.dispatchEvent('pointerdown', { pointerId: 9 });
  await page.waitForTimeout(2_650);
  await button.dispatchEvent('pointerup', { pointerId: 9 });
}

test.describe('First Response — interactive bleeding-control practice', () => {
  test('life-threatening thigh bleeding reaches safe tourniquet completion', async ({ page }) => {
    await harness.mount(page, seed(), undefined, { expectCanvas: false });
    await page.getByRole('button', { name: /Start bleeding-control scenario: Workshop/ }).click();
    await page.getByRole('button', { name: /Check scene safety, use gloves if available, call 911/ }).click();

    await holdPressure(page, 'Press and hold direct pressure');
    await page.getByRole('button', { name: 'Use a manufactured tourniquet if trained' }).click();
    await page.getByRole('button', { name: /Place it 2–3 inches above the wound/ }).click();

    await page.getByRole('button', { name: /Tighten the windlass/ }).click();
    await page.getByRole('button', { name: /Tighten the windlass/ }).click();
    await page.getByRole('button', { name: /Tighten until bleeding stops/ }).click();
    await page.getByRole('button', { name: /Note the application time/ }).click();

    await expect(page.getByText('BLEEDING-CONTROL SEQUENCE COMPLETE')).toBeVisible();
    const summary = await page.evaluate(() => (window as any).__toolData.firstResponse.bleedPracticeBest);
    expect(summary).toMatchObject({ caseId: 'thigh', kind: 'limb', mistakes: 0 });
    expect(summary.sequence).toEqual([
      'scene-safety-ppe-911',
      'direct-pressure',
      'choose-tourniquet',
      'tourniquet-2-3-inches-above-not-joint',
      'tighten-until-bleeding-stops',
      'note-time-leave-in-place',
    ]);
  });

  test('deep groin bleeding routes to packing and continued pressure', async ({ page }) => {
    await harness.mount(page, seed(), undefined, { expectCanvas: false });
    await page.getByRole('button', { name: /Start bleeding-control scenario: Bike crash/ }).click();
    await page.getByRole('button', { name: /Check scene safety, use gloves if available, call 911/ }).click();

    await holdPressure(page, 'Press and hold direct pressure');
    await page.getByRole('button', { name: /Pack the deep wound with gauze if trained/ }).click();
    await page.getByRole('button', { name: /Pack gauze firmly into the deep wound/ }).click();
    await holdPressure(page, 'Press and hold after wound packing');

    await expect(page.getByText('BLEEDING-CONTROL SEQUENCE COMPLETE')).toBeVisible();
    const summary = await page.evaluate(() => (window as any).__toolData.firstResponse.bleedPracticeBest);
    expect(summary).toMatchObject({ caseId: 'groin', kind: 'junction', mistakes: 0 });
    expect(summary.sequence).toEqual([
      'scene-safety-ppe-911',
      'direct-pressure',
      'choose-wound-packing',
      'pack-deep-wound',
      'pressure-after-packing',
    ]);
  });
});
