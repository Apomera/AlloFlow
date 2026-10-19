import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180,
  height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const procedure = { inspected: true, incisionStarted: true, incisionExtended: true, retracted: false, probed: true,
  pins: [{ x: .43, y: .32 }, { x: .57, y: .68 }], history: ['inspect', 'scalpel', 'scissors', 'pin', 'probe'],
  tissueState: { moisture: 65, tension: 40, exposure: 95, trauma: 0, clarity: 95, stability: 95, risk: 5,
    salineDrops: 0, variantId: 'standard', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] } };
const failures = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0, timeout: 180000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; failures.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('[DissectionLab]')) messages.push(message.text()); });
});
test.afterEach(async ({ page }) => {
  await harness.unmount(page);
  expect(failures.get(page) || []).toEqual([]);
});

async function mount(page: Page, largeText = false) {
  await harness.mount(page, { dissection: { specimen: 'sheepEye', _dissLoadedSpec: 'sheepEye', activeLayer: 'organs',
    anatomicalView: 'internal', workspaceMode: 'advanced', visualRealism: 'guided', livingFunctionEnabled: true,
    livingFunctionPaused: true, reducedMotion: true, soundEnabled: false, sceneDetail: true, largeText,
    labelMode: 'show', instrumentVisuals: false, inspectionLens: false, macroInset: false, parallaxDepth: false,
    relationshipMode: false, depthAtlas: false, canvasZoom: 1, canvasPanX: 0, canvasPanY: 0,
    annotations: [{ x: .36, y: .43 }, { x: .45, y: .46, prevX: .36, prevY: .43 }],
    revealedLayers: { skin: true, muscle: true, organs: true }, procedureByLayer: { organs: procedure } } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: '#wrap { width:100%!important; max-width:1180px; }' });
}

async function paintCaption(page: Page) {
  const canvas = page.locator('[data-diss-canvas]');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((node: any) => node._dissInViewport === true)).toBe(true);
  return canvas.evaluate((node: any) => {
    const ctx = node.getContext('2d'), original = ctx.fillText, captions: any[] = [];
    ctx.fillText = function (value: string, x: number, y: number, ...rest: any[]) {
      if (String(value) === 'Refracted light') {
        const metrics = this.measureText(value), transform = this.getTransform(), box = node.getBoundingClientRect();
        const corners = [[x - metrics.actualBoundingBoxLeft, y - metrics.actualBoundingBoxAscent],
          [x + metrics.actualBoundingBoxRight, y - metrics.actualBoundingBoxAscent],
          [x - metrics.actualBoundingBoxLeft, y + metrics.actualBoundingBoxDescent],
          [x + metrics.actualBoundingBoxRight, y + metrics.actualBoundingBoxDescent]]
          .map(([a, b]) => new DOMPoint(a, b).matrixTransform(transform));
        const cssX = box.width / node.width, cssY = box.height / node.height;
        captions.push({ text: String(value), left: Math.min(...corners.map(p => p.x)) * cssX,
          right: Math.max(...corners.map(p => p.x)) * cssX, top: Math.min(...corners.map(p => p.y)) * cssY,
          bottom: Math.max(...corners.map(p => p.y)) * cssY, canvasWidth: box.width, canvasHeight: box.height,
          cssFontPx: Number(/([\d.]+)px/.exec(this.font)![1]) * Math.hypot(transform.a, transform.b) * cssX,
          upright: transform.a > 0 && transform.d > 0 && Math.abs(transform.b) < .00001 && Math.abs(transform.c) < .00001 });
      }
      return original.call(this, value, x, y, ...rest);
    };
    try { node._drawDissectionNow(); } finally { ctx.fillText = original; }
    return captions;
  });
}

function expectCaption(captions: any[], fontSize: number) {
  expect(captions).toHaveLength(1);
  const caption = captions[0];
  expect(caption.text).toBe('Refracted light'); expect(caption.upright).toBe(true);
  expect(caption.cssFontPx).toBeCloseTo(fontSize, 1);
  // Measure actual painted ink after the complete camera, mirror and DPR transform.
  expect(caption.left).toBeGreaterThanOrEqual(11.5); expect(caption.top).toBeGreaterThanOrEqual(11.5);
  expect(caption.right).toBeLessThanOrEqual(caption.canvasWidth - 11.5);
  expect(caption.bottom).toBeLessThanOrEqual(caption.canvasHeight - 11.5);
  expect(caption.right - caption.left).toBeGreaterThan(50);
}

async function update(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => (window as any).__ctx.updateMulti('dissection', patch), patch);
  await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((node: any, patch) =>
    Object.entries(patch).every(([key, value]) => node._drawD[key] === value), patch)).toBe(true);
}

test('optical caption keeps its reading size and full text through zoom, pan, mirrored view and quiz', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page);
  for (const anatomicalView of ['internal', 'ventral']) for (const canvasZoom of [1, 2, 3]) {
    await update(page, { anatomicalView, canvasZoom, canvasPanX: anatomicalView === 'ventral' ? -80 : 65, canvasPanY: anatomicalView === 'ventral' ? 50 : -35 });
    expectCaption(await paintCaption(page), 12);
  }
  // Realistic anatomy retains the optics lesson only while the function model is enabled.
  await update(page, { visualRealism: 'realistic', livingFunctionEnabled: false });
  expect(await paintCaption(page)).toEqual([]);
  await update(page, { livingFunctionEnabled: true }); expectCaption(await paintCaption(page), 12);
  const evidence = await page.locator('[data-diss-canvas]').evaluate((node: any) => {
    const saved = JSON.stringify((window as any).__ctx.toolData.dissection);
    const camera = [node._interactionZoom, node._interactionPanX, node._interactionPanY];
    const destination = document.createElement('canvas'); destination.width = 1000; destination.height = 1200;
    const ok = node._captureDissectionEvidence(destination.getContext('2d'), 1000, 1200);
    return { ok, preserved: saved === JSON.stringify((window as any).__ctx.toolData.dissection), camera,
      afterCamera: [node._interactionZoom, node._interactionPanX, node._interactionPanY] };
  });
  expect(evidence.ok).toBe(true); expect(evidence.preserved).toBe(true); expect(evidence.afterCamera).toEqual(evidence.camera);
  expectCaption(await paintCaption(page), 12);
  await update(page, { quizMode: true }); expect(await paintCaption(page)).toEqual([]);
});

test.describe('narrow touch and landscape presentation', () => {
  test.use({ viewport: { width: 320, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  test('large text caption remains inside the canvas with annotations and extreme camera positions', async ({ page }) => {
    await mount(page, true);
    for (const viewport of [{ width: 320, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      for (const anatomicalView of ['internal', 'ventral']) {
        await update(page, { anatomicalView, canvasZoom: 3, canvasPanX: anatomicalView === 'ventral' ? -180 : 180, canvasPanY: anatomicalView === 'ventral' ? 150 : -150, annotateMode: true });
        expectCaption(await paintCaption(page), 14);
      }
    }
    const points = await page.evaluate(() => (window as any).__ctx.toolData.dissection.annotations);
    expect(points).toEqual([{ x: .36, y: .43 }, { x: .45, y: .46, prevX: .36, prevY: .43 }]);
  });
});
