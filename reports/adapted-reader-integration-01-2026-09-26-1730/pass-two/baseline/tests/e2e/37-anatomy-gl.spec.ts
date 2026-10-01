import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_anatomy.js',
  toolId: 'anatomy',
  width: 1280,
  height: 980,
  extraScripts: [
    'vendor/three-r128/OrbitControls.js',
    'vendor/three-r128/GLTFLoader.js',
  ],
  probes: `
    window.__anatomyProbe = function () {
      var canvas = document.querySelector('[data-anatomy-3d-canvas="true"]');
      var live = window.__glLive();
      return {
        canvas: canvas,
        state: canvas && canvas.getAttribute('data-anatomy-3d-state'),
        style: canvas && canvas.getAttribute('data-anatomy-3d-style'),
        atlas: canvas && canvas.getAttribute('data-anatomy-atlas-pack'),
        status: (document.getElementById('anatomy-3d-status') || {}).textContent || '',
        live: live
      };
    };
  `,
});

const anatomyState = (extra: Record<string, unknown> = {}) => ({
  anatomy: {
    _activeTab: 'explore',
    system: 'skeletal',
    view: 'anterior',
    complexity: 3,
    _bodyView3d: true,
    _body3dStyle: 'realistic',
    selectedStructure: 'femur',
    ...extra,
  },
});

const pageErrors = async (page: any) => (
  (await page.evaluate(() => (window as any).__events.errors)) as string[]
).filter((message) => !/ResizeObserver loop/.test(message));

test.describe.configure({ timeout: 150_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test.describe('Anatomy on real WebGL', () => {
  test('Surface stays live, dark, and on the same canvas through selection and orbit input', async ({ page }) => {
    await harness.mount(
      page,
      anatomyState(),
      `document.querySelector('[data-anatomy-3d-state="ready"]')`,
    );

    const canvas = page.locator('[data-anatomy-3d-canvas="true"]');
    await page.evaluate(() => { (window as any).__originalAnatomyCanvas = document.querySelector('[data-anatomy-3d-canvas="true"]'); });
    const before = await canvas.screenshot();
    expect(before.length, 'Surface rendered as a blank/flat canvas').toBeGreaterThan(8000);

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.52, { steps: 8 });
      await page.mouse.up();
      await page.mouse.wheel(0, -260);
    }
    await canvas.focus();
    await page.keyboard.press('ArrowRight');
    await page.evaluate(() => (window as any).__ctx.update('anatomy', 'selectedStructure', 'tibia'));
    await page.waitForTimeout(900);

    const after = await canvas.screenshot();
    const result = await page.evaluate(() => ({
      sameCanvas: (window as any).__originalAnatomyCanvas === document.querySelector('[data-anatomy-3d-canvas="true"]'),
      probe: (window as any).__anatomyProbe(),
      glCanvasCount: Array.from(document.querySelectorAll('#wrap canvas')).filter((candidate: any) => {
        try { return !!(candidate.getContext('webgl2') || candidate.getContext('webgl')); } catch { return false; }
      }).length,
    }));

    expect(result.sameCanvas, 'React state replaced the WebGL canvas').toBe(true);
    expect(result.probe.state).toBe('ready');
    expect(result.probe.live?.lost, 'Surface context was lost after interaction').toBe(false);
    expect(result.glCanvasCount, 'interaction created duplicate WebGL canvases').toBe(1);
    expect(after.length, 'Surface disappeared after interaction').toBeGreaterThan(8000);
    expect(Buffer.compare(before, after), 'orbit/selection input did not change the rendered body').not.toBe(0);
    expect(await pageErrors(page)).toEqual([]);
  });

  test('bundled HRA kidney loads as a nonblank licensed organ-focus model', async ({ page }) => {
    await harness.mount(
      page,
      anatomyState({
        system: 'organs',
        view: 'posterior',
        selectedStructure: 'kidneys',
        _body3dStyle: 'clinical',
        _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3',
      }),
      `document.querySelector('[data-anatomy-3d-state="ready-model"]')`,
    );

    const canvas = page.locator('[data-anatomy-3d-canvas="true"]');
    const shot = await canvas.screenshot();
    const probe = await page.evaluate(() => (window as any).__anatomyProbe());

    expect(probe.style).toBe('clinical');
    expect(probe.atlas).toBe('hra-kidney-female-left-v1.3');
    expect(probe.state).toBe('ready-model');
    expect(probe.status).toContain('Clinical Atlas ready: Clinical Kidney Atlas');
    expect(probe.live?.lost, 'Clinical Atlas context is lost').toBe(false);
    expect(shot.length, 'HRA kidney rendered as a blank/flat canvas').toBeGreaterThan(8000);
    expect(await pageErrors(page)).toEqual([]);
  });

  test('recovers a deliberately lost context without replacing or whitening the canvas', async ({ page }) => {
    await harness.mount(
      page,
      anatomyState(),
      `document.querySelector('[data-anatomy-3d-state="ready"]')`,
    );

    const supported = await page.evaluate(() => {
      const hit = (window as any).__glCanvas();
      if (!hit) return false;
      const extension = hit.gl.getExtension('WEBGL_lose_context');
      if (!extension) return false;
      (window as any).__originalAnatomyCanvas = hit.el;
      (window as any).__anatomyLoseContext = extension;
      extension.loseContext();
      return true;
    });
    test.skip(!supported, 'Chromium did not expose WEBGL_lose_context');

    await page.waitForSelector('[data-anatomy-3d-state="recovering"]');
    await page.evaluate(() => (window as any).__anatomyLoseContext.restoreContext());
    await page.waitForSelector('[data-anatomy-3d-state="ready"]', { timeout: 30_000 });
    await page.waitForTimeout(600);

    const canvas = page.locator('[data-anatomy-3d-canvas="true"]');
    const shot = await canvas.screenshot();
    const result = await page.evaluate(() => ({
      sameCanvas: (window as any).__originalAnatomyCanvas === document.querySelector('[data-anatomy-3d-canvas="true"]'),
      probe: (window as any).__anatomyProbe(),
    }));

    expect(result.sameCanvas, 'context recovery replaced the canvas').toBe(true);
    expect(result.probe.live?.lost, 'context stayed lost after restoration').toBe(false);
    expect(shot.length, 'restored Surface is blank/white').toBeGreaterThan(8000);
    expect(await pageErrors(page)).toEqual([]);
  });
});

