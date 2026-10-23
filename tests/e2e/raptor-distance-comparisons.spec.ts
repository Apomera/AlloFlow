import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 180000, retries: 0 });

const output = resolve(process.env.RAPTOR_DISTANCE_ROUND2_REPORT || 'reports/raptor-distance-round2-20261022');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true,
  width: 1120, height: 900, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.comparisonNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]',
  close: '[data-raptor-distance-close]', reveal: '[data-distance-reveal]',
  pin: '[data-distance-pin]', clearPin: '[data-distance-clear-pin]',
  comparison: '[data-distance-comparison]', stale: '[data-distance-draft-stale]',
  adopt: '[data-distance-adopt-draft]', clearDraft: '[data-distance-clear-draft]',
  note: 'textarea[data-distance-note]', save: '[data-distance-save]',
  records: '[data-distance-record]', images: 'img[data-distance-pinned-image]'
};
const reference = { version: 1, distance: 80, cycles: 8, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 };

async function setup(page: Page, failMeadow = false) {
  const errors: string[] = [], meadowRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/stem_sim_meadow\.js/.test(request.url())) meadowRequests.push(request.url()); });
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame.bind(window);
    (window as any).comparisonActivityRafs = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(scene|study)\.js/.test(String(new Error().stack))) (window as any).comparisonActivityRafs++;
      return original(callback);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.comparisonNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await page.route('**/stem_lab/stem_sim_assets.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_sim_assets.js', 'utf8') +
      '\n(()=>{const a=window.StemSimAssets;window.comparisonCatalogCalls=[];window.StemSimAssets=Object.freeze(Object.assign({},a,{create:function(T,id,v,o){window.comparisonCatalogCalls.push({method:"create",id,version:v});return a.create(T,id,v,o);},createData:function(id,v){window.comparisonCatalogCalls.push({method:"createData",id,version:v});return a.createData(id,v);}}));})();'
  }));
  if (failMeadow) await page.route('**/stem_sim_meadow.js*', route => route.abort());
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' },
    huntTutorialDismissed: true, graphicsQuality: 'low', xp: 97,
    huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false }
  } }, undefined, { expectCanvas: false });
  await expect(page.locator(ui.launch)).toBeVisible();
  expect(meadowRequests).toEqual([]);
  expect(await harness.glContexts(page)).toEqual([]);
  const siblings = await readSiblings(page);
  return { errors, meadowRequests, siblings };
}

async function readSiblings(page: Page) {
  return page.evaluate(() => {
    const data = { ...(window as any).__toolData.raptorHunt };
    delete data.distantDetailStudy;
    return data;
  });
}

async function activate(page: Page, selector: string, keyboard = false) {
  const button = page.locator(selector);
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); }
  else await button.click();
}

async function open(page: Page, keyboard = false) {
  await activate(page, ui.launch, keyboard);
  await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  return diagnostics(page);
}

async function diagnostics(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => root._distanceScene.getDiagnostics());
}

async function setRange(page: Page, name: string, value: number) {
  await page.locator('#rh-distance-' + name).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}

async function conditions(page: Page, distance: number, cycles: number, contrast: number) {
  await expect(page.locator('#rh-distance-distance')).toHaveValue(String(distance));
  await expect(page.locator('#rh-distance-cycles')).toHaveValue(String(cycles));
  await expect(page.locator('#rh-distance-contrast')).toHaveValue(String(contrast));
}

async function reveal(page: Page, prediction: 'both' | 'eagle' | 'neither', keyboard = false) {
  await activate(page, '[data-distance-prediction="' + prediction + '"]', keyboard);
  await activate(page, ui.reveal, keyboard);
  await expect(page.locator('[data-distance-result]')).toBeVisible();
}

async function pngs(page: Page) {
  await expect(page.locator(ui.images)).toHaveCount(2);
  return page.locator(ui.images).evaluateAll(images => images.map(image => ({
    condition: image.getAttribute('data-distance-pinned-image'),
    src: (image as HTMLImageElement).src,
    width: (image as HTMLImageElement).naturalWidth
  })));
}

async function study(page: Page) {
  return page.evaluate(() => (window as any).__toolData.raptorHunt.distantDetailStudy);
}

