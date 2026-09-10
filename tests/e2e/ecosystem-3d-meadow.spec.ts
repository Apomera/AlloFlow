import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: any) {
  await page.setViewportSize({ width: 1140, height: 940 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white'; });
}

test('3D meadow shares exact data, supports camera/keyboard controls and survives view changes', async ({ page }) => {
  await mount(page);
  await expect(page.locator('.efw-meadow-stage canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  const meadow = page.locator('[data-efw-meadow]');
  const canvas = meadow.locator('canvas');
  await expect(page.getByRole('button', { name: 'Reset camera', exact: true })).toBeVisible();
  await expect(canvas).toHaveAttribute('data-biomass-foxes', '9');
  await expect(canvas).toHaveAttribute('data-glyphs-foxes', '7');
  await meadow.getByRole('button', { name: /Barn owls/ }).focus();
  await meadow.getByRole('button', { name: /Barn owls/ }).press('Enter');
  await expect(page.locator('[data-efw-relationships]')).toContainText('Meadow voles → Barn owls');
  const before = await canvas.screenshot();
  await page.getByRole('button', { name: 'Rotate left', exact: true }).click();
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
  await meadow.screenshot({ path: 'reports/ecosystem-3d-meadow/desktop.png' });
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-step', '240');
  await expect(canvas).toHaveAttribute('data-biomass-foxes', '0');
  await expect(canvas).toHaveAttribute('data-glyphs-foxes', '0');
  await page.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  const expected = await page.evaluate(() => {
    const w = window as any;
    return w.StemLab.ecosystemFoodWeb.compare(w.__toolData.ecosystem.foodWeb.run.config).baseline[240].values.foxes;
  });
  await expect(canvas).toHaveAttribute('data-biomass-foxes', String(expected));
  await page.getByLabel('Meadow scene data', { exact: true }).selectOption('experiment');
  const time = page.getByRole('slider', { name: 'Meadow timeline', exact: true });
  await time.focus(); await time.press('Home');
  await expect(page.getByRole('slider', { name: 'Food-web comparison time', exact: true })).toHaveValue('0');
  await expect(canvas).toHaveAttribute('data-biomass-foxes', '9');
  // Save the interval callback to reproduce a tick already queued when Pause is pressed.
  await page.evaluate(()=>{
    const w=window as any;w.__ecoOriginalInterval=window.setInterval;
    w.setInterval=function(callback:any,delay:number,...args:any[]){
      if(delay===100)w.__ecoQueuedTick=callback;
      return w.__ecoOriginalInterval(callback,delay,...args);
    };
  });
  await page.getByRole('button', { name: 'Play meadow timeline', exact: true }).click();
  await expect.poll(async () => Number(await time.inputValue())).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Pause meadow timeline', exact: true }).click();
  const paused = await time.inputValue();
  await page.evaluate(()=>{
    const w=window as any;window.setInterval=w.__ecoOriginalInterval;
    if(typeof w.__ecoQueuedTick!=='function')throw new Error('Timeline callback was not captured');
    w.__ecoQueuedTick();
  });
  await page.waitForTimeout(350);
  await expect(time).toHaveValue(paused);
  await expect(canvas).toHaveAttribute('data-step', paused);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(meadow).toContainText('Reduced motion is on');
  await expect(page.getByRole('button', { name: 'Play meadow timeline', exact: true })).toHaveCount(0);
  await time.focus(); await time.press('End');
  await expect(canvas).toHaveAttribute('data-biomass-foxes', '0');
  await page.setViewportSize({ width: 390, height: 844 });
  await meadow.screenshot({ path: 'reports/ecosystem-3d-meadow/mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const size = await canvas.evaluate(el => ({ w: el.width, css: el.getBoundingClientRect().width }));
  expect(size.w).toBeLessThanOrEqual(Math.ceil(size.css * 1.5));
  await page.getByRole('button', { name: 'Hide 3D meadow', exact: true }).click();
  await expect(canvas).toHaveCount(0);
  await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-step', '240');
  await expect(canvas).toHaveAttribute('data-glyphs-foxes', '0');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('unavailable WebGL retains the diagram, data and controls', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => { (window as any).THREE.WebGLRenderer = function() { throw new Error('WebGL disabled for test'); }; });
  await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  await expect(page.locator('[data-efw-meadow]')).toContainText('3D is unavailable on this device');
  await expect(page.locator('.efw-node')).toHaveCount(5);
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  await expect(page.locator('[data-efw-results]')).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Meadow timeline', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('losing a graphics context exposes a usable fallback', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  const canvas = page.locator('.efw-meadow-stage canvas');
  await expect(canvas).toHaveAttribute('data-step', '0');
  await canvas.evaluate(el => el.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator('[data-efw-meadow]')).toContainText('3D is unavailable on this device');
  await expect(page.locator('.efw-node')).toHaveCount(5);
  await page.getByRole('button', { name: 'Hide 3D meadow', exact: true }).click();
  await expect(canvas).toHaveCount(0);
});
