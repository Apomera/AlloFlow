import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 180000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND7_REPORT || 'reports/raptor-distance-round7-20261022');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900,
  appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.distanceMatchNativeLoader;window.AlloPostFXEnabled=false;'
});
type Prediction = 'both' | 'eagle' | 'neither';
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  panel: '[data-distance-match]', summary: '[data-distance-match] > summary', active: '[data-distance-match-active]',
  start: '[data-distance-match-start]', next: '[data-distance-match-next]', check: '[data-distance-match-check]',
  feedback: '[data-distance-match-feedback]', restore: '[data-distance-match-restore]', exit: '[data-distance-match-exit]',
  human: 'img[data-distance-match-image="human"]', eagle: 'img[data-distance-match-image="eagle"]',
  reveal: '[data-distance-reveal]', note: '[data-distance-note]', save: '[data-distance-save]'
};
const starter = { version: 1, distance: 60, cycles: 8, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 };
const priorRecord = {
  version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95, widthM: .3,
  referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note: 'An earlier observation remains in my notebook.'
};
const savedResults = { version: 1,
  human: { version: 1, modelVersion: 1, reference: 'human', trials: [85, 86].map((distance, i) => ({
    settings: { ...starter, distance, cycles: 12 }, prediction: i ? 'eagle' : 'both'
  })) },
  eagle: { version: 1, modelVersion: 1, reference: 'eagle', trials: [200, 201].map((distance, i) => ({
    settings: { ...starter, distance, cycles: 12 }, prediction: i ? 'neither' : 'eagle'
  })) }
};

async function setup(page: Page, initialStudy: Record<string, unknown> = {}) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), nativePng = HTMLCanvasElement.prototype.toDataURL;
    (window as any).distanceMatchRafs = 0; (window as any).distanceMatchCaptures = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).distanceMatchRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).distanceMatchCaptures++;
      return nativePng.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.distanceMatchNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' },
    huntTutorialDismissed: true, graphicsQuality: 'low', xp: 97,
    huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false },
    distantDetailStudy: { version: 1, distance: 120, cycles: 12, contrast: 95, records: [], ...initialStudy }
  } }, undefined, { expectCanvas: false });
  await expect(page.locator(ui.launch)).toBeVisible();
  expect(await harness.glContexts(page)).toEqual([]);
  return { errors, siblings: await siblings(page) };
}

async function siblings(page: Page) {
  return page.evaluate(() => {
    const result = { ...(window as any).__toolData.raptorHunt }; delete result.distantDetailStudy; return result;
  });
}

async function activate(page: Page, selector: string, keyboard = false) {
  const control = page.locator(selector);
  if (keyboard) { await control.focus(); await page.keyboard.press('Enter'); }
  else await control.click();
}

async function open(page: Page, keyboard = false) {
  await activate(page, ui.launch, keyboard);
  await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  await expect(page.locator(ui.panel)).not.toHaveAttribute('open', '');
  await expect(page.locator(ui.active)).toHaveCount(0);
  await activate(page, ui.summary, keyboard);
}

async function conditions(page: Page, distance: number, cycles = 8, contrast = 95) {
  for (const [name, value] of Object.entries({ distance, cycles, contrast })) await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}

async function setRange(page: Page, name: string, value: number) {
  await page.locator('#rh-distance-' + name).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}

async function reveal(page: Page, prediction: Prediction, keyboard = false) {
  await activate(page, '[data-distance-prediction="' + prediction + '"]', keyboard);
  await activate(page, ui.reveal, keyboard);
  await expect(page.locator('[data-distance-result]')).toBeVisible();
}

function metrics(distance: number, reference: number) {
  const angle = 2 * Math.atan(.3 / (2 * distance)) * 180 / Math.PI;
  const frequency = 8 / angle, normalized = frequency / reference;
  return { angle, frequency, normalized, transfer: Math.exp(-Math.log(10) * normalized * normalized) };
}

async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({
    diagnostics: root._distanceScene.getDiagnostics(), captures: (window as any).distanceMatchCaptures,
    rafs: (window as any).distanceMatchRafs, persisted: (window as any).__toolData.raptorHunt.distantDetailStudy
  }));
}

