# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ecosystem-3d-meadow.spec.ts >> 3D meadow shares exact data, supports camera/keyboard controls and survives view changes
- Location: tests\e2e\ecosystem-3d-meadow.spec.ts:14:5

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByRole('slider', { name: 'Meadow timeline', exact: true })
Expected: "5"
Received: "6"
Timeout:  15000ms

Call log:
  - Expect "toHaveValue" with timeout 15000ms
  - waiting for getByRole('slider', { name: 'Meadow timeline', exact: true })
    32 × locator resolved to <input min="0" max="240" value="6" type="range" aria-label="Meadow timeline"/>
       - unexpected value "6"

```

```yaml
- slider "Meadow timeline": "6"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GlHarness } from './helpers/stem_gl_harness';
  3  | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
  4  | test.beforeAll(async () => harness.start());
  5  | test.afterAll(async () => harness.stop());
  6  | test.afterEach(async ({ page }) => harness.destroy(page));
  7  | 
  8  | async function mount(page: any) {
  9  |   await page.setViewportSize({ width: 1140, height: 940 });
  10 |   await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  11 |   await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white'; });
  12 | }
  13 | 
  14 | test('3D meadow shares exact data, supports camera/keyboard controls and survives view changes', async ({ page }) => {
  15 |   await mount(page);
  16 |   await expect(page.locator('.efw-meadow-stage canvas')).toHaveCount(0);
  17 |   await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  18 |   const meadow = page.locator('[data-efw-meadow]');
  19 |   const canvas = meadow.locator('canvas');
  20 |   await expect(page.getByRole('button', { name: 'Reset camera', exact: true })).toBeVisible();
  21 |   await expect(canvas).toHaveAttribute('data-biomass-foxes', '9');
  22 |   await expect(canvas).toHaveAttribute('data-glyphs-foxes', '7');
  23 |   await meadow.getByRole('button', { name: /Barn owls/ }).focus();
  24 |   await meadow.getByRole('button', { name: /Barn owls/ }).press('Enter');
  25 |   await expect(page.locator('[data-efw-relationships]')).toContainText('Meadow voles → Barn owls');
  26 |   const before = await canvas.screenshot();
  27 |   await page.getByRole('button', { name: 'Rotate left', exact: true }).click();
  28 |   expect((await canvas.screenshot()).equals(before)).toBe(false);
  29 |   await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
  30 |   await meadow.screenshot({ path: 'reports/ecosystem-3d-meadow/desktop.png' });
  31 |   await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  32 |   await expect(canvas).toHaveAttribute('data-step', '240');
  33 |   await expect(canvas).toHaveAttribute('data-biomass-foxes', '0');
  34 |   await expect(canvas).toHaveAttribute('data-glyphs-foxes', '0');
  35 |   await page.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  36 |   const expected = await page.evaluate(() => {
  37 |     const w = window as any;
  38 |     return w.StemLab.ecosystemFoodWeb.compare(w.__toolData.ecosystem.foodWeb.run.config).baseline[240].values.foxes;
  39 |   });
  40 |   await expect(canvas).toHaveAttribute('data-biomass-foxes', String(expected));
  41 |   await page.getByLabel('Meadow scene data', { exact: true }).selectOption('experiment');
  42 |   const time = page.getByRole('slider', { name: 'Meadow timeline', exact: true });
  43 |   await time.focus(); await time.press('Home');
  44 |   await expect(page.getByRole('slider', { name: 'Food-web comparison time', exact: true })).toHaveValue('0');
  45 |   await expect(canvas).toHaveAttribute('data-biomass-foxes', '9');
  46 |   await page.getByRole('button', { name: 'Play meadow timeline', exact: true }).click();
  47 |   await expect.poll(async () => Number(await time.inputValue())).toBeGreaterThan(1);
  48 |   await page.getByRole('button', { name: 'Pause meadow timeline', exact: true }).click();
  49 |   const paused = await time.inputValue();
  50 |   await page.waitForTimeout(350);
> 51 |   await expect(time).toHaveValue(paused);
     |                      ^ Error: expect(locator).toHaveValue(expected) failed
  52 |   await expect(canvas).toHaveAttribute('data-step', paused);
  53 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  54 |   await expect(meadow).toContainText('Reduced motion is on');
  55 |   await expect(page.getByRole('button', { name: 'Play meadow timeline', exact: true })).toHaveCount(0);
  56 |   await time.focus(); await time.press('End');
  57 |   await expect(canvas).toHaveAttribute('data-biomass-foxes', '0');
  58 |   await page.setViewportSize({ width: 390, height: 844 });
  59 |   await meadow.screenshot({ path: 'reports/ecosystem-3d-meadow/mobile.png' });
  60 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  61 |   const size = await canvas.evaluate(el => ({ w: el.width, css: el.getBoundingClientRect().width }));
  62 |   expect(size.w).toBeLessThanOrEqual(Math.ceil(size.css * 1.5));
  63 |   await page.getByRole('button', { name: 'Hide 3D meadow', exact: true }).click();
  64 |   await expect(canvas).toHaveCount(0);
  65 |   await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  66 |   await expect(canvas).toHaveAttribute('data-step', '240');
  67 |   await expect(canvas).toHaveAttribute('data-glyphs-foxes', '0');
  68 |   expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  69 | });
  70 | 
  71 | test('unavailable WebGL retains the diagram, data and controls', async ({ page }) => {
  72 |   await mount(page);
  73 |   await page.evaluate(() => { (window as any).THREE.WebGLRenderer = function() { throw new Error('WebGL disabled for test'); }; });
  74 |   await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  75 |   await expect(page.locator('[data-efw-meadow]')).toContainText('3D is unavailable on this device');
  76 |   await expect(page.locator('.efw-node')).toHaveCount(5);
  77 |   await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  78 |   await expect(page.locator('[data-efw-results]')).toBeVisible();
  79 |   await expect(page.getByRole('slider', { name: 'Meadow timeline', exact: true })).toBeVisible();
  80 |   expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  81 | });
  82 | 
  83 | test('losing a graphics context exposes a usable fallback', async ({ page }) => {
  84 |   await mount(page);
  85 |   await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  86 |   const canvas = page.locator('.efw-meadow-stage canvas');
  87 |   await expect(canvas).toHaveAttribute('data-step', '0');
  88 |   await canvas.evaluate(el => el.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  89 |   await expect(page.locator('[data-efw-meadow]')).toContainText('3D is unavailable on this device');
  90 |   await expect(page.locator('.efw-node')).toHaveCount(5);
  91 |   await page.getByRole('button', { name: 'Hide 3D meadow', exact: true }).click();
  92 |   await expect(canvas).toHaveCount(0);
  93 | });
  94 | 
```