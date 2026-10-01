# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-visual-presentation.spec.ts >> Advanced and fullscreen restore the detailed canvas guidance
- Location: tests\e2e\dissection-visual-presentation.spec.ts:75:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('[data-diss-canvas]')
Expected: "detailed"
Received: "compact"
Timeout:  15000ms

Call log:
  - Expect "toHaveAttribute" with timeout 15000ms
  - waiting for locator('[data-diss-canvas]')
    32 × locator resolved to <canvas width="650" tabindex="0" height="780" id="diss-canvas" role="application" data-diss-canvas="true" data-cursor-mode="blocked" data-cursor-tone="blocked" data-dissection-hud="compact" aria-labelledby="diss-canvas-label" aria-roledescription="interactive specimen canvas" aria-describedby="diss-canvas-status diss-canvas-equivalent" class="diss-canvas w-full rounded-xl border border-slate-400 cursor-crosshair" aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown S…></canvas>
       - unexpected value "compact"

```

```yaml
- application "Frog (Rana) interactive specimen · Skin layer, dorsal view"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { mkdir } from 'node:fs/promises';
  3  | import { GlHarness } from './helpers/stem_gl_harness';
  4  | 
  5  | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  6  | const out = 'reports/dissection-visual-presentation-2026-09-27/' + (process.env.DISSECTION_VISUAL_BASELINE === '1' ? 'before' : 'after');
  7  | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  8  | test.afterAll(async () => { await harness.stop(); });
  9  | test.describe.configure({ retries: 0 });
  10 | 
  11 | for (const [specimen, layer, view] of [
  12 |   ['frog', 'skin', 'dorsal'], ['frog', 'organs', 'internal'], ['perch', 'skin', 'lateral'],
  13 |   ['sheepHeart', 'skin', 'dorsal'], ['sheepEye', 'organs', 'internal'], ['crayfish', 'skin', 'dorsal'], ['earthworm', 'skin', 'dorsal'], ['pig', 'skin', 'ventral'],
  14 | ]) {
  15 |   test(`${specimen} ${layer} specimen renders without errors`, async ({ page }) => {
  16 |     const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  17 |     await page.setViewportSize({ width: 1440, height: 1100 });
  18 |     await harness.mount(page, { dissection: { specimen, _dissLoadedSpec: specimen, activeLayer: layer, anatomicalView: view,
  19 |       reducedMotion: true, soundEnabled: false, inspectionLens: false, macroInset: false,
  20 |       revealedLayers: { skin: true, muscle: true }, labelMode: 'show' } }, undefined, { expectCanvas: false });
  21 |     const canvas = page.locator('[data-diss-canvas]');
  22 |     await expect(canvas).toBeVisible();
  23 |     await expect(canvas).toHaveAttribute('data-dissection-hud', 'compact');
  24 |     await expect.poll(() => canvas.evaluate((el: HTMLCanvasElement) => {
  25 |       const pixels = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data;
  26 |       const colors = new Set(); for (let i = 0; i < pixels.length; i += 640) colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
  27 |       return colors.size;
  28 |     })).toBeGreaterThan(30);
  29 |     await page.locator('.diss-stage').screenshot({ path: out + `/${specimen}-${layer}.png` });
  30 |     if (specimen === 'frog' && layer === 'skin') {
  31 |       await page.screenshot({ path: out + '/workspace.png', fullPage: true });
  32 |       await canvas.screenshot({ path: out + '/specimen.png' });
  33 |     }
  34 |     expect(errors).toEqual([]);
  35 |     await harness.unmount(page);
  36 |   });
  37 | }
  38 | 
  39 | test('phone and high-contrast presentation retain a usable canvas', async ({ page }) => {
  40 |   await page.setViewportSize({ width: 390, height: 844 });
  41 |   await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', reducedMotion: true, soundEnabled: false } }, undefined, { expectCanvas: false });
  42 |   await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  43 |   const stage = page.locator('.diss-stage');
  44 |   await expect(stage).toBeVisible();
  45 |   expect(await stage.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  46 |   await stage.screenshot({ path: out + '/phone.png' });
  47 |   await page.evaluate(() => (window as any).__ctx.update('dissection', 'highContrast', true));
  48 |   await stage.screenshot({ path: out + '/phone-contrast.png' });
  49 |   await page.locator('[data-diss-canvas]').focus();
  50 |   await expect(page.locator('[data-diss-canvas]')).toBeFocused();
  51 |   await harness.unmount(page);
  52 | });
  53 | 
  54 | test('specimen lighting leaves the surrounding tray unchanged in dorsal and ventral views', async ({ page }) => {
  55 |   await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin',
  56 |     anatomicalView: 'dorsal', reducedMotion: true, lightIntensity: 20, soundEnabled: false } }, undefined, { expectCanvas: false });
  57 |   const canvas = page.locator('[data-diss-canvas]');
  58 |   const sample = () => canvas.evaluate((el: HTMLCanvasElement) => {
  59 |     const ctx = el.getContext('2d')!;
  60 |     const pixels = (x: number, y: number) => Array.from(ctx.getImageData(Math.round(el.width * x), Math.round(el.height * y), 4, 4).data);
  61 |     return { body: pixels(0.54, 0.54), tray: pixels(0.5, 0.80) };
  62 |   });
  63 |   for (const anatomicalView of ['dorsal', 'ventral']) {
  64 |     await page.evaluate(view => (window as any).__ctx.updateMulti('dissection', { anatomicalView: view, lightIntensity: 20 }), anatomicalView);
  65 |     await expect.poll(() => canvas.evaluate((el: any) => el._drawD.lightIntensity + '|' + el._drawD.anatomicalView)).toBe('20|' + anatomicalView);
  66 |     await canvas.evaluate((el: any) => el._drawDissectionNow());
  67 |     const dim = await sample();
  68 |     await page.evaluate(() => (window as any).__ctx.update('dissection', 'lightIntensity', 100));
  69 |     await expect.poll(async () => (await sample()).body).not.toEqual(dim.body);
  70 |     expect((await sample()).tray).toEqual(dim.tray);
  71 |   }
  72 |   await harness.unmount(page);
  73 | });
  74 | 
  75 | test('Advanced and fullscreen restore the detailed canvas guidance', async ({ page }) => {
  76 |   await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', reducedMotion: true, soundEnabled: false } }, undefined, { expectCanvas: false });
  77 |   const canvas = page.locator('[data-diss-canvas]');
  78 |   const drawnLabels = () => canvas.evaluate((el: any) => {
  79 |     const ctx = el.getContext('2d'); const original = ctx.fillText; const labels: string[] = [];
  80 |     ctx.fillText = function (label: string, ...args: any[]) { labels.push(String(label)); return original.call(this, label, ...args); };
  81 |     try { el._drawDissectionNow(); } finally { ctx.fillText = original; }
  82 |     return labels;
  83 |   });
  84 |   await expect(canvas).toHaveAttribute('data-dissection-hud', 'compact');
  85 |   expect(await drawnLabels()).not.toContain('ANATOMICAL AXIS');
  86 |   await page.getByRole('button', { name: 'Advanced workspace', exact: true }).click();
> 87 |   await expect(canvas).toHaveAttribute('data-dissection-hud', 'detailed');
     |                        ^ Error: expect(locator).toHaveAttribute(expected) failed
  88 |   expect(await drawnLabels()).toContain('ANATOMICAL AXIS');
  89 |   await page.locator('.diss-stage').screenshot({ path: out + '/advanced.png' });
  90 |   await page.getByRole('button', { name: 'Essentials workspace', exact: true }).click();
  91 |   await expect(canvas).toHaveAttribute('data-dissection-hud', 'compact');
  92 |   await canvas.evaluate(async el => { await el.parentElement!.requestFullscreen(); });
  93 |   await expect.poll(async () => await drawnLabels()).toContain('ANATOMICAL AXIS');
  94 |   await expect(canvas).toHaveAttribute('data-dissection-hud', 'detailed');
  95 |   await page.evaluate(() => document.exitFullscreen());
  96 |   await expect.poll(async () => await drawnLabels()).not.toContain('ANATOMICAL AXIS');
  97 |   await harness.unmount(page);
  98 | });
  99 | 
```