import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-label-layout-2026-09-27';
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

async function mount(page: Page, state: Record<string, unknown>) {
  await harness.mount(page, { dissection: { reducedMotion: true, soundEnabled: false, revealedLayers: { skin: true }, activeLayer: 'skin', ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport');
    viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  await page.locator('[data-diss-canvas]').scrollIntoViewIfNeeded();
}

// Observe real drawing coordinates after the renderer applies its transforms. This
// checks the painted glyphs and card, including mirrored views and device density.
async function paintedLabels(page: Page) {
  return page.locator('[data-diss-canvas]').evaluate((canvas: any) => {
    const ctx = canvas.getContext('2d');
    const originalRect = ctx.roundRect, originalText = ctx.fillText, originalBegin = ctx.beginPath;
    let card: { x: number; y: number; width: number; height: number } | null = null;
    const labels: any[] = [];
    // Numbered markers begin a separate path and do not belong to the last card.
    ctx.beginPath = function () { card = null; return originalBegin.call(this); };
    ctx.roundRect = function (x: number, y: number, width: number, height: number, ...rest: any[]) {
      const m = this.getTransform();
      const a = new DOMPoint(x, y).matrixTransform(m), b = new DOMPoint(x + width, y + height).matrixTransform(m);
      card = { x: Math.min(a.x, b.x) / canvas.width, y: Math.min(a.y, b.y) / canvas.height, width: Math.abs(b.x - a.x) / canvas.width, height: Math.abs(b.y - a.y) / canvas.height };
      return originalRect.call(this, x, y, width, height, ...rest);
    };
    ctx.fillText = function (text: string, x: number, y: number, ...rest: any[]) {
      const m = this.getTransform(), point = new DOMPoint(x, y).matrixTransform(m), width = this.measureText(text).width * m.a;
      labels.push({ text: String(text), x: point.x / canvas.width, y: point.y / canvas.height, width: width / canvas.width, card });
      return originalText.call(this, text, x, y, ...rest);
    };
    try { canvas._drawDissectionNow(); } finally { ctx.roundRect = originalRect; ctx.fillText = originalText; ctx.beginPath = originalBegin; }
    return labels;
  });
}

test('the Labels toggle hides default labels on its first click and restores them', async ({ page }) => {
  await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', toolbarViewOpen: true });
  const button = page.getByRole('button', { name: 'Toggle organ name labels', exact: true });
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  expect((await paintedLabels(page)).some(label => label.text === 'Dorsal Skin')).toBe(true);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-diss-canvas]').scrollIntoViewIfNeeded();
  expect((await paintedLabels(page)).some(label => label.text === 'Dorsal Skin')).toBe(false);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-diss-canvas]').scrollIntoViewIfNeeded();
  expect((await paintedLabels(page)).some(label => label.text === 'Dorsal Skin')).toBe(true);
});

test.describe('touchscreen labels', () => {
test.use({ hasTouch: true, isMobile: true });
for (const view of ['dorsal', 'ventral']) {
  test(`long selected labels fit their cards on a phone in ${view} view`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page, { specimen: 'sheepHeart', _dissLoadedSpec: 'sheepHeart', anatomicalView: view, selectedOrgan: 'sup_vena_h', largeText: true });
    const labels = await paintedLabels(page);
    const first = labels.find(label => label.text.includes('Cranial'));
    expect(first).toBeTruthy();
    const lines = labels.filter(label => label.card && JSON.stringify(label.card) === JSON.stringify(first.card));
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.map(line => line.text).join(' ')).toContain('Cranial (Superior) Vena Cava');
    for (const line of lines) {
      expect(line.width).toBeGreaterThan(0);
      expect(line.x).toBeGreaterThanOrEqual(line.card.x - 0.002);
      expect(line.x + line.width).toBeLessThanOrEqual(line.card.x + line.card.width + 0.002);
      expect(line.y).toBeGreaterThan(line.card.y);
      expect(line.y).toBeLessThan(line.card.y + line.card.height);
    }
    expect(first.card.x).toBeGreaterThan(0);
    expect(first.card.x + first.card.width).toBeLessThan(1);
    await page.locator('.diss-stage').screenshot({ path: out + `/heart-label-${view}.png` });
  });
}
});

test('lateral perch preserves its drawing proportions and the visible label selects its structure', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await mount(page, { specimen: 'perch', _dissLoadedSpec: 'perch', anatomicalView: 'lateral' });
  const canvas = page.locator('[data-diss-canvas]');
  const bodyScales = await canvas.evaluate((el: any) => {
    const ctx = el.getContext('2d'), original = ctx.moveTo, scales: number[] = [];
    ctx.moveTo = function (x: number, y: number) {
      if (Math.abs(x - el._logicalW * 0.2) < 0.01 && Math.abs(y - el._logicalH * 0.45) < 0.01) scales.push(this.getTransform().a / el._dpr);
      return original.call(this, x, y);
    };
    try { el._drawDissectionNow(); } finally { ctx.moveTo = original; }
    return scales;
  });
  expect(bodyScales.length).toBeGreaterThan(0);
  for (const scale of bodyScales) { expect(scale).toBeGreaterThan(0.96); expect(scale).toBeLessThan(1.04); }
  const label = (await paintedLabels(page)).find(item => item.text === 'Ctenoid Scales');
  expect(label).toBeTruthy();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + (label.card.x + label.card.width / 2) * box.width, box.y + (label.card.y + label.card.height / 2) * box.height);
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe('scales');
  await canvas.screenshot({ path: out + '/perch-lateral.png' });
});

test('phone labels leave the frog hotspot markers exposed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', anatomicalView: 'dorsal' });
  const canvas = page.locator('[data-diss-canvas]');
  const markers = await canvas.evaluate((el: any) => {
    const ctx = el.getContext('2d'), original = ctx.arc, points: { x: number; y: number }[] = [];
    ctx.arc = function (x: number, y: number, radius: number, ...rest: any[]) {
      if (radius === 5) {
        const point = new DOMPoint(x, y).matrixTransform(this.getTransform());
        points.push({ x: point.x / el.width, y: point.y / el.height });
      }
      return original.call(this, x, y, radius, ...rest);
    };
    try { el._drawDissectionNow(); } finally { ctx.arc = original; }
    return points;
  });
  const names = ['Dorsal Skin', 'Ventral Skin', 'Nictitating Membrane', 'Tympanic Membrane'];
  const cards = (await paintedLabels(page)).filter(label => names.some(name => label.text.startsWith(name))).map(label => label.card);
  expect(cards.length).toBe(4);
  expect(markers.length).toBeGreaterThanOrEqual(3);
  for (const card of cards) {
    for (const marker of markers) {
      expect(marker.x > card.x && marker.x < card.x + card.width && marker.y > card.y && marker.y < card.y + card.height).toBe(false);
    }
  }
  await canvas.screenshot({ path: out + '/frog-phone.png' });
});