test('failed Clinical Atlas load retries on the same canvas and preserves its selected concept', async ({ page }) => {
  let requests = 0;
  await page.route('**/hra-kidney-female-left-v1.3.glb', async (route) => {
    requests++;
    if (requests === 1) await route.abort('failed');
    else await route.continue();
  });
  await harness.mount(page, anatomyState({
    system: 'organs', view: 'posterior', selectedStructure: 'kidneys',
    _body3dStyle: 'clinical', _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3',
    _clinicalAtlasConceptId: 'UBERON:0001225',
  }), `document.querySelector('[data-anatomy-3d-state="fallback-model"]')`);
  const canvas = page.locator('[data-anatomy-3d-canvas="true"]');
  const recovery = page.getByRole('group', { name: '3D model recovery' });
  await expect(recovery).toBeVisible();
  await expect(page.locator('#anatomy-3d-status')).toContainText('could not be read');
  await page.evaluate(() => { (window as any).__retryCanvas = document.querySelector('[data-anatomy-3d-canvas="true"]'); });
  await page.getByRole('button', { name: 'Retry 3D model', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-anatomy-3d-state', 'ready-model', { timeout: 30_000 });
  expect(requests).toBe(2);
  await expect(recovery).toBeHidden();
  await expect(page.locator('#anatomy-3d-status')).toBeFocused();
  await expect(page.locator('[data-anatomy-clinical-selected-concept]')).toHaveAttribute('data-anatomy-clinical-selected-concept', 'UBERON:0001225');
  expect(await page.evaluate(() => (window as any).__retryCanvas === document.querySelector('[data-anatomy-3d-canvas="true"]'))).toBe(true);
  expect((await page.evaluate(() => (window as any).__anatomyProbe())).live?.lost).toBe(false);
  expect((await canvas.screenshot()).length).toBeGreaterThan(8000);
});

test('failed Clinical Atlas load offers a direct 2D escape with selection intact', async ({ page }) => {
  await page.route('**/hra-kidney-female-left-v1.3.glb', (route) => route.abort('failed'));
  await harness.mount(page, anatomyState({
    system: 'organs', view: 'posterior', selectedStructure: 'kidneys',
    _body3dStyle: 'clinical', _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3',
    _clinicalAtlasConceptId: 'UBERON:0001225',
  }), `document.querySelector('[data-anatomy-3d-state="fallback-model"]')`);
  await page.getByRole('button', { name: 'Open 2D Atlas', exact: true }).click();
  await expect(page.locator('[data-anatomy-tool="true"]')).toHaveAttribute('data-anatomy-active-mode', '2d');
  await expect(page.locator('#anatomy-workspace')).toBeFocused();
  await expect(page.locator('[data-anatomy-panel="explore"]')).toContainText('Kidneys');
  await expect(page.locator('[data-anatomy-3d-canvas="true"]')).toHaveCount(0);
  await expect(page.locator('[data-anatomy-model-recovery]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.anatomy._clinicalAtlasConceptId)).toBe('UBERON:0001225');
});
