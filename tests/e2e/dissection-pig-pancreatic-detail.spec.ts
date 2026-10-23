import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { observePigPancreaticPaint, observePigPancreaticCaption } from './helpers/dissection_pig_pancreatic_paint.cjs';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180,
  height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
// A painted pancreatic point outside later bowel and membrane paint.
const anchor = { x: .63175, y: .533 };
const healthy = { inspected: true, incisionStarted: true, incisionExtended: true, retracted: false, probed: true,
  pins: [{ x: .43, y: .32 }, { x: .57, y: .68 }], history: ['inspect', 'scalpel', 'scissors', 'pin', 'probe'],
  tissueState: { moisture: 65, tension: 40, exposure: 95, trauma: 0, clarity: 95, stability: 95, risk: 5,
    salineDrops: 0, variantId: 'standard', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] } };
const failures = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0, timeout: 180000 });
test.use({ video: 'off', viewport: { width: 1440, height: 1000 } });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('[DissectionLab]')) errors.push(message.text()); });
  await harness.mount(page, { dissection: { specimen: 'pig', _dissLoadedSpec: 'pig', activeLayer: 'organs',
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
function expectPancreas(drawing: any, detailed: boolean, folds = detailed) {
  expect(drawing.matrixObserved).toBe(true); expect(drawing.target).not.toBeNull(); expect(drawing.cavityContainsTarget).toBe(true);
  expect(drawing.regions).toEqual([{ cubics: 12, containsTarget: true }]);
  expect(drawing.clips).toHaveLength(detailed ? 2 : 0);
  expect(drawing.clips.every((clip: any) => clip.cubics === 12 && clip.containsTarget)).toBe(true);
  expect(drawing.surfaceStrokes).toBe(detailed ? 8 : 0);
  expect(drawing.neighbors.map((neighbor: any) => neighbor.id)).toEqual(['stomach_p', 'spleen_p']);
  expect(drawing.neighbors.every((neighbor: any) => neighbor.insideOwnPaint && !neighbor.coveredByPancreas)).toBe(true);
  const owners = drawing.overpaints.map((paint: any) => paint.owner);
  for (const owner of ['mesentery', 'jejunum', 'colon', 'bladder', 'umbilical', 'urachus']) expect(owners).toContain(owner);
  if (folds) expect(owners).toContain('mesentery-fold');
  expect(drawing.overpaints.some((paint: any) => paint.owner === 'colon' && paint.lines === 54)).toBe(true);
  const colon = drawing.overpaints.filter((paint: any) => paint.owner === 'colon');
  expect(colon.length).toBeGreaterThan(0);
  expect(colon.every((paint: any) => paint.targetPixelUnchanged && paint.targetPixelBefore.length === 4)).toBe(true);
  expect(drawing.overpaints.some((paint: any) => paint.owner === 'jejunum' && paint.containsLegacyTarget)).toBe(true);
  expect(drawing.overpaints.every((paint: any) => !paint.containsTarget)).toBe(true);
}
function expectReticle(drawing: any) {
  expect(drawing.reticle).not.toBeNull();
  expect(Math.abs(drawing.reticle.x - drawing.target.x)).toBeLessThan(.5);
  expect(Math.abs(drawing.reticle.y - drawing.target.y)).toBeLessThan(.5);
}
function expectCaptionClear(layout: any) {
  expect(layout.card).not.toBeNull(); expect(layout.leader).not.toBeNull(); expect(layout.caption).not.toBeNull();
  expect(layout.caption.text).toBe('DEEP \u00b7 LOBED'); expect(layout.caption.fontCss).toBeGreaterThanOrEqual(8.5);
  expect(layout.caption.x).toBeGreaterThanOrEqual(0); expect(layout.caption.y).toBeGreaterThanOrEqual(0);
  expect(layout.caption.x + layout.caption.width).toBeLessThanOrEqual(layout.width + .5);
  expect(layout.caption.y + layout.caption.height).toBeLessThanOrEqual(layout.height + .5);
  expect(layout.crossesCaption).toBe(false);
  expect(layout.markers.length).toBeGreaterThan(0);
  expect(layout.markers.some((marker: any) => marker.kind === 'point')).toBe(true);
  expect(layout.markerIntersections).toEqual([]);
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
test('pig pancreas stays visibly selectable through aspects, zoom and mirrored views', async ({ page }) => {
  for (const [width, height, seed] of [[500, 600, 3], [1000, 600, 19], [320, 900, 7]]) {
    const canvas = await ready(page);
    await canvas.evaluate((node: any, size) => { node._logicalW = size.width; node._logicalH = size.height;
      node.style.aspectRatio = `${size.width} / ${size.height}`; node.style.height = 'auto'; node._drawDissectionNow(); }, { width, height });
    for (const anatomicalView of ['internal', 'ventral']) {
      const zoom = anatomicalView === 'internal' ? 2 : 3;
      await update(page, { anatomicalView, variationSeed: seed, canvasZoom: zoom,
        canvasPanX: (.5 - anchor.x) * width * zoom * (anatomicalView === 'ventral' ? -1 : 1),
        canvasPanY: (.5 - anchor.y) * height * zoom, selectedOrgan: null, hoveredOrgan: null });
      await ready(page); const painted = await observePigPancreaticPaint(canvas, anchor); expectPancreas(painted, true);
      expect(painted.logicalWidth).toBe(width); expect(painted.logicalHeight).toBe(height);
      await page.mouse.click(painted.target.x, painted.target.y);
      await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe('pancreas_p');
      const selected = await observePigPancreaticPaint(canvas, anchor); expectPancreas(selected, true); expectReticle(selected);
      expectCaptionClear(await observePigPancreaticCaption(canvas));
      await expectNativePreserved(page);
    }
  }
});
test('pancreatic clarity contours and native exports remain intact on DPR2 and fractional buffers', async ({ page }) => {
  for (const presentation of [{ visualRealism: 'guided', highContrast: false, sceneDetail: true, detailed: true, folds: true },
    { visualRealism: 'accessible', highContrast: true, sceneDetail: true, detailed: false, folds: false },
    { visualRealism: 'realistic', highContrast: true, sceneDetail: true, detailed: false },
    { visualRealism: 'realistic', highContrast: false, sceneDetail: false, detailed: false, folds: false }]) {
    const { detailed, folds, ...patch } = presentation;
    await update(page, { ...patch, selectedOrgan: 'pancreas_p', canvasZoom: 2,
      canvasPanX: (.5 - anchor.x) * 1000, canvasPanY: (.5 - anchor.y) * 1200 });
    const canvas = await ready(page), drawing = await observePigPancreaticPaint(canvas, anchor);
    expectPancreas(drawing, detailed, folds); expectReticle(drawing); await expectNativePreserved(page);
    expectCaptionClear(await observePigPancreaticCaption(canvas));
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
      selectedOrgan: 'pancreas_p', canvasZoom: 2, canvasPanX: 0, canvasPanY: 0 });
    const canvas = await ready(page), size = await canvas.evaluate((node: any) => ({ width: node._logicalW, height: node._logicalH }));
    await update(page, { canvasPanX: (.5 - anchor.x) * size.width * 2, canvasPanY: (.5 - anchor.y) * size.height * 2 });
    await ready(page); const phone = await observePigPancreaticPaint(canvas, anchor);
    expect((await canvas.boundingBox())!.width).toBeLessThanOrEqual(390); expectPancreas(phone, true); expectReticle(phone);
    const phoneCaption = await observePigPancreaticCaption(canvas); expectCaptionClear(phoneCaption);
    expect(phoneCaption.markers.some((marker: any) => marker.kind === 'badge' && marker.number === '5')).toBe(true);
    await expectNativePreserved(page);
    await canvas.evaluate((node: any) => { node.style.width = '333.25px'; node.style.maxWidth = '333.25px'; node._dpr = 0; node._drawDissectionNow(); });
    await ready(page);
    expect(await canvas.evaluate((node: any) => Math.max(Math.abs(node.width - node._logicalW * node._dpr), Math.abs(node.height - node._logicalH * node._dpr)))).toBeGreaterThan(.01);
    const fractional = await observePigPancreaticPaint(canvas, anchor); expectPancreas(fractional, true); expectReticle(fractional); await expectNativePreserved(page);
    expectCaptionClear(await observePigPancreaticCaption(canvas));
  } finally { await device.detach(); }
});
