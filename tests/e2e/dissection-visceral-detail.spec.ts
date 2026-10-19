import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

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
test.afterEach(async ({ page }) => {
  await harness.unmount(page); expect(failures.get(page) || []).toEqual([]);
});

async function mount(page: Page, specimen = 'frog', selectedOrgan = 'liver') {
  await harness.mount(page, { dissection: { specimen, _dissLoadedSpec: specimen, activeLayer: 'organs', anatomicalView: 'internal',
    workspaceMode: 'advanced', visualRealism: 'realistic', highContrast: false, reducedMotion: true, soundEnabled: false,
    selectedOrgan, hoveredOrgan: null, labelMode: 'hidden', instrumentVisuals: false, sceneDetail: true,
    tissueRelief: true, inspectionLens: false, macroInset: false, focusMode: false, relationshipMode: false,
    depthAtlas: false, parallaxDepth: false, livingFunctionEnabled: false, canvasZoom: 2, canvasPanX: 0, canvasPanY: 30,
    variationSeed: 1, lightIntensity: 68, revealedLayers: { skin: true, muscle: true, organs: true },
    procedureByLayer: { organs: healthy } } }, undefined, { expectCanvas: false });
}

async function update(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => (window as any).__ctx.updateMulti('dissection', patch), patch);
  await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((node: any, patch) =>
    Object.entries(patch).every(([key, value]) => JSON.stringify(node._drawD[key]) === JSON.stringify(value)), patch)).toBe(true);
}

async function observe(page: Page, native = false) {
  const canvas = page.locator('[data-diss-canvas]'); await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((node: any) => node._dissInViewport === true)).toBe(true);
  return canvas.evaluate((node: any, native) => {
    const ctx = node.getContext('2d'), begin = ctx.beginPath, fill = ctx.fill, text = ctx.fillText,
      arc = ctx.arc, dash = ctx.setLineDash;
    let contourPaths = 0, texturePaths = 0, morphologyFills = 0, targetArcs = 0, pathKind = '';
    const depthCaptions: string[] = [], selectedNames: string[] = [], visibilityDashes: string[] = [];
    const before = JSON.stringify((window as any).__ctx.toolData.dissection);
    // Observe the renderer boundary while forwarding every actual draw. Stack scope
    // separates the synthetic inspection capsule from the authored organ surfaces.
    ctx.beginPath = function () {
      pathKind = '';
      if (['#fbbf24', '#60a5fa', '#ffffff'].includes(this.strokeStyle)) {
        const stack = new Error().stack || '';
        if (stack.includes('drawStructureInspectionFootprint')) {
          if (stack.includes('traceStructureMorphologyContour')) { contourPaths++; pathKind = 'morphology'; }
          if (stack.includes('drawStructureMorphologyTexture')) { texturePaths++; pathKind = 'texture'; }
        }
      }
      return begin.call(this);
    };
    ctx.fill = function (...args: any[]) { if (pathKind === 'morphology') morphologyFills++; return fill.apply(this, args); };
    ctx.fillText = function (value: string, ...args: any[]) {
      const label = String(value);
      if (/^(SURFACE|MID|DEEP)\s*·/.test(label) && (new Error().stack || '').includes('drawStructureInspectionFootprint')) depthCaptions.push(label);
      if (/selected/i.test(label)) selectedNames.push(label);
      return text.call(this, value, ...args);
    };
    ctx.arc = function (x: number, y: number, radius: number, start: number, end: number, ...args: any[]) {
      if (Math.abs(end - start - .58) < .0001 && /254,\s*240,\s*138/.test(this.strokeStyle)) targetArcs++;
      return arc.call(this, x, y, radius, start, end, ...args);
    };
    ctx.setLineDash = function (values: number[]) {
      if ((new Error().stack || '').includes('drawStructureInspectionFootprint')) visibilityDashes.push(values.join(','));
      return dash.call(this, values);
    };
    const destination = document.createElement('canvas'); destination.width = 1000; destination.height = 1200;
    let ok = true;
    try { if (native) ok = node._captureDissectionEvidence(destination.getContext('2d'), 1000, 1200); else node._drawDissectionNow(); }
    finally { ctx.beginPath = begin; ctx.fill = fill; ctx.fillText = text; ctx.arc = arc; ctx.setLineDash = dash; }
    return { ok, contourPaths, texturePaths, morphologyFills, targetArcs, depthCaptions, selectedNames, visibilityDashes,
      selected: (window as any).__ctx.toolData.dissection.selectedOrgan,
      preserved: before === JSON.stringify((window as any).__ctx.toolData.dissection) };
  }, native);
}

test('visible realistic viscera remain free of synthetic anatomy while selection and native capture survive', async ({ page }) => {
  for (const [specimen, liver, stomach] of [['frog', 'liver', 'stomach'], ['pig', 'liver_p', 'stomach_p'], ['perch', 'liver_f', 'stomach_f']]) {
    await mount(page, specimen, liver);
    for (const selectedOrgan of [liver, stomach]) {
      await update(page, { selectedOrgan });
      for (const native of [false, true]) {
        const drawing = await observe(page, native);
        expect(drawing.ok).toBe(true); expect(drawing.preserved).toBe(true); expect(drawing.selected).toBe(selectedOrgan);
        expect(drawing.contourPaths).toBe(0); expect(drawing.texturePaths).toBe(0); expect(drawing.morphologyFills).toBe(0);
        expect(drawing.depthCaptions.length).toBeGreaterThan(0); expect(drawing.selectedNames.length).toBeGreaterThan(0);
        expect(drawing.targetArcs).toBeGreaterThanOrEqual(4);
      }
    }
    await harness.unmount(page);
  }
});

test('teaching, accessible and incompletely exposed anatomy retain projected depth cues', async ({ page }) => {
  await mount(page);
  for (const mode of [
    { visualRealism: 'guided', highContrast: false },
    { visualRealism: 'accessible', highContrast: true },
    { visualRealism: 'realistic', highContrast: true }
  ]) {
    await update(page, mode); const drawing = await observe(page);
    expect(drawing.contourPaths).toBeGreaterThan(0); expect(drawing.texturePaths).toBeGreaterThan(0);
    expect(drawing.morphologyFills).toBeGreaterThan(0); expect(drawing.depthCaptions.length).toBeGreaterThan(0);
  }
  await update(page, { visualRealism: 'realistic', highContrast: false, procedureByLayer: { organs: {
    ...healthy, retracted: false, probed: false, pins: [],
    tissueState: { ...healthy.tissueState, clarity: 80, stability: 65, exposure: 45, risk: 20 }
  } } });
  const emerging = await observe(page);
  expect(emerging.visibilityDashes).toContain('5,3'); expect(emerging.contourPaths).toBeGreaterThan(0);
  await update(page, { procedureByLayer: { organs: { inspected: false, pins: [], tissueState: {
    ...healthy.tissueState, clarity: 20, stability: 20, exposure: 10, risk: 60
  } } } });
  const covered = await observe(page);
  expect(covered.visibilityDashes).toContain('2,3'); expect(covered.contourPaths).toBeGreaterThan(0);
  expect(covered.depthCaptions.length).toBeGreaterThan(0); expect(covered.selected).toBe('liver');
});
