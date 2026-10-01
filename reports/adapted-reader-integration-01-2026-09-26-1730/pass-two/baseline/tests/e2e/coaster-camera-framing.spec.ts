import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_coasterlab.js', toolId: 'coasterLab', width: 1440, height: 960,
  probes: "document.head.insertAdjacentHTML('beforeend', '<style>#wrap{width:100%}.clab-root{width:100%;height:100vh!important}</style>');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test('fitted views keep the track visible and preserve manual camera control', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('coaster_lab_onboarding_v1', 'complete'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 960 });
  await harness.mount(page, {}, "document.querySelector('[aria-label=\"Coaster Lab 3-D designer\"]')._lab");
  const state = () => page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.cameraFraming());
  const fits = async () => {
    await expect.poll(async () => { const s = await state(); return s.autoFit && s.maxX < 0.87 && s.maxY < s.paddingY + 0.01 && s.minZ > -1 && s.maxZ < 1; }).toBe(true);
  };
  await fits();
  await page.locator('#clab-visualTheme').selectOption('daylight');
  await page.locator('#clab-btnSceneFocus').click();
  for(const [id, angle] of [['clab-btnFitCoaster', 0.42], ['clab-btnTopView', 1.55], ['clab-btnSideView', 0.08]] as const){
    const button = page.locator('#' + id); await button.focus(); await page.keyboard.press('Enter');
    await expect(button).toBeFocused();
    await expect.poll(async () => (await state()).phi).toBe(angle);
    await fits();
    await page.screenshot({ path: testInfo.outputPath(id + '.png') });
  }
  await page.locator('#clab-btnFitCoaster').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await fits();
  await expect(page.locator('#clab-viewTools')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('coaster-phone-fitted.png') });
  const box = (await page.locator('#clab-gl').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -120);
  await expect.poll(async () => (await state()).autoFit).toBe(false);
  const manual = await state();
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect.poll(async () => (await state()).radius).toBeCloseTo(manual.radius, 6);
  await page.locator('#clab-btnFitCoaster').click(); await fits();
  await page.locator('#clab-btnCam').click();
  await expect.poll(async () => (await state()).mode).toBe('onboard');
  await page.locator('#clab-btnTopView').click(); await fits();
  await expect.poll(async () => (await state()).mode).toBe('orbit');
  await page.locator('#clab-btnSceneFocus').click(); await fits();
  await expect(page.locator('#clab-side')).toBeVisible();
  await page.locator('#clab-btnGuide').click();
  await expect(page.locator('#clab-viewTools')).toBeHidden();
  await page.locator('#clab-btnGuideClose').click();
  await expect(page.locator('#clab-viewTools')).toBeVisible();
  expect(errors).toEqual([]);
});