async function idleScene(page: Page) {
  // Give React and the browser two paints, then verify the observation scene
  // has no continuous render loop and pinning has not allocated a second GL.
  await page.evaluate(() => new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()))));
  const first = await diagnostics(page);
  await page.evaluate(() => new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()))));
  const last = await diagnostics(page);
  expect(last.lifecycle.renderCount).toBe(first.lifecycle.renderCount);
  expect(last.lifecycle.liveContexts).toBe(1);
  expect((await harness.glContexts(page)).filter(context => !context.lost)).toHaveLength(1);
  expect(await page.evaluate(() => (window as any).comparisonActivityRafs)).toBe(0);
  return last;
}

async function closeAndCheck(page: Page) {
  await page.locator(ui.root).evaluate((root: any) => { (window as any).comparisonClosedScene = root._distanceScene; });
  await activate(page, ui.close);
  await expect(page.locator(ui.root)).toHaveCount(0);
  await expect(page.locator(ui.launch)).toBeFocused();
  const closed = await page.evaluate(() => (window as any).comparisonClosedScene.getDiagnostics());
  expect(closed.lifecycle).toMatchObject({ disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0 });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
  return closed;
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('pins real rendered evidence and runs bounded one-factor comparisons from the saved reference', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const state = await setup(page);
  const initial = await open(page);
  expect(initial.catalogVegetation.mode).toBe('catalog');
  expect(initial.catalogVegetation.assets.map((asset: any) => ({ id: asset.id, instances: asset.instances }))).toEqual([
    { id: 'plant.meadow-grass', instances: 288 }, { id: 'plant.meadow-shrub', instances: 24 }
  ]);
  expect(initial.catalogVegetation.assets.every((asset: any) => asset.detailClearanceM > 0)).toBe(true);
  const catalogCalls = await page.evaluate(() => (window as any).comparisonCatalogCalls);
  expect(catalogCalls.filter((call: any) => call.method === 'createData').map((call: any) => call.id)).toEqual(['plant.meadow-grass', 'plant.meadow-shrub']);
  await expect(page.locator(ui.pin)).toBeDisabled();
  await setRange(page, 'distance', 80);
  await setRange(page, 'cycles', 8);
  await reveal(page, 'both');
  await activate(page, ui.pin);
  await expect(page.locator(ui.comparison)).toHaveAttribute('data-kind', 'same');
  await expect.poll(async () => (await pngs(page)).every(image => image.width === 1024)).toBe(true);
  const frozen = await pngs(page);
  expect(frozen.every(image => image.src.startsWith('data:image/png;base64,'))).toBe(true);
  const originalCanvases = await page.locator('canvas[data-distance-canvas]').evaluateAll(canvases => Object.fromEntries(canvases.map(canvas => [canvas.getAttribute('data-distance-canvas'), (canvas as HTMLCanvasElement).toDataURL('image/png')])));
  frozen.forEach(image => expect(image.src).toBe(originalCanvases[image.condition!]));

  await activate(page, '[data-distance-experiment="distance"]');
  await conditions(page, 160, 8, 95);
  await expect(page.locator(ui.comparison)).toHaveAttribute('data-kind', 'single');
  await expect(page.locator(ui.reveal)).toBeDisabled();
  expect(await pngs(page)).toEqual(frozen);
  await expect.poll(() => page.locator('canvas[data-distance-canvas="eagle"]').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL('image/png'))).not.toBe(frozen.find(image => image.condition === 'eagle')!.src);

  // Each command starts from the pin, so experiments cannot accidentally
  // compound a previous distance or contrast manipulation.
  await activate(page, '[data-distance-experiment="cycles"]');
  await conditions(page, 80, 16, 95);
  await expect(page.locator(ui.comparison)).toHaveAttribute('data-kind', 'single');
  await activate(page, '[data-distance-experiment="contrast"]');
  await conditions(page, 80, 8, 25);
  await expect(page.locator(ui.comparison)).toHaveAttribute('data-kind', 'single');
  await activate(page, '[data-distance-experiment="restore"]');
  await conditions(page, 80, 8, 95);
  await expect(page.locator(ui.comparison)).toHaveAttribute('data-kind', 'same');
  await setRange(page, 'distance', 160);
  await setRange(page, 'cycles', 16);
  await expect(page.locator(ui.comparison)).toHaveAttribute('data-kind', 'multiple');
  expect(await pngs(page)).toEqual(frozen);

  await activate(page, '[data-distance-experiment="distance"]');
  await reveal(page, 'eagle');
  await page.locator(ui.note).fill('Doubling distance while keeping eight stripe pairs and contrast fixed increased the angular frequency.');
  await activate(page, ui.save);
  const saved = await study(page);
  expect(saved.records).toHaveLength(1);
  expect(saved.records[0]).toMatchObject({ distance: 160, cycles: 8, contrast: 95, prediction: 'eagle', comparison: { version: 1, reference } });
  expect(saved.records[0].comparison.reference).toEqual(reference);
  expect(JSON.stringify(saved)).not.toContain('data:image');
  await page.locator(ui.comparison).screenshot({ path: resolve(output, 'distance-comparison-desktop.jpg'), type: 'jpeg', quality: 88 });
  const idle = await idleScene(page);
  expect(idle.lifecycle.allocationCount).toBe(initial.lifecycle.allocationCount);

  // A limit is unavailable rather than silently clamping a promised doubling.
  await setRange(page, 'distance', 300);
  await setRange(page, 'cycles', 20);
  await setRange(page, 'contrast', 25);
  await reveal(page, 'neither');
  await activate(page, ui.pin);
  await expect(page.locator('[data-distance-experiment="distance"]')).toBeDisabled();
  await expect(page.locator('[data-distance-experiment="cycles"]')).toBeDisabled();
  await expect(page.locator('[data-distance-experiment="contrast"]')).toBeDisabled();
  const closed = await closeAndCheck(page);
  await open(page);
  await expect(page.locator(ui.images)).toHaveCount(0);
  await expect(page.locator(ui.records)).toHaveCount(1);
  expect((await study(page)).records).toEqual(saved.records);
  await conditions(page, 300, 20, 25);
  expect(await readSiblings(page)).toEqual(state.siblings);
  expect(state.errors).toEqual([]);
  writeFileSync(resolve(output, 'comparison-workflow.json'), JSON.stringify({ initial, idle, closed, saved, catalogCalls, pinnedImages: frozen.map(image => ({ condition: image.condition, pngLength: image.src.length })), errors: state.errors }, null, 2));
});

