import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_optics.js',
  toolId: 'opticsLab',
  width: 1100,
  height: 1400,
  appStyles: true,
});

const SETUP = { n1: 1.5, n2: 1.0, angle: 60, wavelength: 550 };

async function mountInquiry(page: any) {
  await harness.mount(page, { opticsLab: { mode: 'inquiry', snellInquiry: SETUP } },
    undefined, { expectCanvas: false });
  await page.waitForSelector('.opticslab-dark-inquiry', { timeout: 15000 });
}

// Screenshot-only; assertions live in 49-optics-inquiry-predict.spec.ts.
test.describe('Optics inquiry gate - visual review', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('captures the call, a right call and a wrong call', async ({ page }, testInfo) => {
    await mountInquiry(page);
    const panel = page.locator('.opticslab-dark-inquiry');
    await expect(panel).toBeVisible();
    await panel.screenshot({ path: testInfo.outputPath('01-before-call.png') });

    await page.locator('[data-op-inquiry-predict="tir"]').click();
    await expect(page.locator('.opticslab-inquiry-verdict')).toBeVisible();
    await panel.screenshot({ path: testInfo.outputPath('02-right-call.png') });

    await harness.destroy(page);
    await mountInquiry(page);
    await page.locator('[data-op-inquiry-predict="refract"]').click();
    await expect(page.locator('.opticslab-inquiry-verdict')).toBeVisible();
    await page.locator('.opticslab-dark-inquiry')
      .screenshot({ path: testInfo.outputPath('03-wrong-call.png') });
  });
});
