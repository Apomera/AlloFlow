import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-visual-presentation-2026-09-27/' + (process.env.DISSECTION_VISUAL_BASELINE === '1' ? 'before' : 'after');
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ retries: 0 });

for (const [specimen, layer, view] of [
  ['frog', 'skin', 'dorsal'], ['frog', 'organs', 'internal'], ['perch', 'skin', 'lateral'],
  ['sheepHeart', 'skin', 'dorsal'], ['sheepEye', 'organs', 'internal'], ['crayfish', 'skin', 'dorsal'], ['earthworm', 'skin', 'dorsal'], ['pig', 'skin', 'ventral'],
]) {
  test(`${specimen} ${layer} specimen renders without errors`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1100 });
    await harness.mount(page, { dissection: { specimen, _dissLoadedSpec: specimen, activeLayer: layer, anatomicalView: view,
      reducedMotion: true, soundEnabled: false, inspectionLens: false, macroInset: false,
      revealedLayers: { skin: true, muscle: true }, labelMode: 'show' } }, undefined, { expectCanvas: false });
    const canvas = page.locator('[data-diss-canvas]');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('data-dissection-hud', 'compact');
    await expect.poll(() => canvas.evaluate((el: HTMLCanvasElement) => {
      const pixels = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data;
      const colors = new Set(); for (let i = 0; i < pixels.length; i += 640) colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
      return colors.size;
    })).toBeGreaterThan(30);
    await page.locator('.diss-stage').screenshot({ path: out + `/${specimen}-${layer}.png` });
    if (specimen === 'frog' && layer === 'skin') {
      await page.screenshot({ path: out + '/workspace.png', fullPage: true });
      await canvas.screenshot({ path: out + '/specimen.png' });
    }
    expect(errors).toEqual([]);
    await harness.unmount(page);
  });
}

test('phone and high-contrast presentation retain a usable canvas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', reducedMotion: true, soundEnabled: false } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  const stage = page.locator('.diss-stage');
  await expect(stage).toBeVisible();
  expect(await stage.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await stage.screenshot({ path: out + '/phone.png' });
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'highContrast', true));
  await stage.screenshot({ path: out + '/phone-contrast.png' });
  await page.locator('[data-diss-canvas]').focus();
  await expect(page.locator('[data-diss-canvas]')).toBeFocused();
  await harness.unmount(page);
});

test('specimen lighting leaves the surrounding tray unchanged in dorsal and ventral views', async ({ page }) => {
  await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin',
    anatomicalView: 'dorsal', reducedMotion: true, lightIntensity: 20, soundEnabled: false } }, undefined, { expectCanvas: false });
  const canvas = page.locator('[data-diss-canvas]');
  await canvas.scrollIntoViewIfNeeded();
  const sample = () => canvas.evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext('2d')!;
    const pixels = (x: number, y: number) => Array.from(ctx.getImageData(Math.round(el.width * x), Math.round(el.height * y), 4, 4).data);
    return { body: pixels(0.54, 0.54), tray: pixels(0.5, 0.80) };
  });
  for (const anatomicalView of ['dorsal', 'ventral']) {
    await page.evaluate(view => (window as any).__ctx.updateMulti('dissection', { anatomicalView: view, lightIntensity: 20 }), anatomicalView);
    await expect.poll(() => canvas.evaluate((el: any) => el._drawD.lightIntensity + '|' + el._drawD.anatomicalView)).toBe('20|' + anatomicalView);
    await canvas.evaluate((el: any) => el._drawDissectionNow());
    const dim = await sample();
    await page.evaluate(() => (window as any).__ctx.update('dissection', 'lightIntensity', 100));
    await expect.poll(async () => (await sample()).body).not.toEqual(dim.body);
    expect((await sample()).tray).toEqual(dim.tray);
  }
  await harness.unmount(page);
});

test('Advanced and fullscreen restore the detailed canvas guidance', async ({ page }) => {
  await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', reducedMotion: true, soundEnabled: false } }, undefined, { expectCanvas: false });
  const canvas = page.locator('[data-diss-canvas]');
  await canvas.scrollIntoViewIfNeeded();
  const drawnLabels = () => canvas.evaluate((el: any) => {
    const ctx = el.getContext('2d'); const original = ctx.fillText; const labels: string[] = [];
    ctx.fillText = function (label: string, ...args: any[]) { labels.push(String(label)); return original.call(this, label, ...args); };
    try { el._drawDissectionNow(); } finally { ctx.fillText = original; }
    return labels;
  });
  await expect(canvas).toHaveAttribute('data-dissection-hud', 'compact');
  expect(await drawnLabels()).not.toContain('ANATOMICAL AXIS');
  await page.getByRole('button', { name: 'Advanced workspace', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-dissection-hud', 'detailed');
  expect(await drawnLabels()).toContain('ANATOMICAL AXIS');
  await page.locator('.diss-stage').screenshot({ path: out + '/advanced.png' });
  await page.getByRole('button', { name: 'Essentials workspace', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-dissection-hud', 'compact');
  await canvas.evaluate(async el => { await el.parentElement!.requestFullscreen(); });
  await expect.poll(async () => await drawnLabels()).toContain('ANATOMICAL AXIS');
  await expect(canvas).toHaveAttribute('data-dissection-hud', 'detailed');
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(async () => await drawnLabels()).not.toContain('ANATOMICAL AXIS');
  await harness.unmount(page);
});