async function noSceneWork(page: Page, before: Awaited<ReturnType<typeof work>>, unchangedPersistence = true) {
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  const after = await work(page);
  expect(after.diagnostics.lifecycle.renderCount).toBe(before.diagnostics.lifecycle.renderCount);
  expect(after.diagnostics.lifecycle.allocationCount).toBe(before.diagnostics.lifecycle.allocationCount);
  expect(after.captures).toBe(before.captures); expect(after.rafs).toBe(0);
  if (unchangedPersistence) expect(after.persisted).toEqual(before.persisted);
  expect((await harness.glContexts(page)).filter(context => !context.lost)).toHaveLength(1);
  return after;
}

async function start(page: Page, keyboard = false) {
  await activate(page, ui.start, keyboard);
  await expect(page.locator(ui.active)).toBeVisible();
  await conditions(page, 60);
  await expect(page.locator('[data-distance-guide]')).toHaveCount(0);
  await expect(page.locator('[data-distance-fieldwork-run]')).toHaveCount(0);
  await expect(page.locator('img[data-distance-pinned-image]')).toHaveCount(0);
  await expect(page.locator(ui.reveal)).toBeDisabled();
  await expect(page.locator(ui.feedback)).toHaveCount(0);
}

async function pinStarter(page: Page, keyboard = false) {
  await activate(page, ui.next, keyboard);
  await expect(page.locator('[data-distance-prediction="both"]')).toBeFocused();
  await reveal(page, 'both', keyboard);
  const diagnostics = (await work(page)).diagnostics;
  await activate(page, ui.next, keyboard);
  await expect(page.locator(ui.human)).toBeVisible();
  await expect(page.locator('img[data-distance-pinned-image]')).toHaveCount(2);
  await activate(page, ui.next, keyboard);
  await expect(page.locator('#rh-distance-distance')).toBeFocused();
  return diagnostics;
}

async function check(page: Page, distance: number, direction: 'farther' | 'nearer' | 'matched', keyboard = false) {
  const human = metrics(60, 60), eagle = metrics(distance, 140);
  const relativeError = Math.abs(eagle.normalized / human.normalized - 1);
  expect(relativeError <= .01).toBe(direction === 'matched');
  if (direction === 'farther') expect(eagle.normalized).toBeLessThan(human.normalized);
  if (direction === 'nearer') expect(eagle.normalized).toBeGreaterThan(human.normalized);
  for (const [id, expected] of [['human', human], ['eagle', eagle]] as const) {
    const transfer = page.locator('[data-distance-match-transfer="' + id + '"]');
    expect(Number(await transfer.getAttribute('data-transfer'))).toBeCloseTo(expected.transfer, 11);
    expect(Number(await page.locator('[data-distance-match-angle="' + id + '"]').getAttribute('data-angle'))).toBeCloseTo(expected.angle, 11);
    const meter = page.getByRole('meter', { name: new RegExp('^' + id + ' model fraction', 'i') });
    await expect(meter).toHaveAttribute('aria-valuemin', '0');
    await expect(meter).toHaveAttribute('aria-valuemax', '100');
    await expect(meter).toHaveAttribute('aria-valuetext', /calculated.*illustrative/i);
    expect(Number(await meter.getAttribute('aria-valuenow'))).toBeCloseTo(expected.transfer * 100, 9);
    const width = await page.locator('[data-distance-match-meter="' + id + '"]').evaluate((span: HTMLElement) => span.style.width);
    expect(width.endsWith('%')).toBe(true);
    expect(Number.parseFloat(width)).toBeCloseTo(expected.transfer * 100, 3);
  }
  await expect(page.locator(ui.check)).toBeEnabled();
  const before = await work(page);
  if (keyboard) {
    await activate(page, ui.summary, true);
    await expect(page.locator(ui.panel)).not.toHaveAttribute('open', '');
    await expect(page.locator('[data-distance-match-check-inline]')).toBeEnabled();
    await activate(page, '[data-distance-match-check-inline]', true);
    await expect(page.locator(ui.panel)).toHaveAttribute('open', '');
    await expect(page.locator('[data-distance-match-heading]')).toBeFocused();
  } else await activate(page, ui.check);
  await expect(page.locator(ui.feedback)).toHaveAttribute('data-direction', direction);
  await expect(page.locator(ui.feedback)).toHaveAttribute('data-matched', String(direction === 'matched'));
  await noSceneWork(page, before);
  return { distance, human, eagle, relativeError };
}

