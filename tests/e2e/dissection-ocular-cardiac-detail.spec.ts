import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { ocularCardiacTargets, observeOcularCardiacPaint } from './helpers/dissection_ocular_cardiac_paint.cjs';

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
  const messages: string[] = []; failures.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('[DissectionLab]')) messages.push(message.text()); });
});
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(failures.get(page) || []).toEqual([]); });

async function mount(page: Page, specimen = 'sheepEye') {
  await harness.mount(page, { dissection: { specimen, _dissLoadedSpec: specimen, activeLayer: 'organs', anatomicalView: 'internal',
    workspaceMode: 'advanced', visualRealism: 'realistic', reducedMotion: true, soundEnabled: false, labelMode: 'hidden',
    instrumentVisuals: false, sceneDetail: true, tissueRelief: true, inspectionLens: false, macroInset: false,
    focusMode: false, relationshipMode: false, depthAtlas: false, parallaxDepth: false, livingFunctionEnabled: false,
    selectedOrgan: null, hoveredOrgan: null, canvasZoom: 1, canvasPanX: 0, canvasPanY: 0, variationSeed: 1,
    lightIntensity: 68, revealedLayers: { skin: true, muscle: true, organs: true }, procedureByLayer: { organs: healthy } } }, undefined, { expectCanvas: false });
}
async function update(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => (window as any).__ctx.updateMulti('dissection', patch), patch);
  await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((node: any, patch) =>
    Object.entries(patch).every(([key, value]) => node._drawD[key] === value), patch)).toBe(true);
}
async function observe(page: Page, specimen = 'sheepEye') {
  const canvas = page.locator('[data-diss-canvas]'); await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((node: any) => node._dissInViewport === true)).toBe(true);
  return observeOcularCardiacPaint(canvas, specimen);
}

test('retinal vessels remain anatomy while optical rays follow function settings and quiz hides captions', async ({ page }) => {
  await mount(page); const baseline = await observe(page);
  expect(baseline.retinalVessels).toBeGreaterThan(0); expect(baseline.incomingRays).toBe(0);
  expect(baseline.labels).not.toContain('Refracted light');
  await update(page, { livingFunctionEnabled: true, livingFunctionPaused: true });
  const functionOn = await observe(page);
  expect(functionOn.retinalVessels).toBe(baseline.retinalVessels); expect(functionOn.incomingRays).toBeGreaterThan(0);
  expect(functionOn.labels).toContain('Refracted light');
  await update(page, { quizMode: true }); const quiz = await observe(page);
  expect(quiz.retinalVessels).toBe(baseline.retinalVessels);
  for (const caption of ['Refracted light', 'Optic disc', 'Area centralis']) expect(quiz.labels).not.toContain(caption);
  await update(page, { quizMode: false, livingFunctionEnabled: false });
  const restored = await observe(page); expect(restored.retinalVessels).toBe(baseline.retinalVessels); expect(restored.incomingRays).toBe(0);
  await update(page, { visualRealism: 'accessible', highContrast: true }); const inclusive = await observe(page);
  expect(inclusive.retinalVessels).toBe(0); expect(inclusive.simpleVessels).toBeGreaterThan(0);
});

test('new choroid and mitral targets and existing five remain on painted tissue through zoom and mirror', async ({ page }) => {
  for (const specimen of ['sheepEye', 'sheepHeart']) {
    await mount(page, specimen);
    for (const anatomicalView of ['internal', 'ventral']) for (const target of ocularCardiacTargets(specimen)) {
      const zoom = anatomicalView === 'ventral' ? 3 : 2;
      await update(page, { anatomicalView, canvasZoom: zoom, selectedOrgan: null, hoveredOrgan: null,
        canvasPanX: (.5 - target.x) * 500 * zoom * (anatomicalView === 'ventral' ? -1 : 1), canvasPanY: (.5 - target.y) * 600 * zoom });
      const before = await observe(page, specimen), point = before.targets.find((p: any) => p.id === target.id);
      expect(before.matrixObserved).toBe(true); expect(point?.insidePaintedBody, target.id).toBe(true);
      if (target.id === 'choroid') { expect(before.choroidInsideBand).toBe(true); expect(Math.max(...point.beforeMarkersRGBA.slice(0, 3))).toBeLessThan(110); }
      if (target.id === 'mitral') expect(before.mitralInsideLeaflet).toBe(true);
      // The ventral visibility model intentionally occludes the mitral valve.
      if (target.id === 'mitral' && anatomicalView === 'ventral') await update(page, { selectedOrgan: target.id });
      else await page.mouse.click(point.x, point.y);
      await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe(target.id);
      await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((node: any, id) => node._drawD.selectedOrgan === id, target.id)).toBe(true);
      const selected = await observe(page, specimen), painted = selected.targets.find((p: any) => p.id === target.id);
      expect(selected.reticle, target.id).not.toBeNull();
      expect(Math.abs(selected.reticle!.x - painted.x), target.id).toBeLessThan(.5);
      expect(Math.abs(selected.reticle!.y - painted.y), target.id).toBeLessThan(.5);
      const evidence = await page.locator('[data-diss-canvas]').evaluate((node: any) => {
        const before = JSON.stringify((window as any).__ctx.toolData.dissection);
        const camera = [node._interactionZoom, node._interactionPanX, node._interactionPanY];
        const destination = document.createElement('canvas'); destination.width = 1000; destination.height = 1200;
        const ok = node._captureDissectionEvidence(destination.getContext('2d'), 1000, 1200);
        return { ok, preserved: before === JSON.stringify((window as any).__ctx.toolData.dissection),
          cameraPreserved: JSON.stringify(camera) === JSON.stringify([node._interactionZoom, node._interactionPanX, node._interactionPanY]) };
      });
      expect(evidence).toEqual({ ok: true, preserved: true, cameraPreserved: true });
    }
    await harness.unmount(page);
  }
});
