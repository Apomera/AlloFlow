import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// Real working-tree anatomy, local decoder and real host helpers. No remote CDN
// can make a broken local asset pass this suite. Only the harness loader stub is
// replaced: dependencies must already have been loaded from the local scripts.
// Run with --workers=1; avoid another software-WebGL suite at the same time.
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const labels = JSON.stringify({ stem: { brainatlas: strings.stem.brainatlas, synth_ui: strings.stem.synth_ui } }).replace(/</g, '\\u003c');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_brainatlas.js', toolId: 'brainAtlas',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['vendor/three-r128/OrbitControls.js', 'vendor/three-r128/GLTFLoader.js'],
  width: 1280, height: 900, layout: 'document', appStyles: true,
  probes: `
    document.getElementById('wrap').style.width = '100%';
    window.StemLab.loadScriptResilient = function (urls, options) {
      return options && options.check && options.check()
        ? Promise.resolve()
        : Promise.reject(new Error('Missing local Brain Atlas dependency: ' + (options && options.cacheKey)));
    };
    var brainLabels = ${labels};
    var mountBrain = window.__mount;
    window.__mount = function (data) {
      var mounted = mountBrain(data);
      window.__ctx.t = function (key, fallback) {
        var value = key.split('.').reduce(function (o, k) { return o && o[k]; }, brainLabels);
        return typeof value === 'string' ? value : (fallback || key);
      };
      return mounted;
    };
  `,
});

test.describe.configure({ timeout: 180000, retries: 0, mode: 'default' });
test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', video: 'off', launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(harness.url).origin ? route.continue() : route.abort('blockedbyclient'));
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountAtlas(page: Page, state: Record<string, unknown> = {}) {
  await page.goto(harness.url + '/__harness');
  await page.evaluate(data => (window as any).__mount({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d', ...data } }), state);
  await expect(page.locator('#wrap canvas').first()).toBeVisible();
}

async function readyModel(page: Page) {
  await expect(page.locator('.brainatlas-3d-loading')).toHaveAttribute('data-state', 'ready', { timeout: 90000 });
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.querySelector('[data-brainatlas-3d-canvas]') as any;
    return !!canvas?._brain3DState?.ready && canvas._brain3DState.meshes.length;
  })).toBeGreaterThan(100);
}

async function atlasState(page: Page) {
  // Avoid serializing the full 283-structure geometry index on every assertion.
  return page.evaluate(() => {
    const state = (window as any).__toolData.brainAtlas;
    return { selected3DStructure: state.selected3DStructure, selectedRegion: state.selectedRegion,
      brain3DSavedStructures: state.brain3DSavedStructures, brain3DSliceAxis: state.brain3DSliceAxis,
      brain3DSlicePosition: state.brain3DSlicePosition };
  });
}

