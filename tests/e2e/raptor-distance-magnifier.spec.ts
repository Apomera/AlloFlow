import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 180000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND10_REPORT || 'reports/raptor-distance-round10-20261023');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900,
  appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.distanceMagnifierNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  inspector: '[data-distance-inspector]', inspectorSummary: '[data-distance-inspector] > summary',
  panel: '[data-distance-magnifier]', summary: '[data-distance-magnifier] > summary',
  frames: '[data-distance-magnifier-frame]', images: 'img[data-distance-magnifier-image]',
  crop: '[data-distance-magnifier-crop]', condition: '[data-distance-magnifier-condition]',
  overview: '[data-distance-magnifier-overview]', region: '[data-distance-magnifier-region]',
  unavailable: '[data-distance-magnifier-unavailable]', center: '[data-distance-magnifier-center]',
  panX: '[data-distance-magnifier-pan="x"]', panY: '[data-distance-magnifier-pan="y"]',
  current: '[data-distance-inspector-source="current"]', pinned: '[data-distance-inspector-source="pinned"]',
  reveal: '[data-distance-reveal]', note: '[data-distance-note]', save: '[data-distance-save]'
};
const priorRecord = {
  version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95, widthM: .3,
  referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note: 'An earlier observation remains in my notebook.'
};
const savedResults = { version: 1, human: { version: 1, modelVersion: 1, reference: 'human', trials: [85, 86].map((distance, i) => ({
  settings: { version: 1, distance, cycles: 12, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 }, prediction: i ? 'eagle' : 'both'
})) } };

async function setup(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), nativePng = HTMLCanvasElement.prototype.toDataURL;
    const nativeRead = CanvasRenderingContext2D.prototype.getImageData;
    (window as any).distanceMagnifierRafs = 0; (window as any).distanceMagnifierCaptures = 0; (window as any).distanceMagnifierReads = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).distanceMagnifierRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).distanceMagnifierCaptures++;
      return nativePng.apply(this, args as any);
    };
    CanvasRenderingContext2D.prototype.getImageData = function (...args: any[]) {
      if (this.canvas.hasAttribute('data-distance-canvas') && /raptor_distance_(study|signal)\.js/.test(String(new Error().stack))) (window as any).distanceMagnifierReads++;
      return nativeRead.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.distanceMagnifierNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' }, huntTutorialDismissed: true,
    graphicsQuality: 'low', xp: 97, huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false },
    distantDetailStudy: { version: 1, distance: 120, cycles: 12, contrast: 95, records: [priorRecord], fieldworkResults: savedResults }
  } }, undefined, { expectCanvas: false });
  await expect(page.locator(ui.launch)).toBeVisible(); expect(await harness.glContexts(page)).toEqual([]);
  return { errors, siblings: await siblings(page) };
}

async function siblings(page: Page) {
  return page.evaluate(() => { const value = { ...(window as any).__toolData.raptorHunt }; delete value.distantDetailStudy; return value; });
}

async function activate(page: Page, selector: string, keyboard = false) {
  const control = page.locator(selector);
  if (keyboard) { await control.focus(); await page.keyboard.press('Enter'); } else await control.click();
}

async function open(page: Page, keyboard = false) {
  await activate(page, ui.launch, keyboard);
  await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  await expect(page.locator(ui.inspector)).not.toHaveAttribute('open', '');
  await activate(page, ui.inspectorSummary, keyboard);
  await expect(page.locator(ui.panel)).not.toHaveAttribute('open', '');
  await activate(page, ui.summary, keyboard);
}

async function setRange(page: Page, selector: string, value: number) {
  await page.locator(selector).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator(selector)).toHaveValue(String(value));
}

async function reveal(page: Page, prediction = 'eagle', keyboard = false) {
  await activate(page, '[data-distance-prediction="' + prediction + '"]', keyboard);
  await activate(page, ui.reveal, keyboard); await expect(page.locator('[data-distance-result]')).toBeVisible();
}

