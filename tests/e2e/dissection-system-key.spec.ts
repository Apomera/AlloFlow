import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-system-key-2026-09-29';
const labels = ['Circulatory', 'Digestive', 'Respiratory', 'Nervous', 'Skeletal', 'Muscular', 'Excretory', 'Reproductive'];
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await harness.mount(page, { dissection: { specimen: 'sheepHeart', _dissLoadedSpec: 'sheepHeart', workspaceMode: 'advanced', activeLayer: 'organs', revealedLayers: { skin: true, organs: true }, livingFunctionEnabled: true, traceCirculation: true, reducedMotion: true, soundEnabled: false, largeText: true, sceneDetail: false, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  const canvas = page.locator('[data-diss-canvas]');
  await expect(canvas).toBeVisible(); await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((el: any) => el._dissInViewport)).toBe(true);
  await expect(canvas).toHaveAttribute('data-dissection-hud', /compact|detailed/);
}

async function paintedKey(page: Page) {
  return page.locator('[data-diss-canvas]').evaluate((el: any, names: string[]) => {
    const ctx = el.getContext('2d'), original = ctx.fillText, items: any[] = [];
    ctx.fillText = function (text: string, x: number, y: number, ...rest: any[]) {
      if (names.includes(String(text))) {
        const m = this.getTransform(), p = new DOMPoint(x, y).matrixTransform(m);
        items.push({ text, x: p.x / el.width, y: p.y / el.height, w: this.measureText(text).width * m.a / el.width, a: Math.sign(m.a) });
      }
      return original.call(this, text, x, y, ...rest);
    };
    try { el._drawDissectionNow(); } finally { ctx.fillText = original; }
    return items;
  }, labels);
}

test.describe('phone system key', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  for (const width of [390, 320]) {
    test(`${width}px key frees the specimen and keeps readable labels`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      const notes = { 'sheepHeart|sup_vena_h': 'Keep this observation' };
      await mount(page, { highContrast: width === 320, organNotes: notes });
      expect(await paintedKey(page)).toHaveLength(0);
      const key = page.locator('[data-diss-system-key]'), summary = key.locator('summary');
      await expect(key).toBeVisible(); await expect(key).toHaveJSProperty('open', false);
      await page.locator('.diss-stage').screenshot({ path: `${out}/specimen-${width}.png` });
      await summary.focus(); await page.keyboard.press('Enter');
      await expect(key).toHaveJSProperty('open', true);
      await expect(key.getByRole('listitem')).toHaveText(labels);
      expect(await key.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      for (const row of await key.getByRole('listitem').all()) {
        expect(await row.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
        expect(await row.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13);
      }
      const colors = await key.locator('.diss-system-key__swatch').evaluateAll(els => els.map(el => (el as HTMLElement).style.backgroundColor));
      expect(colors).toEqual(['rgb(239, 68, 68)', 'rgb(245, 158, 11)', 'rgb(59, 130, 246)', 'rgb(139, 92, 246)', 'rgb(148, 163, 184)', 'rgb(220, 38, 38)', 'rgb(132, 204, 22)', 'rgb(236, 72, 153)']);
      await key.screenshot({ path: `${out}/expanded-key-${width}.png` });
      await page.evaluate(() => (window as any).__ctx.update('dissection', 'canvasZoom', 2));
      await expect(key).toHaveJSProperty('open', true);
      expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes)).toEqual(notes);
      await page.evaluate(() => (window as any).__ctx.update('dissection', 'quizMode', true));
      await expect(key).toHaveCount(0);
      await page.locator('[data-diss-canvas]').scrollIntoViewIfNeeded();
      await expect.poll(() => paintedKey(page)).toEqual([]);
    });
  }
});

test('fullscreen system key stays fixed through zoom, pan and orientation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await mount(page, { workspaceMode: 'essentials', largeText: false });
  const canvas = page.locator('[data-diss-canvas]');
  await expect(page.locator('[data-diss-system-key]')).toHaveCount(0);
  expect(await paintedKey(page)).toEqual([]);
  await canvas.evaluate(async el => { await el.parentElement!.requestFullscreen(); });
  await expect.poll(async () => (await paintedKey(page)).length).toBe(8);
  const baseline = await paintedKey(page);
  expect(baseline.map(item => item.text)).toEqual(labels);
  for (const anatomicalView of ['ventral', 'dorsal']) {
    await page.evaluate(view => (window as any).__ctx.updateMulti('dissection', { anatomicalView: view, canvasZoom: 2, canvasPanX: 65, canvasPanY: -35 }), anatomicalView);
    await expect.poll(() => canvas.evaluate((el: any) => el._drawD.anatomicalView)).toBe(anatomicalView);
    const zoomed = await paintedKey(page);
    expect(zoomed).toHaveLength(8);
    for (let i = 0; i < zoomed.length; i++) {
      expect(zoomed[i].a).toBe(1);
      for (const field of ['x', 'y', 'w']) expect(zoomed[i][field]).toBeCloseTo(baseline[i][field], 5);
      expect(zoomed[i].x + zoomed[i].w).toBeLessThan(1);
    }
  }
  await canvas.screenshot({ path: `${out}/fullscreen-zoomed.png` });
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'quizMode', true));
  await expect.poll(() => paintedKey(page)).toEqual([]);
  await page.evaluate(() => document.exitFullscreen());
});
