import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-marker-clarity-2026-09-29';
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
  const canvas = page.locator('[data-diss-canvas]'); await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((el: any) => el._dissInViewport)).toBe(true);
}

async function paint(page: Page) {
  return page.locator('[data-diss-canvas]').evaluate((el: any) => {
    const ctx = el.getContext('2d'), original = { arc: ctx.arc, begin: ctx.beginPath, stroke: ctx.stroke, text: ctx.fillText };
    const captions: any[] = [];
    ctx.fillText = function (value: string, ...args: any[]) {
      if (/^(SURFACE|MID|DEEP) · /.test(String(value))) {
        const m = this.getTransform();
        captions.push({ text: String(value), direction: Math.sign(m.a), size: parseFloat(this.font.replace(/^bold /, '')) * Math.hypot(m.a, m.b) / el._dpr });
      }
      return original.text.call(this, value, ...args);
    };
    let arcs: any[] = []; const marks: any[] = [];
    ctx.beginPath = function () { arcs = []; return original.begin.call(this); };
    ctx.arc = function (x: number, y: number, r: number, start: number, end: number, ...args: any[]) {
      const m = this.getTransform(), p = new DOMPoint(x, y).matrixTransform(m);
      arcs.push({ radius: r, x: p.x / el.width, y: p.y / el.height, rx: r * Math.hypot(m.a, m.b) / el._dpr, ry: r * Math.hypot(m.c, m.d) / el._dpr, sweep: end - start });
      return original.arc.call(this, x, y, r, start, end, ...args);
    };
    ctx.stroke = function (...args: any[]) {
      const color = String(this.strokeStyle).replaceAll(' ', '');
      for (const arc of arcs) {
        let kind = '';
        if ([6.2, 7, 7.5].includes(arc.radius) && ['#cbd5e1', '#f8fafc', '#fda4af'].includes(color)) kind = 'exposure';
        if (arc.radius === 5 && color.includes('255,255,255')) kind = 'pin';
        if (color === '#67e8f9' || color === '#c4b5fd') kind = 'depth';
        if ((color.includes('254,240,138') || color === '#facc15') && Math.abs(arc.sweep - 0.58) < 0.01) kind = 'selection';
        if (color.includes('147,51,234')) kind = 'guided';
        if (kind) marks.push({ ...arc, kind, dash: this.getLineDash() });
      }
      return original.stroke.apply(this, args);
    };
    try { el._drawDissectionNow(); } finally { ctx.arc = original.arc; ctx.beginPath = original.begin; ctx.stroke = original.stroke; ctx.fillText = original.text; }
    return { marks, captions, scale: el._canvasUiScale };
  });
}

function expectStableSize(result: Awaited<ReturnType<typeof paint>>, kind: string) {
  const marks = result.marks.filter((m: any) => m.kind === kind);
  expect(marks.length, kind).toBeGreaterThan(0);
  for (const marker of marks) {
    expect(marker.rx, kind).toBeCloseTo(marker.radius * result.scale, 3);
    expect(marker.ry, kind).toBeCloseTo(marker.radius * result.scale, 3);
  }
  return marks;
}

test('covered structure symbols stay compact and shape-coded through fullscreen zoom', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await mount(page, { canvasZoom: 1.25 });
  const canvas = page.locator('[data-diss-canvas]');
  await canvas.evaluate(async el => { await el.parentElement!.requestFullscreen(); });
  for (const anatomicalView of ['dorsal', 'ventral']) for (const canvasZoom of [1.25, 2, 3]) {
    await page.evaluate(state => (window as any).__ctx.updateMulti('dissection', state), { anatomicalView, canvasZoom, canvasPanX: 65, canvasPanY: -35 });
    await expect.poll(() => canvas.evaluate((el: any) => el._drawD.canvasZoom)).toBe(canvasZoom);
    const result = await paint(page), covered = expectStableSize(result, 'exposure');
    expect(covered.some((m: any) => m.dash.length > 0)).toBe(true);
    if (canvasZoom === 3) await canvas.screenshot({ path: `${out}/fullscreen-${anatomicalView}-3x.png` });
  }
  await page.evaluate(() => document.exitFullscreen());
});

for (const anatomicalView of ['dorsal', 'ventral']) {
  test(`exposed markers and selection stay aligned in ${anatomicalView} view`, async ({ page }) => {
    await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView, workspaceMode: 'advanced', sceneDetail: false, depthAtlas: true, parallaxDepth: false });
    const canvas = page.locator('[data-diss-canvas]');
    const initial = expectStableSize(await paint(page), 'pin');
    for (const canvasZoom of [0.5, 2.5]) {
      await page.evaluate(state => (window as any).__ctx.updateMulti('dissection', state), { canvasZoom, canvasPanX: -30, canvasPanY: 10 });
      await expect.poll(() => canvas.evaluate((el: any) => el._drawD.canvasZoom)).toBe(canvasZoom);
      const result = await paint(page), pins = expectStableSize(result, 'pin');
      expectStableSize(result, 'depth');
      const expectedX = (initial[0].x - 0.5) * canvasZoom + 0.5 - 30 / 500;
      const expectedY = (initial[0].y - 0.5) * canvasZoom + 0.5 + 10 / 600;
      expect(pins[0].x).toBeCloseTo(expectedX, 4); expect(pins[0].y).toBeCloseTo(expectedY, 4);
    }
    // Select the visible skin at its painted marker, then inspect the reticle.
    const result = await paint(page), pins = result.marks.filter((m: any) => m.kind === 'pin');
    const id = anatomicalView === 'dorsal' ? 'dorsal_skin' : 'ventral_skin';
    const pin = pins[0];
    const bounds = (await canvas.boundingBox())!;
    await page.mouse.click(bounds.x + pin.x * bounds.width, bounds.y + pin.y * bounds.height);
    await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe(id);
    const selected = await paint(page);
    expectStableSize(selected, 'selection');
    expect(selected.captions.length).toBeGreaterThan(0);
    for (const caption of selected.captions) {
      expect(caption.direction).toBe(1);
      expect(caption.size).toBeCloseTo(9 * selected.scale, 3);
    }
    await canvas.screenshot({ path: `${out}/selected-${anatomicalView}.png` });
  });
}

test.describe('phone markers', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('large-text high-contrast symbols and the guided ring remain legible', async ({ page }) => {
    await mount(page, { highContrast: true, largeText: true, canvasZoom: 2.5, anatomicalView: 'ventral' });
    expectStableSize(await paint(page), 'exposure');
    await page.locator('[data-diss-canvas]').screenshot({ path: `${out}/phone-high-contrast.png` });
    await page.evaluate(() => (window as any).__ctx.updateMulti('dissection', { activeLayer: 'skin', guidedMode: true, guidedStep: 0, canvasZoom: 1 }));
    await expect.poll(async () => (await paint(page)).marks.filter((m: any) => m.kind === 'guided').length).toBeGreaterThan(0);
    expectStableSize(await paint(page), 'guided');
    await page.evaluate(() => (window as any).__ctx.update('dissection', 'canvasZoom', 3));
    await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((el: any) => el._drawD.canvasZoom)).toBe(3);
    expectStableSize(await paint(page), 'guided');
  });
});