async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({
    diagnostics: root._distanceScene.getDiagnostics(), captures: (window as any).distanceMagnifierCaptures,
    reads: (window as any).distanceMagnifierReads, rafs: (window as any).distanceMagnifierRafs,
    persisted: (window as any).__toolData.raptorHunt.distantDetailStudy
  }));
}

async function unchangedWork(page: Page, before: Awaited<ReturnType<typeof work>>) {
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  const after = await work(page);
  expect(after.diagnostics).toEqual(before.diagnostics);
  expect(after.captures).toBe(before.captures); expect(after.reads).toBe(before.reads); expect(after.rafs).toBe(0);
  expect(after.persisted).toEqual(before.persisted);
  expect((await harness.glContexts(page)).filter(context => !context.lost)).toHaveLength(1);
}

async function unavailable(page: Page) {
  await expect(page.locator(ui.unavailable)).toBeVisible();
  for (const selector of [ui.frames, ui.images, ui.crop, ui.overview]) await expect(page.locator(selector)).toHaveCount(0);
  for (const zoom of [1, 2, 4]) await expect(page.locator('[data-distance-magnifier-zoom="' + zoom + '"]')).toBeDisabled();
  for (const selector of [ui.panX, ui.panY, ui.center]) await expect(page.locator(selector)).toBeDisabled();
}

