import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-zoom-labels-2026-09-29';
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await harness.mount(page, { dissection: { specimen: 'sheepHeart', _dissLoadedSpec: 'sheepHeart', activeLayer: 'organs', revealedLayers: { skin: true, organs: true }, reducedMotion: true, soundEnabled: false, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  const canvas = page.locator('[data-diss-canvas]');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((el: any) => el._dissInViewport)).toBe(true);
}

async function paint(page: Page) {
  return page.locator('[data-diss-canvas]').evaluate((el: any) => {
    const ctx = el.getContext('2d'), rect = ctx.roundRect, text = ctx.fillText, begin = ctx.beginPath;
    const cards: any[] = []; let card: any = null;
    ctx.beginPath = function () { card = null; return begin.call(this); };
    ctx.roundRect = function (x: number, y: number, w: number, h: number, ...args: any[]) {
      const hit = (el._hotspotLabelBoxes || []).find((b: any) => Math.abs(b.x * el._logicalW - x) < 0.001 && Math.abs(b.y * el._logicalH - y) < 0.001 && Math.abs(b.width * el._logicalW - w) < 0.001);
      if (hit) {
        const m = this.getTransform();
        const points = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([a, b]) => new DOMPoint(a, b).matrixTransform(m));
        const left = Math.min(...points.map(p => p.x)), top = Math.min(...points.map(p => p.y));
        card = { id: hit.id, x: left / el.width, y: top / el.height, w: (Math.max(...points.map(p => p.x)) - left) / el.width, h: (Math.max(...points.map(p => p.y)) - top) / el.height, lines: [] };
        cards.push(card);
      }
      return rect.call(this, x, y, w, h, ...args);
    };
    ctx.fillText = function (value: string, x: number, y: number, ...args: any[]) {
      if (card) {
        const m = this.getTransform(), p = new DOMPoint(x, y).matrixTransform(m);
        card.lines.push({ text: String(value), x: p.x / el.width, y: p.y / el.height, w: this.measureText(value).width * m.a / el.width, font: parseFloat(this.font.replace(/^bold /, '')) * m.a / el._dpr });
      }
      return text.call(this, value, x, y, ...args);
    };
    try { el._drawDissectionNow(); } finally { ctx.roundRect = rect; ctx.fillText = text; ctx.beginPath = begin; }
    return cards;
  });
}

function expectReadable(cards: any[]) {
  expect(cards.length).toBeGreaterThan(0);
  for (const card of cards) {
    expect(card.x, card.id).toBeGreaterThan(0);
    expect(card.y, card.id).toBeGreaterThan(0);
    expect(card.x + card.w, card.id).toBeLessThan(1);
    expect(card.y + card.h, card.id).toBeLessThan(1);
    expect(card.lines.length, card.id).toBeGreaterThan(0);
    for (const line of card.lines) {
      expect(line.w).toBeGreaterThan(0);
      expect(line.x).toBeGreaterThanOrEqual(card.x - 0.002);
      expect(line.x + line.w).toBeLessThanOrEqual(card.x + card.w + 0.002);
      expect(line.y).toBeGreaterThan(card.y);
      expect(line.y).toBeLessThan(card.y + card.h);
    }
  }
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    const a = cards[i], b = cards[j];
    const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    expect(overlapX > 0.002 && overlapY > 0.002, `${a.id} overlaps ${b.id}`).toBe(false);
  }
}

test('fullscreen callouts fit at 2x and 3x zoom in both orientations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  // Covered organs use numbered markers at 1x; 1.25x expands their names.
  await mount(page, { canvasZoom: 1.25 });
  const canvas = page.locator('[data-diss-canvas]');
  await canvas.evaluate(async el => { await el.parentElement!.requestFullscreen(); });
  await expect.poll(async () => (await paint(page)).length).toBeGreaterThan(0);
  const baseline = await paint(page), fontSize = baseline[0].lines[0].font;
  for (const anatomicalView of ['dorsal', 'ventral']) {
    for (const canvasZoom of [2, 3]) {
      await page.evaluate(state => (window as any).__ctx.updateMulti('dissection', state), { anatomicalView, canvasZoom, canvasPanX: 65, canvasPanY: -35 });
      await expect.poll(() => canvas.evaluate((el: any) => el._drawD.canvasZoom)).toBe(canvasZoom);
      const cards = await paint(page); expectReadable(cards);
      if (canvasZoom === 3) expect(cards.length).toBeLessThan(baseline.length);
      for (const card of cards) for (const line of card.lines) expect(line.font).toBeCloseTo(fontSize, 2);
      await canvas.screenshot({ path: `${out}/fullscreen-${anatomicalView}-${canvasZoom}x.png` });
    }
  }
  await page.evaluate(() => document.exitFullscreen());
});

test.describe('touchscreen selection', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  for (const anatomicalView of ['dorsal', 'ventral']) {
    test(`long selected name remains legible when panned in ${anatomicalView} view`, async ({ page }) => {
      await mount(page, { activeLayer: 'skin', selectedOrgan: 'sup_vena_h', largeText: true, anatomicalView });
      const canvas = page.locator('[data-diss-canvas]');
      const baseline = (await paint(page)).find(card => card.id === 'sup_vena_h');
      expect(baseline).toBeTruthy();
      await page.evaluate(() => (window as any).__ctx.updateMulti('dissection', { canvasZoom: 2.5, canvasPanX: -80, canvasPanY: 50 }));
      await expect.poll(() => canvas.evaluate((el: any) => el._drawD.canvasZoom)).toBe(2.5);
      const cards = await paint(page); expectReadable(cards);
      const selected = cards.find(card => card.id === 'sup_vena_h');
      expect(selected.lines.map((line: any) => line.text).join(' ')).toContain('Cranial (Superior) Vena Cava');
      expect(selected.lines[0].font).toBeCloseTo(baseline.lines[0].font, 2);
      await canvas.screenshot({ path: `${out}/phone-${anatomicalView}.png` });
      await page.evaluate(() => (window as any).__ctx.update('dissection', 'quizMode', true));
      await expect.poll(() => paint(page)).toEqual([]);
    });
  }
});

for (const anatomicalView of ['dorsal', 'ventral']) {
  test(`panned frog cards select the correct structure in ${anatomicalView} view`, async ({ page }) => {
    await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView, canvasZoom: 2, canvasPanX: -50, canvasPanY: 30 });
    const canvas = page.locator('[data-diss-canvas]'), cards = await paint(page);
    expectReadable(cards);
    const id = anatomicalView === 'dorsal' ? 'dorsal_skin' : 'ventral_skin';
    const label = cards.find(card => card.id === id); expect(label).toBeTruthy();
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + (label.x + label.w / 2) * box.width, box.y + (label.y + label.h / 2) * box.height);
    await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe(id);
  });
}

test('zoomed label cards still select the matching structure', async ({ page }) => {
  await mount(page, { specimen: 'perch', _dissLoadedSpec: 'perch', activeLayer: 'skin', anatomicalView: 'lateral', canvasZoom: 2, canvasPanX: 45, canvasPanY: -25 });
  const canvas = page.locator('[data-diss-canvas]'), cards = await paint(page);
  expectReadable(cards);
  const scales = cards.find(card => card.id === 'scales'); expect(scales).toBeTruthy();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + (scales.x + scales.w / 2) * box.width, box.y + (scales.y + scales.h / 2) * box.height);
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe('scales');
  await canvas.screenshot({ path: `${out}/perch-selected.png` });
});
