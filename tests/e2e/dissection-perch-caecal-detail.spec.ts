import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { observePerchCaecalPaint, observeCaecalCaptionPaint } from './helpers/dissection_perch_caecal_paint.cjs';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180,
  height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
// The visible central pouch point shared by the filled and centerline models.
const anchor = { x: .531082603665, y: .539848634444 };
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
  const errors: string[] = []; failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('[DissectionLab]')) errors.push(message.text()); });
  await harness.mount(page, { dissection: { specimen: 'perch', _dissLoadedSpec: 'perch', activeLayer: 'organs',
    anatomicalView: 'internal', workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false,
    visualRealism: 'realistic', labelMode: 'hidden', instrumentVisuals: false, sceneDetail: true, tissueRelief: true,
    inspectionLens: false, macroInset: false, focusMode: false, relationshipMode: false, depthAtlas: false,
    parallaxDepth: false, livingFunctionEnabled: false, variationSeed: 3, selectedOrgan: null, hoveredOrgan: null,
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
function expectCaeca(drawing: any, detailed: boolean, simplePaints = 3) {
  expect(drawing.matrixObserved).toBe(true); expect(drawing.target).not.toBeNull(); expect(drawing.insideCavity).toBe(true);
  expect(drawing.paints).toBe(detailed ? 21 : simplePaints);
  if (detailed) {
    expect(drawing.regions).toHaveLength(3); expect(drawing.regions.every((region: any) => region.closed)).toBe(true);
    expect(drawing.regions.some((region: any) => region.containsTarget)).toBe(true);
    expect(drawing.clips).toHaveLength(3); expect(drawing.clips.some((clip: any) => clip.containsTarget)).toBe(true);
    expect(drawing.courses).toHaveLength(0);
  } else {
    expect(drawing.regions).toHaveLength(0); expect(drawing.clips).toHaveLength(0); expect(drawing.courses).toHaveLength(3);
    expect(drawing.courses.some((course: any) => course.containsTarget)).toBe(true);
  }
  expect(drawing.intestineStrokes.length).toBeGreaterThan(0);
  expect(drawing.intestineStrokes.every((stroke: any) => !stroke.containsTarget)).toBe(true);
}
function expectReticle(drawing: any) {
  expect(drawing.reticle).not.toBeNull();
  expect(Math.abs(drawing.reticle.x - drawing.target.x)).toBeLessThan(.5);
  expect(Math.abs(drawing.reticle.y - drawing.target.y)).toBeLessThan(.5);
}
function expectCaptionClear(layout: any) {
  expect(layout.card).not.toBeNull(); expect(layout.leader).not.toBeNull(); expect(layout.caption).not.toBeNull();
  expect(layout.caption.text).toBe('DEEP \u00b7 POUCHES'); expect(layout.caption.fontCss).toBeGreaterThanOrEqual(8.5);
  expect(layout.caption.x).toBeGreaterThanOrEqual(0); expect(layout.caption.y).toBeGreaterThanOrEqual(0);
  expect(layout.caption.x + layout.caption.width).toBeLessThanOrEqual(layout.width + .5);
  expect(layout.caption.y + layout.caption.height).toBeLessThanOrEqual(layout.height + .5);
  expect(layout.crossesCaption).toBe(false);
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
test('three painted caeca retain a visible selectable target across aspects, zoom and mirror', async ({ page }) => {
  for (const [width, height, seed] of [[500, 600, 3], [1000, 600, 19], [320, 900, 7]]) {
    const canvas = await ready(page);
    await canvas.evaluate((node: any, size) => { node._logicalW = size.width; node._logicalH = size.height;
      node.style.aspectRatio = `${size.width} / ${size.height}`; node.style.height = 'auto'; node._drawDissectionNow(); }, { width, height });
    for (const anatomicalView of ['internal', 'ventral']) {
      const zoom = anatomicalView === 'internal' ? 2 : 3;
      await update(page, { anatomicalView, variationSeed: seed, canvasZoom: zoom,
        canvasPanX: (.5 - anchor.x) * width * zoom * (anatomicalView === 'ventral' ? -1 : 1),
        canvasPanY: (.5 - anchor.y) * height * zoom, selectedOrgan: null, hoveredOrgan: null });
      await ready(page); const painted = await observePerchCaecalPaint(canvas, anchor); expectCaeca(painted, true);
      expect(painted.logicalWidth).toBe(width); expect(painted.logicalHeight).toBe(height);
      await page.mouse.click(painted.target.x, painted.target.y);
      await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe('pyloric_ceca');
      const selected = await observePerchCaecalPaint(canvas, anchor); expectCaeca(selected, true); expectReticle(selected);
      expectCaptionClear(await observeCaecalCaptionPaint(canvas));
      await expectNativePreserved(page);
    }
  }
});
test('three caecal courses remain in clarity modes with opaque DPR2 and fractional-buffer exports', async ({ page }) => {
  for (const presentation of [{ visualRealism: 'guided', highContrast: false, sceneDetail: true, paints: 15 },
    { visualRealism: 'accessible', highContrast: true, sceneDetail: true, paints: 3 },
    { visualRealism: 'realistic', highContrast: true, sceneDetail: true, paints: 3 },
    { visualRealism: 'realistic', highContrast: false, sceneDetail: false, paints: 3 }]) {
    const { paints, ...patch } = presentation;
    await update(page, { ...patch, selectedOrgan: 'pyloric_ceca', canvasZoom: 2,
      canvasPanX: (.5 - anchor.x) * 1000, canvasPanY: (.5 - anchor.y) * 1200 });
    const canvas = await ready(page), drawing = await observePerchCaecalPaint(canvas, anchor);
    expectCaeca(drawing, false, paints); expectReticle(drawing); await expectNativePreserved(page);
    expectCaptionClear(await observeCaecalCaptionPaint(canvas));
  }
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
    (document.querySelector('#wrap') as HTMLElement).style.cssText = 'width:100%;max-width:1180px';
  });
  await page.setViewportSize({ width: 390, height: 844 }); const device = await page.context().newCDPSession(page);
  try {
    await device.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 });
    expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
    await update(page, { visualRealism: 'realistic', highContrast: false, sceneDetail: true, largeText: true,
      selectedOrgan: 'pyloric_ceca', canvasZoom: 2, canvasPanX: 0, canvasPanY: 0 });
    const canvas = await ready(page), size = await canvas.evaluate((node: any) => ({ width: node._logicalW, height: node._logicalH }));
    await update(page, { canvasPanX: (.5 - anchor.x) * size.width * 2, canvasPanY: (.5 - anchor.y) * size.height * 2 });
    await ready(page); const phone = await observePerchCaecalPaint(canvas, anchor);
    expect((await canvas.boundingBox())!.width).toBeLessThanOrEqual(390); expectCaeca(phone, true); expectReticle(phone);
    expectCaptionClear(await observeCaecalCaptionPaint(canvas));
    await expectNativePreserved(page);
    await canvas.evaluate((node: any) => { node.style.width = '333.25px'; node.style.maxWidth = '333.25px'; node._dpr = 0; node._drawDissectionNow(); });
    await ready(page);
    expect(await canvas.evaluate((node: any) => Math.max(Math.abs(node.width - node._logicalW * node._dpr), Math.abs(node.height - node._logicalH * node._dpr)))).toBeGreaterThan(.01);
    const fractional = await observePerchCaecalPaint(canvas, anchor); expectCaeca(fractional, true); expectReticle(fractional); await expectNativePreserved(page);
    expectCaptionClear(await observeCaecalCaptionPaint(canvas));
  } finally { await device.detach(); }
});