async function cropEvidence(page: Page, zoom: number, panX: number, panY: number, source: 'current' | 'pinned') {
  const crop = { x: (1024 - 1024 / zoom) * panX / 100, y: (512 - 512 / zoom) * panY / 100,
    width: 1024 / zoom, height: 512 / zoom, zoom };
  await expect(page.locator(ui.crop)).toBeVisible();
  for (const [attribute, value] of Object.entries(crop)) expect(Number(await page.locator(ui.crop).getAttribute('data-' + attribute))).toBeCloseTo(value, 9);
  await expect(page.locator(ui.overview)).toHaveAttribute('viewBox', '0 0 1024 512');
  for (const attribute of ['x', 'y', 'width', 'height'] as const) expect(Number(await page.locator(ui.region).getAttribute(attribute))).toBeCloseTo(crop[attribute], 9);
  await expect(page.locator(ui.panX)).toHaveValue(String(panX)); await expect(page.locator(ui.panY)).toHaveValue(String(panY));
  for (const value of [1, 2, 4]) await expect(page.locator('[data-distance-magnifier-zoom="' + value + '"]')).toHaveAttribute('aria-pressed', String(value === zoom));
  for (const selector of [ui.panX, ui.panY, ui.center]) {
    if (zoom === 1) await expect(page.locator(selector)).toBeDisabled(); else await expect(page.locator(selector)).toBeEnabled();
  }
  await expect(page.locator(ui.images)).toHaveCount(2);
  await expect.poll(() => page.locator(ui.images).evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth === 1024))).toBe(true);
  const evidence = await page.locator(ui.root).evaluate((root: HTMLElement, source) => {
    const views = ['human', 'eagle'].map(id => {
      const name = id === 'human' ? 'reference' : 'eagle';
      const frame = root.querySelector('[data-distance-magnifier-frame="' + id + '"]') as HTMLElement;
      const image = root.querySelector('img[data-distance-magnifier-image="' + id + '"]') as HTMLImageElement;
      const inspector = root.querySelector('img[data-distance-inspector-image="' + name + '"]') as HTMLImageElement;
      const sourcePng = source === 'current' ? (root.querySelector('canvas[data-distance-canvas="' + name + '"]') as HTMLCanvasElement).toDataURL('image/png')
        : (root.querySelector('img[data-distance-pinned-image="' + name + '"]') as HTMLImageElement).src;
      const f = frame.getBoundingClientRect(), i = image.getBoundingClientRect(), css = getComputedStyle(image), frameCss = getComputedStyle(frame);
      return { id, samePng: image.src === sourcePng, sameInspectorPng: image.src === inspector.src,
        naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, alt: image.alt,
        frame: { x: f.x, y: f.y, width: f.width, height: f.height, clientWidth: frame.clientWidth, clientHeight: frame.clientHeight,
          borderLeft: Number.parseFloat(frameCss.borderLeftWidth), borderTop: Number.parseFloat(frameCss.borderTopWidth), overflow: frameCss.overflow },
        image: { x: i.x, y: i.y, width: i.width, height: i.height, maxWidth: css.maxWidth,
          styleWidth: image.style.width, styleHeight: image.style.height, left: image.style.left, top: image.style.top } };
    });
    const eagle = root.querySelector('img[data-distance-magnifier-image="eagle"]') as HTMLImageElement;
    const overviewImage = root.querySelector('[data-distance-magnifier-overview] image')!;
    return { views, overviewSamePng: (overviewImage.getAttribute('href') || overviewImage.getAttribute('xlink:href')) === eagle.src };
  }, source);
  expect(evidence.overviewSamePng).toBe(true);
  for (const view of evidence.views) {
    expect(view.samePng).toBe(true); expect(view.sameInspectorPng).toBe(true);
    expect([view.naturalWidth, view.naturalHeight]).toEqual([1024, 512]); expect(view.alt).toBeTruthy();
    expect(view.frame.overflow).toBe('hidden'); expect(view.frame.width / view.frame.height).toBeCloseTo(2, 2);
    expect(view.image.maxWidth).toBe('none'); expect(view.image.styleWidth).toBe(zoom * 100 + '%'); expect(view.image.styleHeight).toBe(zoom * 100 + '%');
    expect(Number.parseFloat(view.image.left)).toBeCloseTo(-(zoom - 1) * panX, 8);
    expect(Number.parseFloat(view.image.top)).toBeCloseTo(-(zoom - 1) * panY, 8);
    // Match the positioned image to the frame's inner CSS box, not its border.
    expect(Math.abs(view.image.width - view.frame.clientWidth * zoom)).toBeLessThanOrEqual(zoom + .1);
    expect(Math.abs(view.image.height - view.frame.clientHeight * zoom)).toBeLessThanOrEqual(zoom + .1);
    const expectedX = view.frame.x + view.frame.borderLeft - view.frame.clientWidth * (zoom - 1) * panX / 100;
    const expectedY = view.frame.y + view.frame.borderTop - view.frame.clientHeight * (zoom - 1) * panY / 100;
    expect(Math.abs(view.image.x - expectedX)).toBeLessThanOrEqual(zoom + .1);
    expect(Math.abs(view.image.y - expectedY)).toBeLessThanOrEqual(zoom + .1);
  }
  expect(evidence.views[0].frame.width).toBeCloseTo(evidence.views[1].frame.width, 1);
  await expect(page.locator(ui.condition)).toContainText(new RegExp(source, 'i'));
  await expect(page.locator('canvas[data-distance-canvas]')).toHaveCount(3);
  return { crop, evidence };
}

async function wipe(page: Page) {
  return page.locator(ui.inspector).evaluate(element => {
    const range = element.querySelector('[data-distance-inspector-range]') as HTMLInputElement;
    return { share: range.value, images: Array.from(element.querySelectorAll('img[data-distance-inspector-image]')).map(image => {
      const rect = image.getBoundingClientRect(), css = getComputedStyle(image);
      return { src: (image as HTMLImageElement).src, width: rect.width, height: rect.height, clip: css.clipPath };
    }) };
  });
}