async function imageEvidence(page: Page) {
  await expect(page.locator(ui.human)).toBeVisible(); await expect(page.locator(ui.eagle)).toBeVisible();
  await expect.poll(() => page.locator('img[data-distance-match-image]').evaluateAll(images => images.length === 2 && images.every(image => (image as HTMLImageElement).naturalWidth === 1024))).toBe(true);
  const result = await page.locator(ui.root).evaluate((root: HTMLElement) => {
    const human = root.querySelector('img[data-distance-match-image="human"]') as HTMLImageElement;
    const eagle = root.querySelector('img[data-distance-match-image="eagle"]') as HTMLImageElement;
    const pin = root.querySelector('img[data-distance-pinned-image="reference"]') as HTMLImageElement;
    const canvas = root.querySelector('canvas[data-distance-canvas="eagle"]') as HTMLCanvasElement;
    function bounds(image: HTMLImageElement) {
      const r = image.getBoundingClientRect(), css = getComputedStyle(image);
      return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height, alt: image.alt, transform: css.transform };
    }
    return { humanIsPin: human.src === pin.src, eagleIsCurrent: eagle.src === canvas.toDataURL('image/png'),
      differentImages: human.src !== eagle.src, human: bounds(human), eagle: bounds(eagle) };
  });
  expect(result.humanIsPin).toBe(true); expect(result.eagleIsCurrent).toBe(true); expect(result.differentImages).toBe(true);
  for (const image of [result.human, result.eagle]) {
    expect(image.width / image.height).toBeCloseTo(2, 2); expect(image.alt).toBeTruthy(); expect(image.transform).toBe('none');
  }
  expect(result.human.width).toBeCloseTo(result.eagle.width, 1);
  expect(result.human.height).toBeCloseTo(result.eagle.height, 1);
  await expect(page.locator('canvas[data-distance-canvas]')).toHaveCount(3);
  return result;
}

