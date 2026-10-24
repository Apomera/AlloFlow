import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { observeEarthwormArchPaint } from './helpers/dissection_earthworm_arch_paint.cjs';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180,
  height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const healthy = { inspected: true, incisionStarted: true, incisionExtended: true, retracted: false, probed: true,
  pins: [{ x: .43, y: .32 }, { x: .57, y: .68 }], history: ['inspect', 'scalpel', 'scissors', 'pin', 'probe'],
  tissueState: { moisture: 65, tension: 40, exposure: 95, trauma: 0, clarity: 95, stability: 95, risk: 5,
    salineDrops: 0, variantId: 'standard', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] } };
const failures = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0, timeout: 120000 });
test.use({ video: 'off', viewport: { width: 1440, height: 1000 } });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; failures.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('[DissectionLab]')) messages.push(message.text()); });
  await harness.mount(page, { dissection: { specimen: 'earthworm', _dissLoadedSpec: 'earthworm', activeLayer: 'organs',
    anatomicalView: 'internal', workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false,
    visualRealism: 'realistic', labelMode: 'hidden', instrumentVisuals: false, sceneDetail: true, tissueRelief: true,
    inspectionLens: false, macroInset: false, focusMode: false, relationshipMode: false, depthAtlas: false,
    parallaxDepth: false, livingFunctionEnabled: false, variationSeed: 1, selectedOrgan: null, hoveredOrgan: null,
    canvasZoom: 1, canvasPanX: 0, canvasPanY: 0, revealedLayers: { skin: true, muscle: true, organs: true },
    procedureByLayer: { organs: healthy } } }, undefined, { expectCanvas: false });
});
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(failures.get(page) || []).toEqual([]); });
async function update(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => (window as any).__ctx.updateMulti('dissection', patch), patch);
  await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((node: any, patch) =>
    Object.entries(patch).every(([key, value]) => node._drawD[key] === value), patch)).toBe(true);
}
async function ready(page: Page) {
  const canvas = page.locator('[data-diss-canvas]');
  await canvas.evaluate((node: any) => { node.scrollIntoView({ block: 'center' }); node._drawDissectionNow(); });
  await expect.poll(() => canvas.evaluate((node: any) => node._dissInViewport)).toBe(true); return canvas;
}
function expectArches(drawing: any, detailed: boolean) {
  expect(drawing.rear).toHaveLength(10); expect(drawing.front).toHaveLength(10);
  expect(drawing.paints).toBe(detailed ? 28 : 11); expect(drawing.dorsalPaths).toBeGreaterThan(0);
  expect(drawing.insideCavity).toBe(true); expect(drawing.target).not.toBeNull();
  for (let i = 0; i < 10; i++) {
    expect(drawing.rear[i].startInsideStroke).toBe(true); expect(drawing.front[i].endInsideStroke).toBe(true);
    expect(drawing.front[i].end.x).toBeCloseTo(drawing.rear[i].start.x, 8);
    expect(drawing.front[i].end.y).toBeCloseTo(drawing.rear[i].start.y, 8);
  }
  expect(drawing.vesicles).toHaveLength(6);
  for (const sac of drawing.vesicles) expect(sac.containsTarget).toBe(false);
}
function expectReticle(drawing: any) {
  expect(drawing.reticle).not.toBeNull();
  expect(Math.abs(drawing.reticle.x - drawing.target.point.x)).toBeLessThan(.5);
  expect(Math.abs(drawing.reticle.y - drawing.target.point.y)).toBeLessThan(.5);
}
async function expectNativePreserved(page: Page) {
  expect(await page.locator('[data-diss-canvas]').evaluate((node: any) => {
    const before = JSON.stringify((window as any).__ctx.toolData.dissection), camera = [node._interactionZoom, node._interactionPanX, node._interactionPanY];
    const opaque = (context: CanvasRenderingContext2D, width: number, height: number) => {
      const pixels = context.getImageData(0, 0, width, height).data;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) return false;
      return true;
    };
    const visibleOpaque = opaque(node.getContext('2d'), node.width, node.height);
    const capture = (method: string) => {
      const destination = document.createElement('canvas'); destination.width = node._logicalW * 2; destination.height = node._logicalH * 2;
      const context = destination.getContext('2d')!;
      return { ok: node[method](context, destination.width, destination.height), opaque: opaque(context, destination.width, destination.height) };
    };
    const specimen = capture('_captureDissectionEvidence'), full = capture('_captureFullDissectionEvidence');
    return { specimen, full, visibleOpaque, preserved: before === JSON.stringify((window as any).__ctx.toolData.dissection),
      cameraPreserved: JSON.stringify(camera) === JSON.stringify([node._interactionZoom, node._interactionPanX, node._interactionPanY]),
      pins: (window as any).__ctx.toolData.dissection.procedureByLayer.organs.pins.length };
  })).toEqual({ specimen: { ok: true, opaque: true }, full: { ok: true, opaque: true }, visibleOpaque: true,
    preserved: true, cameraPreserved: true, pins: 2 });
}
test('arch junction target follows the actual vessel at three aspects, zoom and mirror', async ({ page }) => {
  for (const [width, height] of [[500, 600], [1000, 600], [320, 900]]) {
    const canvas = await ready(page);
    await canvas.evaluate((node: any, size) => { node._logicalW = size.width; node._logicalH = size.height;
      node.style.aspectRatio = `${size.width} / ${size.height}`; node.style.height = 'auto'; node._drawDissectionNow(); }, { width, height });
    for (const anatomicalView of ['internal', 'ventral']) {
      await update(page, { anatomicalView, canvasZoom: 1, canvasPanX: 0, canvasPanY: 0, selectedOrgan: null, hoveredOrgan: null });
      await ready(page); const initial = await observeEarthwormArchPaint(canvas); expectArches(initial, true);
      const zoom = anatomicalView === 'internal' ? 2 : 3, anchor = initial.target.normalized;
      await update(page, { canvasZoom: zoom, canvasPanX: (.5 - anchor.x) * width * zoom * (anatomicalView === 'ventral' ? -1 : 1),
        canvasPanY: (.5 - anchor.y) * height * zoom });
      await ready(page); const painted = await observeEarthwormArchPaint(canvas); expectArches(painted, true);
      expect(painted.logicalWidth).toBe(width); expect(painted.logicalHeight).toBe(height);
      await page.mouse.click(painted.target.point.x, painted.target.point.y);
      await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe('aortic_arches');
      const selected = await observeEarthwormArchPaint(canvas); expectArches(selected, true); expectReticle(selected);
      await expectNativePreserved(page);
    }
  }
});
test('clarity and detail-off modes keep paired arch strokes clear of later vesicle fills', async ({ page }) => {
  for (const presentation of [{ visualRealism: 'guided', highContrast: false, sceneDetail: true },
    { visualRealism: 'accessible', highContrast: true, sceneDetail: true },
    { visualRealism: 'realistic', highContrast: true, sceneDetail: true },
    { visualRealism: 'realistic', highContrast: false, sceneDetail: false }]) {
    await update(page, { ...presentation, selectedOrgan: 'aortic_arches', canvasZoom: 2, canvasPanX: -60, canvasPanY: 360 });
    const canvas = await ready(page), drawing = await observeEarthwormArchPaint(canvas);
    expectArches(drawing, false); expectReticle(drawing); await expectNativePreserved(page);
  }
  // Reproduce the high-pan phone view that exposed the transparent area above
  // the moving tray, while scanning every pixel in both native export types.
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
    (document.querySelector('#wrap') as HTMLElement).style.cssText = 'width:100%;max-width:1180px';
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const device = await page.context().newCDPSession(page);
  await device.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 });
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
  await update(page, { visualRealism: 'realistic', highContrast: false, sceneDetail: true, largeText: true,
    selectedOrgan: 'aortic_arches', canvasZoom: 2, canvasPanX: 0, canvasPanY: 0 });
  const canvas = await ready(page), initial = await observeEarthwormArchPaint(canvas), anchor = initial.target.normalized;
  await update(page, { canvasPanX: (.5 - anchor.x) * initial.logicalWidth * 2, canvasPanY: (.5 - anchor.y) * initial.logicalHeight * 2 });
  await ready(page); const phone = await observeEarthwormArchPaint(canvas);
  expect((await canvas.boundingBox())!.width).toBeLessThanOrEqual(390);
  expectArches(phone, true); expectReticle(phone); await expectNativePreserved(page);
  // A CSS width with a quarter pixel deliberately makes logical size × scale
  // differ from the rounded backing buffer. Its final row/column must stay opaque.
  await canvas.evaluate((node: any) => { node.style.width = '333.25px'; node.style.maxWidth = '333.25px'; node._dpr = 0; node._drawDissectionNow(); });
  await ready(page);
  const fractional = await canvas.evaluate((node: any) => Math.max(Math.abs(node.width - node._logicalW * node._dpr),
    Math.abs(node.height - node._logicalH * node._dpr)));
  expect(fractional).toBeGreaterThan(.01);
  const fractionalDrawing = await observeEarthwormArchPaint(canvas);
  expectArches(fractionalDrawing, true); expectReticle(fractionalDrawing); await expectNativePreserved(page);
  await device.detach();
});
