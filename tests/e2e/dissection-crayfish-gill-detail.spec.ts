import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { observeCrayfishGillsPaint } from './helpers/dissection_crayfish_gills_paint.cjs';

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
  await harness.mount(page, { dissection: { specimen: 'crayfish', _dissLoadedSpec: 'crayfish', activeLayer: 'organs',
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
function expectPlumes(drawing: any, detailed: boolean) {
  expect(drawing.plumes).toHaveLength(8); expect(drawing.target).not.toBeNull();
  for (const plume of drawing.plumes) expect(plume.insideStroke).toBe(true);
  expect(drawing.target.normalized.x).toBeCloseTo(.557, 6); expect(drawing.target.normalized.y).toBeCloseTo(.358, 6);
  expect(drawing.paints).toBeLessThanOrEqual(64);
  if (detailed) { expect(drawing.cubicFilaments).toBeGreaterThan(200); expect(drawing.quadraticFilaments).toBe(0); }
  else { expect(drawing.cubicFilaments).toBe(0); expect(drawing.quadraticFilaments).toBe(56); }
}
async function expectNativePreserved(page: Page) {
  expect(await page.locator('[data-diss-canvas]').evaluate((node: any) => {
    const before = JSON.stringify((window as any).__ctx.toolData.dissection), camera = [node._interactionZoom, node._interactionPanX, node._interactionPanY];
    const destination = document.createElement('canvas'); destination.width = node._logicalW * 2; destination.height = node._logicalH * 2;
    const ok = node._captureDissectionEvidence(destination.getContext('2d'), destination.width, destination.height);
    return { ok, preserved: before === JSON.stringify((window as any).__ctx.toolData.dissection),
      cameraPreserved: JSON.stringify(camera) === JSON.stringify([node._interactionZoom, node._interactionPanX, node._interactionPanY]),
      pins: (window as any).__ctx.toolData.dissection.procedureByLayer.organs.pins.length };
  })).toEqual({ ok: true, preserved: true, cameraPreserved: true, pins: 2 });
}
test('gill selection follows the actual central shaft at three aspects, zoom and mirror', async ({ page }) => {
  for (const [width, height] of [[500, 600], [1000, 600], [320, 900]]) {
    const canvas = await ready(page);
    await canvas.evaluate((node: any, size) => { node._logicalW = size.width; node._logicalH = size.height;
      node.style.aspectRatio = `${size.width} / ${size.height}`; node.style.height = 'auto'; node._drawDissectionNow(); }, { width, height });
    for (const anatomicalView of ['internal', 'ventral']) {
      const zoom = anatomicalView === 'internal' ? 2 : 3;
      await update(page, { anatomicalView, canvasZoom: zoom, canvasPanX: (.5 - .557) * width * zoom * (anatomicalView === 'ventral' ? -1 : 1),
        canvasPanY: (.5 - .358) * height * zoom, selectedOrgan: null, hoveredOrgan: null });
      await ready(page); const painted = await observeCrayfishGillsPaint(canvas); expectPlumes(painted, true);
      expect(painted.logicalWidth).toBe(width); expect(painted.logicalHeight).toBe(height);
      await page.mouse.click(painted.target.point.x, painted.target.point.y);
      await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe('gills_c');
      const selected = await observeCrayfishGillsPaint(canvas); expect(selected.reticle).not.toBeNull();
      expect(Math.abs(selected.reticle.x - selected.target.point.x)).toBeLessThan(.5);
      expect(Math.abs(selected.reticle.y - selected.target.point.y)).toBeLessThan(.5);
      await expectNativePreserved(page);
    }
  }
});
test('clarity and detail-off modes retain all eight shafts and the same selected target', async ({ page }) => {
  for (const presentation of [{ visualRealism: 'guided', highContrast: false, sceneDetail: true },
    { visualRealism: 'accessible', highContrast: true, sceneDetail: true },
    { visualRealism: 'realistic', highContrast: true, sceneDetail: true },
    { visualRealism: 'realistic', highContrast: false, sceneDetail: false }]) {
    await update(page, { ...presentation, selectedOrgan: 'gills_c', canvasZoom: 2, canvasPanX: -57, canvasPanY: 170.4 });
    const canvas = await ready(page), drawing = await observeCrayfishGillsPaint(canvas); expectPlumes(drawing, false);
    expect(drawing.reticle).not.toBeNull();
    expect(Math.abs(drawing.reticle.x - drawing.target.point.x)).toBeLessThan(.5);
    expect(Math.abs(drawing.reticle.y - drawing.target.point.y)).toBeLessThan(.5);
    await expectNativePreserved(page);
  }
});
