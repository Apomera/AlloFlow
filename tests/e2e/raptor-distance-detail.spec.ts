import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 180000, retries: 0 });

const output = resolve(process.env.RAPTOR_DISTANCE_REPORT || 'reports/raptor-distance-20261022');
const captureLoader = '\nwindow.distanceNativeLoader=window.StemLab.loadScriptResilient;';
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true,
  width: 1120, height: 900, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.distanceNativeLoader;window.AlloPostFXEnabled=false;'
});

const selectors = {
  launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  root: '[data-raptor-distance-study]', reveal: '[data-distance-reveal]',
  result: '[data-distance-result]', save: '[data-distance-save]',
  note: 'textarea[data-distance-note]', record: '[data-distance-record]'
};

const initialRaptor = () => ({
  activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
  flightSession: { speciesId: 'coopersHawk', missionId: 'open' },
  huntTutorialDismissed: true, graphicsQuality: 'low',
  rhXp: 97, xp: 97, huntStats: { attempts: 4, captures: 2 },
  acuity: { version: 1, distance: 85, size: 0.3, fieldOfView: 45 }
});

async function setup(page: Page, study?: unknown) {
  const requests: string[] = [], errors: string[] = [];
  page.on('request', request => {
    if (/raptor_distance_(model|scene|study)\.js/.test(request.url())) requests.push(request.url());
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + captureLoader
  }));
  await page.route('**/stem_lab/stem_sim_assets.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_sim_assets.js', 'utf8') +
      '\n(()=>{const a=window.StemSimAssets;window.distanceCatalogCalls=[];window.StemSimAssets=Object.freeze(Object.assign({},a,{create:function(T,id,v,o){window.distanceCatalogCalls.push({id,version:v,quality:o.quality});return a.create(T,id,v,o);}}));})();'
  }));
  await harness.mount(page, { raptorHunt: { ...initialRaptor(), ...(study === undefined ? {} : { distantDetailStudy: study }) } }, undefined, { expectCanvas: false });
  await expect(page.locator(selectors.launch)).toBeVisible();
  await expect(page.locator(selectors.root)).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(await harness.glContexts(page)).toEqual([]);
  // Capture settled host state so section-visit bookkeeping is not confused
  // with an activity mutation. Ignore only this activity's own saved namespace.
  const siblingState = await page.evaluate(() => {
    const data = { ...(window as any).__toolData.raptorHunt };
    delete data.distantDetailStudy;
    return data;
  });
  return { requests, errors, siblingState };
}

