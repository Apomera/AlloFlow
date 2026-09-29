import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-contact-feedback-2026-09-29';
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async ({}) => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

async function mount(page: Page, view: string, extra: Record<string, unknown> = {}) {
  await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', revealedLayers: { skin: true }, workspaceMode: 'advanced', selectedOrgan: view === 'ventral' ? 'ventral_skin' : 'dorsal_skin', anatomicalView: view, canvasZoom: 2.5, canvasPanX: -30, canvasPanY: 10, sceneDetail: false, parallaxDepth: false, reducedMotion: true, soundEnabled: false, ...extra } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  const canvas = page.locator('[data-diss-canvas]'); await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((el: any) => el._dissInViewport)).toBe(true);
}

async function paintFeedback(page: Page, point?: {x?: number; y?: number; useCurrent?: boolean}) {
  return page.locator('[data-diss-canvas]').evaluate((el: any, supplied: any) => {
    const org = el._drawOrgans.find((item: any) => item.id === el._drawD.selectedOrgan);
    if (!supplied?.useCurrent) el._toolPointer = supplied || { x: org.x, y: org.y };
    const ctx = el.getContext('2d'), original = { rect: ctx.roundRect, text: ctx.fillText, begin: ctx.beginPath };
    let recording = false; const lines: any[] = [];
    ctx.beginPath = function () { recording = false; return original.begin.call(this); };
    ctx.roundRect = function (x: number, y: number, w: number, h: number, ...args: any[]) {
      const box = el._contactFeedbackBox;
      if (box && x === box.x && y === box.y && w === box.width && h === box.height) recording = true;
      return original.rect.call(this, x, y, w, h, ...args);
    };
    ctx.fillText = function (value: string, x: number, y: number, ...args: any[]) {
      if (recording) {
        const m = this.getTransform();
        lines.push({ text: String(value), x, y, width: this.measureText(value).width,
          font: parseFloat(this.font.replace(/^bold /, '')) * Math.abs(m.a) / el.width * el.getBoundingClientRect().width });
      }
      return original.text.call(this, value, x, y, ...args);
    };
    try { el._drawDissectionNow(); } finally { ctx.roundRect = original.rect; ctx.fillText = original.text; ctx.beginPath = original.begin; }
    return { box: el._contactFeedbackBox, lines, guides: el._guidanceBoxes, W: el._logicalW, H: el._logicalH };
  }, point);
}

function expectReadable(result: Awaited<ReturnType<typeof paintFeedback>>) {
  const { box, lines, W, H } = result;
  expect(box).toBeTruthy(); expect(lines.length).toBeGreaterThanOrEqual(3);
  expect(box.x).toBeGreaterThanOrEqual(14); expect(box.y).toBeGreaterThanOrEqual(14);
  expect(box.x + box.width).toBeLessThanOrEqual(W - 13);
  expect(box.y + box.height).toBeLessThanOrEqual(H - 13);
  for (const line of lines) {
    expect(line.font).toBeGreaterThanOrEqual(11.9);
    expect(line.x).toBeGreaterThan(box.x);
    expect(line.x + line.width).toBeLessThan(box.x + box.width);
    expect(line.y).toBeGreaterThan(box.y); expect(line.y).toBeLessThan(box.y + box.height);
  }
  for (const guide of result.guides.filter((item: any) => item.priority === 8)) {
    const overlapW = Math.min(box.x + box.width, guide.x + guide.width) - Math.max(box.x, guide.x);
    const overlapH = Math.min(box.y + box.height, guide.y + guide.height) - Math.max(box.y, guide.y);
    expect(overlapW > 0 && overlapH > 0, 'feedback covers selected anatomy text').toBe(false);
  }
}

for (const view of ['dorsal', 'ventral']) {
  test(`feedback is readable and leaves selected captions clear in ${view} view`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await mount(page, view);
    const result = await paintFeedback(page); expectReadable(result);
    expect(result.lines.map(line => line.text).join(' ')).toContain('ELASTIC SKIN');
    await page.locator('[data-diss-canvas]').screenshot({ path: `${out}/desktop-${view}.png` });
    // The card must remain in the viewport for pointer contact near every edge.
    const bounds = (await page.locator('[data-diss-canvas]').boundingBox())!;
    for (const point of [{x:0.05,y:0.05}, {x:0.95,y:0.05}, {x:0.05,y:0.95}, {x:0.95,y:0.95}]) {
      await page.mouse.move(bounds.x + bounds.width * point.x, bounds.y + bounds.height * point.y);
      expectReadable(await paintFeedback(page, {useCurrent: true}));
    }
  });
}

test.describe('phone feedback', () => {
  test.use({ hasTouch: true, isMobile: true });
  for (const width of [390, 320]) {
    test(`${width}px feedback wraps readable text and preserves saved observations`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      const notes = { 'frog|ventral_skin': 'Keep this saved observation.' };
      await mount(page, 'ventral', { largeText: true, highContrast: width === 320, organNotes: notes, macroInset: false });
      expectReadable(await paintFeedback(page));
      expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes)).toEqual(notes);
      await page.locator('[data-diss-canvas]').screenshot({ path: `${out}/phone-${width}.png` });
    });
  }
});
