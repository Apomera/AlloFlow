import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_coasterlab.js', toolId: 'coasterLab', width: 1440, height: 960,
  probes: "document.head.insertAdjacentHTML('beforeend', '<style>#wrap{width:100%;height:100vh}.clab-root{width:100%;height:100vh!important}</style>');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test('station view frames the canopy and grounded platform through themes and edits', async ({ page }, testInfo) => {
  test.setTimeout(300000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('coaster_lab_onboarding_v1', 'complete'));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, {}, "document.querySelector('[aria-label=\"Coaster Lab 3-D designer\"]')._lab");
  const state = () => page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.stationPresentation());
  const analysis = () => page.evaluate(() => JSON.stringify((document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.analysis()));
  const original = await analysis();
  const button = page.locator('#clab-btnStationView');
  await button.focus(); await button.press('Enter');
  await expect(page.locator('#clab-btnSceneFocus')).toBeFocused();
  await expect(page.locator('#clab-side')).toBeHidden();
  await expect(page.locator('#clab-hud')).toBeHidden();
  const framed = async () => (await state()).projected.every((point: any) => Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z >= -1 && point.z <= 1);
  await expect.poll(framed).toBe(true);
  expect((await state()).canopyPanels).toBe(2);
  for(const theme of ['daylight', 'dusk', 'neon', 'blueprint']){
    await page.locator('#clab-visualTheme').selectOption(theme);
    await page.screenshot({ path: testInfo.outputPath('station-' + theme + '.png') });
  }
  expect(await analysis()).toBe(original);
  await page.locator('#clab-visualTheme').selectOption('daylight');
  await page.screenshot({ path: testInfo.outputPath('station-scene-focus.png') });
  await page.locator('#clab-btnSceneFocus').click();
  await page.evaluate(() => {
    const lab = (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab;
    const design = JSON.parse(lab.exportDesign()); design.points[0].y = 15; lab.importDesign(JSON.stringify(design));
  });
  await button.click(); await expect.poll(framed).toBe(true);
  let model = await state();
  expect(model.padsVisible).toBe(true);
  for(let i = 0; i < 4; i++) expect(model.worldY + model.pads[i * 16 + 13] - 0.12).toBeCloseTo(0, 4);
  expect(model.columnMatrices.every(Number.isFinite)).toBe(true);
  await page.locator('#clab-btnFx').click();
  await expect.poll(framed).toBe(true);
  await page.locator('#clab-btnFx').click();
  await page.locator('#clab-btnSceneFocus').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await button.click(); await expect.poll(framed).toBe(true);
  await expect(page.locator('#clab-btnSceneFocus')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('station-phone-elevated.png') });
  await page.locator('#clab-btnFitCoaster').click();
  await expect.poll(() => page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.cameraFraming().autoFit)).toBe(true);
  await page.locator('#clab-btnSceneFocus').click();
  await expect(page.locator('#clab-side')).toBeVisible();
  expect(errors).toEqual([]);
});