async function openStudy(page: Page, keyboard = false) {
  const launch = page.locator(selectors.launch);
  if (keyboard) { await launch.focus(); await page.keyboard.press('Enter'); }
  else await launch.click();
  await expect(page.locator(selectors.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  await expect(page.locator('canvas[data-distance-canvas]')).toHaveCount(3);
  return page.locator(selectors.root).evaluate((root: any) => root._distanceScene.getDiagnostics());
}

async function readStudy(page: Page) {
  return page.evaluate(() => (window as any).__toolData.raptorHunt.distantDetailStudy);
}

async function setRange(page: Page, id: string, value: number) {
  // Playwright fill does not support range inputs. Use the native setter so
  // React's value tracker sees the same change as a user-generated input.
  await page.locator('#' + id).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#' + id)).toHaveValue(String(value));
}

async function preserveSiblingState(page: Page, before: unknown) {
  const after = await page.evaluate(() => {
    const data = { ...(window as any).__toolData.raptorHunt };
    delete data.distantDetailStudy;
    return data;
  });
  expect(after).toEqual(before);
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('investigates three distance bands with matched real scenes and saves reproducible observations', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const state = await setup(page);
  const diagnostic = await openStudy(page);
  expect(state.requests.some(url => /raptor_distance_scene\.js/.test(url))).toBe(true);
  const catalogCalls = await page.evaluate(() => (window as any).distanceCatalogCalls || []);
  expect(catalogCalls.filter((call: any) => call.id === 'animal.mourning-dove' && call.version === '1.0.0').length).toBeGreaterThan(0);
  expect(diagnostic.rootScale).toEqual([1, 1, 1]);
  expect(diagnostic.sharedDetailSource).toBe(true);
  expect(diagnostic.wideCamera.horizontalFov).toBe(20);
  expect(diagnostic.detailCamera.horizontalFov).toBe(.75);
  expect(diagnostic.wideCamera.position).toEqual(diagnostic.detailCamera.position);
  expect(diagnostic.wideCamera.target).toEqual(diagnostic.detailCamera.target);
  expect(diagnostic.detailCamera.projectionMatrix.every(Number.isFinite)).toBe(true);
  expect(diagnostic.detailCamera.matrixWorld.every(Number.isFinite)).toBe(true);
  expect(diagnostic.lifecycle.liveContexts).toBe(1);
  expect(diagnostic.plaque.widthM).toBe(.3);
  expect(diagnostic.plaque.physicalLuminanceCalibrated).toBe(false);
  await expect(page.locator(selectors.reveal)).toBeDisabled();
  await expect(page.locator(selectors.save)).toBeDisabled();

  await page.locator('[data-distance-preset="near"]').click();
  await expect(page.locator('#rh-distance-distance')).toHaveValue('40');
  await page.locator('[data-distance-prediction="both"]').click();
  await page.locator(selectors.reveal).click();
  await expect(page.locator(selectors.result)).toContainText('Within both selected references');
  await expect(page.locator(selectors.result)).toContainText('Your prediction matches');

  await page.locator('[data-distance-preset="middle"]').click();
  await expect(page.locator('#rh-distance-distance')).toHaveValue('120');
  await expect(page.locator(selectors.reveal)).toBeDisabled();
  await page.locator('[data-distance-prediction="eagle"]').click();
  await page.locator(selectors.reveal).click();
  await expect(page.locator(selectors.result)).toContainText('Above human reference; within eagle reference');
  await expect(page.locator(selectors.result)).toContainText('Your prediction matches');
  const pixels = await page.evaluate(() => {
    const root: any = document.querySelector('[data-raptor-distance-study]');
    const diagnostics = root._distanceScene.getDiagnostics();
    const a = document.querySelector('canvas[data-distance-canvas="reference"]') as HTMLCanvasElement;
    const b = document.querySelector('canvas[data-distance-canvas="eagle"]') as HTMLCanvasElement;
    const aa = a.getContext('2d')!.getImageData(0, 0, a.width, a.height).data;
    const bb = b.getContext('2d')!.getImageData(0, 0, b.width, b.height).data;
    let changed = 0, maximumDifference = 0;
    for (let i = 0; i < aa.length; i += 4) {
      const delta = Math.abs(aa[i] - bb[i]);
      if (delta > 3) changed++;
      maximumDifference = Math.max(maximumDifference, delta);
    }
    // Sample only the inner plaque. Edges, text overlays and the dove cannot
    // supply the difference that this sinusoidal-detail assertion requires.
    const half = Math.floor(diagnostics.plaque.detailWidthPixels * .35);
    const row = Math.floor(a.height / 2), values: number[][] = [[], []];
    for (let x = Math.floor(a.width / 2) - half; x < Math.floor(a.width / 2) + half; x++) {
      const offset = (row * a.width + x) * 4;
      values[0].push(aa[offset]); values[1].push(bb[offset]);
    }
    const deviation = (v: number[]) => {
      const mean = v.reduce((sum, value) => sum + value, 0) / v.length;
      return Math.sqrt(v.reduce((sum, value) => sum + (value - mean) ** 2, 0) / v.length);
    };
    return { changed, maximumDifference, referenceDeviation: deviation(values[0]), eagleDeviation: deviation(values[1]), dimensions: [a.width, a.height, b.width, b.height], diagnostics };
  });
  expect(pixels.changed).toBeGreaterThan(1000);
  expect(pixels.maximumDifference).toBeGreaterThan(15);
  expect(pixels.eagleDeviation).toBeGreaterThan(10);
  expect(pixels.referenceDeviation).toBeLessThan(pixels.eagleDeviation * .7);
  expect(pixels.dimensions).toEqual([1024, 512, 1024, 512]);
  await page.locator(selectors.note).fill('At the same distance and display magnification, the eagle reference preserves more stripe detail; this does not prove prey detection.');
  await expect(page.locator(selectors.save)).toBeEnabled();
  await page.locator(selectors.save).click();
  await expect(page.locator(selectors.record)).toHaveCount(1);
  await expect(page.locator(selectors.record)).toContainText('120');
  await expect(page.locator(selectors.record)).toContainText('eagle');
  const saved = await readStudy(page);
  expect(saved.version).toBe(1);
  expect(saved.distance).toBe(120);
  expect(saved.cycles).toBe(12);
  expect(saved.contrast).toBe(95);
  expect(saved.records).toEqual([{
    version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95,
    widthM: .3, referenceLimit: 60, eagleLimit: 140, prediction: 'eagle',
    note: 'At the same distance and display magnification, the eagle reference preserves more stripe detail; this does not prove prey detection.'
  }]);
  await page.locator(selectors.root).screenshot({ path: resolve(output, 'distance-desktop.jpg'), type: 'jpeg', quality: 82 });
  await page.locator(selectors.root).locator('.rh-distance-panels').screenshot({ path: resolve(output, 'distance-comparison.jpg'), type: 'jpeg', quality: 90 });

  await setRange(page, 'rh-distance-contrast', 35);
  await expect(page.locator(selectors.reveal)).toBeDisabled();
  await expect(page.locator(selectors.save)).toBeDisabled();
  await page.locator('[data-distance-prediction="eagle"]').click();
  await page.locator(selectors.reveal).click();
  await expect(page.locator(selectors.result)).toContainText('Above human reference; within eagle reference');
  await setRange(page, 'rh-distance-distance', 130);
  await expect(page.locator(selectors.reveal)).toBeDisabled();
  await expect(page.locator(selectors.save)).toBeDisabled();

  await page.locator('[data-distance-preset="far"]').click();
  await expect(page.locator('#rh-distance-distance')).toHaveValue('300');
  await page.locator('[data-distance-prediction="neither"]').click();
  await page.locator(selectors.reveal).click();
  await expect(page.locator(selectors.result)).toContainText('Above both selected references');
  await expect(page.locator(selectors.result)).toContainText('Your prediction matches');
  await setRange(page, 'rh-distance-cycles', 14);
  await expect(page.locator(selectors.reveal)).toBeDisabled();
  await expect(page.locator(selectors.save)).toBeDisabled();
  await preserveSiblingState(page, state.siblingState);
  expect(state.errors).toEqual([]);
  writeFileSync(resolve(output, 'distance-investigation.json'), JSON.stringify({ pixels, saved, catalogCalls, errors: state.errors }, null, 2));
});

test('supports narrow keyboard exploration and releases its renderer on close while retaining the notebook', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const state = await setup(page);
  // The harness otherwise deliberately fixes its mount width. Match the actual
  // viewport before opening the responsive activity.
  await page.locator('#wrap').evaluate((wrap: HTMLElement) => { wrap.style.width = '100%'; });
  const diagnostic = await openStudy(page, true);
  const distance = page.locator('#rh-distance-distance');
  await distance.focus();
  const previous = Number(await distance.inputValue());
  await page.keyboard.press('ArrowRight');
  expect(Number(await distance.inputValue())).toBeGreaterThan(previous);
  await page.locator('[data-distance-preset="middle"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-distance-prediction="eagle"]').focus();
  await page.keyboard.press('Space');
  await page.locator(selectors.reveal).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(selectors.result)).toContainText(/eagle/i);
  await page.locator(selectors.note).fill('Equal display magnification lets me compare fine stripe detail.');
  await page.locator(selectors.save).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(selectors.record)).toHaveCount(1);
  const notebook = await readStudy(page);
  const layout = await page.locator(selectors.root).evaluate((root: HTMLElement) => ({
    overflow: root.scrollWidth > root.clientWidth + 1,
    canvases: [...root.querySelectorAll('canvas')].map(canvas => ({ label: canvas.getAttribute('aria-label'), width: canvas.getBoundingClientRect().width }))
  }));
  expect(layout.overflow).toBe(false);
  expect(layout.canvases).toHaveLength(3);
  expect(layout.canvases.every(canvas => !!canvas.label && canvas.width > 200 && canvas.width <= 390)).toBe(true);
  await page.locator(selectors.root).screenshot({ path: resolve(output, 'distance-mobile.jpg'), type: 'jpeg', quality: 82 });
  await page.locator(selectors.root).evaluate((root: any) => { (window as any).closedDistanceScene = root._distanceScene; });
  await page.locator(selectors.close).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(selectors.root)).toHaveCount(0);
  await expect(page.locator(selectors.launch)).toBeFocused();
  const disposed = await page.evaluate(() => (window as any).closedDistanceScene.getDiagnostics());
  expect(disposed.lifecycle.disposed).toBe(true);
  expect(disposed.lifecycle.liveContexts).toBe(0);
  expect(disposed.lifecycle.rendererDisposed).toBe(true);
  expect(disposed.lifecycle.birdDisposed).toBe(true);
  expect(disposed.lifecycle.ownedResourceCount).toBe(0);
  const contexts = await harness.glContexts(page);
  expect(contexts.length).toBeGreaterThan(0);
  expect(contexts.every(context => context.lost && context.lostBy === 'page')).toBe(true);
  await page.setViewportSize({ width: 500, height: 900 });
  await openStudy(page, true);
  await expect(page.locator(selectors.record)).toHaveCount(1);
  expect((await readStudy(page)).records).toEqual(notebook.records);
  await expect(page.locator('#rh-distance-distance')).toHaveValue('120');
  await expect(page.locator(selectors.reveal)).toBeDisabled();
  await preserveSiblingState(page, state.siblingState);
  expect(state.errors).toEqual([]);
  writeFileSync(resolve(output, 'distance-mobile.json'), JSON.stringify({ diagnostic, layout, disposed, notebook, errors: state.errors }, null, 2));
});

