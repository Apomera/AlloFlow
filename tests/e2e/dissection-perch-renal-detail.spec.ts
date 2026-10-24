import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { observePerchRenalPaint } from './helpers/dissection_perch_renal_paint.cjs';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180,
  height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const anchor = { x: .515, y: .366 };
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
function expectRenal(drawing: any, detailed: boolean) {
  expect(drawing.matrixObserved).toBe(true); expect(drawing.target).not.toBeNull(); expect(drawing.insideCavity).toBe(true);
  expect(drawing.regions).toHaveLength(1); expect(drawing.regions[0].containsTarget).toBe(true);
  expect(drawing.regions[0].cubics).toBe(detailed ? 14 : 2); expect(drawing.paints).toBe(detailed ? 17 : 2);
  expect(drawing.renalClipCount).toBe(detailed ? 1 : 0);
  if (detailed) expect(drawing.renalClipContainsTarget).toBe(true);
  expect(drawing.sacs.length).toBeGreaterThan(0); expect(drawing.aortaStrokes.length).toBeGreaterThan(0);
  expect(drawing.sacs.every((sac: any) => !sac.containsTarget)).toBe(true);
  expect(drawing.aortaStrokes.every((stroke: any) => !stroke.containsTarget)).toBe(true);
}
function expectReticle(drawing: any) {
  expect(drawing.reticle).not.toBeNull();
  expect(Math.abs(drawing.reticle.x - drawing.target.x)).toBeLessThan(.5);
  expect(Math.abs(drawing.reticle.y - drawing.target.y)).toBeLessThan(.5);
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

test('renal target stays on actual tissue at representative aspects, seeds, zoom and mirror', async ({ page }) => {
  const scenes = [
    { width: 500, height: 600, anatomicalView: 'internal', variationSeed: 3, zoom: 2 },
    { width: 1000, height: 600, anatomicalView: 'ventral', variationSeed: 19, zoom: 3 },
    { width: 320, height: 900, anatomicalView: 'internal', variationSeed: 7, zoom: 2 },
  ];
  for (const [index, scene] of scenes.entries()) {
    const canvas = await ready(page);
    await canvas.evaluate((node: any, size) => { node._logicalW = size.width; node._logicalH = size.height;
      node.style.aspectRatio = `${size.width} / ${size.height}`; node.style.height = 'auto'; node._drawDissectionNow(); }, scene);
    await update(page, { anatomicalView: scene.anatomicalView, variationSeed: scene.variationSeed, canvasZoom: scene.zoom,
      canvasPanX: (.5 - anchor.x) * scene.width * scene.zoom * (scene.anatomicalView === 'ventral' ? -1 : 1),
      canvasPanY: (.5 - anchor.y) * scene.height * scene.zoom, selectedOrgan: index === 0 ? null : 'kidneys_f', hoveredOrgan: null });
    await ready(page); const painted = await observePerchRenalPaint(canvas, anchor); expectRenal(painted, true);
    expect(painted.logicalWidth).toBe(scene.width); expect(painted.logicalHeight).toBe(scene.height);
    if (index === 0) {
      await page.mouse.click(painted.target.x, painted.target.y);
      await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe('kidneys_f');
      await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe('kidneys_f');
    }
    const selected = await observePerchRenalPaint(canvas, anchor); expectRenal(selected, true); expectReticle(selected);
    await expectNativePreserved(page);
  }
});

test('renal fallback, DPR2 and fractional backing buffers preserve native opaque exports and state', async ({ page }) => {
  for (const presentation of [{ visualRealism: 'guided', highContrast: false, sceneDetail: true },
    { visualRealism: 'accessible', highContrast: true, sceneDetail: true },
    { visualRealism: 'realistic', highContrast: true, sceneDetail: true },
    { visualRealism: 'realistic', highContrast: false, sceneDetail: false }]) {
    await update(page, { ...presentation, selectedOrgan: 'kidneys_f', canvasZoom: 2,
      canvasPanX: (.5 - anchor.x) * 1000, canvasPanY: (.5 - anchor.y) * 1200 });
    const canvas = await ready(page), drawing = await observePerchRenalPaint(canvas, anchor);
    expectRenal(drawing, false); expectReticle(drawing); await expectNativePreserved(page);
  }
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
    (document.querySelector('#wrap') as HTMLElement).style.cssText = 'width:100%;max-width:1180px';
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const device = await page.context().newCDPSession(page);
  try {
    await device.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 });
    expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
    await update(page, { visualRealism: 'realistic', highContrast: false, sceneDetail: true, largeText: true,
      selectedOrgan: 'kidneys_f', canvasZoom: 2, canvasPanX: 0, canvasPanY: 0 });
    const canvas = await ready(page), size = await canvas.evaluate((node: any) => ({ width: node._logicalW, height: node._logicalH }));
    await update(page, { canvasPanX: (.5 - anchor.x) * size.width * 2, canvasPanY: (.5 - anchor.y) * size.height * 2 });
    await ready(page); const phone = await observePerchRenalPaint(canvas, anchor);
    expect((await canvas.boundingBox())!.width).toBeLessThanOrEqual(390); expectRenal(phone, true); expectReticle(phone);
    await expectNativePreserved(page);
    // Force the rounded backing buffer beyond logical size × DPR, then scan every alpha byte.
    await canvas.evaluate((node: any) => { node.style.width = '333.25px'; node.style.maxWidth = '333.25px'; node._dpr = 0; node._drawDissectionNow(); });
    await ready(page);
    const fractional = await canvas.evaluate((node: any) => Math.max(Math.abs(node.width - node._logicalW * node._dpr), Math.abs(node.height - node._logicalH * node._dpr)));
    expect(fractional).toBeGreaterThan(.01);
    const drawing = await observePerchRenalPaint(canvas, anchor); expectRenal(drawing, true); expectReticle(drawing);
    await expectNativePreserved(page);
  } finally { await device.detach(); }
});
