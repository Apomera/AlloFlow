import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { observePigSplenicPaint, observePigSplenicCaption } from './helpers/dissection_pig_splenic_paint.cjs';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180,
  height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
// The exact painted center of the newly selectable external splenic surface.
const anchor = { x: .517, y: .506 };
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
function expectSpleen(drawing: any, detailed: boolean) {
  expect(drawing.matrixObserved).toBe(true); expect(drawing.target).not.toBeNull(); expect(drawing.cavityContainsTarget).toBe(true);
  expect(drawing.regions).toEqual([{ cubics: 8, containsTarget: true }]);
  expect(drawing.clips).toHaveLength(detailed ? 1 : 0);
  if (detailed) expect(drawing.clips[0]).toEqual({ cubics: 8, containsTarget: true });
  expect(drawing.neighbors.map((neighbor: any) => neighbor.id)).toEqual(['stomach_p', 'pancreas_p']);
  expect(drawing.neighbors.every((neighbor: any) => neighbor.insideOwnPaint && !neighbor.coveredBySpleen)).toBe(true);
  const owners = drawing.overpaints.map((paint: any) => paint.owner);
  for (const owner of ['pancreas_p', 'mesentery', 'jejunum', 'umbilical']) expect(owners).toContain(owner);
  expect(drawing.overpaints.every((paint: any) => !paint.containsTarget)).toBe(true);
}
function expectReticle(drawing: any) {
  expect(drawing.reticle).not.toBeNull();
  expect(Math.abs(drawing.reticle.x - drawing.target.x)).toBeLessThan(.5);
  expect(Math.abs(drawing.reticle.y - drawing.target.y)).toBeLessThan(.5);
}
function expectCaptionClear(layout: any) {
  expect(layout.card).not.toBeNull(); expect(layout.leader).not.toBeNull(); expect(layout.caption).not.toBeNull();
  expect(layout.caption.text).toBe('DEEP \u00b7 ELONGATE'); expect(layout.caption.fontCss).toBeGreaterThanOrEqual(8.5);
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
test('new pig spleen is selectable from actual tissue and the appended directory entry', async ({ page }) => {
  const orderedIds = ['heart_p', 'lungs_p', 'liver_p', 'stomach_p', 'sm_int_p', 'lg_int_p', 'kidneys_p', 'thymus_p', 'pancreas_p', 'bladder_p', 'spleen_p'];
  await expect(page.locator('.diss-directory-item')).toHaveCount(11);
  expect(await page.locator('.diss-directory-item').evaluateAll(nodes => nodes.map(node => node.id))).toEqual(orderedIds.map(id => 'diss-organ-' + id));
  expect(await page.locator('.diss-directory-index').allTextContents()).toEqual(orderedIds.map((_, index) => String(index + 1)));
  await expect(page.locator('#diss-organ-spleen_p .diss-directory-item__name')).toHaveText('Spleen');
  for (const [width, height, seed] of [[500, 600, 3], [1000, 600, 19], [320, 900, 7]]) {
    const canvas = await ready(page);
    await canvas.evaluate((node: any, size) => { node._logicalW = size.width; node._logicalH = size.height;
      node.style.aspectRatio = `${size.width} / ${size.height}`; node.style.height = 'auto'; node._drawDissectionNow(); }, { width, height });
    for (const anatomicalView of ['internal', 'ventral']) {
      const zoom = anatomicalView === 'internal' ? 2 : 3;
      await update(page, { anatomicalView, variationSeed: seed, canvasZoom: zoom,
        canvasPanX: (.5 - anchor.x) * width * zoom * (anatomicalView === 'ventral' ? -1 : 1),
        canvasPanY: (.5 - anchor.y) * height * zoom, selectedOrgan: null, hoveredOrgan: null });
      await ready(page); const painted = await observePigSplenicPaint(canvas, anchor); expectSpleen(painted, true);
      expect(painted.logicalWidth).toBe(width); expect(painted.logicalHeight).toBe(height);
      await page.mouse.click(painted.target.x, painted.target.y);
      await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe('spleen_p');
      const selected = await observePigSplenicPaint(canvas, anchor); expectSpleen(selected, true); expectReticle(selected);
      expectCaptionClear(await observePigSplenicCaption(canvas));
      await expectNativePreserved(page);
    }
  }
  // The directory reaches the same new structure, and neighboring real paint
  // targets remain selectable after the extra entry is appended.
  await update(page, { anatomicalView: 'internal', selectedOrgan: null, hoveredOrgan: null, variationSeed: 3, canvasZoom: 2,
    canvasPanX: (.5 - anchor.x) * 1000, canvasPanY: (.5 - anchor.y) * 1200 });
  const canvas = await ready(page);
  await canvas.evaluate((node: any) => { node._logicalW = 500; node._logicalH = 600; node.style.aspectRatio = '500 / 600'; node.style.height = 'auto'; node._drawDissectionNow(); });
  await page.locator('#diss-organ-spleen_p').click();
  await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe('spleen_p');
  await expect(page.locator('#diss-selection-title')).toHaveText('Spleen');
  for (const id of ['stomach_p', 'pancreas_p']) {
    await update(page, { selectedOrgan: null, hoveredOrgan: null });
    await ready(page); const drawing = await observePigSplenicPaint(canvas, anchor); expectSpleen(drawing, true);
    const neighbor = drawing.neighbors.find((candidate: any) => candidate.id === id)!;
    await page.mouse.click(neighbor.target.x, neighbor.target.y);
    await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe(id);
  }
  await expectNativePreserved(page);
});
test('splenic clarity contours, neighbors and native exports remain intact on DPR2 and fractional buffers', async ({ page }) => {
  for (const presentation of [{ visualRealism: 'guided', highContrast: false, sceneDetail: true, detailed: true },
    { visualRealism: 'accessible', highContrast: true, sceneDetail: true, detailed: false },
    { visualRealism: 'realistic', highContrast: true, sceneDetail: true, detailed: false },
    { visualRealism: 'realistic', highContrast: false, sceneDetail: false, detailed: false }]) {
    const { detailed, ...patch } = presentation;
    await update(page, { ...patch, selectedOrgan: 'spleen_p', canvasZoom: 2,
      canvasPanX: (.5 - anchor.x) * 1000, canvasPanY: (.5 - anchor.y) * 1200 });
    const canvas = await ready(page), drawing = await observePigSplenicPaint(canvas, anchor);
    expectSpleen(drawing, detailed); expectReticle(drawing); await expectNativePreserved(page);
    expectCaptionClear(await observePigSplenicCaption(canvas));
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
      selectedOrgan: 'spleen_p', canvasZoom: 2, canvasPanX: 0, canvasPanY: 0 });
    const canvas = await ready(page), size = await canvas.evaluate((node: any) => ({ width: node._logicalW, height: node._logicalH }));
    await update(page, { canvasPanX: (.5 - anchor.x) * size.width * 2, canvasPanY: (.5 - anchor.y) * size.height * 2 });
    await ready(page); const phone = await observePigSplenicPaint(canvas, anchor);
    expect((await canvas.boundingBox())!.width).toBeLessThanOrEqual(390); expectSpleen(phone, true); expectReticle(phone);
    const phoneCaption = await observePigSplenicCaption(canvas); expectCaptionClear(phoneCaption);
    expect(phoneCaption.markers.some((marker: any) => marker.kind === 'badge' && marker.number === '5')).toBe(true);
    await expectNativePreserved(page);
    await canvas.evaluate((node: any) => { node.style.width = '333.25px'; node.style.maxWidth = '333.25px'; node._dpr = 0; node._drawDissectionNow(); });
    await ready(page);
    expect(await canvas.evaluate((node: any) => Math.max(Math.abs(node.width - node._logicalW * node._dpr), Math.abs(node.height - node._logicalH * node._dpr)))).toBeGreaterThan(.01);
    const fractional = await observePigSplenicPaint(canvas, anchor); expectSpleen(fractional, true); expectReticle(fractional); await expectNativePreserved(page);
    expectCaptionClear(await observePigSplenicCaption(canvas));
  } finally { await device.detach(); }
});