test('recovers safely from incompatible persisted activity data without replacing neighboring learning state', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  const state = await setup(page, { version: 999, distance: 'invalid', contrast: -500, cycles: {}, records: [{ note: '<script>throw 1</script>', prediction: 'invented' }] });
  const diagnostic = await openStudy(page);
  await expect(page.locator('#rh-distance-distance')).toHaveValue('120');
  await expect(page.locator('#rh-distance-contrast')).toHaveValue('95');
  await expect(page.locator('#rh-distance-cycles')).toHaveValue('12');
  await expect(page.locator(selectors.record)).toHaveCount(0);
  expect(diagnostic.detailCamera.position.every(Number.isFinite)).toBe(true);
  expect(diagnostic.pixelSigmas.reference).toBeGreaterThan(diagnostic.pixelSigmas.eagle);
  await page.locator('[data-distance-prediction="eagle"]').click();
  await page.locator(selectors.reveal).click();
  await page.locator(selectors.note).fill('A new valid observation after imported data was normalized.');
  await page.locator(selectors.save).click();
  const saved = await readStudy(page);
  expect(saved.version).toBe(1);
  expect(saved.records).toHaveLength(1);
  await preserveSiblingState(page, state.siblingState);
  expect(state.errors).toEqual([]);
  writeFileSync(resolve(output, 'distance-malformed-state.json'), JSON.stringify({ diagnostic, saved, errors: state.errors }, null, 2));
});

