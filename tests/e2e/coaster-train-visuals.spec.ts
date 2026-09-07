import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_coasterlab.js', toolId: 'coasterLab', width: 1440, height: 960,
  probes: "document.head.insertAdjacentHTML('beforeend', '<style>#wrap{width:100%;height:100vh}.clab-root{width:100%;height:100vh!important}</style>');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test('train inspection preserves physics and frames detailed cars on desktop and phone', async ({ page }, testInfo) => {
  test.setTimeout(300000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('coaster_lab_onboarding_v1', 'complete'));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, {}, "document.querySelector('[aria-label=\"Coaster Lab 3-D designer\"]')._lab");
  const state = () => page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.trainPresentation());
  const analysis = () => page.evaluate(() => JSON.stringify((document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.analysis()));
  const original = await analysis();
  const button = page.locator('#clab-btnTrainView');
  await button.focus(); await button.press('Enter');
  await expect(page.locator('#clab-btnSceneFocus')).toBeFocused();
  await expect(page.locator('#clab-hud')).toBeHidden();
  const framed = async () => (await state()).projected.every((p: any) => Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && p.z >= -1 && p.z <= 1);
  await expect.poll(framed).toBe(true);
  expect(await state()).toMatchObject({ cushions: 2, lamps: 2, wheelsFinite: true, bodyGeometry: 'ExtrudeGeometry', fineDetailsVisible: true });
  for(const theme of ['daylight', 'dusk', 'neon', 'blueprint']){
    await page.locator('#clab-visualTheme').selectOption(theme);
    await page.screenshot({ path: testInfo.outputPath('train-' + theme + '.png') });
  }
  expect(await analysis()).toBe(original);
  await page.locator('#clab-btnFx').click();
  await expect.poll(async () => (await state()).fineDetailsVisible).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('train-lite.png') });
  await page.locator('#clab-btnFx').click();
  await expect.poll(async () => (await state()).fineDetailsVisible).toBe(true);
  await page.locator('#clab-btnSceneFocus').click();
  await page.locator('#clab-trainLen').selectOption('8');
  await expect.poll(async () => (await state()).cars).toBe(8);
  await page.locator('#clab-visualTheme').selectOption('daylight');
  await page.setViewportSize({ width: 390, height: 844 });
  await button.click(); await expect.poll(framed).toBe(true);
  await expect(page.locator('#clab-btnSceneFocus')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('train-phone.png') });
  await page.locator('#clab-btnFitCoaster').click();
  await expect.poll(() => page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.cameraFraming().autoFit)).toBe(true);
  await page.locator('#clab-btnSceneFocus').click();
  await expect(page.locator('#clab-side')).toBeVisible();
  expect(errors).toEqual([]);
});
