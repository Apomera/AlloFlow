import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { antennalTarget as anchor, observeCrayfishAntennalPaint, observeCrayfishAntennalCaption } from './helpers/dissection_crayfish_antennal_paint.cjs';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180,
  height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
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
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('[DissectionLab]')) errors.push(message.text()); });
  await harness.mount(page, { dissection: { specimen: 'crayfish', _dissLoadedSpec: 'crayfish', activeLayer: 'organs',
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
async function expectNativePreserved(page: Page) {
  expect(await page.locator('[data-diss-canvas]').evaluate((node: any) => {
    const before = JSON.stringify((window as any).__ctx.toolData.dissection), camera = [node._interactionZoom, node._interactionPanX, node._interactionPanY];
    const opaque = (context: CanvasRenderingContext2D, width: number, height: number) => {
      const pixels = context.getImageData(0, 0, width, height).data;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) return false; return true;
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
function overlaps(a: any, b: any) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
function expectAntennal(drawing: any, detailed: boolean) {
  expect(drawing.matrixObserved).toBe(true); expect(drawing.target).not.toBeNull(); expect(drawing.finishedAnatomy).toBe(true);
  expect(drawing.regions).toHaveLength(2);
  for (const region of drawing.regions) {
    expect(region.cubics).toBe(6); expect(region.containsCenters.filter(Boolean)).toHaveLength(1);
    expect(region.bounds.width).toBeGreaterThan(0); expect(region.bounds.height).toBeGreaterThan(0);
  }
  for (let i = 0; i < 2; i++) expect(drawing.regions.filter((region: any) => region.containsCenters[i])).toHaveLength(1);
  expect(drawing.clips).toHaveLength(detailed ? 4 : 0);
  expect(drawing.clips.every((clip: any) => clip.cubics === 6 && clip.containsCenters.filter(Boolean).length === 1)).toBe(true);
  for (let i = 0; i < 2; i++) expect(drawing.clips.filter((clip: any) => clip.containsCenters[i])).toHaveLength(detailed ? 2 : 0);
  expect(drawing.windowClips.length).toBeGreaterThan(0);
  expect(drawing.windowClips.every((clip: any) => clip.containsCenters.length === 2 && clip.containsCenters.every(Boolean))).toBe(true);
  const owners = drawing.laterPaint.map((paint: any) => paint.owner);
  for (const owner of ['hepato', 'heart', 'gonad', 'gills']) expect(owners).toContain(owner);
  expect(drawing.laterPaint.every((paint: any) => paint.containsCenters.length === 2 && paint.containsCenters.every((value: boolean) => !value) &&
    paint.centerPixelsUnchanged.length === 2 && paint.centerPixelsUnchanged.every(Boolean))).toBe(true);
  expect(drawing.pairedCenters.map((point: any) => point.normalized)).toEqual([{ x: .295, y: .412 }, { x: .295, y: .488 }]);
  expect(drawing.neighbors.map((neighbor: any) => neighbor.id)).toEqual(['gastric_mill', 'hepato']);
  expect(drawing.neighbors.every((neighbor: any) => neighbor.ownPaintCount > 0 && neighbor.insideOwnPaint && !neighbor.coveredByGlands)).toBe(true);
}
function expectReticle(drawing: any) {
  expect(drawing.reticle).not.toBeNull();
  expect(Math.hypot(drawing.reticle.x - drawing.target.x, drawing.reticle.y - drawing.target.y)).toBeLessThan(.5);
}
function expectCaptionClear(layout: any, drawing: any, phone = false) {
  expect(layout.card).not.toBeNull(); expect(layout.leader).not.toBeNull(); expect(layout.caption).not.toBeNull();
  expect(layout.caption.text).toBe('DEEP \u00b7 COMPACT'); expect(layout.caption.fontCss).toBeGreaterThanOrEqual(8.5);
  expect(layout.caption.x).toBeGreaterThanOrEqual(0); expect(layout.caption.y).toBeGreaterThanOrEqual(0);
  expect(layout.caption.x + layout.caption.width).toBeLessThanOrEqual(layout.width + .5);
  expect(layout.caption.y + layout.caption.height).toBeLessThanOrEqual(layout.height + .5);
  expect(layout.crossesCaption).toBe(false); expect(layout.markers.length).toBeGreaterThan(0); expect(layout.markerIntersections).toEqual([]);
  for (const region of drawing.regions) {
    expect(overlaps(layout.card, region.bounds)).toBe(false); expect(overlaps(layout.caption, region.bounds)).toBe(false);
  }
  if (phone) {
    for (const id of ['orientation', 'scale']) {
      expect(layout.hudPanels.some((panel: any) => panel.id === id)).toBe(true);
      expect(layout.cardHudIntersections).not.toContain(id); expect(layout.captionHudIntersections).not.toContain(id);
    }
    const a = layout.hudPanels.find((panel: any) => panel.id === 'orientation'), b = layout.hudPanels.find((panel: any) => panel.id === 'scale');
    expect(overlaps(a, b)).toBe(false);
  }
}
async function toggleCardAndReselect(page: Page, canvas: any) {
  const drawing = await observeCrayfishAntennalPaint(canvas), layout = await observeCrayfishAntennalCaption(canvas, 'green_gland');
  expectCaptionClear(layout, drawing, true);
  const field = await canvas.boundingBox(); expect(field).not.toBeNull();
  const x = field.x + layout.card.x + layout.card.width / 2, y = field.y + layout.card.y + layout.card.height / 2;
  await page.mouse.move(x, y);
  await expect(page.locator('#diss-canvas-status')).toContainText('Selected Green Glands in the Internal Organs layer.');
  await page.mouse.click(x, y);
  await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBeNull();
  await ready(page); const unselected = await observeCrayfishAntennalPaint(canvas);
  await page.mouse.click(unselected.target.x, unselected.target.y);
  await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe('green_gland');
  expectReticle(await observeCrayfishAntennalPaint(canvas));
}
test('paired antennal tissue remains selectable and uncovered across aspects, zoom and mirrored views', async ({ page }) => {
  for (const [width, height, seed] of [[500, 600, 3], [1000, 600, 19], [320, 900, 7]]) {
    const canvas = await ready(page);
    await canvas.evaluate((node: any, size) => { node._logicalW = size.width; node._logicalH = size.height; node.style.aspectRatio = `${size.width} / ${size.height}`; node.style.height = 'auto'; node._drawDissectionNow(); }, { width, height });
    for (const anatomicalView of ['internal', 'ventral']) {
      const zoom = anatomicalView === 'internal' ? 2 : 3;
      await update(page, { anatomicalView, variationSeed: seed, canvasZoom: zoom,
        canvasPanX: (.5 - anchor.x) * width * zoom * (anatomicalView === 'ventral' ? -1 : 1), canvasPanY: (.5 - anchor.y) * height * zoom,
        selectedOrgan: null, hoveredOrgan: null });
      await ready(page); const drawing = await observeCrayfishAntennalPaint(canvas); expectAntennal(drawing, true);
      expect(drawing.logicalWidth).toBe(width); expect(drawing.logicalHeight).toBe(height);
      await page.mouse.click(drawing.target.x, drawing.target.y);
      await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe('green_gland');
      const selected = await observeCrayfishAntennalPaint(canvas); expectAntennal(selected, true); expectReticle(selected);
      expectCaptionClear(await observeCrayfishAntennalCaption(canvas, 'green_gland'), selected); await expectNativePreserved(page);
    }
  }
  const canvas = await ready(page);
  await canvas.evaluate((node: any) => { node._logicalW = 500; node._logicalH = 600; node.style.aspectRatio = '500 / 600'; node.style.height = 'auto'; node._drawDissectionNow(); });
  await update(page, { anatomicalView: 'internal', canvasZoom: 2, canvasPanX: 0, canvasPanY: 0, selectedOrgan: null, hoveredOrgan: null });
  await page.locator('#diss-organ-green_gland').click();
  await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe('green_gland');
  for (const id of ['gastric_mill', 'hepato']) {
    await update(page, { selectedOrgan: null, hoveredOrgan: null }); await ready(page);
    const drawing = await observeCrayfishAntennalPaint(canvas); expectAntennal(drawing, true);
    const neighbor = drawing.neighbors.find((neighbor: any) => neighbor.id === id);
    await page.mouse.click(neighbor.target.x, neighbor.target.y);
    await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe(id);
  }
});
test('antennal clarity modes and phone selection preserve paired surfaces and opaque native exports', async ({ page }) => {
  for (const mode of [{ visualRealism: 'guided', highContrast: false, sceneDetail: true, detailed: true },
    { visualRealism: 'accessible', highContrast: true, sceneDetail: true, detailed: false },
    { visualRealism: 'realistic', highContrast: true, sceneDetail: true, detailed: false },
    { visualRealism: 'realistic', highContrast: false, sceneDetail: false, detailed: false }]) {
    const { detailed, ...presentation } = mode;
    await update(page, { ...presentation, selectedOrgan: 'green_gland', canvasZoom: 2, canvasPanX: (.5 - anchor.x) * 1000, canvasPanY: (.5 - anchor.y) * 1200 });
    const canvas = await ready(page), drawing = await observeCrayfishAntennalPaint(canvas);
    expectAntennal(drawing, detailed); expectReticle(drawing);
    expectCaptionClear(await observeCrayfishAntennalCaption(canvas, 'green_gland'), drawing); await expectNativePreserved(page);
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
    await update(page, { visualRealism: 'realistic', highContrast: false, sceneDetail: true, largeText: true, selectedOrgan: 'green_gland',
      canvasZoom: 2, canvasPanX: (.5 - anchor.x) * 1000, canvasPanY: (.5 - anchor.y) * 1200 });
    const canvas = await ready(page); let drawing = await observeCrayfishAntennalPaint(canvas);
    expectAntennal(drawing, true); expectReticle(drawing); await toggleCardAndReselect(page, canvas); await expectNativePreserved(page);
    await canvas.evaluate((node: any) => { node.style.width = '333.25px'; node.style.maxWidth = '333.25px'; node._dpr = 0; node._drawDissectionNow(); });
    await ready(page); expect(await canvas.evaluate((node: any) => Math.max(Math.abs(node.width - node._logicalW * node._dpr), Math.abs(node.height - node._logicalH * node._dpr)))).toBeGreaterThan(.01);
    drawing = await observeCrayfishAntennalPaint(canvas); expectAntennal(drawing, true); expectReticle(drawing); await toggleCardAndReselect(page, canvas); await expectNativePreserved(page);
  } finally { await device.detach(); }
});
