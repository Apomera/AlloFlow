import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_coasterlab.js', toolId: 'coasterLab', width: 1440, height: 960,
  probes: "document.head.insertAdjacentHTML('beforeend', '<style>#wrap{width:100%}.clab-root{width:100%;height:100vh!important}</style>');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test('bold rails and readable labels survive themes, heatmaps, rides, and reload', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if(msg.type() === 'error') errors.push(msg.text()); });
  await page.addInitScript(() => { localStorage.setItem('coaster_lab_onboarding_v1', 'complete'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 960 });
  const ready = "document.querySelector('[aria-label=\"Coaster Lab 3-D designer\"]')._lab";
  await harness.mount(page, {}, ready);
  const state = () => page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.trackReadability());
  const readAnalysis = () => page.evaluate(() => JSON.stringify((document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.analysis()));
  const before = await readAnalysis();
  const button = page.locator('#clab-btnBoldTrack');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(state).toMatchObject({ active: true, meshCount: 3, centersValid: true, shaderErrors: 0 });
  for(const theme of ['daylight', 'dusk', 'neon', 'blueprint']){
    await page.locator('#clab-visualTheme').selectOption(theme);
    await expect.poll(state).toMatchObject({ active: true, centersValid: true, shaderErrors: 0 });
    await page.screenshot({ path: testInfo.outputPath('bold-track-' + theme + '.png') });
  }
  const labels = (await state()).labels.filter((label: any) => label.visible);
  expect(labels.length).toBeGreaterThan(0);
  for(const label of labels) expect(label.height / ((await state()).worldPerPixel * label.depth)).toBeCloseTo(28, 2);
  await button.focus(); await page.keyboard.press('Enter');
  await expect(button).toBeFocused();
  await expect.poll(state).toMatchObject({ bold: false, active: false });
  await page.locator('#clab-visualTheme').selectOption('daylight');
  await page.screenshot({ path: testInfo.outputPath('natural-track.png') });
  await button.press('Enter');
  for(const mode of ['speed', 'vertical', 'lateral', 'curvature']){
    await page.locator('#clab-trackViz').selectOption(mode);
    await expect.poll(state).toMatchObject({ heatmap: mode, active: true, centersValid: true, shaderErrors: 0 });
    await expect(page.locator('#clab-xrayLegend')).toBeVisible();
  }
  await page.screenshot({ path: testInfo.outputPath('bold-track-heatmap.png') });
  expect(await readAnalysis()).toBe(before);
  await page.locator('#clab-btnCam').click();
  await expect.poll(state).toMatchObject({ active: false, bold: true });
  await page.locator('#clab-btnFitCoaster').click();
  await expect.poll(state).toMatchObject({ active: true });
  await page.locator('#clab-trackViz').selectOption('track');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#clab-btnSceneFocus').click();
  await expect(button).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('bold-track-phone.png') });
  await button.click();
  await harness.destroy(page);
  await harness.mount(page, {}, ready);
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(state).toMatchObject({ bold: false, active: false, centersValid: true, shaderErrors: 0 });
  expect(errors).toEqual([]);
});
