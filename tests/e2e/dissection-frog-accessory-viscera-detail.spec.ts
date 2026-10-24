import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { accessoryTargets, observeFrogAccessoryPaint, observeFrogAccessoryCaption } from './helpers/dissection_frog_accessory_paint.cjs';

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
  await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'organs',
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
function expectAccessory(drawing: any, detailed: boolean, membrane = detailed, folds = detailed) {
  expect(drawing.matrixObserved).toBe(true);
  for (const target of drawing.structures) {
    const count = target.id === 'pancreas' ? 11 : 6;
    expect(target.target).not.toBeNull(); expect(target.cavityContainsTarget).toBe(true);
    expect(target.regions).toEqual([{ cubics: count, containsTarget: true }]);
    expect(target.clips).toHaveLength(detailed ? 2 : 0);
    expect(target.clips.every((clip: any) => clip.cubics === count && clip.containsTarget)).toBe(true);
    expect(target.otherTargetCovered).toBe(false);
    const owners = target.laterPaint.map((paint: any) => paint.owner);
    for (const owner of ['ileum', 'large-intestine', 'bladder', 'cloaca']) expect(owners).toContain(owner);
    if (target.id === 'pancreas') expect(owners).toContain('spleen');
    if (membrane) expect(owners).toContain('mesentery');
    if (folds) expect(owners).toContain('mesentery-fold');
    expect(target.laterPaint.every((paint: any) => !paint.containsTarget && paint.targetPixelUnchanged)).toBe(true);
  }
  expect(drawing.neighbors.map((neighbor: any) => neighbor.id)).toEqual(['stomach', 'sm_intestine']);
  expect(drawing.neighbors.every((neighbor: any) => neighbor.insideOwnPaint && !neighbor.coveredByAccessory)).toBe(true);
}
function expectReticle(drawing: any, id: string) {
  const target = drawing.structures.find((target: any) => target.id === id).target;
  expect(drawing.reticle).not.toBeNull();
  expect(Math.hypot(drawing.reticle.x - target.x, drawing.reticle.y - target.y)).toBeLessThan(.5);
}
function expectCaptionClear(layout: any, id: string) {
  expect(layout.card).not.toBeNull(); expect(layout.leader).not.toBeNull(); expect(layout.caption).not.toBeNull();
  expect(layout.caption.text).toBe(id === 'pancreas' ? 'DEEP \u00b7 LOBED' : 'DEEP \u00b7 COMPACT'); expect(layout.caption.fontCss).toBeGreaterThanOrEqual(8.5);
  expect(layout.caption.x).toBeGreaterThanOrEqual(0); expect(layout.caption.y).toBeGreaterThanOrEqual(0);
  expect(layout.caption.x + layout.caption.width).toBeLessThanOrEqual(layout.width + .5);
  expect(layout.caption.y + layout.caption.height).toBeLessThanOrEqual(layout.height + .5);
  expect(layout.crossesCaption).toBe(false);
  expect(layout.markers.length).toBeGreaterThan(0);
  expect(layout.markers.some((marker: any) => marker.kind === 'point')).toBe(true);
  expect(layout.markerIntersections).toEqual([]);
}
async function expectPhoneCardClear(page: Page, canvas: any, id: string) {
  const layout = await observeFrogAccessoryCaption(canvas, id);
  expectCaptionClear(layout, id);
  expect(layout.hudPanels.some((panel: any) => panel.id === 'orientation')).toBe(true);
  expect(layout.hudPanels.some((panel: any) => panel.id === 'scale')).toBe(true);
  const orientation = layout.hudPanels.find((panel: any) => panel.id === 'orientation');
  const scale = layout.hudPanels.find((panel: any) => panel.id === 'scale');
  expect(orientation.x < scale.x + scale.width && orientation.x + orientation.width > scale.x &&
    orientation.y < scale.y + scale.height && orientation.y + orientation.height > scale.y).toBe(false);
  expect(layout.cardHudIntersections).not.toContain('orientation');
  expect(layout.cardHudIntersections).not.toContain('scale');
  expect(layout.captionHudIntersections).not.toContain('orientation');
  expect(layout.captionHudIntersections).not.toContain('scale');
  const field = await canvas.boundingBox(); expect(field).not.toBeNull();
  await page.mouse.move(field.x + layout.card.x + layout.card.width / 2, field.y + layout.card.y + layout.card.height / 2);
  await expect(page.locator('#diss-canvas-status')).toContainText('Selected ' + (id === 'pancreas' ? 'Pancreas' : 'Spleen') + ' in the Organs layer.');
  await page.mouse.click(field.x + layout.card.x + layout.card.width / 2, field.y + layout.card.y + layout.card.height / 2);
  await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBeNull();
  await ready(page);
  const unselected = await observeFrogAccessoryPaint(canvas);
  const target = unselected.structures.find((structure: any) => structure.id === id).target;
  await page.mouse.click(target.x, target.y);
  await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe(id);
  expectReticle(await observeFrogAccessoryPaint(canvas), id);
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

for (const anchor of accessoryTargets) {
  test(anchor.id + ' remains visibly selectable with intact gastric and intestinal neighbors', async ({ page }) => {
    for (const [width, height, seed] of [[500, 600, 3], [1000, 600, 19], [320, 900, 7]]) {
      const canvas = await ready(page);
      await canvas.evaluate((node: any, size) => { node._logicalW = size.width; node._logicalH = size.height; node.style.aspectRatio = size.width + ' / ' + size.height; node.style.height = 'auto'; node._drawDissectionNow(); }, { width, height });
      for (const anatomicalView of ['internal', 'ventral']) {
        const zoom = anatomicalView === 'internal' ? 2 : 3;
        await update(page, { anatomicalView, variationSeed: seed, canvasZoom: zoom,
          canvasPanX: (.5 - anchor.x) * width * zoom * (anatomicalView === 'ventral' ? -1 : 1), canvasPanY: (.5 - anchor.y) * height * zoom,
          selectedOrgan: null, hoveredOrgan: null });
        await ready(page); const drawing = await observeFrogAccessoryPaint(canvas); expectAccessory(drawing, true);
        const target = drawing.structures.find((target: any) => target.id === anchor.id).target;
        await page.mouse.click(target.x, target.y);
        await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe(anchor.id);
        const selected = await observeFrogAccessoryPaint(canvas); expectAccessory(selected, true); expectReticle(selected, anchor.id);
        expectCaptionClear(await observeFrogAccessoryCaption(canvas, anchor.id), anchor.id); await expectNativePreserved(page);
      }
    }
    await update(page, { anatomicalView: 'internal', selectedOrgan: null, hoveredOrgan: null, canvasZoom: 2, canvasPanX: 0, canvasPanY: 0 });
    const canvas = await ready(page);
    await canvas.evaluate((node: any) => { node._logicalW = 500; node._logicalH = 600; node.style.aspectRatio = '500 / 600'; node.style.height = 'auto'; node._drawDissectionNow(); });
    await page.locator('#diss-organ-' + anchor.id).click();
    await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe(anchor.id);
    for (const id of ['stomach', 'sm_intestine']) {
      await update(page, { selectedOrgan: null, hoveredOrgan: null }); await ready(page);
      const drawing = await observeFrogAccessoryPaint(canvas); expectAccessory(drawing, true);
      const target = drawing.neighbors.find((neighbor: any) => neighbor.id === id).target;
      await page.mouse.click(target.x, target.y);
      await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe(id);
    }
  });
  test(anchor.id + ' preserves clarity modes and opaque native exports at DPR2 and fractional sizes', async ({ page }) => {
    for (const mode of [{ visualRealism: 'guided', highContrast: false, sceneDetail: true, detailed: true },
      { visualRealism: 'accessible', highContrast: true, sceneDetail: true, detailed: false },
      { visualRealism: 'realistic', highContrast: true, sceneDetail: true, detailed: false },
      { visualRealism: 'realistic', highContrast: false, sceneDetail: false, detailed: false }]) {
      const { detailed, ...presentation } = mode;
      await update(page, { ...presentation, selectedOrgan: anchor.id, canvasZoom: 2, canvasPanX: (.5 - anchor.x) * 1000, canvasPanY: (.5 - anchor.y) * 1200 });
      const canvas = await ready(page), drawing = await observeFrogAccessoryPaint(canvas);
      expectAccessory(drawing, detailed, mode.sceneDetail && mode.visualRealism !== 'accessible', detailed); expectReticle(drawing, anchor.id);
      expectCaptionClear(await observeFrogAccessoryCaption(canvas, anchor.id), anchor.id); await expectNativePreserved(page);
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
      await update(page, { visualRealism: 'realistic', highContrast: false, sceneDetail: true, largeText: true, selectedOrgan: anchor.id,
        canvasZoom: 2, canvasPanX: (.5 - anchor.x) * 1000, canvasPanY: (.5 - anchor.y) * 1200 });
      const canvas = await ready(page); let drawing = await observeFrogAccessoryPaint(canvas);
      expectAccessory(drawing, true); expectReticle(drawing, anchor.id); await expectPhoneCardClear(page, canvas, anchor.id); await expectNativePreserved(page);
      await canvas.evaluate((node: any) => { node.style.width = '333.25px'; node.style.maxWidth = '333.25px'; node._dpr = 0; node._drawDissectionNow(); });
      await ready(page); expect(await canvas.evaluate((node: any) => Math.max(Math.abs(node.width - node._logicalW * node._dpr), Math.abs(node.height - node._logicalH * node._dpr)))).toBeGreaterThan(.01);
      drawing = await observeFrogAccessoryPaint(canvas); expectAccessory(drawing, true); expectReticle(drawing, anchor.id); await expectPhoneCardClear(page, canvas, anchor.id); await expectNativePreserved(page);
    } finally { await device.detach(); }
  });
}