async function close(page: Page, initialSiblings: unknown, keyboard = false) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).distanceMagnifierClosedScene = root._distanceScene; });
  await activate(page, ui.close, keyboard); await expect(page.locator(ui.root)).toHaveCount(0); await expect(page.locator(ui.launch)).toBeFocused();
  const lifecycle = await page.evaluate(() => (window as any).distanceMagnifierClosedScene.getDiagnostics().lifecycle);
  expect(lifecycle).toMatchObject({ disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0 });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('enlarges the same PNG crop in both views without changing the scene or original wipe', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const initial = await setup(page); await open(page); await unavailable(page); await reveal(page);
  const before = await work(page), originalWipe = await wipe(page), crops = [];
  crops.push(await cropEvidence(page, 1, 50, 50, 'current'));
  await activate(page, '[data-distance-magnifier-zoom="2"]'); crops.push(await cropEvidence(page, 2, 50, 50, 'current'));
  await setRange(page, ui.panX, 0); await setRange(page, ui.panY, 0); crops.push(await cropEvidence(page, 2, 0, 0, 'current'));
  await activate(page, '[data-distance-magnifier-zoom="4"]');
  await setRange(page, ui.panX, 100); await setRange(page, ui.panY, 100); crops.push(await cropEvidence(page, 4, 100, 100, 'current'));
  await setRange(page, ui.panX, 23); await setRange(page, ui.panY, 77); crops.push(await cropEvidence(page, 4, 23, 77, 'current'));
  await activate(page, ui.center); crops.push(await cropEvidence(page, 4, 50, 50, 'current'));
  expect(await wipe(page)).toEqual(originalWipe); await unchangedWork(page, before);
  await page.locator(ui.panel).screenshot({ path: resolve(output, 'magnifier-desktop.jpg'), type: 'jpeg', quality: 88 });
  await activate(page, '[data-distance-magnifier-zoom="1"]'); await cropEvidence(page, 1, 50, 50, 'current');
  expect(await wipe(page)).toEqual(originalWipe); await unchangedWork(page, before);
  writeFileSync(resolve(output, 'magnifier-crops.json'), JSON.stringify(crops, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('follows explicit current or pinned evidence through stale conditions and PNG-copy failure', async ({ page }) => {
  const initial = await setup(page); await open(page); await reveal(page);
  await activate(page, '[data-distance-pin]');
  await activate(page, '[data-distance-magnifier-zoom="4"]'); await setRange(page, ui.panX, 23); await setRange(page, ui.panY, 77);
  await cropEvidence(page, 4, 23, 77, 'current');
  await setRange(page, '#rh-distance-distance', 200); await unavailable(page);
  await expect(page.locator(ui.current)).toHaveAttribute('aria-pressed', 'true');
  const beforeSource = await work(page); await activate(page, ui.pinned);
  await cropEvidence(page, 4, 23, 77, 'pinned'); await expect(page.locator(ui.condition)).toContainText('120 m');
  await unchangedWork(page, beforeSource);
  await activate(page, ui.current); await unavailable(page);
  await page.locator('canvas[data-distance-canvas="reference"],canvas[data-distance-canvas="eagle"]').evaluateAll(nodes => nodes.forEach(node => {
    const canvas = node as any; canvas._magnifierPng = canvas.toDataURL;
    canvas.toDataURL = function () { throw new Error('Injected magnifier current-copy failure'); };
  }));
  try {
    await reveal(page); await expect(page.locator('[data-distance-snapshot-error]')).toBeVisible(); await unavailable(page);
    await expect(page.locator('canvas[data-distance-canvas="eagle"]')).toBeVisible();
    await activate(page, ui.pinned); await cropEvidence(page, 4, 23, 77, 'pinned');
    await activate(page, ui.current); await unavailable(page);
  } finally {
    await page.locator('canvas[data-distance-canvas="reference"],canvas[data-distance-canvas="eagle"]').evaluateAll(nodes => nodes.forEach(node => {
      const canvas = node as any; canvas.toDataURL = canvas._magnifierPng; delete canvas._magnifierPng;
    }));
  }
  await reveal(page); await cropEvidence(page, 4, 23, 77, 'current'); await expect(page.locator(ui.condition)).toContainText('200 m');
  await activate(page, '[data-distance-prediction="both"]'); await unavailable(page);
  await activate(page, ui.pinned); await cropEvidence(page, 4, 23, 77, 'pinned');
  await activate(page, '[data-distance-clear-pin]'); await unavailable(page);
  await expect(page.locator(ui.pinned)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(ui.current)).toHaveAttribute('aria-pressed', 'false');
  await activate(page, ui.current); await reveal(page); await cropEvidence(page, 4, 23, 77, 'current');
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('supports phone keyboard controls without changing drafts, reflection, pins or kept pixel readings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page); await page.locator('#wrap').evaluate((element: HTMLElement) => { element.style.width = '100%'; });
  await open(page, true);
  await activate(page, '[data-distance-inquiry="contrast"]', true); await reveal(page, 'both', true);
  await activate(page, '[data-distance-pin]', true); await activate(page, '[data-distance-experiment="contrast"]', true); await reveal(page, 'both', true);
  await activate(page, '[data-distance-reflection-answer="same-same"]', true);
  await expect(page.locator('[data-distance-reflection-feedback]')).toHaveAttribute('data-correct', 'true');
  const note = 'I compared the same pixel evidence at a larger display size.';
  await page.locator(ui.note).fill(note);
  await activate(page, '[data-distance-signal] > summary', true); await activate(page, '[data-distance-signal-read]', true);
  await activate(page, '[data-distance-signal-keep]', true);
  await activate(page, '[data-distance-adopt-draft]', true); await expect(page.locator(ui.save)).toBeEnabled();
  const pins = await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src));
  const keptReading = await page.locator('[data-distance-signal-kept]').innerText(), before = await work(page);
  for (const selector of [ui.panX, ui.panY]) {
    await expect(page.locator(selector)).toHaveAttribute('min', '0'); await expect(page.locator(selector)).toHaveAttribute('max', '100');
    await expect(page.locator(selector)).toHaveAttribute('step', '1');
  }
  await activate(page, '[data-distance-magnifier-zoom="4"]', true);
  await page.locator(ui.panX).focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await page.locator(ui.panY).focus(); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft');
  await cropEvidence(page, 4, 1, 99, 'current');
  await activate(page, ui.pinned, true); await cropEvidence(page, 4, 1, 99, 'pinned');
  await activate(page, ui.current, true); await activate(page, ui.center, true); const images = await cropEvidence(page, 4, 50, 50, 'current');
  await activate(page, '[data-distance-magnifier-note]', true); await expect(page.locator(ui.note)).toBeFocused();
  await expect(page.locator(ui.note)).toHaveValue(note); await expect(page.locator(ui.save)).toBeEnabled();
  await expect(page.locator('[data-distance-draft-stale]')).toHaveCount(0);
  await expect(page.locator('[data-distance-reflection-feedback]')).toHaveAttribute('data-correct', 'true');
  expect(await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src))).toEqual(pins);
  expect(await page.locator('[data-distance-signal-kept]').innerText()).toEqual(keptReading);
  await unchangedWork(page, before);
  const layout = await page.locator(ui.panel).evaluate((panel: HTMLElement) => {
    const rect = panel.getBoundingClientRect(); return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, x: rect.x, right: rect.right };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1); expect(layout.x).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.viewport + 1);
  for (const view of images.evidence.views) expect(view.frame.width).toBeGreaterThan(200);
  await page.locator(ui.panel).screenshot({ path: resolve(output, 'magnifier-mobile.jpg'), type: 'jpeg', quality: 88 });
  writeFileSync(resolve(output, 'magnifier-mobile.json'), JSON.stringify({ layout, images, state: before.persisted }, null, 2));
  await close(page, initial.siblings, true); await open(page, true); await unavailable(page);
  await expect(page.locator('[data-distance-magnifier-zoom="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(ui.panX)).toHaveValue('50'); await expect(page.locator(ui.panY)).toHaveValue('50');
  expect((await work(page)).persisted).toEqual(before.persisted);
  await reveal(page, 'both', true); await cropEvidence(page, 1, 50, 50, 'current');
  await close(page, initial.siblings, true); expect(initial.errors).toEqual([]);
});
