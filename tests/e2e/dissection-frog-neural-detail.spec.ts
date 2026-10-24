import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { neuralTargets, observeFrogNeuralPaint, observeFrogNeuralCaption } from './helpers/dissection_frog_neural_paint.cjs';

const anchor = neuralTargets[0];
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
  await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'nervous',
    anatomicalView: 'dorsal', workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false,
    visualRealism: 'realistic', labelMode: 'hidden', instrumentVisuals: false, sceneDetail: true, tissueRelief: true,
    inspectionLens: false, macroInset: false, focusMode: false, relationshipMode: false, depthAtlas: false,
    parallaxDepth: false, livingFunctionEnabled: false, variationSeed: 3, selectedOrgan: null, hoveredOrgan: null,
    canvasZoom: 1, canvasPanX: 0, canvasPanY: 0, revealedLayers: { skin: true, muscle: true, organs: true, nervous: true },
    procedureByLayer: { organs: healthy, nervous: healthy } } }, undefined, { expectCanvas: false });
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
      pins: (window as any).__ctx.toolData.dissection.procedureByLayer.nervous.pins.length };
  })).toEqual({ specimen: { ok: true, opaque: true }, full: { ok: true, opaque: true }, visibleOpaque: true,
    preserved: true, cameraPreserved: true, pins: 2 });
}
function overlaps(a: any, b: any) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
function expectNeural(drawing: any, detailed: boolean) {
  expect(drawing.matrixObserved).toBe(true); expect(drawing.activePins).toBe(2);
  expect(drawing.bodyPaints.length).toBeGreaterThan(0);
  expect(drawing.bodyPaints.some((paint: any) => paint.containsBrainTargets.every(Boolean))).toBe(true);
  expect(drawing.whole).toHaveLength(1);
  expect(drawing.whole[0].cubics).toBe(15);
  expect(drawing.whole[0].containsTargets).toEqual([true, true, false, false, false, false]);
  expect(drawing.regions).toHaveLength(7);
  expect(drawing.regions.every((region: any) => region.cubics === 4 && !region.containsTargets[0])).toBe(true);
  expect(drawing.regions.filter((region: any) => region.containsTargets[1])).toHaveLength(1);
  expect(drawing.clips).toHaveLength(detailed ? 2 : 1);
  expect(drawing.clips.every((clip: any) => clip.cubics === 15 && clip.containsTargets[0] && clip.containsTargets[1])).toBe(true);
  expect(drawing.nerves).toHaveLength(16);
  const counts = drawing.nerves.reduce((counts: Record<string, number>, path: any) => {
    counts[path.owner] = (counts[path.owner] || 0) + 1; return counts;
  }, {});
  expect(counts).toEqual({ cranial: 2, cord: 1, radial: 9, sciatic: 2, brachial: 2 });
  for (const path of drawing.nerves) {
    expect(path.containsTargets.slice(0, 2)).toEqual([false, false]);
    expect(path.brainPixelsUnchanged).toEqual([true, true]);
    if (path.owner === 'radial') expect([path.moves, path.lines, path.cubics, path.quadratics]).toEqual([2, 2, 0, 0]);
    if (path.owner === 'cranial' || path.owner === 'cord') expect([path.moves, path.lines, path.cubics, path.quadratics]).toEqual([1, 1, 0, 0]);
    if (path.owner === 'sciatic') expect([path.moves, path.lines, path.cubics, path.quadratics]).toEqual([1, 0, 1, 0]);
    if (path.owner === 'brachial') expect([path.moves, path.lines, path.cubics, path.quadratics]).toEqual([1, 0, 0, 1]);
  }
  expect(drawing.targets.map((target: any) => target.id)).toEqual(neuralTargets.map((target: any) => target.id));
  expect(drawing.targets.every((target: any) => target.ownPaint && target.target)).toBe(true);
}
function expectReticle(drawing: any, id: string) {
  const target = drawing.targets.find((target: any) => target.id === id).target;
  expect(drawing.reticle).not.toBeNull();
  expect(Math.hypot(drawing.reticle.x - target.x, drawing.reticle.y - target.y)).toBeLessThan(.5);
}
async function expectSelectionClear(page: Page, canvas: any, drawing: any, id: string, phone = false) {
  const layout = await observeFrogNeuralCaption(canvas, id), field = await canvas.boundingBox();
  expect(field).not.toBeNull(); expect(layout.card).not.toBeNull(); expect(layout.leader).not.toBeNull(); expect(layout.caption).not.toBeNull();
  expect(layout.caption.text).toBe('DEEP \u00b7 COMPACT'); expect(layout.caption.fontCss).toBeGreaterThanOrEqual(8.5);
  expect(layout.caption.x).toBeGreaterThanOrEqual(0); expect(layout.caption.y).toBeGreaterThanOrEqual(0);
  expect(layout.caption.x + layout.caption.width).toBeLessThanOrEqual(layout.width + .5);
  expect(layout.caption.y + layout.caption.height).toBeLessThanOrEqual(layout.height + .5);
  expect(layout.crossesCaption).toBe(false); expect(layout.markers.length).toBeGreaterThan(0); expect(layout.markerIntersections).toEqual([]);
  // Protect the whole painted complex as well as its two learning points.
  expect(overlaps(layout.card, drawing.whole[0].bounds)).toBe(false);
  expect(overlaps(layout.caption, drawing.whole[0].bounds)).toBe(false);
  for (const target of drawing.targets.slice(0, 2)) {
    const core = { x: target.target.x - field.x - 2, y: target.target.y - field.y - 2, width: 4, height: 4 };
    expect(overlaps(layout.card, core)).toBe(false); expect(overlaps(layout.caption, core)).toBe(false);
  }
  for (const region of drawing.regions.filter((region: any) => region.containsTargets[1])) {
    expect(overlaps(layout.card, region.bounds)).toBe(false); expect(overlaps(layout.caption, region.bounds)).toBe(false);
  }
  const protectedDrawing = await observeFrogNeuralPaint(canvas,
    [{ id: 'card', ...layout.card }, { id: 'caption', ...layout.caption }]);
  expect(protectedDrawing.whole).toHaveLength(1); expect(protectedDrawing.regions).toHaveLength(7);
  expect(protectedDrawing.whole[0].obstacleIntersections).toEqual([]);
  expect(protectedDrawing.regions.every((region: any) => region.obstacleIntersections.length === 0)).toBe(true);
  if (phone) {
    for (const id of ['orientation', 'scale']) {
      expect(layout.hudPanels.some((panel: any) => panel.id === id)).toBe(true);
      expect(layout.cardHudIntersections).not.toContain(id); expect(layout.captionHudIntersections).not.toContain(id);
    }
    expect(overlaps(layout.hudPanels.find((panel: any) => panel.id === 'orientation'), layout.hudPanels.find((panel: any) => panel.id === 'scale'))).toBe(false);
  }
  return layout;
}
async function toggleCardAndReselect(page: Page, canvas: any, id: string) {
  const drawing = await observeFrogNeuralPaint(canvas), layout = await expectSelectionClear(page, canvas, drawing, id, true);
  const field = await canvas.boundingBox(); expect(field).not.toBeNull();
  const x = field.x + layout.card.x + layout.card.width / 2, y = field.y + layout.card.y + layout.card.height / 2;
  await page.mouse.move(x, y);
  await expect(page.locator('#diss-canvas-status')).toContainText('Selected ' + (id === 'brain' ? 'Brain' : 'Optic Lobes (Tectum)') + ' in the Nervous layer.');
  await page.mouse.click(x, y);
  await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBeNull();
  await ready(page); const unselected = await observeFrogNeuralPaint(canvas);
  const target = unselected.targets.find((target: any) => target.id === id).target;
  await page.mouse.click(target.x, target.y);
  await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe(id);
  expectReticle(await observeFrogNeuralPaint(canvas), id);
}
test('frog brain and all neural landmarks remain on actual tissue through aspect and mirrored views', async ({ page }) => {
  for (const [width, height, seed] of [[500, 600, 3], [1000, 600, 19], [320, 900, 7]]) {
    const canvas = await ready(page);
    await canvas.evaluate((node: any, size) => { node._logicalW = size.width; node._logicalH = size.height; node.style.aspectRatio = `${size.width} / ${size.height}`; node.style.height = 'auto'; node._drawDissectionNow(); }, { width, height });
    const poses = [{ anatomicalView: 'dorsal', zoom: 2 }, { anatomicalView: 'internal', zoom: 3 },
      { anatomicalView: 'ventral', zoom: 3 }, ...(width === 500 ? [{ anatomicalView: 'dorsal', zoom: 3 }] : [])];
    for (const { anatomicalView, zoom } of poses) {
      await update(page, { anatomicalView, variationSeed: seed, canvasZoom: zoom,
        canvasPanX: 0, canvasPanY: (.5 - anchor.y) * height * zoom, selectedOrgan: null, hoveredOrgan: null });
      await ready(page); expectNeural(await observeFrogNeuralPaint(canvas), true);
      if (anatomicalView === 'ventral') {
        await expect(page.locator('#diss-organ-brain')).toHaveAttribute('data-exposure-state', 'occluded');
        await expect(page.locator('#diss-organ-spinal_cord')).toHaveAttribute('data-exposure-state', 'occluded');
        await expect(page.locator('#diss-organ-optic_lobe')).toHaveAttribute('data-exposure-state', 'visible');
      } else {
        for (const id of ['brain', 'optic_lobe', 'spinal_cord'])
          await expect(page.locator('#diss-organ-' + id)).toHaveAttribute('data-exposure-state', 'visible');
      }
      // The ventral teaching projection retains contextual brain geometry, while
      // the existing view gate makes only the optic lobes directly selectable.
      for (const id of anatomicalView === 'ventral' ? ['optic_lobe'] : ['brain', 'optic_lobe']) {
        await update(page, { selectedOrgan: null, hoveredOrgan: null }); await ready(page);
        const drawing = await observeFrogNeuralPaint(canvas), target = drawing.targets.find((target: any) => target.id === id).target;
        const diagnostic = await canvas.evaluate((node: any, target) => {
          const snapshot = () => ({ selectedOrgan: node._drawD.selectedOrgan, hoveredOrgan: node._drawD.hoveredOrgan,
            bounds: node.getBoundingClientRect().toJSON(), logicalWidth: node._logicalW, logicalHeight: node._logicalH,
            zoom: node._interactionZoom, panX: node._interactionPanX, panY: node._interactionPanY,
            labelBoxes: node._hotspotLabelBoxes });
          const before = snapshot();
          node.addEventListener('click', () => { node._neuralClickDiagnostic = snapshot(); }, { once: true, capture: true });
          return { before, target };
        }, target);
        await page.mouse.click(target.x, target.y);
        await test.info().attach(`neural-click-${width}-${height}-${anatomicalView}-${id}`, { contentType: 'application/json',
          body: JSON.stringify({ width, height, seed, anatomicalView, id, ...diagnostic,
            atClick: await canvas.evaluate((node: any) => node._neuralClickDiagnostic) }, null, 2) });
        await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe(id);
        const selected = await observeFrogNeuralPaint(canvas); expectNeural(selected, true); expectReticle(selected, id);
        await expectSelectionClear(page, canvas, selected, id); await expectNativePreserved(page);
      }
    }
  }
  const canvas = await ready(page);
  await canvas.evaluate((node: any) => { node._logicalW = 500; node._logicalH = 600; node.style.aspectRatio = '500 / 600'; node.style.height = 'auto'; node._drawDissectionNow(); });
  await update(page, { anatomicalView: 'dorsal', canvasZoom: 1, canvasPanX: 0, canvasPanY: 0, selectedOrgan: null, hoveredOrgan: null });
  for (const id of ['brain', 'optic_lobe']) {
    await update(page, { selectedOrgan: null, hoveredOrgan: null });
    await page.locator('#diss-organ-' + id).click();
    await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe(id);
  }
  for (const id of ['spinal_cord', 'cranial_n', 'brachial_n', 'sciatic_n']) {
    await update(page, { selectedOrgan: null, hoveredOrgan: null }); await ready(page);
    const drawing = await observeFrogNeuralPaint(canvas); expectNeural(drawing, true);
    const target = drawing.targets.find((target: any) => target.id === id).target;
    await page.mouse.click(target.x, target.y);
    await expect.poll(() => canvas.evaluate((node: any) => node._drawD.selectedOrgan)).toBe(id);
    expectReticle(await observeFrogNeuralPaint(canvas), id);
  }
});
test('neural clarity modes and both phone brain cards preserve landmarks, status and opaque exports', async ({ page }) => {
  for (const mode of [{ visualRealism: 'guided', highContrast: false, sceneDetail: true, detailed: true },
    { visualRealism: 'accessible', highContrast: true, sceneDetail: true, detailed: false },
    { visualRealism: 'realistic', highContrast: true, sceneDetail: true, detailed: false },
    { visualRealism: 'realistic', highContrast: false, sceneDetail: false, detailed: false }]) {
    const { detailed, ...presentation } = mode;
    for (const id of ['brain', 'optic_lobe']) {
      await update(page, { ...presentation, selectedOrgan: id, canvasZoom: 2, canvasPanX: 0, canvasPanY: (.5 - anchor.y) * 1200 });
      const canvas = await ready(page), drawing = await observeFrogNeuralPaint(canvas); expectNeural(drawing, detailed); expectReticle(drawing, id);
      await expectSelectionClear(page, canvas, drawing, id); await expectNativePreserved(page);
    }
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
      canvasZoom: 2, canvasPanX: 0, canvasPanY: (.5 - anchor.y) * 1200 });
    const canvas = await ready(page);
    for (const width of [null, 333.25]) {
      if (width) {
        await canvas.evaluate((node: any, width) => { node.style.width = width + 'px'; node.style.maxWidth = width + 'px'; node._dpr = 0; node._drawDissectionNow(); }, width);
        await ready(page); expect(await canvas.evaluate((node: any) => Math.max(Math.abs(node.width - node._logicalW * node._dpr), Math.abs(node.height - node._logicalH * node._dpr)))).toBeGreaterThan(.01);
      }
      for (const id of ['brain', 'optic_lobe']) {
        await update(page, { selectedOrgan: id, hoveredOrgan: null }); await ready(page);
        const drawing = await observeFrogNeuralPaint(canvas); expectNeural(drawing, true); expectReticle(drawing, id);
        await toggleCardAndReselect(page, canvas, id); await expectNativePreserved(page);
      }
    }
  } finally { await device.detach(); }
});
