import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_coasterlab.js', toolId: 'coasterLab', width: 1440, height: 960,
  probes: "document.head.insertAdjacentHTML('beforeend', '<style>#wrap{width:100%}.clab-root{width:100%;height:100vh!important}</style>');"
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test('coaster scene presentation across lighting themes', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('coaster_lab_onboarding_v1', 'complete'); });
  await page.setViewportSize({ width: 1440, height: 960 });
  await harness.mount(page, {}, "document.querySelector('[aria-label=\"Coaster Lab 3-D designer\"]')._lab");
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for(const theme of ['dusk', 'daylight', 'neon', 'blueprint']){
    await page.locator('#clab-visualTheme').selectOption(theme);
    await expect(page.locator('.clab-root')).toHaveAttribute('data-visual-theme', theme);
    await expect.poll(() => page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.visualPresentation())).toMatchObject({ theme, ridgeCount: 3, ridgeWireframe: theme === 'blueprint', sceneryVisible: true });
    await page.screenshot({ path: testInfo.outputPath('coaster-scene-' + theme + '.png') });
  }
  await page.locator('#clab-visualTheme').selectOption('daylight');
  const canvas = page.locator('#clab-gl');
  const before = await canvas.boundingBox();
  const focus = page.locator('#clab-btnSceneFocus');
  await focus.focus(); await page.keyboard.press('Enter');
  await expect(focus).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#clab-side')).toBeHidden();
  await expect(page.locator('#clab-btnRun')).toBeVisible();
  await expect.poll(async () => (await canvas.boundingBox())?.width).toBeGreaterThan(before!.width + 100);
  await expect.poll(() => page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.visualPresentation())).toMatchObject({ sceneFocus: true, editHandlesVisible: false });
  await page.screenshot({ path: testInfo.outputPath('coaster-scene-focus.png') });
  await focus.press('Enter');
  await expect(focus).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#clab-side')).toBeVisible();
  await page.locator('#clab-btnFx').click();
  await expect.poll(() => page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.visualPresentation())).toMatchObject({ sceneryVisible: false });
  await page.locator('#clab-btnFx').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await focus.click();
  await expect(page.locator('#clab-side')).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('coaster-scene-phone.png') });
  await focus.click();
  await expect(page.locator('#clab-side')).toBeVisible();
  expect(errors).toEqual([]);
});
