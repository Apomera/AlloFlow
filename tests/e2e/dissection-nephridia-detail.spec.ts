import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { observeNephridiaPaint } from './helpers/dissection_nephridia_paint.cjs';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180,
  height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const healthy = { inspected: true, incisionStarted: true, incisionExtended: true, retracted: false, probed: true,
  pins: [{ x: .43, y: .32 }, { x: .57, y: .68 }], history: ['inspect', 'scalpel', 'scissors', 'pin', 'probe'],
  tissueState: { moisture: 65, tension: 40, exposure: 95, trauma: 0, clarity: 95, stability: 95, risk: 5,
    salineDrops: 0, variantId: 'standard', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] } };
const failures = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0, timeout: 150000 });
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
  const canvas = page.locator('[data-diss-canvas]'); await canvas.evaluate(node => node.scrollIntoView({ block: 'center' }));
  await expect.poll(() => canvas.evaluate((node: any) => node._dissInViewport)).toBe(true); return canvas;
}
function expectTubules(drawing: any) {
  expect(drawing.tubules).toHaveLength(32); expect(drawing.target).not.toBeNull();
  for (const tubule of drawing.tubules) { expect(tubule.insideStroke).toBe(true); expect(tubule.cubics.length).toBeGreaterThanOrEqual(2); }
  expect(drawing.vesicles).toHaveLength(6);
  for (const sac of drawing.vesicles) expect(sac.insidePaintedOrgan).toBe(true);
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

test('nephridia target follows a real tubule through three logical aspects, zoom and mirror', async ({ page }) => {
  for (const [width, height] of [[500, 600], [1000, 600], [320, 900]]) {
    const canvas = await ready(page);
    await canvas.evaluate((node: any, size) => {
      node._logicalW = size.width; node._logicalH = size.height;
      node.style.aspectRatio = `${size.width} / ${size.height}`; node.style.height = 'auto'; node._drawDissectionNow();
    }, { width, height });
    for (const anatomicalView of ['internal', 'ventral']) {
      await update(page, { anatomicalView, canvasZoom: 1, canvasPanX: 0, canvasPanY: 0, selectedOrgan: null, hoveredOrgan: null, traceExcretory: false });
      await ready(page); const initial = await observeNephridiaPaint(canvas); expectTubules(initial);
      expect(initial.logicalWidth).toBe(width); expect(initial.logicalHeight).toBe(height);
      const zoom = anatomicalView === 'internal' ? 2 : 3;
      await update(page, { canvasZoom: zoom, canvasPanX: (.5 - initial.target.start.x) * width * zoom * (anatomicalView === 'ventral' ? -1 : 1),
        canvasPanY: (.5 - initial.target.start.y) * height * zoom });
      await ready(page); const painted = await observeNephridiaPaint(canvas); expectTubules(painted);
      await page.mouse.click(painted.target.point.x, painted.target.point.y);
      await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe('nephridia');
      const selected = await observeNephridiaPaint(canvas); expect(selected.reticle).not.toBeNull();
      expect(Math.abs(selected.reticle.x - selected.target.point.x)).toBeLessThan(.5);
      expect(Math.abs(selected.reticle.y - selected.target.point.y)).toBeLessThan(.5);
      await update(page, { traceExcretory: true }); const traced = await observeNephridiaPaint(canvas); expectTubules(traced);
      expect(traced.overlay.length).toBeGreaterThanOrEqual(1);
      for (const batch of traced.overlay) expect(batch).toEqual(traced.tubules.map((path: any) => ({ start: path.start, cubics: path.cubics })));
      await expectNativePreserved(page);
      if (anatomicalView === 'internal') {
        // The posterior right vesicle is the new representative target. Test its
        // actual filled sac center at each aspect, without using label positions.
        await update(page, { traceExcretory: false, selectedOrgan: null, hoveredOrgan: null, canvasZoom: 1, canvasPanX: 0, canvasPanY: 0 });
        await ready(page); const sacs = await observeNephridiaPaint(canvas);
        // Scroll the actual painted point into the viewport on the tall fixture.
        await page.evaluate(y => window.scrollBy(0, y - window.innerHeight / 2), sacs.seminalTarget.point.y);
        const visibleSacs = await observeNephridiaPaint(canvas);
        await page.mouse.click(visibleSacs.seminalTarget.point.x, visibleSacs.seminalTarget.point.y);
        await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe('seminal_v');
        const selectedSac = await observeNephridiaPaint(canvas); expect(selectedSac.reticle).not.toBeNull();
        expect(Math.abs(selectedSac.reticle.x - selectedSac.seminalTarget.point.x)).toBeLessThan(.5);
        expect(Math.abs(selectedSac.reticle.y - selectedSac.seminalTarget.point.y)).toBeLessThan(.5);
      }
    }
  }
});

test('Guided, Accessible and detail-off retain paired loops and the aligned excretory trace', async ({ page }) => {
  for (const presentation of [{ visualRealism: 'guided', highContrast: false, sceneDetail: true },
    { visualRealism: 'accessible', highContrast: true, sceneDetail: true },
    { visualRealism: 'realistic', highContrast: false, sceneDetail: false }]) {
    await update(page, { ...presentation, traceExcretory: true, selectedOrgan: 'nephridia', canvasZoom: 2 });
    const canvas = await ready(page), drawing = await observeNephridiaPaint(canvas); expectTubules(drawing);
    expect(drawing.overlay.length).toBeGreaterThanOrEqual(1);
    for (const batch of drawing.overlay) expect(batch).toEqual(drawing.tubules.map((path: any) => ({ start: path.start, cubics: path.cubics })));
    expect(drawing.reticle).not.toBeNull();
    expect(Math.abs(drawing.reticle.x - drawing.target.point.x)).toBeLessThan(.5);
    expect(Math.abs(drawing.reticle.y - drawing.target.point.y)).toBeLessThan(.5);
    await expectNativePreserved(page);
  }
});