test('loads and draws local anatomy, then supports search, keyboard, cutaway and representation continuity', async ({ page }) => {
  test.setTimeout(300000);
  await mountAtlas(page);
  await readyModel(page);
  const contexts = await harness.glContexts(page);
  expect(contexts.some(record => record.createdBy === 'page' && !record.lost && record.draws > 0)).toBe(true);
  const scene = await harness.glScene(page);
  expect(scene?.visibleMeshes).toBeGreaterThan(100);
  const pixels = await harness.glPixels(page);
  expect(pixels, 'the tool must draw pixels, not only create a context').not.toBeNull();
  expect(looksBlank(pixels!)).toBe(false);
  await test.info().attach('local-3d-model', { body: pixels!.png, contentType: 'image/png' });

  const search = page.getByRole('combobox', { name: 'Search 3D brain structures by anatomy or function' });
  await search.fill('hippocampus');
  await expect(page.locator('#brainatlas-3d-search-results')).toBeVisible();
  await search.press('Enter');
  await expect.poll(async () => (await atlasState(page)).selected3DStructure, { timeout: 45000 }).toMatch(/hippocampus/i);
  const selected = (await atlasState(page)).selected3DStructure;
  const region = (await atlasState(page)).selectedRegion;
  expect(region).toBeTruthy();
  await expect(page.locator('[data-brainatlas-save-structure]')).toHaveAttribute('data-brainatlas-save-structure', selected);

  // Inspect the selected structure in isolation before changing the camera.
  // Hundreds of transparent shells are very expensive under software rendering;
  // their default whole-brain output was already checked above.
  const toolbox = page.locator('[data-brainatlas-3d-toolbox]');
  if (!(await toolbox.evaluate(element => (element as HTMLDetailsElement).open))) await toolbox.locator('summary').click();
  await toolbox.getByRole('button', { name: 'Isolate', exact: true }).click();

  const canvas = page.locator('[data-brainatlas-3d-canvas]');
  await expect(canvas).toHaveAttribute('tabindex', '0');
  await canvas.focus();
  const before = await canvas.evaluate((element: any) => element._brain3DState.camera.position.toArray());
  await canvas.press('ArrowRight');
  await expect(canvas).toBeFocused();
  await expect.poll(() => canvas.evaluate((element: any) => element._brain3DState.camera.position.toArray())).not.toEqual(before);

  await page.getByRole('group', { name: '3D anatomical cutaway plane', exact: true }).getByRole('button', { name: 'Coronal', exact: true }).click();
  const depth = page.getByRole('slider', { name: 'Cut depth', exact: true });
  await depth.focus();
  const previousDepth = Number(await depth.inputValue());
  await depth.press('ArrowRight');
  await expect(depth).toHaveValue(String(previousDepth + 1));
  await expect.poll(async () => (await atlasState(page)).brain3DSliceAxis).toBe('coronal');
  await expect.poll(() => canvas.evaluate((element: any) => element._brain3DState.meshes.filter((mesh: any) => mesh.material.clippingPlanes?.length).length)).toBeGreaterThan(100);

  await page.getByRole('button', { name: /2D Diagram/ }).click();
  await expect(page.locator('[data-brainatlas-canvas-shell]')).toHaveAttribute('data-brainatlas-display-mode', 'diagram');
  expect((await atlasState(page)).selectedRegion).toBe(region);
  await expect(page.locator('[data-brainatlas-3d-canvas]')).toHaveCount(0);
  await page.getByRole('button', { name: /3D Model/ }).click();
  await readyModel(page);
  expect((await atlasState(page)).selected3DStructure).toBe(selected);
  expect((await atlasState(page)).selectedRegion).toBe(region);
  expect(await page.evaluate(() => (window as any).__events.errors.filter((message: string) => !/ResizeObserver loop/.test(message)))).toEqual([]);
});

test('recovers from a real model request failure without clearing saved study work', async ({ page }) => {
  let requests = 0;
  await page.route('**/alloflow-brain-atlas-meshopt.glb*', route => ++requests === 1 ? route.abort('failed') : route.fallback());
  const saved = ['Allen_head_of_hippocampus_L'];
  await mountAtlas(page, { selected3DStructure: saved[0], brain3DSavedStructures: saved, brain3DFocus: 'isolate', brain3DSliceAxis: 'coronal', brain3DSlicePosition: 37 });
  await expect(page.locator('.brainatlas-3d-loading')).toHaveAttribute('data-state', 'error');
  const retry = page.getByRole('button', { name: 'Retry 3D model', exact: true });
  await expect(retry).toBeVisible();
  await retry.focus();
  await retry.press('Enter');
  await readyModel(page);
  expect(requests).toBe(2);
  await expect(retry).toBeHidden();
  await expect(page.locator('[data-brainatlas-3d-canvas]')).toBeFocused();
  const state = await atlasState(page);
  expect(state.brain3DSavedStructures).toEqual(saved);
  expect(state.selected3DStructure).toBe(saved[0]);
  expect(state.brain3DSliceAxis).toBe('coronal');
  expect(state.brain3DSlicePosition).toBe(37);
  expect((await harness.glScene(page))?.draws).toBeGreaterThan(0);
});

for (const width of [320, 390]) {
  test(`compact 2D workspace reflows at ${width}px and Diagram brings the drawing into view`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await mountAtlas(page, { atlasDisplayMode: 'diagram' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.locator('[data-brainatlas-nav-target="diagram"]').click();
    const target = page.locator('#brainatlas-diagram-focus');
    await expect(target).toBeFocused();
    await expect.poll(() => target.locator('canvas').evaluate(element => {
      const box = element.getBoundingClientRect();
      return Math.max(0, Math.min(innerHeight, box.bottom) - Math.max(0, box.top));
    })).toBeGreaterThan(180);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