async function close(page: Page, initialSiblings: unknown, keyboard = false) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).distanceMatchClosedScene = root._distanceScene; });
  await activate(page, ui.close, keyboard);
  await expect(page.locator(ui.root)).toHaveCount(0); await expect(page.locator(ui.launch)).toBeFocused();
  const lifecycle = await page.evaluate(() => (window as any).distanceMatchClosedScene.getDiagnostics().lifecycle);
  expect(lifecycle).toMatchObject({ disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0 });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('matches modeled modulation at different distances using real unchanged-scale image evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const initial = await setup(page);
  await open(page); await start(page);
  const pinnedDiagnostics = await pinStarter(page);
  const trials = [];
  for (const [distance, direction] of [[100, 'farther'], [200, 'nearer'], [140, 'matched']] as const) {
    await setRange(page, 'distance', distance);
    await expect(page.locator(ui.check)).toBeDisabled();
    await expect(page.locator(ui.feedback)).toHaveCount(0);
    await expect(page.locator(ui.eagle)).toHaveCount(0);
    await reveal(page, distance === 100 ? 'both' : 'eagle');
    trials.push(await check(page, distance, direction));
  }
  const images = await imageEvidence(page), current = (await work(page)).diagnostics;
  expect(current.rootScale).toEqual([1, 1, 1]);
  expect(current.nativeBounds).toEqual(pinnedDiagnostics.nativeBounds);
  expect(current.placementPosition).toEqual(pinnedDiagnostics.placementPosition);
  expect(current.detailCamera.horizontalFov).toBe(.75);
  expect(current.detailCamera.horizontalFov).toBe(pinnedDiagnostics.detailCamera.horizontalFov);
  expect(current.pixelSigmas).toEqual(pinnedDiagnostics.pixelSigmas);
  expect(current.plaque.detailWidthPixels / pinnedDiagnostics.plaque.detailWidthPixels).toBeCloseTo(60 / 140, 6);
  await activate(page, '[data-distance-match-note]');
  await expect(page.locator(ui.note)).toBeFocused();
  const note = 'The model retains similar stripe modulation at 60 m for the human reference and 140 m for the eagle reference. The farther plaque is angularly smaller.';
  await page.locator(ui.note).fill(note);
  const beforeSave = await work(page);
  await activate(page, ui.save);
  await noSceneWork(page, beforeSave, false);
  expect((await work(page)).persisted.records).toEqual([{
    version: 1, modelVersion: 1, distance: 140, cycles: 8, contrast: 95, widthM: .3,
    referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note, comparison: { version: 1, reference: starter }
  }]);
  await page.locator(ui.panel).screenshot({ path: resolve(output, 'match-desktop.jpg'), type: 'jpeg', quality: 86 });
  writeFileSync(resolve(output, 'match-desktop.json'), JSON.stringify({ trials, images, current, state: (await work(page)).persisted }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('requires held variables, the correct starter pin, and freshly copied revealed evidence', async ({ page }) => {
  const initial = await setup(page);
  await open(page); await start(page); await pinStarter(page);
  await setRange(page, 'distance', 140); await reveal(page, 'eagle'); await check(page, 140, 'matched');
  for (const [name, value] of [['cycles', 10], ['contrast', 25]] as const) {
    await setRange(page, name, value);
    await reveal(page, 'eagle');
    await expect(page.locator(ui.feedback)).toHaveCount(0);
    await expect(page.locator(ui.check)).toBeDisabled();
    await activate(page, ui.restore);
    await conditions(page, 140);
    await expect(page.locator(ui.reveal)).toBeDisabled();
    await expect(page.locator(ui.check)).toBeDisabled();
    await reveal(page, 'eagle'); await check(page, 140, 'matched');
  }
  await activate(page, '[data-distance-pin]');
  await expect(page.locator(ui.feedback)).toHaveCount(0);
  await expect(page.locator(ui.human)).toHaveCount(0);
  await expect(page.locator(ui.check)).toHaveCount(0);
  await start(page); await pinStarter(page);
  await activate(page, '[data-distance-clear-pin]');
  await expect(page.locator(ui.human)).toHaveCount(0);
  await expect(page.locator(ui.check)).toHaveCount(0);
  await start(page); await pinStarter(page);
  await setRange(page, 'distance', 140);
  await page.locator('canvas[data-distance-canvas="reference"],canvas[data-distance-canvas="eagle"]').evaluateAll(nodes => nodes.forEach(node => {
    const canvas = node as any; canvas._matchToDataURL = canvas.toDataURL;
    canvas.toDataURL = function () { throw new Error('Injected current match snapshot failure'); };
  }));
  try {
    await reveal(page, 'eagle');
    await expect(page.locator('[data-distance-snapshot-error]')).toBeVisible();
    await expect(page.locator(ui.human)).toBeVisible();
    await expect(page.locator(ui.eagle)).toHaveCount(0);
    await expect(page.locator(ui.check)).toBeDisabled();
    await expect(page.locator(ui.feedback)).toHaveCount(0);
    await expect(page.locator('canvas[data-distance-canvas="eagle"]')).toBeVisible();
  } finally {
    await page.locator('canvas[data-distance-canvas="reference"],canvas[data-distance-canvas="eagle"]').evaluateAll(nodes => nodes.forEach(node => {
      const canvas = node as any; canvas.toDataURL = canvas._matchToDataURL; delete canvas._matchToDataURL;
    }));
  }
  await reveal(page, 'eagle'); await check(page, 140, 'matched');
  await activate(page, '[data-distance-prediction="both"]');
  await expect(page.locator(ui.feedback)).toHaveCount(0);
  await expect(page.locator(ui.check)).toBeDisabled();
  await expect(page.locator(ui.eagle)).toHaveCount(0);
  await activate(page, '[data-distance-inquiry="cycles"]');
  await expect(page.locator(ui.active)).toHaveCount(0);
  await expect(page.locator('[data-distance-guide]')).toHaveAttribute('data-stage', 'starter');
  await start(page);
  await activate(page, '[data-distance-fieldwork] > summary');
  await activate(page, '[data-distance-fieldwork-start="human"]');
  await expect(page.locator(ui.active)).toHaveCount(0);
  await expect(page.locator('[data-distance-fieldwork-run]')).toHaveAttribute('data-distance-fieldwork-run', 'human');
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('supports a keyboard match on a phone while preserving saved work and guarding restarted drafts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page, { records: [priorRecord], fieldworkResults: savedResults });
  await page.locator('#wrap').evaluate((element: HTMLElement) => { element.style.width = '100%'; });
  await open(page, true);
  await activate(page, '[data-distance-fieldwork] > summary', true);
  await activate(page, '[data-distance-fieldwork-start="eagle"]', true);
  await start(page, true);
  await page.locator(ui.note).fill('This unfinished note belongs to the first matching attempt.');
  await start(page, true);
  await expect(page.locator(ui.note)).toHaveValue('This unfinished note belongs to the first matching attempt.');
  await expect(page.locator('[data-distance-draft-stale]')).toBeVisible();
  await pinStarter(page, true);
  await setRange(page, 'distance', 139);
  await page.locator('#rh-distance-distance').focus();
  await page.keyboard.press('ArrowRight'); await conditions(page, 140);
  const beforePredictionShortcut = await work(page);
  await activate(page, '[data-distance-match-predict]', true);
  await expect(page.locator('[data-distance-prediction="both"]')).toBeFocused();
  await noSceneWork(page, beforePredictionShortcut);
  await reveal(page, 'eagle', true); await check(page, 140, 'matched', true);
  const images = await imageEvidence(page);
  await activate(page, '[data-distance-match-note]', true);
  await expect(page.locator(ui.note)).toBeFocused();
  await expect(page.locator(ui.save)).toBeDisabled();
  await activate(page, '[data-distance-adopt-draft]', true);
  await expect(page.locator(ui.note)).toBeFocused();
  await expect(page.locator(ui.save)).toBeEnabled();
  await activate(page, ui.save, true);
  const kept = (await work(page)).persisted;
  expect(kept.records).toHaveLength(2); expect(kept.records[0]).toEqual(priorRecord);
  expect(kept.records[1].comparison.reference).toEqual(starter);
  expect(kept.fieldworkResults).toEqual(savedResults);
  const layout = await page.locator(ui.panel).evaluate((panel: HTMLElement) => {
    const box = panel.getBoundingClientRect();
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, x: box.x, right: box.right };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.x).toBeGreaterThanOrEqual(0); expect(layout.right).toBeLessThanOrEqual(layout.viewport + 1);
  expect(images.human.width).toBeGreaterThan(200);
  expect(images.eagle.width).toBeGreaterThan(200);
  await page.locator(ui.panel).screenshot({ path: resolve(output, 'match-mobile.jpg'), type: 'jpeg', quality: 86 });
  const beforeExit = await work(page);
  await activate(page, ui.exit, true);
  await expect(page.locator(ui.active)).toHaveCount(0); await conditions(page, 140);
  await expect(page.locator('img[data-distance-pinned-image]')).toHaveCount(2);
  await noSceneWork(page, beforeExit);
  await close(page, initial.siblings, true);
  await open(page, true);
  await expect(page.locator(ui.active)).toHaveCount(0);
  await expect(page.locator('img[data-distance-pinned-image]')).toHaveCount(0);
  expect((await work(page)).persisted).toEqual(kept);
  writeFileSync(resolve(output, 'match-mobile.json'), JSON.stringify({ images, layout, state: kept }, null, 2));
  await close(page, initial.siblings, true); expect(initial.errors).toEqual([]);
});
