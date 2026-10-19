import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180,
  height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const procedure = { inspected: true, incisionStarted: true, incisionExtended: true, retracted: false, probed: true,
  pins: [{ x: .43, y: .32 }, { x: .57, y: .68 }], history: ['inspect', 'scalpel', 'scissors', 'pin', 'probe'],
  tissueState: { moisture: 65, tension: 40, exposure: 95, trauma: 0, clarity: 95, stability: 95, risk: 5,
    salineDrops: 0, variantId: 'standard', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] } };
test.describe.configure({ retries: 0, timeout: 240000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

async function mount(page: Page, specimen = 'frog', mode = 'realistic') {
  await harness.mount(page, { dissection: { specimen, _dissLoadedSpec: specimen, activeLayer: 'organs', anatomicalView: 'internal',
    workspaceMode: 'advanced', visualRealism: mode, highContrast: mode === 'accessible', reducedMotion: true,
    soundEnabled: false, sceneDetail: true, instrumentVisuals: false, labelMode: 'hidden',
    inspectionLens: false, macroInset: false, depthAtlas: false, tissueRelief: false, relationshipMode: false,
    livingFunctionEnabled: false, parallaxDepth: false, canvasZoom: 1, canvasPanX: 0, canvasPanY: 0,
    variationSeed: 1, lightIntensity: 68, lightDirection: 'overhead',
    revealedLayers: { skin: true, muscle: true, organs: true }, procedureByLayer: { organs: procedure } } }, undefined, { expectCanvas: false });
  await page.locator('[data-diss-canvas]').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((canvas: any) => canvas._dissInViewport)).toBe(true);
}

async function observe(page: Page, specimen = 'frog', native = true) {
  await page.locator('[data-diss-canvas]').scrollIntoViewIfNeeded();
  return page.locator('[data-diss-canvas]').evaluate((canvas: any, options) => {
    const ctx = canvas.getContext('2d'), originalArc = ctx.arc, originalText = ctx.fillText;
    const labels: string[] = []; let collars = 0, matrix: DOMMatrix | null = null;
    let width = canvas.width, height = canvas.height;
    ctx.arc = function (x: number, y: number, radius: number, ...args: any[]) {
      if (Math.abs(radius - 4.2) < .01) { collars++; matrix = this.getTransform(); width = canvas.width; height = canvas.height; }
      return originalArc.call(this, x, y, radius, ...args);
    };
    ctx.fillText = function (text: string, ...args: any[]) { labels.push(String(text)); return originalText.call(this, text, ...args); };
    const output = document.createElement('canvas'); output.width = 1000; output.height = 1200;
    const before = JSON.stringify((window as any).__ctx.toolData.dissection);
    let ok = true;
    try { if (options.native) ok = canvas._captureDissectionEvidence(output.getContext('2d'), 1000, 1200); else canvas._drawDissectionNow(); }
    finally { ctx.arc = originalArc; ctx.fillText = originalText; }
    const targets: Record<string, number[]> = { frog: [.50, .46], pig: [.57, .49], sheepHeart: [.42, .55] };
    let pixels: number[] | null = null;
    if (options.native && matrix) {
      const target = targets[options.specimen];
      const point = new DOMPoint(target[0] * canvas._logicalW, target[1] * canvas._logicalH).matrixTransform(matrix);
      const x = Math.round(point.x / width * 1000), y = Math.round(point.y / height * 1200);
      pixels = Array.from(output.getContext('2d')!.getImageData(x - 8, y - 8, 17, 17).data);
    }
    return { ok, collars, stable: labels.includes('STABLE ANCHOR'), lifted: labels.includes('LIFTED'), pixels,
      preserved: before === JSON.stringify((window as any).__ctx.toolData.dissection) };
  }, { specimen, native });
}

test('retracted tissue preserves internal anatomical pixels in three species and inclusive presentation modes', async ({ page }) => {
  const failures: string[] = []; page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('[DissectionLab]')) failures.push(message.text()); });
  for (const [specimen, mode] of [['frog', 'realistic'], ['pig', 'realistic'], ['sheepHeart', 'realistic'], ['frog', 'guided'], ['frog', 'accessible']]) {
    await mount(page, specimen, mode);
    const before = await observe(page, specimen);
    expect(before.ok).toBe(true); expect(before.preserved).toBe(true); expect(before.collars).toBe(2); expect(before.pixels).not.toBeNull();
    await page.evaluate(() => {
      const ctx = (window as any).__ctx, d = ctx.toolData.dissection;
      ctx.update('dissection', 'procedureByLayer', { ...d.procedureByLayer, organs: { ...d.procedureByLayer.organs, retracted: true, forcepsPoint: { x: .42, y: .43 } } });
    });
    await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((canvas: any) => canvas._drawD.procedureByLayer.organs.retracted)).toBe(true);
    const after = await observe(page, specimen);
    expect(after.ok).toBe(true); expect(after.preserved).toBe(true); expect(after.collars).toBe(2);
    expect(after.stable).toBe(false); expect(after.lifted).toBe(false);
    expect(after.pixels, specimen + ' ' + mode + ' cavity must remain unobscured').toEqual(before.pixels);
    await harness.unmount(page);
  }
  expect(failures).toEqual([]);
});

test('visual tools toggle coaching while physical pins and specimen captures remain intact', async ({ page }) => {
  await mount(page);
  const off = await observe(page, 'frog', false);
  expect(off.collars).toBe(2); expect(off.stable).toBe(false);
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'instrumentVisuals', true));
  await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((canvas: any) => canvas._drawD.instrumentVisuals)).toBe(true);
  const on = await observe(page, 'frog', false);
  expect(on.collars).toBe(2); expect(on.stable).toBe(true);
  const evidence = await observe(page);
  expect(evidence.ok).toBe(true); expect(evidence.preserved).toBe(true);
  expect(evidence.collars).toBe(2); expect(evidence.stable).toBe(false); expect(evidence.lifted).toBe(false);
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'instrumentVisuals', false));
  await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((canvas: any) => canvas._drawD.instrumentVisuals)).toBe(false);
  const restored = await observe(page, 'frog', false);
  expect(restored.collars).toBe(2); expect(restored.stable).toBe(false);
  await harness.unmount(page);
});