test('protects drafts when current conditions or a pin change and supports keyboard comparison on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const state = await setup(page);
  await page.locator('#wrap').evaluate((wrap: HTMLElement) => { wrap.style.width = '100%'; });
  await open(page, true);
  await reveal(page, 'eagle', true);
  await activate(page, ui.pin, true);
  await page.locator(ui.note).fill('My draft refers to the pinned 120 metre comparison.');
  await activate(page, '[data-distance-experiment="distance"]', true);
  await conditions(page, 240, 12, 95);
  await expect(page.locator(ui.stale)).toBeVisible();
  await expect(page.locator(ui.note)).toHaveValue('My draft refers to the pinned 120 metre comparison.');
  await reveal(page, 'neither', true);
  await expect(page.locator(ui.save)).toBeDisabled();
  await page.locator(ui.note).fill('I edited the draft, but it still needs explicit attachment to the new conditions.');
  await expect(page.locator(ui.stale)).toBeVisible();
  await expect(page.locator(ui.save)).toBeDisabled();
  await activate(page, ui.adopt, true);
  await expect(page.locator(ui.note)).toBeFocused();
  await expect(page.locator(ui.stale)).toHaveCount(0);
  await expect(page.locator(ui.save)).toBeEnabled();
  await activate(page, ui.save, true);
  const saved = await study(page);
  expect(saved.records).toHaveLength(1);
  expect(saved.records[0]).toMatchObject({ distance: 240, cycles: 12, contrast: 95, comparison: { version: 1, reference: { distance: 120, cycles: 12, contrast: 95 } } });

  // Pinning the already revealed current view changes only the reference.
  // That alone must make an existing nonempty draft stale.
  await page.locator(ui.note).fill('This second draft still refers to the old 120 metre reference.');
  await expect(page.locator(ui.stale)).toHaveCount(0);
  await activate(page, ui.pin, true);
  await conditions(page, 240, 12, 95);
  await expect(page.locator(ui.comparison)).toHaveAttribute('data-kind', 'same');
  await expect(page.locator(ui.stale)).toBeVisible();
  await expect(page.locator(ui.save)).toBeDisabled();
  await page.locator(ui.note).fill('An edit does not silently change the reference attached to this draft.');
  await expect(page.locator(ui.stale)).toBeVisible();
  await activate(page, ui.clearDraft, true);
  await expect(page.locator(ui.note)).toHaveValue('');
  await expect(page.locator(ui.note)).toBeFocused();
  await expect(page.locator(ui.stale)).toHaveCount(0);
  await expect(page.locator(ui.save)).toBeDisabled();
  const layout = await page.locator(ui.root).evaluate((root: HTMLElement) => ({
    overflow: root.scrollWidth > root.clientWidth + 1,
    images: [...root.querySelectorAll('img[data-distance-pinned-image]')].map(image => ({
      width: image.getBoundingClientRect().width, right: image.getBoundingClientRect().right,
      naturalWidth: (image as HTMLImageElement).naturalWidth, alt: image.getAttribute('alt')
    }))
  }));
  expect(layout.overflow).toBe(false);
  expect(layout.images).toHaveLength(2);
  expect(layout.images.every(image => image.width > 150 && image.right <= 390 && image.naturalWidth === 1024 && !!image.alt)).toBe(true);
  await page.locator(ui.root).screenshot({ path: resolve(output, 'distance-comparison-mobile.jpg'), type: 'jpeg', quality: 84 });
  await activate(page, ui.clearPin, true);
  await expect(page.locator(ui.images)).toHaveCount(0);
  const idle = await idleScene(page);
  expect(await readSiblings(page)).toEqual(state.siblings);
  expect(state.errors).toEqual([]);
  writeFileSync(resolve(output, 'comparison-drafts-mobile.json'), JSON.stringify({ saved, layout, idle, errors: state.errors }, null, 2));
});

