import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { invertebrateTargets, observeInvertebratePaint } from './helpers/dissection_invertebrate_paint.cjs';

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

async function checkTargets(page: Page, specimen: string) {
  await harness.mount(page, { dissection: { specimen, _dissLoadedSpec: specimen, activeLayer: 'organs', anatomicalView: 'internal',
    workspaceMode: 'advanced', visualRealism: 'realistic', reducedMotion: true, soundEnabled: false, labelMode: 'hidden',
    instrumentVisuals: false, sceneDetail: true, tissueRelief: true, inspectionLens: false, macroInset: false,
    focusMode: false, relationshipMode: false, depthAtlas: false, parallaxDepth: false, livingFunctionEnabled: false,
    selectedOrgan: null, hoveredOrgan: null, canvasZoom: 2, canvasPanX: 0, canvasPanY: 0,
    variationSeed: 1, lightIntensity: 68, revealedLayers: { skin: true, muscle: true, organs: true },
    procedureByLayer: { organs: healthy } } }, undefined, { expectCanvas: false });
  const canvas = page.locator('[data-diss-canvas]');
  for (const anatomicalView of ['internal', 'ventral']) for (const target of invertebrateTargets(specimen)) {
    // Put each anatomical point in the clear center of the canvas at 2x, retaining
    // real camera and mirror transforms. These are actual tissue clicks, not labels.
    const canvasPanX = (.5 - target.x) * 500 * 2 * (anatomicalView === 'ventral' ? -1 : 1);
    const canvasPanY = (.5 - target.y) * 600 * 2;
    await page.evaluate(patch => (window as any).__ctx.updateMulti('dissection', patch), {
      anatomicalView, canvasPanX, canvasPanY, selectedOrgan: null, hoveredOrgan: null
    });
    await canvas.scrollIntoViewIfNeeded();
    await expect.poll(() => canvas.evaluate((node: any, view) => node._dissInViewport === true && node._drawD.anatomicalView === view && !node._drawD.selectedOrgan, anatomicalView)).toBe(true);
    const drawing = await observeInvertebratePaint(canvas, specimen);
    expect(drawing.matrixObserved).toBe(true);
    const painted = drawing.targets.find((point: any) => point.id === target.id);
    expect(painted?.missing).not.toBe(true); expect(painted?.insidePaintedBody, target.id).toBe(true);
    expect(painted?.beforeMarkersRGBA?.[3], target.id).toBe(255);
    // The ventral visibility model deliberately marks the dorsal heart occluded.
    // Verify its mirrored directory-selection cue without bypassing that click gate.
    if (specimen === 'crayfish' && anatomicalView === 'ventral' && target.id === 'heart_c') {
      await page.evaluate(id => (window as any).__ctx.update('dissection', 'selectedOrgan', id), target.id);
    } else {
      await page.mouse.click(painted.x, painted.y);
    }
    await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe(target.id);
    await expect.poll(() => canvas.evaluate((node: any, id) => node._drawD.selectedOrgan === id, target.id)).toBe(true);
    const selected = await observeInvertebratePaint(canvas, specimen);
    const selectedPainted = selected.targets.find((point: any) => point.id === target.id);
    expect(selected.reticle, target.id).not.toBeNull();
    // A large hit radius alone can hide a drifting marker. Its painted reticle
    // must share the anatomical point after camera, mirror and device transforms.
    // Selection can change the surrounding panel height and scroll anchoring;
    // compare both painted coordinates from this same post-selection frame.
    expect(Math.abs(selected.reticle!.x - selectedPainted!.x), target.id).toBeLessThan(.5);
    expect(Math.abs(selected.reticle!.y - selectedPainted!.y), target.id).toBeLessThan(.5);
    const evidence = await canvas.evaluate((node: any) => {
      const before = JSON.stringify((window as any).__ctx.toolData.dissection);
      const camera = [node._interactionZoom, node._interactionPanX, node._interactionPanY];
      const destination = document.createElement('canvas'); destination.width = 1000; destination.height = 1200;
      const ok = node._captureDissectionEvidence(destination.getContext('2d'), 1000, 1200);
      return { ok, preserved: before === JSON.stringify((window as any).__ctx.toolData.dissection),
        cameraPreserved: JSON.stringify(camera) === JSON.stringify([node._interactionZoom, node._interactionPanX, node._interactionPanY]) };
    });
    expect(evidence).toEqual({ ok: true, preserved: true, cameraPreserved: true });
  }
}

test('worm foregut targets select and remain aligned with painted anatomy at 2x in both orientations', async ({ page }) => {
  await checkTargets(page, 'earthworm');
});

test('six crayfish targets select and remain aligned with painted anatomy at 2x in both orientations', async ({ page }) => {
  await checkTargets(page, 'crayfish');
});