test('closing during a delayed companion load prevents a late scene and permits a clean reopen', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  const state = await setup(page);
  let release: () => void = () => {};
  const gate = new Promise<void>(resolveGate => { release = resolveGate; });
  let heldRequests = 0;
  await page.route('**/stem_lab/raptor_distance_scene.js*', async route => {
    heldRequests++;
    await gate;
    await route.continue();
  });
  try {
    await page.locator(selectors.launch).click();
    await expect(page.locator(selectors.launch)).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => heldRequests, { timeout: 20000 }).toBeGreaterThan(0);
    // The companion must resolve before the study component can mount. Its
    // always-present host toggle is also the cancellation control at this stage.
    await expect(page.locator(selectors.root)).toHaveCount(0);
    await page.locator(selectors.launch).click();
    await expect(page.locator(selectors.launch)).toHaveAttribute('aria-expanded', 'false');
    release();
    await page.waitForFunction(() => typeof (window as any).RaptorDistanceScene?.create === 'function', null, { polling: 50, timeout: 30000 });
    // Allow the fulfilled loader and its React continuation to settle. A late
    // callback must not mount a hidden renderer after the learner closed it.
    await page.evaluate(() => new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()))));
    await expect(page.locator(selectors.root)).toHaveCount(0);
    const callsAfterClose = await page.evaluate(() => (window as any).distanceCatalogCalls || []);
    expect(callsAfterClose).toEqual([]);
    expect(await harness.glContexts(page)).toEqual([]);
    await preserveSiblingState(page, state.siblingState);

    const diagnostic = await openStudy(page);
    expect(diagnostic.lifecycle.liveContexts).toBe(1);
    expect(diagnostic.lifecycle.disposed).toBe(false);
    const callsAfterReopen = await page.evaluate(() => (window as any).distanceCatalogCalls || []);
    expect(callsAfterReopen.filter((call: any) => call.id === 'animal.mourning-dove').length).toBeGreaterThan(0);
    await expect(page.locator(selectors.reveal)).toBeDisabled();
    await preserveSiblingState(page, state.siblingState);
    expect(state.errors).toEqual([]);
    writeFileSync(resolve(output, 'distance-delayed-close.json'), JSON.stringify({ heldRequests, callsAfterClose, callsAfterReopen, diagnostic, errors: state.errors }, null, 2));
  } finally {
    // Never leave the HTTP gate unresolved if an assertion or host load fails.
    release();
  }
});