test('keeps comparisons usable with the exact legacy vegetation fallback when the optional meadow provider is unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  const state = await setup(page, true);
  const initial = await open(page);
  expect(state.meadowRequests.length).toBeGreaterThan(0);
  expect(initial.catalogVegetation.mode).toBe('fallback');
  expect(initial.catalogVegetation.assets).toEqual([]);
  const scene = await page.evaluate(() => {
    const w = window as any, rows: any[] = [];
    for (const record of w.__glRecorder.records) {
      if (!record.scene || record.ctx.isContextLost()) continue;
      record.scene.traverse((node: any) => { if (node.isInstancedMesh) rows.push({ geometry: node.geometry.type, count: node.count }); });
    }
    return { rows, catalogCalls: w.comparisonCatalogCalls || [], meadowAvailable: !!w.StemMeadow };
  });
  expect(scene.meadowAvailable).toBe(false);
  expect(scene.rows).toContainEqual({ geometry: 'ConeGeometry', count: 80 });
  expect(scene.catalogCalls.filter((call: any) => call.method === 'createData')).toEqual([]);
  expect(scene.catalogCalls.some((call: any) => call.method === 'create' && call.id === 'animal.mourning-dove')).toBe(true);
  await reveal(page, 'eagle');
  await activate(page, ui.pin);
  const frozen = await pngs(page);
  await activate(page, '[data-distance-experiment="contrast"]');
  await conditions(page, 120, 12, 25);
  await reveal(page, 'eagle');
  await expect(page.locator(ui.comparison)).toHaveAttribute('data-kind', 'single');
  expect(await pngs(page)).toEqual(frozen);
  const idle = await idleScene(page);
  const closed = await closeAndCheck(page);
  expect(await readSiblings(page)).toEqual(state.siblings);
  expect(state.errors).toEqual([]);
  writeFileSync(resolve(output, 'comparison-meadow-fallback.json'), JSON.stringify({ initial, scene, idle, closed, meadowRequests: state.meadowRequests, errors: state.errors }, null, 2));
});
